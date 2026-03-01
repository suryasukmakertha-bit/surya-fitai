import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  if (!['1 Month', '3 Months'].includes(data.duration)) errors.push('Invalid duration value');
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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const validationErrors = validateInput(body);
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: validationErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const {
      name, age, gender, weight, height, goal, duration, experience, limitations,
      programType, language, allergies, occupation, restDays, trainingDaysPerWeek,
      startDate, startDay, foodStyle, dietType,
      sessionDuration, equipment, dailySteps, sleepHours, sleepQuality,
      stressLevel, nightShift, mealFrequency, intermittentFasting
    } = body;

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
    const totalWeeks = duration === "3 Months" ? 12 : 4;
    const equipmentStr = Array.isArray(equipment) && equipment.length > 0 ? equipment.join(", ") : "Not specified";

    const systemPrompt = `You are Dr. SuryaFit — Senior Personal Trainer with 15+ years experience in Indonesia. Certified CSCS (NSCA) and Precision Nutrition Level 2.

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
- Target total working sets per session: ${targetSets} sets (calculated from ${targetLiftingMinutes} min lifting time at 2.3 min/set avg)
- Session duration target: ${sessionMin} minutes (5 min warm-up + ${targetLiftingMinutes} min lifting + 5 min cool-down)
- Apply progressive overload: systematically increase weight, reps, or volume across weeks
- Week 1: Adaptation phase (moderate intensity 60-70% capacity)
- Week 2: Volume increase (add 1-2 reps or 1 extra set)
- Week 3: Load increase (add 2.5-5kg on compound lifts, 1-2.5kg on isolation)
- Week 4: Deload/variation week (reduce volume by 30-40%, introduce exercise variations)
- For 3-month plans, repeat this 4-week mesocycle 3 times with progressive baseline increases, deload on week 7
- Include recommended weight load (kg) for EVERY exercise
- Include form cues and safety notes for each exercise
- Use proper training splits based on ${workoutDays} training days per week
- Only use exercises doable with: ${equipmentStr}

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let plan;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      plan = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
