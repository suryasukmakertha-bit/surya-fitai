REVOKE EXECUTE ON FUNCTION public.bump_longest_streak(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_longest_streak(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.bump_longest_streak(integer) TO authenticated, service_role;