
CREATE OR REPLACE FUNCTION public.log_workout_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that the caller owns the workout completion
  IF auth.uid() IS NULL OR (auth.uid() != COALESCE(NEW.user_id, OLD.user_id)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.workout_completion_audit
  (completion_id, user_id, action, previous_state, new_state)
  VALUES
  (COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id), TG_OP, OLD.completed, NEW.completed);
  RETURN NEW;
END;
$function$;
