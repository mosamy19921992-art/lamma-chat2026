insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('design-assets', 'design-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public read chat-media" on storage.objects;
create policy "Public read chat-media"
on storage.objects
for select
using (bucket_id = 'chat-media');

drop policy if exists "Public read design-assets" on storage.objects;
create policy "Public read design-assets"
on storage.objects
for select
using (bucket_id = 'design-assets');

drop policy if exists "Auth upload chat-media" on storage.objects;
create policy "Auth upload chat-media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chat-media');

drop policy if exists "Owner upload design-assets" on storage.objects;
create policy "Owner upload design-assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'design-assets' and public.is_owner());

