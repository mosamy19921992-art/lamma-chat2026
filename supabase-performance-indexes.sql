-- Performance Indexes for Messages Table
-- Run this on Supabase SQL Editor to improve query performance with millions of messages

-- Index for room-based queries (most common)
CREATE INDEX IF NOT EXISTS messages_room_id_idx ON public.messages(room_id);

-- Index for time-based filtering (created_at)
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);

-- Composite index for room + time queries (optimal for fetchRoomMessages)
CREATE INDEX IF NOT EXISTS messages_room_created_idx ON public.messages(room_id, created_at DESC);

-- Index for sender_uid (useful for user-based queries)
CREATE INDEX IF NOT EXISTS messages_sender_uid_idx ON public.messages(sender_uid);

-- Index for author text search (if needed)
CREATE INDEX IF NOT EXISTS messages_author_idx ON public.messages(author);

-- Partial index for text messages only (optimizes common case)
CREATE INDEX IF NOT EXISTS messages_text_only_idx ON public.messages(room_id, created_at DESC) WHERE type = 'text';
