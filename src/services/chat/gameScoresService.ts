import { supabase } from "../../lib/supabase";

export type GameLeaderboardEntry = {
  nickname: string;
  score: number;
};

/**
 * Persist points for a winner to the shared Supabase leaderboard.
 * Fire-and-forget — failures are logged but never crash the game flow.
 */
export async function addGamePoints(
  nickname: string,
  points: number,
): Promise<void> {
  if (!supabase || !nickname.trim()) return;
  try {
    await supabase.rpc("add_game_points", {
      p_nickname: nickname.trim(),
      p_points: points,
    });
  } catch (err) {
    console.warn("[GameScores] addGamePoints failed:", err);
  }
}

/**
 * Fetch the top-10 shared leaderboard from Supabase.
 * Returns [] on any error so callers can fall back gracefully.
 */
export async function fetchGameLeaderboard(): Promise<GameLeaderboardEntry[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("game_scores")
      .select("nickname, score")
      .order("score", { ascending: false })
      .limit(10);
    if (error) {
      console.warn("[GameScores] fetchGameLeaderboard failed:", error.message);
      return [];
    }
    return (data ?? []) as GameLeaderboardEntry[];
  } catch (err) {
    console.warn("[GameScores] fetchGameLeaderboard error:", err);
    return [];
  }
}
