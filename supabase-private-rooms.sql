-- Private password-protected rooms + per-member creation quota
-- Run via: node scripts/apply-private-rooms.mjs

create extension if not exists pgcrypto;

alter table public.owner_member_permissions
  add column if not exists room_creation_quota integer not null default 0;

create table if not exists public.private_chat_rooms (
  room_id text primary key,
  name text not null,
  password_hash text,
  owner_uid uuid not null references auth.users(id) on delete cascade,
  owner_nickname text not null default '',
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists private_chat_rooms_owner_uid_idx
  on public.private_chat_rooms (owner_uid);

alter table public.private_chat_rooms enable row level security;

drop policy if exists "Anyone read private room metadata" on public.private_chat_rooms;
create policy "Anyone read private room metadata" on public.private_chat_rooms
  for select to authenticated
  using (true);

-- List rooms (no password hash exposed to client queries — use RPC for verify)
create or replace function public.list_private_chat_rooms()
returns table (
  room_id text,
  name text,
  owner_nickname text,
  owner_uid uuid,
  is_locked boolean,
  created_at timestamp with time zone
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.room_id,
    p.name,
    p.owner_nickname,
    p.owner_uid,
    (p.password_hash is not null and length(p.password_hash) > 0) as is_locked,
    p.created_at
  from public.private_chat_rooms p
  order by p.created_at desc;
$$;

revoke all on function public.list_private_chat_rooms() from public;
grant execute on function public.list_private_chat_rooms() to authenticated, anon;

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

revoke all on function public.create_private_chat_room(text, text, text, text) from public;
grant execute on function public.create_private_chat_room(text, text, text, text) to authenticated;

create or replace function public.verify_private_room_password(
  p_room_id text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
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
    return jsonb_build_object('ok', true, 'is_locked', false);
  end if;

  if p_password is null or length(trim(p_password)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'password_required', 'is_locked', true);
  end if;

  if v_hash = crypt(trim(p_password), v_hash) then
    return jsonb_build_object('ok', true, 'is_locked', true);
  end if;

  return jsonb_build_object('ok', false, 'error', 'wrong_password', 'is_locked', true);
end;
$$;

revoke all on function public.verify_private_room_password(text, text) from public;
grant execute on function public.verify_private_room_password(text, text) to authenticated, anon;

create or replace function public.delete_private_chat_room(p_room_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_owner uuid;
  v_role text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select owner_uid into v_owner from public.private_chat_rooms where room_id = p_room_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'room_not_found');
  end if;

  v_role := public.current_app_role();
  if v_owner <> v_uid and v_role not in ('owner', 'malek', 'المالك', 'admin', 'أدمن') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  delete from public.private_chat_rooms where room_id = p_room_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_private_chat_room(text) from public;
grant execute on function public.delete_private_chat_room(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.private_chat_rooms;
exception when others then null;
end $$;
