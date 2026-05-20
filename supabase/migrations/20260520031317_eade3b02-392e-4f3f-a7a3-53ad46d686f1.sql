REVOKE EXECUTE ON FUNCTION public.complete_daily_challenge() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_daily_challenge() FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_daily_challenge() TO authenticated;