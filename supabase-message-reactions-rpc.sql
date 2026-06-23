-- Lamma Chat — server-side message reactions (any authenticated user)

create or replace function public.add_message_reaction(
  p_message_id uuid,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_reactions jsonb;
  safe_emoji text;
  current_count int;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  safe_emoji := left(trim(coalesce(p_emoji, '')), 8);
  if safe_emoji = '' then
    return '{}'::jsonb;
  end if;

  select coalesce((reactions ->> safe_emoji)::int, 0)
  into current_count
  from public.messages
  where id = p_message_id;

  if not found then
    raise exception 'Message not found';
  end if;

  update public.messages
  set reactions = coalesce(reactions, '{}'::jsonb) ||
    jsonb_build_object(safe_emoji, current_count + 1)
  where id = p_message_id
  returning reactions into next_reactions;

  return coalesce(next_reactions, '{}'::jsonb);
end;
$$;

revoke all on function public.add_message_reaction(uuid, text) from public;
grant execute on function public.add_message_reaction(uuid, text) to authenticated;
