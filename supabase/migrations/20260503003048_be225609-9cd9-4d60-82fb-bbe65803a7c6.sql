
-- App legal content (terms & privacy) editable by admin
CREATE TABLE public.app_legal_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL,
  lang text NOT NULL DEFAULT 'id',
  content_text text NOT NULL,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT app_legal_content_type_lang_unique UNIQUE (content_type, lang),
  CONSTRAINT app_legal_content_type_chk CHECK (content_type IN ('terms','privacy'))
);

ALTER TABLE public.app_legal_content ENABLE ROW LEVEL SECURITY;

-- Admin check via auth email (matches SPECIAL_EMAIL in app)
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'surya.sukmakertha@gmail.com'
  );
$$;

CREATE POLICY "anyone_read_legal" ON public.app_legal_content
  FOR SELECT USING (true);

CREATE POLICY "admin_insert_legal" ON public.app_legal_content
  FOR INSERT WITH CHECK (public.is_app_admin());

CREATE POLICY "admin_update_legal" ON public.app_legal_content
  FOR UPDATE USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());
