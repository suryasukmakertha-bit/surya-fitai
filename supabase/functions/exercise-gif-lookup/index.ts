import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const B = "https://static.exercisedb.dev/media/";

// Verified exercise GIF IDs from the free ExerciseDB API (exercisedb-api.vercel.app)
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
  "bodyweight squat": `${B}yn8yg1r.gif`,
  "body weight squat": `${B}yn8yg1r.gif`,
  "air squat": `${B}yn8yg1r.gif`,
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
  "reverse lunge": `${B}W31mMjd.gif`,
  "bodyweight reverse lunge": `${B}W31mMjd.gif`,
  "step back lunge": `${B}W31mMjd.gif`,
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

  // Core
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
  "cat cow": `${B}CosupLu.gif`,
  "cat cow stretch": `${B}CosupLu.gif`,
  "superman": `${B}ANbbry2.gif`,

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

  // Additional bodyweight / beginner
  "box squat": `${B}yn8yg1r.gif`,
  "box squats": `${B}yn8yg1r.gif`,
  "box squats to a chair": `${B}yn8yg1r.gif`,
  "glute bridge": `${B}Pjbc0Kt.gif`,
  "glute bridges": `${B}Pjbc0Kt.gif`,
  // wall sit - no valid GIF in ExerciseDB, will fall through to Wger/muscles.wiki
  "incline push up hands on table counter": `${B}GdMa1ET.gif`,
  "incline push ups hands on table counter": `${B}GdMa1ET.gif`,
  "incline push-up hands on table/counter": `${B}GdMa1ET.gif`,
  "incline push-ups hands on table/counter": `${B}GdMa1ET.gif`,
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
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

// Dynamic fallback: search the free ExerciseDB API with smart equipment filtering
async function searchExerciseDbApi(exerciseName: string): Promise<string | null> {
  try {
    const n = normalize(exerciseName);
    const searchTerm = encodeURIComponent(n);
    const url = `https://exercisedb-api.vercel.app/api/v1/exercises?search=${searchTerm}&limit=10`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success || !json?.data?.length) return null;

    const exercises = json.data;
    const isBodyweight = /bodyweight|body weight/.test(n);
    const mentionsEquipment = /barbell|dumbbell|cable|machine|kettlebell|band|resistance/.test(n);

    let bestMatch = null;

    if (isBodyweight) {
      bestMatch = exercises.find((e: any) =>
        e.equipment === 'body weight' || e.equipment === 'bodyweight'
      );
    } else if (!mentionsEquipment) {
      // Prefer exact name match first
      bestMatch = exercises.find((e: any) => normalize(e.name || "") === n);
      // Then prefer bodyweight variant
      if (!bestMatch) {
        bestMatch = exercises.find((e: any) =>
          e.equipment === 'body weight' || e.equipment === 'bodyweight'
        );
      }
    }

    // Final fallback: partial name match, then first result
    if (!bestMatch) {
      bestMatch = exercises.find((e: any) => {
        const exName = normalize(e.name || "");
        return exName.includes(n) || n.includes(exName);
      }) || exercises[0];
    }

    return bestMatch?.gifUrl || null;
  } catch {
    return null;
  }
}

// Wger.de fallback (free, no API key)
async function fetchFromWger(exerciseName: string): Promise<string | null> {
  try {
    const searchName = encodeURIComponent(exerciseName);
    const res = await fetch(
      `https://wger.de/api/v2/exercise/search/?term=${searchName}&language=english&format=json`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const suggestions = data?.suggestions;
    if (!suggestions || suggestions.length === 0) return null;
    const baseId = suggestions[0]?.data?.base_id;
    if (!baseId) return null;
    const imgRes = await fetch(
      `https://wger.de/api/v2/exerciseimage/?exercise_base=${baseId}&format=json`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4000) }
    );
    if (!imgRes.ok) return null;
    const imgData = await imgRes.json();
    const images = imgData?.results;
    if (!images || images.length === 0) return null;
    return images[0]?.image || null;
  } catch {
    return null;
  }
}

// Static images for exercises not available in any external DB
const STATIC_IMAGE_MAP: Record<string, string> = {
  'wall sit': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/wall-sit.jpg',
  'reverse lunge': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/reverse-lunge.jpg',
  'face pull': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/face-pull.jpg',
  'face pulls': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/face-pull.jpg',
  'hollow hold': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Hollow_hold.jpg/440px-Hollow_hold.jpg',
  'dead bug': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/dead-bug.jpg',
  'bulgarian split squat': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bulgarian-split-squat.jpg',
  'seated calf raise': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-calf-raise.jpg',
  'bird dog': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bird-dog.jpg',
  'box squat': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/box-squat.jpg',
  'incline push up': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/incline-push-ups.jpg',
  'incline push-up': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/incline-push-ups.jpg',
  'incline push ups': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/incline-push-ups.jpg',
  'glute bridge': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/glute-bridges.jpg',
  'glute bridges': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/glute-bridges.jpg',
  'doorway chest stretch': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/doorway-chest-stretch-scapular-squeeze.jpg',
  'scapular squeeze': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/doorway-chest-stretch-scapular-squeeze.jpg',
  'doorway chest stretch scapular squeeze': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/doorway-chest-stretch-scapular-squeeze.jpg',
  'chair squat': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/chair-squats.jpg',
  'chair squats': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/chair-squats.jpg',
  'wall push up': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/wall-push-ups.jpg',
  'wall push-up': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/wall-push-ups.jpg',
  'wall push ups': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/wall-push-ups.jpg',
  'standing side leg raise': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-side-leg-raises.jpg',
  'standing side leg raises': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-side-leg-raises.jpg',
  't spine rotation': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/t-spine-rotation.jpg',
  't-spine rotation': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/t-spine-rotation.jpg',
  'thoracic spine rotation': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/t-spine-rotation.jpg',
  'farmer march': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/farmer-March.jpg',
  'farmers march': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/farmer-March.jpg',
  'dumbbell bicep curl': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/dumbbell-bicep-curls.jpg',
  'dumbbell bicep curls': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/dumbbell-bicep-curls.jpg',
  'lat pulldown': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-wide-grip.jpg',
  'lat pulldown wide grip': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-wide-grip.jpg',
  'wide grip lat pulldown': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-wide-grip.jpg',
  'lat pull down': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-wide-grip.jpg',

  // ── PRONE BACK EXTENSION ──
  'prone back extension': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/prone-back-extension.jpg',
  'ekstensi punggung tengkurap': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/prone-back-extension.jpg',
  'gerakan punggung tengkurap': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/prone-back-extension.jpg',
  '俯卧背部伸展': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/prone-back-extension.jpg',
  '俯卧挺身': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/prone-back-extension.jpg',

  // ── SEATED TRICEP DIPS ──
  'seated tricep dips': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',
  'seated tricep dips (kursi)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',
  'chair dips': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',
  'tricep dips kursi': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',
  'dips trisep kursi': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',
  '坐姿三头肌撑体': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',
  '椅子撑体': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',
  '椅子臂屈伸': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/seated-tricep-dips-kursi.jpg',

  // ── INVERTED ROW / NEGATIVE PULL-UP ──
  'negative pull-up / inverted row (gunakan meja)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  'inverted row': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  'inverted row (gunakan meja)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  'negative pull-up': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  'inverted row (use table)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  'body row': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  'tarik badan di bawah meja': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  'rowing terbalik': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  '反向划船': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  '反向划船（使用桌子）': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',
  '负引体向上': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/inverted-row-table.jpg',

  // ── STANDING CALF RAISES ──
  'standing calf raises': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-calf-raises.jpg',
  'jinjit berdiri': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-calf-raises.jpg',
  'angkat tumit berdiri': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-calf-raises.jpg',
  '站姿提踵': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-calf-raises.jpg',
  '站立提踵': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-calf-raises.jpg',

  // ── SIDE PLANK KNEE VERSION ──
  'side plank (knee version)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',
  'side plank knee version': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',
  'side plank (versi lutut)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',
  'side plank versi lutut': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',
  'plank samping (lutut)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',
  '侧平板支撑（膝盖版）': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',
  '侧平板支撑膝盖版': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',
  '跪姿侧平板': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/side-plank-knee-version.jpg',

  // ── HOLLOW BODY HOLD BEGINNER ──
  'hollow body hold (beginner)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',
  'hollow body hold': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',
  'hollow body hold (pemula)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',
  'hollow body hold pemula': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',
  'tahan posisi hollow body': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',
  '空心体支撑（初学者）': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',
  '空心体支撑初学者': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',
  '空心撑': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hollow-body-hold-beginner.jpg',

  // ── PLANK / PLANK (HOLD) ──
  'plank (hold)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  'plank hold': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  'plank': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  'plank (tahan)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  'tahan plank': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  'posisi plank': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  '平板支撑': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  '平板支撑（保持）': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',
  '保持平板支撑': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/plank-hold.jpg',

  // ── STANDING BAND ABDUCTION ──
  'standing band abduction': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-band-abduction.jpg',
  'abduksi band berdiri': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-band-abduction.jpg',
  '站姿弹力带外展': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-band-abduction.jpg',

  // ── BANDED SQUATS ──
  'banded squats': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-squats.jpg',
  'squat dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-squats.jpg',
  'banded squat': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-squats.jpg',
  '弹力带深蹲': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-squats.jpg',

  // ── BANDED ROMANIAN DEADLIFT ──
  'banded romanian deadlift': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-romanian-deadlift.jpg',
  'romanian deadlift dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-romanian-deadlift.jpg',
  'banded rdl': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-romanian-deadlift.jpg',
  '弹力带罗马尼亚硬拉': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-romanian-deadlift.jpg',

  // ── BICEP CURLS WITH BAND ──
  'bicep curls with band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bicep-curls-with-band.jpg',
  'resistance band bicep curl': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bicep-curls-with-band.jpg',
  'curl bisep dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bicep-curls-with-band.jpg',
  '弹力带弯举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bicep-curls-with-band.jpg',
  '弹力带二头肌弯举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bicep-curls-with-band.jpg',

  // ── TRICEP OVERHEAD EXTENSION WITH BAND ──
  'tricep overhead extension with band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-overhead-extension-band.jpg',
  'overhead tricep extension band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-overhead-extension-band.jpg',
  'ekstensi trisep overhead dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-overhead-extension-band.jpg',
  '弹力带头顶三头肌伸展': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-overhead-extension-band.jpg',

  // ── RESISTANCE BAND SEATED ROW ──
  'resistance band seated row': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-seated-row.jpg',
  'seated row dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-seated-row.jpg',
  'band seated row': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-seated-row.jpg',
  '弹力带坐姿划船': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-seated-row.jpg',

  // ── BANDED OVERHEAD PRESS ──
  'banded overhead press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-overhead-press.jpg',
  'overhead press dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-overhead-press.jpg',
  'resistance band overhead press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-overhead-press.jpg',
  '弹力带过头推举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-overhead-press.jpg',

  // ── RESISTANCE BAND CHEST PRESS ──
  'resistance band chest press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-chest-press.jpg',
  'chest press dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-chest-press.jpg',
  'banded chest press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-chest-press.jpg',
  '弹力带胸部推举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/resistance-band-chest-press.jpg',

  // ── BICEP CURL DENGAN BAND (ID variant) ──
  'bicep curl dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bicep-curls-with-band.jpg',
  'bicep curls dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/bicep-curls-with-band.jpg',

  // ── TRICEP OVERHEAD EXTENSION DENGAN BAND (ID variant) ──
  'tricep overhead extension dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-overhead-extension-band.jpg',

  // ── ASSISTED PULL-UP MACHINE ──
  'assisted pullup machine': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/assisted-pullup-machine.jpg',
  'mesin pullup assisted': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/assisted-pullup-machine.jpg',
  '辅助引体向上机': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/assisted-pullup-machine.jpg',

  // ── STANDING BAND CHEST FLY ──
  'standing band chest fly': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-band-chest-fly.jpg',
  'band chest fly': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-band-chest-fly.jpg',
  'chest fly dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-band-chest-fly.jpg',
  '弹力带站姿胸部飞鸟': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/standing-band-chest-fly.jpg',

  // ── BANDED GOOD MORNINGS ──
  'banded good mornings': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-good-mornings.jpg',
  'banded good morning': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-good-mornings.jpg',
  'good morning dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-good-mornings.jpg',
  '弹力带早安式': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-good-mornings.jpg',

  // ── DUMBBELL LUNGE ──
  'dumbbell lunge': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/dumbbell-lunge.jpg',
  'lunge dumbbell': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/dumbbell-lunge.jpg',
  '哑铃弓步': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/dumbbell-lunge.jpg',

  // ── MACHINE SHOULDER PRESS ──
  'machine shoulder press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/machine-shoulder-press.jpg',
  'shoulder press machine': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/machine-shoulder-press.jpg',
  'mesin shoulder press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/machine-shoulder-press.jpg',
  '器械肩部推举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/machine-shoulder-press.jpg',

  // ── BANDED SPLIT SQUAT ──
  'banded split squat': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-split-squat.jpg',
  'split squat dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-split-squat.jpg',
  '弹力带分腿蹲': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-split-squat.jpg',

  // ── BANDED LATERAL RAISE ──
  'banded lateral raise': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-raise.jpg',
  'lateral raise dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-raise.jpg',
  'angkat samping dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-raise.jpg',
  '弹力带侧平举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-raise.jpg',

  // ── BANDED BICYCLE CRUNCH ──
  'banded bicycle crunch': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-bicycle-crunch.jpg',
  'bicycle crunch dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-bicycle-crunch.jpg',
  '弹力带自行车卷腹': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-bicycle-crunch.jpg',

  // ── BARBELL UPRIGHT ROW ──
  'barbell upright row': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-upright-row.jpg',
  'upright row barbell': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-upright-row.jpg',
  'barbell upright rowing': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-upright-row.jpg',
  '杠铃直立划船': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-upright-row.jpg',

  // ── BANDED LATERAL WALK ──
  'banded lateral walk': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-walk.jpg',
  'lateral walk dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-walk.jpg',
  'jalan samping dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-walk.jpg',
  '弹力带侧走': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-lateral-walk.jpg',

  // ── T-BAR ROW ──
  't-bar row': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/t-bar-row.jpg',
  't bar row': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/t-bar-row.jpg',
  'rowing t-bar': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/t-bar-row.jpg',
  'T型杠铃划船': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/t-bar-row.jpg',

  // ── ASSISTED PULL-UP MACHINE ──
  'assisted pull-up machine': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/assisted-pullup-machine.jpg',
  'assisted pullup machine': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/assisted-pullup-machine.jpg',
  'mesin pull-up assisted': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/assisted-pullup-machine.jpg',
  '辅助引体向上机': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/assisted-pullup-machine.jpg',

  // ── CABLE CROSSOVER ──
  'cable crossover': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/cable-crossover.jpg',
  'kabel crossover': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/cable-crossover.jpg',
  '绳索交叉': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/cable-crossover.jpg',

  // ── WEIGHTED DIPS ──
  'weighted dips': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/weighted-dips.jpg',
  'dips dengan beban': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/weighted-dips.jpg',
  '负重双杠臂屈伸': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/weighted-dips.jpg',

  // ── BANDED FACE PULLS ──
  'banded face pulls': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-face-pulls.jpg',
  'banded face pull': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-face-pulls.jpg',
  'face pull dengan band': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-face-pulls.jpg',
  '弹力带面部拉伸': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/banded-face-pulls.jpg',

  // ── BARBELL LUNGE ──
  'barbell lunge': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-lunge.jpg',
  'barbell lunges': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-lunge.jpg',
  'lunge barbell': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-lunge.jpg',
  '杠铃弓步': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-lunge.jpg',

  // ── BARBELL GLUTE BRIDGE ──
  'barbell glute bridge': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-glute-bridge.jpg',
  'glute bridge barbell': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-glute-bridge.jpg',
  '杠铃臀桥': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-glute-bridge.jpg',

  // ── BARBELL OVERHEAD PRESS STANDING ──
  'barbell overhead press (standing)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-overhead-press-standing.jpg',
  'barbell overhead press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-overhead-press-standing.jpg',
  'standing barbell overhead press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-overhead-press-standing.jpg',
  'overhead press barbell berdiri': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-overhead-press-standing.jpg',
  '杠铃站姿推举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-overhead-press-standing.jpg',

  // ── BARBELL BICEP CURL ──
  'barbell bicep curl': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-bicep-curl.jpg',
  'barbell bicep curls': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-bicep-curl.jpg',
  'curl bisep barbell': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-bicep-curl.jpg',
  '杠铃弯举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-bicep-curl.jpg',

  // ── BARBELL FLOOR PRESS ──
  'barbell floor press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-floor-press.jpg',
  'floor press barbell': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-floor-press.jpg',
  '杠铃地板推举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/barbell-floor-press.jpg',

  // ── HAMMER CURLS ──
  'hammer curls': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hammer-curls.jpg',
  'hammer curl': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hammer-curls.jpg',
  '锤式弯举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/hammer-curls.jpg',

  // ── LAT PULLDOWN CLOSE GRIP ──
  'lat pulldown (close grip)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-close-grip.jpg',
  'lat pulldown close grip': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-close-grip.jpg',
  'lat pulldown (narrow grip)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-close-grip.jpg',
  '窄距下拉': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/lat-pulldown-close-grip.jpg',

  // ── CONCENTRATION CURLS ──
  'concentration curls': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/concentration-curls.jpg',
  'concentration curl': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/concentration-curls.jpg',
  'curl konsentrasi': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/concentration-curls.jpg',
  '集中弯举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/concentration-curls.jpg',

  // ── SKULL CRUSHERS ──
  'skull crushers': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/skull-crushers.jpg',
  'skull crusher': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/skull-crushers.jpg',
  'ez bar skull crushers': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/skull-crushers.jpg',
  '颅骨破碎者': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/skull-crushers.jpg',

  // ── INCLINE BARBELL PRESS ──
  'incline barbell press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/incline-barbell-press.jpg',
  'incline barbell bench press': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/incline-barbell-press.jpg',
  'press barbell incline': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/incline-barbell-press.jpg',
  '上斜杠铃推举': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/incline-barbell-press.jpg',

  // ── TRICEP ROPE EXTENSION ──
  'tricep rope extension': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-rope-extension.jpg',
  'triceps rope extension': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-rope-extension.jpg',
  'rope tricep pushdown': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-rope-extension.jpg',
  'tricep pushdown rope': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-rope-extension.jpg',
  '绳索三头肌下压': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/tricep-rope-extension.jpg',

  // ── ROMANIAN DEADLIFT DUMBBELL ──
  'romanian deadlift (dumbbell)': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/romanian-deadlift-dumbbell.jpg',
  'dumbbell romanian deadlift': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/romanian-deadlift-dumbbell.jpg',
  'rdl dumbbell': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/romanian-deadlift-dumbbell.jpg',
  '哑铃罗马尼亚硬拉': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/romanian-deadlift-dumbbell.jpg',
};

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

    console.log(`[exercise-gif-lookup] Searching: "${exerciseName}"`);

    // 0. Check static image map first — exact match, then partial match
    const normalizedForStatic = normalize(exerciseName);
    const staticUrl = STATIC_IMAGE_MAP[normalizedForStatic] ||
      Object.entries(STATIC_IMAGE_MAP).find(([key]) =>
        normalizedForStatic.includes(key) || key.includes(normalizedForStatic)
      )?.[1];
    if (staticUrl) {
      console.log(`[exercise-gif-lookup] Static image hit for "${exerciseName}"`);
      return new Response(JSON.stringify({ gifUrl: staticUrl, source: "static" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Try static map
    let gifUrl = findGifFromMap(exerciseName);
    let source = "static_map";

    // 2. Dynamic ExerciseDB API fallback
    if (!gifUrl) {
      gifUrl = await searchExerciseDbApi(exerciseName);
      source = "exercisedb_api";
    }

    // 3. Wger.de fallback
    if (!gifUrl) {
      gifUrl = await fetchFromWger(exerciseName);
      source = "wger";
    }

    console.log(`[exercise-gif-lookup] Result: ${gifUrl ? source : "none"} for "${exerciseName}"`);

    return new Response(JSON.stringify({ gifUrl, source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, gifUrl: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
