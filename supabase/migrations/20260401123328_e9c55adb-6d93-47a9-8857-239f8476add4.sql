
DROP POLICY IF EXISTS user_insert_own_sub ON public.subscriptions;

CREATE POLICY user_insert_own_sub ON public.subscriptions
  FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id AND status = 'trial');
