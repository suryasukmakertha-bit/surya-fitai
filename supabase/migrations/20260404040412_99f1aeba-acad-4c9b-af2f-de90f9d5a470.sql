-- 1. Enable RLS on app_config and add service-role-only policies
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_select_app_config" ON public.app_config
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_insert_app_config" ON public.app_config
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_update_app_config" ON public.app_config
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_delete_app_config" ON public.app_config
  FOR DELETE TO service_role USING (true);

-- 2. Fix payment_transactions INSERT policy to restrict to pending status only
DROP POLICY IF EXISTS "user_insert_own_tx" ON public.payment_transactions;

CREATE POLICY "user_insert_own_tx" ON public.payment_transactions
  FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 3. Ensure RLS is enabled on workout_completion_audit (confirm)
ALTER TABLE public.workout_completion_audit ENABLE ROW LEVEL SECURITY;