CREATE OR REPLACE FUNCTION public.reserve_generate_quota(
  p_user_id uuid,
  p_tier text,
  p_max int,
  p_period_start date DEFAULT NULL,
  p_month_key text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used int;
  v_stored_month text;
  v_last_reset date;
BEGIN
  IF p_tier NOT IN ('trial','period','free') THEN
    RAISE EXCEPTION 'Invalid tier';
  END IF;

  -- Lock the profile row to serialize concurrent quota checks for this user.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  IF p_tier = 'trial' THEN
    SELECT COALESCE(trial_generate_count, 0) INTO v_used
      FROM public.profiles WHERE user_id = p_user_id;
    IF v_used >= p_max THEN
      PERFORM set_config('app.bypass_profile_guard', 'off', true);
      RETURN false;
    END IF;
    UPDATE public.profiles
      SET trial_generate_count = COALESCE(trial_generate_count, 0) + 1
      WHERE user_id = p_user_id;

  ELSIF p_tier = 'period' THEN
    SELECT COALESCE(period_generate_count, 0), last_generate_reset
      INTO v_used, v_last_reset
      FROM public.profiles WHERE user_id = p_user_id;
    IF v_last_reset IS NULL OR v_last_reset < p_period_start THEN
      v_used := 0;
      UPDATE public.profiles
        SET period_generate_count = 0, last_generate_reset = p_period_start
        WHERE user_id = p_user_id;
    END IF;
    IF v_used >= p_max THEN
      PERFORM set_config('app.bypass_profile_guard', 'off', true);
      RETURN false;
    END IF;
    UPDATE public.profiles
      SET period_generate_count = COALESCE(period_generate_count, 0) + 1,
          last_generate_reset = p_period_start
      WHERE user_id = p_user_id;

  ELSE -- free
    SELECT free_generate_month, COALESCE(free_generate_count, 0)
      INTO v_stored_month, v_used
      FROM public.profiles WHERE user_id = p_user_id;
    IF v_stored_month IS DISTINCT FROM p_month_key THEN
      v_used := 0;
    END IF;
    IF v_used >= p_max THEN
      PERFORM set_config('app.bypass_profile_guard', 'off', true);
      RETURN false;
    END IF;
    UPDATE public.profiles
      SET free_generate_count = v_used + 1,
          free_generate_month = p_month_key
      WHERE user_id = p_user_id;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_generate_quota(
  p_user_id uuid,
  p_tier text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tier NOT IN ('trial','period','free') THEN
    RETURN;
  END IF;

  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  IF p_tier = 'trial' THEN
    UPDATE public.profiles
      SET trial_generate_count = GREATEST(COALESCE(trial_generate_count, 0) - 1, 0)
      WHERE user_id = p_user_id;
  ELSIF p_tier = 'period' THEN
    UPDATE public.profiles
      SET period_generate_count = GREATEST(COALESCE(period_generate_count, 0) - 1, 0)
      WHERE user_id = p_user_id;
  ELSE
    UPDATE public.profiles
      SET free_generate_count = GREATEST(COALESCE(free_generate_count, 0) - 1, 0)
      WHERE user_id = p_user_id;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_generate_quota(uuid, text, int, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_generate_quota(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generate_quota(uuid, text, int, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_generate_quota(uuid, text) TO service_role;