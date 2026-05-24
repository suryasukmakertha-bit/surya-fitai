DROP TRIGGER IF EXISTS guard_activity_date_workout_completions ON public.workout_completions;
DROP TRIGGER IF EXISTS guard_workout_completions_date ON public.workout_completions;
DROP TRIGGER IF EXISTS workout_completions_date_guard ON public.workout_completions;

DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.workout_completions'::regclass
      AND NOT tgisinternal
      AND tgfoid = 'public.guard_activity_date'::regproc
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.workout_completions', trg.tgname);
  END LOOP;
END $$;