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

// ============== Generic medal awarding ==============

async function awardIfNew(userId: string, medal: NewMedal): Promise<NewMedal | null> {
  const sb = supabase as any;
  const { data: existing } = await sb
    .from("user_medals")
    .select("id")
    .eq("user_id", userId)
    .eq("medal_id", medal.medal_id)
    .maybeSingle();
  if (existing) return null;
  const { error } = await sb.from("user_medals").insert({ user_id: userId, ...medal });
  return error ? null : medal;
}

function consecutiveStreakEndingNow(dates: string[]): number {
  const set = new Set(dates);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const cursor = new Date();
  if (!set.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (set.has(fmt(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export async function checkWorkoutStreakMedals(userId: string): Promise<NewMedal[]> {
  const sb = supabase as any;
  const { data } = await sb
    .from("workout_completions")
    .select("workout_date")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("workout_date", { ascending: false })
    .limit(500);
  const streak = consecutiveStreakEndingNow((data || []).map((r: any) => r.workout_date));
  const tiers: { min: number; medal: NewMedal }[] = [
    { min: 3, medal: { medal_id: "STREAK_3", medal_name: "On Fire", medal_tier: "bronze", medal_description: "Latihan 3 hari berturut-turut" } },
    { min: 7, medal: { medal_id: "STREAK_7", medal_name: "Minggu Penuh Api", medal_tier: "silver", medal_description: "Latihan 7 hari berturut-turut" } },
    { min: 30, medal: { medal_id: "STREAK_30", medal_name: "Unstoppable", medal_tier: "gold", medal_description: "Latihan 30 hari berturut-turut" } },
  ];
  const earned: NewMedal[] = [];
  for (const t of tiers) {
    if (streak >= t.min) {
      const m = await awardIfNew(userId, t.medal);
      if (m) earned.push(m);
    }
  }
  return earned;
}

export async function checkProgramCompleteMedal(userId: string, completedDays: number, totalDays: number): Promise<NewMedal[]> {
  if (totalDays <= 0 || completedDays < totalDays) return [];
  const m = await awardIfNew(userId, {
    medal_id: "PROGRAM_COMPLETE",
    medal_name: "Program Tamat",
    medal_tier: "silver",
    medal_description: "Menyelesaikan satu program penuh",
  });
  return m ? [m] : [];
}

export async function checkFirstGenerateMedal(userId: string): Promise<NewMedal[]> {
  const m = await awardIfNew(userId, {
    medal_id: "FIRST_GENERATE",
    medal_name: "Langkah Pertama",
    medal_tier: "bronze",
    medal_description: "Membuat program pertama bersama Coach Surya",
  });
  return m ? [m] : [];
}

export async function checkCheckinMedals(userId: string, latestWeight: number, targetWeight?: number | null): Promise<NewMedal[]> {
  const sb = supabase as any;
  const earned: NewMedal[] = [];

  // Weight goal: within 0.5 kg of target
  if (targetWeight && Math.abs(latestWeight - targetWeight) <= 0.5) {
    const m = await awardIfNew(userId, {
      medal_id: "WEIGHT_GOAL",
      medal_name: "Target Tercapai",
      medal_tier: "gold",
      medal_description: "Mencapai target berat badan",
    });
    if (m) earned.push(m);
  }

  // 14-day consecutive checkin streak
  const { data } = await sb
    .from("progress_checkins")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(60);
  const streak = consecutiveStreakEndingNow((data || []).map((r: any) => r.date));
  if (streak >= 14) {
    const m = await awardIfNew(userId, {
      medal_id: "CHECKIN_14",
      medal_name: "Konsisten",
      medal_tier: "silver",
      medal_description: "Check-in berat badan 14 hari berturut-turut",
    });
    if (m) earned.push(m);
  }
  return earned;
}