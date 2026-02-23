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

export function calculateMacros(tdee: number, weight: number, programType: string) {
  let calories: number, protein: number, carbs: number, fat: number;

  if (programType === "bulking") {
    calories = Math.round(tdee * 1.15);
    protein = Math.round(weight * 2.0);
    carbs = Math.round((calories * 0.55) / 4);
    fat = Math.round((calories * 0.25) / 9);
  } else if (programType === "cutting") {
    calories = Math.round(tdee * 0.80);
    protein = Math.round(weight * 2.2);
    carbs = Math.round((calories * 0.40) / 4);
    fat = Math.round((calories * 0.30) / 9);
  } else {
    // beginner & senior
    calories = Math.round(tdee * 1.05);
    protein = Math.round(weight * 1.8);
    carbs = Math.round((calories * 0.50) / 4);
    fat = Math.round((calories * 0.30) / 9);
  }

  return { calories, protein, carbs, fat };
}

export function computeAll(
  weight: number,
  heightCm: number,
  age: number,
  gender: string,
  trainingDays: number,
  dailySteps: string,
  programType: string
): FitnessMetrics {
  const { bmi, category } = calculateBMI(weight, heightCm);
  const bmr = calculateBMR(weight, heightCm, age, gender);
  const actMult = getActivityMultiplier("", trainingDays);
  const tdee = calculateTDEE(bmr, actMult, dailySteps);
  const { calories, protein, carbs, fat } = calculateMacros(tdee, weight, programType);
  return { bmi, bmiCategory: category, bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat };
}
