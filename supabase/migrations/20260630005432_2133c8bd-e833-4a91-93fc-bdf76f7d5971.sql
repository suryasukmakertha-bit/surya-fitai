REVOKE EXECUTE ON FUNCTION public.bump_longest_streak(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bump_longest_streak(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bump_longest_streak(text, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.bump_longest_streak(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bump_longest_streak(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bump_longest_streak(text, integer) TO authenticated, service_role;