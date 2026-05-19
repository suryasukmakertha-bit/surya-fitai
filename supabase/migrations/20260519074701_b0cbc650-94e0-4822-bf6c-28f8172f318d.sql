
-- ============ FIX 3 & 4: Guard user_challenge_progress columns ============
CREATE OR REPLACE FUNCTION public.guard_ucp_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass text;
BEGIN
  BEGIN
    v_bypass := current_setting('app.bypass_ucp_guard', true);
  EXCEPTION WHEN OTHERS THEN
    v_bypass := NULL;
  END;

  IF v_bypass = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Clients may only create an "accepted" row; server flow sets completion/xp.
    NEW.xp_earned := 0;
    NEW.completed_at := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Preserve server-managed fields on any client update.
    NEW.xp_earned := OLD.xp_earned;
    NEW.completed_at := OLD.completed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ucp_guard_iu ON public.user_challenge_progress;
CREATE TRIGGER ucp_guard_iu
BEFORE INSERT OR UPDATE ON public.user_challenge_progress
FOR EACH ROW EXECUTE FUNCTION public.guard_ucp_writes();

-- ============ Server-side challenge completion RPC ============
CREATE OR REPLACE FUNCTION public.complete_daily_challenge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_date date := (now() AT TIME ZONE 'UTC')::date;
  v_xp int;
  v_existing public.user_challenge_progress;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT xp_reward INTO v_xp
    FROM public.daily_challenges
    WHERE challenge_date = v_date
    LIMIT 1;

  IF v_xp IS NULL THEN
    RAISE EXCEPTION 'No challenge available for today';
  END IF;

  SELECT * INTO v_existing
    FROM public.user_challenge_progress
    WHERE user_id = v_user AND challenge_date = v_date;

  IF v_existing.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'xp_awarded', 0, 'already_completed', true);
  END IF;

  PERFORM set_config('app.bypass_ucp_guard', 'on', true);

  INSERT INTO public.user_challenge_progress
    (user_id, challenge_date, accepted_at, completed_at, xp_earned)
  VALUES
    (v_user, v_date, COALESCE(v_existing.accepted_at, now()), now(), v_xp)
  ON CONFLICT (user_id, challenge_date) DO UPDATE
    SET completed_at = now(),
        xp_earned    = v_xp,
        accepted_at  = COALESCE(public.user_challenge_progress.accepted_at, now());

  PERFORM set_config('app.bypass_ucp_guard', 'off', true);

  INSERT INTO public.user_xp (user_id, total_xp, updated_at)
  VALUES (v_user, v_xp, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_xp.total_xp + EXCLUDED.total_xp,
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'xp_awarded', v_xp, 'already_completed', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_daily_challenge() TO authenticated;

-- ============ FIX 1: Date plausibility guards on activity-source tables ============
CREATE OR REPLACE FUNCTION public.guard_activity_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_d date;
BEGIN
  IF TG_TABLE_NAME = 'workout_completions' THEN
    v_d := NEW.workout_date;
  ELSIF TG_TABLE_NAME = 'activity_sessions' THEN
    v_d := NEW.date;
  ELSIF TG_TABLE_NAME = 'progress_checkins' THEN
    v_d := NEW.date;
  ELSE
    RETURN NEW;
  END IF;

  IF v_d IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow today and yesterday only (covers timezone seams). Reject future + backdating.
  IF v_d > v_today + 1 OR v_d < v_today - 1 THEN
    RAISE EXCEPTION 'Date out of allowed range (must be today or yesterday UTC)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_workout_completions_date ON public.workout_completions;
CREATE TRIGGER guard_workout_completions_date
BEFORE INSERT ON public.workout_completions
FOR EACH ROW EXECUTE FUNCTION public.guard_activity_date();

DROP TRIGGER IF EXISTS guard_activity_sessions_date ON public.activity_sessions;
CREATE TRIGGER guard_activity_sessions_date
BEFORE INSERT ON public.activity_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_activity_date();

DROP TRIGGER IF EXISTS guard_progress_checkins_date ON public.progress_checkins;
CREATE TRIGGER guard_progress_checkins_date
BEFORE INSERT ON public.progress_checkins
FOR EACH ROW EXECUTE FUNCTION public.guard_activity_date();

-- ============ FIX 2: Explicit UPDATE policy on activity_sessions ============
DROP POLICY IF EXISTS activity_update_own ON public.activity_sessions;
CREATE POLICY activity_update_own
ON public.activity_sessions
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
