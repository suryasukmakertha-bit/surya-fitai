
-- 1) Add counters to profiles (default 0)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_workouts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_days integer NOT NULL DEFAULT 0;

-- 2) Extend tamper guard so clients can't write these counters directly.
CREATE OR REPLACE FUNCTION public.prevent_profile_counter_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_bypass_all text;
  v_bypass_longest text;
  v_bypass_counters text;
BEGIN
  BEGIN v_role := auth.role(); EXCEPTION WHEN OTHERS THEN v_role := NULL; END;

  IF v_role IS NULL OR v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  BEGIN v_bypass_all := current_setting('app.bypass_profile_guard', true);
  EXCEPTION WHEN OTHERS THEN v_bypass_all := NULL; END;
  BEGIN v_bypass_longest := current_setting('app.bypass_longest_streak_guard', true);
  EXCEPTION WHEN OTHERS THEN v_bypass_longest := NULL; END;
  BEGIN v_bypass_counters := current_setting('app.bypass_workout_counters_guard', true);
  EXCEPTION WHEN OTHERS THEN v_bypass_counters := NULL; END;

  IF v_bypass_all = 'on' THEN
    RETURN NEW;
  END IF;

  -- Dedicated bypass for the workout counters RPC.
  IF v_bypass_counters = 'on' THEN
    IF NEW.period_generate_count IS DISTINCT FROM OLD.period_generate_count
       OR NEW.trial_generate_count IS DISTINCT FROM OLD.trial_generate_count
       OR NEW.free_generate_count  IS DISTINCT FROM OLD.free_generate_count
       OR NEW.free_generate_month  IS DISTINCT FROM OLD.free_generate_month
       OR NEW.last_generate_reset  IS DISTINCT FROM OLD.last_generate_reset
       OR NEW.longest_streak       IS DISTINCT FROM OLD.longest_streak
    THEN
      RAISE EXCEPTION 'Protected profile counters can only be modified by the server'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF v_bypass_longest = 'on' THEN
    IF NEW.period_generate_count IS DISTINCT FROM OLD.period_generate_count
       OR NEW.trial_generate_count IS DISTINCT FROM OLD.trial_generate_count
       OR NEW.free_generate_count  IS DISTINCT FROM OLD.free_generate_count
       OR NEW.free_generate_month  IS DISTINCT FROM OLD.free_generate_month
       OR NEW.last_generate_reset  IS DISTINCT FROM OLD.last_generate_reset
       OR NEW.total_workouts       IS DISTINCT FROM OLD.total_workouts
       OR NEW.active_days          IS DISTINCT FROM OLD.active_days
    THEN
      RAISE EXCEPTION 'Protected profile counters can only be modified by the server'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.period_generate_count IS DISTINCT FROM OLD.period_generate_count
     OR NEW.trial_generate_count IS DISTINCT FROM OLD.trial_generate_count
     OR NEW.free_generate_count  IS DISTINCT FROM OLD.free_generate_count
     OR NEW.free_generate_month  IS DISTINCT FROM OLD.free_generate_month
     OR NEW.last_generate_reset  IS DISTINCT FROM OLD.last_generate_reset
     OR NEW.longest_streak       IS DISTINCT FROM OLD.longest_streak
     OR NEW.total_workouts       IS DISTINCT FROM OLD.total_workouts
     OR NEW.active_days          IS DISTINCT FROM OLD.active_days
  THEN
    RAISE EXCEPTION 'Protected profile counters can only be modified by the server'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Recompute RPC: COUNT(*) of all completed rows and COUNT(DISTINCT workout_date)
--    across ALL plans for the authenticated user.
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

  SELECT COUNT(*), COUNT(DISTINCT workout_date)
    INTO v_total, v_active
    FROM public.workout_completions
    WHERE user_id = v_user AND completed = true;

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

GRANT EXECUTE ON FUNCTION public.sync_workout_counters() TO authenticated;
