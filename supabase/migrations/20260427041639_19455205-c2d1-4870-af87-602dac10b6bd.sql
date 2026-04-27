ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_generate_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_generate_month text NOT NULL DEFAULT '';