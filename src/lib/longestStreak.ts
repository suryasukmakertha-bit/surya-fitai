import { supabase } from "@/integrations/supabase/client";
import { computeLongestStreak, getRestDayIndices } from "@/lib/streak";

/**
 * Historical-best streak across ALL of a user's saved plans.
 *
 * - Scans every saved plan and computes per-plan longest streak using that
 *   plan's own weekly split (so rest days are respected per plan).
 * - Returns the max across plans.
 * - Calls bump_longest_streak() RPC which only ever raises the stored value.
 * - The returned number is the bumped value (which equals the prior stored
 *   value when no plan exceeds it — so deleting a plan never lowers it).
 */
export async function syncLongestStreak(userId: string): Promise<number> {
  const sb = supabase as any;
  const [{ data: plans }, { data: completions }, { data: profile }] = await Promise.all([
    sb.from("saved_plans").select("id, plan_data, plan_started_at").eq("user_id", userId),
    sb.from("workout_completions")
      .select("plan_id, workout_date, completed_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .limit(2000),
    sb.from("profiles").select("longest_streak").eq("user_id", userId).maybeSingle(),
  ]);

  let best = 0;
  for (const plan of (plans || [])) {
    const planCompletions = (completions || []).filter((r: any) =>
      r.plan_id === plan.id &&
      (!plan.plan_started_at || !r.completed_at || r.completed_at >= plan.plan_started_at)
    );
    const dates = new Set<string>(planCompletions.map((r: any) => r.workout_date));
    if (dates.size === 0) continue;
    const restDays = getRestDayIndices(plan.plan_data);
    const longest = computeLongestStreak(dates, restDays);
    if (longest > best) best = longest;
  }

  const stored = Number((profile as any)?.longest_streak ?? 0);
  if (best <= stored) return stored;

  const { data: bumped, error } = await sb.rpc("bump_longest_streak", { p_value: best });
  if (error) return Math.max(stored, best);
  return Number(bumped ?? best);
}

/** Read the stored historical-best streak without recomputing. */
export async function readLongestStreak(userId: string): Promise<number> {
  const sb = supabase as any;
  const { data } = await sb.from("profiles").select("longest_streak").eq("user_id", userId).maybeSingle();
  return Number((data as any)?.longest_streak ?? 0);
}