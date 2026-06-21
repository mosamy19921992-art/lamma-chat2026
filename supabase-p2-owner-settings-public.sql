-- P2: expose only safe owner settings to guests; keep sensitive fields admin-only.

create table if not exists public.public_chat_settings (
  id text primary key default 'global',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.public_chat_settings enable row level security;

drop policy if exists "Public chat settings readable by all" on public.public_chat_settings;
create policy "Public chat settings readable by all" on public.public_chat_settings
  for select
  using (true);

create or replace function public.build_public_chat_settings_payload(p_row public.owner_settings)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'maintenance_mode', coalesce(p_row.maintenance_mode, false),
    'global_mute', coalesce(p_row.global_mute, false),
    'global_mic_mute', coalesce(p_row.global_mic_mute, false),
    'vip_only_images', coalesce(p_row.vip_only_images, false),
    'bot_silent', coalesce(p_row.bot_silent, false),
    'ads_enabled', coalesce(p_row.ads_enabled, true),
    'greetings_enabled', coalesce(p_row.greetings_enabled, true),
    'invite_only_mode', coalesce(p_row.invite_only_mode, false),
    'owner_bg_image', p_row.owner_bg_image,
    'custom_logo_url', p_row.custom_logo_url,
    'room_bg_map', coalesce(p_row.room_bg_map, '{}'::jsonb),
    'design_presets', coalesce(p_row.design_presets, '[]'::jsonb),
    'room_dj_map', coalesce(p_row.room_dj_map, '{}'::jsonb),
    'glow_color', p_row.glow_color,
    'wall_theme', p_row.wall_theme,
    'chat_theme', p_row.chat_theme,
    'universal_style_config', p_row.universal_style_config
  );
$$;

create or replace function public.sync_public_chat_settings_from_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.public_chat_settings (id, payload, updated_at)
  values (
    'global',
    public.build_public_chat_settings_payload(new),
    timezone('utc'::text, now())
  )
  on conflict (id) do update set
    payload = excluded.payload,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists owner_settings_sync_public on public.owner_settings;
create trigger owner_settings_sync_public
  after insert or update on public.owner_settings
  for each row
  execute function public.sync_public_chat_settings_from_owner();

insert into public.public_chat_settings (id, payload, updated_at)
select
  'global',
  public.build_public_chat_settings_payload(os),
  timezone('utc'::text, now())
from public.owner_settings os
where os.id = 'global'
on conflict (id) do update set
  payload = excluded.payload,
  updated_at = excluded.updated_at;

drop policy if exists "Owner settings readable by all" on public.owner_settings;
drop policy if exists "Owner settings admin read" on public.owner_settings;
create policy "Owner settings admin read" on public.owner_settings
  for select
  using (public.is_admin());

create or replace function public.ping_chat_backend()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.owner_settings where id = 'global');
$$;

revoke all on function public.ping_chat_backend() from public;
grant execute on function public.ping_chat_backend() to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'public_chat_settings'
    ) then
      alter publication supabase_realtime add table public.public_chat_settings;
    end if;
  end if;
end $$;
