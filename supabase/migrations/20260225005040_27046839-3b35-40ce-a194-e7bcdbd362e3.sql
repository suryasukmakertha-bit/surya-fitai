
-- Add client_generated_id column for idempotent plan saves
ALTER TABLE public.saved_plans ADD COLUMN IF NOT EXISTS client_generated_id TEXT;

-- Add unique constraint to prevent duplicate saves
ALTER TABLE public.saved_plans ADD CONSTRAINT saved_plans_user_client_id_unique UNIQUE (user_id, client_generated_id);
