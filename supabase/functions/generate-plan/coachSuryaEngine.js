// ================================================================
// SURYA-FITAI — COACH SURYA PROFESSIONAL ENGINE v3.0
// ================================================================
// Persona: Coach Surya — CPT, CNC, Sports Performance Specialist
// 10+ tahun experience | Indonesia + International client base
// Filosofi: "Tidak ada program yang one-size-fits-all."
// ================================================================
// ZERO AI for structure | MICRO AI for Coach Surya's voice
// Cost: ~Rp 30-50/generate | Speed: 2-5 detik | No timeout
// ================================================================

// ── SECTION 1: EXERCISE LIBRARY (Tagged & Professional) ──────
// Tags: muscle, equipment, avoid_injury, level, movement_pattern
const EXERCISES = [

  // ════════════════════════════════════════════════════════
  // CHEST
  // ════════════════════════════════════════════════════════
  { name:"Barbell Bench Press",            muscle:"chest",     equip:["barbell","gym"],            avoid:["shoulder_injury","wrist_injury"],              level:["intermediate","advanced"],  pattern:"horizontal_push" },
  { name:"Incline Barbell Press",           muscle:"chest",     equip:["barbell","gym"],            avoid:["shoulder_injury"],                             level:["intermediate","advanced"],  pattern:"incline_push" },
  { name:"Decline Barbell Press",           muscle:"chest",     equip:["barbell","gym"],            avoid:["shoulder_injury","lower_back_pain"],           level:["intermediate","advanced"],  pattern:"decline_push" },
  { name:"Dumbbell Bench Press",            muscle:"chest",     equip:["dumbbell","gym"],           avoid:["shoulder_injury","wrist_injury"],              level:["beginner","intermediate","advanced"], pattern:"horizontal_push" },
  { name:"Incline Dumbbell Press",          muscle:"chest",     equip:["dumbbell","gym"],           avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"incline_push" },
  { name:"Incline Dumbbell Fly",            muscle:"chest",     equip:["dumbbell","gym"],           avoid:["shoulder_injury"],                             level:["intermediate","advanced"],  pattern:"fly" },
  { name:"Dumbbell Fly",                    muscle:"chest",     equip:["dumbbell","gym"],           avoid:["shoulder_injury"],                             level:["intermediate","advanced"],  pattern:"fly" },
  { name:"Cable Crossover",                 muscle:"chest",     equip:["cable","gym"],              avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"fly" },
  { name:"Low Cable Fly",                   muscle:"chest",     equip:["cable","gym"],              avoid:["shoulder_injury"],                             level:["intermediate","advanced"],  pattern:"fly" },
  { name:"High Cable Fly",                  muscle:"chest",     equip:["cable","gym"],              avoid:["shoulder_injury"],                             level:["intermediate","advanced"],  pattern:"fly" },
  { name:"Chest Press Machine",             muscle:"chest",     equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"horizontal_push" },
  { name:"Pec Deck Machine",                muscle:"chest",     equip:["machine","gym"],            avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"fly" },
  { name:"Smith Machine Bench Press",       muscle:"chest",     equip:["machine","gym"],            avoid:["shoulder_injury"],                             level:["beginner","intermediate"],  pattern:"horizontal_push" },
  { name:"Push Up",                         muscle:"chest",     equip:["bodyweight"],               avoid:["wrist_injury"],                                level:["beginner","intermediate","advanced"], pattern:"horizontal_push" },
  { name:"Incline Push Up",                 muscle:"chest",     equip:["bodyweight"],               avoid:["wrist_injury"],                                level:["beginner"],                 pattern:"incline_push" },
  { name:"Decline Push Up",                 muscle:"chest",     equip:["bodyweight"],               avoid:["wrist_injury","shoulder_injury"],              level:["intermediate","advanced"],  pattern:"decline_push" },
  { name:"Wide Push Up",                    muscle:"chest",     equip:["bodyweight"],               avoid:["wrist_injury","shoulder_injury"],              level:["beginner","intermediate"],  pattern:"horizontal_push" },
  { name:"Diamond Push Up",                 muscle:"chest",     equip:["bodyweight"],               avoid:["wrist_injury","elbow_pain"],                   level:["intermediate","advanced"],  pattern:"tricep_push" },
  { name:"Resistance Band Chest Press",     muscle:"chest",     equip:["band","bodyweight"],        avoid:[],                                              level:["beginner","intermediate"],  pattern:"horizontal_push" },
  { name:"Dumbbell Pullover",               muscle:"chest",     equip:["dumbbell","gym"],           avoid:["shoulder_injury","lower_back_pain"],           level:["intermediate","advanced"],  pattern:"pullover" },

  // ════════════════════════════════════════════════════════
  // BACK
  // ════════════════════════════════════════════════════════
  { name:"Conventional Deadlift",           muscle:"back",      equip:["barbell","gym"],            avoid:["lower_back_pain","knee_injury"],               level:["intermediate","advanced"],  pattern:"hip_hinge" },
  { name:"Romanian Deadlift",               muscle:"back",      equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"hip_hinge" },
  { name:"Barbell Row",                     muscle:"back",      equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"horizontal_pull" },
  { name:"Pendlay Row",                     muscle:"back",      equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["advanced"],                 pattern:"horizontal_pull" },
  { name:"T-Bar Row",                       muscle:"back",      equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"horizontal_pull" },
  { name:"Dumbbell Row",                    muscle:"back",      equip:["dumbbell","gym"],           avoid:["lower_back_pain"],                             level:["beginner","intermediate","advanced"], pattern:"horizontal_pull" },
  { name:"Chest-Supported Dumbbell Row",    muscle:"back",      equip:["dumbbell","gym"],           avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"horizontal_pull" },
  { name:"Lat Pulldown",                    muscle:"back",      equip:["cable","gym"],              avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"vertical_pull" },
  { name:"Seated Cable Row",                muscle:"back",      equip:["cable","gym"],              avoid:["lower_back_pain"],                             level:["beginner","intermediate","advanced"], pattern:"horizontal_pull" },
  { name:"Straight Arm Pulldown",           muscle:"back",      equip:["cable","gym"],              avoid:["shoulder_injury"],                             level:["intermediate","advanced"],  pattern:"vertical_pull" },
  { name:"Face Pull",                       muscle:"back",      equip:["cable","gym"],              avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"horizontal_pull" },
  { name:"Cable Single Arm Row",            muscle:"back",      equip:["cable","gym"],              avoid:[],                                              level:["beginner","intermediate"],  pattern:"horizontal_pull" },
  { name:"Seated Row Machine",              muscle:"back",      equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"horizontal_pull" },
  { name:"Lat Pulldown Machine",            muscle:"back",      equip:["machine","gym"],            avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"vertical_pull" },
  { name:"Pull Up",                         muscle:"back",      equip:["bodyweight","gym"],         avoid:["shoulder_injury","elbow_pain"],                level:["intermediate","advanced"],  pattern:"vertical_pull" },
  { name:"Chin Up",                         muscle:"back",      equip:["bodyweight","gym"],         avoid:["shoulder_injury","elbow_pain"],                level:["intermediate","advanced"],  pattern:"vertical_pull" },
  { name:"Inverted Row",                    muscle:"back",      equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate"],  pattern:"horizontal_pull" },
  { name:"Resistance Band Pull Apart",      muscle:"back",      equip:["band","bodyweight"],        avoid:[],                                              level:["beginner"],                 pattern:"horizontal_pull" },
  { name:"Resistance Band Row",             muscle:"back",      equip:["band","bodyweight"],        avoid:[],                                              level:["beginner","intermediate"],  pattern:"horizontal_pull" },
  { name:"Bird Dog",                        muscle:"back",      equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate"],  pattern:"stability" },
  { name:"Superman Hold",                   muscle:"back",      equip:["bodyweight"],               avoid:["lower_back_pain"],                             level:["beginner"],                 pattern:"extension" },
  { name:"Good Morning",                    muscle:"back",      equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"hip_hinge" },
  { name:"Rack Pull",                       muscle:"back",      equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"hip_hinge" },

  // ════════════════════════════════════════════════════════
  // SHOULDER
  // ════════════════════════════════════════════════════════
  { name:"Barbell Overhead Press",          muscle:"shoulder",  equip:["barbell","gym"],            avoid:["shoulder_injury","lower_back_pain","wrist_injury"], level:["intermediate","advanced"], pattern:"vertical_push" },
  { name:"Seated Dumbbell Press",           muscle:"shoulder",  equip:["dumbbell","gym"],           avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"vertical_push" },
  { name:"Standing Dumbbell Press",         muscle:"shoulder",  equip:["dumbbell","gym"],           avoid:["shoulder_injury","lower_back_pain"],           level:["intermediate","advanced"],  pattern:"vertical_push" },
  { name:"Arnold Press",                    muscle:"shoulder",  equip:["dumbbell","gym"],           avoid:["shoulder_injury"],                             level:["intermediate","advanced"],  pattern:"vertical_push" },
  { name:"Lateral Raise (Dumbbell)",        muscle:"shoulder",  equip:["dumbbell","gym"],           avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"lateral" },
  { name:"Front Raise (Dumbbell)",          muscle:"shoulder",  equip:["dumbbell","gym"],           avoid:["shoulder_injury"],                             level:["beginner","intermediate"],  pattern:"frontal" },
  { name:"Rear Delt Fly (Dumbbell)",        muscle:"shoulder",  equip:["dumbbell","gym"],           avoid:["lower_back_pain"],                             level:["beginner","intermediate","advanced"], pattern:"rear_delt" },
  { name:"Cable Lateral Raise",             muscle:"shoulder",  equip:["cable","gym"],              avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"lateral" },
  { name:"Cable Rear Delt Fly",             muscle:"shoulder",  equip:["cable","gym"],              avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"rear_delt" },
  { name:"Cable Face Pull",                 muscle:"shoulder",  equip:["cable","gym"],              avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"rear_delt" },
  { name:"Shoulder Press Machine",          muscle:"shoulder",  equip:["machine","gym"],            avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"vertical_push" },
  { name:"Lateral Raise Machine",           muscle:"shoulder",  equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"lateral" },
  { name:"Rear Delt Machine",               muscle:"shoulder",  equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"rear_delt" },
  { name:"Pike Push Up",                    muscle:"shoulder",  equip:["bodyweight"],               avoid:["shoulder_injury","wrist_injury"],              level:["intermediate","advanced"],  pattern:"vertical_push" },
  { name:"Band Lateral Raise",              muscle:"shoulder",  equip:["band","bodyweight"],        avoid:[],                                              level:["beginner","intermediate"],  pattern:"lateral" },
  { name:"Band Overhead Press",             muscle:"shoulder",  equip:["band","bodyweight"],        avoid:["shoulder_injury"],                             level:["beginner","intermediate"],  pattern:"vertical_push" },
  { name:"Dumbbell Upright Row",            muscle:"shoulder",  equip:["dumbbell","gym"],           avoid:["shoulder_injury","wrist_injury"],              level:["intermediate","advanced"],  pattern:"vertical_pull" },

  // ════════════════════════════════════════════════════════
  // BICEP
  // ════════════════════════════════════════════════════════
  { name:"Barbell Curl",                    muscle:"bicep",     equip:["barbell","gym"],            avoid:["elbow_pain","wrist_injury"],                   level:["beginner","intermediate","advanced"], pattern:"curl" },
  { name:"EZ Bar Curl",                     muscle:"bicep",     equip:["barbell","gym"],            avoid:["elbow_pain"],                                  level:["beginner","intermediate","advanced"], pattern:"curl" },
  { name:"Preacher Curl (Barbell)",         muscle:"bicep",     equip:["barbell","gym"],            avoid:["elbow_pain"],                                  level:["intermediate","advanced"],  pattern:"curl" },
  { name:"Dumbbell Curl",                   muscle:"bicep",     equip:["dumbbell","gym"],           avoid:["elbow_pain","wrist_injury"],                   level:["beginner","intermediate","advanced"], pattern:"curl" },
  { name:"Hammer Curl",                     muscle:"bicep",     equip:["dumbbell","gym"],           avoid:["elbow_pain"],                                  level:["beginner","intermediate","advanced"], pattern:"curl" },
  { name:"Incline Dumbbell Curl",           muscle:"bicep",     equip:["dumbbell","gym"],           avoid:["shoulder_injury","elbow_pain"],                level:["intermediate","advanced"],  pattern:"curl" },
  { name:"Concentration Curl",              muscle:"bicep",     equip:["dumbbell","gym"],           avoid:["elbow_pain"],                                  level:["beginner","intermediate","advanced"], pattern:"curl" },
  { name:"Zottman Curl",                    muscle:"bicep",     equip:["dumbbell","gym"],           avoid:["wrist_injury","elbow_pain"],                   level:["intermediate","advanced"],  pattern:"curl" },
  { name:"Cable Curl",                      muscle:"bicep",     equip:["cable","gym"],              avoid:["elbow_pain"],                                  level:["beginner","intermediate","advanced"], pattern:"curl" },
  { name:"Rope Hammer Curl",                muscle:"bicep",     equip:["cable","gym"],              avoid:["elbow_pain"],                                  level:["intermediate","advanced"],  pattern:"curl" },
  { name:"Preacher Machine Curl",           muscle:"bicep",     equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"curl" },
  { name:"Chin Up",                         muscle:"bicep",     equip:["bodyweight","gym"],         avoid:["shoulder_injury","elbow_pain"],                level:["intermediate","advanced"],  pattern:"vertical_pull" },
  { name:"Resistance Band Curl",            muscle:"bicep",     equip:["band","bodyweight"],        avoid:["elbow_pain"],                                  level:["beginner","intermediate"],  pattern:"curl" },

  // ════════════════════════════════════════════════════════
  // TRICEP
  // ════════════════════════════════════════════════════════
  { name:"Close Grip Bench Press",          muscle:"tricep",    equip:["barbell","gym"],            avoid:["wrist_injury","elbow_pain","shoulder_injury"], level:["intermediate","advanced"],  pattern:"horizontal_push" },
  { name:"Skull Crusher (EZ Bar)",          muscle:"tricep",    equip:["barbell","gym"],            avoid:["elbow_pain"],                                  level:["intermediate","advanced"],  pattern:"extension" },
  { name:"Tricep Pushdown (Cable)",         muscle:"tricep",    equip:["cable","gym"],              avoid:["elbow_pain"],                                  level:["beginner","intermediate","advanced"], pattern:"pushdown" },
  { name:"Overhead Cable Tricep Extension", muscle:"tricep",    equip:["cable","gym"],              avoid:["shoulder_injury","elbow_pain"],                level:["intermediate","advanced"],  pattern:"extension" },
  { name:"Rope Pushdown",                   muscle:"tricep",    equip:["cable","gym"],              avoid:["elbow_pain"],                                  level:["beginner","intermediate","advanced"], pattern:"pushdown" },
  { name:"Overhead Dumbbell Extension",     muscle:"tricep",    equip:["dumbbell","gym"],           avoid:["shoulder_injury","elbow_pain"],                level:["beginner","intermediate","advanced"], pattern:"extension" },
  { name:"Dumbbell Skull Crusher",          muscle:"tricep",    equip:["dumbbell","gym"],           avoid:["elbow_pain"],                                  level:["intermediate","advanced"],  pattern:"extension" },
  { name:"Tricep Kickback (Dumbbell)",      muscle:"tricep",    equip:["dumbbell","gym"],           avoid:["elbow_pain","lower_back_pain"],                level:["beginner","intermediate"],  pattern:"extension" },
  { name:"Tricep Machine Press",            muscle:"tricep",    equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"pushdown" },
  { name:"Tricep Dip",                      muscle:"tricep",    equip:["bodyweight","gym"],         avoid:["shoulder_injury","elbow_pain","wrist_injury"], level:["intermediate","advanced"],  pattern:"dip" },
  { name:"Bench Dip",                       muscle:"tricep",    equip:["bodyweight"],               avoid:["shoulder_injury","wrist_injury"],              level:["beginner","intermediate"],  pattern:"dip" },
  { name:"Close Grip Push Up",              muscle:"tricep",    equip:["bodyweight"],               avoid:["wrist_injury","elbow_pain"],                   level:["beginner","intermediate"],  pattern:"horizontal_push" },
  { name:"Band Tricep Pushdown",            muscle:"tricep",    equip:["band","bodyweight"],        avoid:["elbow_pain"],                                  level:["beginner","intermediate"],  pattern:"pushdown" },

  // ════════════════════════════════════════════════════════
  // QUADRICEPS
  // ════════════════════════════════════════════════════════
  { name:"Barbell Back Squat",              muscle:"quad",      equip:["barbell","gym"],            avoid:["knee_injury","lower_back_pain"],               level:["intermediate","advanced"],  pattern:"squat" },
  { name:"Barbell Front Squat",             muscle:"quad",      equip:["barbell","gym"],            avoid:["knee_injury","wrist_injury","lower_back_pain"],level:["advanced"],                 pattern:"squat" },
  { name:"Bulgarian Split Squat",           muscle:"quad",      equip:["barbell","dumbbell","gym"], avoid:["knee_injury"],                                 level:["intermediate","advanced"],  pattern:"lunge" },
  { name:"Hack Squat Machine",              muscle:"quad",      equip:["machine","gym"],            avoid:["knee_injury","lower_back_pain"],               level:["intermediate","advanced"],  pattern:"squat" },
  { name:"Leg Press",                       muscle:"quad",      equip:["machine","gym"],            avoid:["knee_injury","lower_back_pain"],               level:["beginner","intermediate","advanced"], pattern:"squat" },
  { name:"Leg Extension Machine",           muscle:"quad",      equip:["machine","gym"],            avoid:["knee_injury"],                                 level:["beginner","intermediate","advanced"], pattern:"isolation" },
  { name:"Smith Machine Squat",             muscle:"quad",      equip:["machine","gym"],            avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"squat" },
  { name:"Goblet Squat",                    muscle:"quad",      equip:["dumbbell","gym"],           avoid:["knee_injury"],                                 level:["beginner","intermediate","advanced"], pattern:"squat" },
  { name:"Dumbbell Lunge",                  muscle:"quad",      equip:["dumbbell","gym"],           avoid:["knee_injury"],                                 level:["beginner","intermediate","advanced"], pattern:"lunge" },
  { name:"Dumbbell Step Up",                muscle:"quad",      equip:["dumbbell","gym"],           avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"lunge" },
  { name:"Dumbbell Sumo Squat",             muscle:"quad",      equip:["dumbbell","gym"],           avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"squat" },
  { name:"Bodyweight Squat",                muscle:"quad",      equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"squat" },
  { name:"Reverse Lunge",                   muscle:"quad",      equip:["bodyweight"],               avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"lunge" },
  { name:"Walking Lunge",                   muscle:"quad",      equip:["bodyweight"],               avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"lunge" },
  { name:"Wall Sit",                        muscle:"quad",      equip:["bodyweight"],               avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"isometric" },
  { name:"Step Up",                         muscle:"quad",      equip:["bodyweight"],               avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"lunge" },
  { name:"Jump Squat",                      muscle:"quad",      equip:["bodyweight"],               avoid:["knee_injury","ankle_injury"],                  level:["intermediate","advanced"],  pattern:"plyometric" },
  { name:"Box Jump",                        muscle:"quad",      equip:["bodyweight"],               avoid:["knee_injury","ankle_injury"],                  level:["intermediate","advanced"],  pattern:"plyometric" },
  { name:"Resistance Band Squat",           muscle:"quad",      equip:["band","bodyweight"],        avoid:["knee_injury"],                                 level:["beginner","intermediate"],  pattern:"squat" },

  // ════════════════════════════════════════════════════════
  // HAMSTRING & GLUTE
  // ════════════════════════════════════════════════════════
  { name:"Romanian Deadlift (Barbell)",     muscle:"hamstring", equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"hip_hinge" },
  { name:"Romanian Deadlift (Dumbbell)",    muscle:"hamstring", equip:["dumbbell","gym"],           avoid:["lower_back_pain"],                             level:["beginner","intermediate","advanced"], pattern:"hip_hinge" },
  { name:"Stiff Leg Deadlift",              muscle:"hamstring", equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"hip_hinge" },
  { name:"Barbell Hip Thrust",              muscle:"hamstring", equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"hip_extension" },
  { name:"Dumbbell Hip Thrust",             muscle:"hamstring", equip:["dumbbell","gym"],           avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"hip_extension" },
  { name:"Single Leg RDL (Dumbbell)",       muscle:"hamstring", equip:["dumbbell","gym"],           avoid:["lower_back_pain","ankle_injury"],              level:["intermediate","advanced"],  pattern:"hip_hinge" },
  { name:"Leg Curl Machine",                muscle:"hamstring", equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"isolation" },
  { name:"Seated Leg Curl Machine",         muscle:"hamstring", equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"isolation" },
  { name:"Hip Thrust Machine",              muscle:"hamstring", equip:["machine","gym"],            avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"hip_extension" },
  { name:"Glute Bridge",                    muscle:"hamstring", equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"hip_extension" },
  { name:"Single Leg Glute Bridge",         muscle:"hamstring", equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"hip_extension" },
  { name:"Nordic Curl",                     muscle:"hamstring", equip:["bodyweight","gym"],         avoid:["knee_injury"],                                 level:["intermediate","advanced"],  pattern:"isolation" },
  { name:"Donkey Kick",                     muscle:"hamstring", equip:["bodyweight"],               avoid:["lower_back_pain","wrist_injury"],              level:["beginner","intermediate"],  pattern:"hip_extension" },
  { name:"Good Morning (Bodyweight)",       muscle:"hamstring", equip:["bodyweight"],               avoid:["lower_back_pain"],                             level:["beginner","intermediate"],  pattern:"hip_hinge" },
  { name:"Resistance Band Hip Thrust",      muscle:"hamstring", equip:["band","bodyweight"],        avoid:[],                                              level:["beginner","intermediate"],  pattern:"hip_extension" },

  // ════════════════════════════════════════════════════════
  // CALF
  // ════════════════════════════════════════════════════════
  { name:"Standing Calf Raise (Machine)",   muscle:"calf",      equip:["machine","gym"],            avoid:["ankle_injury"],                                level:["beginner","intermediate","advanced"], pattern:"raise" },
  { name:"Seated Calf Raise (Machine)",     muscle:"calf",      equip:["machine","gym"],            avoid:["ankle_injury","knee_injury"],                  level:["beginner","intermediate","advanced"], pattern:"raise" },
  { name:"Standing Calf Raise (Dumbbell)",  muscle:"calf",      equip:["dumbbell","gym"],           avoid:["ankle_injury"],                                level:["beginner","intermediate","advanced"], pattern:"raise" },
  { name:"Single Leg Calf Raise",           muscle:"calf",      equip:["bodyweight"],               avoid:["ankle_injury"],                                level:["intermediate","advanced"],  pattern:"raise" },
  { name:"Standing Calf Raise (BW)",        muscle:"calf",      equip:["bodyweight"],               avoid:["ankle_injury"],                                level:["beginner","intermediate","advanced"], pattern:"raise" },
  { name:"Leg Press Calf Raise",            muscle:"calf",      equip:["machine","gym"],            avoid:["knee_injury"],                                 level:["beginner","intermediate","advanced"], pattern:"raise" },

  // ════════════════════════════════════════════════════════
  // CORE
  // ════════════════════════════════════════════════════════
  { name:"Forearm Plank",                   muscle:"core",      equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"isometric" },
  { name:"Side Plank",                      muscle:"core",      equip:["bodyweight"],               avoid:["shoulder_injury"],                             level:["beginner","intermediate","advanced"], pattern:"isometric" },
  { name:"Dead Bug",                        muscle:"core",      equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"anti_extension" },
  { name:"Hollow Body Hold",                muscle:"core",      equip:["bodyweight"],               avoid:["lower_back_pain"],                             level:["beginner","intermediate","advanced"], pattern:"isometric" },
  { name:"Leg Raise",                       muscle:"core",      equip:["bodyweight","gym"],         avoid:["lower_back_pain"],                             level:["beginner","intermediate","advanced"], pattern:"flexion" },
  { name:"Hanging Leg Raise",               muscle:"core",      equip:["gym","bodyweight"],         avoid:["shoulder_injury","lower_back_pain"],           level:["intermediate","advanced"],  pattern:"flexion" },
  { name:"Bicycle Crunch",                  muscle:"core",      equip:["bodyweight"],               avoid:["neck_pain","lower_back_pain"],                 level:["beginner","intermediate","advanced"], pattern:"rotation" },
  { name:"Russian Twist",                   muscle:"core",      equip:["bodyweight","dumbbell"],    avoid:["lower_back_pain"],                             level:["beginner","intermediate","advanced"], pattern:"rotation" },
  { name:"Mountain Climber",                muscle:"core",      equip:["bodyweight"],               avoid:["wrist_injury","shoulder_injury"],              level:["beginner","intermediate","advanced"], pattern:"dynamic" },
  { name:"Cable Crunch",                    muscle:"core",      equip:["cable","gym"],              avoid:["neck_pain"],                                   level:["beginner","intermediate","advanced"], pattern:"flexion" },
  { name:"Pallof Press",                    muscle:"core",      equip:["cable","gym"],              avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"anti_rotation" },
  { name:"Ab Wheel Rollout",                muscle:"core",      equip:["gym"],                      avoid:["lower_back_pain","shoulder_injury"],           level:["intermediate","advanced"],  pattern:"anti_extension" },
  { name:"Weighted Crunch",                 muscle:"core",      equip:["dumbbell","gym"],           avoid:["neck_pain","lower_back_pain"],                 level:["intermediate","advanced"],  pattern:"flexion" },
  { name:"Landmine Rotation",               muscle:"core",      equip:["barbell","gym"],            avoid:["lower_back_pain"],                             level:["intermediate","advanced"],  pattern:"rotation" },
  { name:"Bird Dog",                        muscle:"core",      equip:["bodyweight"],               avoid:[],                                              level:["beginner","intermediate","advanced"], pattern:"stability" },
  { name:"McGill Curl Up",                  muscle:"core",      equip:["bodyweight"],               avoid:[],                                              level:["beginner"],                 pattern:"flexion" },
];

// ── SECTION 2: EQUIPMENT MAPPER ──────────────────────────────
function mapEquipment(userEquipment) {
  const raw = Array.isArray(userEquipment)
    ? userEquipment.map(e => e.toLowerCase().trim())
    : [(userEquipment || "bodyweight").toLowerCase().trim()];

  const mapping = {
    "gym":                  ["barbell","dumbbell","cable","machine","gym","bodyweight"],
    "full gym":             ["barbell","dumbbell","cable","machine","gym","bodyweight"],
    "gym lengkap":          ["barbell","dumbbell","cable","machine","gym","bodyweight"],
    "barbell":              ["barbell","gym","bodyweight"],
    "barbell saja":         ["barbell","bodyweight"],
    "dumbbell":             ["dumbbell","bodyweight"],
    "dumbbell saja":        ["dumbbell","bodyweight"],
    "dumbbell only":        ["dumbbell","bodyweight"],
    "cable":                ["cable","gym"],
    "machine":              ["machine","gym"],
    "bodyweight":           ["bodyweight"],
    "bodyweight saja":      ["bodyweight"],
    "bodyweight only":      ["bodyweight"],
    "berat badan saja":     ["bodyweight"],
    "tidak ada":            ["bodyweight"],
    "home":                 ["dumbbell","bodyweight"],
    "home gym":             ["dumbbell","bodyweight"],
    "gym rumah":            ["dumbbell","bodyweight"],
    "gym rumah+barbell":    ["barbell","dumbbell","bodyweight"],
    "resistance band":      ["band","bodyweight"],
    "band":                 ["band","bodyweight"],
    "band saja":            ["band","bodyweight"],
    "kettlebell":           ["dumbbell","bodyweight"],
  };

  let result = ["bodyweight"];
  raw.forEach(eq => {
    const mapped = mapping[eq];
    if (mapped) {
      mapped.forEach(k => { if (!result.includes(k)) result.push(k); });
    } else if (!result.includes(eq)) {
      result.push(eq);
    }
  });
  return result;
}

// ── SECTION 3: INJURY-AWARE EXERCISE PICKER ──────────────────
function pickExercises(muscle, userProfile, count) {
  const { injuries = [], level = "beginner", age = 25 } = userProfile;
  const equipKeys  = mapEquipment(userProfile.equipment);
  const isSenior   = age >= 55 || userProfile.goal === "senior";
  const effectiveLevel = isSenior ? "beginner" : level;

  let pool = EXERCISES.filter(ex => {
    if (ex.muscle !== muscle) return false;
    if (!ex.equip.some(e => equipKeys.includes(e))) return false;
    if (injuries.some(inj => ex.avoid.includes(inj))) return false;
    if (!ex.level.includes(effectiveLevel)) return false;
    return true;
  });

  // Relax level filter if pool too small
  if (pool.length < count) {
    pool = EXERCISES.filter(ex => {
      if (ex.muscle !== muscle) return false;
      if (!ex.equip.some(e => equipKeys.includes(e))) return false;
      if (injuries.some(inj => ex.avoid.includes(inj))) return false;
      return true;
    });
  }

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count).map(e => e.name);
}

// ── SECTION 4: SETS / REPS / REST / TEMPO SCHEMES ────────────
// Evidence-based periodization for each goal × level × week
function getSetsReps(goal, level, week, age = 25) {
  const isSenior = age >= 55 || goal === "senior";
  const w = Math.min((week || 1) - 1, 3); // 0-based index, max 3

  if (isSenior) {
    const s = [
      { sets:2, reps:"12-15", rest:90,  tempo:"3-0-3", intensity:"Ringan — bisa ngobrol",      note_id:"Minggu adaptasi. Utamakan form sempurna, tidak sampai gagal.", note_en:"Adaptation week. Prioritize perfect form, never to failure.", note_zh:"适应周。优先完美姿势，不要力竭。" },
      { sets:2, reps:"12-15", rest:90,  tempo:"3-0-3", intensity:"Ringan–Sedang",               note_id:"Pertahankan teknik. Naikkan beban hanya jika minggu lalu sangat mudah.", note_en:"Maintain technique. Increase weight only if last week was very easy.", note_zh:"保持技术。只有上周很轻松才增加重量。" },
      { sets:3, reps:"12-15", rest:90,  tempo:"3-0-3", intensity:"Sedang — sedikit terasa",    note_id:"Tambah 1 set dari sebelumnya. Dengarkan tubuh — berhenti jika ada nyeri sendi.", note_en:"Add 1 set. Listen to your body — stop if you feel joint pain.", note_zh:"增加1组。倾听身体——如感到关节疼痛请停止。" },
      { sets:2, reps:"12-15", rest:120, tempo:"3-0-3", intensity:"Ringan — aktif recovery",    note_id:"Deload minggu ini. Fokus pada mobilitas dan koneksi otot, bukan beban.", note_en:"Deload this week. Focus on mobility and muscle connection, not load.", note_zh:"本周减量。专注于活动度和肌肉连接，而非重量。" },
    ];
    return s[w];
  }

  const schemes = {
    bulking: {
      beginner: [
        { sets:3, reps:"8-10",  rest:90,  tempo:"2-1-2", intensity:"60-65% 1RM",  note_id:"Minggu fondasi. Teknik adalah prioritas — pilih beban yang bisa dikontrol di semua rep dengan form sempurna.", note_en:"Foundation week. Technique is priority — choose a weight you can fully control with perfect form on every rep.", note_zh:"基础周。技术是优先——选择每次都能以完美动作完全控制的重量。" },
        { sets:3, reps:"9-11",  rest:90,  tempo:"2-1-2", intensity:"65-70% 1RM",  note_id:"Naikkan beban 2.5-5kg jika minggu lalu seluruh set terasa mudah. Jaga form tetap ketat.", note_en:"Increase weight by 2.5-5kg if last week felt easy throughout. Keep form strict.", note_zh:"如果上周全程感觉轻松，增加2.5-5kg。保持动作严格。" },
        { sets:4, reps:"8-10",  rest:90,  tempo:"2-0-1", intensity:"70-75% 1RM",  note_id:"Tambah 1 set per exercise. Ini adalah minggu terberat — push lebih keras dari sebelumnya.", note_en:"Add 1 set per exercise. This is the hardest week — push harder than before.", note_zh:"每个动作增加1组。这是最难的一周——比之前更努力。" },
        { sets:3, reps:"10-12", rest:75,  tempo:"2-0-2", intensity:"55-60% 1RM",  note_id:"Deload: kurangi beban 25-30%. Fokus koneksi otot dan recovery. Kualitas lebih penting dari kuantitas.", note_en:"Deload: reduce weight 25-30%. Focus on muscle connection and recovery. Quality over quantity.", note_zh:"减量周：减少25-30%重量。专注于肌肉连接和恢复。质量胜于数量。" },
      ],
      intermediate: [
        { sets:4, reps:"8-10",  rest:90,  tempo:"2-1-1", intensity:"70-75% 1RM",  note_id:"Minggu fondasi. Evaluasi weak point — berikan perhatian ekstra pada sisi yang lebih lemah.", note_en:"Foundation week. Evaluate weak points — give extra attention to your weaker side.", note_zh:"基础周。评估弱点——对较弱的一侧给予额外关注。" },
        { sets:4, reps:"8-10",  rest:90,  tempo:"2-1-1", intensity:"72-78% 1RM",  note_id:"Naikkan beban 2.5-5kg dari minggu lalu. Pertimbangkan teknik tempo — tahan 1 detik di puncak kontraksi.", note_en:"Increase weight by 2.5-5kg. Consider tempo technique — hold 1 second at peak contraction.", note_zh:"增加2.5-5kg。考虑节奏技术——在收缩顶点保持1秒。" },
        { sets:4, reps:"6-8",   rest:120, tempo:"3-1-1", intensity:"78-85% 1RM",  note_id:"Minggu intensitas puncak. Fokus pada progressive overload — ini di mana hipertrofi terjadi.", note_en:"Peak intensity week. Focus on progressive overload — this is where hypertrophy happens.", note_zh:"最高强度周。专注于渐进超负荷——这就是肌肉增长发生的地方。" },
        { sets:3, reps:"10-12", rest:75,  tempo:"2-0-2", intensity:"60-65% 1RM",  note_id:"Deload: kurangi beban 25-30%, volume juga turun. Ini bukan kelemahan — ini bagian dari program yang cerdas.", note_en:"Deload: reduce weight and volume 25-30%. This isn't weakness — this is smart programming.", note_zh:"减量：减少25-30%的重量和训练量。这不是软弱——这是聪明的编程。" },
      ],
      advanced: [
        { sets:4, reps:"6-8",   rest:120, tempo:"3-1-1", intensity:"78-82% 1RM",  note_id:"Minggu akumulasi. Volume tinggi, intensitas sedang. Bangun momentum untuk minggu puncak.", note_en:"Accumulation week. High volume, moderate intensity. Build momentum for peak week.", note_zh:"积累周。高训练量，中等强度。为高峰周建立动力。" },
        { sets:5, reps:"5-7",   rest:150, tempo:"3-1-1", intensity:"82-88% 1RM",  note_id:"Naikkan intensitas secara signifikan. Setiap set harus terasa menantang — bukan tidak mungkin.", note_en:"Increase intensity significantly. Every set should feel challenging — not impossible.", note_zh:"显著增加强度。每组都应该感到有挑战——但不是不可能。" },
        { sets:5, reps:"4-6",   rest:180, tempo:"3-1-X", intensity:"85-92% 1RM",  note_id:"Minggu puncak. Push sampai batas aman — 1-2 rep tersisa di tank, bukan sampai gagal total.", note_en:"Peak week. Push to safe limits — 1-2 reps left in the tank, not complete failure.", note_zh:"高峰周。推到安全极限——还剩1-2次，不要完全力竭。" },
        { sets:3, reps:"8-10",  rest:90,  tempo:"2-1-2", intensity:"55-60% 1RM",  note_id:"Deload wajib. Otot tumbuh saat recovery, bukan saat latihan. Hormati proses ini.", note_en:"Mandatory deload. Muscles grow during recovery, not during training. Respect this process.", note_zh:"强制减量。肌肉在恢复时生长，而非训练时。尊重这个过程。" },
      ],
    },
    cutting: {
      beginner: [
        { sets:3, reps:"12-15", rest:60,  tempo:"2-0-1", intensity:"55-60% 1RM",  note_id:"Minggu adaptasi cutting. Jaga beban sama dengan program sebelumnya — tujuan adalah mempertahankan otot, bukan hanya membakar kalori.", note_en:"Cutting adaptation week. Keep weights the same as before — goal is to preserve muscle, not just burn calories.", note_zh:"减脂适应周。保持与之前相同的重量——目标是保持肌肉，不仅仅是燃烧卡路里。" },
        { sets:3, reps:"12-15", rest:60,  tempo:"2-0-1", intensity:"57-62% 1RM",  note_id:"Perpendek rest 5-10 detik dari minggu lalu. Ini meningkatkan kalori yang terbakar tanpa menambah waktu latihan.", note_en:"Shorten rest by 5-10 seconds from last week. This burns more calories without adding training time.", note_zh:"比上周缩短5-10秒休息时间。这样可以在不增加训练时间的情况下燃烧更多卡路里。" },
        { sets:4, reps:"12-15", rest:60,  tempo:"2-0-1", intensity:"60-65% 1RM",  note_id:"Tambah 1 set per exercise. Minggu volume tinggi — density training untuk metabolic effect maksimal.", note_en:"Add 1 set per exercise. High volume week — density training for maximum metabolic effect.", note_zh:"每个动作增加1组。高训练量周——密度训练以获得最大代谢效果。" },
        { sets:3, reps:"12-15", rest:60,  tempo:"2-0-1", intensity:"50-55% 1RM",  note_id:"Kurangi volume 20%. Prioritas: pertahankan kekuatan yang sudah dibangun. Kalori rendah + volume tinggi = risiko overtraining.", note_en:"Reduce volume 20%. Priority: maintain the strength you've built. Low calories + high volume = overtraining risk.", note_zh:"减少20%训练量。优先：保持已建立的力量。低卡路里+高训练量=过度训练风险。" },
      ],
      intermediate: [
        { sets:4, reps:"10-12", rest:60,  tempo:"2-0-1", intensity:"65-70% 1RM",  note_id:"Pertahankan beban dari program sebelumnya. Fokus pada rest yang ketat — ini kunci metabolic stress dalam cutting.", note_en:"Maintain weights from previous program. Focus on strict rest periods — this is key to metabolic stress in cutting.", note_zh:"保持之前计划的重量。专注于严格的休息时间——这是减脂中代谢压力的关键。" },
        { sets:4, reps:"11-13", rest:55,  tempo:"2-0-1", intensity:"67-72% 1RM",  note_id:"Tambah 1 rep per set. Perpendek rest 5 detik. Kalau drop set tersedia, tambahkan 1 drop set di exercise utama.", note_en:"Add 1 rep per set. Shorten rest by 5 seconds. If drop sets are available, add 1 drop set on main exercises.", note_zh:"每组增加1次。缩短5秒休息时间。如果可以做递减组，在主要动作上增加1组递减组。" },
        { sets:4, reps:"12-15", rest:50,  tempo:"2-0-1", intensity:"65-70% 1RM",  note_id:"Minggu intensitas cutting tertinggi. Rest sangat pendek. Jaga form — jangan korbankan teknik demi kecepatan.", note_en:"Highest cutting intensity week. Very short rest. Maintain form — don't sacrifice technique for speed.", note_zh:"最高强度减脂周。休息非常短。保持动作——不要为了速度牺牲技术。" },
        { sets:3, reps:"10-12", rest:60,  tempo:"2-0-2", intensity:"60-65% 1RM",  note_id:"Deload cutting. Istirahatkan sendi dan CNS. Ini mencegah stagnasi dan mempersiapkan bulan berikutnya.", note_en:"Cutting deload. Rest joints and CNS. This prevents stagnation and prepares for next month.", note_zh:"减脂减量。休息关节和中枢神经系统。这可以防止停滞并为下个月做准备。" },
      ],
      advanced: [
        { sets:4, reps:"10-12", rest:55,  tempo:"2-0-1", intensity:"70-75% 1RM",  note_id:"Minggu akumulasi cutting. Volume tinggi, rest pendek. Gunakan teknik superset untuk efisiensi waktu dan metabolic effect.", note_en:"Cutting accumulation week. High volume, short rest. Use superset techniques for time efficiency and metabolic effect.", note_zh:"减脂积累周。高训练量，短休息。使用超级组技术提高时间效率和代谢效果。" },
        { sets:5, reps:"10-12", rest:50,  tempo:"2-0-1", intensity:"72-77% 1RM",  note_id:"Naikkan total volume 1 set per exercise. Drop set opsional di exercise terakhir tiap muscle group.", note_en:"Increase total volume by 1 set per exercise. Optional drop set on last exercise per muscle group.", note_zh:"每个动作增加1组总训练量。每个肌肉群最后一个动作可选递减组。" },
        { sets:5, reps:"8-10",  rest:50,  tempo:"2-0-1", intensity:"75-80% 1RM",  note_id:"Minggu puncak cutting. Pertahankan beban sambil rest sangat pendek. Ini adalah metabolic stress tertinggi.", note_en:"Cutting peak week. Maintain weights with very short rest. This is maximum metabolic stress.", note_zh:"减脂高峰周。在非常短的休息时间内保持重量。这是最大的代谢压力。" },
        { sets:3, reps:"10-12", rest:60,  tempo:"2-0-2", intensity:"60-65% 1RM",  note_id:"Deload wajib. Supercompensation terjadi saat recovery — bulan depan akan lebih kuat dari ini.", note_en:"Mandatory deload. Supercompensation happens during recovery — next month will be stronger than this.", note_zh:"强制减量。超级补偿在恢复期间发生——下个月会比这个月更强。" },
      ],
    },
    beginner: {
      beginner: [
        { sets:2, reps:"10-12", rest:90,  tempo:"2-0-2", intensity:"50-55% 1RM",  note_id:"Minggu 1: pelajari pola gerakan. Gunakan beban sangat ringan. Tidak ada yang menilai kamu — semua orang pernah jadi pemula.", note_en:"Week 1: learn movement patterns. Use very light weights. Nobody is judging you — everyone was a beginner once.", note_zh:"第1周：学习动作模式。使用非常轻的重量。没有人在评判你——每个人都曾经是初学者。" },
        { sets:3, reps:"10-12", rest:90,  tempo:"2-0-2", intensity:"55-60% 1RM",  note_id:"Tambah 1 set dari minggu lalu. Naikkan beban 2.5kg jika minggu lalu terasa mudah. Konsistensi lebih penting dari intensitas.", note_en:"Add 1 set from last week. Increase weight by 2.5kg if last week felt easy. Consistency beats intensity.", note_zh:"比上周增加1组。如果上周感觉轻松，增加2.5kg。坚持胜过强度。" },
        { sets:3, reps:"10-12", rest:75,  tempo:"2-0-2", intensity:"60-65% 1RM",  note_id:"Tambah 1 rep per set dari minggu lalu. Fokus pada mind-muscle connection — rasakan otot yang bekerja.", note_en:"Add 1 rep per set from last week. Focus on mind-muscle connection — feel the muscle working.", note_zh:"比上周每组多1次。专注于意识-肌肉连接——感受肌肉在工作。" },
        { sets:3, reps:"12-15", rest:75,  tempo:"2-0-2", intensity:"55-60% 1RM",  note_id:"Kurangi beban 10%. Review teknik di cermin atau rekam dirimu sendiri. Form sempurna adalah fondasi segalanya.", note_en:"Reduce weight 10%. Review technique in mirror or record yourself. Perfect form is the foundation of everything.", note_zh:"减少10%重量。在镜子前复习技术或录制自己。完美的动作是一切的基础。" },
      ],
      intermediate: [
        { sets:3, reps:"10-12", rest:75,  tempo:"2-0-2", intensity:"60-65% 1RM",  note_id:"Minggu fondasi. Tetap disiplin dengan teknik — lebih mudah memperbaiki form sekarang daripada setelah injury.", note_en:"Foundation week. Stay disciplined with technique — easier to fix form now than after an injury.", note_zh:"基础周。保持技术纪律——现在改正动作比受伤后容易。" },
        { sets:3, reps:"10-12", rest:75,  tempo:"2-0-2", intensity:"62-67% 1RM",  note_id:"Naikkan beban 2.5-5kg. Evaluasi form setiap gerakan — video dirimu sendiri jika memungkinkan.", note_en:"Increase weight by 2.5-5kg. Evaluate form every movement — video yourself if possible.", note_zh:"增加2.5-5kg。评估每个动作的姿势——如果可能的话录制自己。" },
        { sets:4, reps:"10-12", rest:75,  tempo:"2-0-2", intensity:"65-70% 1RM",  note_id:"Tambah 1 set per exercise. Ini minggu volume tertinggi — jaga nutrisi dan tidur agar recovery optimal.", note_en:"Add 1 set per exercise. Highest volume week — keep nutrition and sleep optimal for recovery.", note_zh:"每个动作增加1组。最高训练量周——保持营养和睡眠以获得最佳恢复。" },
        { sets:3, reps:"12-15", rest:60,  tempo:"2-0-2", intensity:"55-60% 1RM",  note_id:"Deload. Tubuh dan pikiran butuh istirahat. Gunakan minggu ini untuk evaluasi apa yang sudah dicapai.", note_en:"Deload. Body and mind need rest. Use this week to evaluate what has been achieved.", note_zh:"减量。身体和心灵需要休息。利用这周评估已经取得的成就。" },
      ],
    },
    senior: {
      beginner: [
        { sets:2, reps:"12-15", rest:90,  tempo:"3-0-3", intensity:"Sangat ringan", note_id:"Utamakan form dan keselamatan di atas segalanya. Berhenti jika ada rasa nyeri sendi — ini bukan kelemahan.", note_en:"Prioritize form and safety above all. Stop if you feel joint pain — this is not weakness.", note_zh:"将姿势和安全放在首位。如感到关节疼痛请停止——这不是软弱。" },
        { sets:2, reps:"12-15", rest:90,  tempo:"3-0-3", intensity:"Ringan",        note_id:"Pertahankan teknik. Naikkan beban hanya jika minggu lalu sangat mudah dan tidak ada rasa tidak nyaman setelahnya.", note_en:"Maintain technique. Increase weight only if last week was very easy and no discomfort afterward.", note_zh:"保持技术。只有上周非常轻松且之后没有不适时才增加重量。" },
        { sets:3, reps:"12-15", rest:90,  tempo:"3-0-3", intensity:"Ringan-Sedang", note_id:"Tambah 1 set. Dengarkan tubuhmu — tidak perlu membuktikan apapun. Konsisten lebih penting dari intens.", note_en:"Add 1 set. Listen to your body — no need to prove anything. Consistent beats intense.", note_zh:"增加1组。倾听身体——无需证明任何事。坚持胜过强度。" },
        { sets:2, reps:"12-15", rest:120, tempo:"3-0-3", intensity:"Ringan",        note_id:"Deload aktif. Fokus pada mobilitas dan pernapasan. Tubuh senior butuh recovery lebih panjang.", note_en:"Active deload. Focus on mobility and breathing. Senior bodies need longer recovery.", note_zh:"主动减量。专注于活动度和呼吸。老年身体需要更长的恢复时间。" },
      ],
    },
  };

  const g = schemes[goal] || schemes.bulking;
  const l = g[level]  || g.beginner;
  return l[w];
}

// ── SECTION 5: TRAINING SPLITS 3-5 DAYS ──────────────────────
function getTrainingSplit(goal, daysPerWeek, injuries = []) {
  const hasKnee     = injuries.includes("knee_injury");
  const hasShoulder = injuries.includes("shoulder_injury");
  const hasBack     = injuries.includes("lower_back_pain");

  const splits = {
    // ────────────── 3 DAYS ──────────────
    "bulking_3": [
      { focus:"Upper Push",                muscles:["chest","shoulder","tricep","core"] },
      { focus:"Lower Body",                muscles:["quad","hamstring","calf","core"] },
      { focus:"Upper Pull",                muscles:["back","bicep","shoulder","core"] },
    ],
    "cutting_3": [
      { focus:"Full Body A",               muscles:["chest","back","quad","core"] },
      { focus:"Full Body B",               muscles:["shoulder","hamstring","bicep","tricep","core"] },
      { focus:"Full Body C",               muscles:["chest","back","quad","core"] },
    ],
    "beginner_3": [
      { focus:"Full Body A",               muscles:["chest","back","quad","core"] },
      { focus:"Full Body B",               muscles:["shoulder","hamstring","bicep","tricep"] },
      { focus:"Full Body C",               muscles:["chest","back","quad","core"] },
    ],
    "senior_3": [
      { focus:"Upper Body Gentle",         muscles:["chest","back","shoulder","core"] },
      { focus:"Lower Body Gentle",         muscles:["quad","hamstring","calf","core"] },
      { focus:"Full Body Mobility",        muscles:["back","shoulder","core"] },
    ],

    // ────────────── 4 DAYS ──────────────
    "bulking_4": [
      { focus:"Upper Push",                muscles:["chest","shoulder","tricep"] },
      { focus:"Lower Quad Focus",          muscles:["quad","calf","core"] },
      { focus:"Upper Pull",                muscles:["back","bicep"] },
      { focus:"Lower Posterior Chain",     muscles:["hamstring","calf","core"] },
    ],
    "cutting_4": [
      { focus:"Push",                      muscles:["chest","shoulder","tricep","core"] },
      { focus:"Pull",                      muscles:["back","bicep"] },
      { focus:"Legs",                      muscles:["quad","hamstring","calf"] },
      { focus:"Upper Body & Core",         muscles:["chest","back","shoulder","core"] },
    ],
    "beginner_4": [
      { focus:"Upper Body A",              muscles:["chest","tricep","shoulder"] },
      { focus:"Lower Body A",              muscles:["quad","calf","core"] },
      { focus:"Upper Body B",              muscles:["back","bicep","shoulder"] },
      { focus:"Lower Body B",              muscles:["hamstring","calf","core"] },
    ],
    "senior_4": [
      { focus:"Upper Body A Gentle",       muscles:["chest","shoulder","core"] },
      { focus:"Lower Body A Gentle",       muscles:["quad","calf"] },
      { focus:"Upper Body B Gentle",       muscles:["back","bicep","core"] },
      { focus:"Lower Body B Gentle",       muscles:["hamstring","calf","core"] },
    ],

    // ────────────── 5 DAYS ──────────────
    "bulking_5": [
      { focus:"Chest & Triceps",           muscles:["chest","tricep"] },
      { focus:"Back & Biceps",             muscles:["back","bicep"] },
      { focus:"Legs",                      muscles:["quad","hamstring","calf"] },
      { focus:"Shoulders & Arms",          muscles:["shoulder","bicep","tricep"] },
      { focus:"Push & Core Finisher",      muscles:["chest","shoulder","core"] },
    ],
    "cutting_5": [
      { focus:"Push A",                    muscles:["chest","shoulder","tricep","core"] },
      { focus:"Pull A",                    muscles:["back","bicep"] },
      { focus:"Legs",                      muscles:["quad","hamstring","calf"] },
      { focus:"Push B",                    muscles:["chest","shoulder","tricep"] },
      { focus:"Pull B & Core",             muscles:["back","bicep","core"] },
    ],
    "beginner_5": [
      { focus:"Chest & Triceps",           muscles:["chest","tricep"] },
      { focus:"Back & Biceps",             muscles:["back","bicep"] },
      { focus:"Legs",                      muscles:["quad","hamstring","calf"] },
      { focus:"Shoulders & Core",          muscles:["shoulder","core"] },
      { focus:"Full Body Light",           muscles:["chest","back","quad","core"] },
    ],
    "senior_5": [
      { focus:"Upper Body A Gentle",       muscles:["chest","shoulder","core"] },
      { focus:"Lower Body A Gentle",       muscles:["quad","calf"] },
      { focus:"Upper Body B Gentle",       muscles:["back","bicep","core"] },
      { focus:"Lower Body B Gentle",       muscles:["hamstring","core"] },
      { focus:"Mobility & Balance",        muscles:["core"] },
    ],
  };

  const days = Math.min(Math.max(daysPerWeek || 4, 3), 5);
  const key  = `${goal}_${days}`;
  let split  = splits[key] || splits[`bulking_${days}`] || splits["bulking_4"];

  // Injury adjustments
  if (hasKnee) {
    split = split.map(day => ({
      ...day,
      muscles: day.muscles.map(m => m === "quad" ? "hamstring" : m),
      focus:   day.focus.replace(/Legs|Quad/gi, "Upper Body (Knee Modification)"),
    }));
  }
  if (hasShoulder) {
    split = split.map(day => ({
      ...day,
      muscles: day.muscles.filter(m => m !== "shoulder").length > 0
        ? day.muscles.filter(m => m !== "shoulder")
        : day.muscles,
    }));
  }

  return split;
}

// ── SECTION 6: WARMUP — Injury-aware, 3 languages ────────────
function getWarmup(dayFocus, userProfile) {
  const { goal, injuries = [], age = 25, language = "id" } = userProfile;
  const isSenior   = age >= 55 || goal === "senior";
  const hasKnee    = injuries.includes("knee_injury");
  const hasShoulder= injuries.includes("shoulder_injury");
  const hasBack    = injuries.includes("lower_back_pain");
  const focus      = (dayFocus || "").toLowerCase();

  const W = {
    id: {
      push_safe:      "5 menit: Arm circles maju-mundur 30 detik, chest opener (tangan di belakang, buka dada), band pull apart 15 reps, 2 set incline push up ringan. Fokus scapular retraction.",
      push_shoulder:  "5 menit: Thoracic rotation duduk 30 detik per sisi, foam roll upper back, chest opener perlahan, 2 set incline push up sangat ringan. HINDARI gerakan bahu di atas kepala.",
      pull_safe:      "5 menit: Band pull apart 15 reps, cat-cow 10 reps perlahan, cross-body shoulder stretch 30 detik per sisi, dead hang 15-20 detik, 2 set lat pulldown ringan.",
      pull_shoulder:  "5 menit: Cat-cow 10 reps, thoracic rotation 30 detik per sisi, dead hang 15 detik. HINDARI overhead pull — fokus pada horizontal row.",
      legs_safe:      "6 menit: Hip circle 10x tiap arah, leg swing depan-belakang 10x per kaki, lateral leg swing 10x, bodyweight squat perlahan 15 reps, 2 set goblet squat ringan dengan pause bawah.",
      legs_knee:      "6 menit: Hip circle 10x, side-lying clam 15 reps per sisi, glute bridge 15 reps, terminal knee extension dengan band 15 reps. HINDARI deep squat — fokus pada posterior chain.",
      upper_safe:     "5 menit: Arm circles, band pull apart, cat-cow, shoulder rotation internal-eksternal, 2 set ringan (press dan row).",
      upper_shoulder: "5 menit: Cat-cow 10 reps, thoracic rotation, 2 set seated row ringan. HINDARI overhead pressing — substitusi dengan horizontal movements.",
      full_safe:      "6 menit: Jumping jack 30 detik, hip circle, arm circles, inchworm 5 reps, bodyweight squat 10 reps, plank hold 20 detik.",
      full_back:      "6 menit: Cat-cow 15 reps sangat perlahan, knee-to-chest stretch 30 detik per lutut, bird dog 8 reps per sisi, McGill curl up 5 reps. HINDARI forward bend dalam.",
      senior:         "8-10 menit: March in place sambil angkat lutut 2 menit, rotasi leher perlahan 5x tiap arah, ayunan lengan lembut, rotasi pergelangan tangan dan kaki 10x, wall push up 10 reps perlahan, calf raise perlahan 10 reps. Bernapas dalam dan teratur.",
      core:           "4 menit: Cat-cow 10 reps, dead bug 5 reps per sisi perlahan, bird dog 5 reps per sisi, hollow body hold 10-15 detik.",
    },
    en: {
      push_safe:      "5 min: Arm circles forward/back 30 sec, chest opener (hands clasped behind back), band pull apart 15 reps, 2 sets light incline push up. Focus on scapular retraction.",
      push_shoulder:  "5 min: Seated thoracic rotation 30 sec each side, foam roll upper back, slow chest opener, 2 sets very light incline push up. AVOID overhead shoulder movements.",
      pull_safe:      "5 min: Band pull apart 15 reps, cat-cow 10 slow reps, cross-body shoulder stretch 30 sec each side, dead hang 15-20 sec, 2 sets light lat pulldown.",
      pull_shoulder:  "5 min: Cat-cow 10 reps, thoracic rotation 30 sec each side, dead hang 15 sec. AVOID overhead pull — focus on horizontal rowing.",
      legs_safe:      "6 min: Hip circles 10x each direction, front-back leg swings 10x per leg, lateral leg swings 10x, slow bodyweight squat 15 reps, 2 sets light goblet squat with bottom pause.",
      legs_knee:      "6 min: Hip circles 10x, side-lying clam 15 reps each side, glute bridge 15 reps, banded terminal knee extension 15 reps. AVOID deep squats — focus on posterior chain.",
      upper_safe:     "5 min: Arm circles, band pull apart, cat-cow, internal-external shoulder rotation, 2 light sets each (press and row).",
      upper_shoulder: "5 min: Cat-cow 10 reps, thoracic rotation, 2 sets light seated row. AVOID overhead pressing — substitute with horizontal movements.",
      full_safe:      "6 min: Jumping jacks 30 sec, hip circles, arm circles, inchworm 5 reps, bodyweight squat 10 reps, plank hold 20 sec.",
      full_back:      "6 min: Very slow cat-cow 15 reps, knee-to-chest stretch 30 sec each, bird dog 8 reps each side, McGill curl up 5 reps. AVOID deep forward bending.",
      senior:         "8-10 min: March in place with knee lifts 2 min, slow neck rotation 5x each direction, gentle arm swings, wrist and ankle circles 10x, wall push up 10 slow reps, slow calf raise 10 reps. Breathe deeply and steadily.",
      core:           "4 min: Cat-cow 10 reps, slow dead bug 5 reps each side, bird dog 5 reps each side, hollow body hold 10-15 sec.",
    },
    zh: {
      push_safe:      "5分钟：手臂绕圈前后各30秒，胸部开合（双手在背后扣住），弹力带拉开15次，2组轻重量斜面俯卧撑。专注于肩胛骨收缩。",
      push_shoulder:  "5分钟：坐姿胸椎旋转每侧30秒，泡沫轴放松上背部，缓慢胸部开合，2组非常轻的斜面俯卧撑。避免头顶肩部动作。",
      pull_safe:      "5分钟：弹力带拉开15次，慢速猫牛式10次，交叉身体肩部伸展每侧30秒，悬挂15-20秒，2组轻重量引体向下。",
      pull_shoulder:  "5分钟：猫牛式10次，胸椎旋转每侧30秒，悬挂15秒。避免头顶拉动——专注于水平划船。",
      legs_safe:      "6分钟：髋部绕圈各方向10次，前后腿摆每腿10次，侧向腿摆10次，慢速深蹲15次，2组轻重量酒杯深蹲并在底部暂停。",
      legs_knee:      "6分钟：髋部绕圈10次，侧卧蛤蜊每侧15次，臀桥15次，弹力带终端膝关节伸展15次。避免深蹲——专注于后链训练。",
      upper_safe:     "5分钟：手臂绕圈，弹力带拉开，猫牛式，肩膀内外旋转，各2组轻重量（推和拉）。",
      upper_shoulder: "5分钟：猫牛式10次，胸椎旋转，2组轻重量坐姿划船。避免头顶推举——用水平动作替代。",
      full_safe:      "6分钟：开合跳30秒，髋部绕圈，手臂绕圈，毛毛虫5次，深蹲10次，平板支撑20秒。",
      full_back:      "6分钟：非常缓慢的猫牛式15次，每侧膝盖贴胸伸展30秒，鸟狗每侧8次，麦吉尔卷腹5次。避免深度前屈。",
      senior:         "8-10分钟：原地抬膝踏步2分钟，缓慢颈部旋转各方向5次，轻柔手臂摆动，手腕和脚踝绕圈各10次，靠墙俯卧撑慢速10次，慢速提踵10次。深呼吸，保持规律。",
      core:           "4分钟：猫牛式10次，慢速死虫每侧5次，鸟狗每侧5次，空心体保持10-15秒。",
    },
  };

  const w = W[language] || W.id;
  if (isSenior) return w.senior;
  if (focus.includes("core") || focus.includes("mobil") || focus.includes("balance")) return w.core;

  const isPush = focus.includes("push") || focus.includes("chest") || focus.includes("tricep");
  const isPull = focus.includes("pull") || focus.includes("back")  || focus.includes("bicep");
  const isLegs = focus.includes("leg")  || focus.includes("lower") || focus.includes("quad") || focus.includes("posterior") || focus.includes("hamstring");
  const isUpper= focus.includes("upper");

  if (isPush) return hasShoulder ? w.push_shoulder : w.push_safe;
  if (isPull) return hasShoulder ? w.pull_shoulder : w.pull_safe;
  if (isLegs) return hasKnee     ? w.legs_knee     : w.legs_safe;
  if (isUpper) return hasShoulder ? w.upper_shoulder : w.upper_safe;
  return hasBack ? w.full_back : w.full_safe;
}

// ── SECTION 7: MEAL PLAN ENGINE ──────────────────────────────
// Supports: diet type, food style, allergy, intermittent fasting,
//           meal frequency, food preferences
function generateMealPlan(userProfile) {
  const {
    targetCalories = 2000,
    protein        = 140,
    carbs          = 200,
    fat            = 65,
    goal           = "bulking",
    language       = "id",
    food_allergies = [],
    diet_type      = "omnivore",   // "omnivore"|"vegetarian"|"vegan"
    food_style     = "local",      // "local"|"western"|"asian"|"high_protein"|"budget"
    meal_frequency = 5,            // 3|4|5|6
    intermittent_fasting = false,
  } = userProfile;

  const a = food_allergies.map(x => x.toLowerCase());
  const isVegan = diet_type === "vegan";
  const isVeg   = diet_type === "vegetarian" || isVegan;

  const noGluten  = a.includes("gluten") || a.includes("wheat") || a.includes("gandum");
  const noDairy   = a.includes("dairy")  || a.includes("susu")  || a.includes("lactose");
  const noNuts    = a.includes("nuts")   || a.includes("kacang");
  const noEgg     = a.includes("egg")    || a.includes("telur") || isVegan;
  const noSeafood = a.includes("seafood")|| a.includes("ikan")  || a.includes("fish") || isVegan;
  const noMeat    = isVeg;

  // Words that indicate dairy presence — used to filter snacks/foods when noDairy is set
  const DAIRY_WORDS = ["yogurt","greek yogurt","keju","cheese","butter","mentega","whey","krim","cream","susu","milk","酸奶","牛奶","奶酪","黄油","奶油"];
  const containsDairy = (s) => {
    const t = String(s).toLowerCase();
    return DAIRY_WORDS.some(w => t.includes(w));
  };

  // Protein sources matrix
  const proteins = {
    id: {
      animal:    (!noMeat && !noSeafood) ? ["Ayam panggang","Ikan salmon","Daging sapi panggang","Ikan tuna","Ikan lele","Ayam rebus","Daging sapi rebus"] : (!noMeat ? ["Ayam panggang","Daging sapi","Ayam rebus"] : []),
      seafood:   !noSeafood ? ["Ikan salmon panggang","Tuna kalengan","Ikan lele goreng","Udang rebus","Ikan kembung"] : [],
      egg:       !noEgg     ? ["Telur rebus","Telur dadar putih telur","Telur orak-arik","Putih telur rebus"] : [],
      plant:     ["Tahu panggang","Tempe bakar","Tahu kukus","Tempe goreng","Edamame","Kacang merah","Lentil"],
      dairy:     !noDairy   ? ["Greek yogurt","Susu protein","Keju cottage","Susu rendah lemak"] : [],
    },
    en: {
      animal:    (!noMeat && !noSeafood) ? ["Grilled chicken","Salmon fillet","Lean beef","Tuna","Boiled chicken"] : (!noMeat ? ["Grilled chicken","Lean beef","Boiled chicken"] : []),
      seafood:   !noSeafood ? ["Grilled salmon","Canned tuna","Shrimp","White fish"] : [],
      egg:       !noEgg     ? ["Boiled eggs","Egg white omelette","Scrambled whites"] : [],
      plant:     ["Grilled tofu","Tempeh","Steamed tofu","Edamame","Lentils","Chickpeas","Black beans"],
      dairy:     !noDairy   ? ["Greek yogurt","Cottage cheese","Low-fat milk"] : [],
    },
    zh: {
      animal:    (!noMeat && !noSeafood) ? ["烤鸡","三文鱼","瘦牛肉","金枪鱼","水煮鸡"] : (!noMeat ? ["烤鸡","瘦牛肉","水煮鸡"] : []),
      seafood:   !noSeafood ? ["烤三文鱼","金枪鱼罐头","虾","白鱼"] : [],
      egg:       !noEgg     ? ["水煮蛋","蛋清炒蛋","水煮蛋清"] : [],
      plant:     ["烤豆腐","豆豉","清蒸豆腐","毛豆","扁豆","鹰嘴豆","黑豆"],
      dairy:     !noDairy   ? ["希腊酸奶","农家干酪","低脂牛奶"] : [],
    },
  };

  const carbs_sources = {
    id: noGluten
      ? ["Nasi putih","Nasi merah","Ubi jalar","Singkong kukus","Kentang rebus","Quinoa","Oat bebas gluten"]
      : ["Nasi putih","Nasi merah","Ubi jalar","Roti gandum","Oat","Kentang rebus","Singkong"],
    en: noGluten
      ? ["White rice","Brown rice","Sweet potato","Boiled potato","Quinoa","Gluten-free oats"]
      : ["White rice","Brown rice","Sweet potato","Whole wheat bread","Oats","Boiled potato"],
    zh: noGluten
      ? ["白米饭","糙米饭","红薯","煮土豆","藜麦","无麸质燕麦"]
      : ["白米饭","糙米饭","红薯","全麦面包","燕麦","煮土豆"],
  };

  const vegs = {
    id: ["Brokoli kukus","Bayam tumis","Kangkung","Selada","Timun","Wortel","Kol","Pak choy","Asparagus"],
    en: ["Steamed broccoli","Spinach","Kale","Lettuce","Cucumber","Carrots","Cabbage","Bok choy","Asparagus"],
    zh: ["清蒸西兰花","菠菜","羽衣甘蓝","生菜","黄瓜","胡萝卜","卷心菜","白菜","芦笋"],
  };

  const fats_sources = {
    id: [!noNuts ? "Kacang almond 15g" : null,"Alpukat 1/2 buah","Minyak zaitun 1 sdm","Biji chia 1 sdm"].filter(Boolean),
    en: [!noNuts ? "15g almonds" : null,"1/2 avocado","1 tbsp olive oil","1 tbsp chia seeds"].filter(Boolean),
    zh: [!noNuts ? "15克杏仁" : null,"半个牛油果","1汤匙橄榄油","1汤匙奇亚籽"].filter(Boolean),
  };

  const lang   = language;
  const pSrc   = proteins[lang]       || proteins.id;
  const cSrc   = carbs_sources[lang]  || carbs_sources.id;
  const vSrc   = vegs[lang]           || vegs.id;
  const fSrc   = fats_sources[lang]   || fats_sources.id;

  const allProteins = [...pSrc.animal, ...pSrc.seafood, ...pSrc.egg, ...pSrc.plant, ...pSrc.dairy].filter(Boolean);
  const pick        = (arr) => arr[Math.floor(Math.random() * arr.length)] || "-";

  // Calorie distribution per meal frequency
  const distributions = {
    3: [0.30, 0.40, 0.30],
    4: [0.25, 0.15, 0.35, 0.25],
    5: [0.22, 0.12, 0.30, 0.10, 0.26],
    6: [0.18, 0.10, 0.25, 0.12, 0.25, 0.10],
  };

  const dist = distributions[Math.min(meal_frequency, 6)] || distributions[5];

  const mealNames = {
    3: {
      id:["Sarapan","Makan Siang","Makan Malam"],
      en:["Breakfast","Lunch","Dinner"],
      zh:["早餐","午餐","晚餐"],
    },
    4: {
      id:["Sarapan","Snack Pagi","Makan Siang","Makan Malam"],
      en:["Breakfast","Morning Snack","Lunch","Dinner"],
      zh:["早餐","上午零食","午餐","晚餐"],
    },
    5: {
      id:["Sarapan","Snack Pagi","Makan Siang","Snack Sore","Makan Malam"],
      en:["Breakfast","Morning Snack","Lunch","Afternoon Snack","Dinner"],
      zh:["早餐","上午零食","午餐","下午零食","晚餐"],
    },
    6: {
      id:["Sarapan","Snack 1","Makan Siang","Pre-Workout","Makan Malam","Post-Workout"],
      en:["Breakfast","Snack 1","Lunch","Pre-Workout","Dinner","Post-Workout"],
      zh:["早餐","零食1","午餐","训练前","晚餐","训练后"],
    },
  };

  const ifStartTime = 12; // noon if IF is on
  const baseTimes   = intermittent_fasting
    ? ["12:00","14:00","16:30","19:00","21:00","22:00"]
    : ["07:00","10:00","13:00","16:00","19:30","21:00"];

  const names   = (mealNames[meal_frequency] || mealNames[5])[lang] || (mealNames[5]).id;
  const meals   = [];
  const freqKey = Math.min(meal_frequency, 6);

  for (let i = 0; i < freqKey && i < dist.length; i++) {
    const cal = Math.round(targetCalories * dist[i]);
    const pro = Math.round(protein * dist[i]);
    const isSnack = freqKey >= 5 && (i === 1 || i === 3 || i === 5);

    let food;
    if (isSnack) {
      const snacks_id = ["Buah + kacang almond","Greek yogurt","Telur rebus + buah","Edamame + susu kedelai","Roti gandum + selai kacang"];
      const snacks_en = ["Fruit + almonds","Greek yogurt","Boiled eggs + fruit","Edamame + soy milk","Whole wheat + peanut butter"];
      const snacks_zh = ["水果+杏仁","希腊酸奶","水煮蛋+水果","毛豆+豆浆","全麦+花生酱"];
      const snackList = { id:snacks_id, en:snacks_en, zh:snacks_zh }[lang] || snacks_id;
      // Filter out allergic items
      const safe = snackList.filter(s => {
        if (noNuts && (s.includes("kacang") || s.includes("almond") || s.includes("peanut") || s.includes("nuts") || s.includes("杏仁") || s.includes("花生"))) return false;
        if (noDairy && (s.includes("yogurt") || s.includes("susu") || s.includes("milk") || s.includes("酸奶") || s.includes("牛奶"))) return false;
        if (noEgg && (s.includes("telur") || s.includes("egg") || s.includes("鸡蛋"))) return false;
        return true;
      });
      food = pick(safe.length ? safe : snackList);
    } else {
      const protein_choice = pick(allProteins);
      const carb_choice    = pick(cSrc);
      const veg_choice     = pick(vSrc);
      const fat_choice     = pick(fSrc);
      food = goal === "cutting"
        ? `${protein_choice} + ${carb_choice} (porsi kecil) + ${veg_choice}`
        : `${protein_choice} + ${carb_choice} + ${veg_choice} + ${fat_choice}`;
    }

    meals.push({
      time:     baseTimes[i],
      type:     names[i],
      name:     food,
      calories: cal,
      protein:  pro,
    });
  }

  const allergyNote = food_allergies.length > 0
    ? { id:`Menu disesuaikan: bebas ${food_allergies.join(", ")}`, en:`Menu adjusted: free from ${food_allergies.join(", ")}`, zh:`菜单已调整：不含 ${food_allergies.join("、")}` }[lang]
    : null;

  const ifNote = intermittent_fasting
    ? { id:"Jadwal IF 16/8: makan dalam window 12:00–20:00", en:"IF 16/8 schedule: eat within 12:00–20:00 window", zh:"IF 16/8时间表：在12:00-20:00窗口期内进食" }[lang]
    : null;

  return {
    daily_target: { calories: targetCalories, protein, carbs, fat },
    meals,
    notes: [allergyNote, ifNote].filter(Boolean),
  };
}

// ── SECTION 8: DAY BUILDER ────────────────────────────────────
function buildDay(daySpec, userProfile, week) {
  const { goal, level = "beginner", sessionDuration = 60, age = 25 } = userProfile;
  const isSenior = age >= 55 || goal === "senior";

  const maxEx = isSenior ? 4
    : sessionDuration <= 30 ? 3
    : sessionDuration <= 45 ? 4
    : sessionDuration <= 60 ? 5 : 6;

  const exPerMuscle = daySpec.muscles.length <= 2 ? 3 : 2;
  const used        = new Set();
  const exercises   = [];
  const scheme      = getSetsReps(goal, level, week, age);

  daySpec.muscles.forEach(muscle => {
    if (exercises.length >= maxEx) return;
    const candidates = pickExercises(muscle, userProfile, exPerMuscle + 2);
    let added = 0;
    for (const name of candidates) {
      if (!used.has(name) && added < exPerMuscle && exercises.length < maxEx) {
        exercises.push({
          name,
          sets:         scheme.sets,
          reps:         scheme.reps,
          rest_seconds: scheme.rest,
          tempo:        scheme.tempo,
          intensity:    scheme.intensity,
        });
        used.add(name);
        added++;
      }
    }
  });

  return exercises.slice(0, maxEx);
}

// ── SECTION 9: PLAN GENERATOR (Zero AI) ──────────────────────
function generatePlanTemplate(userProfile) {
  const {
    goal        = "bulking",
    daysPerWeek = 4,
    injuries    = [],
    language    = "id",
    age         = 25,
  } = userProfile;

  const days   = Math.min(Math.max(daysPerWeek, 3), 5);
  const split  = getTrainingSplit(goal, days, injuries);

  const restLabel = { id:"Hari Istirahat & Pemulihan Aktif", en:"Rest & Active Recovery Day", zh:"休息和主动恢复日" };

  const plan = { weeks: [] };

  for (let week = 1; week <= 4; week++) {
    const scheme  = getSetsReps(goal, userProfile.level || "beginner", week, age);
    const weekData = {
      week_number:      week,
      theme:            { id: scheme.note_id, en: scheme.note_en, zh: scheme.note_zh }[language] || scheme.note_id,
      progression_note: { id: scheme.note_id, en: scheme.note_en, zh: scheme.note_zh }[language] || scheme.note_id,
      days: [],
    };

    let splitIdx = 0;
    for (let day = 1; day <= 7; day++) {
      if (splitIdx < split.length) {
        const daySpec   = split[splitIdx];
        const exercises = buildDay(daySpec, { ...userProfile, daysPerWeek: days }, week);
        weekData.days.push({
          day_number: day,
          focus:      daySpec.focus,
          is_rest:    false,
          warmup:     getWarmup(daySpec.focus, userProfile),
          exercises,
        });
        splitIdx++;
      } else {
        weekData.days.push({
          day_number: day,
          focus:      restLabel[language] || restLabel.id,
          is_rest:    true,
          warmup:     null,
          exercises:  [],
        });
      }
    }
    plan.weeks.push(weekData);
  }
  return plan;
}

// ── SECTION 10: COACH SURYA AI MICRO-CALL (~300 tokens) ──────
async function getCoachSuryaMessage(userProfile, splitNames, anthropicApiCall) {
  const {
    name            = "Friend",
    goal, level, equipment, age = 25,
    injuries        = [],
    food_allergies  = [],
    diet_type       = "omnivore",
    gender          = "not specified",
    occupation      = "not specified",
    stress_level    = 5,
    bmr, tdee, targetCalories,
    protein, daysPerWeek,
    language        = "id",
    monthNumber     = 1,
  } = userProfile;

  const langInstr = {
    id: "Respond entirely in Bahasa Indonesia. Use warm, conversational Indonesian fitness coaching language.",
    en: "Respond entirely in English. Use warm, professional personal trainer language.",
    zh: "Respond entirely in Simplified Chinese (简体中文). Use warm, professional fitness coaching language.",
  };

  const injuryCtx   = injuries.length > 0
    ? `Active injuries/conditions: ${injuries.map(i => i.replace(/_/g," ")).join(", ")}. Program has been modified to avoid contraindicated movements.`
    : "No injuries reported.";

  const allergyCtx  = food_allergies.length > 0
    ? `Food allergies: ${food_allergies.join(", ")}. Meal plan has been adjusted accordingly.`
    : "No food allergies.";

  const prompt = `You are Coach Surya — a certified personal trainer (CPT) and nutrition coach (CNC) with 10+ years experience handling clients from Indonesia and internationally. You specialize in injury management, body recomposition, sports nutrition, and personalized programming. Your coaching philosophy: "Tidak ada program yang one-size-fits-all. Setiap tubuh unik, setiap program harus unik."
${langInstr[language] || langInstr.id}

CLIENT PROFILE:
- Name: ${name} | Age: ${age} | Gender: ${gender}
- Goal: ${goal} | Level: ${level} | Month: ${monthNumber}
- Equipment: ${Array.isArray(equipment) ? equipment.join(", ") : equipment}
- Days/week: ${daysPerWeek} | Split: ${splitNames.join(" → ")}
- Occupation: ${occupation} | Stress level: ${stress_level}/10
- Diet type: ${diet_type}
- ${injuryCtx}
- ${allergyCtx}
- BMR: ${bmr} kcal | TDEE: ${tdee} kcal | Target: ${targetCalories} kcal | Protein: ${protein}g/day

As Coach Surya, write ONLY this exact JSON (no markdown, no extra text):
{
  "opening": "<2-3 sentences — greet ${name} by name, acknowledge their specific goal and situation (injury/age/level), explain what makes THIS program designed specifically for them. Sound like a real coach who has analyzed their profile, not a generic welcome.>",
  "key_tips": [
    "<Training tip specific to their goal (${goal}), level (${level}), and equipment — max 20 words>",
    "<Recovery/injury tip — if injuries exist, address it directly; if not, give recovery advice for their stress level ${stress_level}/10 — max 20 words>",
    "<Nutrition tip specific to their goal, diet type (${diet_type}), and allergy situation — max 20 words>"
  ],
  "motivation": "<1 powerful, authentic motivational line — mention their name, reference their specific goal, NOT generic — max 25 words>",
  "week_focus": "<1 sentence describing what Week 1 focuses on specifically for this client>"
}`;

  try {
    const res     = await anthropicApiCall({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages:   [{ role:"user", content: prompt }],
    });
    const text    = res.content.filter(b => b.type === "text").map(b => b.text).join("");
    const cleaned = text.replace(/```json|```/g,"").trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback — always succeeds
    const fb = {
      id: {
        opening:    `Hei ${name}! Coach Surya sudah menganalisis profil kamu secara detail. Program ${goal} ini dirancang khusus untuk level ${level} kamu${injuries.length > 0 ? `, dengan modifikasi untuk kondisi ${injuries.map(i=>i.replace(/_/g," ")).join(" dan ")} kamu` : ""}. Setiap exercise, setiap set, setiap rep — dipilih spesifik untuk kamu.`,
        key_tips:   [
          `Fokus pada teknik yang sempurna di setiap rep — ${level==="beginner" ? "ini fondasi yang tidak bisa dilewati" : "form yang benar mencegah plateau"}.`,
          injuries.length > 0 ? `Perhatikan area ${injuries[0].replace(/_/g," ")} — hentikan jika ada nyeri, modifikasi gerakan sesuai kemampuan hari ini.` : `Tidur 7-8 jam dan kelola stres — kortisol tinggi menghambat ${goal==="bulking"?"pertumbuhan otot":"fat burning"}.`,
          `Target protein ${Math.round(protein||140)}g/hari adalah non-negotiable untuk mendukung goals ${goal}-mu${food_allergies.length>0?` — sudah disesuaikan tanpa ${food_allergies.join(", ")}`:""}.`,
        ],
        motivation: `${name}, setiap sesi yang kamu tuntaskan adalah bukti nyata komitmenmu — konsistensi ini yang akan mengubah tubuhmu.`,
        week_focus: `Minggu 1 fokus pada penguasaan teknik dan adaptasi tubuh terhadap program ini.`,
      },
      en: {
        opening:    `Hey ${name}! Coach Surya has analyzed your profile in detail. This ${goal} program is designed specifically for your ${level} level${injuries.length>0?`, with modifications for your ${injuries.map(i=>i.replace(/_/g," ")).join(" and ")}`:""}.`,
        key_tips:   [
          `Perfect technique on every rep — ${level==="beginner"?"this is your foundation":"proper form prevents plateaus"}.`,
          injuries.length>0?`Monitor your ${injuries[0].replace(/_/g," ")} — stop if pain occurs, modify as needed today.`:`Sleep 7-8 hours and manage stress — high cortisol blocks ${goal==="bulking"?"muscle growth":"fat burning"}.`,
          `Hit your ${Math.round(protein||140)}g protein/day target — this is non-negotiable for your ${goal} goal${food_allergies.length>0?`, adjusted for ${food_allergies.join(", ")} allergy`:""}. `,
        ],
        motivation: `${name}, every session you complete is proof of your commitment — this consistency is what transforms bodies.`,
        week_focus: "Week 1 focuses on mastering technique and body adaptation to this program.",
      },
      zh: {
        opening:    `嗨 ${name}！Coach Surya 已经详细分析了你的资料。这个${goal}计划专为你的${level}水平设计${injuries.length>0?`，并针对你的${injuries.map(i=>i.replace(/_/g,"和")).join("、")}进行了调整`:""}。`,
        key_tips:   [
          `每次重复都保持完美技术——${level==="beginner"?"这是不可跳过的基础":"正确姿势防止停滞"}。`,
          injuries.length>0?`注意${injuries[0].replace(/_/g,"和")}区域——如有疼痛请停止，根据今天的状态调整动作。`:`睡眠7-8小时并管理压力——高皮质醇会阻碍${goal==="bulking"?"肌肉生长":"脂肪燃烧"}。`,
          `每天达到${Math.round(protein||140)}克蛋白质目标${food_allergies.length>0?`，已根据${food_allergies.join("、")}过敏进行调整`:""}。`,
        ],
        motivation: `${name}，你完成的每一次训练都是你承诺的证明——这种坚持将改变你的身体。`,
        week_focus: "第1周专注于掌握技术和身体适应这个计划。",
      },
    };
    return fb[language] || fb.id;
  }
}

// ── SECTION 11: MASTER GENERATE FUNCTION ─────────────────────
async function generateHybridPlan(userProfile, anthropicApiCall) {
  const days = Math.min(Math.max(userProfile.daysPerWeek || 4, 3), 5);
  const profile = { ...userProfile, daysPerWeek: days };

  const planTemplate  = generatePlanTemplate(profile);
  const mealPlan      = generateMealPlan(profile);
  const split         = getTrainingSplit(profile.goal, days, profile.injuries || []);
  const splitNames    = split.map(d => d.focus);
  const coachMessage  = await getCoachSuryaMessage(profile, splitNames, anthropicApiCall);

  return {
    plan_structure:  planTemplate,
    meal_plan:       mealPlan,
    coach_message:   coachMessage,
    weekly_schedule: splitNames,
    injury_notes:    (profile.injuries || []).length > 0
      ? { id:`Program dimodifikasi untuk: ${profile.injuries.map(i=>i.replace(/_/g," ")).join(", ")}`, en:`Program modified for: ${profile.injuries.map(i=>i.replace(/_/g," ")).join(", ")}`, zh:`计划已针对以下情况调整：${profile.injuries.map(i=>i.replace(/_/g,"和")).join("、")}` }[profile.language || "id"]
      : null,
    meta: {
      generated_at:         new Date().toISOString(),
      plan_month:           profile.monthNumber || 1,
      goal:                 profile.goal,
      level:                profile.level,
      days_per_week:        days,
      session_duration:     profile.sessionDuration || 60,
      language:             profile.language || "id",
      injuries_considered:  profile.injuries || [],
      allergies_considered: profile.food_allergies || [],
      diet_type:            profile.diet_type || "omnivore",
    },
  };
}

// ── SECTION 12: EXTEND PLAN ───────────────────────────────────
async function extendHybridPlan(userProfile, previousMonthNumber, anthropicApiCall) {
  const profile = {
    ...userProfile,
    monthNumber: previousMonthNumber + 1,
    level: previousMonthNumber >= 2 && userProfile.level === "beginner"
      ? "intermediate"
      : userProfile.level,
  };
  return generateHybridPlan(profile, anthropicApiCall);
}

// ── EXPORTS (Deno / ES Module) ────────────────────────────────
export { generateHybridPlan, extendHybridPlan, generatePlanTemplate, generateMealPlan, getTrainingSplit, EXERCISES };
