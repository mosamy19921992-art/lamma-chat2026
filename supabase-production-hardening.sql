-- Lamma Chat — Production hardening (run once in Supabase SQL Editor)
-- Applies server-side fixes that cannot be done from the React client alone.

-- 1) Moderate ALL user-visible content fields, not only type=text
create or replace function public.is_message_clean(msg_text text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bw_array jsonb;
  bword    text;
begin
  if public.is_admin() then
    return true;
  end if;

  if msg_text is null or msg_text = '' then
    return true;
  end if;

  select banned_words
  into bw_array
  from public.owner_settings
  where id = 'global'
  limit 1;

  if bw_array is not null and jsonb_array_length(bw_array) > 0 then
    for bword in select jsonb_array_elements_text(bw_array)
    loop
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

revoke all on function public.is_message_clean(text) from public;
grant execute on function public.is_message_clean(text) to authenticated, anon;

drop policy if exists "Allow insert for authenticated or with sender_uid" on public.messages;
create policy "Allow insert for authenticated or with sender_uid" on public.messages
  for insert
  with check (
    (
      (auth.uid() is not null and sender_uid = auth.uid()::text)
      or (
        auth.uid() is null
        and sender_uid is not null
        and length(sender_uid) > 0
      )
    )
    and (text is null or public.is_message_clean(text))
    and (media_url is null or public.is_message_clean(media_url))
  );

-- 2) Prefer user_roles table over client metadata for privileged checks
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
    case
      when auth.uid() is null then 'guest'
      else 'user'
    end
  );
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated, anon;

-- 3) Purge stale guest messages older than 24 hours (schedule via pg_cron if available)
create or replace function public.purge_stale_guest_messages(max_age interval default interval '24 hours')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.messages
  where created_at < timezone('utc'::text, now()) - max_age
    and sender_uid is not null
    and sender_uid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_stale_guest_messages(interval) from public;
grant execute on function public.purge_stale_guest_messages(interval) to service_role;

-- Verify:
-- select public.is_message_clean('hello');
-- select public.purge_stale_guest_messages();
