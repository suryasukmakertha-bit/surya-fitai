// Shared fitness calculation utilities

export interface FitnessMetrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function calculateBMI(weight: number, heightCm: number): { bmi: number; category: string } {
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";
  return { bmi: Math.round(bmi * 10) / 10, category };
}

export function calculateBMR(weight: number, heightCm: number, age: number, gender: string): number {
  // Mifflin-St Jeor
  const base = 10 * weight + 6.25 * heightCm - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

export function getActivityMultiplier(experience: string, trainingDays: number): number {
  if (trainingDays <= 2) return 1.2;
  if (trainingDays <= 3) return 1.375;
  if (trainingDays <= 5) return 1.55;
  if (trainingDays <= 6) return 1.725;
  return 1.9;
}

export function calculateTDEE(bmr: number, activityMultiplier: number, dailySteps: string): number {
  let neat = 0;
  const stepsMap: Record<string, number> = {
    "<4000": 3000,
    "4000-8000": 6000,
    "8000-12000": 10000,
    ">12000": 14000,
    "desk": 2500,
  };
  const steps = stepsMap[dailySteps] || 6000;
  if (steps > 8000) {
    neat = (steps - 8000) * 0.04;
  }
  return bmr * activityMultiplier + neat;
}

// Mirrors supabase/functions/generate-plan/index.ts calculateMacros exactly:
// - Branches on the normalized 5-value Fitness Goal (WGoal) instead of programType.
// - Uses remaining-kcal-after-protein split for carbs/fat (not flat % of total kcal).
// Multipliers per MEAL_TEMPLATE_LOGIC.md §1-2 midpoints.
// The `goal` param is typed loosely because upstream callers still pass legacy
// programType strings (e.g. "beginner"); those fall through to General Fitness.
// Fixing caller resolution is out of scope for this file.
export function calculateMacros(tdee: number, weight: number, goal: string) {
  let calorieMult: number;
  let proteinPerKg: number;
  let carbPctRem: number;
  let fatPctRem: number;

  switch (goal) {
    case "Hypertrophy":
      calorieMult = 1.125; proteinPerKg = 2.0; carbPctRem = 0.475; fatPctRem = 0.525;
      break;
    case "Strength":
      calorieMult = 1.075; proteinPerKg = 2.0; carbPctRem = 0.425; fatPctRem = 0.575;
      break;
    case "Fat Loss":
      calorieMult = 0.825; proteinPerKg = 2.2; carbPctRem = 0.375; fatPctRem = 0.625;
      break;
    case "Body Recomposition":
      calorieMult = 1.0; proteinPerKg = 2.2; carbPctRem = 0.425; fatPctRem = 0.575;
      break;
    case "General Fitness":
    default:
      calorieMult = 1.0; proteinPerKg = 1.8; carbPctRem = 0.475; fatPctRem = 0.525;
      break;
  }

  const calories = Math.round(tdee * calorieMult);
  const protein = Math.round(weight * proteinPerKg);
  const proteinKcal = protein * 4;
  const remaining = Math.max(0, calories - proteinKcal);
  const carbs = Math.round((remaining * carbPctRem) / 4);
  const fat = Math.round((remaining * fatPctRem) / 9);

  return { calories, protein, carbs, fat };
}

export function computeAll(
  weight: number,
  heightCm: number,
  age: number,
  gender: string,
  trainingDays: number,
  dailySteps: string,
  goal: string
): FitnessMetrics {
  const { bmi, category } = calculateBMI(weight, heightCm);
  const bmr = calculateBMR(weight, heightCm, age, gender);
  const actMult = getActivityMultiplier("", trainingDays);
  const tdee = calculateTDEE(bmr, actMult, dailySteps);
  const { calories, protein, carbs, fat } = calculateMacros(tdee, weight, goal);
  return { bmi, bmiCategory: category, bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat };
}
