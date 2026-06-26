-- Lamma Chat — Security pen-test fixes (P0 + P1)
-- Run via: node scripts/apply-security-pen-test-fixes.mjs
--
-- P0: Stop trusting user_metadata.role for is_admin / is_owner (metadata is user-editable).
-- P1: Enforce private-room password on messages SELECT/INSERT via server-side grants.

-- ── P0: Role from user_roles only ───────────────────────────────────────────

create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select ur.role
      from public.user_roles ur
      where ur.user_id = auth.uid()
    ),
    case when auth.uid() is null then 'guest' else 'user' end
  );
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated, anon;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_app_role() in ('owner', 'admin', 'المالك', 'أدمن');
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_app_role() in ('owner', 'malek', 'المالك');
$$;

-- ── P1: Private room access grants ─────────────────────────────────────────

create table if not exists public.private_room_grants (
  room_id text not null references public.private_chat_rooms(room_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_at timestamp with time zone not null default timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  primary key (room_id, user_id)
);

create index if not exists private_room_grants_user_idx
  on public.private_room_grants (user_id);

alter table public.private_room_grants enable row level security;

drop policy if exists "Users read own private room grants" on public.private_room_grants;
create policy "Users read own private room grants" on public.private_room_grants
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.can_access_private_room(p_room_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
      select 1
      from public.private_chat_rooms p
      where p.room_id = p_room_id
    )
    or public.is_admin()
    or exists (
      select 1
      from public.private_chat_rooms p
      where p.room_id = p_room_id
        and (
          p.password_hash is null
          or length(p.password_hash) = 0
        )
    )
    or exists (
      select 1
      from public.private_chat_rooms p
      where p.room_id = p_room_id
        and p.owner_uid = auth.uid()
    )
    or exists (
      select 1
      from public.private_room_grants g
      where g.room_id = p_room_id
        and g.user_id = auth.uid()
        and (
          g.expires_at is null
          or g.expires_at > timezone('utc'::text, now())
        )
    );
$$;

revoke all on function public.can_access_private_room(text) from public;
grant execute on function public.can_access_private_room(text) to authenticated, anon;

create or replace function public.grant_private_room_access(p_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.private_room_grants (room_id, user_id, expires_at)
  values (
    p_room_id,
    auth.uid(),
    timezone('utc'::text, now()) + interval '30 days'
  )
  on conflict (room_id, user_id) do update
  set
    granted_at = timezone('utc'::text, now()),
    expires_at = excluded.expires_at;
end;
$$;

revoke all on function public.grant_private_room_access(text) from public;
grant execute on function public.grant_private_room_access(text) to authenticated;

-- Password verify now records server-side grant (not only sessionStorage).
create or replace function public.verify_private_room_password(
  p_room_id text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if p_room_id is null or length(trim(p_room_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'room_required');
  end if;

  select password_hash into v_hash
  from public.private_chat_rooms
  where room_id = p_room_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'room_not_found');
  end if;

  if v_hash is null or length(v_hash) = 0 then
    if auth.uid() is not null then
      perform public.grant_private_room_access(p_room_id);
    end if;
    return jsonb_build_object('ok', true, 'is_locked', false);
  end if;

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated', 'is_locked', true);
  end if;

  if p_password is null or length(trim(p_password)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'password_required', 'is_locked', true);
  end if;

  if v_hash = crypt(trim(p_password), v_hash) then
    perform public.grant_private_room_access(p_room_id);
    return jsonb_build_object('ok', true, 'is_locked', true);
  end if;

  return jsonb_build_object('ok', false, 'error', 'wrong_password', 'is_locked', true);
end;
$$;

revoke all on function public.verify_private_room_password(text, text) from public;
grant execute on function public.verify_private_room_password(text, text) to authenticated;

-- Owner gets grant when creating a locked private room.
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

  perform public.grant_private_room_access(v_room_id);

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

-- ── messages RLS: private rooms require grant ───────────────────────────────

drop policy if exists "Allow read access to all" on public.messages;
drop policy if exists "Read messages with room access" on public.messages;
create policy "Read messages with room access" on public.messages
  for select
  using (public.can_access_private_room(room_id));

drop policy if exists "Allow insert for authenticated or with sender_uid" on public.messages;
drop policy if exists "Authenticated users insert own messages" on public.messages;
create policy "Authenticated users insert own messages" on public.messages
  for insert
  to authenticated
  with check (
    sender_uid = auth.uid()::text
    and public.can_access_private_room(room_id)
    and (text is null or public.is_message_clean(text))
    and (media_url is null or public.is_message_clean(media_url))
  );
