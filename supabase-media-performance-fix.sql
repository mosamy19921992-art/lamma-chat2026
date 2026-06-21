-- Media URL RLS fix + storage bucket limits (P0/P2 audit)
-- Run via: node scripts/apply-media-performance-fix.mjs

-- Allow Supabase storage URLs and private bucket path refs in media_url / text checks
create or replace function public.is_message_clean(msg_text text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bw_array jsonb;
  bword text;
begin
  if public.is_admin() then
    return true;
  end if;
  if msg_text is null or msg_text = '' then
    return true;
  end if;

  -- Public or signed Supabase storage URLs (room images, avatars, DJ tracks)
  if msg_text ~* '^https://[a-z0-9.-]+\.supabase\.co/storage/v1/object/(public|sign)/' then
    return true;
  end if;

  -- Private bucket object refs stored client-side (voice notes, PM media)
  if msg_text ~* '^chat-media-private/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' then
    return true;
  end if;

  select banned_words into bw_array
  from public.owner_settings where id = 'global' limit 1;
  if bw_array is not null and jsonb_array_length(bw_array) > 0 then
    for bword in select jsonb_array_elements_text(bw_array) loop
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
grant execute on function public.is_message_clean(text) to authenticated;

-- Server-side upload limits (idempotent)
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'
  ]
where id = 'chat-media';

update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'
  ]
where id = 'chat-media-private';
