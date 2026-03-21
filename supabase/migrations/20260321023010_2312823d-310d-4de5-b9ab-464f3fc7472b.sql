DELETE FROM exercise_gif_cache 
WHERE exercise_name_normalized IN (
  'wall sit',
  'bodyweight squat', 
  'body weight squat',
  'reverse lunge',
  'leg press'
);