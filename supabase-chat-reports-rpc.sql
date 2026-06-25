-- Reliable report submission (returns uuid, no RLS read-after-insert issues).
create or replace function public.submit_chat_report(
  p_reporter_nickname text,
  p_reported_nickname text,
  p_room_id text,
  p_room_name text default null,
  p_message_id text default null,
  p_message_excerpt text default '',
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_excerpt text := left(coalesce(trim(p_message_excerpt), ''), 500);
  v_reason text := nullif(left(coalesce(trim(p_reason), ''), 300), '');
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_excerpt = '' then
    raise exception 'empty excerpt';
  end if;

  if exists (
    select 1
    from public.chat_reports r
    where r.reporter_uid = v_uid
      and r.status = 'open'
      and r.created_at > timezone('utc', now()) - interval '1 hour'
      and (
        (
          nullif(trim(p_message_id), '') is not null
          and r.message_id = nullif(trim(p_message_id), '')
        )
        or (
          coalesce(trim(p_room_id), '') = 'help'
          and r.room_id = 'help'
          and r.message_excerpt = v_excerpt
        )
      )
  ) then
    return null;
  end if;

  insert into public.chat_reports (
    reporter_uid,
    reporter_nickname,
    reported_nickname,
    room_id,
    room_name,
    message_id,
    message_excerpt,
    reason,
    status
  )
  values (
    v_uid,
    coalesce(nullif(trim(p_reporter_nickname), ''), 'Guest'),
    coalesce(nullif(trim(p_reported_nickname), ''), '—'),
    coalesce(nullif(trim(p_room_id), ''), 'unknown'),
    nullif(trim(p_room_name), ''),
    nullif(trim(p_message_id), ''),
    v_excerpt,
    v_reason,
    'open'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_chat_report(
  text, text, text, text, text, text, text
) from public;

grant execute on function public.submit_chat_report(
  text, text, text, text, text, text, text
) to authenticated;
