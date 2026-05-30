DROP TRIGGER IF EXISTS guard_workout_completions_date ON public.workout_completions;

CREATE TRIGGER guard_workout_completions_date
BEFORE INSERT OR UPDATE ON public.workout_completions
FOR EACH ROW
EXECUTE FUNCTION public.guard_activity_date();