
-- TABLE 1: daily_challenges
CREATE TABLE public.daily_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date date UNIQUE NOT NULL,
  exercise_name text NOT NULL,
  target_reps integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('mudah', 'sedang', 'sulit')),
  xp_reward integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_daily_challenges" ON public.daily_challenges
  FOR SELECT TO authenticated USING (true);

-- TABLE 2: user_challenge_progress
CREATE TABLE public.user_challenge_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_date date NOT NULL,
  accepted_at timestamptz DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  xp_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ucp_select_own" ON public.user_challenge_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ucp_insert_own" ON public.user_challenge_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ucp_update_own" ON public.user_challenge_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TABLE 3: user_medals
CREATE TABLE public.user_medals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medal_id text NOT NULL,
  medal_name text NOT NULL,
  medal_tier text NOT NULL CHECK (medal_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  medal_description text,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, medal_id)
);
ALTER TABLE public.user_medals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medals_select_own" ON public.user_medals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "medals_insert_own" ON public.user_medals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TABLE 4: user_xp
CREATE TABLE public.user_xp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_xp integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_select_own" ON public.user_xp
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_insert_own" ON public.user_xp
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "xp_update_own" ON public.user_xp
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TABLE 5: activity_sessions
CREATE TABLE public.activity_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('running', 'cycling')),
  date date NOT NULL,
  distance_km decimal(8,2) DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  avg_pace_seconds_per_km integer DEFAULT 0,
  calories integer DEFAULT 0,
  avg_speed_kmh decimal(5,2) DEFAULT 0,
  max_speed_kmh decimal(5,2) DEFAULT 0,
  elevation_gain_m decimal(6,1) DEFAULT 0,
  route_json jsonb DEFAULT NULL,
  splits_json jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select_own" ON public.activity_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_insert_own" ON public.activity_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_delete_own" ON public.activity_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- TABLE 6: user_featured_medal
CREATE TABLE public.user_featured_medal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  medal_id text DEFAULT NULL,
  medal_name text DEFAULT NULL,
  medal_tier text DEFAULT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_featured_medal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "featured_select_own" ON public.user_featured_medal
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "featured_insert_own" ON public.user_featured_medal
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "featured_update_own" ON public.user_featured_medal
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TABLE 7: activity_png_downloads
CREATE TABLE public.activity_png_downloads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL,
  download_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month_year)
);
ALTER TABLE public.activity_png_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "png_select_own" ON public.activity_png_downloads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "png_insert_own" ON public.activity_png_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "png_update_own" ON public.activity_png_downloads
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed daily_challenges for next 7 days starting 2026-05-04
INSERT INTO public.daily_challenges (challenge_date, exercise_name, target_reps, difficulty, xp_reward) VALUES
  ('2026-05-04', 'Push-up', 40, 'sedang', 50),
  ('2026-05-05', 'Squat', 50, 'mudah', 30),
  ('2026-05-06', 'Plank', 60, 'sedang', 50),
  ('2026-05-07', 'Burpee', 20, 'sulit', 80),
  ('2026-05-08', 'Jumping Jack', 100, 'mudah', 30),
  ('2026-05-09', 'Sit-up', 40, 'sedang', 50),
  ('2026-05-10', 'Lunge', 30, 'sedang', 50);
