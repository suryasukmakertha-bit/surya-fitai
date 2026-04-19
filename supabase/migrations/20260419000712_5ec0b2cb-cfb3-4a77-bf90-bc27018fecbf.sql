-- Reset incorrectly-flagged completion on plans whose completion was recorded
-- under the old (one-week-only) total. After the code fix the threshold is
-- 80% of (per-week exercises × 4 weeks). Safest action: clear plan_completed_at
-- on plans that have not actually accumulated enough completions across the
-- full 4 weeks. We unset it for currently-month-1 plans whose recorded
-- workout_completions count is below a conservative full-plan threshold.
UPDATE public.saved_plans sp
SET plan_completed_at = NULL
WHERE sp.plan_completed_at IS NOT NULL
  AND sp.plan_month_number = 1
  AND (
    SELECT count(*) FROM public.workout_completions wc
    WHERE wc.plan_id = sp.id
      AND wc.user_id = sp.user_id
      AND wc.completed = true
      AND wc.completed_at >= sp.plan_started_at
  ) < 60;
