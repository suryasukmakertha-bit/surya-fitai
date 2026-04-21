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

// ── Helper: build a weekly grocery list from actual generated meals ──
function buildGroceryList(meals: any[], lang: "id" | "en" | "zh"): string[] {
  if (!Array.isArray(meals) || meals.length === 0) return [];
  const splitter = /[+,&、，;]| dan | and | with /gi;
  const counts = new Map<string, number>();
  for (const m of meals) {
    const raw = String(m?.name || "").trim();
    if (!raw) continue;
    raw.split(splitter)
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
      .forEach((ingredient) => {
        const clean = ingredient
          .replace(/^[•\-\*]+\s*/, "")
          .replace(/\s+\(porsi kecil\)/gi, "")
          .trim();
        if (!clean) return;
        counts.set(clean, (counts.get(clean) || 0) + 1);
      });
  }
  const xLabel = lang === "zh" ? "次" : "x";
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} × ${count * 7}${xLabel}`);
}

// ── New meal-plan generator (inline, replaces engine's meal_plan) ──
function generateMealPlan(userProfile: any) {
  const {
    targetCalories = 2000,
    protein = 140,
    carbs = 200,
    fat = 65,
    goal = "bulking",
    language = "id",
    food_allergies = [],
    food_style = "local",
    meal_frequency = 5,
    intermittent_fasting = false,
  } = userProfile;

  const a = (food_allergies as string[]).map((x: string) => x.toLowerCase());
  const noGluten  = a.some((x: string) => ["gluten","wheat","gandum"].includes(x));
  const noDairy   = a.some((x: string) => ["dairy","susu","lactose","yogurt",
    "greek yogurt","keju","cheese","butter","mentega","whey",
    "krim","cream"].includes(x));
  const noNuts    = a.some((x: string) => ["nuts","kacang"].includes(x));
  const noEgg     = a.some((x: string) => ["egg","telur"].includes(x));
  const noSeafood = a.some((x: string) => ["seafood","ikan","fish","udang",
    "shrimp"].includes(x));

  const ingredientPools: Record<string, any> = {
    local: {
      proteins_meat: (!noSeafood && !noEgg)
        ? ["Ayam kampung panggang","Telur ayam rebus","Ikan lele goreng",
           "Ikan kembung kukus","Tempe bakar","Tahu goreng",
           "Daging sapi tumis","Ayam rebus"]
        : ["Tempe bakar","Tahu goreng","Tempe kukus","Tahu bacem"],
      carbs: noGluten
        ? ["Nasi putih","Nasi merah","Ubi jalar kukus","Singkong rebus",
           "Kentang rebus","Jagung rebus"]
        : ["Nasi putih","Nasi merah","Ubi jalar kukus","Singkong rebus",
           "Kentang rebus"],
      vegetables: ["Tumis bayam","Tumis kangkung","Brokoli kukus",
        "Tumis wortel","Kol rebus","Tumis pak choy","Lalapan segar",
        "Tumis kacang panjang","Sayur bening bayam"],
      fats: noNuts
        ? ["Santan kelapa","Minyak kelapa"]
        : ["Kacang tanah rebus","Santan kelapa","Minyak kelapa"],
    },
    budget: {
      proteins_meat: (!noEgg)
        ? ["Telur rebus","Tempe goreng","Tahu goreng","Tempe bakar",
           "Telur dadar","Ikan asin (porsi kecil)","Tahu kukus"]
        : ["Tempe goreng","Tahu goreng","Tempe bakar","Tahu kukus"],
      carbs: ["Nasi putih","Ubi jalar kukus","Singkong rebus",
        "Kentang rebus","Jagung rebus"],
      vegetables: ["Tumis bayam","Tumis kangkung","Sayur bening",
        "Tumis kol","Lalapan","Tumis tauge","Sup sayur"],
      fats: noNuts
        ? ["Minyak kelapa","Santan encer"]
        : ["Kacang tanah rebus","Minyak kelapa"],
    },
    western: {
      proteins_meat: (!noSeafood && !noEgg)
        ? ["Grilled chicken breast","Salmon fillet","Boiled eggs",
           "Lean beef","Tuna","Turkey breast","Cottage cheese"]
        : ["Grilled chicken breast","Lean beef","Turkey breast"],
      carbs: noGluten
        ? ["Brown rice","Sweet potato","Quinoa","Oats","Potato"]
        : ["Brown rice","Sweet potato","Whole wheat bread",
           "Quinoa","Oats"],
      vegetables: ["Steamed broccoli","Spinach salad","Kale",
        "Asparagus","Green beans","Cucumber","Cherry tomatoes"],
      fats: noNuts
        ? ["Avocado","Olive oil 1 tbsp"]
        : ["Avocado","Almonds 15g","Olive oil 1 tbsp",
           "Walnuts 15g"],
    },
    asian: {
      proteins_meat: (!noSeafood && !noEgg)
        ? ["Steamed fish","Tofu stir-fry","Boiled eggs",
           "Steamed chicken","Shrimp","Edamame","Miso tofu"]
        : ["Tofu stir-fry","Steamed tofu","Edamame","Miso tofu"],
      carbs: ["Steamed rice","Brown rice","Rice congee",
        "Soba noodles","Sweet potato"],
      vegetables: ["Bok choy","Steamed broccoli","Spinach",
        "Bean sprouts","Napa cabbage","Mushrooms","Edamame"],
      fats: noNuts
        ? ["Sesame oil 1 tsp","Tofu"]
        : ["Sesame oil 1 tsp","Peanut sauce (small)"],
    },
    high_protein: {
      proteins_meat: (!noSeafood && !noEgg)
        ? ["Chicken breast 200g","Whey protein shake","Egg whites 4",
           "Tuna 150g","Lean beef 150g","Greek yogurt","Salmon 150g"]
        : ["Chicken breast 200g","Lean beef 150g","Tempeh 150g"],
      carbs: noGluten
        ? ["Brown rice","Sweet potato","Oats","Quinoa"]
        : ["Brown rice","Sweet potato","Whole wheat bread","Oats"],
      vegetables: ["Broccoli","Spinach","Asparagus","Cucumber",
        "Bell pepper","Kale"],
      fats: noNuts
        ? ["Avocado","Olive oil"]
        : ["Almonds 20g","Avocado","Olive oil","Peanut butter 1 tbsp"],
    },
    premium: {
      proteins_meat: (!noSeafood && !noEgg)
        ? ["Salmon fillet","Grass-fed beef","Free range eggs",
           "Organic chicken","Tuna steak","Shrimp","Sea bass"]
        : ["Grass-fed beef","Organic chicken","Organic tofu"],
      carbs: ["Quinoa","Sweet potato","Wild rice","Oats",
        "Ancient grain bread"],
      vegetables: ["Asparagus","Kale","Spinach","Broccolini",
        "Artichoke","Arugula","Brussels sprouts"],
      fats: noNuts
        ? ["Avocado","Olive oil","Coconut oil"]
        : ["Avocado","Almonds","Walnuts","Chia seeds","Olive oil"],
    },
  };

  const styleMap: Record<string, string> = {
    "makanan lokal hemat": "budget",
    "budget":              "budget",
    "lokal hemat":         "budget",
    "gaya barat":          "western",
    "western":             "western",
    "barat":               "western",
    "gaya asia":           "asian",
    "asian":               "asian",
    "asia":                "asian",
    "gaya tinggi protein fitness": "high_protein",
    "high_protein":        "high_protein",
    "tinggi protein":      "high_protein",
    "premium / fokus whole foods": "premium",
    "premium":             "premium",
    "whole foods":         "premium",
  };
  const styleKey = styleMap[(food_style || "local").toLowerCase()] || "local";
  const pool = ingredientPools[styleKey] || ingredientPools.local;

  let proteins: string[] = pool.proteins_meat;
  if (noDairy) {
    proteins = proteins.filter((p: string) => {
      const pl = p.toLowerCase();
      return !["yogurt","cheese","keju","whey","butter",
        "mentega","cream","krim","susu","milk",
        "cottage"].some((d) => pl.includes(d));
    });
  }
  if (proteins.length === 0) {
    proteins = ["Tempe bakar","Tahu goreng","Tempe kukus"];
  }

  const pick = (arr: string[]) => {
    const safe = arr.filter(Boolean);
    return safe[Math.floor(Math.random() * safe.length)] || "-";
  };

  const distributions: Record<number, number[]> = {
    3: [0.30, 0.40, 0.30],
    4: [0.25, 0.15, 0.35, 0.25],
    5: [0.22, 0.12, 0.30, 0.10, 0.26],
    6: [0.18, 0.10, 0.25, 0.12, 0.25, 0.10],
  };
  const freq = Math.min(Math.max(meal_frequency || 5, 3), 6);
  const dist = distributions[freq] || distributions[5];

  const mealNames: Record<string, string[]> = {
    id: ["Sarapan","Snack Pagi","Makan Siang",
         "Snack Sore","Makan Malam","Post-Workout"],
    en: ["Breakfast","Morning Snack","Lunch",
         "Afternoon Snack","Dinner","Post-Workout"],
    zh: ["早餐","上午零食","午餐","下午零食","晚餐","训练后"],
  };

  const baseTimes = intermittent_fasting
    ? ["12:00","14:00","16:30","19:00","21:00","22:00"]
    : ["07:00","10:00","13:00","16:00","19:30","21:00"];

  const names = mealNames[language] || mealNames.id;
  const meals: any[] = [];

  for (let i = 0; i < freq; i++) {
    const cal = Math.round(targetCalories * dist[i]);
    const pro = Math.round(protein * dist[i]);
    const isSnack = freq >= 4 && (i === 1 || i === 3 || i === 5);
    let food: string;
    if (isSnack) {
      const snackPool: Record<string, string[]> = {
        local:       ["Pisang + kacang tanah","Ubi rebus","Tahu kukus + kecap","Singkong rebus","Tempe goreng kering"],
        budget:      ["Pisang","Ubi rebus","Singkong rebus","Tempe goreng kering","Tahu goreng"],
        western:     ["Apple + almonds","Greek yogurt + berries","Rice cake + peanut butter","Banana + protein shake"],
        asian:       ["Edamame","Rice ball","Tofu pudding","Steamed bun","Miso soup"],
        high_protein:["Protein shake","Boiled eggs","Greek yogurt","Tuna on rice cake","Cottage cheese"],
        premium:     ["Acai bowl","Mixed nuts 20g","Protein smoothie","Avocado toast"],
      };
      let snacks = snackPool[styleKey] || snackPool.local;
      if (noDairy) snacks = snacks.filter((s) =>
        !["yogurt","cheese","milk","susu","whey","cream","krim"]
          .some((d) => s.toLowerCase().includes(d)));
      if (noNuts) snacks = snacks.filter((s) =>
        !["almond","walnut","kacang","peanut","nuts"]
          .some((n) => s.toLowerCase().includes(n)));
      if (noEgg) snacks = snacks.filter((s) =>
        !["egg","telur"].some((e) => s.toLowerCase().includes(e)));
      if (snacks.length === 0) snacks = ["Buah segar","Pisang","Ubi rebus"];
      food = pick(snacks);
    } else {
      const protein_item = pick(proteins);
      const carb_item    = pick(pool.carbs);
      const veg_item     = pick(pool.vegetables);
      const fat_item     = pick(pool.fats);
      food = goal === "cutting"
        ? `${protein_item} + ${carb_item} (porsi kecil) + ${veg_item}`
        : `${protein_item} + ${carb_item} + ${veg_item} + ${fat_item}`;
    }
    meals.push({
      time:     baseTimes[i] || "08:00",
      type:     names[i] || `Makan ${i+1}`,
      name:     food,
      calories: cal,
      protein:  pro,
    });
  }

  // Generate shopping list FROM meal plan
  const ingredientSet: Record<string, number> = {};
  meals.forEach((meal) => {
    meal.name.split("+").forEach((item: string) => {
      const cleaned = item.trim()
        .replace(/\(porsi kecil\)/gi,"")
        .replace(/\d+g|\d+ml|\d+tbsp|\d+tsp|\d+sdm/gi,"")
        .trim();
      if (cleaned.length > 2) {
        ingredientSet[cleaned] = (ingredientSet[cleaned] || 0) + 1;
      }
    });
  });
  const shopping_list = Object.entries(ingredientSet).map(
    ([item, count]) => ({
      item,
      quantity: count >= 5
        ? `${Math.ceil(count * 7 / 5)} porsi/minggu`
        : `${count * 7} porsi/minggu`,
    })
  );

  const allergyNote = (food_allergies as string[]).length > 0
    ? ({
        id: `Menu disesuaikan: bebas ${(food_allergies as string[]).join(", ")}`,
        en: `Menu adjusted: free from ${(food_allergies as string[]).join(", ")}`,
        zh: `菜单已调整：不含 ${(food_allergies as string[]).join("、")}`,
      } as Record<string, string>)[language] || null
    : null;

  const ifNote = intermittent_fasting
    ? ({
        id: "Jadwal IF 16/8: semua makan dalam window 12:00–20:00",
        en: "IF 16/8 schedule: all meals within 12:00–20:00 window",
        zh: "IF 16/8时间表：所有餐食在12:00-20:00内",
      } as Record<string, string>)[language] || null
    : null;

  return {
    daily_target: { calories: targetCalories, protein, carbs, fat },
    meals,
    shopping_list,
    notes: [allergyNote, ifNote].filter(Boolean),
  };
}

// ── Helper: injury-specific safety protocols ──
function getSafetyNotes(injuries: string[], language: string): string[] {
  const lang = language || "id";
  const notes: Record<string, Record<string, string[]>> = {
    knee_injury: {
      id: ["Hindari squat di bawah 90 derajat",
           "Tidak ada jumping atau high-impact exercise",
           "Jika lutut bengkak setelah latihan, istirahat 48 jam",
           "Gunakan knee sleeve/brace jika tersedia",
           "Hentikan segera jika nyeri lebih dari 6/10"],
      en: ["Avoid squats below 90 degrees",
           "No jumping or high-impact exercises",
           "If knee swells after training, rest 48 hours",
           "Use knee sleeve/brace if available",
           "Stop immediately if pain exceeds 6/10"],
    },
    lower_back_pain: {
      id: ["Hindari deadlift konvensional dan good morning",
           "Selalu aktifkan core sebelum setiap gerakan",
           "Tidak ada sit-up atau crunch penuh",
           "Gunakan lumbar support jika diperlukan",
           "Tidur dengan bantal di antara lutut untuk recovery"],
      en: ["Avoid conventional deadlifts and good mornings",
           "Always engage core before every movement",
           "No full sit-ups or crunches",
           "Use lumbar support if needed",
           "Sleep with pillow between knees for recovery"],
    },
    shoulder_injury: {
      id: ["Tidak ada overhead pressing selama fase akut",
           "Hindari bench press dengan grip terlalu lebar",
           "Prioritaskan face pull dan external rotation",
           "Jangan angkat beban di atas kepala",
           "Pemanasan rotator cuff 5 menit sebelum latihan bahu"],
      en: ["No overhead pressing during acute phase",
           "Avoid bench press with too wide grip",
           "Prioritize face pulls and external rotation",
           "Do not lift weights above head",
           "Warm up rotator cuff 5 min before shoulder work"],
    },
    elbow_pain: {
      id: ["Hindari EZ bar dan straight bar curl",
           "Gunakan neutral grip untuk semua pulling movement",
           "Tidak ada skull crusher atau close grip bench",
           "Kurangi volume bisep dan trisep 50% sementara",
           "Icing siku 10 menit setelah latihan"],
      en: ["Avoid EZ bar and straight bar curls",
           "Use neutral grip for all pulling movements",
           "No skull crushers or close grip bench",
           "Reduce bicep and tricep volume 50% temporarily",
           "Ice elbow 10 minutes after training"],
    },
    wrist_injury: {
      id: ["Gunakan wrist wrap untuk semua pressing movement",
           "Ganti push up biasa dengan push up fist",
           "Tidak ada barbell curl — ganti dumbbell atau cable",
           "Kurangi range of motion jika tidak nyaman",
           "Stretch pergelangan tangan 2 menit setelah latihan"],
      en: ["Use wrist wraps for all pressing movements",
           "Replace standard push ups with fist push ups",
           "No barbell curls — use dumbbell or cable",
           "Reduce range of motion if uncomfortable",
           "Stretch wrists 2 minutes after training"],
    },
    ankle_injury: {
      id: ["Tidak ada jumping, box jump, atau plyometrics",
           "Hindari single leg exercise sampai stabil",
           "Gunakan ankle brace saat latihan kaki",
           "Fokus pada upper body dan seated exercises",
           "Calf raise hanya jika tidak terasa nyeri"],
      en: ["No jumping, box jumps, or plyometrics",
           "Avoid single leg exercises until stable",
           "Use ankle brace during leg training",
           "Focus on upper body and seated exercises",
           "Calf raises only if pain-free"],
    },
    neck_pain: {
      id: ["Tidak ada shrug atau upright row",
           "Jaga posisi netral leher di semua gerakan",
           "Tidak ada overhead press dengan beban berat",
           "Hindari latihan yang butuh menahan napas kuat",
           "Peregangan leher ringan 5 menit setelah latihan"],
      en: ["No shrugs or upright rows",
           "Maintain neutral neck position in all movements",
           "No heavy overhead pressing",
           "Avoid exercises requiring heavy breath holding",
           "Light neck stretching 5 minutes after training"],
    },
  };
  const general: Record<string, string[]> = {
    id: ["Selalu lakukan pemanasan 5-8 menit sebelum latihan",
         "Hentikan jika ada nyeri tajam pada sendi",
         "Hidrasi cukup — minum 500ml air per jam latihan",
         "Tidur 7-8 jam untuk recovery optimal",
         "Jangan lewati sesi pendinginan setelah latihan"],
    en: ["Always warm up 5-8 minutes before training",
         "Stop if you feel sharp joint pain",
         "Stay hydrated — drink 500ml water per hour",
         "Sleep 7-8 hours for optimal recovery",
         "Never skip cool-down after training"],
  };
  if (!injuries || injuries.length === 0) {
    return general[lang] || general.id;
  }
  const combined: string[] = [];
  injuries.forEach((inj) => {
    const injNotes = notes[inj];
    if (injNotes) {
      const injLang = injNotes[lang] || injNotes.id;
      injLang.forEach((note) => {
        if (!combined.includes(note)) combined.push(note);
      });
    }
  });
  return combined.length > 0 ? combined : (general[lang] || general.id);
}

// ── (legacy) Helper kept for back-compat — no longer used in main flow ──
function buildSafetyNotes(injuries: string[], lang: "id" | "en" | "zh"): string[] {
  const PROTOCOLS: Record<string, Record<"id" | "en" | "zh", string[]>> = {
    knee_injury: {
      id: ["Hindari squat di bawah parallel (90 derajat)","Tidak ada jumping atau high-impact exercise","Jika lutut bengkak setelah latihan, istirahat 48 jam","Gunakan knee sleeve/brace jika tersedia","Hentikan segera jika nyeri lebih dari 6/10"],
      en: ["Avoid squats below parallel (90 degrees)","No jumping or high-impact exercises","If knee swells after training, rest 48 hours","Use knee sleeve/brace if available","Stop immediately if pain exceeds 6/10"],
      zh: ["避免深蹲低于平行（90度）","禁止跳跃或高冲击运动","训练后膝盖肿胀请休息48小时","如有可用护膝请佩戴","疼痛超过6/10立即停止"],
    },
    lower_back_pain: {
      id: ["Hindari deadlift konvensional dan good morning","Selalu aktifkan core sebelum setiap gerakan","Tidak ada sit-up atau crunch penuh","Gunakan lumbar support jika diperlukan","Tidur dengan bantal di antara lutut untuk recovery"],
      en: ["Avoid conventional deadlifts and good mornings","Always engage core before every movement","No full sit-ups or crunches","Use lumbar support if needed","Sleep with pillow between knees for recovery"],
      zh: ["避免常规硬拉和早安式","每个动作前先收紧核心","禁止完全仰卧起坐或卷腹","必要时使用腰部支撑","睡觉时膝盖间夹枕头以恢复"],
    },
    shoulder_injury: {
      id: ["Tidak ada overhead pressing selama fase akut","Hindari bench press dengan grip terlalu lebar","Prioritaskan face pull dan external rotation","Jangan angkat beban di atas kepala","Pemanasan rotator cuff 5 menit sebelum latihan bahu"],
      en: ["No overhead pressing during acute phase","Avoid bench press with too wide grip","Prioritize face pulls and external rotation","Do not lift weights above head","Warm up rotator cuff 5 min before shoulder work"],
      zh: ["急性期禁止过头推举","避免握距过宽的卧推","优先做面拉和外旋","不要在头顶举重","肩部训练前热身肩袖5分钟"],
    },
    elbow_pain: {
      id: ["Hindari EZ bar dan straight bar curl","Gunakan neutral grip untuk semua pulling movement","Tidak ada skull crusher atau close grip bench","Kurangi volume bisep dan trisep 50% sementara","Icing siku 10 menit setelah latihan"],
      en: ["Avoid EZ bar and straight bar curls","Use neutral grip for all pulling movements","No skull crushers or close grip bench press","Reduce bicep and tricep volume 50% temporarily","Ice elbow 10 minutes after training"],
      zh: ["避免EZ杠和直杠弯举","所有拉的动作使用中立握法","禁止颈后臂屈伸或窄距卧推","暂时减少肱二头肌和三头肌训练量50%","训练后冰敷肘部10分钟"],
    },
    wrist_injury: {
      id: ["Gunakan wrist wrap untuk semua pressing movement","Hindari push up biasa — ganti push up fist","Tidak ada barbell curl — ganti dumbbell atau cable","Kurangi range of motion jika tidak nyaman","Stretch pergelangan tangan 2 menit setelah latihan"],
      en: ["Use wrist wraps for all pressing movements","Avoid standard push ups — use fist push ups","No barbell curls — use dumbbell or cable","Reduce range of motion if uncomfortable","Stretch wrists 2 minutes after training"],
      zh: ["所有推的动作使用护腕","避免常规俯卧撑——改用拳式俯卧撑","禁止杠铃弯举——改用哑铃或绳索","不适时减小动作幅度","训练后拉伸手腕2分钟"],
    },
    ankle_injury: {
      id: ["Tidak ada jumping, box jump, atau lompatan apapun","Hindari single leg exercise sampai stabil","Gunakan ankle brace saat latihan kaki","Fokus pada upper body dan seated exercises","Calf raise hanya jika tidak terasa nyeri"],
      en: ["No jumping, box jumps, or any plyometrics","Avoid single leg exercises until stable","Use ankle brace during leg training","Focus on upper body and seated exercises","Calf raises only if pain-free"],
      zh: ["禁止跳跃、跳箱或任何弹跳动作","稳定前避免单腿训练","腿部训练时使用护踝","专注于上半身和坐姿动作","仅在无痛时做提踵"],
    },
    neck_pain: {
      id: ["Tidak ada shrug atau upright row","Hindari latihan yang butuh menahan napas kuat","Jaga posisi netral leher di semua gerakan","Tidak ada overhead press dengan beban berat","Peregangan leher ringan 5 menit setelah latihan"],
      en: ["No shrugs or upright rows","Avoid exercises requiring heavy breath holding","Maintain neutral neck position in all movements","No heavy overhead pressing","Light neck stretching 5 minutes after training"],
      zh: ["禁止耸肩或直立划船","避免需要强力憋气的动作","所有动作保持颈部中立位","禁止大重量过头推举","训练后轻柔拉伸颈部5分钟"],
    },
  };
  const GENERAL: Record<"id" | "en" | "zh", string[]> = {
    id: ["Selalu lakukan pemanasan 5-8 menit sebelum latihan","Hentikan jika ada nyeri tajam pada sendi","Hidrasi cukup — minum 500ml air per jam latihan","Tidur 7-8 jam untuk recovery optimal"],
    en: ["Always warm up 5-8 minutes before training","Stop if you feel sharp joint pain","Stay hydrated — drink 500ml water per hour","Sleep 7-8 hours for optimal recovery"],
    zh: ["训练前务必热身5-8分钟","如有关节剧痛请立即停止","充分补水——每小时饮用500毫升水","保证7-8小时睡眠以获得最佳恢复"],
  };
  if (!Array.isArray(injuries) || injuries.length === 0) return GENERAL[lang];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const inj of injuries) {
    const block = PROTOCOLS[inj]?.[lang];
    if (!block) continue;
    for (const note of block) {
      if (!seen.has(note)) {
        seen.add(note);
        out.push(note);
      }
    }
  }
  for (const g of GENERAL[lang].slice(0, 2)) {
    if (!seen.has(g)) out.push(g);
  }
  return out;
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
  injuries?: string[];
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
    safety_notes: getSafetyNotes(opts.injuries || [], lang),
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
        injuries: injuriesArr,
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