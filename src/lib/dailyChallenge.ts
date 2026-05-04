import { supabase } from "@/integrations/supabase/client";

const POOL = [
  "Push-up",
  "Squat",
  "Plank",
  "Sit-up",
  "Burpee",
  "Jumping Jack",
  "Lunge",
  "Mountain Climber",
  "Jump Squat",
  "Diamond Push-up",
];

function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function pickInt(seed: string, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

export function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  exercise_name: string;
  target_reps: number;
  difficulty: "mudah" | "sedang" | "sulit";
  xp_reward: number;
}

export async function getOrCreateDailyChallenge(): Promise<DailyChallenge | null> {
  const date = todayDateStr();
  const sb = supabase as any;
  const { data: existing } = await sb
    .from("daily_challenges")
    .select("*")
    .eq("challenge_date", date)
    .maybeSingle();
  if (existing) return existing as DailyChallenge;

  // Generate deterministic from date seed
  const exIdx = Math.floor(seededRandom(date + ":ex") * POOL.length);
  const exercise = POOL[exIdx];
  const diffPick = seededRandom(date + ":diff");
  let difficulty: "mudah" | "sedang" | "sulit";
  let target_reps: number;
  let xp_reward: number;
  if (diffPick < 0.34) {
    difficulty = "mudah";
    target_reps = pickInt(date + ":r", 20, 40);
    xp_reward = 30;
  } else if (diffPick < 0.75) {
    difficulty = "sedang";
    target_reps = pickInt(date + ":r", 40, 60);
    xp_reward = 50;
  } else {
    difficulty = "sulit";
    target_reps = pickInt(date + ":r", 15, 25);
    xp_reward = 80;
  }

  const { data: inserted, error } = await sb
    .from("daily_challenges")
    .insert({ challenge_date: date, exercise_name: exercise, target_reps, difficulty, xp_reward })
    .select()
    .maybeSingle();
  if (error) {
    // Race: another insert won; refetch
    const { data: again } = await sb
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", date)
      .maybeSingle();
    return (again as DailyChallenge) || null;
  }
  return inserted as DailyChallenge;
}

export interface ChallengeProgress {
  accepted_at: string | null;
  completed_at: string | null;
  xp_earned: number;
}

export async function getUserChallengeProgress(
  userId: string,
  date: string
): Promise<ChallengeProgress | null> {
  const sb = supabase as any;
  const { data } = await sb
    .from("user_challenge_progress")
    .select("accepted_at, completed_at, xp_earned")
    .eq("user_id", userId)
    .eq("challenge_date", date)
    .maybeSingle();
  return (data as ChallengeProgress) || null;
}

export async function acceptChallenge(userId: string, date: string): Promise<void> {
  const sb = supabase as any;
  await sb
    .from("user_challenge_progress")
    .upsert(
      { user_id: userId, challenge_date: date, accepted_at: new Date().toISOString() },
      { onConflict: "user_id,challenge_date" }
    );
}

export async function completeChallenge(
  userId: string,
  date: string,
  xpReward: number
): Promise<void> {
  const sb = supabase as any;
  const now = new Date().toISOString();
  await sb
    .from("user_challenge_progress")
    .upsert(
      {
        user_id: userId,
        challenge_date: date,
        accepted_at: now,
        completed_at: now,
        xp_earned: xpReward,
      },
      { onConflict: "user_id,challenge_date" }
    );

  // Upsert XP
  const { data: xpRow } = await sb
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();
  const newTotal = (xpRow?.total_xp || 0) + xpReward;
  await sb
    .from("user_xp")
    .upsert(
      { user_id: userId, total_xp: newTotal, updated_at: now },
      { onConflict: "user_id" }
    );
}

export interface NewMedal {
  medal_id: string;
  medal_name: string;
  medal_tier: "bronze" | "silver" | "gold" | "platinum";
  medal_description: string;
}

const DAILY_MEDALS: { count: number; medal: NewMedal }[] = [
  {
    count: 1,
    medal: {
      medal_id: "DAILY_1",
      medal_name: "Pejuang Pertama",
      medal_tier: "bronze",
      medal_description: "Menyelesaikan tantangan harian pertama",
    },
  },
  {
    count: 7,
    medal: {
      medal_id: "DAILY_7",
      medal_name: "Petarung Mingguan",
      medal_tier: "silver",
      medal_description: "Menyelesaikan 7 tantangan harian",
    },
  },
  {
    count: 30,
    medal: {
      medal_id: "DAILY_30",
      medal_name: "Gladiator",
      medal_tier: "gold",
      medal_description: "Menyelesaikan 30 tantangan harian",
    },
  },
];

export async function checkAndAwardMedals(userId: string): Promise<NewMedal[]> {
  const sb = supabase as any;
  const { count } = await sb
    .from("user_challenge_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("completed_at", "is", null);
  const completed = count || 0;

  const earned: NewMedal[] = [];
  for (const tier of DAILY_MEDALS) {
    if (completed >= tier.count) {
      const { data: existing } = await sb
        .from("user_medals")
        .select("id")
        .eq("user_id", userId)
        .eq("medal_id", tier.medal.medal_id)
        .maybeSingle();
      if (!existing) {
        const { error } = await sb.from("user_medals").insert({
          user_id: userId,
          ...tier.medal,
        });
        if (!error) earned.push(tier.medal);
      }
    }
  }
  return earned;
}