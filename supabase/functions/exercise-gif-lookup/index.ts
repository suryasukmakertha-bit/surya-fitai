import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_BASE = "https://exercisedb-api.vercel.app/api/v1/exercises";

// In-memory cache for the full exercise database (name -> gifUrl)
let exerciseDb: Map<string, string> | null = null;
let dbLoading: Promise<void> | null = null;

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function loadExerciseDb(): Promise<void> {
  if (exerciseDb) return;
  
  exerciseDb = new Map();
  let offset = 0;
  const limit = 200;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(`${API_BASE}?limit=${limit}&offset=${offset}`);
      if (!res.ok) break;
      const data = await res.json();
      const exercises = data?.data || [];
      
      for (const ex of exercises) {
        if (ex.name && ex.gifUrl) {
          exerciseDb.set(normalize(ex.name), ex.gifUrl);
        }
      }
      
      hasMore = exercises.length === limit;
      offset += limit;
    } catch {
      break;
    }
  }
  
  console.log(`Loaded ${exerciseDb.size} exercises into cache`);
}

function findBestMatch(searchName: string): string | null {
  if (!exerciseDb) return null;
  
  const search = normalize(searchName);
  
  // 1. Exact match
  if (exerciseDb.has(search)) return exerciseDb.get(search)!;
  
  // 2. Score-based matching
  let bestUrl: string | null = null;
  let bestScore = 0;
  
  const searchWords = search.split(" ");
  
  for (const [name, url] of exerciseDb.entries()) {
    let score = 0;
    
    // Exact containment
    if (name.includes(search)) score += 90;
    else if (search.includes(name)) score += 80;
    
    // Word overlap
    const nameWords = name.split(" ");
    const matchedWords = searchWords.filter(sw => nameWords.some(nw => nw === sw));
    const wordScore = (matchedWords.length / searchWords.length) * 60;
    score = Math.max(score, wordScore);
    
    // Bonus for same word count (more specific match)
    if (matchedWords.length === searchWords.length && nameWords.length <= searchWords.length + 2) {
      score += 15;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }
  
  // Only return if decent match (at least 50% words matched)
  return bestScore >= 40 ? bestUrl : null;
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

    // Load DB on first request (singleton)
    if (!exerciseDb && !dbLoading) {
      dbLoading = loadExerciseDb();
    }
    if (dbLoading) {
      await dbLoading;
      dbLoading = null;
    }

    const gifUrl = findBestMatch(exerciseName);

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
