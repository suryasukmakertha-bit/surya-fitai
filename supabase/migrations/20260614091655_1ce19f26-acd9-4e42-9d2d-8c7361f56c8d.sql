CREATE OR REPLACE FUNCTION public.bump_longest_streak(p_candidate integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_current integer;
  v_candidate integer := GREATEST(COALESCE(p_candidate, 0), 0);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(longest_streak, 0) INTO v_current
    FROM public.profiles WHERE user_id = v_user;
  v_current := COALESCE(v_current, 0);

  IF v_candidate > v_current THEN
    PERFORM set_config('app.bypass_longest_streak_guard', 'on', true);
    UPDATE public.profiles
      SET longest_streak = v_candidate, updated_at = now()
      WHERE user_id = v_user;
    PERFORM set_config('app.bypass_longest_streak_guard', 'off', true);
    RETURN v_candidate;
  END IF;

  RETURN v_current;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.bump_longest_streak(integer) TO authenticated;