-- Lamma Chat — Private media bucket for PM / voice notes (run once)
-- Room chat images stay on public chat-media; sensitive PM media uses signed URLs.

insert into storage.buckets (id, name, public)
values ('chat-media-private', 'chat-media-private', false)
on conflict (id) do update set public = false;

drop policy if exists "Auth read own private media" on storage.objects;
create policy "Auth read own private media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Auth upload own private media" on storage.objects;
create policy "Auth upload own private media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Auth delete own private media" on storage.objects;
create policy "Auth delete own private media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);
