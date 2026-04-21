-- Add injury, allergy and generation count tracking to saved_plans
ALTER TABLE public.saved_plans
  ADD COLUMN IF NOT EXISTS injuries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS food_allergies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generate_count integer NOT NULL DEFAULT 0;