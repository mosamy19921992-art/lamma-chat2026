-- Room-scoped member roles + global promotion RPC
-- Run via: node scripts/apply-room-member-roles.mjs

create table if not exists public.room_member_roles (
  room_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default '',
  role text not null check (role in ('mod', 'vip', 'platinum_vip')),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_by uuid references auth.users(id),
  primary key (room_id, user_id)
);

create index if not exists room_member_roles_room_id_idx
  on public.room_member_roles (room_id);

alter table public.room_member_roles enable row level security;

drop policy if exists "Authenticated read room member roles" on public.room_member_roles;
create policy "Authenticated read room member roles" on public.room_member_roles
  for select
  to authenticated
  using (true);

create or replace function public.promote_member_role(
  p_room_id text,
  p_target_user_id uuid,
  p_target_nickname text,
  p_new_role text,
  p_operator_nickname text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid;
  v_caller_role text;
  v_role text;
  v_target_global text;
  v_nick text;
  v_op_nick text;
begin
  v_caller := auth.uid();
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_caller_role := public.current_app_role();
  if v_caller_role not in ('owner', 'admin', 'malek', 'المالك', 'أدمن') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
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

  select role into v_target_global
  from public.user_roles
  where user_id = p_target_user_id;

  -- Global staff: owner / admin (all rooms)
  if v_role in ('owner', 'admin') then
    if v_role = 'owner' and v_caller_role not in ('owner', 'malek', 'المالك') then
      return jsonb_build_object('ok', false, 'error', 'only_owner_can_grant_owner');
    end if;
    if v_role = 'admin' and v_caller_role not in ('owner', 'malek', 'المالك') then
      return jsonb_build_object('ok', false, 'error', 'only_owner_can_grant_admin');
    end if;

    insert into public.user_roles (user_id, role, updated_at)
    values (p_target_user_id, v_role, timezone('utc'::text, now()))
    on conflict (user_id) do update
      set role = excluded.role, updated_at = excluded.updated_at;

    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', v_role)
    where id = p_target_user_id;

    insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
    values (
      to_char(timezone('utc'::text, now()), 'HH24:MI'),
      'promote',
      v_nick,
      v_op_nick,
      format('ترقية عالمية إلى [%s] — تطبق على كل الغرف', v_role)
    );

    return jsonb_build_object('ok', true, 'scope', 'global', 'role', v_role);
  end if;

  -- Demote to user/guest: clear room row + downgrade global staff when needed
  if v_role in ('user', 'guest') then
    if v_target_global = 'owner' and v_caller_role not in ('owner', 'malek', 'المالك') then
      return jsonb_build_object('ok', false, 'error', 'cannot_demote_owner');
    end if;
    if v_target_global = 'admin' and v_caller_role not in ('owner', 'malek', 'المالك') then
      return jsonb_build_object('ok', false, 'error', 'only_owner_can_demote_admin');
    end if;

    if v_target_global in ('owner', 'admin', 'mod') then
      insert into public.user_roles (user_id, role, updated_at)
      values (p_target_user_id, 'user', timezone('utc'::text, now()))
      on conflict (user_id) do update
        set role = 'user', updated_at = excluded.updated_at;

      update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', v_role)
      where id = p_target_user_id;
    end if;

    delete from public.room_member_roles
    where room_id = p_room_id and user_id = p_target_user_id;

    insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
    values (
      to_char(timezone('utc'::text, now()), 'HH24:MI'),
      'demote',
      v_nick,
      v_op_nick,
      format('تخفيض في غرفة [%s] إلى [%s]', p_room_id, v_role)
    );

    return jsonb_build_object(
      'ok', true,
      'scope', 'room_clear',
      'room_id', p_room_id,
      'role', v_role
    );
  end if;

  -- Room-scoped elevation: mod / vip / platinum_vip
  if v_role in ('mod', 'vip', 'platinum_vip') then
    insert into public.room_member_roles (room_id, user_id, nickname, role, updated_by)
    values (p_room_id, p_target_user_id, v_nick, v_role, v_caller)
    on conflict (room_id, user_id) do update
      set role = excluded.role,
          nickname = excluded.nickname,
          updated_by = excluded.updated_by,
          updated_at = timezone('utc'::text, now());

    insert into public.owner_activity_logs (time, type, user_nickname, operator_nickname, details)
    values (
      to_char(timezone('utc'::text, now()), 'HH24:MI'),
      'promote',
      v_nick,
      v_op_nick,
      format('ترقية في غرفة [%s] إلى [%s]', p_room_id, v_role)
    );

    return jsonb_build_object(
      'ok', true,
      'scope', 'room',
      'room_id', p_room_id,
      'role', v_role
    );
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_role', 'role', v_role);
end;
$$;

revoke all on function public.promote_member_role(text, uuid, text, text, text) from public;
grant execute on function public.promote_member_role(text, uuid, text, text, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.room_member_roles;
exception
  when duplicate_object then null;
  when others then null;
end $$;
