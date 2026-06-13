import { supabase } from "@/integrations/supabase/client";

export interface PlanProgress {
  completedDays: number;
  totalDays: number;
  currentWeek: number;
  totalWeeks: number;
  percentage: number;
  workoutsPerWeek: number;
}

/**
 * Detect rest days from a `weeklySplit` entry (string).
 * Rest days typically contain "Rest" in their label.
 */
function isRestLabel(label: string): boolean {
  if (!label) return true;
  return /rest|istirahat|休息/i.test(label);
}

/**
 * Compute number of workout (non-rest) days per week from plan_data.weeklySplit.
 * Falls back to plan_data.workout_plan length, or 4 as a final default.
 */
export function getWorkoutsPerWeek(planData: any): number {
  const split = planData?.weeklySplit;
  if (Array.isArray(split) && split.length > 0) {
    const nonRest = split.filter((d: any) => !isRestLabel(typeof d === "string" ? d : d?.day || ""));
    if (nonRest.length > 0) return nonRest.length;
  }
  const wp = planData?.workout_plan || planData?.workoutPlan;
  if (Array.isArray(wp) && wp.length > 0) {
    const nonRest = wp.filter((d: any) => Array.isArray(d?.exercises) ? d.exercises.length > 0 : !isRestLabel(d?.day || ""));
    if (nonRest.length > 0) return Math.min(7, nonRest.length);
  }
  return 4;
}

export function getTotalWeeks(planData: any): number {
  const dw = planData?.durationWeeks;
  if (typeof dw === "number" && dw > 0) return dw;
  return 4;
}

/**
 * Single source of truth for plan progress.
 * Counts distinct workout_dates with at least one completed exercise for this plan.
 * currentWeek = clamp(ceil(completedDays / workoutsPerWeek), 1..totalWeeks).
 */
export async function getPlanProgress(
  userId: string,
  plan: { id: string; plan_data?: any; plan_started_at?: string | null } | null | undefined
): Promise<PlanProgress> {
  const planData = plan?.plan_data || {};
  const totalWeeks = getTotalWeeks(planData);
  const workoutsPerWeek = getWorkoutsPerWeek(planData);
  const totalDays = totalWeeks * workoutsPerWeek;

  if (!plan?.id || !userId) {
    return { completedDays: 0, totalDays, currentWeek: 1, totalWeeks, percentage: 0, workoutsPerWeek };
  }

  let q = supabase
    .from("workout_completions")
    .select("workout_date, completed_at")
    .eq("user_id", userId)
    .eq("plan_id", plan.id)
    .eq("completed", true);
  // Scope to the CURRENT month: only count completions made on/after
  // plan_started_at. This makes progress reset to 0% immediately when the
  // user extends their plan (plan_started_at is bumped to NOW()), while
  // older completion rows remain in the DB for history.
  if (plan.plan_started_at) {
    q = q.gte("completed_at", plan.plan_started_at);
  }
  const { data } = await q;

  const completedDays = new Set((data || []).map((r: any) => r.workout_date)).size;
  const cappedCompleted = Math.min(completedDays, totalDays);
  const currentWeek = Math.min(
    totalWeeks,
    Math.max(1, Math.ceil((cappedCompleted || 0) / Math.max(1, workoutsPerWeek)) || 1)
  );
  const percentage = totalDays > 0 ? Math.round((cappedCompleted / totalDays) * 100) : 0;

  return { completedDays: cappedCompleted, totalDays, currentWeek, totalWeeks, percentage, workoutsPerWeek };
}