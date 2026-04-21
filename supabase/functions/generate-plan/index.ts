import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore — pure-JS engine module without type annotations
import { generateHybridPlan, extendHybridPlan } from "./coachSuryaEngine.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

// Edge function wall-clock budget. Engine is mostly local (~2-5s);
// the only network hop is the single micro AI call for coach voice.
const FUNCTION_TIMEOUT_MS = 60_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function validateInput(data: any): string[] {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== "string") errors.push("Name is required");
  else if (data.name.length > 100) errors.push("Name is too long (max 100 characters)");
  const age = parseInt(data.age);
  if (isNaN(age) || age < 13 || age > 120) errors.push("Age must be between 13 and 120");
  const weight = parseFloat(data.weight);
  if (isNaN(weight) || weight < 20 || weight > 400) errors.push("Weight must be between 20 and 400 kg");
  const height = parseFloat(data.height);
  if (isNaN(height) || height < 80 || height > 280) errors.push("Height must be between 80 and 280 cm");
  if (!["male", "female", "other"].includes(data.gender)) errors.push("Invalid gender value");
  if (!["Beginner", "Intermediate", "Advanced"].includes(data.experience))
    errors.push("Invalid experience level");
  const trainingDays = parseInt(data.trainingDaysPerWeek);
  if (isNaN(trainingDays) || trainingDays < 2 || trainingDays > 7)
    errors.push("Training days per week must be between 2 and 7");
  if (data.goal && data.goal.length > 300) errors.push("Goal is too long");
  if (data.limitations && data.limitations.length > 500) errors.push("Limitations is too long");
  if (data.allergies && data.allergies.length > 500) errors.push("Allergies is too long");
  if (data.occupation && data.occupation.length > 200) errors.push("Occupation is too long");
  return errors;
}

function calculateBMR(weight: number, heightCm: number, age: number, gender: string): number {
  const base = 10 * weight + 6.25 * heightCm - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}
function getActivityMultiplier(td: number): number {
  if (td <= 2) return 1.2;
  if (td <= 3) return 1.375;
  if (td <= 5) return 1.55;
  if (td <= 6) return 1.725;
  return 1.9;
}
function calculateTDEE(bmr: number, mult: number, dailySteps: string): number {
  const stepsMap: Record<string, number> = {
    "<4000": 3000,
    "4000-8000": 6000,
    "8000-12000": 10000,
    ">12000": 14000,
    desk: 2500,
  };
  const steps = stepsMap[dailySteps] || 6000;
  const neat = steps > 8000 ? (steps - 8000) * 0.04 : 0;
  return bmr * mult + neat;
}
function calculateMacros(tdee: number, weight: number, programType: string) {
  if (programType === "bulking") {
    const c = Math.round(tdee * 1.15);
    return { calories: c, protein: Math.round(weight * 2.0), carbs: Math.round((c * 0.55) / 4), fat: Math.round((c * 0.25) / 9) };
  }
  if (programType === "cutting") {
    const c = Math.round(tdee * 0.8);
    return { calories: c, protein: Math.round(weight * 2.2), carbs: Math.round((c * 0.4) / 4), fat: Math.round((c * 0.3) / 9) };
  }
  const c = Math.round(tdee * 1.05);
  return { calories: c, protein: Math.round(weight * 1.8), carbs: Math.round((c * 0.5) / 4), fat: Math.round((c * 0.3) / 9) };
}

// Map UI program type → engine goal vocabulary.
function mapProgramToGoal(programType: string): string {
  const t = (programType || "").toLowerCase();
  if (t === "bulking") return "bulking";
  if (t === "cutting") return "cutting";
  if (t === "senior" || t === "senior-fitness") return "senior";
  return "beginner";
}

// Map UI experience → engine level.
function mapLevel(exp: string): string {
  const e = (exp || "").toLowerCase();
  if (e === "advanced") return "advanced";
  if (e === "intermediate") return "intermediate";
  return "beginner";
}

// Map UI equipment array → engine equipment tags.
function mapEquipmentArr(arr: any[]): string[] {
  if (!Array.isArray(arr) || arr.length === 0) return ["bodyweight"];
  const out = new Set<string>(["bodyweight"]);
  for (const e of arr) {
    const v = String(e).toLowerCase();
    if (v.includes("full") || v.includes("gym")) {
      ["barbell", "dumbbell", "cable", "machine", "gym"].forEach((x) => out.add(x));
    } else if (v.includes("home-barbell") || v === "barbell") {
      out.add("barbell");
      out.add("dumbbell");
    } else if (v.includes("dumbbell")) out.add("dumbbell");
    else if (v.includes("band") || v.includes("resistance")) out.add("band");
    else if (v === "none") {/* bodyweight only */}
  }
  return Array.from(out);
}

// Diet/style passthroughs with sensible fallbacks.
function mapDietType(d?: string): string {
  const v = (d || "omnivore").toLowerCase();
  if (v === "vegan") return "vegan";
  if (v === "vegetarian") return "vegetarian";
  return "omnivore";
}

function mapInjuries(limitations?: string): string[] {
  if (!limitations) return [];
  const t = limitations.toLowerCase();
  const out: string[] = [];
  if (t.includes("knee") || t.includes("lutut")) out.push("knee_injury");
  if (t.includes("shoulder") || t.includes("bahu")) out.push("shoulder_injury");
  if (t.includes("back") || t.includes("punggung")) out.push("lower_back_pain");
  if (t.includes("wrist") || t.includes("pergelangan")) out.push("wrist_injury");
  if (t.includes("elbow") || t.includes("siku")) out.push("elbow_pain");
  if (t.includes("ankle")) out.push("ankle_injury");
  return out;
}

function mapAllergies(allergies?: string): string[] {
  if (!allergies) return [];
  return allergies
    .toLowerCase()
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── ADAPTER: engine output → legacy schema consumed by Results.tsx ──
function adaptEnginePlan(opts: {
  enginePlan: any;
  language: "id" | "en" | "zh";
  programType: string;
  startDate?: string;
  startDay?: string;
  trainingDaysPerWeek: number;
  sessionDuration: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  estimatedCaloriesBurned: number;
  weightProjection: string;
}) {
  const {
    enginePlan, language, startDate, trainingDaysPerWeek, sessionDuration, macros,
    estimatedCaloriesBurned, weightProjection,
  } = opts;

  const coach = enginePlan.coach_message || {};
  const splitNames: string[] = enginePlan.weekly_schedule || [];
  const lang = language;

  const dayLabels: Record<"id" | "en" | "zh", string[]> = {
    id: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
    en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    zh: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  };
  const restLabel: Record<"id" | "en" | "zh", string> = {
    id: "Hari Istirahat",
    en: "Rest Day",
    zh: "休息日",
  };
  const weekLabel: Record<"id" | "en" | "zh", string> = { id: "Minggu", en: "Week", zh: "第" };
  const weekSuffix: Record<"id" | "en" | "zh", string> = { id: "", en: "", zh: "周" };

  // Build flat workout_plan array that Results.tsx can iterate week-by-week.
  const start = startDate ? new Date(startDate) : new Date();
  if (isNaN(start.getTime())) start.setTime(Date.now());

  const workout_plan: any[] = [];
  let dayCursor = 0;
  for (const week of enginePlan.plan_structure?.weeks || []) {
    for (const day of week.days || []) {
      const date = new Date(start);
      date.setDate(date.getDate() + dayCursor);
      dayCursor++;
      const dow = date.getDay(); // 0=Sun
      const dayName = dayLabels[lang][(dow + 6) % 7]; // index 0=Mon
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const weekTag = lang === "zh" ? `第${week.week_number}周` : `${weekLabel[lang]} ${week.week_number}${weekSuffix[lang]}`;
      const focusLabel = day.is_rest ? restLabel[lang] : day.focus;
      const dayHeader = `${weekTag} - ${dayName}, ${dateStr} — ${focusLabel}`;

      const exercises = (day.exercises || []).map((ex: any) => ({
        name: ex.name,
        sets: String(ex.sets ?? 3),
        reps: String(ex.reps ?? "8-12"),
        rest: `${ex.rest_seconds ?? 90} ${lang === "id" ? "detik" : lang === "zh" ? "秒" : "seconds"}`,
        tempo: String(ex.tempo ?? "2-0-2"),
        cues: "",
        alternative: "",
        estimatedTimeMinutes: 3,
        weight_kg: ex.intensity || "",
        notes: "",
      }));

      workout_plan.push({
        day: dayHeader,
        focus: focusLabel,
        warmup: day.warmup || "",
        progression_note: week.progression_note || "",
        exercises,
      });
    }
  }

  // Meal plan in legacy format: [{meal, time, foods[], calories}]
  const mp = enginePlan.meal_plan || { meals: [], notes: [], daily_target: {} };
  const meal_plan = (mp.meals || []).map((m: any) => ({
    meal: m.type,
    time: m.time,
    foods: [m.name],
    calories: m.calories,
  }));

  // weeklySplit for the "Schedule" tab — array of day labels (length = trainingDaysPerWeek).
  const weeklySplit = splitNames.map(
    (focus: string, i: number) => `Day ${i + 1}: ${focus}`,
  );

  // weekly_schedule (Mon..Sun) — fill training days with focus, rest otherwise.
  const weekly_schedule: string[] = [];
  for (let i = 0; i < 7; i++) {
    const label = dayLabels[lang][i];
    if (i < splitNames.length) weekly_schedule.push(`${label}: ${splitNames[i]}`);
    else weekly_schedule.push(`${label}: ${restLabel[lang]}`);
  }

  const warmUp =
    workout_plan.find((d) => d.warmup)?.warmup ||
    (lang === "id"
      ? "5 menit cardio ringan + dynamic stretching"
      : lang === "zh"
        ? "5分钟轻度有氧 + 动态拉伸"
        : "5 min light cardio + dynamic stretching");

  const coolDown =
    lang === "id"
      ? "5 menit static stretching pada kelompok otot yang dilatih, fokus pernapasan dalam."
      : lang === "zh"
        ? "5分钟静态拉伸训练过的肌肉群，专注深呼吸。"
        : "5 min static stretching on trained muscle groups, focus on deep breathing.";

  const safetyTips: Record<"id" | "en" | "zh", string[]> = {
    id: [
      "Hentikan latihan jika ada nyeri tajam pada sendi.",
      "Selalu lakukan pemanasan sebelum latihan utama.",
      "Hidrasi cukup — minum 500ml air per jam latihan.",
    ],
    en: [
      "Stop training if you feel sharp joint pain.",
      "Always warm up before main lifts.",
      "Hydrate well — drink 500ml water per hour of training.",
    ],
    zh: [
      "如感到关节剧痛请停止训练。",
      "主要训练前务必热身。",
      "充分补水——每小时训练饮用500毫升水。",
    ],
  };

  // Build the shopping list dynamically from the actual meal plan.
  // We split each meal name on common separators, count occurrences across
  // 7 days, and emit a "Ingredient × Nx" line per unique item.
  const groceryList = buildGroceryList(mp.meals || [], lang);

  const progressionRulesByLang: Record<"id" | "en" | "zh", string> = {
    id: "Tingkatkan beban 2.5–5 kg pada compound lifts setiap minggu jika set terakhir terasa di RPE 7 atau lebih ringan. Untuk isolasi: tambah 1–2 reps sebelum naik beban.",
    en: "Add 2.5–5 kg on compound lifts each week if the last set felt RPE 7 or lighter. For isolation: add 1–2 reps before increasing weight.",
    zh: "如果最后一组感觉RPE 7或更轻，每周在复合动作上增加2.5–5公斤。隔离动作：加重前先增加1–2次。",
  };
  const deloadByLang: Record<"id" | "en" | "zh", string> = {
    id: "Minggu 4 adalah deload — kurangi beban 25–30% dan volume sedikit. Tujuannya recovery dan supercompensation untuk bulan berikutnya.",
    en: "Week 4 is a deload — reduce load by 25–30% and slightly reduce volume. Goal: recovery and supercompensation for the next month.",
    zh: "第4周是减量周——减少25–30%的负荷并略微降低训练量。目标：为下个月恢复和超级补偿。",
  };
  const recoveryByLang: Record<"id" | "en" | "zh", string> = {
    id: "Tidur 7–9 jam per malam, 1 hari rest aktif penuh setiap minggu, dan foam roll 10 menit setelah latihan berat.",
    en: "Sleep 7–9 hours per night, take 1 full active rest day per week, and foam roll for 10 minutes after heavy sessions.",
    zh: "每晚睡7–9小时，每周安排1天完全主动休息，重训练后泡沫轴放松10分钟。",
  };

  return {
    programOverview: coach.opening || "",
    durationWeeks: 4,
    weeklySplit,
    estimatedSessionTimeMinutes: sessionDuration,
    warmUp,
    workout_plan,
    coolDown,
    meal_plan,
    meal_plan_notes: Array.isArray(mp.notes) ? mp.notes : [],
    calorie_target: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    water_liters: 3,
    weekly_schedule,
    safety_notes: buildSafetyNotes(opts.injuries || [], lang),
    warnings: enginePlan.injury_notes ? [enginePlan.injury_notes] : [],
    motivational_message: coach.motivation || "",
    grocery_list: groceryList,
    estimated_calories_burned: estimatedCaloriesBurned,
    weight_projection: weightProjection,
    progressionRules: progressionRulesByLang[lang],
    deloadWeek: deloadByLang[lang],
    recoveryTips: recoveryByLang[lang],
    coach_tips: Array.isArray(coach.key_tips) ? coach.key_tips : [],
    week_focus: coach.week_focus || "",
    coach_message: {
      opening: coach.opening || "",
      key_tips: Array.isArray(coach.key_tips) ? coach.key_tips : [],
      motivation: coach.motivation || "",
      week_focus: coach.week_focus || "",
    },
    injury_notes: enginePlan.injury_notes || null,
    meta: enginePlan.meta || {},
  };
}

// ── Lovable AI Gateway shim that mimics Anthropic's response shape ──
// The engine calls anthropicApiCall({ messages, max_tokens, model }) and
// reads res.content[].text. We translate that to OpenAI-style chat completions
// against the Lovable gateway and wrap the answer back into Anthropic shape.
function makeLovableAiCall(apiKey: string) {
  return async function (params: any): Promise<any> {
    const userText = (params?.messages?.[0]?.content ?? "").toString();
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: params?.max_tokens ?? 400,
        messages: [{ role: "user", content: userText }],
      }),
    });
    if (!resp.ok) {
      if (resp.status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again shortly." };
      if (resp.status === 402) throw { status: 402, message: "AI usage limit reached. Please add credits." };
      throw new Error(`AI gateway error ${resp.status}`);
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { content: [{ type: "text", text }] };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const work = (async () => {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "auth_required", message: "Authentication required" }, 401);
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return jsonResponse({ error: "invalid_auth", message: "Invalid authentication" }, 401);
      }

      const body = await req.json();
      const validationErrors = validateInput(body);
      if (validationErrors.length > 0) {
        return jsonResponse({ error: "invalid_input", message: "Invalid input", details: validationErrors }, 400);
      }

      const {
        name, age, gender, weight, height, goal, experience, limitations,
        programType, language, allergies, occupation, trainingDaysPerWeek,
        startDate, startDay, foodStyle, dietType,
        sessionDuration, equipment, dailySteps, sleepHours, sleepQuality,
        stressLevel, nightShift, mealFrequency, intermittentFasting,
        injuries: injuriesInput, foodAllergies: foodAllergiesInput,
        additionalConditions, additionalAllergies, country_code,
        extensionContext,
      } = body;

      const lang: "id" | "en" | "zh" =
        language === "en" ? "en" : language === "zh" ? "zh" : "id";

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const w = parseFloat(weight);
      const h = parseFloat(height);
      const a = parseInt(age);
      const td = parseInt(trainingDaysPerWeek) || 4;
      const sessionMin = parseInt(sessionDuration) || 60;

      const bmr = Math.round(calculateBMR(w, h, a, gender));
      const actMult = getActivityMultiplier(td);
      const tdee = Math.round(calculateTDEE(bmr, actMult, dailySteps || "4000-8000"));
      const macros = calculateMacros(tdee, w, programType);

      // Prefer explicit chip arrays from the new "Additional Info" section.
      // Fallback to deriving from free-text limitations/allergies when not provided.
      const injuriesArr = Array.isArray(injuriesInput) && injuriesInput.length > 0
        ? injuriesInput.map((s: any) => String(s))
        : mapInjuries(limitations);
      const foodAllergiesArr = Array.isArray(foodAllergiesInput) && foodAllergiesInput.length > 0
        ? foodAllergiesInput.map((s: any) => String(s))
        : mapAllergies(allergies);

      const userProfile: any = {
        name,
        language: lang,
        age: a,
        gender: gender || "not specified",
        goal: mapProgramToGoal(programType),
        level: mapLevel(experience),
        equipment: mapEquipmentArr(equipment),
        daysPerWeek: td,
        sessionDuration: sessionMin,
        monthNumber: 1,
        injuries: injuriesArr,
        food_allergies: foodAllergiesArr,
        diet_type: mapDietType(dietType),
        food_style: foodStyle || "local",
        user_food_style_explicit: !!(foodStyle && foodStyle !== ""),
        country_code: (country_code || "ID").toString().toUpperCase(),
        additional_conditions: typeof additionalConditions === "string" ? additionalConditions.slice(0, 200) : "",
        additional_allergies:  typeof additionalAllergies  === "string" ? additionalAllergies.slice(0, 200)  : "",
        meal_frequency: parseInt(mealFrequency) || 5,
        intermittent_fasting: !!intermittentFasting,
        stress_level: parseInt(stressLevel) || 5,
        occupation: occupation || "not specified",
        bmr,
        tdee,
        targetCalories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      };

      console.log("[PlanGen] START (engine v3)", {
        userId: claimsData.claims.sub?.substring(0, 8),
        program: userProfile.goal,
        level: userProfile.level,
        equipment: userProfile.equipment.join(","),
        days: td,
        lang,
        extension: !!extensionContext,
      });

      const aiCall = makeLovableAiCall(LOVABLE_API_KEY);

      const enginePlan = extensionContext?.previousMonthNumber
        ? await extendHybridPlan(userProfile, extensionContext.previousMonthNumber, aiCall)
        : await generateHybridPlan(userProfile, aiCall);

      // Heuristic projections for the legacy "weight_projection" / "estimated_calories_burned" fields.
      const estimatedCaloriesBurned = Math.round((sessionMin / 60) * 350 * td);
      const wpText: Record<"id" | "en" | "zh", string> = {
        id:
          userProfile.goal === "bulking"
            ? "Target penambahan 0.5–1 kg dalam 4 minggu (sebagian besar otot bila konsumsi protein dan tidur cukup)."
            : userProfile.goal === "cutting"
              ? "Target penurunan 1.5–3 kg dalam 4 minggu dengan defisit ringan dan volume terjaga."
              : "Komposisi tubuh membaik dalam 4 minggu — kekuatan naik, lingkar pinggang turun.",
        en:
          userProfile.goal === "bulking"
            ? "Expect +0.5–1 kg over 4 weeks (mostly muscle if protein and sleep are on point)."
            : userProfile.goal === "cutting"
              ? "Expect -1.5–3 kg over 4 weeks with a moderate deficit and preserved training volume."
              : "Improved body composition in 4 weeks — strength up, waist down.",
        zh:
          userProfile.goal === "bulking"
            ? "4周内增加0.5–1公斤（如果蛋白质和睡眠到位，主要是肌肉）。"
            : userProfile.goal === "cutting"
              ? "在适度热量缺口和保持训练量的情况下，4周减重1.5–3公斤。"
              : "4周内身体成分改善——力量上升，腰围下降。",
      };

      const adapted = adaptEnginePlan({
        enginePlan,
        language: lang,
        programType,
        startDate,
        startDay,
        trainingDaysPerWeek: td,
        sessionDuration: sessionMin,
        macros,
        estimatedCaloriesBurned,
        weightProjection: wpText[lang],
      });

      console.log("[PlanGen] DONE", {
        days: adapted.workout_plan.length,
        meals: adapted.meal_plan.length,
      });

      return jsonResponse(adapted, 200);
    })();

    const timeoutPromise = new Promise<Response>((_resolve, reject) =>
      setTimeout(
        () => reject({ status: 408, code: "timeout", message: "Plan generation timed out" }),
        FUNCTION_TIMEOUT_MS,
      ),
    );

    return await Promise.race([work, timeoutPromise]);
  } catch (e: any) {
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
    console.error("[PlanGen] FAILED — internal error", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return jsonResponse(
      { error: "internal_error", message: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});