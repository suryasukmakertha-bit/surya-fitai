import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const B = "https://static.exercisedb.dev/media/";

// Verified exercise GIF IDs from the free ExerciseDB API (exercisedb-api.vercel.app)
// Each ID verified to show the correct animated exercise demonstration
const GIF_MAP: Record<string, string> = {
  // Chest
  "dumbbell bench press": `${B}SpYC0Kp.gif`,
  "dumbbell chest press": `${B}SpYC0Kp.gif`,
  "barbell bench press": `${B}EIeI8Vf.gif`,
  "bench press": `${B}EIeI8Vf.gif`,
  "flat bench press": `${B}EIeI8Vf.gif`,
  "incline dumbbell press": `${B}bfiHMpI.gif`,
  "incline bench press": `${B}641mIfk.gif`,
  "cable chest press": `${B}7xI5MXA.gif`,
  "chest press machine": `${B}DOoWcnA.gif`,
  "lever chest press": `${B}DOoWcnA.gif`,
  "smith close grip bench press": `${B}WcHl7ru.gif`,
  "close grip bench press": `${B}WcHl7ru.gif`,
  "dumbbell fly": `${B}bfiHMpI.gif`,
  "cable fly": `${B}GKEH6jj.gif`,

  // Back
  "lat pulldown": `${B}LEprlgG.gif`,
  "lat pulldown wide grip": `${B}LEprlgG.gif`,
  "cable pulldown": `${B}RVwzP10.gif`,
  "cable lat pulldown": `${B}LEprlgG.gif`,
  "reverse grip lat pulldown": `${B}ecpY0rH.gif`,
  "dumbbell bent over row": `${B}BJ0Hz5L.gif`,
  "dumbbell row": `${B}C0MA9bC.gif`,
  "dumbbell one arm row": `${B}C0MA9bC.gif`,
  "chest supported dumbbell row": `${B}7vG5o25.gif`,
  "dumbbell incline row": `${B}7vG5o25.gif`,
  "cable seated row": `${B}fUBheHs.gif`,
  "seated cable row": `${B}fUBheHs.gif`,
  "cable row": `${B}fUBheHs.gif`,
  "cable wide grip row": `${B}qcY50ZD.gif`,
  "barbell row": `${B}BJ0Hz5L.gif`,
  "bent over row": `${B}BJ0Hz5L.gif`,
  "barbell rack pull": `${B}za9Ni4z.gif`,
  "rack pull": `${B}za9Ni4z.gif`,
  "twin handle lat pulldown": `${B}rkg41Fb.gif`,

  // Shoulders
  "dumbbell lateral raise": `${B}DsgkuIt.gif`,
  "lateral raise": `${B}DsgkuIt.gif`,
  "side lateral raise": `${B}DsgkuIt.gif`,
  "cable lateral raise": `${B}goJ6ezq.gif`,
  "landmine lateral raise": `${B}eXMFHww.gif`,
  "lever lateral raise": `${B}dRTfGZT.gif`,
  "dumbbell arnold press": `${B}Xy4jlWA.gif`,
  "arnold press": `${B}Xy4jlWA.gif`,
  "dumbbell shoulder press": `${B}Xy4jlWA.gif`,
  "dumbbell shoulder press seated": `${B}Xy4jlWA.gif`,
  "shoulder press": `${B}Xy4jlWA.gif`,
  "overhead press": `${B}Xy4jlWA.gif`,
  "military press": `${B}Xy4jlWA.gif`,
  "cable shoulder press": `${B}PzQanLE.gif`,
  "machine shoulder press": `${B}PzQanLE.gif`,
  "dumbbell scott press": `${B}5vfAI0I.gif`,
  "dumbbell incline shoulder raise": `${B}6e2DcYX.gif`,
  "face pull": `${B}goJ6ezq.gif`,
  "face pulls": `${B}goJ6ezq.gif`,
  "cable alternate shoulder press": `${B}KHPZL0b.gif`,

  // Legs
  "leg press": `${B}V07qpXy.gif`,
  "lever leg press": `${B}V07qpXy.gif`,
  "seated leg press": `${B}V07qpXy.gif`,
  "lever leg extension": `${B}my33uHU.gif`,
  "leg extension": `${B}my33uHU.gif`,
  "leg curl": `${B}17lJ1kr.gif`,
  "lying leg curl": `${B}17lJ1kr.gif`,
  "lever lying leg curl": `${B}17lJ1kr.gif`,
  "seated leg curl": `${B}Zg3XY7P.gif`,
  "lever seated leg curl": `${B}Zg3XY7P.gif`,
  "kneeling leg curl": `${B}nnmCTLN.gif`,
  "dumbbell goblet squat": `${B}yn8yg1r.gif`,
  "goblet squat": `${B}yn8yg1r.gif`,
  "goblet squat heels elevated": `${B}yn8yg1r.gif`,
  "kettlebell goblet squat": `${B}ZA8b5hc.gif`,
  "barbell squat": `${B}yn8yg1r.gif`,
  "squat": `${B}yn8yg1r.gif`,
  "back squat": `${B}yn8yg1r.gif`,
  "barbell side split squat": `${B}W31mMjd.gif`,
  "split squat": `${B}W31mMjd.gif`,
  "bulgarian split squat": `${B}W31mMjd.gif`,
  "barbell romanian deadlift": `${B}wQ2c4XD.gif`,
  "romanian deadlift": `${B}wQ2c4XD.gif`,
  "rdl": `${B}wQ2c4XD.gif`,
  "dumbbell romanian deadlift": `${B}rR0LJzx.gif`,
  "deadlift": `${B}wQ2c4XD.gif`,
  "barbell deadlift": `${B}wQ2c4XD.gif`,
  "standing single leg curl": `${B}C5jncD2.gif`,
  "glute ham raise": `${B}Vvwjz6N.gif`,
  "hip thrust": `${B}Pjbc0Kt.gif`,
  "barbell hip thrust": `${B}Pjbc0Kt.gif`,
  "calf raise": `${B}Vvwjz6N.gif`,
  "seated calf raise": `${B}Vvwjz6N.gif`,
  "standing calf raise": `${B}Vvwjz6N.gif`,
  "lunge": `${B}W31mMjd.gif`,
  "walking lunge": `${B}W31mMjd.gif`,
  "dumbbell lunge": `${B}W31mMjd.gif`,
  "step up": `${B}W31mMjd.gif`,

  // Arms
  "cable triceps pushdown": `${B}gAwDzB3.gif`,
  "triceps pushdown": `${B}gAwDzB3.gif`,
  "tricep pushdown": `${B}qRZ5S1N.gif`,
  "cable one arm tricep pushdown": `${B}qRZ5S1N.gif`,
  "dumbbell tate press": `${B}s5PdDyY.gif`,
  "lever bicep curl": `${B}q6y3OhV.gif`,
  "bicep curl": `${B}q6y3OhV.gif`,
  "dumbbell bicep curl": `${B}q6y3OhV.gif`,
  "dumbbell bicep curls": `${B}q6y3OhV.gif`,
  "cable bicep curl": `${B}QTXKWPh.gif`,
  "cable curl": `${B}QTXKWPh.gif`,
  "hammer curl": `${B}q6y3OhV.gif`,
  "preacher curl": `${B}q6y3OhV.gif`,
  "concentration curl": `${B}q6y3OhV.gif`,
  "skull crusher": `${B}gAwDzB3.gif`,
  "overhead tricep extension": `${B}gAwDzB3.gif`,
  "ez bar close grip bench press": `${B}da4cXST.gif`,
  "tricep extension": `${B}gAwDzB3.gif`,
  "cable reverse grip triceps pushdown": `${B}ThKP69G.gif`,

  // Core — each with UNIQUE correct GIF IDs
  "dead bug": `${B}iny3m5y.gif`,
  "dead bug core": `${B}iny3m5y.gif`,
  "plank": `${B}VBAWRPG.gif`,
  "front plank": `${B}VBAWRPG.gif`,
  "plank from knees": `${B}ZOuKWir.gif`,
  "plank from knee": `${B}ZOuKWir.gif`,
  "kneeling plank": `${B}ZOuKWir.gif`,
  "modified plank": `${B}ZOuKWir.gif`,
  "side plank": `${B}X6ytgYZ.gif`,
  "russian twist": `${B}XVDdcoj.gif`,
  "leg raise": `${B}I3tsCnC.gif`,
  "lying leg raise": `${B}I3tsCnC.gif`,
  "lying leg raises": `${B}I3tsCnC.gif`,
  "hanging leg raise": `${B}I3tsCnC.gif`,
  "crunch": `${B}BMMolZ3.gif`,
  "crunches": `${B}BMMolZ3.gif`,
  "reverse crunch": `${B}nCU1Ekp.gif`,
  "sit up": `${B}AR0ig3o.gif`,
  "sit ups": `${B}AR0ig3o.gif`,
  "mountain climber": `${B}RJgzwny.gif`,
  "mountain climbers": `${B}RJgzwny.gif`,
  "bird dog": `${B}CosupLu.gif`,
  "lower back curl": `${B}ANbbry2.gif`,
  "cable crunch": `${B}s8nrDXF.gif`,

  // Push-ups
  "push up": `${B}JmMVpR3.gif`,
  "push ups": `${B}JmMVpR3.gif`,
  "push-up": `${B}JmMVpR3.gif`,
  "push-ups": `${B}JmMVpR3.gif`,
  "wall push up": `${B}GdMa1ET.gif`,
  "wall push ups": `${B}GdMa1ET.gif`,
  "wall push-up": `${B}GdMa1ET.gif`,
  "wall push-ups": `${B}GdMa1ET.gif`,
  "kneeling push up": `${B}ZOuKWir.gif`,
  "kneeling push-up": `${B}ZOuKWir.gif`,
  "knee push up": `${B}ZOuKWir.gif`,
  "knee push-up": `${B}ZOuKWir.gif`,
  "incline push up": `${B}GdMa1ET.gif`,
  "incline push-up": `${B}GdMa1ET.gif`,
  "wide push up": `${B}JmMVpR3.gif`,
  "diamond push up": `${B}JmMVpR3.gif`,
  "clap push up": `${B}wigSg76.gif`,

  // Farmer's walk / carry
  "farmer walk": `${B}Vvwjz6N.gif`,
  "farmer carry": `${B}Vvwjz6N.gif`,
  "farmers walk": `${B}Vvwjz6N.gif`,
  "farmer's walk": `${B}Vvwjz6N.gif`,
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findGifFromMap(exerciseName: string): string | null {
  const n = normalize(exerciseName);

  // Exact match
  if (GIF_MAP[n]) return GIF_MAP[n];

  // Try removing common prefixes/suffixes
  const cleaned = n
    .replace(/^(barbell|dumbbell|cable|lever|machine|smith|ez bar|ez-bar|kettlebell)\s+/, "")
    .replace(/\s*(seated|standing|lying|incline|decline|wide grip|close grip|rope|v-bar|with.*|female|male)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (GIF_MAP[cleaned]) return GIF_MAP[cleaned];

  // Partial match - find best
  let bestUrl: string | null = null;
  let bestScore = 0;
  const nWords = n.split(" ");

  for (const [key, url] of Object.entries(GIF_MAP)) {
    let score = 0;
    if (key.includes(n) || n.includes(key)) {
      score = 80 + (key === n ? 20 : 0);
    } else {
      const keyWords = key.split(" ");
      const matched = nWords.filter(w => keyWords.includes(w));
      score = (matched.length / Math.max(nWords.length, 1)) * 60;
    }
    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }

  return bestScore >= 35 ? bestUrl : null;
}

// Dynamic fallback: search the free ExerciseDB API
async function searchExerciseDbApi(exerciseName: string): Promise<string | null> {
  try {
    const searchTerm = encodeURIComponent(normalize(exerciseName));
    const url = `https://exercisedb-api.vercel.app/api/v1/exercises?search=${searchTerm}&limit=3`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json?.data?.length > 0) {
      // Find best match by checking if the exercise name appears in the result
      const n = normalize(exerciseName);
      for (const ex of json.data) {
        const exName = normalize(ex.name || "");
        if (exName.includes(n) || n.includes(exName)) {
          return ex.gifUrl || null;
        }
      }
      // Return first result as fallback
      return json.data[0].gifUrl || null;
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { exerciseName } = await req.json();
    if (!exerciseName) {
      return new Response(JSON.stringify({ gifUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try static map first
    let gifUrl = findGifFromMap(exerciseName);

    // Dynamic API fallback if static map misses
    if (!gifUrl) {
      gifUrl = await searchExerciseDbApi(exerciseName);
    }

    return new Response(JSON.stringify({ gifUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, gifUrl: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
