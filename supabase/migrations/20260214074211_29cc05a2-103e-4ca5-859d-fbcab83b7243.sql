
CREATE TABLE public.workout_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.saved_plans(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  day_label TEXT NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_id, exercise_name, day_label, completed_date)
);

ALTER TABLE public.workout_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.workout_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON public.workout_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins" ON public.workout_checkins FOR DELETE USING (auth.uid() = user_id);
