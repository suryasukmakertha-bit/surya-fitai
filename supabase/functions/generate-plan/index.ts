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
  else if (data.name.length > 100) errors.push('Name is too long (max 100 characters)');
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
  if (data.limitations && data.limitations.length > 500) errors.push('Limitations is too long');
  if (data.allergies && data.allergies.length > 500) errors.push('Allergies is too long');
  if (data.occupation && data.occupation.length > 200) errors.push('Occupation is too long');
  return errors;
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

function calculateMacros(tdee: number, weight: number, programType: string) {
  if (programType === "bulking") {
    const calories = Math.round(tdee * 1.15);
    return { calories, protein: Math.round(weight * 2.0), carbs: Math.round((calories * 0.55) / 4), fat: Math.round((calories * 0.25) / 9) };
  } else if (programType === "cutting") {
    const calories = Math.round(tdee * 0.80);
    return { calories, protein: Math.round(weight * 2.2), carbs: Math.round((calories * 0.40) / 4), fat: Math.round((calories * 0.30) / 9) };
  } else {
    const calories = Math.round(tdee * 1.05);
    return { calories, protein: Math.round(weight * 1.8), carbs: Math.round((calories * 0.50) / 4), fat: Math.round((calories * 0.30) / 9) };
  }
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
      name, age, gender, weight, height, goal, experience, limitations,
      programType, language, allergies, occupation, restDays, trainingDaysPerWeek,
      startDate, startDay, foodStyle, dietType,
      sessionDuration, equipment, dailySteps, sleepHours, sleepQuality,
      stressLevel, nightShift, mealFrequency, intermittentFasting
    } = body;

    // Plan duration is now hardcoded to exactly 4 weeks (1 month).
    // Users continue to month 2/3/etc via the in-app completion modal.
    const duration = "1 Month";
    const totalWeeks = 4;

    const lang = language === "id" ? "Indonesian (Bahasa Indonesia)" : language === "zh" ? "Mandarin Chinese (简体中文)" : "English";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const systemPrompt = `You are Coach Surya, a certified professional personal trainer and sports nutritionist with 10+ years of real client experience across Southeast Asia and globally. You are not a generic AI — you are a professional coach who uses AI to scale your expertise.

When generating plans, always:
1. Address the client by their first name naturally throughout the response
2. Reference their specific data (health conditions, equipment, schedule, stress level, sleep) to justify your decisions
3. Give the plan a memorable name (e.g., "Foundation First Program", "Smart Bulk Protocol")
4. Explain 1-2 key coaching decisions: why you chose this structure for THIS person
5. If the client has health conditions or injuries, acknowledge these prominently and explain how the plan accounts for them
6. End the coach introduction with one specific, realistic outcome they can expect in their timeframe

DO NOT change the structure or format of the plan output — only enhance the introductory coaching message and section headers where you write as Coach Surya.

You are also Dr. SuryaFit — Senior Personal Trainer with 15+ years experience in Indonesia. Certified CSCS (NSCA) and Precision Nutrition Level 2.

You ALWAYS:
- Respond completely in the user's selected language: ${lang} (English default, Bahasa Indonesia, or Mandarin Simplified Chinese).
- Match the exact session duration chosen by the user.
- Adjust volume, intensity, rest, and form cues AUTOMATICALLY based on experienceLevel:
  • Beginner: low volume (2-3 sets, 3-4 exercises), very detailed form cues, longer rests (90-120s), emphasize technique & safety, lighter intensity.
  • Intermediate: moderate volume (3-4 sets, 4-5 exercises), balanced form cues, rests 75-105s, introduce progressive overload.
  • Advanced: high volume (4-5 sets, 5-6 exercises), concise advanced cues, rests 60-90s for hypertrophy, maximum progressive overload.

THINK STEP-BY-STEP internally:

1. Analyze full profile (program: ${programType}, experienceLevel: ${experience}, sessionDuration: ${sessionMin} min, limitations: ${limitations || "None"}, equipment: ${equipmentStr}, stress: ${stressLevel || "N/A"}/10, sleep: ${sleepHours || "N/A"} hrs quality ${sleepQuality || "N/A"}/10, NEAT: ${dailySteps || "4000-8000"}).
2. Calculate target lifting time = ${targetLiftingMinutes} min (${sessionMin} min session - 5 min warm-up - 5 min cool-down).
3. Based on experienceLevel "${experience}", set appropriate number of exercises and sets so total working sets ≈ ${targetSets} sets and exactly fill the session time.
4. For Beginner: prioritize perfect form, simple movements, extra mobility.
   For Intermediate: add variety and basic progression.
   For Advanced: compound lifts heavy, higher volume, advanced techniques.
5. Prioritize SAFETY first, then progressive overload, local Indonesian foods, and realistic lifestyle.

CALCULATED NUTRITION TARGETS (use these exact values):
- BMI: ${bmi}
- BMR: ${bmr} kcal/day
- TDEE: ${tdee} kcal/day
- Target Calories: ${macros.calories} kcal/day
- Protein: ${macros.protein}g/day
- Carbs: ${macros.carbs}g/day
- Fat: ${macros.fat}g/day

OUTPUT MUST BE VALID JSON with this EXACT schema (all text values in ${lang}):

{
  "programOverview": "string (1 motivational paragraph with realistic ${totalWeeks}-week results)",
  "durationWeeks": ${totalWeeks},
  "weeklySplit": ["Day 1: Push Focus", "Day 2: Pull Focus", ...],
  "estimatedSessionTimeMinutes": ${sessionMin},
  "warmUp": "string (5 min warm-up routine)",
  "workout_plan": [
    {
      "day": "string (e.g. Week 1 - Monday, 2025-03-10)",
      "exercises": [
        {
          "name": "string",
          "sets": "string (e.g. '3')",
          "reps": "string (e.g. '8-12')",
          "rest": "string (e.g. '90-120 seconds')",
          "tempo": "string (e.g. '3010')",
          "cues": "string (clear, level-appropriate form cues)",
          "alternative": "string (alternative exercise if needed)",
          "estimatedTimeMinutes": number,
          "weight_kg": "string (recommended load)",
          "notes": "string (form cues / safety tips)"
        }
      ]
    }
  ],
  "coolDown": "string (5 min mobility/stretching routine)",
  "meal_plan": [
    { "meal": "string (e.g. Breakfast)", "time": "string (e.g. 07:00)", "foods": ["string (include portion size in grams)"], "calories": number }
  ],
  "calorie_target": ${macros.calories},
  "protein": ${macros.protein},
  "carbs": ${macros.carbs},
  "fat": ${macros.fat},
  "water_liters": number,
  "weekly_schedule": ["Mon: Type", "Tue: Type", ...],
  "safety_notes": ["string"],
  "warnings": ["string array"],
  "motivational_message": "string",
  "grocery_list": ["string (with quantity)"],
  "estimated_calories_burned": number,
  "weight_projection": "string",
  "progressionRules": "string (adjusted to experience level ${experience})",
  "deloadWeek": "string (when and how to deload)",
  "recoveryTips": "string (personalized recovery advice)"
}

TRAINING SCIENCE RULES:
- Generate a complete 4-week progressive workout program. Week 1 is foundation, Week 2 increases volume, Week 3 increases intensity, Week 4 is peak week.
- Target total working sets per session: ${targetSets} sets (calculated from ${targetLiftingMinutes} min lifting time at 2.3 min/set avg)
- Session duration target: ${sessionMin} minutes (5 min warm-up + ${targetLiftingMinutes} min lifting + 5 min cool-down)
- Apply progressive overload: systematically increase weight, reps, or volume across the 4 weeks
- Week 1 (Foundation): Adaptation phase, moderate intensity 60-70% capacity, focus on perfect form and movement patterns
- Week 2 (Volume): Volume increase — add 1-2 reps per set, or add 1 extra set on key compound lifts
- Week 3 (Intensity): Load increase — add 2.5-5kg on compound lifts, 1-2.5kg on isolation; reps stay moderate
- Week 4 (Peak): Peak intensity week with top working sets at RPE 8-9, then taper the final 2 sessions slightly to consolidate gains
- Include recommended weight load (kg) for EVERY exercise
- Include form cues and safety notes for each exercise
- Use proper training splits based on ${workoutDays} training days per week
- Only use exercises doable with: ${equipmentStr}

CRITICAL EXERCISE ASSIGNMENT RULES (MUST FOLLOW WITHOUT EXCEPTION):

1. EXERCISES MUST MATCH THE DAY'S FOCUS TITLE EXACTLY
   Every exercise in a training day MUST directly target the muscle groups stated in that day's title:
   - "Upper Body Push" day → bench press, overhead press, dips, push-ups, chest fly, tricep exercises. NO rows, NO deadlifts, NO leg exercises.
   - "Upper Body Pull" day → pull-ups, lat pulldown, rows, face pulls, bicep curls. NO pressing movements, NO leg exercises.
   - "Lower Body Quad Focus" day → squats, leg press, lunges, leg extension, step-ups. NO upper body exercises.
   - "Lower Body Posterior/Hamstrings" day → Romanian deadlift, leg curl, hip hinge movements, glute bridge. NO quad-dominant exercises.
   - "Full Body" day → 1-2 exercises per major muscle group, balanced push/pull/legs. NO repetition of exercises from other days in the same week.
   - "Core & Unilateral" day → planks, dead bugs, single-leg exercises, anti-rotation movements. NO bilateral compound lifts.
   - Any other focus title → exercises MUST directly target the muscles named in the title. Zero exceptions.

2. ZERO EXERCISE REPETITION WITHIN THE SAME WEEK
   An exercise that appears on Day 1 MUST NOT appear on Day 2, 3, 4, 5, 6, or 7 of the same week.
   Every training day must have a completely unique set of exercises.
   If the weekly split requires similar muscle groups on different days (e.g. two upper body days), use DIFFERENT exercises for each day.
   Example: Day 1 has Barbell Bench Press → Day 5 must use Dumbbell Incline Press or Cable Fly instead, never Barbell Bench Press again.

3. EXERCISE COUNT MUST MATCH THE DAY'S VOLUME INTENT
   - Heavy compound focus days (strength): 4-5 exercises, higher sets (4-5), lower reps (5-8)
   - Hypertrophy days: 5-6 exercises, moderate sets (3-4), moderate reps (8-15)
   - Endurance/metabolic days: 5-7 exercises, lower sets (3), higher reps (15-20)
   - Core/mobility days: 4-6 exercises, appropriate tempo and hold durations

4. EQUIPMENT CONSISTENCY
   All exercises on EVERY day MUST use equipment consistent with the user's selection: ${equipmentStr}.
   If "bodyweight" → zero gym equipment exercises. If "dumbbells" → no barbell exercises. If "full-gym" → any equipment is valid.
   If "resistance-band" → all exercises must use bands. Check EVERY exercise on EVERY day.

5. PROGRESSIVE OVERLOAD ACROSS WEEKS
   If the plan spans multiple weeks, Week 2+ exercises should either:
   (a) be the same exercises with increased sets/reps/weight, OR
   (b) be exercise progressions (e.g. bodyweight squat → goblet squat → barbell squat).
   Never regress or randomize week-to-week.

SELF-VALIDATION (PERFORM BEFORE OUTPUTTING):
Before outputting the final plan, internally verify:
- "Does every exercise on Day X target the muscles in Day X's title?" — If NO, replace the mismatched exercises.
- "Does any exercise name appear more than once in the same week?" — If YES, replace duplicates with alternatives.
- "Does any exercise use equipment the user does not have?" — If YES, replace with an appropriate alternative.
If any check fails, fix that day's exercises before outputting. Do NOT output a plan that fails these checks.

RECOVERY & LIFESTYLE ADJUSTMENTS:
- User sleep: ${sleepHours || "Not specified"} hours, quality ${sleepQuality || "N/A"}/10
- User stress: ${stressLevel || "N/A"}/10${nightShift ? ", works night shifts/overtime" : ""}
- If sleep quality < 6 or stress > 7: reduce total volume by 15-20%, add extra recovery notes
- If night shift worker: recommend flexible meal timing, add sleep hygiene tips in safety notes
- Daily steps/NEAT level: ${dailySteps || "Not specified"}

EXPERIENCE-LEVEL SPECIFIC RULES:
- Beginner: 2-3 sets per exercise, 3-4 exercises per session, very detailed form cues, rest 90-120s
- Intermediate: 3-4 sets per exercise, 4-5 exercises per session, balanced cues, rest 75-105s
- Advanced: 4-5 sets per exercise, 5-6 exercises per session, concise advanced cues, rest 60-90s

EXERCISE NAMING RULE FOR RESISTANCE BAND EXERCISES:
- When generating any exercise that uses a resistance band as the primary equipment, the exercise name MUST always include the word "band", "banded", or "resistance band" in the name itself.
- Examples: "Tricep Overhead Extension with Band", "Banded Bicep Curl", "Resistance Band Chest Press", "Banded Squat", "Banded Romanian Deadlift", "Banded Overhead Press", "Resistance Band Seated Row", "Standing Band Abduction"
- In Bahasa Indonesia: sertakan kata "band" atau "dengan band" di nama exercise (contoh: "Bicep Curl dengan Band", "Squat dengan Band")
- In Simplified Chinese: 在动作名称中加入"弹力带" (例如: "弹力带深蹲", "弹力带胸推", "弹力带二头弯举")
- This rule applies to ALL exercises using resistance bands regardless of language.

PROGRAM-SPECIFIC RULES:
- "senior" program: low-impact exercises, avoid heavy lifts, add balance/flexibility work, extra safety notes, bodyweight or light loads only
- "beginner" program: simple exercises with detailed form cues, moderate volume, focus on compound movements
- "bulking" program: high volume (4-5 sets), progressive overload priority, caloric surplus
- "cutting" program: caloric deficit, higher protein, include HIIT 2-3x/week, maintain training intensity

SCHEDULING:
- Training starts on ${startDay || "Monday"}, ${startDate || "next week"}
- The workout plan MUST start on this exact day and date
- Label each day with the actual day name and date (e.g., "Week 1 - Monday, March 10")
- Distribute muscle groups evenly with balanced rotation and recovery optimization
- Plan duration: ${duration} — generate exactly ${totalWeeks} weeks of programming
- Include REST DAY entries labeled as "Week X - Rest Day (DayName, Date)" with an empty exercises array

MEAL PLAN RULES:
- Food style: "${foodStyle || 'local'}"
- Diet type: "${dietType || 'omnivore'}"
- Meal frequency: ${mealFrequency || 4} meals per day
${intermittentFasting ? '- Apply 16/8 Intermittent Fasting: first meal at 12:00 PM, last meal by 8:00 PM. Cluster ALL meals within the 12:00-20:00 eating window. No meals outside this window. Add a note about the fasting period (20:00-12:00) with hydration tips.' : '- Distribute meals evenly throughout the day starting from breakfast (e.g., 07:00) with 3-4 hour gaps between meals.'}

MEAL FREQUENCY STRUCTURE (MUST match exactly ${mealFrequency || 4} meals):
${(mealFrequency || '4') === '3' ? '- Generate exactly 3 meals: Breakfast, Lunch, Dinner.' : ''}
${(mealFrequency || '4') === '4' ? '- Generate exactly 4 meals: Breakfast, Mid-morning Snack, Lunch, Dinner.' : ''}
${(mealFrequency || '4') === '5' ? '- Generate exactly 5 meals: Breakfast, Mid-morning Snack, Lunch, Afternoon Snack, Dinner.' : ''}
${(mealFrequency || '4') === '6' ? '- Generate exactly 6 meals: Breakfast, Mid-morning Snack, Lunch, Afternoon Snack, Dinner, Evening Snack.' : ''}
- The meal_plan array MUST contain exactly ${mealFrequency || 4} entries. No more, no less.
- Each meal must have appropriate calorie distribution (e.g., main meals ~25-35% each, snacks ~10-15% each of daily target).

CRITICAL DIET TYPE RESTRICTIONS (MUST BE STRICTLY ENFORCED — ZERO TOLERANCE):
${dietType === 'vegetarian' ? `- VEGETARIAN DIET: ABSOLUTELY NO meat, poultry, fish, or seafood of any kind.
- PROHIBITED ingredients (never include): chicken, beef, pork, lamb, turkey, duck, fish (tuna, salmon, tilapia, ikan kembung, etc.), shrimp, crab, squid, any other animal flesh.
- ALLOWED protein sources ONLY: eggs, dairy (milk, cheese, yogurt), tofu, tempeh, tahu, lentils, chickpeas, beans (kacang merah, kacang hitam), edamame, nuts, seeds, quinoa, seitan, paneer, cottage cheese.
- Every meal MUST use plant-based or lacto-ovo protein sources. Double-check every single ingredient before including it.
- SELF-CHECK: Before finalizing, re-read every food item and confirm NONE contain meat, poultry, or fish.` : ''}
${dietType === 'vegan' ? `- VEGAN DIET: ABSOLUTELY NO animal products of any kind.
- PROHIBITED ingredients (never include): all meat, poultry, fish, seafood, eggs, dairy (milk, cheese, butter, yogurt, whey), honey, gelatin, any animal-derived ingredient.
- ALLOWED protein sources ONLY: tofu, tempeh, tahu, seitan, lentils, chickpeas, beans, edamame, nuts, seeds, quinoa, nutritional yeast, plant milks (soy, almond, oat), plant-based protein powder.
- Every meal MUST be 100% plant-based. Double-check every single ingredient before including it.
- SELF-CHECK: Before finalizing, re-read every food item and confirm NONE contain any animal product.` : ''}
${!dietType || dietType === 'omnivore' ? '- Omnivore diet: all food sources allowed including meat, fish, eggs, dairy, and plant-based.' : ''}

FOOD SOURCE STYLE ENFORCEMENT (MUST match "${foodStyle || 'local'}" exactly):
${foodStyle === 'local' || !foodStyle ? `- LOCAL TRADITIONAL FOODS: Use traditional Indonesian/local dishes and ingredients. Examples: nasi goreng, gado-gado, sayur asem, pecel, rawon, soto, bubur ayam, tempe mendoan, tahu goreng, sambal, lalapan. Prioritize ingredients found in traditional markets (pasar).` : ''}
${foodStyle === 'western' ? `- WESTERN STYLE: Use Western-style meals. Examples: grilled chicken breast, pasta, salads, sandwiches, oatmeal, Greek yogurt, steak, scrambled eggs, smoothie bowls. Avoid traditional Asian dishes.` : ''}
${foodStyle === 'asian' ? `- ASIAN STYLE: Use diverse Asian cuisines. Examples: stir-fry, rice bowls, ramen, dim sum, curry, pad thai, sushi bowls, bibimbap, miso soup. Can include Indonesian, Japanese, Chinese, Thai, Korean dishes.` : ''}
${foodStyle === 'high-protein' ? `- HIGH-PROTEIN FITNESS STYLE: Maximize protein content in every meal. Use protein-dense foods: chicken breast, lean beef, eggs, Greek yogurt, whey protein shakes, cottage cheese, tuna, salmon. Each meal should have protein as the centerpiece. Aim for 35-45% of calories from protein.
- ${dietType === 'vegetarian' ? 'Use high-protein vegetarian sources: eggs, Greek yogurt, cottage cheese, tofu, tempeh, edamame, lentils, protein powder.' : dietType === 'vegan' ? 'Use high-protein vegan sources: tofu, tempeh, seitan, lentils, chickpeas, edamame, hemp seeds, pea protein powder.' : 'Include lean meats, fish, eggs, dairy as primary protein sources.'}` : ''}
${foodStyle === 'budget' ? `- BUDGET-FRIENDLY LOCAL FOODS: Prioritize the most affordable, locally available ingredients. Use cheap staples: rice (nasi), eggs (telur), tempeh, tahu, vegetables from local markets (kangkung, bayam, wortel, kol), bananas, instant oats, peanuts. Avoid imported or expensive items (quinoa, salmon, avocado, almond butter, whey protein). Target estimated cost under Rp 50,000/day. Focus on simple preparations: goreng, rebus, tumis.` : ''}
${foodStyle === 'premium' ? `- PREMIUM / WHOLE FOODS: Use high-quality, nutrient-dense whole foods. Examples: salmon, quinoa, avocado, grass-fed beef, organic eggs, mixed berries, cold-pressed juices, chia seeds, wild rice, extra virgin olive oil, premium nuts. Focus on organic and minimally processed ingredients.` : ''}

FOOD ALLERGY RESTRICTIONS (ABSOLUTE — ZERO TOLERANCE):
- User allergies: ${allergies || "None"}
${allergies ? `- NEVER include ANY of these allergens: ${allergies}. Check every ingredient, sauce, marinade, and garnish. If an allergen could be present even in trace amounts in a dish, exclude that dish entirely and suggest a safe alternative.` : '- No food allergies reported. All ingredients allowed within diet type constraints.'}

ADDITIONAL MEAL PLAN QUALITY RULES:
- Include portion sizes in grams or household measures for EVERY food item
- Adjust calories and macros to match the exact calculated targets: ${macros.calories} kcal, P:${macros.protein}g, C:${macros.carbs}g, F:${macros.fat}g
- Each meal entry must show its individual calorie count that sums to the daily target
- Grocery list should cover all meal plan ingredients with exact quantities for 1 week
- Include simple preparation notes or cooking methods where helpful

OCCUPATION & LIFESTYLE:
- Occupation: ${occupation || "Not specified"}
- Consider occupation when adjusting: intensity, calorie estimation, daily activity multiplier, fatigue and recovery needs

Tone: confident, empathetic, professional. Never promise unrealistic results. Every level must feel perfectly tailored and high-quality.
Generate ALL text content in ${lang}. JSON keys must remain in English.`;

    const userPrompt = `Complete User Profile:
- Name: ${name}
- Age: ${a}
- Gender: ${gender}
- Weight: ${w} kg
- Height: ${h} cm
- BMI: ${bmi} (${parseFloat(bmi) < 18.5 ? "Underweight" : parseFloat(bmi) < 25 ? "Normal" : parseFloat(bmi) < 30 ? "Overweight" : "Obese"})
- BMR: ${bmr} kcal/day
- TDEE: ${tdee} kcal/day
- Program: ${programType}
- Experience Level: ${experience}
- Goal: ${goal || "General fitness"}
- Duration: ${duration}
- Session Duration: ${sessionMin} minutes
- Target Lifting Time: ${targetLiftingMinutes} minutes
- Target Total Sets: ${targetSets} sets
- Equipment: ${equipmentStr}
- Limitations: ${limitations || "None"}
- Food Allergies: ${allergies || "None"}
- Occupation: ${occupation || "Not specified"}
- Training Days: ${workoutDays}/week, Rest Days: ${restDaysNum}/week
- Start Date: ${startDate || "Next Monday"} (${startDay || "Monday"})
- Food Style: ${foodStyle || "local"}
- Diet Type: ${dietType || "omnivore"} ${dietType === 'vegetarian' ? '(NO meat/fish/poultry allowed)' : dietType === 'vegan' ? '(NO animal products at all)' : ''}
- Meal Frequency: ${mealFrequency || 4} meals/day
- Intermittent Fasting: ${intermittentFasting ? "Yes (16/8)" : "No"}
- Daily Steps/NEAT: ${dailySteps || "4000-8000"}
- Sleep: ${sleepHours || "Not specified"} hours, quality ${sleepQuality || "N/A"}/10
- Stress Level: ${stressLevel || "N/A"}/10
- Night Shift: ${nightShift ? "Yes" : "No"}
- Target Calories: ${macros.calories} kcal
- Target Protein: ${macros.protein}g | Carbs: ${macros.carbs}g | Fat: ${macros.fat}g

Generate the complete plan now.`;

    /*
     * KNOWN BUG HISTORY — DO NOT REGRESS:
     *
     * BUG #1 (fixed): 3-month plans repeated Day 1 exercises on all
     * subsequent days from Day 3 onward.
     * ROOT CAUSE: Token/context truncation in a single AI call.
     * FIX: Multi-call generation + per-week exercise context.
     *
     * BUG #2 (fixed): "Edge Function returned a non-2xx status code"
     * on 3-month plan generation.
     * ROOT CAUSE: 4 sequential AI calls (~50s each) exceeded the
     * Supabase edge function 150s wall-clock limit.
     * FIX:
     *   1. Promise.race timeout guard (140s) returning a clean JSON 408.
     *   2. try/catch wrapping entire serve handler (always returns CORS).
     *   3. safeParseJSON returning a tagged 422 instead of a raw throw.
     *
     * BUG #3 (fixed): 3-month generation took ~96s (2 sequential chunks).
     * ROOT CAUSE: Sequential await of chunk1 then chunk2.
     * FIX: 4 PARALLEL chunks via Promise.all (3 weeks each). Total
     * wall-clock = max(chunk durations) ≈ 40-50s instead of sum.
     * Cross-chunk uniqueness is enforced by phase-specific prompts
     * (Foundation / Accumulation / Intensification / Peak) since
     * parallel chunks cannot share dynamic exercise context.
     *
     * PREVENTION:
     *  - validatePlanExerciseUniqueness() must run before returning.
     *  - Multi-call strategy is mandatory for plans > 6 weeks.
     *  - Keep chunks ≤ 4 to avoid AI gateway rate limits when parallel.
     *  - Every Response must use jsonResponse() (with CORS).
     */

    // Helper: call AI gateway and collect streamed response.
    // Throws { status, message } for 429/402 so the outer catch can map them.
    async function callAI(sysPrompt: string, usrPrompt: string, label: string): Promise<string> {
      const startTs = Date.now();
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: usrPrompt },
          ],
          stream: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again shortly." };
        if (resp.status === 402) throw { status: 402, message: "AI usage limit reached. Please add credits." };
        const errText = await resp.text();
        console.error("[PlanGen] AI gateway error", { label, status: resp.status, body: errText.slice(0, 500) });
        throw new Error("AI gateway error");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          } catch { /* partial chunk, skip */ }
        }
      }

      console.log("[PlanGen] AI call complete", {
        label,
        elapsedMs: Date.now() - startTs,
        responseLength: fullContent.length,
      });
      return fullContent;
    }

    // Safe JSON parse — throws a tagged ParseError so the outer
    // catch can map it to a 422 response (instead of a generic 500).
    function safeParseJSON(raw: string, label: string): any {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      try {
        return JSON.parse(cleaned);
      } catch (parseError) {
        console.error("[PlanGen] JSON parse failed", {
          label,
          rawLength: cleaned.length,
          tail: cleaned.slice(-500),
          error: (parseError as Error).message,
        });
        const err: any = new Error("Failed to parse AI response");
        err.status = 422;
        err.code = "parse_error";
        throw err;
      }
    }

    // Validate no two consecutive training days share identical exercise lists
    function validatePlanExerciseUniqueness(workoutPlan: any[]): boolean {
      const trainingDays = workoutPlan.filter((d: any) => d.exercises && d.exercises.length > 0);
      for (let i = 1; i < trainingDays.length; i++) {
        const prev = trainingDays[i - 1].exercises.map((e: any) => e.name).sort().join(",");
        const curr = trainingDays[i].exercises.map((e: any) => e.name).sort().join(",");
        if (prev === curr) {
          console.error(`[PlanGen] PLAN VALIDATION FAILED: Training day ${i + 1} has identical exercises to day ${i}.`);
          return false;
        }
      }
      return true;
    }

    let plan: any;

    // === SINGLE-CALL STRATEGY ===
    // Plans are now always exactly 4 weeks (1 month). The previous 12-week
    // parallel-chunk strategy is removed because all plans now fit comfortably
    // in a single AI call (well under the 140s wall-clock budget). Users
    // continue to month 2/3/etc through the in-app completion modal, which
    // creates a fresh plan with plan_month_number incremented.
    const raw = await callAI(systemPrompt, userPrompt, "single-call-4-weeks");
    plan = safeParseJSON(raw, "single-call-4-weeks");

    // Validate exercise uniqueness
    const trainingDayCount = (plan.workout_plan || []).filter((d: any) => d.exercises?.length > 0).length;
    const exerciseSignatures = new Set(
      (plan.workout_plan || [])
        .filter((d: any) => d.exercises?.length > 0)
        .map((d: any) => d.exercises.map((e: any) => e.name).sort().join(","))
    );
    console.log("[PlanGen] Validation summary", {
      duration,
      trainingDayCount,
      uniqueDaySignatures: exerciseSignatures.size,
    });

    if (!validatePlanExerciseUniqueness(plan.workout_plan || [])) {
      console.warn("[PlanGen] Validation failed — retrying generation once");
      const retryRaw = await callAI(
        systemPrompt,
        userPrompt + "\n\nCRITICAL: Each training day MUST have completely different exercises. Do NOT repeat the same exercise list on multiple days.",
        "retry-single-call"
      );
      plan = safeParseJSON(retryRaw, "retry");
    }

    console.log("[PlanGen] Plan returned successfully", {
      duration,
      totalWorkoutDays: (plan.workout_plan || []).length,
      trainingDayCount,
    });

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
      return jsonResponse({ error: "rate_limit", message: e.message }, 429);
    }
    if (e?.status === 402) {
      return jsonResponse({ error: "payment_required", message: e.message }, 402);
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
      { error: "internal_error", message: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});
