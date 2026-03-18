
-- Push subscriptions for server-sent Web Push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  lang text NOT NULL DEFAULT 'en',
  last_morning_sent date,
  last_afternoon_sent date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow select push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (true);

-- App config for VAPID keys (service role only access)
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
