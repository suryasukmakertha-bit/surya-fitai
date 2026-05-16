import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}

function mapExerciseName(name: string): string[] {
  const normalized = normalizeExerciseName(name)
  const variants = [normalized]
  const mappings: Record<string, string[]> = {
    'lat pull down': ['lat pulldown', 'cable lat pulldown', 'pulldown'],
    'lat pulldown': ['lat pull down', 'cable lat pulldown'],
    'face pull': ['face pulls', 'cable face pull', 'rope face pull'],
    'face pulls': ['face pull', 'cable face pull'],
    'rdl': ['romanian deadlift'],
    'romanian deadlift': ['rdl', 'stiff leg deadlift'],
    'goblet squat': ['dumbbell goblet squat', 'kettlebell goblet squat'],
    'dead bug': ['dead bug exercise', 'dead bug core'],
    'hip thrust': ['barbell hip thrust', 'dumbbell hip thrust', 'glute bridge'],
    'bent over row': ['barbell bent over row', 'dumbbell bent over row'],
    'chest supported row': ['chest supported dumbbell row', 'incline dumbbell row'],
    'incline dumbbell press': ['incline db press', 'incline press'],
    'lateral raise': ['dumbbell lateral raise', 'cable lateral raise'],
    'bicep curl': ['dumbbell bicep curl', 'barbell curl', 'hammer curl'],
    'tricep pushdown': ['cable tricep pushdown', 'triceps pushdown'],
    'plank': ['forearm plank', 'plank hold'],
    'leg press': ['seated leg press', '45 degree leg press'],
    'calf raise': ['standing calf raise', 'seated calf raise'],
    'pull up': ['pullup', 'chin up', 'assisted pull up'],
    'push up': ['pushup', 'standard push up'],
    'box squat': ['squat', 'barbell squat'],
    'cat cow': ['cat cow stretch', 'cat camel'],
    'bird dog': ['bird dog exercise', 'quadruped bird dog'],
  }
  for (const [key, values] of Object.entries(mappings)) {
    if (normalized.includes(key)) variants.push(...values)
  }
  return [...new Set(variants)]
}

const STATIC_GIF_MAP: Record<string, string> = {
  'wall sit': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/wall-sit.jpg',
  'reverse lunge': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/reverse-lunge.jpg',
  'face pull': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/face-pull.jpg',
  'face pulls': 'https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/face-pull.jpg',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { exercise_name } = await req.json()
    if (!exercise_name) {
      return new Response(JSON.stringify({ error: 'exercise_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedName = normalizeExerciseName(exercise_name)
    console.log(`[get-exercise-gif] Searching: "${exercise_name}", normalized: "${normalizedName}"`)

    // 1. Check STATIC_GIF_MAP first
    const staticUrl = STATIC_GIF_MAP[normalizedName]
    if (staticUrl) {
      console.log(`[get-exercise-gif] Static map hit for "${normalizedName}"`)
      return new Response(
        JSON.stringify({ gif_url: staticUrl, source: 'static' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 2. Check cache
    const { data: cached } = await supabase
      .from('exercise_gif_cache')
      .select('*')
      .eq('exercise_name_normalized', normalizedName)
      .maybeSingle()

    if (cached?.gif_url) {
      console.log(`[get-exercise-gif] Cache hit for "${normalizedName}"`)
      return new Response(
        JSON.stringify({ gif_url: cached.gif_url, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Search ExerciseDB via RapidAPI
    const apiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!apiKey) {
      console.log(`[get-exercise-gif] RAPIDAPI_KEY not configured, using fallback`)
      const fallbackUrl = `https://muscles.wiki/exercises/${normalizedName.replace(/\s+/g, '-')}.gif`
      return new Response(
        JSON.stringify({ gif_url: fallbackUrl, source: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const searchVariants = mapExerciseName(exercise_name)
    let exerciseData = null

    for (const variant of searchVariants) {
      if (exerciseData) break

      const endpoints = [
        `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(variant)}?limit=5&offset=0`,
        `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(variant)}`,
        `https://exercisedb.p.rapidapi.com/exercises?name=${encodeURIComponent(variant)}&limit=5`,
      ]

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
            },
          })
          console.log(`[get-exercise-gif] Trying: "${variant}", endpoint: ${endpoint}, status: ${response.status}`)
          if (!response.ok) continue
          const exercises = await response.json()
          if (exercises?.length > 0) {
            exerciseData =
              exercises.find(
                (e: any) =>
                  normalizeExerciseName(e.name).includes(normalizedName) ||
                  normalizedName.includes(normalizeExerciseName(e.name))
              ) || exercises[0]
            if (exerciseData) break
          }
        } catch (err) {
          console.log(`[get-exercise-gif] Error fetching "${variant}": ${err}`)
          continue
        }
      }
    }

    if (!exerciseData) {
      console.log(`[get-exercise-gif] No ExerciseDB result, using fallback`)
      const fallbackUrl = `https://muscles.wiki/exercises/${normalizedName.replace(/\s+/g, '-')}.gif`
      return new Response(
        JSON.stringify({ gif_url: fallbackUrl, source: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cache the result
    await supabase.from('exercise_gif_cache').upsert(
      {
        exercise_name_normalized: normalizedName,
        exercise_name_display: exerciseData.name,
        gif_url: exerciseData.gifUrl,
        target_muscle: exerciseData.target,
        equipment: exerciseData.equipment,
        source: 'exercisedb',
      },
      { onConflict: 'exercise_name_normalized' }
    )

    console.log(`[get-exercise-gif] Found: "${exerciseData.name}", gif: ${exerciseData.gifUrl}`)
    return new Response(
      JSON.stringify({ gif_url: exerciseData.gifUrl, source: 'exercisedb' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(`[get-exercise-gif] Fatal error:`, err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.', gif_url: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
