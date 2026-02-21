
-- Add plan_id column to progress_checkins (nullable for existing data)
ALTER TABLE public.progress_checkins
ADD COLUMN plan_id uuid REFERENCES public.saved_plans(id) ON DELETE CASCADE;

-- Create index for faster filtering
CREATE INDEX idx_progress_checkins_plan_id ON public.progress_checkins(plan_id);
