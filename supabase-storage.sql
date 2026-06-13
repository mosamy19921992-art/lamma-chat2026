insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

create policy "Public read chat-media"
on storage.objects
for select
using (bucket_id = 'chat-media');

create policy "Auth upload chat-media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chat-media');

