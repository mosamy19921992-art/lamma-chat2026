-- P0 moderation hardening: typed bans, server RPC, RLS fixes
-- Run via: node scripts/apply-moderation-hardening.mjs

-- ── Prerequisites (idempotent if prior migrations missing) ─────────────────
create or replace function public.is_message_clean(msg_text text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bw_array jsonb;
  bword text;
begin
  if public.is_admin() then
    return true;
  end if;
  if msg_text is null or msg_text = '' then
    return true;
  end if;
  select banned_words into bw_array
  from public.owner_settings where id = 'global' limit 1;
  if bw_array is not null and jsonb_array_length(bw_array) > 0 then
    for bword in select jsonb_array_elements_text(bw_array) loop
      if bword <> '' and msg_text ilike '%' || bword || '%' then
        return false;
      end if;
    end loop;
  end if;
  if msg_text ~* '(https?://[^\s]+|www\.[a-z0-9\-]+\.[a-z]{2,}[^\s]*)' then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.participation_allowed()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  invite_only boolean := false;
  is_anonymous boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;
  if public.is_admin() then
    return true;
  end if;
  select coalesce(os.invite_only_mode, false)
  into invite_only
  from public.owner_settings os
  where os.id = 'global'
  limit 1;
  if not invite_only then
    return true;
  end if;
  is_anonymous := coalesce((auth.jwt()->>'is_anonymous')::boolean, false);
  return not is_anonymous;
end;
$$;

-- ── Typed ban columns ─────────────────────────────────────────────────────
alter table public.banned_users
  add column if not exists ban_type text not null default 'ban'
    check (ban_type in ('ban', 'megaban', 'mute', 'room', 'shadow', 'kick')),
  add column if not exists room_id text,
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists expires_at timestamptz;

create index if not exists banned_users_target_uid_idx
  on public.banned_users (target_user_id);
create index if not exists banned_users_room_type_idx
  on public.banned_users (room_id, ban_type);

-- Backfill ban_type from legacy JSON reason when possible
update public.banned_users bu
set ban_type = coalesce(
  nullif(
    (regexp_replace(bu.reason, '^lamma-ban-json:', ''))::jsonb->>'type',
    ''
  ),
  bu.ban_type
)
where bu.reason like 'lamma-ban-json:%'
  and bu.ban_type = 'ban';

-- ── is_user_banned (typed, room-aware) ────────────────────────────────────
drop function if exists public.is_user_banned(text, text);

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
          and bu.ban_type = 'room'
          and bu.room_id is not null
          and bu.room_id = coalesce(p_room_id, '')
        )
      )
  );
$$;

revoke all on function public.is_user_banned(text, text, text, text) from public;
grant execute on function public.is_user_banned(text, text, text, text) to authenticated;

-- ── Caller effective rank (global + room + temp grant) ──────────────────────
create or replace function public.caller_effective_rank(p_room_id text default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    public.role_rank(coalesce(
      (select role from public.user_roles where user_id = auth.uid()),
      'user'
    )),
    public.role_rank(coalesce(
      (select r.role from public.room_member_roles r
        where r.user_id = auth.uid() and r.room_id = p_room_id),
      'user'
    )),
    public.role_rank(coalesce(
      (select t.role from public.room_temp_grants t
        where t.user_id = auth.uid() and t.room_id = p_room_id
          and (t.expires_at is null or t.expires_at > timezone('utc'::text, now()))
        limit 1),
      'user'
    ))
  );
$$;

revoke all on function public.caller_effective_rank(text) from public;
grant execute on function public.caller_effective_rank(text) to authenticated;

-- ── apply_moderation_action RPC ───────────────────────────────────────────
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

  if p_action in ('mute', 'unmute') and v_rank < public.role_rank('host') then
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
      'mute',
      p_target_user_id,
      p_room_id
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
      'room',
      p_target_user_id,
      p_room_id
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
      'megaban',
      p_target_user_id
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

revoke all on function public.apply_moderation_action(text, uuid, text, text, text) from public;
grant execute on function public.apply_moderation_action(text, uuid, text, text, text) to authenticated;

-- ── Active sanctions for current user ─────────────────────────────────────
create or replace function public.get_my_active_sanctions()
returns setof public.banned_users
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.banned_users bu
  where (bu.expires_at is null or bu.expires_at > timezone('utc'::text, now()))
    and bu.target_user_id = auth.uid()
  order by bu.created_at desc;
$$;

revoke all on function public.get_my_active_sanctions() from public;
grant execute on function public.get_my_active_sanctions() to authenticated;

-- ── RLS: banned_users ─────────────────────────────────────────────────────
drop policy if exists "Allow read access to banned list" on public.banned_users;
drop policy if exists "Allow anonymous read access on banned_users" on public.banned_users;
drop policy if exists "Admins read all bans" on public.banned_users;
drop policy if exists "Users read own ban rows" on public.banned_users;
drop policy if exists "Staff read bans" on public.banned_users;

create policy "Staff and self read bans" on public.banned_users
  for select to authenticated
  using (
    public.is_admin()
    or target_user_id = auth.uid()
    or public.caller_effective_rank(room_id) >= public.role_rank('host')
  );

drop policy if exists "Only admins can ban users" on public.banned_users;
drop policy if exists "Staff insert scoped bans" on public.banned_users;

create policy "Staff insert scoped bans" on public.banned_users
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.caller_effective_rank(room_id) >= public.role_rank('host')
      and ban_type in ('mute', 'room')
    )
  );

drop policy if exists "Only admins can unban users" on public.banned_users;
drop policy if exists "Staff delete scoped bans" on public.banned_users;

create policy "Staff delete scoped bans" on public.banned_users
  for delete to authenticated
  using (
    public.is_admin()
    or (
      public.caller_effective_rank(room_id) >= public.role_rank('host')
      and ban_type in ('mute', 'room')
    )
  );

-- ── messages INSERT/DELETE ────────────────────────────────────────────────
drop policy if exists "Authenticated users insert own messages" on public.messages;
create policy "Authenticated users insert own messages" on public.messages
  for insert to authenticated
  with check (
    sender_uid = auth.uid()::text
    and public.participation_allowed()
    and not public.is_user_banned(
      auth.uid()::text,
      public.resolve_bound_nickname(auth.uid()::text),
      room_id,
      'speak'
    )
    and (text is null or public.is_message_clean(text))
    and (media_url is null or public.is_message_clean(media_url))
  );

drop policy if exists "Allow delete access" on public.messages;
create policy "Allow delete access" on public.messages
  for delete to authenticated
  using (
    public.is_admin()
    or auth.uid()::text = sender_uid
    or public.caller_effective_rank(room_id) >= public.role_rank('mod')
  );

-- ── PM + calls: speak-level ban check ─────────────────────────────────────
drop policy if exists "Authenticated users insert PM" on public.pm_messages;
create policy "Authenticated users insert PM" on public.pm_messages
  for insert to authenticated
  with check (
    sender_uid = auth.uid()::text
    and public.participation_allowed()
    and not public.is_user_banned(
      auth.uid()::text,
      public.resolve_bound_nickname(auth.uid()::text),
      null,
      'speak'
    )
  );

drop policy if exists "Users send call signals" on public.call_signals;
do $$
begin
  create policy "Users send call signals" on public.call_signals
    for insert to authenticated
    with check (
      from_uid = auth.uid()::text
      and not public.is_user_banned(
        auth.uid()::text,
        public.resolve_bound_nickname(auth.uid()::text),
        null,
        'speak'
      )
    );
exception when undefined_table then null;
end $$;

-- ── Fix create_private_chat_room nickname spoof ───────────────────────────
create or replace function public.create_private_chat_room(
  p_name text,
  p_password text,
  p_operator_nickname text default '',
  p_room_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_role text;
  v_nick text;
  v_room_id text;
  v_quota int := 0;
  v_allowed boolean := false;
  v_count int := 0;
  v_pwd text;
  v_hash text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    return jsonb_build_object('ok', false, 'error', 'name_too_short');
  end if;

  v_role := public.current_app_role();
  v_nick := public.resolve_bound_nickname(v_uid::text);

  if v_role in ('owner', 'malek', 'المالك', 'admin', 'أدمن') then
    v_allowed := true;
    v_quota := 9999;
  else
    select
      coalesce(p.room_creation_allowed, false),
      coalesce(p.room_creation_quota, 0)
    into v_allowed, v_quota
    from public.owner_member_permissions p
    where lower(p.nickname) = lower(v_nick);

    if not v_allowed or v_quota <= 0 then
      return jsonb_build_object('ok', false, 'error', 'room_creation_not_granted');
    end if;
  end if;

  select count(*) into v_count
  from public.private_chat_rooms
  where owner_uid = v_uid;

  if v_count >= v_quota then
    return jsonb_build_object(
      'ok', false,
      'error', 'quota_exceeded',
      'quota', v_quota,
      'used', v_count
    );
  end if;

  v_pwd := trim(coalesce(p_password, ''));
  if v_role not in ('owner', 'malek', 'المالك', 'admin', 'أدمن') and length(v_pwd) < 4 then
    return jsonb_build_object('ok', false, 'error', 'password_required');
  end if;

  v_room_id := nullif(trim(coalesce(p_room_id, '')), '');
  if v_room_id is null then
    v_room_id := 'pr-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  end if;

  if exists (select 1 from public.private_chat_rooms where room_id = v_room_id) then
    return jsonb_build_object('ok', false, 'error', 'room_exists');
  end if;

  if length(v_pwd) >= 4 then
    v_hash := crypt(v_pwd, gen_salt('bf'));
  else
    v_hash := null;
  end if;

  insert into public.private_chat_rooms (room_id, name, password_hash, owner_uid, owner_nickname)
  values (v_room_id, trim(p_name), v_hash, v_uid, v_nick);

  insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
  values (
    to_char(timezone('utc'::text, now()), 'HH24:MI'),
    'promote',
    v_nick,
    v_nick,
    format('إنشاء غرفة خاصة [%s] %s', v_room_id, case when v_hash is not null then '🔒' else '🔓' end)
  );

  return jsonb_build_object(
    'ok', true,
    'room_id', v_room_id,
    'name', trim(p_name),
    'is_locked', v_hash is not null,
    'quota', v_quota,
    'used', v_count + 1
  );
end;
$$;

-- ── Harden claim_owner_role_for_email ─────────────────────────────────────
create or replace function public.claim_owner_role_for_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_email text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (
    select 1 from public.user_roles
    where role in ('owner', 'malek', 'المالك')
      and user_id <> v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'owner_already_claimed');
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null or lower(trim(v_email)) <> lower(trim(p_email)) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch', 'email', v_email);
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid, 'owner')
  on conflict (user_id) do update
    set role = 'owner', updated_at = timezone('utc'::text, now());

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
  where id = v_uid;

  return jsonb_build_object('ok', true, 'user_id', v_uid, 'email', v_email);
end;
$$;
