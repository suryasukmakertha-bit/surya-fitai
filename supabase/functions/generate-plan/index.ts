import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, age, gender, weight, height, goal, duration, experience, limitations, programType, language, allergies } = await req.json();
    const lang = language === "id" ? "Indonesian (Bahasa Indonesia)" : "English";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const bmi = (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1);

    const systemPrompt = `You are an expert AI personal trainer and nutritionist. Generate a complete, personalized fitness and nutrition plan based on user data. Return ONLY valid JSON matching the exact schema below, no markdown, no extra text.

JSON Schema:
{
  "workout_plan": [{ "day": "string", "exercises": [{ "name": "string", "sets": "string", "reps": "string", "rest": "string" }] }],
  "meal_plan": [{ "meal": "string (e.g. Breakfast)", "foods": ["string"], "calories": number }],
  "calorie_target": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "water_liters": number,
  "weekly_schedule": ["Mon: Type", "Tue: Type", ...],
  "safety_notes": ["string"],
  "motivational_message": "string",
  "grocery_list": ["string"],
  "estimated_calories_burned": number,
  "weight_projection": "string"
}

Rules:
- For "senior" program: use low-impact exercises, avoid heavy lifts, add balance/flexibility work, include extra safety notes
- For "beginner" program: use simple exercises with clear form cues, moderate volume
- For "bulking" program: high volume, progressive overload, caloric surplus meals
- For "cutting" program: caloric deficit, higher protein, include HIIT
- Adjust intensity based on experience level and age
- Include 5-6 training days with 1-2 rest days
- Meal plan should have 4-5 meals per day
- Grocery list should cover all meal plan ingredients
- If the user has food allergies, NEVER include those allergens in meals or grocery list. Substitute with safe alternatives.
- IMPORTANT: Generate ALL text content (meal names, exercise names, day labels, safety notes, motivational message, weight projection, grocery list items, weekly schedule) in ${lang}. The JSON keys must remain in English, but all string VALUES must be in ${lang}.`;

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

    // Parse JSON from response (strip markdown fences if present)
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
