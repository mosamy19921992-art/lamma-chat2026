-- Lamma Chat — Security audit fixes (run once in Supabase SQL Editor)
-- Complements supabase-production-hardening.sql

-- 1) subscription_orders: prevent forging orders for other users
drop policy if exists "Users create orders" on public.subscription_orders;
create policy "Users create orders" on public.subscription_orders
  for insert
  to authenticated
  with check (user_id = auth.uid()::text);

-- 2) messages UPDATE: re-check moderated fields (prevents post-insert tampering)
drop policy if exists "Users can update own messages" on public.messages;
drop policy if exists "Allow update for message owner" on public.messages;
drop policy if exists "Allow update to own messages" on public.messages;
drop policy if exists "Users update own message reactions" on public.messages;
create policy "Users update own message reactions" on public.messages
  for update
  using (auth.uid()::text = sender_uid)
  with check (
    auth.uid()::text = sender_uid
    and (text is null or public.is_message_clean(text))
    and (media_url is null or public.is_message_clean(media_url))
  );

-- 3) PM + social: apply content moderation on insert
drop policy if exists "Users insert own pm messages" on public.pm_messages;
create policy "Users insert own pm messages" on public.pm_messages
  for insert
  with check (
    auth.uid()::text = sender_uid
    and (text is null or public.is_message_clean(text))
    and (media_url is null or public.is_message_clean(media_url))
  );

drop policy if exists "Users publish own social posts" on public.social_posts;
create policy "Users publish own social posts" on public.social_posts
  for insert
  with check (
    auth.uid()::text = author_uid
    and public.is_message_clean(text)
    and (media_url is null or public.is_message_clean(media_url))
  );

drop policy if exists "Users comment on posts" on public.post_comments;
create policy "Users comment on posts" on public.post_comments
  for insert
  with check (
    auth.uid()::text = author_uid
    and public.is_message_clean(text)
  );

-- 4) Admin moderation delete on social content
drop policy if exists "social_posts_admin_delete" on public.social_posts;
create policy "social_posts_admin_delete" on public.social_posts
  for delete
  using (public.is_admin() or auth.uid()::text = author_uid);

drop policy if exists "post_comments_admin_delete" on public.post_comments;
create policy "post_comments_admin_delete" on public.post_comments
  for delete
  using (public.is_admin() or auth.uid()::text = author_uid);

-- 5) call_signals: participants can delete stale signals
drop policy if exists "call_signals_delete_participant" on public.call_signals;
create policy "call_signals_delete_participant" on public.call_signals
  for delete
  using (
    auth.uid()::text = from_uid
    or auth.uid()::text = to_uid
    or public.is_admin()
  );

-- 6) Restrict is_message_clean to authenticated (remove anon recon)
revoke all on function public.is_message_clean(text) from anon;
grant execute on function public.is_message_clean(text) to authenticated;

-- NOTE: owner_settings / banned_users remain readable for anon guests
-- (invite_only_mode + ban enforcement). Split into a public view in a future migration.
