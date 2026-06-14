CREATE OR REPLACE FUNCTION public.sync_workout_counters()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_total int := 0;
  v_active int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Cross-plan totals: count ALL completion rows for this user across every plan.
  -- No plan_id filter — total_workouts and active_days are global, lifetime counters.
  SELECT COUNT(*), COUNT(DISTINCT workout_date)
    INTO v_total, v_active
    FROM public.workout_completions
    WHERE user_id = v_user
      AND completed = true;

  PERFORM set_config('app.bypass_workout_counters_guard', 'on', true);
  UPDATE public.profiles
    SET total_workouts = COALESCE(v_total, 0),
        active_days    = COALESCE(v_active, 0),
        updated_at     = now()
    WHERE user_id = v_user;
  PERFORM set_config('app.bypass_workout_counters_guard', 'off', true);

  RETURN jsonb_build_object(
    'total_workouts', COALESCE(v_total, 0),
    'active_days', COALESCE(v_active, 0)
  );
END;
$function$;