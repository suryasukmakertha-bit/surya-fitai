DELETE FROM exercise_gif_cache WHERE exercise_name_normalized IN (
  'overhead press (dumbbell)', 'dumbbell overhead press',
  'seated overhead press (dumbbell)', 'overhead press dumbbell',
  'overhead press (dumbbell) (duduk)',
  'barbell bench press', 'bench press barbell', 'flat barbell bench press',
  'lateral raise (dumbbell)', 'dumbbell lateral raise', 'lateral raise dumbbell'
);