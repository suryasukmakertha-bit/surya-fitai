import { supabase } from "@/integrations/supabase/client";

/**
 * Historical-best streak across ALL of a user's saved plans.
 *
 * The computation runs ENTIRELY SERVER-SIDE in the bump_longest_streak()
 * RPC, which scans saved_plans + workout_completions for auth.uid() and
 * monotonically raises profiles.longest_streak. The client cannot supply
 * a value, so streak/XP cannot be farmed by spoofed RPC arguments.
 */
export async function syncLongestStreak(userId: string): Promise<number> {
  const sb = supabase as any;
  let tz = "UTC";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch { /* keep UTC */ }
  const { data: bumped, error } = await sb.rpc("bump_longest_streak", { p_tz: tz });
  if (error) {
    console.error("bump_longest_streak RPC failed:", error);
    const { data } = await sb.from("profiles").select("longest_streak").eq("user_id", userId).maybeSingle();
    return Number((data as any)?.longest_streak ?? 0);
  }
  return Number(bumped ?? 0);
}

/**
 * Recalculate longest_streak across ALL of the user's saved plans by invoking
 * the server-side bump RPC (which walks every plan and stores the max).
 * Safe to call on Dashboard mount.
 */
export async function recalculateLongestStreak(userId: string): Promise<number> {
  return syncLongestStreak(userId);
}

/** Read the stored historical-best streak without recomputing. */
export async function readLongestStreak(userId: string): Promise<number> {
  const sb = supabase as any;
  const { data } = await sb.from("profiles").select("longest_streak").eq("user_id", userId).maybeSingle();
  return Number((data as any)?.longest_streak ?? 0);
}