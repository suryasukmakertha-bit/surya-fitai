DELETE FROM exercise_gif_cache WHERE exercise_name_normalized IN (
  'dead bug', 'bulgarian split squat', 'seated calf raise', 'bird dog',
  'box squat', 'incline push up', 'incline push-up', 'incline push ups',
  'glute bridge', 'glute bridges', 'doorway chest stretch', 'scapular squeeze',
  'doorway chest stretch scapular squeeze', 'chair squat', 'chair squats',
  'wall push up', 'wall push-up', 'wall push ups', 'standing side leg raise',
  'standing side leg raises', 't spine rotation', 't-spine rotation',
  'thoracic spine rotation', 'farmer march', 'farmers march',
  'dumbbell bicep curl', 'dumbbell bicep curls'
);