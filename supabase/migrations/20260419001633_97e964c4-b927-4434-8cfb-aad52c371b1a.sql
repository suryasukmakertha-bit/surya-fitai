UPDATE public.saved_plans sp
SET plan_completed_at = NULL
WHERE plan_completed_at IS NOT NULL
  AND plan_month_number = 1
  AND (
    SELECT count(*) FROM public.workout_completions wc
    WHERE wc.plan_id = sp.id
      AND wc.user_id = sp.user_id
      AND wc.completed = true
  ) < 60;