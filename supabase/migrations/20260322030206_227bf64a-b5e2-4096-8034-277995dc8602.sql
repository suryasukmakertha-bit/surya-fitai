CREATE OR REPLACE FUNCTION public.calculate_workout_progress(p_user uuid, p_plan uuid, p_date date, p_total integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  completed_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'Unauthorized: you can only query your own progress';
  END IF;

  SELECT count(*) INTO completed_count
  FROM public.workout_completions
  WHERE user_id = p_user
  AND plan_id = p_plan
  AND workout_date = p_date
  AND completed = true;

  IF p_total = 0 THEN RETURN 0; END IF;
  RETURN round((completed_count::decimal / p_total) * 100);
END;
$$;