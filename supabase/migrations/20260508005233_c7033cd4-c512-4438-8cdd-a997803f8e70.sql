CREATE OR REPLACE FUNCTION public.increment_user_xp(p_user_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_xp IS NULL OR p_xp <= 0 THEN
    RETURN;
  END IF;
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO public.user_xp (user_id, total_xp, updated_at)
  VALUES (p_user_id, p_xp, now())
  ON CONFLICT (user_id)
  DO UPDATE SET total_xp = public.user_xp.total_xp + EXCLUDED.total_xp, updated_at = now();
END;
$$;