ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS period_generate_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_generate_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_generate_reset date;