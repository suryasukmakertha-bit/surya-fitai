
-- Enterprise workout completions table
CREATE TABLE public.workout_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.saved_plans(id) ON DELETE CASCADE,
  workout_date date NOT NULL DEFAULT CURRENT_DATE,
  exercise_id text NOT NULL,
  day_label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Composite unique constraint to prevent duplicates
CREATE UNIQUE INDEX workout_unique_idx
ON public.workout_completions (user_id, plan_id, workout_date, exercise_id, day_label);

-- Performance indexes
CREATE INDEX workout_lookup_idx
ON public.workout_completions (user_id, plan_id, workout_date);

CREATE INDEX workout_completed_idx
ON public.workout_completions (completed) WHERE completed = true;

-- Enable RLS
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can select own completions"
ON public.workout_completions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
ON public.workout_completions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
ON public.workout_completions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
ON public.workout_completions FOR DELETE
USING (auth.uid() = user_id);

-- Audit log table
CREATE TABLE public.workout_completion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id uuid,
  user_id uuid,
  action text NOT NULL,
  previous_state boolean,
  new_state boolean,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE public.workout_completion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
ON public.workout_completion_audit FOR SELECT
USING (auth.uid() = user_id);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.log_workout_changes()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workout_completion_audit
  (completion_id, user_id, action, previous_state, new_state)
  VALUES
  (COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id), TG_OP, OLD.completed, NEW.completed);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach audit trigger
CREATE TRIGGER workout_audit_trigger
AFTER UPDATE ON public.workout_completions
FOR EACH ROW
EXECUTE FUNCTION public.log_workout_changes();

-- Auto-update updated_at
CREATE TRIGGER update_workout_completions_updated_at
BEFORE UPDATE ON public.workout_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Database-level progress calculation
CREATE OR REPLACE FUNCTION public.calculate_workout_progress(
  p_user uuid,
  p_plan uuid,
  p_date date,
  p_total integer
)
RETURNS integer AS $$
DECLARE
  completed_count integer;
BEGIN
  SELECT count(*) INTO completed_count
  FROM public.workout_completions
  WHERE user_id = p_user
  AND plan_id = p_plan
  AND workout_date = p_date
  AND completed = true;

  IF p_total = 0 THEN RETURN 0; END IF;
  RETURN round((completed_count::decimal / p_total) * 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_completions;
