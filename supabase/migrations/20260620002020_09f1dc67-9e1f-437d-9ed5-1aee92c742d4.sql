
CREATE OR REPLACE FUNCTION public.guard_saved_plan_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_wp jsonb;
  v_entry jsonb;
  v_total int := 0;
  v_required int;
  v_completed int := 0;
BEGIN
  -- Service role (edge functions, admin) bypasses the guard.
  BEGIN v_role := auth.role(); EXCEPTION WHEN OTHERS THEN v_role := NULL; END;
  IF v_role IS NULL OR v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- No change to plan_completed_at → nothing to validate.
  IF NEW.plan_completed_at IS NOT DISTINCT FROM OLD.plan_completed_at THEN
    RETURN NEW;
  END IF;

  -- Always allow clearing completion (e.g. Extend Month resets to NULL).
  IF NEW.plan_completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Setting a non-null completion timestamp → must meet 80% threshold.
  -- Total exercises = sum of exercises across all day entries in plan_data.
  v_wp := COALESCE(NEW.plan_data -> 'workout_plan', NEW.plan_data -> 'workoutPlan');
  IF jsonb_typeof(v_wp) = 'array' THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(v_wp) LOOP
      IF jsonb_typeof(v_entry -> 'exercises') = 'array' THEN
        v_total := v_total + jsonb_array_length(v_entry -> 'exercises');
      END IF;
    END LOOP;
  END IF;

  -- If we cannot determine a positive total, do not trust the completion flag.
  IF v_total <= 0 THEN
    NEW.plan_completed_at := OLD.plan_completed_at;
    RETURN NEW;
  END IF;

  v_required := CEIL(v_total::numeric * 0.8)::int;

  -- Count completions scoped to this plan, only AFTER plan_started_at
  -- (matches Results.tsx completion watcher and Extend Month semantics).
  SELECT COUNT(*) INTO v_completed
  FROM public.workout_completions wc
  WHERE wc.user_id = NEW.user_id
    AND wc.plan_id = NEW.id
    AND wc.completed = true
    AND (NEW.plan_started_at IS NULL OR wc.completed_at >= NEW.plan_started_at);

  IF v_completed < v_required THEN
    -- Silently revert to the server-authoritative prior value.
    NEW.plan_completed_at := OLD.plan_completed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_saved_plan_completion ON public.saved_plans;
CREATE TRIGGER guard_saved_plan_completion
  BEFORE UPDATE ON public.saved_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_saved_plan_completion();
