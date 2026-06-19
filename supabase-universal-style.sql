-- Universal Visual AI Style Engine — persist approved styles
alter table public.owner_settings
  add column if not exists universal_style_config jsonb default null;
