import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  "Hammer Curl": "hammer-curls.jpg",
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
  "Barbell Glute Bridge": "barbell-glute-bridge.jpg",

  // CALF
  "Standing Calf Raise": "standing-calf-raises.jpg",
  "Seated Calf Raise": "seated-calf-raise.jpg",

  // CORE
  "Forearm Plank": "plank-hold.jpg",
  "Dead Bug": "dead-bug.jpg",
  "Side Plank (Knee Version)": "side-plank-knee-version.jpg",

  // BODYWEIGHT
  "Push Up": "wall-push-ups.jpg",
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
  "Close Grip Push Up": "wall-push-ups.jpg",
};

// Normalize a name to lower-case alphanumeric+space form for tolerant matching.
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s()]/g, "").replace(/\s+/g, " ");
}

// Pre-build a normalized lookup so client-supplied names with minor
// case/punctuation variation still hit the curated map. This stays
// strictly within the curated set — nothing outside it ever resolves.
const NORMALIZED_MAP: Record<string, string> = {};
for (const [key, file] of Object.entries(STATIC_GIF_MAP)) {
  NORMALIZED_MAP[norm(key)] = BASE + file;
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

    // 1. Exact (case-sensitive) match against curated map
    const exact = STATIC_GIF_MAP[exerciseName];
    if (exact) {
      return new Response(
        JSON.stringify({ gifUrl: BASE + exact, source: "static" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Normalized fallback (case/punctuation-insensitive) — still curated only
    const normalized = norm(exerciseName);
    const normHit = NORMALIZED_MAP[normalized];
    if (normHit) {
      return new Response(
        JSON.stringify({ gifUrl: normHit, source: "static_normalized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. NO further fallback — placeholder shown by the client
    return new Response(JSON.stringify({ gifUrl: null, source: "none" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, gifUrl: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
