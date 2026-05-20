-- FIX 1: payment_transactions insert policy
DROP POLICY IF EXISTS user_insert_own_tx ON public.payment_transactions;
CREATE POLICY user_insert_own_tx ON public.payment_transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND amount = 19900
    AND midtrans_order_id IS NULL
    AND midtrans_transaction_id IS NULL
  );

-- FIX 2: subscriptions insert policy
DROP POLICY IF EXISTS user_insert_own_sub ON public.subscriptions;
CREATE POLICY user_insert_own_sub ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'trial'
    AND subscription_start IS NULL
    AND subscription_end IS NULL
    AND trial_start BETWEEN (now() - interval '1 minute') AND (now() + interval '1 minute')
    AND trial_end   BETWEEN (now() + interval '14 days' - interval '1 minute')
                        AND (now() + interval '14 days' + interval '1 minute')
  );

-- FIX 3: restrict EXECUTE on complete_daily_challenge
REVOKE ALL ON FUNCTION public.complete_daily_challenge() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_daily_challenge() FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_daily_challenge() TO authenticated;
