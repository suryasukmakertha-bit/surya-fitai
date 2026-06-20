
CREATE OR REPLACE FUNCTION public.award_medal_if_earned(p_medal_id text, p_medal_name text, p_medal_tier text, p_medal_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_qualifies boolean := false;
  v_xp int := 0;
  v_count int;
  v_streak int;
  v_dates date[];
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_cursor date;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_medal_tier NOT IN ('bronze','silver','gold','platinum') THEN
    RAISE EXCEPTION 'Invalid tier';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_medals WHERE user_id = v_user AND medal_id = p_medal_id) THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_earned');
  END IF;

  IF p_medal_id IN ('DAILY_1','DAILY_7','DAILY_30') THEN
    SELECT count(*) INTO v_count FROM public.user_challenge_progress
     WHERE user_id = v_user AND completed_at IS NOT NULL;
    IF p_medal_id = 'DAILY_1'  AND v_count >= 1  THEN v_qualifies := true; v_xp := 50; END IF;
    IF p_medal_id = 'DAILY_7'  AND v_count >= 7  THEN v_qualifies := true; v_xp := 150; END IF;
    IF p_medal_id = 'DAILY_30' AND v_count >= 30 THEN v_qualifies := true; v_xp := 500; END IF;

  ELSIF p_medal_id IN ('STREAK_3','STREAK_7','STREAK_30') THEN
    SELECT COALESCE(longest_streak, 0) INTO v_streak
      FROM public.profiles WHERE user_id = v_user;
    v_streak := COALESCE(v_streak, 0);
    IF p_medal_id = 'STREAK_3'  AND v_streak >= 3  THEN v_qualifies := true; v_xp := 75; END IF;
    IF p_medal_id = 'STREAK_7'  AND v_streak >= 7  THEN v_qualifies := true; v_xp := 200; END IF;
    IF p_medal_id = 'STREAK_30' AND v_streak >= 30 THEN v_qualifies := true; v_xp := 750; END IF;

  ELSIF p_medal_id = 'PROGRAM_COMPLETE' THEN
    SELECT count(*) INTO v_count FROM public.saved_plans
      WHERE user_id = v_user AND plan_completed_at IS NOT NULL;
    IF v_count >= 1 THEN v_qualifies := true; v_xp := 300; END IF;

  ELSIF p_medal_id = 'WEIGHT_GOAL' THEN
    SELECT count(*) INTO v_count FROM public.saved_plans
      WHERE user_id = v_user AND plan_completed_at IS NOT NULL;
    IF v_count >= 1 THEN v_qualifies := true; v_xp := 250; END IF;

  ELSIF p_medal_id = 'FIRST_GENERATE' THEN
    SELECT count(*) INTO v_count
      FROM public.saved_plans sp
     WHERE sp.user_id = v_user
       AND jsonb_typeof(COALESCE(sp.plan_data->'workout_plan', sp.plan_data->'workoutPlan')) = 'array'
       AND jsonb_array_length(COALESCE(sp.plan_data->'workout_plan', sp.plan_data->'workoutPlan')) >= 3
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(
           COALESCE(sp.plan_data->'workout_plan', sp.plan_data->'workoutPlan')
         ) AS day
         WHERE jsonb_typeof(day->'exercises') = 'array'
           AND jsonb_array_length(day->'exercises') >= 1
       );
    IF v_count >= 1 THEN v_qualifies := true; v_xp := 30; END IF;

  ELSIF p_medal_id = 'CHECKIN_14' THEN
    SELECT array_agg(date ORDER BY date DESC) INTO v_dates
      FROM (SELECT DISTINCT date FROM public.progress_checkins
              WHERE user_id = v_user ORDER BY date DESC LIMIT 60) s;
    v_streak := 0;
    v_cursor := v_today;
    IF v_dates IS NOT NULL AND NOT (v_cursor = ANY(v_dates)) THEN
      v_cursor := v_cursor - 1;
    END IF;
    WHILE v_dates IS NOT NULL AND v_cursor = ANY(v_dates) LOOP
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    END LOOP;
    IF v_streak >= 14 THEN v_qualifies := true; v_xp := 100; END IF;

  ELSIF p_medal_id IN ('FIRST_RUN','RUN_5K','RUN_10K') THEN
    IF p_medal_id = 'FIRST_RUN' THEN
      SELECT count(*) INTO v_count FROM public.activity_sessions
        WHERE user_id = v_user AND activity_type = 'running';
      IF v_count >= 1 THEN v_qualifies := true; v_xp := 50; END IF;
    ELSIF p_medal_id = 'RUN_5K' THEN
      IF EXISTS (SELECT 1 FROM public.activity_sessions
                 WHERE user_id = v_user AND activity_type = 'running' AND distance_km >= 5)
      THEN v_qualifies := true; v_xp := 150; END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM public.activity_sessions
                 WHERE user_id = v_user AND activity_type = 'running' AND distance_km >= 10)
      THEN v_qualifies := true; v_xp := 300; END IF;
    END IF;

  ELSIF p_medal_id IN ('FIRST_RIDE','RIDE_20K') THEN
    IF p_medal_id = 'FIRST_RIDE' THEN
      SELECT count(*) INTO v_count FROM public.activity_sessions
        WHERE user_id = v_user AND activity_type = 'cycling';
      IF v_count >= 1 THEN v_qualifies := true; v_xp := 50; END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM public.activity_sessions
                 WHERE user_id = v_user AND activity_type = 'cycling' AND distance_km >= 20)
      THEN v_qualifies := true; v_xp := 200; END IF;
    END IF;

  ELSE
    RETURN jsonb_build_object('awarded', false, 'reason', 'unknown_medal');
  END IF;

  IF NOT v_qualifies THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'not_earned');
  END IF;

  INSERT INTO public.user_medals (user_id, medal_id, medal_name, medal_tier, medal_description)
  VALUES (v_user, p_medal_id, p_medal_name, p_medal_tier, p_medal_description)
  ON CONFLICT DO NOTHING;

  IF v_xp > 0 THEN
    INSERT INTO public.user_xp (user_id, total_xp, updated_at)
    VALUES (v_user, v_xp, now())
    ON CONFLICT (user_id) DO UPDATE
      SET total_xp = public.user_xp.total_xp + EXCLUDED.total_xp, updated_at = now();
  END IF;

  RETURN jsonb_build_object('awarded', true, 'xp_earned', v_xp);
END;
$function$;
