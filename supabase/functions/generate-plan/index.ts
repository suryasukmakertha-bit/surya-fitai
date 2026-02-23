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

// Server-side calculation functions
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
      startDate, startDay, foodStyle,
      sessionDuration, equipment, dailySteps, sleepHours, sleepQuality,
      stressLevel, nightShift, mealFrequency, intermittentFasting
    } = body;

    const lang = language === "id" ? "Indonesian (Bahasa Indonesia)" : language === "zh" ? "Mandarin Chinese (简体中文)" : "English";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Server-side calculations
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    const td = parseInt(trainingDaysPerWeek) || 4;

    const bmi = (w / ((h / 100) ** 2)).toFixed(1);
    const bmr = Math.round(calculateBMR(w, h, a, gender));
    const actMult = getActivityMultiplier(td);
    const tdee = Math.round(calculateTDEE(bmr, actMult, dailySteps || "4000-8000"));
    const macros = calculateMacros(tdee, w, programType);

    const workoutDays = td;
    const restDaysNum = 7 - workoutDays;
    const totalWeeks = duration === "3 Months" ? 12 : 4;
    const equipmentStr = Array.isArray(equipment) && equipment.length > 0 ? equipment.join(", ") : "Not specified";

    const systemPrompt = `You are Dr. SuryaFit — Senior Personal Trainer with 15+ years experience in Indonesia. Certified CSCS (NSCA) and Precision Nutrition Level 2.

You ALWAYS prioritize SAFETY, injury prevention, realistic progressive overload, and programs that fit with user data.

THINK STEP-BY-STEP internally:
1. Analyze full profile (age, limitations, stress, sleep, NEAT, equipment)
2. Choose safe volume, intensity, and ${totalWeeks <= 4 ? "4-week" : "12-week"} periodization with deload every 4th week
3. Select only safe exercises matching equipment (${equipmentStr}) & limitations
4. Build nutrition plan using the EXACT macro targets provided below
5. Add mobility & recovery protocols based on sleep quality and stress level

CALCULATED NUTRITION TARGETS (use these exact values):
- BMI: ${bmi}
- BMR: ${bmr} kcal/day
- TDEE: ${tdee} kcal/day
- Target Calories: ${macros.calories} kcal/day
- Protein: ${macros.protein}g/day
- Carbs: ${macros.carbs}g/day
- Fat: ${macros.fat}g/day

Generate a complete, personalized fitness and nutrition plan. Return ONLY valid JSON matching the exact schema below, no markdown, no extra text.

JSON Schema:
{
  "workout_plan": [{ "day": "string (e.g. Week 1 - Monday, 2025-03-10)", "exercises": [{ "name": "string", "sets": "string", "reps": "string", "rest": "string", "weight_kg": "string (recommended load)", "notes": "string (form cues / safety tips)" }] }],
  "meal_plan": [{ "meal": "string (e.g. Breakfast)", "foods": ["string (include portion size)"], "calories": number }],
  "calorie_target": ${macros.calories},
  "protein": ${macros.protein},
  "carbs": ${macros.carbs},
  "fat": ${macros.fat},
  "water_liters": number,
  "weekly_schedule": ["Mon: Type", "Tue: Type", ...],
  "safety_notes": ["string"],
  "motivational_message": "string",
  "grocery_list": ["string (with quantity)"],
  "estimated_calories_burned": number,
  "weight_projection": "string"
}

TRAINING SCIENCE RULES:
- Session duration target: ${sessionDuration || 60} minutes per workout
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
- Meal frequency: ${mealFrequency || 4} meals per day
${intermittentFasting ? '- Apply 16/8 Intermittent Fasting: first meal at 12:00 PM, last meal by 8:00 PM' : ''}
- STRICTLY follow the food style preference
- Include portion sizes in grams or household measures
- Adjust calories and macros based on the exact calculated targets above
- Grocery list should cover all meal plan ingredients with quantities
- If user has food allergies (${allergies || "None"}), NEVER include those allergens

OCCUPATION & LIFESTYLE:
- Occupation: ${occupation || "Not specified"}
- Consider occupation when adjusting: intensity, calorie estimation, daily activity multiplier, fatigue and recovery needs

OUTPUT LANGUAGE:
- Generate ALL text content in ${lang}
- JSON keys must remain in English, but all string VALUES must be in ${lang}`;

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
- Goal: ${goal || "General fitness"}
- Duration: ${duration}
- Experience: ${experience}
- Session Duration: ${sessionDuration || 60} minutes
- Equipment: ${equipmentStr}
- Limitations: ${limitations || "None"}
- Food Allergies: ${allergies || "None"}
- Occupation: ${occupation || "Not specified"}
- Training Days: ${workoutDays}/week, Rest Days: ${restDaysNum}/week
- Start Date: ${startDate || "Next Monday"} (${startDay || "Monday"})
- Food Style: ${foodStyle || "local"}
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
