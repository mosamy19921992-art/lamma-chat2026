-- P2 moderation: server shadow ban, system messages, message visibility
-- Run via: node scripts/apply-moderation-p2.mjs

alter table public.messages
  add column if not exists is_shadow boolean not null default false;

create index if not exists messages_shadow_idx
  on public.messages (room_id, is_shadow)
  where is_shadow = true;

create or replace function public.is_user_shadow_banned(
  p_uid text,
  p_nickname text
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
    where bu.ban_type = 'shadow'
      and (bu.expires_at is null or bu.expires_at > timezone('utc'::text, now()))
      and (
        bu.target_user_id = auth.uid()
        or bu.uid = coalesce(p_uid, '')
        or lower(trim(bu.author)) = lower(trim(coalesce(p_nickname, '')))
      )
  );
$$;

revoke all on function public.is_user_shadow_banned(text, text) from public;
grant execute on function public.is_user_shadow_banned(text, text) to authenticated;

create or replace function public.mark_shadow_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_user_shadow_banned(
    coalesce(new.sender_uid, auth.uid()::text),
    public.resolve_bound_nickname(coalesce(new.sender_uid, auth.uid()::text))
  ) then
    new.is_shadow := true;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_mark_shadow on public.messages;
create trigger messages_mark_shadow
  before insert on public.messages
  for each row
  execute function public.mark_shadow_messages_before_insert();

drop policy if exists "Allow read access to all" on public.messages;
drop policy if exists "Allow anonymous read access" on public.messages;
drop policy if exists "Room messages readable" on public.messages;
create policy "Room messages readable" on public.messages
  for select
  using (
    public.is_admin()
    or not coalesce(is_shadow, false)
    or sender_uid = auth.uid()::text
  );

create or replace function public.post_room_system_message(
  p_room_id text,
  p_text text,
  p_color text default '#f59e0b',
  p_author text default 'LC-Fire 🔥'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid := auth.uid();
  v_rank int;
  v_id uuid := gen_random_uuid();
begin
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_room_id is null or length(trim(p_room_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'room_required');
  end if;

  if p_text is null or length(trim(p_text)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'text_required');
  end if;

  v_rank := public.caller_effective_rank(p_room_id);
  if v_rank < public.role_rank('host') and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  insert into public.messages (
    id,
    room_id,
    author,
    text,
    color,
    type,
    sender_uid,
    is_shadow
  )
  values (
    v_id,
    trim(p_room_id),
    coalesce(nullif(trim(p_author), ''), 'LC-Fire 🔥'),
    left(trim(p_text), 8000),
    coalesce(nullif(trim(p_color), ''), '#f59e0b'),
    'system',
    v_caller::text,
    false
  );

  return jsonb_build_object('ok', true, 'message_id', v_id);
end;
$$;

revoke all on function public.post_room_system_message(text, text, text, text) from public;
grant execute on function public.post_room_system_message(text, text, text, text) to authenticated;

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

  if p_action in ('mute', 'unmute', 'kick', 'unkick', 'shadow', 'unshadow')
     and v_rank < public.role_rank('host') then
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

  elsif p_action = 'shadow' then
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id, room_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'shadow'),
      'shadow', p_target_user_id, p_room_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unshadow' then
    delete from public.banned_users
    where ban_type = 'shadow'
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unshadow');

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

drop policy if exists "Staff delete scoped bans" on public.banned_users;
create policy "Staff delete scoped bans" on public.banned_users
  for delete to authenticated
  using (
    public.is_admin()
    or (
      public.caller_effective_rank(room_id) >= public.role_rank('host')
      and ban_type in ('mute', 'room', 'kick', 'shadow')
    )
  );

drop policy if exists "Staff insert scoped bans" on public.banned_users;
create policy "Staff insert scoped bans" on public.banned_users
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.caller_effective_rank(room_id) >= public.role_rank('host')
      and ban_type in ('mute', 'room', 'kick', 'shadow')
    )
  );

-- Preserve custom author labels on server-posted system messages
create or replace function public.bind_message_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  new.sender_uid := auth.uid()::text;

  if coalesce(new.type, 'text') = 'system'
     and new.author is not null
     and length(trim(new.author)) > 0 then
    return new;
  end if;

  new.author := public.resolve_bound_nickname(new.sender_uid);
  return new;
end;
$$;

drop trigger if exists messages_bind_identity on public.messages;
create trigger messages_bind_identity
  before insert on public.messages
  for each row
  execute function public.bind_message_identity();
