import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE = "https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/";

// CURATED EXERCISE → DEMO IMAGE MAP.
// Keys MUST match the canonical exercise name produced by generate-plan
// EXACTLY (case-sensitive). If a name is not in this map, the client
// shows a "Demo coming soon" placeholder. NO API/cache fallback.
const STATIC_GIF_MAP: Record<string, string> = {
  // CHEST
  "Barbell Bench Press": "barbell-bench-press-flat.jpg",
  "Incline Barbell Press": "incline-barbell-press.jpg",
  "Cable Crossover": "cable-crossover.jpg",

  // BACK
  "Lat Pulldown": "lat-pulldown-wide-grip.jpg",
  "T-Bar Row": "t-bar-row.jpg",
  "Face Pull": "face-pull.jpg",
  "Barbell Upright Row": "barbell-upright-row.jpg",

  // SHOULDER
  "Seated Dumbbell Press": "dumbbell-overhead-press-seated.jpg",
  "Lateral Raise (Dumbbell)": "lateral-raise-dumbbell.jpg",
  "Machine Shoulder Press": "machine-shoulder-press.jpg",

  // BICEP
  "Barbell Curl": "barbell-bicep-curl.jpg",
  "Dumbbell Curl": "dumbbell-bicep-curls.jpg",
  "Hammer Curl": "hammer-curl.jpg",
  "Hammer Curl (Dumbbell)": "hammer-curl.jpg",
  "Dumbbell Hammer Curl": "hammer-curl.jpg",
  "Neutral Grip Curl": "hammer-curl.jpg",
  "Concentration Curl": "concentration-curls.jpg",

  // TRICEP
  "Tricep Pushdown (Cable)": "tricep-rope-extension.jpg",
  "Skull Crushers": "skull-crushers.jpg",

  // QUAD
  "Box Squat": "box-squat.jpg",
  "Bulgarian Split Squat": "bulgarian-split-squat.jpg",
  "Dumbbell Lunge": "dumbbell-lunge.jpg",

  // HAMSTRING
  "Romanian Deadlift (Dumbbell)": "romanian-deadlift-dumbbell.jpg",
  "Romanian Deadlift": "romanian-deadlift-dumbbell.jpg",
  "Barbell Glute Bridge": "barbell-glute-bridge.jpg",

  // CALF
  "Standing Calf Raise": "standing-calf-raises.jpg",
  "Seated Calf Raise": "seated-calf-raise.jpg",

  // CORE
  "Forearm Plank": "plank-hold.jpg",
  "Dead Bug": "dead-bug.jpg",
  "Side Plank": "side-plank.jpg",
  "Side Plank (Knee Version)": "side-plank.jpg",
  "Side Plank Hold": "side-plank.jpg",
  "Lateral Plank": "side-plank.jpg",

  // LEGS - MACHINE
  "Leg Press Machine": "leg-press-machine.jpg",
  "Leg Press": "leg-press-machine.jpg",
  "Machine Leg Press": "leg-press-machine.jpg",
  "Leg Press (Machine)": "leg-press-machine.jpg",

  // BODYWEIGHT
  "Push Up": "push-up.jpg",
  "Push-Up": "push-up.jpg",
  "Pushup": "push-up.jpg",
  "Standard Push Up": "push-up.jpg",
  "Floor Push Up": "push-up.jpg",
  "Incline Push Up": "incline-push-ups.jpg",
  "Inverted Row": "inverted-row-table.jpg",
  "Bird Dog": "bird-dog.jpg",
  "Superman Hold": "prone-back-extension.jpg",
  "Hollow Body Hold": "hollow-body-hold-beginner.jpg",
  "Reverse Lunge": "reverse-lunge.jpg",
  "Wall Sit": "wall-sit.jpg",
  "Glute Bridge": "glute-bridges.jpg",
  "Single Leg Glute Bridge": "glute-bridges.jpg",
  "Bicycle Crunch": "banded-bicycle-crunch.jpg",
  "Bench Dip": "seated-tricep-dips-kursi.jpg",
  "Close Grip Push Up": "push-up.jpg",
};

// Normalize a name to lower-case alphanumeric+space form for tolerant matching.
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s()]/g, "").replace(/\s+/g, " ");
}

// Strip parenthetical qualifiers, e.g. "Romanian Deadlift (Dumbbell)" -> "Romanian Deadlift"
function stripParens(s: string): string {
  return s.replace(/\s*\([^)]*\)/g, "").trim();
}

// Normalize for ExerciseDB API: lowercase, no parens, spaces instead of hyphens
function normalizeForApi(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Pre-build a normalized lookup so client-supplied names with minor
// case/punctuation variation still hit the curated map. This stays
// strictly within the curated set — nothing outside it ever resolves.
const NORMALIZED_MAP: Record<string, string> = {};
for (const [key, file] of Object.entries(STATIC_GIF_MAP)) {
  NORMALIZED_MAP[norm(key)] = BASE + file;
  // Also index the parenthesis-stripped form so "Romanian Deadlift (Dumbbell)"
  // resolves when the client only sends "Romanian Deadlift".
  const stripped = norm(stripParens(key));
  if (stripped && !NORMALIZED_MAP[stripped]) {
    NORMALIZED_MAP[stripped] = BASE + file;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { exerciseName } = await req.json();
    if (!exerciseName || typeof exerciseName !== "string") {
      return new Response(JSON.stringify({ gifUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[exercise-gif-lookup] received: "${exerciseName}"`);

    // 1. Exact (case-sensitive) match against curated map
    const exact = STATIC_GIF_MAP[exerciseName];
    if (exact) {
      console.log(`[exercise-gif-lookup] step 1 hit (exact static): ${exact}`);
      return new Response(
        JSON.stringify({ gifUrl: BASE + exact, source: "static" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Normalized fallback (case/punctuation-insensitive) — still curated only
    const normalized = norm(exerciseName);
    const normHit = NORMALIZED_MAP[normalized];
    if (normHit) {
      console.log(`[exercise-gif-lookup] step 2a hit (normalized static): ${normHit}`);
      return new Response(
        JSON.stringify({ gifUrl: normHit, source: "static_normalized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Strip parenthetical qualifiers and retry (e.g. "Foo (Cable)" -> "Foo")
    const stripped = norm(stripParens(exerciseName));
    if (stripped && stripped !== normalized) {
      const strippedHit = NORMALIZED_MAP[stripped];
      if (strippedHit) {
        console.log(`[exercise-gif-lookup] step 2b hit (stripped static): ${strippedHit}`);
        return new Response(
          JSON.stringify({ gifUrl: strippedHit, source: "static_stripped" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 4. Check exercise_gif_cache in DB
    const apiName = normalizeForApi(exerciseName);
    console.log(`[exercise-gif-lookup] step 3: checking cache for "${apiName}"`);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    try {
      const { data: cached } = await supabase
        .from("exercise_gif_cache")
        .select("gif_url")
        .eq("exercise_name_normalized", apiName)
        .maybeSingle();
      if (cached?.gif_url) {
        console.log(`[exercise-gif-lookup] step 3 hit (cache): ${cached.gif_url}`);
        return new Response(
          JSON.stringify({ gifUrl: cached.gif_url, source: "cache" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (e) {
      console.log(`[exercise-gif-lookup] cache lookup error: ${e}`);
    }

    // 5. ExerciseDB API via RapidAPI
    const apiKey = Deno.env.get("RAPIDAPI_KEY");
    if (apiKey) {
      console.log(`[exercise-gif-lookup] step 4: calling ExerciseDB for "${apiName}"`);
      try {
        const endpoint = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(apiName)}?limit=5&offset=0`;
        const resp = await fetch(endpoint, {
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
          },
        });
        console.log(`[exercise-gif-lookup] ExerciseDB status: ${resp.status}`);
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list) && list.length > 0) {
            const match = list.find((e: any) =>
              norm(e.name).includes(apiName) || apiName.includes(norm(e.name))
            ) || list[0];
            if (match?.gifUrl) {
              console.log(`[exercise-gif-lookup] step 4 hit (ExerciseDB): ${match.name} -> ${match.gifUrl}`);
              // Best-effort cache write
              supabase.from("exercise_gif_cache").upsert(
                {
                  exercise_name_normalized: apiName,
                  exercise_name_display: match.name,
                  gif_url: match.gifUrl,
                  target_muscle: match.target,
                  equipment: match.equipment,
                  source: "exercisedb",
                },
                { onConflict: "exercise_name_normalized" },
              ).then(() => {}, () => {});
              return new Response(
                JSON.stringify({ gifUrl: match.gifUrl, source: "exercisedb" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          } else {
            console.log(`[exercise-gif-lookup] ExerciseDB returned no results`);
          }
        }
      } catch (e) {
        console.log(`[exercise-gif-lookup] ExerciseDB error: ${e}`);
      }
    } else {
      console.log(`[exercise-gif-lookup] RAPIDAPI_KEY missing — skipping API`);
    }

    // 6. Nothing found — placeholder shown by the client
    console.log(`[exercise-gif-lookup] no result for "${exerciseName}"`);
    return new Response(JSON.stringify({ gifUrl: null, source: "none" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", gifUrl: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
