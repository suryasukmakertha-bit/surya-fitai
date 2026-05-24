
-- Replace bump_longest_streak with a server-computed version.
-- Drop old signature(s).
DROP FUNCTION IF EXISTS public.bump_longest_streak(integer);
DROP FUNCTION IF EXISTS public.bump_longest_streak(bigint);

CREATE OR REPLACE FUNCTION public.bump_longest_streak()
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
  v_rest boolean[];  -- 7 entries, idx 1=Mon .. 7=Sun
  v_split jsonb;
  v_label text;
  v_i int;
  v_start date;
  v_end date := (now() AT TIME ZONE 'UTC')::date;
  v_cursor date;
  v_cur int;
  v_longest int;
  v_dow int;
  v_set jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(longest_streak, 0) INTO v_current
    FROM public.profiles WHERE user_id = v_user;
  v_current := COALESCE(v_current, 0);

  FOR v_plan IN
    SELECT id, plan_data, plan_started_at
      FROM public.saved_plans
      WHERE user_id = v_user
  LOOP
    -- Build rest-day array (Mon=1..Sun=7) from weeklySplit
    v_rest := ARRAY[true,true,true,true,true,true,true];
    v_split := v_plan.plan_data -> 'weeklySplit';
    IF jsonb_typeof(v_split) = 'array' AND jsonb_array_length(v_split) = 7 THEN
      FOR v_i IN 0..6 LOOP
        v_label := COALESCE(
          v_split -> v_i ->> 'day',
          CASE WHEN jsonb_typeof(v_split -> v_i) = 'string'
               THEN trim(both '"' from (v_split -> v_i)::text)
               ELSE '' END
        );
        v_rest[v_i + 1] := (v_label ~* '(rest|istirahat|休息)') OR v_label IS NULL OR v_label = '';
      END LOOP;
    END IF;

    -- Collect completed workout dates for this plan, scoped to plan_started_at when present
    SELECT array_agg(DISTINCT workout_date ORDER BY workout_date) INTO v_dates
      FROM public.workout_completions
      WHERE user_id = v_user
        AND plan_id = v_plan.id
        AND completed = true
        AND (v_plan.plan_started_at IS NULL OR completed_at IS NULL
             OR completed_at >= v_plan.plan_started_at);

    IF v_dates IS NULL OR array_length(v_dates, 1) IS NULL THEN
      CONTINUE;
    END IF;

    -- Build set membership via a temp jsonb for O(1) lookups
    SELECT jsonb_object_agg(d::text, true) INTO v_set
      FROM unnest(v_dates) d;

    v_start := v_dates[1];
    v_cursor := v_start;
    v_cur := 0;
    v_longest := 0;
    WHILE v_cursor <= v_end LOOP
      -- Postgres: Sunday=0..Saturday=6; map to Mon=1..Sun=7
      v_dow := ((extract(dow from v_cursor)::int + 6) % 7) + 1;
      IF NOT v_rest[v_dow] THEN
        IF v_set ? v_cursor::text THEN
          v_cur := v_cur + 1;
          IF v_cur > v_longest THEN v_longest := v_cur; END IF;
        ELSE
          v_cur := 0;
        END IF;
      END IF;
      v_cursor := v_cursor + 1;
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

REVOKE EXECUTE ON FUNCTION public.bump_longest_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_longest_streak() TO authenticated, service_role;
