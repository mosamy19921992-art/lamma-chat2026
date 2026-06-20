-- Run once in Supabase Dashboard → SQL Editor
-- Grants owner write access (RLS) for design bot + member permissions

alter table public.owner_settings
  add column if not exists universal_style_config jsonb default null;

alter table public.owner_member_permissions
  add column if not exists images_allowed boolean not null default false,
  add column if not exists youtube_allowed boolean not null default false;

insert into public.user_roles (user_id, role)
select id, 'owner'
from auth.users
where lower(email) = lower('mohamed.samy2821992@gmail.com')
on conflict (user_id) do update
  set role = 'owner', updated_at = timezone('utc'::text, now());

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
where lower(email) = lower('mohamed.samy2821992@gmail.com');

select ur.user_id, ur.role, u.email
from public.user_roles ur
join auth.users u on u.id = ur.user_id
where ur.role = 'owner';
