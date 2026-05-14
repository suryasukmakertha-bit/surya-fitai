
-- ============================================
-- 1. DAILY CHALLENGES: Remove client INSERT, add service-only INSERT, create RPC
-- ============================================
DROP POLICY IF EXISTS "authenticated_insert_daily_challenges" ON public.daily_challenges;

CREATE POLICY "service_insert_daily_challenges"
ON public.daily_challenges
FOR INSERT
TO service_role
WITH CHECK (true);

-- Deterministic daily challenge generator (server-side, validated)
CREATE OR REPLACE FUNCTION public.get_or_create_daily_challenge()
RETURNS public.daily_challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := (now() AT TIME ZONE 'UTC')::date;
  v_row public.daily_challenges;
  v_seed_ex bigint;
  v_seed_diff bigint;
  v_seed_reps bigint;
  v_pool text[] := ARRAY['Push-up','Squat','Plank','Sit-up','Burpee','Jumping Jack','Lunge','Mountain Climber','Jump Squat','Diamond Push-up'];
  v_ex text;
  v_diff text;
  v_reps int;
  v_xp int;
  v_diff_pick numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_row FROM public.daily_challenges WHERE challenge_date = v_date LIMIT 1;
  IF FOUND THEN RETURN v_row; END IF;

  v_seed_ex := abs(hashtext(v_date::text || ':ex'));
  v_seed_diff := abs(hashtext(v_date::text || ':diff'));
  v_seed_reps := abs(hashtext(v_date::text || ':r'));

  v_ex := v_pool[(v_seed_ex % array_length(v_pool, 1)) + 1];
  v_diff_pick := (v_seed_diff % 100000)::numeric / 100000;

  IF v_diff_pick < 0.34 THEN
    v_diff := 'mudah';
    v_reps := (v_seed_reps % 21) + 20;  -- 20-40
    v_xp := 30;
  ELSIF v_diff_pick < 0.75 THEN
    v_diff := 'sedang';
    v_reps := (v_seed_reps % 21) + 40;  -- 40-60
    v_xp := 50;
  ELSE
    v_diff := 'sulit';
    v_reps := (v_seed_reps % 11) + 15;  -- 15-25
    v_xp := 80;
  END IF;

  INSERT INTO public.daily_challenges (challenge_date, exercise_name, target_reps, difficulty, xp_reward)
  VALUES (v_date, v_ex, v_reps, v_diff, v_xp)
  ON CONFLICT (challenge_date) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.daily_challenges WHERE challenge_date = v_date LIMIT 1;
  END IF;
  RETURN v_row;
END;
$$;

-- Ensure unique constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_challenges_challenge_date_key'
  ) THEN
    ALTER TABLE public.daily_challenges ADD CONSTRAINT daily_challenges_challenge_date_key UNIQUE (challenge_date);
  END IF;
END$$;

-- ============================================
-- 2. USER_XP: remove client INSERT/UPDATE policies (all writes via increment_user_xp RPC)
-- ============================================
DROP POLICY IF EXISTS "xp_insert_own" ON public.user_xp;
DROP POLICY IF EXISTS "xp_update_own" ON public.user_xp;

-- ============================================
-- 3. USER_MEDALS: remove client INSERT, create validating award RPC
-- ============================================
DROP POLICY IF EXISTS "medals_insert_own" ON public.user_medals;

CREATE OR REPLACE FUNCTION public.award_medal_if_earned(
  p_medal_id text,
  p_medal_name text,
  p_medal_tier text,
  p_medal_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Already earned? return silently
  IF EXISTS (SELECT 1 FROM public.user_medals WHERE user_id = v_user AND medal_id = p_medal_id) THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_earned');
  END IF;

  -- Validate per medal type
  IF p_medal_id IN ('DAILY_1','DAILY_7','DAILY_30') THEN
    SELECT count(*) INTO v_count FROM public.user_challenge_progress
     WHERE user_id = v_user AND completed_at IS NOT NULL;
    IF p_medal_id = 'DAILY_1'  AND v_count >= 1  THEN v_qualifies := true; v_xp := 50; END IF;
    IF p_medal_id = 'DAILY_7'  AND v_count >= 7  THEN v_qualifies := true; v_xp := 150; END IF;
    IF p_medal_id = 'DAILY_30' AND v_count >= 30 THEN v_qualifies := true; v_xp := 500; END IF;

  ELSIF p_medal_id IN ('STREAK_3','STREAK_7','STREAK_30') THEN
    SELECT array_agg(workout_date ORDER BY workout_date DESC) INTO v_dates
      FROM (SELECT DISTINCT workout_date FROM public.workout_completions
              WHERE user_id = v_user AND completed = true
              ORDER BY workout_date DESC LIMIT 500) s;
    v_streak := 0;
    v_cursor := v_today;
    IF v_dates IS NOT NULL AND NOT (v_cursor = ANY(v_dates)) THEN
      v_cursor := v_cursor - 1;
    END IF;
    WHILE v_dates IS NOT NULL AND v_cursor = ANY(v_dates) LOOP
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    END LOOP;
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
    SELECT count(*) INTO v_count FROM public.saved_plans WHERE user_id = v_user;
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
$$;

-- ============================================
-- 4. Lock down EXECUTE on SECURITY DEFINER functions
-- ============================================
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_workout_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_workout_progress(uuid, uuid, date, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_user_xp(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_or_create_daily_challenge() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_medal_if_earned(text, text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.calculate_workout_progress(uuid, uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_xp(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_medal_if_earned(text, text, text, text) TO authenticated;
