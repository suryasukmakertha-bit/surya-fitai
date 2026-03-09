import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static mapping of common exercises to free ExerciseDB GIF URLs
// ExerciseDB CDN hosts public exercise demonstration GIFs
const EXERCISE_DB_BASE = "https://v2.exercisedb.io/image";

// Fallback: curated mapping to freely available exercise GIF URLs
const EXERCISE_GIF_MAP: Record<string, string> = {
  // Chest
  "bench press": "https://v2.exercisedb.io/image/rLfEfJJoVDjQC2",
  "flat bench press": "https://v2.exercisedb.io/image/rLfEfJJoVDjQC2",
  "barbell bench press": "https://v2.exercisedb.io/image/rLfEfJJoVDjQC2",
  "incline bench press": "https://v2.exercisedb.io/image/xqRdOKR5XVCxm1",
  "incline dumbbell press": "https://v2.exercisedb.io/image/0cLFJJnwU-UdBb",
  "dumbbell bench press": "https://v2.exercisedb.io/image/L8fq0FP3s2D4w8",
  "dumbbell fly": "https://v2.exercisedb.io/image/AkJpjrSsD5oCWF",
  "dumbbell flyes": "https://v2.exercisedb.io/image/AkJpjrSsD5oCWF",
  "cable fly": "https://v2.exercisedb.io/image/LPxWBpTu3SU6p9",
  "push up": "https://v2.exercisedb.io/image/xTNHHnIN5xOgVW",
  "push-up": "https://v2.exercisedb.io/image/xTNHHnIN5xOgVW",
  "chest dip": "https://v2.exercisedb.io/image/jGxfmMvJqCM5F6",

  // Back
  "lat pulldown": "https://v2.exercisedb.io/image/1k7HIcATzVLnbJ",
  "pull up": "https://v2.exercisedb.io/image/CgjVK96RQXLMX3",
  "pull-up": "https://v2.exercisedb.io/image/CgjVK96RQXLMX3",
  "barbell row": "https://v2.exercisedb.io/image/ikLIjpTbNOrN-g",
  "bent over row": "https://v2.exercisedb.io/image/ikLIjpTbNOrN-g",
  "dumbbell row": "https://v2.exercisedb.io/image/lRKKbOhN9EaNdx",
  "seated cable row": "https://v2.exercisedb.io/image/bXB6Bnyx4elqNQ",
  "cable row": "https://v2.exercisedb.io/image/bXB6Bnyx4elqNQ",
  "deadlift": "https://v2.exercisedb.io/image/TfJn87sfOYHlzF",
  "t-bar row": "https://v2.exercisedb.io/image/xhNIfB6K-hMR7T",

  // Shoulders
  "overhead press": "https://v2.exercisedb.io/image/d-oBMPGxvz-rLj",
  "military press": "https://v2.exercisedb.io/image/d-oBMPGxvz-rLj",
  "shoulder press": "https://v2.exercisedb.io/image/d-oBMPGxvz-rLj",
  "dumbbell shoulder press": "https://v2.exercisedb.io/image/rKDvEMVePFnkz-",
  "lateral raise": "https://v2.exercisedb.io/image/L4pZdrFwrSaIJl",
  "side lateral raise": "https://v2.exercisedb.io/image/L4pZdrFwrSaIJl",
  "front raise": "https://v2.exercisedb.io/image/3Ldsl2Dxr2pIU6",
  "face pull": "https://v2.exercisedb.io/image/WO6hq9HXBVWAqZ",
  "rear delt fly": "https://v2.exercisedb.io/image/AWECqoR4xMPWHQ",
  "upright row": "https://v2.exercisedb.io/image/8xxOlYHDMJfWcv",
  "arnold press": "https://v2.exercisedb.io/image/9RY-K4t5-kq4Nh",

  // Legs
  "squat": "https://v2.exercisedb.io/image/u4sAuNhCLcjR6D",
  "barbell squat": "https://v2.exercisedb.io/image/u4sAuNhCLcjR6D",
  "back squat": "https://v2.exercisedb.io/image/u4sAuNhCLcjR6D",
  "front squat": "https://v2.exercisedb.io/image/Pu1e0vCDPo7pKW",
  "leg press": "https://v2.exercisedb.io/image/cV3kBjSGvltVjx",
  "leg extension": "https://v2.exercisedb.io/image/Z79jkVXqTXh5e5",
  "leg curl": "https://v2.exercisedb.io/image/Bp2IXXnltFq3yJ",
  "lying leg curl": "https://v2.exercisedb.io/image/Bp2IXXnltFq3yJ",
  "seated leg curl": "https://v2.exercisedb.io/image/ufRqjqXCx7OSXC",
  "romanian deadlift": "https://v2.exercisedb.io/image/LYNBGMPj0CQbvj",
  "rdl": "https://v2.exercisedb.io/image/LYNBGMPj0CQbvj",
  "dumbbell romanian deadlift": "https://v2.exercisedb.io/image/FcG0xDolR8FoYJ",
  "hack squat": "https://v2.exercisedb.io/image/uSCnHcCcqLlHh0",
  "goblet squat": "https://v2.exercisedb.io/image/8SBkHcHHmE8-2S",
  "bulgarian split squat": "https://v2.exercisedb.io/image/M5ZBx5uxLUaSTR",
  "lunge": "https://v2.exercisedb.io/image/2Yy9Y3ZvNMbpMg",
  "walking lunge": "https://v2.exercisedb.io/image/2Yy9Y3ZvNMbpMg",
  "hip thrust": "https://v2.exercisedb.io/image/qxe1fmjyqn4LQi",
  "barbell hip thrust": "https://v2.exercisedb.io/image/qxe1fmjyqn4LQi",
  "calf raise": "https://v2.exercisedb.io/image/1oFmZHW0Cv1a36",
  "standing calf raise": "https://v2.exercisedb.io/image/1oFmZHW0Cv1a36",
  "seated calf raise": "https://v2.exercisedb.io/image/2LGMn3v-4bGUEq",
  "sumo squat": "https://v2.exercisedb.io/image/8W7IttFCKSAcNz",

  // Arms
  "bicep curl": "https://v2.exercisedb.io/image/NpBMnCVN7WUb4G",
  "barbell curl": "https://v2.exercisedb.io/image/NpBMnCVN7WUb4G",
  "dumbbell curl": "https://v2.exercisedb.io/image/Nq3rDOuUfMSvWS",
  "hammer curl": "https://v2.exercisedb.io/image/GG3LJp2GFPO3fq",
  "preacher curl": "https://v2.exercisedb.io/image/Bz2hX6-h1zLuCE",
  "concentration curl": "https://v2.exercisedb.io/image/aXMuDMfeN5Jxqp",
  "tricep pushdown": "https://v2.exercisedb.io/image/lCVvbvH-kWP3eo",
  "tricep extension": "https://v2.exercisedb.io/image/lCVvbvH-kWP3eo",
  "skull crusher": "https://v2.exercisedb.io/image/rR-v8TiV93y2vP",
  "overhead tricep extension": "https://v2.exercisedb.io/image/rR-v8TiV93y2vP",
  "tricep dip": "https://v2.exercisedb.io/image/jGxfmMvJqCM5F6",
  "close grip bench press": "https://v2.exercisedb.io/image/N4fG2qrD0-bA15",
  "cable curl": "https://v2.exercisedb.io/image/6Zy6s2VgwELixe",

  // Core
  "plank": "https://v2.exercisedb.io/image/H-mhQCKrXXCZPy",
  "crunch": "https://v2.exercisedb.io/image/4D0Ykb3wZSsqFV",
  "sit up": "https://v2.exercisedb.io/image/4D0Ykb3wZSsqFV",
  "russian twist": "https://v2.exercisedb.io/image/fL4qzgZYGbdlxF",
  "leg raise": "https://v2.exercisedb.io/image/O9rRXgcKcJ5jor",
  "hanging leg raise": "https://v2.exercisedb.io/image/O9rRXgcKcJ5jor",
  "cable crunch": "https://v2.exercisedb.io/image/i4Tl0FPJmBqbMa",
  "mountain climber": "https://v2.exercisedb.io/image/7KpVMSXJPHfG3n",
  "ab wheel rollout": "https://v2.exercisedb.io/image/F1lxYozdHpJT9k",

  // Machines
  "chest press machine": "https://v2.exercisedb.io/image/5K6xdNnYwvUFnV",
  "pec deck": "https://v2.exercisedb.io/image/mU6-Rlu-KxVXf6",
  "smith machine squat": "https://v2.exercisedb.io/image/tZBfg7eFJJDpRe",
  "machine shoulder press": "https://v2.exercisedb.io/image/OMbsqx-2etrLyg",
};

// Fuzzy match: try exact, then partial matches
function findGifUrl(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  
  // Exact match
  if (EXERCISE_GIF_MAP[normalized]) return EXERCISE_GIF_MAP[normalized];

  // Try removing "dumbbell", "barbell", "machine", "cable" prefix and check
  for (const prefix of ["dumbbell ", "barbell ", "machine ", "cable ", "seated ", "standing ", "incline ", "decline "]) {
    const stripped = normalized.replace(prefix, "").trim();
    if (EXERCISE_GIF_MAP[stripped]) return EXERCISE_GIF_MAP[stripped];
  }

  // Partial match - find first key that includes search or search includes key
  for (const [key, url] of Object.entries(EXERCISE_GIF_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return url;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exerciseName } = await req.json();
    
    if (!exerciseName) {
      return new Response(JSON.stringify({ gifUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gifUrl = findGifUrl(exerciseName);

    return new Response(JSON.stringify({ gifUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
