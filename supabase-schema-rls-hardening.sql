-- Lamma Chat — Schema / RLS hardening (P0 from DB audit)
-- Run via: node scripts/apply-schema-rls-hardening.mjs
--
-- P0: Orphan private-room messages no longer readable after room delete
-- P0: Hide password_hash from client roles (column-level grants)
-- P1: Purge chat data when auth.users row is deleted
-- P1: delete_private_chat_room removes messages + grants

-- ── P0: Fix can_access_private_room (orphan pr-* rooms) ───────────────────────

create or replace function public.can_access_private_room(p_room_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_room_id not like 'pr-%'
      and not exists (
        select 1
        from public.private_chat_rooms p
        where p.room_id = p_room_id
      )
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

-- ── P0: Column-level — clients never read password_hash ───────────────────

revoke all on table public.private_chat_rooms from anon, authenticated;
grant select (
  room_id,
  name,
  owner_nickname,
  owner_uid,
  created_at
) on table public.private_chat_rooms to anon, authenticated;

-- ── P1: Delete private room + its messages ──────────────────────────────────

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

  select owner_uid into v_owner
  from public.private_chat_rooms
  where room_id = p_room_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'room_not_found');
  end if;

  v_role := public.current_app_role();
  if v_owner <> v_uid and v_role not in ('owner', 'malek', 'المالك', 'admin', 'أدمن') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  delete from public.messages where room_id = p_room_id;
  delete from public.private_room_grants where room_id = p_room_id;
  delete from public.private_chat_rooms where room_id = p_room_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_private_chat_room(text) from public;
grant execute on function public.delete_private_chat_room(text) to authenticated;

-- ── P1: Purge user chat data on auth.users DELETE ──────────────────────────

create or replace function public.handle_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.messages
  where room_id in (
    select p.room_id
    from public.private_chat_rooms p
    where p.owner_uid = old.id
  );

  delete from public.messages
  where sender_uid = old.id::text;

  delete from public.pm_messages
  where sender_uid = old.id::text
     or receiver_uid = old.id::text;

  delete from public.user_profiles
  where user_uid = old.id::text;

  delete from public.guest_sessions
  where auth_uid = old.id::text;

  delete from public.chat_reports
  where reporter_uid = old.id::text;

  delete from public.social_posts
  where author_uid = old.id::text;

  delete from public.post_likes
  where user_uid = old.id::text;

  delete from public.post_comments
  where author_uid = old.id::text;

  delete from public.vip_subscriptions
  where user_id = old.id::text;

  delete from public.subscription_orders
  where user_id = old.id::text;

  delete from public.call_signals
  where from_uid = old.id::text
     or to_uid = old.id::text;

  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  before delete on auth.users
  for each row
  execute function public.handle_deleted_user();
