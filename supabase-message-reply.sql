-- Lamma Chat — Message reply (quote) support
-- Run once in Supabase SQL Editor after supabase-schema.sql

alter table public.messages
  add column if not exists reply_to_id uuid null,
  add column if not exists reply_to_author text null,
  add column if not exists reply_to_preview text null;

comment on column public.messages.reply_to_id is 'Quoted message UUID (denormalized preview kept if deleted)';
comment on column public.messages.reply_to_author is 'Author nickname at send time';
comment on column public.messages.reply_to_preview is 'Short preview of quoted message';

create index if not exists messages_reply_to_id_idx
  on public.messages (reply_to_id)
  where reply_to_id is not null;
