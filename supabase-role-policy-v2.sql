-- Host role + role policy + session/temporary grants (Kalamngy-style)
-- Run via: node scripts/apply-role-policy-v2.mjs

-- 1) Allow host in room_member_roles
alter table public.room_member_roles drop constraint if exists room_member_roles_role_check;
alter table public.room_member_roles
  add constraint room_member_roles_role_check
  check (role in ('mod', 'host', 'vip', 'platinum_vip'));

-- 2) Policy table (owner toggles roles + grant matrix)
create table if not exists public.role_grants_policy (
  id text primary key default 'global',
  enabled_roles jsonb not null default '{
    "owner": true, "admin": true, "mod": true, "host": true,
    "platinum_vip": true, "vip": true, "user": true, "guest": true
  }'::jsonb,
  grant_matrix jsonb not null default '{
    "owner": ["admin","mod","host","platinum_vip","vip","user","guest"],
    "admin": ["mod","host","platinum_vip","vip","user","guest"],
    "mod": ["host","platinum_vip","vip"],
    "host": ["vip"]
  }'::jsonb,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.role_grants_policy enable row level security;

drop policy if exists "Anyone read role grants policy" on public.role_grants_policy;
create policy "Anyone read role grants policy" on public.role_grants_policy
  for select using (true);

drop policy if exists "Owner write role grants policy" on public.role_grants_policy;
create policy "Owner write role grants policy" on public.role_grants_policy
  for all using (public.is_owner()) with check (public.is_owner());

insert into public.role_grants_policy (id)
values ('global')
on conflict (id) do nothing;

-- 3) Temporary / session grants (cleared on logout)
create table if not exists public.room_temp_grants (
  room_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default '',
  role text not null check (role in ('mod', 'host', 'vip', 'platinum_vip')),
  granted_by uuid references auth.users(id),
  grant_type text not null default 'session'
    check (grant_type in ('session', 'timed')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (room_id, user_id)
);

create index if not exists room_temp_grants_user_idx on public.room_temp_grants (user_id);

alter table public.room_temp_grants enable row level security;

drop policy if exists "Authenticated read temp grants" on public.room_temp_grants;
create policy "Authenticated read temp grants" on public.room_temp_grants
  for select to authenticated using (true);

-- Helper: numeric rank for hierarchy checks
create or replace function public.role_rank(p_role text)
returns int language sql immutable as $$
  select case lower(coalesce(p_role, ''))
    when 'owner' then 100 when 'admin' then 80 when 'mod' then 60
    when 'host' then 40 when 'platinum_vip' then 30 when 'vip' then 20
    when 'user' then 10 when 'guest' then 0 else 0 end;
$$;

create or replace function public.effective_room_role(p_user_id uuid, p_room_id text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select ur.role from public.user_roles ur where ur.user_id = p_user_id),
    'user'
  ) as global_role
$$;

-- Revoke all session temp grants for current user (call on logout/close)
create or replace function public.revoke_my_temp_grants()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  delete from public.room_temp_grants
  where user_id = v_uid and grant_type = 'session';
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.revoke_my_temp_grants() from public;
grant execute on function public.revoke_my_temp_grants() to authenticated;

-- Replace promote_member_role with hierarchy + temp grants + host
create or replace function public.promote_member_role(
  p_room_id text,
  p_target_user_id uuid,
  p_target_nickname text,
  p_new_role text,
  p_operator_nickname text default '',
  p_is_temporary boolean default false,
  p_duration_minutes int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid;
  v_caller_global text;
  v_caller_room text;
  v_caller_rank int;
  v_target_global text;
  v_target_room text;
  v_role text;
  v_nick text;
  v_op_nick text;
  v_policy record;
  v_matrix jsonb;
  v_enabled jsonb;
  v_can_grant boolean := false;
  v_granter_key text;
begin
  v_caller := auth.uid();
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_room_id is null or length(trim(p_room_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'room_required');
  end if;
  if p_target_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'target_required');
  end if;
  if not exists (select 1 from auth.users where id = p_target_user_id) then
    return jsonb_build_object('ok', false, 'error', 'target_not_found');
  end if;

  v_role := lower(trim(coalesce(p_new_role, '')));
  v_nick := coalesce(nullif(trim(p_target_nickname), ''), p_target_user_id::text);
  v_op_nick := coalesce(nullif(trim(p_operator_nickname), ''), v_caller::text);

  select * into v_policy from public.role_grants_policy where id = 'global';
  v_enabled := coalesce(v_policy.enabled_roles, '{}'::jsonb);
  v_matrix := coalesce(v_policy.grant_matrix, '{}'::jsonb);

  if not coalesce((v_enabled ->> v_role)::boolean, true) and v_role not in ('user', 'guest') then
    return jsonb_build_object('ok', false, 'error', 'role_disabled');
  end if;

  select role into v_caller_global from public.user_roles where user_id = v_caller;
  v_caller_global := coalesce(v_caller_global, 'user');
  select role into v_caller_room from public.room_member_roles
  where room_id = p_room_id and user_id = v_caller;
  v_caller_rank := greatest(public.role_rank(v_caller_global), public.role_rank(v_caller_room));

  if v_caller_rank < public.role_rank('host') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  -- Determine granter key for matrix lookup
  if public.role_rank(v_caller_global) >= public.role_rank(v_caller_room) then
    v_granter_key := v_caller_global;
  else
    v_granter_key := coalesce(v_caller_room, v_caller_global);
  end if;
  if v_granter_key in ('malek', 'المالك') then v_granter_key := 'owner'; end if;
  if v_granter_key = 'أدمن' then v_granter_key := 'admin'; end if;

  if v_role = 'owner' and v_caller_global not in ('owner', 'malek', 'المالك') then
    return jsonb_build_object('ok', false, 'error', 'only_owner_can_grant_owner');
  end if;
  if v_role = 'admin' and v_caller_global not in ('owner', 'malek', 'المالك') then
    return jsonb_build_object('ok', false, 'error', 'only_owner_can_grant_admin');
  end if;

  if v_role in ('owner', 'admin') then
    v_can_grant := v_caller_global in ('owner', 'malek', 'المالك');
  elsif v_role in ('user', 'guest') then
    v_can_grant := v_caller_rank >= public.role_rank('host');
  else
    v_can_grant := v_matrix ? v_granter_key and v_matrix -> v_granter_key ? v_role;
    if not v_can_grant then
      v_can_grant := v_caller_rank > public.role_rank(v_role);
    end if;
  end if;

  if not v_can_grant then
    return jsonb_build_object('ok', false, 'error', 'cannot_grant_role');
  end if;

  select role into v_target_global from public.user_roles where user_id = p_target_user_id;

  -- Global owner / admin
  if v_role in ('owner', 'admin') then
    insert into public.user_roles (user_id, role, updated_at)
    values (p_target_user_id, v_role, timezone('utc'::text, now()))
    on conflict (user_id) do update set role = excluded.role, updated_at = excluded.updated_at;
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
    where id = p_target_user_id;
    insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
    values (to_char(timezone('utc'::text, now()), 'HH24:MI'), 'promote', v_nick, v_op_nick,
      format('ترقية عالمية إلى [%s]', v_role));
    return jsonb_build_object('ok', true, 'scope', 'global', 'role', v_role, 'temporary', false);
  end if;

  -- Demote / clear
  if v_role in ('user', 'guest') then
    if v_target_global = 'owner' and v_caller_global not in ('owner', 'malek', 'المالك') then
      return jsonb_build_object('ok', false, 'error', 'cannot_demote_owner');
    end if;
    if v_target_global = 'admin' and v_caller_global not in ('owner', 'malek', 'المالك') then
      return jsonb_build_object('ok', false, 'error', 'only_owner_can_demote_admin');
    end if;
    if v_target_global in ('owner', 'admin', 'mod') then
      insert into public.user_roles (user_id, role, updated_at)
      values (p_target_user_id, 'user', timezone('utc'::text, now()))
      on conflict (user_id) do update set role = 'user', updated_at = excluded.updated_at;
      update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
      where id = p_target_user_id;
    end if;
    delete from public.room_member_roles where room_id = p_room_id and user_id = p_target_user_id;
    delete from public.room_temp_grants where room_id = p_room_id and user_id = p_target_user_id;
    insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
    values (to_char(timezone('utc'::text, now()), 'HH24:MI'), 'demote', v_nick, v_op_nick,
      format('تخفيض في غرفة [%s] إلى [%s]', p_room_id, v_role));
    return jsonb_build_object('ok', true, 'scope', 'room_clear', 'room_id', p_room_id, 'role', v_role);
  end if;

  -- Temporary grant (session or timed)
  if p_is_temporary and v_role in ('mod', 'host', 'vip', 'platinum_vip') then
    insert into public.room_temp_grants (room_id, user_id, nickname, role, granted_by, grant_type, expires_at)
    values (
      p_room_id, p_target_user_id, v_nick, v_role, v_caller,
      case when p_duration_minutes is not null and p_duration_minutes > 0 then 'timed' else 'session' end,
      case when p_duration_minutes is not null and p_duration_minutes > 0
        then timezone('utc'::text, now()) + (p_duration_minutes || ' minutes')::interval
        else null end
    )
    on conflict (room_id, user_id) do update
      set role = excluded.role, nickname = excluded.nickname, granted_by = excluded.granted_by,
          grant_type = excluded.grant_type, expires_at = excluded.expires_at,
          created_at = timezone('utc'::text, now());
    insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
    values (to_char(timezone('utc'::text, now()), 'HH24:MI'), 'promote', v_nick, v_op_nick,
      format('منح مؤقت [%s] في غرفة [%s] — ينتهي عند الخروج%s', v_role, p_room_id,
        case when p_duration_minutes is not null then format(' أو بعد %s د', p_duration_minutes) else '' end));
    return jsonb_build_object('ok', true, 'scope', 'temp', 'room_id', p_room_id, 'role', v_role, 'temporary', true);
  end if;

  -- Permanent room grant
  if v_role in ('mod', 'host', 'vip', 'platinum_vip') then
    delete from public.room_temp_grants where room_id = p_room_id and user_id = p_target_user_id;
    insert into public.room_member_roles (room_id, user_id, nickname, role, updated_by)
    values (p_room_id, p_target_user_id, v_nick, v_role, v_caller)
    on conflict (room_id, user_id) do update
      set role = excluded.role, nickname = excluded.nickname, updated_by = excluded.updated_by,
          updated_at = timezone('utc'::text, now());
    insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
    values (to_char(timezone('utc'::text, now()), 'HH24:MI'), 'promote', v_nick, v_op_nick,
      format('ترقية دائمة في غرفة [%s] إلى [%s]', p_room_id, v_role));
    return jsonb_build_object('ok', true, 'scope', 'room', 'room_id', p_room_id, 'role', v_role, 'temporary', false);
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_role', 'role', v_role);
end;
$$;

revoke all on function public.promote_member_role(text, uuid, text, text, text, boolean, int) from public;
grant execute on function public.promote_member_role(text, uuid, text, text, text, boolean, int) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.role_grants_policy;
  alter publication supabase_realtime add table public.room_temp_grants;
exception when others then null;
end $$;
