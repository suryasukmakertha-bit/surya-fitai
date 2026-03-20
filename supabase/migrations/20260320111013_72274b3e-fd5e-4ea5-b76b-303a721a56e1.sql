
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial',
  trial_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 19900,
  midtrans_order_id TEXT UNIQUE,
  midtrans_transaction_id TEXT,
  payment_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create validation trigger for subscription status
CREATE OR REPLACE FUNCTION public.validate_subscription_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('trial', 'active', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_subscription_status
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_status();

-- Create validation trigger for payment transaction status
CREATE OR REPLACE FUNCTION public.validate_payment_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'paid', 'failed', 'expired') THEN
    RAISE EXCEPTION 'Invalid payment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_status
  BEFORE INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_status();

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_sub" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_sub" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_update_sub" ON public.subscriptions FOR UPDATE USING (true);

CREATE POLICY "user_select_own_tx" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_tx" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_update_tx" ON public.payment_transactions FOR UPDATE USING (true);
