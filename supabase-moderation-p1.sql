-- P1: kick enforcement + layout-related server tweaks
-- Run via: node scripts/apply-moderation-p1.mjs

-- Treat kick like room ban for re-entry (30 min default expiry on kick rows)
create or replace function public.is_user_banned(
  p_uid text,
  p_nickname text,
  p_room_id text default null,
  p_action text default 'participate'
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.banned_users bu
    where (bu.expires_at is null or bu.expires_at > timezone('utc'::text, now()))
      and (
        bu.target_user_id = auth.uid()
        or bu.uid = coalesce(p_uid, '')
        or lower(trim(bu.author)) = lower(trim(coalesce(p_nickname, '')))
      )
      and (
        bu.ban_type in ('ban', 'megaban')
        or (p_action = 'speak' and bu.ban_type = 'mute')
        or (
          p_action = 'room_enter'
          and bu.ban_type in ('room', 'kick')
          and bu.room_id is not null
          and bu.room_id = coalesce(p_room_id, '')
        )
      )
  );
$$;

create or replace function public.apply_moderation_action(
  p_action text,
  p_target_user_id uuid,
  p_target_nickname text,
  p_room_id text default null,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid := auth.uid();
  v_global text;
  v_rank int;
  v_row public.banned_users%rowtype;
begin
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_target_nickname is null or length(trim(p_target_nickname)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'target_required');
  end if;

  select role into v_global from public.user_roles where user_id = v_caller;
  v_rank := public.caller_effective_rank(p_room_id);

  if p_action in ('mute', 'unmute', 'kick', 'unkick') and v_rank < public.role_rank('host') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_action in ('room_ban', 'unroom_ban') and v_rank < public.role_rank('mod') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_action in ('megaban', 'unmegaban', 'ban', 'unban')
     and coalesce(v_global, '') not in ('owner', 'malek', 'المالك', 'admin', 'أدمن') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_action = 'mute' then
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id, room_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'mute'),
      'mute', p_target_user_id, p_room_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unmute' then
    delete from public.banned_users
    where ban_type = 'mute'
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      )
      and (p_room_id is null or room_id is null or room_id = p_room_id);
    return jsonb_build_object('ok', true, 'action', 'unmute');

  elsif p_action = 'kick' then
    if p_room_id is null or length(trim(p_room_id)) = 0 then
      return jsonb_build_object('ok', false, 'error', 'room_required');
    end if;
    insert into public.banned_users (
      uid, author, banner, reason, ban_type, target_user_id, room_id, expires_at
    )
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'kick'),
      'kick', p_target_user_id, p_room_id,
      timezone('utc'::text, now()) + interval '30 minutes'
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unkick' then
    delete from public.banned_users
    where ban_type = 'kick'
      and room_id = p_room_id
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unkick');

  elsif p_action = 'room_ban' then
    if p_room_id is null or length(trim(p_room_id)) = 0 then
      return jsonb_build_object('ok', false, 'error', 'room_required');
    end if;
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id, room_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'room_ban'),
      'room', p_target_user_id, p_room_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unroom_ban' then
    delete from public.banned_users
    where ban_type = 'room'
      and room_id = p_room_id
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unroom_ban');

  elsif p_action = 'megaban' then
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'megaban'),
      'megaban', p_target_user_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unmegaban' then
    delete from public.banned_users
    where ban_type = 'megaban'
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unmegaban');
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_action');
end;
$$;

-- Staff can delete kick rows too
drop policy if exists "Staff delete scoped bans" on public.banned_users;
create policy "Staff delete scoped bans" on public.banned_users
  for delete to authenticated
  using (
    public.is_admin()
    or (
      public.caller_effective_rank(room_id) >= public.role_rank('host')
      and ban_type in ('mute', 'room', 'kick')
    )
  );

drop policy if exists "Staff insert scoped bans" on public.banned_users;
create policy "Staff insert scoped bans" on public.banned_users
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.caller_effective_rank(room_id) >= public.role_rank('host')
      and ban_type in ('mute', 'room', 'kick')
    )
  );
