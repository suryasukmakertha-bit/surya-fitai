CREATE TABLE IF NOT EXISTS exercise_gif_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_name_normalized TEXT NOT NULL UNIQUE,
  exercise_name_display TEXT,
  gif_url TEXT,
  thumbnail_url TEXT,
  target_muscle TEXT,
  equipment TEXT,
  source TEXT DEFAULT 'exercisedb',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_gif_cache_name 
  ON exercise_gif_cache(exercise_name_normalized);

ALTER TABLE exercise_gif_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_read_exercise_cache" ON exercise_gif_cache FOR SELECT USING (true);
CREATE POLICY "service_can_insert_exercise_cache" ON exercise_gif_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "service_can_update_exercise_cache" ON exercise_gif_cache FOR UPDATE USING (true);