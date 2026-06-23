-- Store products catalog (owner-managed offers visible to all clients)

alter table public.owner_settings
  add column if not exists store_products jsonb not null default '[]'::jsonb;

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
    'store_products', coalesce(p_row.store_products, '[]'::jsonb),
    'glow_color', p_row.glow_color,
    'wall_theme', p_row.wall_theme,
    'chat_theme', p_row.chat_theme,
    'universal_style_config', p_row.universal_style_config
  );
$$;

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
