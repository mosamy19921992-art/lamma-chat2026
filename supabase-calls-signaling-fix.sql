-- Fix WebRTC call signaling: default allow + callee can answer without ring permission.
-- Run in Supabase SQL Editor (production project detvapbvkabvdjsdttfy).

-- 1) Registered participants may place calls when no explicit permission row exists.
create or replace function public.can_place_call(p_call_type text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  bound_nickname text;
  perm record;
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.is_admin() then
    return true;
  end if;

  if not public.participation_allowed() then
    return false;
  end if;

  bound_nickname := public.resolve_bound_nickname(auth.uid()::text);

  select
    coalesce(calls_allowed, false) as calls_allowed,
    coalesce(video_calls_allowed, false) as video_calls_allowed
  into perm
  from public.owner_member_permissions
  where lower(trim(nickname)) = lower(trim(bound_nickname))
  limit 1;

  if not found then
    return true;
  end if;

  if lower(coalesce(p_call_type, 'audio')) = 'video' then
    return perm.video_calls_allowed;
  end if;

  return perm.calls_allowed;
end;
$$;

revoke all on function public.can_place_call(text) from public;
grant execute on function public.can_place_call(text) to authenticated;

-- 2) Only "ring" requires can_place_call; callee may send answer/ice/reject/hangup.
drop policy if exists "Users send call signals" on public.call_signals;
create policy "Users send call signals" on public.call_signals
  for insert
  to authenticated
  with check (
    from_uid = auth.uid()::text
    and not public.is_user_banned(
      auth.uid()::text,
      public.resolve_bound_nickname(auth.uid()::text)
    )
    and (
      signal_type <> 'ring'
      or public.can_place_call(call_type)
    )
  );

-- 3) Ensure Realtime publication includes call_signals.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'call_signals'
  ) then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;
