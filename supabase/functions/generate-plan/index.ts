import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function validateInput(data: any): string[] {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
  } else if (data.name.length > 100) {
    errors.push('Name is too long (max 100 characters)');
  }

  const age = parseInt(data.age);
  if (isNaN(age) || age < 13 || age > 120) {
    errors.push('Age must be between 13 and 120');
  }

  const weight = parseFloat(data.weight);
  if (isNaN(weight) || weight < 20 || weight > 400) {
    errors.push('Weight must be between 20 and 400 kg');
  }

  const height = parseFloat(data.height);
  if (isNaN(height) || height < 80 || height > 280) {
    errors.push('Height must be between 80 and 280 cm');
  }

  const validGenders = ['male', 'female', 'other'];
  if (!validGenders.includes(data.gender)) {
    errors.push('Invalid gender value');
  }

  const validDurations = ['1 Month', '3 Months'];
  if (!validDurations.includes(data.duration)) {
    errors.push('Invalid duration value');
  }

  const validExperience = ['Beginner', 'Intermediate', 'Advanced'];
  if (!validExperience.includes(data.experience)) {
    errors.push('Invalid experience level');
  }

  const restDays = parseInt(data.restDays);
  if (isNaN(restDays) || restDays < 1 || restDays > 3) {
    errors.push('Rest days must be between 1 and 3');
  }

  if (data.goal && data.goal.length > 300) {
    errors.push('Goal is too long (max 300 characters)');
  }
  if (data.limitations && data.limitations.length > 500) {
    errors.push('Limitations is too long (max 500 characters)');
  }
  if (data.allergies && data.allergies.length > 500) {
    errors.push('Allergies is too long (max 500 characters)');
  }
  if (data.occupation && data.occupation.length > 200) {
    errors.push('Occupation is too long (max 200 characters)');
  }

  return errors;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const body = await req.json();
    const validationErrors = validateInput(body);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, age, gender, weight, height, goal, duration, experience, limitations, programType, language, allergies, occupation, restDays, startDate, startDay } = body;
    const lang = language === "id" ? "Indonesian (Bahasa Indonesia)" : "English";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const bmi = (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1);
    const restDaysNum = parseInt(restDays) || 2;
    const workoutDays = 7 - restDaysNum;

    const systemPrompt = `You are a certified international-level personal trainer and sports nutritionist with expertise in evidence-based fitness coaching. You apply modern training science principles including progressive overload, periodization, and recovery optimization.

Generate a complete, personalized fitness and nutrition plan. Return ONLY valid JSON matching the exact schema below, no markdown, no extra text.

JSON Schema:
{
  "workout_plan": [{ "day": "string (e.g. Week 1 - Monday, 2025-03-10)", "exercises": [{ "name": "string", "sets": "string", "reps": "string", "rest": "string", "weight_kg": "string (recommended load)", "notes": "string (form cues / safety tips)" }] }],
  "meal_plan": [{ "meal": "string (e.g. Breakfast)", "foods": ["string (include portion size)"], "calories": number }],
  "calorie_target": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "water_liters": number,
  "weekly_schedule": ["Mon: Type", "Tue: Type", ...],
  "safety_notes": ["string"],
  "motivational_message": "string",
  "grocery_list": ["string (with quantity)"],
  "estimated_calories_burned": number,
  "weight_projection": "string"
}

TRAINING SCIENCE RULES:
- Apply progressive overload: systematically increase weight, reps, or volume across weeks
- Week 1: Adaptation phase (moderate intensity 60-70% capacity)
- Week 2: Volume increase (add 1-2 reps or 1 extra set)
- Week 3: Load increase (add 2.5-5kg on compound lifts, 1-2.5kg on isolation)
- Week 4: Deload/variation week (reduce volume by 30-40%, introduce exercise variations)
- For 3-month plans, repeat this 4-week mesocycle 3 times with progressive baseline increases
- Include recommended weight load (kg) for EVERY exercise based on:
  * Beginner: conservative loads focusing on form (e.g., Bench Press 20-30kg, Squat 20-40kg)
  * Intermediate: moderate loads (e.g., Bench Press 40-60kg, Squat 60-80kg)
  * Advanced: challenging loads (e.g., Bench Press 60-100kg, Squat 80-120kg)
  * Adjust for gender and body weight
- Include form cues and safety notes for each exercise
- Vary exercises between weeks to prevent plateaus
- Use proper training splits (Push/Pull/Legs, Upper/Lower, or Full Body based on frequency)

PROGRAM-SPECIFIC RULES:
- "senior" program: low-impact exercises, avoid heavy lifts, add balance/flexibility work, extra safety notes, bodyweight or light loads only
- "beginner" program: simple exercises with detailed form cues, moderate volume, focus on compound movements
- "bulking" program: high volume (4-5 sets), progressive overload priority, caloric surplus meals (+300-500 kcal above TDEE)
- "cutting" program: caloric deficit (-300-500 kcal below TDEE), higher protein (2.2-2.5g/kg), include HIIT 2-3x/week, maintain training intensity

SCHEDULING:
- The user wants ${workoutDays} training days and ${restDaysNum} rest day(s) per week
- Training starts on ${startDay || "Monday"}, ${startDate || "next week"}
- The workout plan MUST start on this exact day and date
- Label each day with the actual day name and date (e.g., "Week 1 - Monday, March 10")
- Distribute muscle groups evenly with balanced rotation and recovery optimization
- Plan duration: ${duration} (generate a 4-week or 12-week cycle accordingly)

MEAL PLAN RULES:
- Use foods and ingredients commonly available in Indonesia
- Prioritize Indonesian staple foods: nasi putih/merah (white/brown rice), ayam dada (chicken breast), telur (eggs), tempe, tahu (tofu), ikan (fish like tongkol, salmon, lele), sayuran lokal (kangkung, bayam, brokoli, wortel), buah lokal (pisang, pepaya, jeruk)
- Include portion sizes in grams or household measures (e.g., "1 piring nasi merah (150g)", "2 butir telur rebus")
- 4-5 meals per day
- Adjust calories and macros based on user goals and TDEE calculation
- Grocery list should cover all meal plan ingredients with quantities
- If user has food allergies, NEVER include those allergens — substitute with safe alternatives

OCCUPATION & LIFESTYLE:
- Consider the user's occupation when adjusting: intensity, calorie estimation, daily activity multiplier (NEAT), fatigue and recovery needs

OUTPUT LANGUAGE:
- Generate ALL text content (meal names, exercise names, day labels, safety notes, motivational message, weight projection, grocery list items, weekly schedule, form notes) in ${lang}
- JSON keys must remain in English, but all string VALUES must be in ${lang}`;

    const userPrompt = `User Data:
- Name: ${name}
- Age: ${age}
- Gender: ${gender}
- Weight: ${weight} kg
- Height: ${height} cm
- BMI: ${bmi}
- Program: ${programType}
- Goal: ${goal}
- Duration: ${duration}
- Experience: ${experience}
- Limitations: ${limitations || "None"}
- Food Allergies: ${allergies || "None"}
- Occupation: ${occupation || "Not specified"}
- Preferred Rest Days: ${restDaysNum} day(s) per week
- Training Start Date: ${startDate || "Next Monday"}
- Training Start Day: ${startDay || "Monday"}

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
