-- Allow room voice playback + PM media for senders and recipients (run once after supabase-private-media.sql)
-- Paths: {uid}/voice/{roomId}/…  |  {senderUid}/pm/{recipientUid}/…

drop policy if exists "Auth read room voice notes" on storage.objects;
create policy "Auth read room voice notes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media-private'
  and (storage.foldername(name))[2] = 'voice'
);

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
