-- Lamma Chat — Lock down participation RPCs from anon role
-- Supabase PostgREST uses role `anon`, not only PostgreSQL `public`.

-- Remove legacy 2-arg overload when the 4-arg function exists (avoid ambiguity).
drop function if exists public.is_user_banned(text, text);

-- Ensure canonical 4-arg ban check exists (idempotent with moderation-p1)
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

revoke all on function public.is_user_banned(text, text, text, text) from anon, public;
grant execute on function public.is_user_banned(text, text, text, text) to authenticated;

revoke all on function public.participation_allowed() from anon, public;
grant execute on function public.participation_allowed() to authenticated;

revoke all on function public.can_place_call(text) from anon, public;
grant execute on function public.can_place_call(text) to authenticated;

-- Belt-and-suspenders for audit fix
revoke all on function public.is_message_clean(text) from anon, public;
grant execute on function public.is_message_clean(text) to authenticated;
