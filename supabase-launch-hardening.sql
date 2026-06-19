-- Lamma Chat — Launch hardening (run after identity + security-audit-fixes)
-- PM: receivers may only flip is_read — not rewrite message body or parties
-- call_signals: bind from_uid + from_nickname server-side

create or replace function public.pm_messages_mark_read_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid()::text <> old.receiver_uid then
    raise exception 'Only receiver may update PM';
  end if;

  if new.id is distinct from old.id
     or new.sender_uid is distinct from old.sender_uid
     or new.receiver_uid is distinct from old.receiver_uid
     or new.sender_nickname is distinct from old.sender_nickname
     or new.receiver_nickname is distinct from old.receiver_nickname
     or new.text is distinct from old.text
     or new.media_url is distinct from old.media_url
     or new.type is distinct from old.type
     or new.created_at is distinct from old.created_at
  then
    raise exception 'PM updates limited to is_read flag';
  end if;

  return new;
end;
$$;

drop trigger if exists pm_messages_mark_read_only on public.pm_messages;
create trigger pm_messages_mark_read_only
  before update on public.pm_messages
  for each row
  execute function public.pm_messages_mark_read_only();

-- call_signals: prevent nickname spoof on WebRTC signaling
create or replace function public.bind_call_signal_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  new.from_uid := auth.uid()::text;
  new.from_nickname := public.resolve_bound_nickname(new.from_uid);

  return new;
end;
$$;

drop trigger if exists call_signals_bind_identity on public.call_signals;
create trigger call_signals_bind_identity
  before insert on public.call_signals
  for each row
  execute function public.bind_call_signal_identity();
