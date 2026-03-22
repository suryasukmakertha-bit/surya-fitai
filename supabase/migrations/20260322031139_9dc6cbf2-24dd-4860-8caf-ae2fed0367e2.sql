
-- FIX 1: Restrict update policies to service_role only

DROP POLICY IF EXISTS "service_update_tx" ON payment_transactions;
CREATE POLICY "service_update_tx" ON payment_transactions
FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_update_sub" ON subscriptions;
CREATE POLICY "service_update_sub" ON subscriptions
FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- FIX 2: Replace permissive SELECT policies with authenticated-only, user-scoped ones

DROP POLICY IF EXISTS "user_select_own_tx" ON payment_transactions;
CREATE POLICY "user_select_own_tx" ON payment_transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_select_own_sub" ON subscriptions;
CREATE POLICY "user_select_own_sub" ON subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Fix exercise_gif_cache INSERT/UPDATE to service_role only

DROP POLICY IF EXISTS "service_can_insert_exercise_cache" ON exercise_gif_cache;
CREATE POLICY "service_can_insert_exercise_cache" ON exercise_gif_cache
FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "service_can_update_exercise_cache" ON exercise_gif_cache;
CREATE POLICY "service_can_update_exercise_cache" ON exercise_gif_cache
FOR UPDATE TO service_role
USING (true) WITH CHECK (true);
