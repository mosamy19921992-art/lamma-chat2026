-- Allow registered participants to place calls when no explicit permission row exists.
-- Owner can still deny via owner_member_permissions (calls_allowed / video_calls_allowed = false).

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
