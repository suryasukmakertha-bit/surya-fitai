CREATE OR REPLACE FUNCTION public.get_or_create_daily_challenge(p_local_date date)
 RETURNS public.daily_challenges
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date := COALESCE(p_local_date, (now() AT TIME ZONE 'UTC')::date);
  v_row public.daily_challenges;
  v_day_idx bigint;
  v_ex_idx int;
  v_diff_idx int;
  v_ex text;
  v_diff text;
  v_target int;
  v_xp int;
  v_pool text[] := ARRAY[
    'Push-up','Sit-up','Squat','Lunge','Burpee',
    'Mountain Climber','Jump Squat','Crunch','High Knees','Jumping Jack',
    'Plank','Wall Sit','Dead Hang','Glute Bridge Hold','Superman Hold'
  ];
  v_targets int[][] := ARRAY[
    ARRAY[10,20,35],
    ARRAY[15,25,40],
    ARRAY[15,30,50],
    ARRAY[10,20,35],
    ARRAY[5,10,20],
    ARRAY[20,40,60],
    ARRAY[10,20,30],
    ARRAY[15,30,50],
    ARRAY[20,40,60],
    ARRAY[20,40,60],
    ARRAY[20,45,90],
    ARRAY[20,45,75],
    ARRAY[15,30,60],
    ARRAY[20,40,70],
    ARRAY[15,30,60]
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_row FROM public.daily_challenges WHERE challenge_date = v_date LIMIT 1;
  IF FOUND THEN RETURN v_row; END IF;

  v_day_idx := (v_date - DATE '2025-01-01');
  v_ex_idx := (v_day_idx % 15)::int;
  v_diff_idx := (v_day_idx % 3)::int;

  v_ex := v_pool[v_ex_idx + 1];
  v_target := v_targets[v_ex_idx + 1][v_diff_idx + 1];

  IF v_diff_idx = 0 THEN
    v_diff := 'mudah'; v_xp := 25;
  ELSIF v_diff_idx = 1 THEN
    v_diff := 'sedang'; v_xp := 50;
  ELSE
    v_diff := 'sulit'; v_xp := 100;
  END IF;

  INSERT INTO public.daily_challenges (challenge_date, exercise_name, target_reps, difficulty, xp_reward)
  VALUES (v_date, v_ex, v_target, v_diff, v_xp)
  ON CONFLICT (challenge_date) DO NOTHING;

  SELECT * INTO v_row FROM public.daily_challenges WHERE challenge_date = v_date LIMIT 1;
  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_or_create_daily_challenge(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_challenge(date) TO authenticated;