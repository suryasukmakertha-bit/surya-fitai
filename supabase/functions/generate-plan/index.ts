import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

// Edge function wall-clock budget. Supabase hard limit is ~150s.
// We bail at 140s to guarantee a clean 408 response with CORS headers
// instead of a transport-level non-2xx crash that the browser cannot read.
const FUNCTION_TIMEOUT_MS = 140_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function validateInput(data: any): string[] {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== 'string') errors.push('Name is required');
  else if (data.name.length > 60) errors.push('Name is too long (max 60 characters)');
  const age = parseInt(data.age);
  if (isNaN(age) || age < 13 || age > 120) errors.push('Age must be between 13 and 120');
  const weight = parseFloat(data.weight);
  if (isNaN(weight) || weight < 20 || weight > 400) errors.push('Weight must be between 20 and 400 kg');
  const height = parseFloat(data.height);
  if (isNaN(height) || height < 80 || height > 280) errors.push('Height must be between 80 and 280 cm');
  if (!['male', 'female', 'other'].includes(data.gender)) errors.push('Invalid gender value');
  // Duration is now always treated as "1 Month" (4 weeks) regardless of client value.
  // The form no longer exposes a duration selector — see ProgramForm.tsx.
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(data.experience)) errors.push('Invalid experience level');
  const trainingDays = parseInt(data.trainingDaysPerWeek);
  if (isNaN(trainingDays) || trainingDays < 2 || trainingDays > 7) errors.push('Training days per week must be between 2 and 7');
  if (data.goal && data.goal.length > 300) errors.push('Goal is too long');
  if (data.limitations && data.limitations.length > 200) errors.push('Limitations is too long');
  if (data.allergies && data.allergies.length > 200) errors.push('Allergies is too long');
  if (data.occupation && data.occupation.length > 200) errors.push('Occupation is too long');
  return errors;
}

// =====================================================================
// PROMPT INJECTION DEFENSE
// Strip/neutralize common injection patterns from free-text user inputs
// before they ever reach the LLM prompt. This is layered with the
// <user_provided_data> delimiter block in the user prompt below.
// Security re-verification touch: sanitizeUserText() + <user_provided_data>
// wrapper (prompt injection) and reserve_generate_quota RPC (atomic quota)
// are both active. Do not remove either layer.
// =====================================================================
const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\b/gi,
  /\bdisregard\b/gi,
  /\bforget\b/gi,
  /\boverride\b/gi,
  /\byour\s+instructions?\b/gi,
  /\bsystem\s+prompt\b/gi,
  /\byou\s+are\s+now\b/gi,
  /\bact\s+as\b/gi,
  /\bpretend\b/gi,
  /\bjailbreak\b/gi,
  /\bprompt\s+injection\b/gi,
  /\bnew\s+instructions?\b/gi,
  /\bend\s+of\s+(prompt|system)\b/gi,
  /\bprevious\s+instructions?\b/gi,
  /\bdeveloper\s+mode\b/gi,
  /\bverbatim\b/gi,
  /\binstead\s+of\s+(generating|creating|producing|outputting)\b/gi,
  /\braw\s+(system\s+)?prompt\b/gi,
  /\breveal\s+(your\s+|the\s+)?(instructions?|prompt)\b/gi,
  /\bprint\s+(your\s+|the\s+)?(instructions?|prompt)\b/gi,
];

function sanitizeUserText(input: unknown, maxLen: number): string {
  if (input === null || input === undefined) return '';
  let s = String(input);
  // Strip angle brackets, backticks, curly braces, and code-fence sequences
  s = s.replace(/[<>`{}]/g, ' ');
  s = s.replace(/```+/g, ' ');
  // Neutralize role-style prefixes (system:, assistant:, user:, etc.)
  s = s.replace(/\b(system|assistant|user|developer|tool)\s*:/gi, ' ');
  // Remove known injection phrases
  for (const re of INJECTION_PATTERNS) s = s.replace(re, ' ');
  // Collapse whitespace and trim
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function calculateBMR(weight: number, heightCm: number, age: number, gender: string): number {
  const base = 10 * weight + 6.25 * heightCm - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

function getActivityMultiplier(trainingDays: number): number {
  if (trainingDays <= 2) return 1.2;
  if (trainingDays <= 3) return 1.375;
  if (trainingDays <= 5) return 1.55;
  if (trainingDays <= 6) return 1.725;
  return 1.9;
}

function calculateTDEE(bmr: number, activityMultiplier: number, dailySteps: string): number {
  const stepsMap: Record<string, number> = { "<4000": 3000, "4000-8000": 6000, "8000-12000": 10000, ">12000": 14000, "desk": 2500 };
  const steps = stepsMap[dailySteps] || 6000;
  const neat = steps > 8000 ? (steps - 8000) * 0.04 : 0;
  return bmr * activityMultiplier + neat;
}

// MEAL_TEMPLATE_LOGIC.md §1–§2:
// 1) TDEE adjustment by goal to get daily calorie target.
// 2) Protein first, per kg of bodyweight (NOT % of calories).
// 3) Remaining kcal = calories − protein·4, split into carbs/fat
//    at the goal-specific midpoint of the spec's range.
//
// Previous implementation applied carb/fat as flat %s of TOTAL kcal, which
// double-counted the protein bucket and caused the summed macro kcal to
// overshoot calorie_target by ~10%. Fixed to use the remaining-kcal split
// exactly as the spec requires.
function calculateMacros(tdee: number, weight: number, programType: string) {
  // Goal → { tdeeMult, proteinPerKg, carbPctOfRemaining, fatPctOfRemaining }
  // Percentages are the midpoints of the spec's Carb/Fat ranges.
  let calorieMult: number;
  let proteinPerKg: number;
  let carbPctRem: number;
  let fatPctRem: number;

  if (programType === "bulking") {
    // Hypertrophy: +12.5% (mid of +10/+15), P 2.0 g/kg, C 47.5%, F 52.5%
    calorieMult = 1.125;
    proteinPerKg = 2.0;
    carbPctRem = 0.475;
    fatPctRem = 0.525;
  } else if (programType === "cutting") {
    // Fat Loss: −17.5% (mid of −15/−20), P 2.2 g/kg, C 37.5%, F 62.5%
    calorieMult = 0.825;
    proteinPerKg = 2.2;
    carbPctRem = 0.375;
    fatPctRem = 0.625;
  } else {
    // General Fitness / Recomp / Strength fallback: maintenance,
    // P 1.8 g/kg, C 47.5%, F 52.5% (mid of General Fitness row).
    calorieMult = 1.0;
    proteinPerKg = 1.8;
    carbPctRem = 0.475;
    fatPctRem = 0.525;
  }

  const calories = Math.round(tdee * calorieMult);
  const protein = Math.round(weight * proteinPerKg);
  const proteinKcal = protein * 4;
  const remaining = Math.max(0, calories - proteinKcal);
  const carbs = Math.round((remaining * carbPctRem) / 4);
  const fat = Math.round((remaining * fatPctRem) / 9);
  return { calories, protein, carbs, fat };
}

function calculateTargetSets(sessionDurationMinutes: number, experienceLevel: string): { targetLiftingMinutes: number; targetSets: number } {
  const targetLiftingMinutes = sessionDurationMinutes - 10;
  const avgMinutesPerSet = 2.3;
  let targetSets = Math.floor(targetLiftingMinutes / avgMinutesPerSet);

  if (experienceLevel === 'Beginner') targetSets = Math.max(targetSets, 10);
  else if (experienceLevel === 'Intermediate') targetSets = Math.max(targetSets, 16);
  else if (experienceLevel === 'Advanced') targetSets = Math.max(targetSets, 22);

  return { targetLiftingMinutes, targetSets };
}

// =====================================================================
// RULE-BASED WORKOUT ENGINE (replaces AI-driven workout generation)
// Spec: WORKOUT_TEMPLATE_LOGIC.md (30 Jun 2026, finalized 4 Jul 2026)
// Layers: A Split Selector, B Exercise Pool, C Selection Algorithm,
//         D Volume/Intensity (RIR/reps), E Progression W1–W4.
// Meal plan is still produced by the AI gateway call further below.
// =====================================================================

type WMuscle =
  | 'chest' | 'back' | 'shoulder' | 'bicep' | 'tricep'
  | 'quad' | 'hamstring' | 'calf' | 'core' | 'cardio';
type WLimitation =
  | 'knee' | 'lower_back' | 'shoulder' | 'wrist' | 'ankle'
  | 'hip' | 'elbow' | 'pregnancy' | 'none';
type WEquipment = 'gym' | 'bodyweight';
type WDifficulty = 'beginner' | 'intermediate' | 'advanced';
type WGoal = 'Hypertrophy' | 'Strength' | 'Fat Loss' | 'Body Recomposition' | 'General Fitness';
type WExp = 'Beginner' | 'Intermediate' | 'Advanced';

interface ExerciseDef {
  name: string;
  muscle: WMuscle;
  equipment: WEquipment;
  difficulty: WDifficulty;
  isCompound: boolean;
  excludedBy: WLimitation[];
}

// LAYER B — Exercise Pool (47 canonical exercises)
const EXERCISE_POOL: ExerciseDef[] = [
  // GYM — Chest
  { name: 'Barbell Bench Press',      muscle: 'chest',    equipment: 'gym', difficulty: 'intermediate', isCompound: true,  excludedBy: ['wrist'] },
  { name: 'Incline Barbell Press',    muscle: 'chest',    equipment: 'gym', difficulty: 'intermediate', isCompound: true,  excludedBy: ['shoulder'] },
  { name: 'Cable Crossover',          muscle: 'chest',    equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  // GYM — Back
  { name: 'Lat Pulldown',             muscle: 'back',     equipment: 'gym', difficulty: 'beginner',     isCompound: true,  excludedBy: [] },
  { name: 'T-Bar Row',                muscle: 'back',     equipment: 'gym', difficulty: 'intermediate', isCompound: true,  excludedBy: ['lower_back'] },
  { name: 'Face Pull',                muscle: 'back',     equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Barbell Upright Row',      muscle: 'back',     equipment: 'gym', difficulty: 'intermediate', isCompound: false, excludedBy: ['shoulder','wrist'] },
  // GYM — Shoulder
  { name: 'Seated Dumbbell Press',    muscle: 'shoulder', equipment: 'gym', difficulty: 'intermediate', isCompound: true,  excludedBy: ['shoulder'] },
  { name: 'Lateral Raise (Dumbbell)', muscle: 'shoulder', equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Machine Shoulder Press',   muscle: 'shoulder', equipment: 'gym', difficulty: 'beginner',     isCompound: true,  excludedBy: ['shoulder'] },
  // GYM — Bicep
  { name: 'Barbell Curl',             muscle: 'bicep',    equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: ['wrist'] },
  { name: 'Dumbbell Curl',            muscle: 'bicep',    equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Hammer Curl',              muscle: 'bicep',    equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Concentration Curl',       muscle: 'bicep',    equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  // GYM — Tricep
  { name: 'Tricep Pushdown (Cable)',  muscle: 'tricep',   equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Skull Crushers',           muscle: 'tricep',   equipment: 'gym', difficulty: 'intermediate', isCompound: false, excludedBy: ['elbow'] },
  // GYM — Quad
  { name: 'Box Squat',                muscle: 'quad',     equipment: 'gym', difficulty: 'beginner',     isCompound: true,  excludedBy: ['knee','hip'] },
  { name: 'Bulgarian Split Squat',    muscle: 'quad',     equipment: 'gym', difficulty: 'advanced',     isCompound: true,  excludedBy: ['knee','hip'] },
  { name: 'Dumbbell Lunge',           muscle: 'quad',     equipment: 'gym', difficulty: 'intermediate', isCompound: true,  excludedBy: ['knee','hip'] },
  // GYM — Hamstring
  { name: 'Romanian Deadlift (Dumbbell)', muscle: 'hamstring', equipment: 'gym', difficulty: 'intermediate', isCompound: true, excludedBy: ['lower_back'] },
  { name: 'Barbell Glute Bridge',     muscle: 'hamstring', equipment: 'gym', difficulty: 'intermediate', isCompound: true,  excludedBy: ['lower_back'] },
  { name: 'Glute Bridge',             muscle: 'hamstring', equipment: 'gym', difficulty: 'beginner',     isCompound: true,  excludedBy: [] },
  // GYM — Calf
  { name: 'Standing Calf Raise',      muscle: 'calf',     equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: ['ankle'] },
  { name: 'Seated Calf Raise',        muscle: 'calf',     equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: ['ankle'] },
  // GYM — Core
  { name: 'Forearm Plank',            muscle: 'core',     equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Dead Bug',                 muscle: 'core',     equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Side Plank (Knee Version)',muscle: 'core',     equipment: 'gym', difficulty: 'beginner',     isCompound: false, excludedBy: [] },

  // BODYWEIGHT — Chest
  { name: 'Push Up',                  muscle: 'chest',    equipment: 'bodyweight', difficulty: 'beginner',     isCompound: true,  excludedBy: ['shoulder','wrist'] },
  { name: 'Incline Push Up',          muscle: 'chest',    equipment: 'bodyweight', difficulty: 'beginner',     isCompound: true,  excludedBy: ['shoulder','wrist'] },
  // BODYWEIGHT — Back
  { name: 'Inverted Row',             muscle: 'back',     equipment: 'bodyweight', difficulty: 'intermediate', isCompound: true,  excludedBy: ['wrist'] },
  { name: 'Superman Hold',            muscle: 'back',     equipment: 'bodyweight', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Bird Dog',                 muscle: 'back',     equipment: 'bodyweight', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  // BODYWEIGHT — Tricep
  { name: 'Bench Dip',                muscle: 'tricep',   equipment: 'bodyweight', difficulty: 'intermediate', isCompound: true,  excludedBy: ['shoulder','wrist','elbow'] },
  { name: 'Close Grip Push Up',       muscle: 'tricep',   equipment: 'bodyweight', difficulty: 'intermediate', isCompound: true,  excludedBy: ['shoulder','wrist','elbow'] },
  // BODYWEIGHT — Quad
  { name: 'Reverse Lunge',            muscle: 'quad',     equipment: 'bodyweight', difficulty: 'beginner',     isCompound: true,  excludedBy: ['knee','hip','ankle'] },
  { name: 'Wall Sit',                 muscle: 'quad',     equipment: 'bodyweight', difficulty: 'beginner',     isCompound: false, excludedBy: ['knee','hip'] },
  // BODYWEIGHT — Hamstring
  { name: 'Glute Bridge',             muscle: 'hamstring', equipment: 'bodyweight', difficulty: 'beginner',    isCompound: true,  excludedBy: [] },
  { name: 'Single Leg Glute Bridge',  muscle: 'hamstring', equipment: 'bodyweight', difficulty: 'intermediate',isCompound: true,  excludedBy: [] },
  // BODYWEIGHT — Core
  { name: 'Forearm Plank',            muscle: 'core',     equipment: 'bodyweight', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Dead Bug',                 muscle: 'core',     equipment: 'bodyweight', difficulty: 'beginner',     isCompound: false, excludedBy: [] },
  { name: 'Hollow Body Hold',         muscle: 'core',     equipment: 'bodyweight', difficulty: 'advanced',     isCompound: false, excludedBy: [] },
  { name: 'Bicycle Crunch',           muscle: 'core',     equipment: 'bodyweight', difficulty: 'beginner',     isCompound: false, excludedBy: [] },

  // CARDIO FINISHER POOL (both equipment types eligible unless excluded)
  { name: 'Jumping Jack',             muscle: 'cardio',   equipment: 'bodyweight', difficulty: 'beginner',     isCompound: true,  excludedBy: ['ankle'] },
  { name: 'High Knees',               muscle: 'cardio',   equipment: 'bodyweight', difficulty: 'beginner',     isCompound: true,  excludedBy: ['ankle','hip'] },
  { name: 'Mountain Climber',         muscle: 'cardio',   equipment: 'bodyweight', difficulty: 'intermediate', isCompound: true,  excludedBy: ['shoulder','wrist','hip'] },
  { name: 'Jump Squat',               muscle: 'cardio',   equipment: 'bodyweight', difficulty: 'intermediate', isCompound: true,  excludedBy: ['knee','ankle'] },
  { name: 'Burpee',                   muscle: 'cardio',   equipment: 'bodyweight', difficulty: 'advanced',     isCompound: true,  excludedBy: ['lower_back','shoulder','wrist','ankle'] },
];

// LAYER A — Split Selector
type SessionType =
  | 'FB_A' | 'FB_B' | 'FB_C'
  | 'UL_UPPER_A' | 'UL_UPPER_B' | 'UL_LOWER_A' | 'UL_LOWER_B'
  | 'PPL_PUSH' | 'PPL_PULL' | 'PPL_LEGS'
  | 'WEAKPOINT';

function pickSessionOrder(days: number, exp: WExp): SessionType[] {
  const d = Math.max(2, Math.min(7, days));
  if (d === 2) return ['FB_A', 'FB_B'];
  if (d === 3) {
    if (exp === 'Advanced') return ['PPL_PUSH', 'PPL_PULL', 'PPL_LEGS'];
    return ['FB_A', 'FB_B', 'FB_C'];
  }
  if (d === 4) return ['UL_UPPER_A', 'UL_LOWER_A', 'UL_UPPER_B', 'UL_LOWER_B'];
  if (d === 5) {
    if (exp === 'Beginner') return ['UL_UPPER_A', 'UL_LOWER_A', 'UL_UPPER_B', 'UL_LOWER_B', 'FB_A'];
    if (exp === 'Intermediate') return ['PPL_PUSH', 'PPL_PULL', 'PPL_LEGS', 'UL_UPPER_A', 'UL_LOWER_A'];
    return ['PPL_PUSH', 'PPL_PULL', 'PPL_LEGS', 'UL_UPPER_A', 'UL_LOWER_A'];
  }
  if (d === 6) return ['PPL_PUSH', 'PPL_PULL', 'PPL_LEGS', 'PPL_PUSH', 'PPL_PULL', 'PPL_LEGS'];
  return ['PPL_PUSH', 'PPL_PULL', 'PPL_LEGS', 'PPL_PUSH', 'PPL_PULL', 'PPL_LEGS', 'WEAKPOINT'];
}

// Muscle-group priority list per session type (order = pick order).
// Compound-first ordering is enforced later within each muscle group.
const SESSION_TARGETS: Record<SessionType, WMuscle[]> = {
  FB_A:       ['chest', 'back', 'quad', 'core'],
  FB_B:       ['shoulder', 'back', 'hamstring', 'core'],
  FB_C:       ['chest', 'back', 'quad', 'tricep', 'bicep'],
  UL_UPPER_A: ['chest', 'back', 'shoulder', 'bicep', 'tricep'],
  UL_UPPER_B: ['back', 'chest', 'shoulder', 'tricep', 'bicep'],
  UL_LOWER_A: ['quad', 'hamstring', 'calf', 'core'],
  UL_LOWER_B: ['hamstring', 'quad', 'calf', 'core'],
  PPL_PUSH:   ['chest', 'shoulder', 'tricep'],
  PPL_PULL:   ['back', 'bicep', 'back'],
  PPL_LEGS:   ['quad', 'hamstring', 'calf', 'core'],
  WEAKPOINT:  ['core', 'bicep', 'tricep', 'shoulder'],
};

function sessionLabel(s: SessionType): string {
  switch (s) {
    case 'FB_A': return 'Full Body A';
    case 'FB_B': return 'Full Body B';
    case 'FB_C': return 'Full Body C';
    case 'UL_UPPER_A': return 'Upper Body A';
    case 'UL_UPPER_B': return 'Upper Body B';
    case 'UL_LOWER_A': return 'Lower Body A';
    case 'UL_LOWER_B': return 'Lower Body B';
    case 'PPL_PUSH': return 'Push';
    case 'PPL_PULL': return 'Pull';
    case 'PPL_LEGS': return 'Legs';
    case 'WEAKPOINT': return 'Weak-Point / Full Body';
  }
}

// LAYER C — Selection helpers
const MAX_PER_MUSCLE: Record<WMuscle, number> = {
  chest: 2, back: 2, shoulder: 2, bicep: 1, tricep: 1,
  quad: 2, hamstring: 1, calf: 1, core: 1, cardio: 3,
};

function exerciseCountRange(sessionMinutes: number): { min: number; max: number } {
  if (sessionMinutes <= 45) return { min: 3, max: 4 };
  if (sessionMinutes <= 60) return { min: 4, max: 5 };
  return { min: 5, max: 6 };
}

function cardioCountForDuration(sessionMinutes: number): number {
  if (sessionMinutes >= 75) return 3;
  if (sessionMinutes >= 45) return 2;
  return 0;
}

function isAllowedForExperience(ex: ExerciseDef, exp: WExp): boolean {
  if (ex.difficulty === 'advanced' && exp !== 'Advanced') return false;
  if (ex.difficulty === 'intermediate' && exp === 'Beginner') return false;
  return true;
}

function excludedByLimitations(ex: ExerciseDef, lims: WLimitation[]): boolean {
  return ex.excludedBy.some(l => lims.includes(l));
}

function filterPool(
  equipment: WEquipment,
  exp: WExp,
  lims: WLimitation[],
): ExerciseDef[] {
  return EXERCISE_POOL.filter(ex =>
    ex.equipment === equipment &&
    ex.muscle !== 'cardio' &&
    isAllowedForExperience(ex, exp) &&
    !excludedByLimitations(ex, lims)
  );
}

function filterCardioPool(
  exp: WExp,
  lims: WLimitation[],
): ExerciseDef[] {
  return EXERCISE_POOL.filter(ex =>
    ex.muscle === 'cardio' &&
    isAllowedForExperience(ex, exp) &&
    !excludedByLimitations(ex, lims)
  );
}

// Parse limitations free-text into structured tags. The form was designed to
// pass a comma-separated list of the 9 canonical categories, but we also
// accept common substring aliases (e.g. "shoulder pain", "knee injury").
function parseLimitations(raw: string | undefined | null): WLimitation[] {
  if (!raw) return [];
  const s = raw.toLowerCase();
  const found = new Set<WLimitation>();
  if (s.includes('knee')) found.add('knee');
  if (s.includes('lower back') || s.includes('lower_back') || s.includes('back pain')) found.add('lower_back');
  if (s.includes('shoulder')) found.add('shoulder');
  if (s.includes('wrist')) found.add('wrist');
  if (s.includes('ankle')) found.add('ankle');
  if (s.includes('hip')) found.add('hip');
  if (s.includes('elbow')) found.add('elbow');
  if (s.includes('pregnan')) found.add('pregnancy');
  if (s.includes('none') || s.trim() === '') found.add('none');
  return Array.from(found);
}

// C5 — Rotation memory: last exercise used per muscle group from previous plan.
function extractRotationMemory(prevPlanData: any): Partial<Record<WMuscle, string>> {
  const mem: Partial<Record<WMuscle, string>> = {};
  const wp = prevPlanData?.workout_plan;
  if (!Array.isArray(wp)) return mem;
  // Walk in reverse so "last used" wins per muscle.
  for (let i = wp.length - 1; i >= 0; i--) {
    const day = wp[i];
    if (!day?.exercises) continue;
    for (const ex of day.exercises) {
      const def = EXERCISE_POOL.find(p => p.name === ex.name);
      if (def && !mem[def.muscle]) mem[def.muscle] = def.name;
    }
  }
  return mem;
}

function selectSessionExercises(
  session: SessionType,
  pool: ExerciseDef[],
  cardioPool: ExerciseDef[],
  sessionMinutes: number,
  goal: WGoal,
  usedThisWeek: Set<string>,
  rotationMemory: Partial<Record<WMuscle, string>>,
): ExerciseDef[] {
  const { max: countCap } = exerciseCountRange(sessionMinutes);
  const needsCardioFinisher = goal === 'Fat Loss' || goal === 'General Fitness';
  const cardioCount = needsCardioFinisher ? cardioCountForDuration(sessionMinutes) : 0;
  const strengthCap = Math.max(countCap - cardioCount, exerciseCountRange(sessionMinutes).min);

  const perMuscleUsed: Partial<Record<WMuscle, number>> = {};
  const picked: ExerciseDef[] = [];

  const targetOrder = SESSION_TARGETS[session];

  // Two passes: 1) primary picks per target muscle (compound first),
  // 2) fill remaining slots with any allowed muscle.
  const pickForMuscle = (m: WMuscle): ExerciseDef | null => {
    const cap = MAX_PER_MUSCLE[m] ?? 1;
    if ((perMuscleUsed[m] ?? 0) >= cap) return null;
    const candidates = pool
      .filter(ex => ex.muscle === m && !usedThisWeek.has(ex.name))
      .sort((a, b) => Number(b.isCompound) - Number(a.isCompound));
    if (candidates.length === 0) return null;
    // Rotation-with-memory: exclude last-used if any alternative remains.
    const lastUsed = rotationMemory[m];
    let filtered = candidates;
    if (lastUsed && candidates.some(c => c.name !== lastUsed)) {
      filtered = candidates.filter(c => c.name !== lastUsed);
    }
    return filtered[0];
  };

  for (const m of targetOrder) {
    if (picked.length >= strengthCap) break;
    const ex = pickForMuscle(m);
    if (ex) {
      picked.push(ex);
      perMuscleUsed[m] = (perMuscleUsed[m] ?? 0) + 1;
      usedThisWeek.add(ex.name);
    }
  }

  // Fill remaining slots from any allowed muscle group in the pool.
  if (picked.length < strengthCap) {
    const allMuscles: WMuscle[] = ['chest','back','shoulder','quad','hamstring','tricep','bicep','core','calf'];
    for (const m of allMuscles) {
      while (picked.length < strengthCap) {
        const ex = pickForMuscle(m);
        if (!ex) break;
        picked.push(ex);
        perMuscleUsed[m] = (perMuscleUsed[m] ?? 0) + 1;
        usedThisWeek.add(ex.name);
      }
      if (picked.length >= strengthCap) break;
    }
  }

  // Compound-first ordering across the whole session (C3).
  picked.sort((a, b) => Number(b.isCompound) - Number(a.isCompound));

  // Append cardio finisher (goal-based only; count set by duration).
  if (needsCardioFinisher && cardioCount > 0 && cardioPool.length > 0) {
    // C6 — simple random per generate, still respect week uniqueness.
    const available = cardioPool.filter(c => !usedThisWeek.has(c.name));
    const shuffled = available.slice().sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, cardioCount);
    for (const c of chosen) usedThisWeek.add(c.name);
    // Fallback: if the goal requires N cardio but pool is exhausted for this
    // week, allow repetition (spec C4 applies to strength, not the small
    // 5-exercise cardio pool — repetition is acceptable).
    while (chosen.length < cardioCount && cardioPool.length > 0) {
      chosen.push(cardioPool[chosen.length % cardioPool.length]);
    }
    picked.push(...chosen);
  }

  return picked;
}

// LAYER D — Volume/Intensity
function repRange(goal: WGoal, isCompound: boolean): string {
  const compound: Record<WGoal, string> = {
    Strength: '3-6', Hypertrophy: '6-10', 'Body Recomposition': '6-10',
    'Fat Loss': '8-12', 'General Fitness': '8-12',
  };
  const isolation: Record<WGoal, string> = {
    Strength: '6-10', Hypertrophy: '10-15', 'Body Recomposition': '10-15',
    'Fat Loss': '12-15', 'General Fitness': '12-15',
  };
  return isCompound ? compound[goal] : isolation[goal];
}

function rirValue(goal: WGoal, exp: WExp, isCompound: boolean): number {
  const compound: Record<WGoal, Record<WExp, number>> = {
    Strength:            { Beginner: 3, Intermediate: 2, Advanced: 1 },
    Hypertrophy:         { Beginner: 4, Intermediate: 3, Advanced: 2 },
    'Body Recomposition':{ Beginner: 4, Intermediate: 3, Advanced: 2 },
    'Fat Loss':          { Beginner: 4, Intermediate: 3, Advanced: 2 },
    'General Fitness':   { Beginner: 4, Intermediate: 4, Advanced: 3 },
  };
  const isolation: Record<WGoal, Record<WExp, number>> = {
    Strength:            { Beginner: 3, Intermediate: 2, Advanced: 1 },
    Hypertrophy:         { Beginner: 3, Intermediate: 2, Advanced: 1 },
    'Body Recomposition':{ Beginner: 3, Intermediate: 2, Advanced: 1 },
    'Fat Loss':          { Beginner: 3, Intermediate: 2, Advanced: 2 },
    'General Fitness':   { Beginner: 3, Intermediate: 3, Advanced: 2 },
  };
  return (isCompound ? compound : isolation)[goal][exp];
}

function setsForGoal(goal: WGoal, exp: WExp): number {
  if (goal === 'Strength') return exp === 'Beginner' ? 3 : exp === 'Intermediate' ? 4 : 5;
  if (exp === 'Beginner') return 3;
  return exp === 'Intermediate' ? 3 : 4;
}

function restForCategory(goal: WGoal, isCompound: boolean): string {
  if (goal === 'Strength') return isCompound ? '180-240 seconds' : '90-120 seconds';
  if (isCompound) return '90-180 seconds';
  return '60-90 seconds';
}

function estMinutesPerSet(isCompound: boolean, isCardio: boolean): number {
  if (isCardio) return 1;
  return isCompound ? 2.5 : 1.75;
}

// LAYER E — Progression W1–W4
interface ExerciseOutput {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tempo: string;
  cues: string;
  alternative: string;
  estimatedTimeMinutes: number;
  weight_kg: string;
  intensity_pct: string;
  rir: number | null;
  notes: string;
}

function applyProgression(
  base: ExerciseOutput,
  week: 1 | 2 | 3 | 4,
  isCompound: boolean,
  isCardio: boolean,
): ExerciseOutput {
  if (isCardio) return { ...base, notes: `Week ${week} conditioning finisher — steady effort.` };
  const [lo, hi] = base.reps.split('-').map(n => parseInt(n, 10));
  const rirBase = base.rir ?? 2;
  if (week === 1) {
    return { ...base, reps: `${lo}`, rir: rirBase, notes: 'Week 1 — build baseline, focus on form.' };
  }
  if (week === 2) {
    return { ...base, reps: `${Math.min(lo + 2, hi)}`, rir: rirBase, notes: 'Week 2 — same weight, add reps.' };
  }
  if (week === 3) {
    return { ...base, reps: `${hi}`, rir: Math.max(rirBase - 1, 0),
      notes: 'Week 3 — top of rep range, closer to failure.' };
  }
  // W4 deload
  return {
    ...base,
    reps: `${lo}`,
    rir: rirBase + 1,
    weight_kg: base.weight_kg === 'Bodyweight' ? 'Bodyweight' : `${base.weight_kg} (-15%)`,
    intensity_pct: base.intensity_pct === 'Bodyweight' ? 'Bodyweight' : '~60%',
    notes: 'Deload week — reduce load, recover for next cycle.',
  };
}

// Extension-month W1 baseline: prev W3 reps AND prev W3 weight for same exercise.
// W3 is the high end of the rep range (top of cycle). W4 is deload, so it must
// not be used as the carry-forward source.
function extensionBaselineFor(exName: string, prevPlanData: any): { reps?: string; weight_kg?: string } {
  if (!prevPlanData?.workout_plan) return {};
  const wp: any[] = prevPlanData.workout_plan;
  // Group by week (7 entries each).
  const w3 = wp.slice(14, 21);
  const findEx = (week: any[]) => {
    for (const d of week) {
      if (!d?.exercises) continue;
      const hit = d.exercises.find((e: any) => e.name === exName);
      if (hit) return hit;
    }
    return null;
  };
  const prev = findEx(w3);
  return { reps: prev?.reps, weight_kg: prev?.weight_kg };
}

function buildExerciseOutput(
  ex: ExerciseDef,
  goal: WGoal,
  exp: WExp,
  week: 1 | 2 | 3 | 4,
  equipment: WEquipment,
  prevPlanData: any | null,
): ExerciseOutput {
  const isCardio = ex.muscle === 'cardio';
  const compound = ex.isCompound && !isCardio;
  const rir = isCardio ? null : rirValue(goal, exp, compound);
  const reps = isCardio ? '30-45 seconds' : repRange(goal, compound);
  const sets = isCardio ? '1' : String(setsForGoal(goal, exp));
  const rest = isCardio ? '30 seconds' : restForCategory(goal, compound);
  const tempo = isCardio ? '—' : `${rir ?? 2}010`;
  const bodyweight = equipment === 'bodyweight' || isCardio;
  const baseWeight = bodyweight ? 'Bodyweight' : (compound ? '20-40 kg' : '5-15 kg');
  const baseIntensity = bodyweight ? 'Bodyweight' : (compound ? '~70%' : '~60%');

  const base: ExerciseOutput = {
    name: ex.name,
    sets,
    reps,
    rest,
    tempo,
    cues: isCardio ? 'Steady breathing, controlled cadence.' :
          compound ? 'Brace core, controlled eccentric, full range of motion.' :
                     'Slow controlled tempo, squeeze target muscle at peak.',
    alternative: '',
    estimatedTimeMinutes: Math.round(parseInt(sets) * estMinutesPerSet(compound, isCardio)),
    weight_kg: baseWeight,
    intensity_pct: baseIntensity,
    rir,
    notes: '',
  };

  // Extension-month W1 override: both reps AND weight from prev W3 (top of prior cycle).
  if (week === 1 && prevPlanData) {
    const carry = extensionBaselineFor(ex.name, prevPlanData);
    if (carry.reps) base.reps = carry.reps;
    if (carry.weight_kg) base.weight_kg = carry.weight_kg;
  }

  return applyProgression(base, week, compound, isCardio);
}

function formatDayLabel(week: number, dayIdx: number, startDate: Date): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + (week - 1) * 7 + dayIdx);
  const weekday = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  const iso = d.toISOString().slice(0, 10);
  return `Week ${week} - ${weekday}, ${iso}`;
}

interface WorkoutEngineInput {
  goal: WGoal;
  experience: WExp;
  trainingDaysPerWeek: number;
  sessionMinutes: number;
  equipment: WEquipment;
  limitations: WLimitation[];
  startDate: Date;
  prevPlanData: any | null;
}

interface WorkoutEngineOutput {
  weeklySplit: string[];
  weekly_schedule: string[];
  workout_plan: Array<{ day: string; exercises: ExerciseOutput[] }>;
  warmUp: string;
  coolDown: string;
  progressionRules: string;
  deloadWeek: string;
  recoveryTips: string;
  safety_notes: string[];
  warnings: string[];
  programOverview: string;
  estimatedSessionTimeMinutes: number;
}

function generateWorkout(input: WorkoutEngineInput): WorkoutEngineOutput {
  const { goal, experience, trainingDaysPerWeek, sessionMinutes, equipment,
          limitations, startDate, prevPlanData } = input;

  const sessionOrder = pickSessionOrder(trainingDaysPerWeek, experience);
  const pool = filterPool(equipment, experience, limitations);
  const cardioPool = filterCardioPool(experience, limitations);
  const rotationMemory = extractRotationMemory(prevPlanData);

  // Distribute training days evenly across the 7-day week: place training on
  // the first `trainingDaysPerWeek` days, then rest for the remainder. This
  // matches the deterministic pattern users expect from a rule-based engine.
  const trainingDayIndexes: number[] = [];
  for (let i = 0; i < trainingDaysPerWeek; i++) trainingDayIndexes.push(i);

  const weeklySplit: string[] = sessionOrder.map((s, i) =>
    `Day ${i + 1}: ${sessionLabel(s)}`
  );
  const weekly_schedule: string[] = [];
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  for (let d = 0; d < 7; d++) {
    const trainingSlot = trainingDayIndexes.indexOf(d);
    if (trainingSlot >= 0) {
      weekly_schedule.push(`${dayNames[d]}: ${sessionLabel(sessionOrder[trainingSlot])}`);
    } else {
      weekly_schedule.push(`${dayNames[d]}: Rest`);
    }
  }

  const workout_plan: Array<{ day: string; exercises: ExerciseOutput[] }> = [];

  for (let week = 1 as 1 | 2 | 3 | 4; week <= 4; week = (week + 1) as any) {
    const usedThisWeek = new Set<string>();
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayLabel = formatDayLabel(week, dayIdx, startDate);
      const trainingSlot = trainingDayIndexes.indexOf(dayIdx);
      if (trainingSlot < 0) {
        workout_plan.push({ day: dayLabel + ' — Rest Day', exercises: [] });
        continue;
      }
      const session = sessionOrder[trainingSlot];
      const picks = selectSessionExercises(
        session, pool, cardioPool, sessionMinutes, goal, usedThisWeek, rotationMemory
      );
      const exercises = picks.map(ex =>
        buildExerciseOutput(ex, goal, experience, week, equipment, prevPlanData)
      );
      workout_plan.push({ day: dayLabel, exercises });
    }
  }

  const warmUp = equipment === 'gym'
    ? '5-7 min: (1) 5 min light cardio (treadmill/bike/marching); (2) Arm circles 10x each direction; (3) Leg swings 10x per leg; (4) Bodyweight squat 10x; (5) Cat-cow stretch 30s.'
    : '5-7 min: (1) Marching/light jumping jacks 2-3 min; (2) Arm circles 10x each direction; (3) Leg swings 10x per leg; (4) Bodyweight squat 10x; (5) Cat-cow stretch 30s.';

  const coolDown = '5 min: (1) Easy walk/march in place 1-2 min, breathing focus; (2) Static hamstring stretch 30s per leg; (3) Static quad stretch 30s per leg; (4) Static chest/shoulder stretch 30s per side; (5) Deep breathing 5 breaths.';

  const progressionRules = 'W1: baseline reps at the low end of the rep range. W2: +1-2 reps at the same weight. W3: top of the rep range, RIR -1 (closer to failure). W4: deload — reduce load ~15% and return reps to the low end.';
  const deloadWeek = 'Week 4 is a planned deload: reduce weight by ~15%, drop reps back to the low end, and prioritize clean technique so you enter the next cycle recovered.';

  const recoveryTips = 'Sleep 7-9 hours nightly, hit your daily protein target, walk 6-8k steps on rest days, and stretch 5-10 min after every session.';
  const safety_notes: string[] = [
    'Warm up before every session and cool down afterward.',
    'Stop any exercise that causes sharp or radiating pain and consult a professional.',
  ];
  if (limitations.includes('pregnancy')) {
    safety_notes.push('Pregnancy: consult your doctor or OB-GYN before starting this program.');
  }
  const warnings: string[] = [];

  const programOverview = `A rule-based ${trainingDaysPerWeek}-day ${sessionLabel(sessionOrder[0])}-anchored program tuned for ${goal} at ${experience} level. Weeks 1-3 progress linearly; week 4 deloads to consolidate gains.`;

  return {
    weeklySplit,
    weekly_schedule,
    workout_plan,
    warmUp,
    coolDown,
    progressionRules,
    deloadWeek,
    recoveryTips,
    safety_notes,
    warnings,
    programOverview,
    estimatedSessionTimeMinutes: sessionMinutes,
  };
}

function normalizeGoal(raw: string | undefined | null, programType: string | undefined | null): WGoal {
  const s = (raw || '').toLowerCase();
  if (s.includes('strength')) return 'Strength';
  if (s.includes('hypertroph')) return 'Hypertrophy';
  if (s.includes('fat') || s.includes('cut') || s.includes('lean')) return 'Fat Loss';
  if (s.includes('recomp')) return 'Body Recomposition';
  if (s.includes('general') || s.includes('fitness') || s.includes('health')) return 'General Fitness';
  // Fall back via programType
  const p = (programType || '').toLowerCase();
  if (p.includes('bulk')) return 'Hypertrophy';
  if (p.includes('cut')) return 'Fat Loss';
  return 'General Fitness';
}

function normalizeEquipment(raw: unknown): WEquipment {
  const s = Array.isArray(raw) ? raw.join(',').toLowerCase() : String(raw || '').toLowerCase();
  if (!s || s.includes('bodyweight') && !s.includes('gym') && !s.includes('barbell') && !s.includes('dumbbell') && !s.includes('cable') && !s.includes('machine')) {
    return 'bodyweight';
  }
  return 'gym';
}

// =====================================================================
// RULE-BASED MEAL ENGINE (Prompt 4 — replaces AI-driven meal generation)
// Spec: MEAL_TEMPLATE_LOGIC.md. Fully deterministic; no AI call remains.
//
// Output-shape contract:
//   - Field NAMES (meal_plan, calorie_target, protein, carbs, fat,
//     water_liters, motivational_message, grocery_list,
//     estimated_calories_burned, weight_projection) are preserved 1:1.
//   - `foods` and `grocery_list` entries are i18n-key strings using
//     " · " separator: "food.<key> · <grams>g · <qty>x".
//     Client resolves via t[key] in Results.tsx / exportPdf.ts.
//   - `motivational_message` and `weight_projection` change shape from
//     `string` to `{ key: string, params: Record<string, string|number> }`.
//     DELIBERATE, NARROW EXCEPTION to the "preserve every field 1:1" rule
//     — confirmed by product in Prompt 4 to avoid duplicating translations
//     inside the edge function. Do NOT expand this exception to other
//     fields without an explicit product decision.
//
// Composer notes (implementation choices, NOT in spec):
//   - Greedy pick order: protein → carb → veg-or-fruit → optional fat.
//   - Vegetable vs fruit toggle: slots >= 20% of daily kcal get a
//     vegetable, smaller snack slots get a fruit.
//   - Rotation across days uses (dayIdx + slotIdx + roleOffset) %
//     poolLen for a stable-yet-varied 7-day menu.
//   These choices were explicitly accepted, not silently assumed.
// =====================================================================
type MFoodCat = 'protein' | 'carb' | 'vegetable' | 'fruit' | 'fat';
type MStyle = 'local' | 'western' | 'asian' | 'high-protein' | 'budget' | 'premium';
type MDiet = 'omnivore' | 'vegetarian' | 'vegan';
type MAllergen = 'dairy' | 'eggs' | 'fish' | 'shellfish' | 'nuts' | 'peanuts' | 'soy' | 'gluten';

interface MFood {
  id: string;             // stable i18n key suffix (matches "food.<id>")
  cat: MFoodCat;
  styles: MStyle[];
  diets: MDiet[];
  allergens: MAllergen[];
  g: number;              // reference portion grams
  kcal: number; p: number; c: number; f: number; // macros per reference portion
}

// Reference portions calibrated for realistic Indonesian/Western servings.
const MEAL_FOOD_DB: MFood[] = [
  // ---------- Proteins ----------
  { id: 'dada_ayam_panggang',   cat: 'protein', styles: ['local','western','asian','high-protein','budget','premium'], diets: ['omnivore'],                    allergens: [],           g: 100, kcal: 165, p: 31, c: 0,  f: 4 },
  { id: 'ayam_goreng_dada',     cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore'],                    allergens: [],           g: 100, kcal: 220, p: 25, c: 2,  f: 13 },
  { id: 'ayam_goreng_paha',     cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore'],                    allergens: [],           g: 100, kcal: 250, p: 22, c: 2,  f: 18 },
  { id: 'ayam_sayap_goreng',    cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore'],                    allergens: [],           g: 100, kcal: 260, p: 22, c: 1,  f: 19 },
  { id: 'ayam_suwir_kecap',     cat: 'protein', styles: ['local','asian'],                                              diets: ['omnivore'],                    allergens: ['soy'],      g: 100, kcal: 200, p: 25, c: 5,  f: 8 },
  { id: 'dada_kalkun_panggang', cat: 'protein', styles: ['western','high-protein','premium'],                            diets: ['omnivore'],                    allergens: [],           g: 100, kcal: 145, p: 30, c: 0,  f: 2 },
  { id: 'ikan_kembung_bakar',   cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore'],                    allergens: ['fish'],     g: 100, kcal: 155, p: 20, c: 0,  f: 8 },
  { id: 'ikan_kembung_goreng',  cat: 'protein', styles: ['local','budget'],                                              diets: ['omnivore'],                    allergens: ['fish'],     g: 100, kcal: 200, p: 20, c: 1,  f: 13 },
  { id: 'ikan_lele_goreng',     cat: 'protein', styles: ['local','budget'],                                              diets: ['omnivore'],                    allergens: ['fish'],     g: 100, kcal: 190, p: 18, c: 1,  f: 12 },
  { id: 'ikan_tuna_kalengan',   cat: 'protein', styles: ['western','high-protein','asian'],                              diets: ['omnivore'],                    allergens: ['fish'],     g: 100, kcal: 130, p: 28, c: 0,  f: 2 },
  { id: 'udang_rebus',          cat: 'protein', styles: ['asian','western','premium','high-protein'],                    diets: ['omnivore'],                    allergens: ['shellfish'],g: 100, kcal: 100, p: 24, c: 0,  f: 1 },
  { id: 'daging_sapi_semur',    cat: 'protein', styles: ['local','asian','premium'],                                     diets: ['omnivore'],                    allergens: ['soy'],      g: 100, kcal: 250, p: 22, c: 5,  f: 16 },
  { id: 'telur_rebus',          cat: 'protein', styles: ['local','western','asian','high-protein','budget','premium'], diets: ['omnivore','vegetarian'],       allergens: ['eggs'],     g: 100, kcal: 155, p: 13, c: 1,  f: 11 },
  { id: 'telur_dadar',          cat: 'protein', styles: ['local','western','asian','budget'],                            diets: ['omnivore','vegetarian'],       allergens: ['eggs'],     g: 100, kcal: 200, p: 13, c: 1,  f: 16 },
  { id: 'telur_dadar_tepung',   cat: 'protein', styles: ['local','budget'],                                              diets: ['omnivore','vegetarian'],       allergens: ['eggs','gluten'], g: 100, kcal: 220, p: 12, c: 8, f: 15 },
  { id: 'putih_telur',          cat: 'protein', styles: ['western','high-protein','premium'],                            diets: ['omnivore','vegetarian'],       allergens: ['eggs'],     g: 100, kcal: 52,  p: 11, c: 1,  f: 0 },
  { id: 'tempe_goreng',         cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore','vegetarian','vegan'], allergens: ['soy'],    g: 100, kcal: 220, p: 18, c: 9,  f: 14 },
  { id: 'tempe_panggang',       cat: 'protein', styles: ['local','asian','high-protein','premium'],                     diets: ['omnivore','vegetarian','vegan'], allergens: ['soy'],    g: 100, kcal: 190, p: 19, c: 9,  f: 11 },
  { id: 'tahu_goreng',          cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore','vegetarian','vegan'], allergens: ['soy'],    g: 100, kcal: 180, p: 10, c: 5,  f: 14 },
  { id: 'greek_yogurt',         cat: 'protein', styles: ['western','high-protein','premium'],                            diets: ['omnivore','vegetarian'],       allergens: ['dairy'],    g: 150, kcal: 130, p: 15, c: 8,  f: 4 },
  { id: 'keju_cheddar',         cat: 'protein', styles: ['western','premium'],                                           diets: ['omnivore','vegetarian'],       allergens: ['dairy'],    g: 30,  kcal: 120, p: 7,  c: 1,  f: 10 },
  { id: 'whey_protein',         cat: 'protein', styles: ['western','high-protein','premium'],                            diets: ['omnivore','vegetarian'],       allergens: ['dairy'],    g: 30,  kcal: 120, p: 24, c: 3,  f: 1 },
  // MEAL_TEMPLATE_LOGIC.md §3 restricts lentils to High-Protein Fitness style only.
  { id: 'lentil_rebus',         cat: 'protein', styles: ['high-protein'],                                                 diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 175, p: 13, c: 30, f: 1 },
  { id: 'kacang_merah_rebus',   cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 190, p: 13, c: 34, f: 1 },
  { id: 'kacang_hijau_rebus',   cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 165, p: 12, c: 30, f: 1 },
  { id: 'kacang_tanah_sangrai', cat: 'protein', styles: ['local','asian','budget'],                                     diets: ['omnivore','vegetarian','vegan'], allergens: ['peanuts'],g: 30,  kcal: 170, p: 8,  c: 5,  f: 14 },
  // ---------- Carbs ----------
  { id: 'nasi_putih',           cat: 'carb', styles: ['local','asian','budget'],                                        diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 195, p: 4,  c: 43, f: 1 },
  { id: 'nasi_merah',           cat: 'carb', styles: ['local','asian','high-protein','premium'],                        diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 165, p: 4,  c: 34, f: 1 },
  { id: 'mie_rebus',            cat: 'carb', styles: ['local','asian','budget'],                                        diets: ['omnivore','vegetarian','vegan'], allergens: ['gluten'], g: 150, kcal: 210, p: 6,  c: 40, f: 1 },
  { id: 'kentang_rebus',        cat: 'carb', styles: ['western','local','budget'],                                       diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 130, p: 3,  c: 30, f: 0 },
  { id: 'ubi_jalar_rebus',      cat: 'carb', styles: ['local','high-protein','budget'],                                 diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 130, p: 2,  c: 30, f: 0 },
  { id: 'ubi_jalar_panggang',   cat: 'carb', styles: ['high-protein','premium','western','asian'],                       diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 135, p: 2,  c: 31, f: 0 },
  { id: 'singkong_rebus',       cat: 'carb', styles: ['local','budget'],                                                diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 240, p: 2,  c: 58, f: 0 },
  { id: 'jagung_rebus',         cat: 'carb', styles: ['local','asian','budget'],                                        diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 130, p: 5,  c: 27, f: 2 },
  { id: 'oatmeal',              cat: 'carb', styles: ['western','high-protein','premium','asian'],                      diets: ['omnivore','vegetarian','vegan'], allergens: ['gluten'], g: 50,  kcal: 190, p: 7,  c: 33, f: 3 },
  // MEAL_TEMPLATE_LOGIC.md §3 restricts quinoa to High-Protein Fitness style only.
  { id: 'quinoa_rebus',         cat: 'carb', styles: ['high-protein'],                                                    diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 180, p: 6,  c: 33, f: 3 },
  // ---------- Vegetables ----------
  { id: 'bayam_tumis',          cat: 'vegetable', styles: ['local','asian','budget','high-protein','premium'],           diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 45,  p: 3,  c: 4,  f: 2 },
  { id: 'kangkung_tumis',       cat: 'vegetable', styles: ['local','asian','budget'],                                    diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 40,  p: 2,  c: 4,  f: 2 },
  { id: 'brokoli_kukus',        cat: 'vegetable', styles: ['western','high-protein','premium','asian'],                  diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 35,  p: 3,  c: 7,  f: 0 },
  { id: 'kol_rebus',            cat: 'vegetable', styles: ['local','budget','asian'],                                    diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 25,  p: 1,  c: 5,  f: 0 },
  { id: 'wortel_rebus',         cat: 'vegetable', styles: ['local','western','budget','premium','asian'],                diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 35,  p: 1,  c: 8,  f: 0 },
  { id: 'jamur_tiram_tumis',    cat: 'vegetable', styles: ['asian','western','premium','local'],                          diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 55,  p: 3,  c: 5,  f: 3 },
  { id: 'tauge_tumis',          cat: 'vegetable', styles: ['local','asian','budget'],                                    diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 30,  p: 3,  c: 5,  f: 0 },
  { id: 'terong_balado',        cat: 'vegetable', styles: ['local','asian','budget'],                                    diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 60,  p: 1,  c: 8,  f: 3 },
  { id: 'timun',                cat: 'vegetable', styles: ['local','western','asian','budget'],                          diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 15,  p: 1,  c: 3,  f: 0 },
  // ---------- Fruits ----------
  { id: 'pisang_ambon',         cat: 'fruit', styles: ['local','budget','high-protein'],                                 diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 120, kcal: 105, p: 1,  c: 27, f: 0 },
  { id: 'apel',                 cat: 'fruit', styles: ['western','premium','local'],                                     diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 80,  p: 0,  c: 22, f: 0 },
  { id: 'jeruk',                cat: 'fruit', styles: ['local','asian','budget','premium','western'],                    diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 75,  p: 1,  c: 19, f: 0 },
  { id: 'pepaya',               cat: 'fruit', styles: ['local','asian','budget'],                                        diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 60,  p: 1,  c: 15, f: 0 },
  { id: 'semangka',             cat: 'fruit', styles: ['local','asian','budget'],                                        diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 150, kcal: 45,  p: 1,  c: 12, f: 0 },
  { id: 'alpukat',              cat: 'fruit', styles: ['western','premium','high-protein','local'],                       diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 160, p: 2,  c: 9,  f: 15 },
  // ---------- Fats ----------
  { id: 'minyak_zaitun',        cat: 'fat', styles: ['western','premium','high-protein'],                                diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 15,  kcal: 120, p: 0,  c: 0,  f: 14 },
  { id: 'minyak_kelapa_sawit',  cat: 'fat', styles: ['local','budget'],                                                  diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 15,  kcal: 120, p: 0,  c: 0,  f: 14 },
  { id: 'kacang_almond',        cat: 'fat', styles: ['western','high-protein','premium'],                                diets: ['omnivore','vegetarian','vegan'], allergens: ['nuts'],   g: 30,  kcal: 170, p: 6,  c: 6,  f: 15 },
  { id: 'selai_kacang',         cat: 'fat', styles: ['western','high-protein','premium'],                                diets: ['omnivore','vegetarian','vegan'], allergens: ['peanuts'],g: 30,  kcal: 190, p: 8,  c: 6,  f: 16 },
  { id: 'santan_kelapa',        cat: 'fat', styles: ['local','asian','budget'],                                          diets: ['omnivore','vegetarian','vegan'], allergens: [],         g: 100, kcal: 200, p: 2,  c: 3,  f: 21 },
];

// Parse the free-text allergies field into structured allergen tokens.
// Accepts EN/ID/ZH keywords; anything unrecognized is ignored.
//
// BUGFIX (Prompt 4 review #1): "shellfish" contains "fish" as a substring,
// so a naive `String.includes('fish')` would incorrectly flag a shellfish-only
// allergy as also being a fish allergy — filtering out ikan_kembung_*/ikan_lele_*
// (which are tagged `['fish']`) when the user only listed shellfish/udang/etc.
// Fix: for ASCII terms match on word boundaries; for CJK terms (no word
// boundaries in Unicode class \b) use plain includes but check the longer
// compound tokens first and short-circuit substring collisions explicitly.
function parseAllergens(raw: unknown): MAllergen[] {
  if (!raw) return [];
  const s = String(raw).toLowerCase();
  const out = new Set<MAllergen>();
  const map: Array<[MAllergen, string[]]> = [
    ['dairy',     ['dairy','milk','laktosa','susu','奶','乳']],
    ['eggs',      ['egg','telur','蛋']],
    ['shellfish', ['shellfish','shrimp','prawn','udang','crab','kepiting','虾','贝','蟹']],
    ['fish',      ['fish','ikan','鱼']],
    ['nuts',      ['nut','almond','tree nut','kacang pohon','坚果','杏仁']],
    ['peanuts',   ['peanut','kacang tanah','花生']],
    ['soy',       ['soy','soya','kedelai','tempe','tahu','大豆']],
    ['gluten',    ['gluten','wheat','gandum','麸','小麦']],
  ];
  const isAscii = (t: string) => /^[\x00-\x7f]+$/.test(t);
  const matches = (term: string): boolean => {
    if (isAscii(term)) {
      // Word-boundary match so "fish" does NOT match inside "shellfish".
      const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      return re.test(s);
    }
    return s.includes(term);
  };
  for (const [a, terms] of map) if (terms.some(matches)) out.add(a);
  return Array.from(out);
}

function normalizeStyle(raw: unknown): MStyle {
  const s = String(raw || 'local').toLowerCase();
  if (['local','western','asian','high-protein','budget','premium'].includes(s)) return s as MStyle;
  return 'local';
}
function normalizeDiet(raw: unknown): MDiet {
  const s = String(raw || 'omnivore').toLowerCase();
  if (s === 'vegan' || s === 'vegetarian') return s as MDiet;
  return 'omnivore';
}

function filterFoods(style: MStyle, diet: MDiet, allergens: MAllergen[]): MFood[] {
  return MEAL_FOOD_DB.filter(f =>
    f.styles.includes(style) &&
    f.diets.includes(diet) &&
    !f.allergens.some(a => allergens.includes(a))
  );
}
// If style filter empties any category, drop style constraint for that category.
function filterWithFallback(style: MStyle, diet: MDiet, allergens: MAllergen[]) {
  const primary = filterFoods(style, diet, allergens);
  const byCat = (cat: MFoodCat) => {
    const p = primary.filter(f => f.cat === cat);
    if (p.length) return p;
    return MEAL_FOOD_DB.filter(f => f.cat === cat && f.diets.includes(diet) && !f.allergens.some(a => allergens.includes(a)));
  };
  return {
    protein: byCat('protein'),
    carb: byCat('carb'),
    vegetable: byCat('vegetable'),
    fruit: byCat('fruit'),
    fat: byCat('fat'),
  };
}

// Calorie distribution across N meals per day.
const MEAL_DIST: Record<number, number[]> = {
  3: [0.30, 0.40, 0.30],
  4: [0.25, 0.15, 0.35, 0.25],
  5: [0.22, 0.12, 0.30, 0.12, 0.24],
  6: [0.20, 0.10, 0.28, 0.10, 0.22, 0.10],
};
const MEAL_TIMES_NORMAL: Record<number, string[]> = {
  3: ['07:00','12:30','19:00'],
  4: ['07:00','10:00','13:00','19:00'],
  5: ['07:00','10:00','13:00','16:00','19:00'],
  6: ['07:00','10:00','13:00','16:00','19:00','21:00'],
};
const MEAL_TIMES_IF: Record<number, string[]> = {
  // MEAL_TEMPLATE_LOGIC.md §5 IF window shift — slot 2 for freq=3 is 15:30, not 16:00.
  3: ['12:00','15:30','19:30'],
  4: ['12:00','14:30','17:00','19:30'],
  5: ['12:00','14:00','16:00','18:00','19:45'],
  6: ['12:00','13:30','15:00','16:30','18:00','19:45'],
};
const MEAL_NAME_KEYS: Record<number, string[]> = {
  3: ['meal.breakfast','meal.lunch','meal.dinner'],
  4: ['meal.breakfast','meal.snackMorning','meal.lunch','meal.dinner'],
  5: ['meal.breakfast','meal.snackMorning','meal.lunch','meal.snackAfternoon','meal.dinner'],
  6: ['meal.breakfast','meal.snackMorning','meal.lunch','meal.snackAfternoon','meal.dinner','meal.snackEvening'],
};
// MEAL_TEMPLATE_LOGIC.md §5: in Intermittent Fasting mode, slot labels become
// generic "Meal 1..N" rather than breakfast/lunch/dinner (the fast skips the
// morning slot semantically). Keys resolve client-side via t().
const MEAL_NAME_KEYS_IF: Record<number, string[]> = {
  3: ['meal.meal1','meal.meal2','meal.meal3'],
  4: ['meal.meal1','meal.meal2','meal.meal3','meal.meal4'],
  5: ['meal.meal1','meal.meal2','meal.meal3','meal.meal4','meal.meal5'],
  6: ['meal.meal1','meal.meal2','meal.meal3','meal.meal4','meal.meal5','meal.meal6'],
};

function clampFreq(raw: unknown): 3 | 4 | 5 | 6 {
  const n = parseInt(String(raw));
  if (n === 3 || n === 4 || n === 5 || n === 6) return n;
  return 4;
}
function pickQty(referenceKcal: number, targetKcal: number): number {
  // Snap qty to {0.5, 1, 1.5, 2} — reference portion nearest target kcal.
  const options = [0.5, 1, 1.5, 2];
  let best = 1, bestDiff = Infinity;
  for (const q of options) {
    const d = Math.abs(referenceKcal * q - targetKcal);
    if (d < bestDiff) { bestDiff = d; best = q; }
  }
  return best;
}
function encodeFood(f: MFood, qty: number): string {
  // Consumer contract: split on " · ", parts = [foodKey, "<g>g", "<qty>x"].
  return `food.${f.id} · ${Math.round(f.g * qty)}g · ${qty}x`;
}
function pickRotated(arr: MFood[], dayIdx: number, slotIdx: number, roleOffset: number): MFood | null {
  if (!arr.length) return null;
  return arr[(dayIdx * 3 + slotIdx * 5 + roleOffset) % arr.length];
}

interface MealPlanInput {
  calorieTarget: number; proteinG: number; carbsG: number; fatG: number;
  freq: 3 | 4 | 5 | 6; intermittentFasting: boolean;
  style: MStyle; diet: MDiet; allergens: MAllergen[];
  name: string; goalProgramType: string;
  weightKg: number; workoutDays: number; sessionMin: number; extensionMonth: number | null;
}

function buildMealPlan(input: MealPlanInput) {
  const pools = filterWithFallback(input.style, input.diet, input.allergens);
  const dist = MEAL_DIST[input.freq];
  const times = input.intermittentFasting ? MEAL_TIMES_IF[input.freq] : MEAL_TIMES_NORMAL[input.freq];
  // §5: IF mode uses generic "Meal 1..N" keys; normal mode keeps semantic slot names.
  const nameKeys = input.intermittentFasting
    ? MEAL_NAME_KEYS_IF[input.freq]
    : MEAL_NAME_KEYS[input.freq];

  // Aggregate grocery counts across the 7-day cycle: id -> total grams.
  const groceryGrams: Record<string, number> = {};
  const bump = (f: MFood, qty: number) => {
    groceryGrams[f.id] = (groceryGrams[f.id] || 0) + Math.round(f.g * qty);
  };

  // Build 7 days, return DAY 1 as the canonical meal_plan (matches
  // legacy shape: 1 day of representative meals). Grocery list is the
  // 7-day aggregate so shopping covers the full week.
  let day1Meals: any[] = [];
  for (let day = 0; day < 7; day++) {
    const meals: any[] = [];
    for (let slot = 0; slot < input.freq; slot++) {
      const slotPct = dist[slot];
      const slotKcal = Math.round(input.calorieTarget * slotPct);
      const isMainSlot = slotPct >= 0.20;

      const protein = pickRotated(pools.protein, day, slot, 0);
      const carb = pickRotated(pools.carb, day, slot, 1);
      const veg = isMainSlot ? pickRotated(pools.vegetable, day, slot, 2) : null;
      const fruit = !isMainSlot ? pickRotated(pools.fruit, day, slot, 2) : null;
      const wantFat = isMainSlot && slotKcal > 500;
      const fat = wantFat ? pickRotated(pools.fat, day, slot, 3) : null;

      // Scale qty greedily: proteins target ~35%, carbs ~35%, veg/fruit ~15%, fat ~15%.
      const parts: { f: MFood | null; frac: number }[] = [
        { f: protein, frac: 0.35 },
        { f: carb,    frac: 0.35 },
        { f: veg || fruit, frac: 0.15 },
        { f: fat,     frac: 0.15 },
      ];
      // Initial greedy pick — snap each part's qty to {0.5,1,1.5,2}
      // nearest its intra-slot target kcal.
      const picks: { f: MFood; qty: number }[] = [];
      let kcalSum = 0;
      for (const part of parts) {
        if (!part.f) continue;
        const targetKcal = slotKcal * part.frac;
        const qty = pickQty(part.f.kcal, targetKcal);
        picks.push({ f: part.f, qty });
        kcalSum += Math.round(part.f.kcal * qty);
      }
      // BUGFIX (Prompt 4 review #3, revision b): "cost-aware" candidate
      // selection. The previous version always bumped/trimmed the
      // highest-kcal candidate, which caused oscillation on small slots
      // where a single 0.5x step (85–120 kcal) is larger than the ±5%
      // band itself (e.g. dinner @ 401kcal → ±20kcal band). We now pick,
      // at each step, the candidate whose 0.5x delta lands kcalSum
      // closest to slotKcal — greedy on |post-step error|, not on kcal.
      // NOTE: ±5% per-slot tolerance is an implementation choice, not a
      // requirement of MEAL_TEMPLATE_LOGIC.md. Documented as an accepted
      // exception pending the next KNOWLEDGE.md bundling pass.
      const tolerance = 0.05;
      const lo = slotKcal * (1 - tolerance);
      const hi = slotKcal * (1 + tolerance);
      let guard = 0;
      while (guard++ < 40 && (kcalSum < lo || kcalSum > hi)) {
        // Enumerate every legal single-step move (+0.5x or -0.5x per pick)
        // and choose the one that minimizes |kcalSum' - slotKcal|. Only
        // accept a move if it strictly improves the error — prevents the
        // up/down oscillation seen in the previous implementation.
        const currentErr = Math.abs(kcalSum - slotKcal);
        let bestErr = currentErr;
        let bestIdx = -1;
        let bestDir: 1 | -1 = 1;
        for (let i = 0; i < picks.length; i++) {
          const p = picks[i];
          const step = Math.round(p.f.kcal * 0.5);
          if (p.qty < 2) {
            const err = Math.abs(kcalSum + step - slotKcal);
            if (err < bestErr) { bestErr = err; bestIdx = i; bestDir = 1; }
          }
          if (p.qty > 0.5) {
            const err = Math.abs(kcalSum - step - slotKcal);
            if (err < bestErr) { bestErr = err; bestIdx = i; bestDir = -1; }
          }
        }
        if (bestIdx < 0) {
          // No 0.5x move improves error. Last-resort: if we're above the
          // upper band AND every pick is already at min qty (0.5x), drop
          // the smallest-kcal pick entirely. This handles small snack
          // slots (e.g. 240kcal target with 3 mandatory items whose sum
          // at min-qty exceeds the band's upper edge). Non-empty guard:
          // never drop below 2 items so the slot still reads as a meal.
          if (kcalSum > hi && picks.length > 2 && picks.every(p => p.qty <= 0.5)) {
            // Try every candidate drop; pick the one that minimizes
            // post-drop error, and only apply if it strictly improves.
            let dropIdx = -1;
            let bestDropErr = currentErr;
            for (let i = 0; i < picks.length; i++) {
              const removed = Math.round(picks[i].f.kcal * picks[i].qty);
              const err = Math.abs(kcalSum - removed - slotKcal);
              if (err < bestDropErr) { bestDropErr = err; dropIdx = i; }
            }
            if (dropIdx >= 0) {
              kcalSum -= Math.round(picks[dropIdx].f.kcal * picks[dropIdx].qty);
              picks.splice(dropIdx, 1);
              continue;
            }
          }
          break; // accept slot as-is
        }
        const step = Math.round(picks[bestIdx].f.kcal * 0.5);
        picks[bestIdx].qty = bestDir === 1
          ? Math.min(2, picks[bestIdx].qty + 0.5)
          : Math.max(0.5, picks[bestIdx].qty - 0.5);
        kcalSum += bestDir === 1 ? step : -step;
      }
      const foods: string[] = [];
      for (const p of picks) {
        foods.push(encodeFood(p.f, p.qty));
        bump(p.f, p.qty);
      }

      meals.push({
        meal: nameKeys[slot],        // i18n key; client resolves via t[key]
        time: times[slot],
        foods,
        calories: kcalSum,
      });
    }
    if (day === 0) day1Meals = meals;
  }

  // Grocery list — encode as "food.<id> · <totalGrams>g" (2 parts).
  const grocery_list: string[] = Object.entries(groceryGrams)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, g]) => `food.${id} · ${g}g`);

  // Water: 33 ml/kg bodyweight, min 2L, rounded to 0.5.
  const water_liters = Math.max(2, Math.round((input.weightKg * 0.033) * 2) / 2);

  // Estimated calories burned per training day (MET ≈ 6, moderate lifting).
  const perSessionKcal = Math.round(input.weightKg * 6 * (input.sessionMin / 60));
  const estimated_calories_burned = perSessionKcal * input.workoutDays;

  // Weight projection: derive from program type, 7700 kcal/kg model.
  const p = String(input.goalProgramType || '').toLowerCase();
  let projKey = 'plan.weightProjection.maintain';
  let projKg = 0;
  if (p.includes('bulk')) { projKey = 'plan.weightProjection.gain'; projKg = 1.0; }
  else if (p.includes('cut') || p.includes('loss')) { projKey = 'plan.weightProjection.loss'; projKg = 2.0; }
  const weight_projection = { key: projKey, params: { kg: projKg, weeks: 4 } };

  const motivational_message = input.extensionMonth
    ? { key: 'plan.motivational.extension', params: { name: input.name || '', month: input.extensionMonth } }
    : { key: 'plan.motivational.default',   params: { name: input.name || '' } };

  return {
    meal_plan: day1Meals,
    grocery_list,
    water_liters,
    estimated_calories_burned,
    weight_projection,
    motivational_message,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Outer try/catch: GUARANTEES every code path returns a CORS-headed
  // JSON response. Without this, an unhandled rejection produces a
  // transport-level non-2xx that the browser surfaces as
  // "Edge Function returned a non-2xx status code".
  try {
    // Wall-clock guard: race the actual work against a hard timeout.
    const work = (async () => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'auth_required', message: 'Authentication required' }, 401);
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: 'invalid_auth', message: 'Invalid authentication' }, 401);
    }

    const body = await req.json();
    const validationErrors = validateInput(body);
    if (validationErrors.length > 0) {
      return jsonResponse({ error: 'invalid_input', message: 'Invalid input', details: validationErrors }, 400);
    }

    const {
      name: rawName, age, gender, weight, height, goal: rawGoal, experience, limitations: rawLimitations,
      programType, language, allergies: rawAllergies, occupation: rawOccupation, restDays, trainingDaysPerWeek,
      startDate, startDay, foodStyle, dietType,
      sessionDuration, equipment, dailySteps, sleepHours, sleepQuality,
      stressLevel, nightShift, mealFrequency, intermittentFasting,
      extensionContext, // optional: { previousMonthNumber: number } — when set, generate a progressive-overload month
    } = body;

    // Layer 1: sanitize all free-text user inputs to neutralize prompt injection
    // before they are interpolated into any AI prompt.
    const name = sanitizeUserText(rawName, 60);
    const goal = sanitizeUserText(rawGoal, 300);
    const limitations = sanitizeUserText(rawLimitations, 200);
    const allergies = sanitizeUserText(rawAllergies, 200);
    const occupation = sanitizeUserText(rawOccupation, 200);

    // ============================================================
    // GENERATE LIMIT GATE
    // - Admin (surya.sukmakertha@gmail.com): unlimited, skip
    // - Plan extensions (extensionContext set): not counted, skip
    // - Trial: max 3 generates total during 14-day trial
    // - Active: max 3 generates per monthly billing period
    // - Expired / no row + already used 3 / cancelled: blocked (403)
    // ============================================================
    const userId = claimsData.claims.sub as string;
    const userEmail = ((claimsData.claims as any).email as string | undefined)?.toLowerCase() ?? '';
    const ADMIN_EMAIL = 'surya.sukmakertha@gmail.com';
    const MAX_GEN = 3;
    const isAdmin = userEmail === ADMIN_EMAIL;
    const isExtension = !!extensionContext?.previousMonthNumber;

    const sbAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // SECURITY: verify the claimed extension is real. The client cannot be trusted
    // to set extensionContext — we must confirm the user actually owns a completed
    // plan whose plan_month_number equals previousMonthNumber. Otherwise any
    // authenticated user could bypass the generate-quota by sending a fake
    // extensionContext payload.
    let prevPlanData: any = null;
    if (isExtension && !isAdmin) {
      const prevMonthNum = Number(extensionContext.previousMonthNumber);
      if (!Number.isFinite(prevMonthNum) || prevMonthNum < 1) {
        return jsonResponse({ error: 'invalid_extension', message: 'Invalid extension context.' }, 403);
      }
      const { data: prevPlan } = await sbAdmin
        .from('saved_plans')
        .select('id, plan_data')
        .eq('user_id', userId)
        .eq('plan_month_number', prevMonthNum)
        .not('plan_completed_at', 'is', null)
        .maybeSingle();
      if (!prevPlan) {
        return jsonResponse({ error: 'invalid_extension', message: 'No completed prior plan found for extension.' }, 403);
      }
      prevPlanData = (prevPlan as any).plan_data || null;
    } else if (isExtension && isAdmin) {
      const prevMonthNum = Number(extensionContext.previousMonthNumber);
      if (Number.isFinite(prevMonthNum) && prevMonthNum >= 1) {
        const { data: prevPlan } = await sbAdmin
          .from('saved_plans')
          .select('plan_data')
          .eq('user_id', userId)
          .eq('plan_month_number', prevMonthNum)
          .not('plan_completed_at', 'is', null)
          .maybeSingle();
        prevPlanData = (prevPlan as any)?.plan_data || null;
      }
    }

    let incrementCounter: 'trial' | 'period' | 'free' | null = null;
    const now0 = new Date();
    const currentMonthKey = `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, '0')}`;

    if (!isAdmin && !isExtension) {
      const { data: sub } = await sbAdmin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
      const { data: profile } = await sbAdmin.from('profiles').select('period_generate_count, trial_generate_count, last_generate_reset, free_generate_count, free_generate_month').eq('user_id', userId).maybeSingle();
      const now = new Date();

      // Atomic quota reservation — prevents concurrent requests from
      // bypassing the limit via a read-then-write race. The RPC locks the
      // profile row, checks the relevant counter, and increments it inside
      // a single transaction. On AI failure we refund via refund_generate_quota.
      const reserveQuota = async (
        tier: 'trial' | 'period' | 'free',
        max: number,
        periodStart: string | null,
        monthKey: string | null,
        limitError: { error: string; message: string },
      ) => {
        const { data: ok, error } = await sbAdmin.rpc('reserve_generate_quota', {
          p_user_id: userId,
          p_tier: tier,
          p_max: max,
          p_period_start: periodStart,
          p_month_key: monthKey,
        });
        if (error) {
          console.error('[PlanGen] reserve_generate_quota failed', error);
          return jsonResponse({ error: 'quota_check_failed', message: 'Could not verify generate quota.' }, 500);
        }
        if (ok !== true) {
          return jsonResponse(limitError, 403);
        }
        incrementCounter = tier;
        return null;
      };

      const checkFreeTierLimit = async () =>
        reserveQuota('free', 1, null, currentMonthKey, {
          error: 'free_limit_reached',
          message: 'Free monthly generate limit (1) reached.',
        });

      if (!sub) {
        const blocked = await checkFreeTierLimit();
        if (blocked) return blocked;
      } else if (sub.status === 'trial') {
        if (now >= new Date(sub.trial_end)) {
          // Trial expired → fall back to FREE tier (1x per calendar month)
          const blocked = await checkFreeTierLimit();
          if (blocked) return blocked;
        } else {
          const blocked = await reserveQuota('trial', MAX_GEN, null, null, {
            error: 'trial_limit_reached',
            message: 'Trial generate limit (3) reached.',
          });
          if (blocked) return blocked;
        }
      } else if (sub.status === 'active' && sub.subscription_start && sub.subscription_end) {
        if (now >= new Date(sub.subscription_end)) {
          const blocked = await checkFreeTierLimit();
          if (blocked) return blocked;
        } else {
          const subStart = new Date(sub.subscription_start);
          const pStart = new Date(subStart);
          while (true) {
            const next = new Date(pStart);
            next.setMonth(next.getMonth() + 1);
            if (next > now) break;
            pStart.setMonth(pStart.getMonth() + 1);
          }
          const pStartDate = pStart.toISOString().slice(0, 10);
          const blocked = await reserveQuota('period', MAX_GEN, pStartDate, null, {
            error: 'period_limit_reached',
            message: 'Monthly generate limit (3) reached.',
          });
          if (blocked) return blocked;
        }
      } else {
        // expired / cancelled / unknown → FREE fallback
        const blocked = await checkFreeTierLimit();
        if (blocked) return blocked;
      }
    }

    // Plan duration is now hardcoded to exactly 4 weeks (1 month).
    // Users continue to month 2/3/etc via the in-app completion modal.
    const duration = "1 Month";
    const totalWeeks = 4;

    const lang = language === "id" ? "Indonesian (Bahasa Indonesia)" : language === "zh" ? "Mandarin Chinese (简体中文)" : "English";
    // NOTE (Prompt 4): AI gateway removed entirely — LOVABLE_API_KEY no
    // longer required by generate-plan. Both workout and meal are
    // produced by deterministic engines above.

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    const td = parseInt(trainingDaysPerWeek) || 4;
    const sessionMin = parseInt(sessionDuration) || 60;

    const bmi = (w / ((h / 100) ** 2)).toFixed(1);
    const bmr = Math.round(calculateBMR(w, h, a, gender));
    const actMult = getActivityMultiplier(td);
    const tdee = Math.round(calculateTDEE(bmr, actMult, dailySteps || "4000-8000"));
    const macros = calculateMacros(tdee, w, programType);
    const { targetLiftingMinutes, targetSets } = calculateTargetSets(sessionMin, experience);

    const workoutDays = td;
    const restDaysNum = 7 - workoutDays;
    const equipmentStr = Array.isArray(equipment) && equipment.length > 0 ? equipment.join(", ") : "Not specified";

    console.log("[PlanGen] START", {
      duration,
      totalWeeks,
      userId: claimsData.claims.sub?.substring(0, 8),
      equipment: equipmentStr,
      experience,
      lang: language,
      timestamp: new Date().toISOString(),
    });

    // === DETERMINISTIC MEAL ENGINE (Prompt 4) ===
    // No AI call is made. Meal plan, grocery list, water target,
    // estimated calories burned, weight_projection, and
    // motivational_message all come from buildMealPlan().
    const mealOutput = buildMealPlan({
      calorieTarget: macros.calories,
      proteinG: macros.protein,
      carbsG: macros.carbs,
      fatG: macros.fat,
      freq: clampFreq(mealFrequency),
      intermittentFasting: Boolean(intermittentFasting),
      style: normalizeStyle(foodStyle),
      diet: normalizeDiet(dietType),
      allergens: parseAllergens(allergies),
      name: String(name || ''),
      goalProgramType: String(programType || ''),
      weightKg: w,
      workoutDays,
      sessionMin,
      extensionMonth: extensionContext?.previousMonthNumber ? extensionContext.previousMonthNumber + 1 : null,
    });

    const plan: any = {
      durationWeeks: totalWeeks,
      calorie_target: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      meal_plan: mealOutput.meal_plan,
      grocery_list: mealOutput.grocery_list,
      water_liters: mealOutput.water_liters,
      estimated_calories_burned: mealOutput.estimated_calories_burned,
      weight_projection: mealOutput.weight_projection,          // {key, params}
      motivational_message: mealOutput.motivational_message,    // {key, params}
    };

    // === DETERMINISTIC WORKOUT ENGINE ===
    const engineGoal = normalizeGoal(goal, programType);
    const engineEquipment = normalizeEquipment(equipment);
    const engineLimitations = parseLimitations(limitations);
    const engineExperience: WExp = (experience as WExp);
    const startDateObj = startDate ? new Date(startDate) : new Date();
    if (isNaN(startDateObj.getTime())) startDateObj.setTime(Date.now());

    const workoutOutput = generateWorkout({
      goal: engineGoal,
      experience: engineExperience,
      trainingDaysPerWeek: workoutDays,
      sessionMinutes: sessionMin,
      equipment: engineEquipment,
      limitations: engineLimitations,
      startDate: startDateObj,
      prevPlanData,
    });

    // Merge deterministic workout fields OVER whatever the AI returned so the
    // output shape stays identical to the old system (downstream consumers
    // — planProgress, streak, medals, PNG cards — see the same fields).
    plan.programOverview = workoutOutput.programOverview;
    plan.durationWeeks = totalWeeks;
    plan.weeklySplit = workoutOutput.weeklySplit;
    plan.estimatedSessionTimeMinutes = workoutOutput.estimatedSessionTimeMinutes;
    plan.warmUp = workoutOutput.warmUp;
    plan.workout_plan = workoutOutput.workout_plan;
    plan.coolDown = workoutOutput.coolDown;
    plan.weekly_schedule = workoutOutput.weekly_schedule;
    plan.safety_notes = [...workoutOutput.safety_notes];
    plan.warnings = [...workoutOutput.warnings];
    plan.progressionRules = workoutOutput.progressionRules;
    plan.deloadWeek = workoutOutput.deloadWeek;
    plan.recoveryTips = workoutOutput.recoveryTips;

    console.log("[PlanGen] Rule-based workout merged", {
      goal: engineGoal,
      equipment: engineEquipment,
      days: workoutDays,
      totalWorkoutDays: plan.workout_plan.length,
      trainingDayCount: plan.workout_plan.filter((d: any) => d.exercises?.length > 0).length,
    });

    console.log("[PlanGen] Plan returned successfully", {
      duration,
      totalWorkoutDays: (plan.workout_plan || []).length,
    });

    // Quota was already reserved atomically before AI generation via
    // reserve_generate_quota. No post-success increment is needed.

    return jsonResponse(plan, 200);
    })();

    // Race the work against the wall-clock budget.
    const timeoutPromise = new Promise<Response>((_resolve, reject) =>
      setTimeout(() => reject({ status: 408, code: "timeout", message: "Plan generation timed out" }), FUNCTION_TIMEOUT_MS)
    );

    return await Promise.race([work, timeoutPromise]);
  } catch (e: any) {
    // Map known/tagged errors to specific status codes; ALL responses
    // include CORS headers so the browser can read them.
    if (e?.status === 408 || e?.code === "timeout") {
      console.error("[PlanGen] FAILED — timeout", { message: e?.message });
      return jsonResponse({ error: "timeout", message: "Plan generation timed out. Please try again." }, 408);
    }
    if (e?.status === 429) {
      return jsonResponse({ error: "rate_limit", message: "Too many requests. Please try again shortly." }, 429);
    }
    if (e?.status === 402) {
      return jsonResponse({ error: "payment_required", message: "AI credits exhausted. Please contact support." }, 402);
    }
    if (e?.status === 422 || e?.code === "parse_error") {
      console.error("[PlanGen] FAILED — parse error", { message: e?.message });
      return jsonResponse({ error: "parse_error", message: "Failed to parse AI response. Please try again." }, 422);
    }
    console.error("[PlanGen] FAILED — internal error", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return jsonResponse(
      { error: "internal_error", message: "An internal error occurred. Please try again." },
      500
    );
  }
});
