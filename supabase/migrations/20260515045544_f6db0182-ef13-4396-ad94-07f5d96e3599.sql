CREATE OR REPLACE FUNCTION public.get_or_create_daily_challenge()
 RETURNS daily_challenges
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_is_isometric boolean;
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

  v_is_isometric := (
    v_ex ILIKE '%plank%'
    OR v_ex ILIKE '%wall sit%'
    OR v_ex ILIKE '%dead hang%'
    OR v_ex ILIKE '%hollow body%'
    OR v_ex ILIKE '%superman hold%'
    OR v_ex ILIKE '%glute bridge hold%'
    OR v_ex ILIKE '%l-sit%'
    OR v_ex ILIKE '%hold%'
    OR v_ex ILIKE '%isometric%'
  );

  IF v_diff_pick < 0.34 THEN
    v_diff := 'mudah';
    IF v_is_isometric THEN
      v_reps := (v_seed_reps % 11) + 20;
    ELSE
      v_reps := (v_seed_reps % 21) + 20;
    END IF;
    v_xp := 30;
  ELSIF v_diff_pick < 0.75 THEN
    v_diff := 'sedang';
    v_reps := (v_seed_reps % 21) + 40;
    v_xp := 50;
  ELSE
    v_diff := 'sulit';
    IF v_is_isometric THEN
      v_reps := (v_seed_reps % 46) + 75;
    ELSE
      v_reps := (v_seed_reps % 11) + 15;
    END IF;
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
$function$;