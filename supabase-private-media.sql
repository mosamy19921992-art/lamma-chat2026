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

-- Room voice notes: any authenticated member can read (path: {uid}/voice/{room}/…)
drop policy if exists "Auth read room voice notes" on storage.objects;
create policy "Auth read room voice notes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media-private'
  and (storage.foldername(name))[2] = 'voice'
);

-- PM media: sender or recipient UID in path (path: {sender}/pm/{recipientUid}/…)
drop policy if exists "Auth read pm shared media" on storage.objects;
create policy "Auth read pm shared media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media-private'
  and (storage.foldername(name))[2] = 'pm'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[3] = auth.uid()::text
  )
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
