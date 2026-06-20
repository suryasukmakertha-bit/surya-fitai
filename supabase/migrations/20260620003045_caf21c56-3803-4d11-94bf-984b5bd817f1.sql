
CREATE OR REPLACE FUNCTION public.guard_activity_session_distance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_arr jsonb;
  v_len int;
  v_i int;
  v_prev jsonb;
  v_cur jsonb;
  v_lat1 double precision;
  v_lng1 double precision;
  v_lat2 double precision;
  v_lng2 double precision;
  v_t1 double precision;
  v_t2 double precision;
  v_dt double precision;
  v_d double precision;
  v_speed_kmh double precision;
  v_gps_km double precision := 0;
  v_R constant double precision := 6371;
  v_dLat double precision;
  v_dLng double precision;
  v_a double precision;
  v_tol double precision;
  v_cap double precision;
  v_claimed double precision;
BEGIN
  BEGIN v_role := auth.role(); EXCEPTION WHEN OTHERS THEN v_role := NULL; END;
  IF v_role IS NULL OR v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_arr := NEW.route_json;

  -- 1) Reject sessions without a valid GPS track (≥2 points, numeric lat/lng).
  IF v_arr IS NULL OR jsonb_typeof(v_arr) <> 'array' THEN
    RAISE EXCEPTION 'Activity session requires a recorded GPS route'
      USING ERRCODE = '22023';
  END IF;
  v_len := jsonb_array_length(v_arr);
  IF v_len < 2 THEN
    RAISE EXCEPTION 'Activity session requires a recorded GPS route'
      USING ERRCODE = '22023';
  END IF;

  -- 4) Hard DoS cap on route size.
  IF v_len > 50000 THEN
    RAISE EXCEPTION 'GPS route too large (max 50000 points)'
      USING ERRCODE = '22023';
  END IF;

  -- 2) Recompute distance from route_json using the same haversine + noise filter
  --    as ActivityActive.tsx:143 (≥3m step, ≤50 km/h, <0.2km jump).
  v_prev := NULL;
  FOR v_i IN 0..(v_len - 1) LOOP
    v_cur := v_arr -> v_i;
    BEGIN
      v_lat2 := (v_cur ->> 'lat')::double precision;
      v_lng2 := (v_cur ->> 'lng')::double precision;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'GPS route contains non-numeric coordinates'
        USING ERRCODE = '22023';
    END;
    IF v_lat2 IS NULL OR v_lng2 IS NULL THEN
      RAISE EXCEPTION 'GPS route contains non-numeric coordinates'
        USING ERRCODE = '22023';
    END IF;

    IF v_prev IS NOT NULL THEN
      v_lat1 := (v_prev ->> 'lat')::double precision;
      v_lng1 := (v_prev ->> 'lng')::double precision;
      v_t1   := COALESCE(NULLIF(v_prev ->> 't',''), '0')::double precision;
      v_t2   := COALESCE(NULLIF(v_cur  ->> 't',''), '0')::double precision;

      v_dLat := radians(v_lat2 - v_lat1);
      v_dLng := radians(v_lng2 - v_lng1);
      v_a := sin(v_dLat/2)^2
           + cos(radians(v_lat1)) * cos(radians(v_lat2)) * sin(v_dLng/2)^2;
      v_d := 2 * v_R * asin(sqrt(v_a));

      v_dt := GREATEST(0.001, (v_t2 - v_t1) / 1000.0);
      v_speed_kmh := (v_d / v_dt) * 3600.0;

      IF (v_d * 1000.0) >= 3 AND v_speed_kmh <= 50 AND v_d < 0.2 THEN
        v_gps_km := v_gps_km + v_d;
      END IF;
    END IF;
    v_prev := v_cur;
  END LOOP;

  v_claimed := COALESCE(NEW.distance_km, 0);

  -- 3) Tolerance: max(15%, 0.2km absolute). Silent overwrite outside tolerance.
  v_tol := GREATEST(v_gps_km * 0.15, 0.2);
  IF abs(v_claimed - v_gps_km) > v_tol THEN
    NEW.distance_km := round(v_gps_km::numeric, 3);
  END IF;

  -- 5) Absolute ceilings per activity type (defensive clamp, post-GPS check).
  IF NEW.activity_type = 'running' THEN
    v_cap := 300;
  ELSIF NEW.activity_type = 'cycling' THEN
    v_cap := 500;
  ELSE
    v_cap := 500;
  END IF;
  IF NEW.distance_km > v_cap THEN
    NEW.distance_km := v_cap;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_activity_session_distance_trigger ON public.activity_sessions;
CREATE TRIGGER guard_activity_session_distance_trigger
BEFORE INSERT OR UPDATE ON public.activity_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_activity_session_distance();
