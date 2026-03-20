CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terms_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_consent" ON public.user_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_insert_own_consent" ON public.user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);