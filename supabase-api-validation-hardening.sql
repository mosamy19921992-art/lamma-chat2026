-- Lamma Chat — API / data validation hardening (run once in Supabase SQL Editor)
-- Adds server-side length guards that complement client-side slicing.

alter table public.messages
  drop constraint if exists messages_text_length_check;

alter table public.messages
  add constraint messages_text_length_check
  check (text is null or char_length(text) <= 8000);

alter table public.messages
  drop constraint if exists messages_media_url_length_check;

alter table public.messages
  add constraint messages_media_url_length_check
  check (media_url is null or char_length(media_url) <= 2048);

alter table public.pm_messages
  drop constraint if exists pm_messages_text_length_check;

alter table public.pm_messages
  add constraint pm_messages_text_length_check
  check (text is null or char_length(text) <= 8000);

alter table public.pm_messages
  drop constraint if exists pm_messages_media_url_length_check;

alter table public.pm_messages
  add constraint pm_messages_media_url_length_check
  check (media_url is null or char_length(media_url) <= 2048);

alter table public.social_posts
  drop constraint if exists social_posts_text_length_check;

alter table public.social_posts
  add constraint social_posts_text_length_check
  check (char_length(text) <= 8000);

alter table public.post_comments
  drop constraint if exists post_comments_text_length_check;

alter table public.post_comments
  add constraint post_comments_text_length_check
  check (char_length(text) <= 2000);

-- Verify:
-- insert into public.messages (room_id, text, color, type, sender_uid, author)
-- values ('egypt', repeat('x', 8001), '#10b981', 'text', auth.uid()::text, 'test'); -- should fail
