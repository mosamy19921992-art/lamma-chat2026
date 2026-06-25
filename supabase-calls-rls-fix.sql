-- Fix call_signals RLS policy to include can_place_call permission check
-- This ensures users can only place calls if they have permission (or are registered participants with no explicit restriction)

drop policy if exists "Users send call signals" on public.call_signals;

create policy "Users send call signals" on public.call_signals
  for insert
  to authenticated
  with check (
    from_uid = auth.uid()::text
    and public.can_place_call(call_type)
  );
