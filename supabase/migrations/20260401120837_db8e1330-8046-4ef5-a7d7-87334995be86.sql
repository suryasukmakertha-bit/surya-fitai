
-- 1. Add user_id column to push_subscriptions
ALTER TABLE public.push_subscriptions
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop overly permissive policies
DROP POLICY IF EXISTS "Allow select push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow update push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow insert push subscriptions" ON public.push_subscriptions;

-- 3. Add user-scoped policies
CREATE POLICY "push_select_own" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "push_insert_own" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_update_own" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_delete_own" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Allow service_role full access for send-daily-reminders edge function
CREATE POLICY "service_select_push_subs" ON public.push_subscriptions
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_delete_push_subs" ON public.push_subscriptions
  FOR DELETE TO service_role USING (true);

-- 5. Fix storage policy: restrict exercise-images INSERT to service_role only
DROP POLICY IF EXISTS "Service can upload exercise images" ON storage.objects;

CREATE POLICY "service_upload_exercise_images"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'exercise-images');
