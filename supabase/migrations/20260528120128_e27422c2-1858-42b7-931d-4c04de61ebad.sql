
CREATE OR REPLACE FUNCTION public.bump_longest_streak(p_tz text DEFAULT 'UTC'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_current integer;
  v_best integer := 0;
  v_plan record;
  v_dates date[];
  v_set jsonb;
  v_wp jsonb;
  v_entry jsonb;
  v_label text;
  v_ex_count int;
  v_rest boolean[];
  v_len int;
  v_i int;
  v_end date;
  v_start date;
  v_cursor date;
  v_offset int;
  v_cur int;
  v_longest int;
  v_idx int;
  v_today date;
  v_tz text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_tz := COALESCE(NULLIF(trim(p_tz), ''), 'UTC');
  BEGIN
    v_today := (now() AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN OTHERS THEN
    v_tz := 'UTC';
    v_today := (now() AT TIME ZONE 'UTC')::date;
  END;
  v_end := v_today;

  SELECT COALESCE(longest_streak, 0) INTO v_current
    FROM public.profiles WHERE user_id = v_user;
  v_current := COALESCE(v_current, 0);

  FOR v_plan IN
    SELECT id, plan_data, plan_started_at
      FROM public.saved_plans
      WHERE user_id = v_user
        AND plan_started_at IS NOT NULL
  LOOP
    -- Build positional rest array from workout_plan (authoritative). A day is
    -- rest iff its exercises array is empty OR its label explicitly says rest.
    v_wp := COALESCE(v_plan.plan_data -> 'workout_plan', v_plan.plan_data -> 'workoutPlan');
    IF jsonb_typeof(v_wp) <> 'array' OR jsonb_array_length(v_wp) = 0 THEN
      CONTINUE;
    END IF;
    v_len := LEAST(7, jsonb_array_length(v_wp));
    v_rest := ARRAY[true,true,true,true,true,true,true];
    FOR v_i IN 0..(v_len - 1) LOOP
      v_entry := v_wp -> v_i;
      v_label := COALESCE(v_entry ->> 'day', v_entry ->> 'title', '');
      v_ex_count := 0;
      IF jsonb_typeof(v_entry -> 'exercises') = 'array' THEN
        v_ex_count := jsonb_array_length(v_entry -> 'exercises');
      END IF;
      v_rest[v_i + 1] := (v_ex_count = 0) OR (v_label ~* '(rest|istirahat|休息|恢复|pemulihan)');
    END LOOP;
    -- If plan defines fewer than 7 entries, mark the rest as workout days
    -- copies by cycling within the defined length when walking (see v_idx).

    SELECT array_agg(DISTINCT workout_date ORDER BY workout_date) INTO v_dates
      FROM public.workout_completions
      WHERE user_id = v_user
        AND plan_id = v_plan.id
        AND completed = true;

    IF v_dates IS NULL OR array_length(v_dates, 1) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT jsonb_object_agg(d::text, true) INTO v_set
      FROM unnest(v_dates) d;

    v_start := v_plan.plan_started_at::date;
    v_cursor := v_start;
    v_offset := 0;
    v_cur := 0;
    v_longest := 0;

    WHILE v_cursor <= v_end LOOP
      v_idx := (v_offset % v_len) + 1;
      IF NOT v_rest[v_idx] THEN
        IF v_set ? v_cursor::text THEN
          v_cur := v_cur + 1;
          IF v_cur > v_longest THEN v_longest := v_cur; END IF;
        ELSIF v_cursor < v_today THEN
          v_cur := 0;
        END IF;
        -- today not done: leave v_cur unchanged
      END IF;
      v_cursor := v_cursor + 1;
      v_offset := v_offset + 1;
    END LOOP;

    IF v_longest > v_best THEN v_best := v_longest; END IF;
  END LOOP;

  IF v_best > v_current THEN
    UPDATE public.profiles
      SET longest_streak = v_best, updated_at = now()
      WHERE user_id = v_user;
    RETURN v_best;
  END IF;

  RETURN v_current;
END;
$function$;
