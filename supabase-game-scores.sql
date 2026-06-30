-- Lamma Chat — Shared Game Scores (Leaderboard)
-- Run after supabase-identity-hardening.sql

-- ── Shared leaderboard table ────────────────────────────────────────────────
create table if not exists public.game_scores (
  nickname text primary key,
  score    integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.game_scores enable row level security;

-- Everyone (anon + authenticated) can read the leaderboard
drop policy if exists "Game scores readable by all" on public.game_scores;
create policy "Game scores readable by all" on public.game_scores
  for select
  using (true);

-- Direct client inserts/updates are blocked — all writes go through the RPC below.

-- ── RPC: increment score safely (security definer prevents client manipulation) ─
create or replace function public.add_game_points(p_nickname text, p_points integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_points integer;
  new_score   integer;
begin
  if p_nickname is null or trim(p_nickname) = '' then
    return 0;
  end if;

  -- Cap per-call points to prevent abuse (trivia=10, word=5, max=10)
  safe_points := least(greatest(p_points, 0), 10);

  insert into public.game_scores (nickname, score, updated_at)
  values (trim(p_nickname), safe_points, now())
  on conflict (nickname) do update
    set score      = game_scores.score + safe_points,
        updated_at = now()
  returning score into new_score;

  return coalesce(new_score, 0);
end;
$$;

revoke all on function public.add_game_points(text, integer) from public;
grant execute on function public.add_game_points(text, integer) to authenticated, anon;
