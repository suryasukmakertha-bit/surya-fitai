CREATE OR REPLACE FUNCTION public.prevent_profile_counter_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  BEGIN
    v_role := auth.role();
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role IS NULL OR v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.period_generate_count IS DISTINCT FROM OLD.period_generate_count
     OR NEW.trial_generate_count IS DISTINCT FROM OLD.trial_generate_count
     OR NEW.free_generate_count  IS DISTINCT FROM OLD.free_generate_count
     OR NEW.free_generate_month  IS DISTINCT FROM OLD.free_generate_month
     OR NEW.last_generate_reset  IS DISTINCT FROM OLD.last_generate_reset
     OR NEW.longest_streak       IS DISTINCT FROM OLD.longest_streak
  THEN
    RAISE EXCEPTION 'Protected profile counters can only be modified by the server'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;