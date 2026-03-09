import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_BASE = "https://exercisedb-api.vercel.app/api/v1/exercises";

// Simple cache to avoid repeated API calls for the same exercise
const gifCache = new Map<string, string | null>();

function normalizeForSearch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Score how well a result matches the search term
function matchScore(searchTerm: string, resultName: string): number {
  const s = searchTerm.toLowerCase();
  const r = resultName.toLowerCase();
  if (r === s) return 100;
  if (r.includes(s)) return 80;
  if (s.includes(r)) return 70;
  
  const searchWords = s.split(" ");
  const resultWords = r.split(" ");
  const matchedWords = searchWords.filter(w => resultWords.some(rw => rw.includes(w) || w.includes(rw)));
  return (matchedWords.length / searchWords.length) * 60;
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

    const normalized = normalizeForSearch(exerciseName);

    // Check cache
    if (gifCache.has(normalized)) {
      return new Response(JSON.stringify({ gifUrl: gifCache.get(normalized) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query the free ExerciseDB API
    const searchUrl = `${API_BASE}?search=${encodeURIComponent(normalized)}&limit=10`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      gifCache.set(normalized, null);
      return new Response(JSON.stringify({ gifUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const exercises = result?.data || [];

    if (exercises.length === 0) {
      // Try with fewer words (e.g., just "leg press" from "seated leg press")
      const words = normalized.split(" ");
      if (words.length > 2) {
        const shorterSearch = words.slice(-2).join(" ");
        const retryUrl = `${API_BASE}?search=${encodeURIComponent(shorterSearch)}&limit=10`;
        const retryResponse = await fetch(retryUrl);
        if (retryResponse.ok) {
          const retryResult = await retryResponse.json();
          const retryExercises = retryResult?.data || [];
          if (retryExercises.length > 0) {
            // Pick best match
            let best = retryExercises[0];
            let bestScore = matchScore(normalized, best.name);
            for (const ex of retryExercises) {
              const score = matchScore(normalized, ex.name);
              if (score > bestScore) {
                best = ex;
                bestScore = score;
              }
            }
            const gifUrl = best.gifUrl || null;
            gifCache.set(normalized, gifUrl);
            return new Response(JSON.stringify({ gifUrl }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
      
      gifCache.set(normalized, null);
      return new Response(JSON.stringify({ gifUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick the best matching exercise
    let best = exercises[0];
    let bestScore = matchScore(normalized, best.name);
    for (const ex of exercises) {
      const score = matchScore(normalized, ex.name);
      if (score > bestScore) {
        best = ex;
        bestScore = score;
      }
    }

    const gifUrl = best.gifUrl || null;
    gifCache.set(normalized, gifUrl);

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
