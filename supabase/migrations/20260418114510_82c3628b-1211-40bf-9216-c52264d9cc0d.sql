ALTER TABLE public.saved_plans
  ADD COLUMN IF NOT EXISTS plan_month_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS plan_started_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS plan_completed_at timestamp with time zone;