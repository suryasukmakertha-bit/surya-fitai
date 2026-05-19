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
  const sb = supabase as any;
  const { data, error } = await sb.rpc("get_or_create_daily_challenge");
  if (error || !data) {
    // Fallback: read-only fetch (no client insert allowed)
    const date = todayDateStr();
    const { data: existing } = await sb
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", date)
      .maybeSingle();
    return (existing as DailyChallenge) || null;
  }
  return data as DailyChallenge;
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
  // Completion + XP award handled atomically server-side.
  // xp_earned and completed_at are not client-writable.
  void userId; void date; void xpReward;
  await sb.rpc("complete_daily_challenge");
}

export interface NewMedal {
  medal_id: string;
  medal_name: string;
  medal_tier: "bronze" | "silver" | "gold" | "platinum";
  medal_description: string;
  xp_earned?: number;
}

export const MEDAL_XP: Record<string, number> = {
  DAILY_1: 50,
  DAILY_7: 150,
  DAILY_30: 500,
  STREAK_3: 75,
  STREAK_7: 200,
  STREAK_30: 750,
  PROGRAM_COMPLETE: 300,
  FIRST_GENERATE: 30,
  WEIGHT_GOAL: 250,
  CHECKIN_14: 100,
  FIRST_RUN: 50,
  RUN_5K: 150,
  RUN_10K: 300,
  FIRST_RIDE: 50,
  RIDE_20K: 200,
};

async function awardXp(userId: string, xp: number): Promise<void> {
  if (!xp || xp <= 0) return;
  const sb = supabase as any;
  // XP can only be modified server-side via the secure RPC
  await sb.rpc("increment_user_xp", { p_user_id: userId, p_xp: xp });
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
      const m = await awardIfNew(userId, tier.medal);
      if (m) earned.push(m);
    }
  }
  return earned;
}

// ============== Generic medal awarding ==============

async function awardIfNew(userId: string, medal: NewMedal): Promise<NewMedal | null> {
  const sb = supabase as any;
  // Server-side validates earning criteria + grants XP atomically
  const { data, error } = await sb.rpc("award_medal_if_earned", {
    p_medal_id: medal.medal_id,
    p_medal_name: medal.medal_name,
    p_medal_tier: medal.medal_tier,
    p_medal_description: medal.medal_description,
  });
  if (error || !data || !(data as any).awarded) return null;
  const xp = (data as any).xp_earned ?? MEDAL_XP[medal.medal_id] ?? 0;
  return { ...medal, xp_earned: xp };
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

export async function checkPlanCompletionMedal(userId: string): Promise<NewMedal[]> {
  const sb = supabase as any;
  const { count } = await sb
    .from("saved_plans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("plan_completed_at", "is", null);
  if (!count || count < 1) return [];
  const m = await awardIfNew(userId, {
    medal_id: "WEIGHT_GOAL",
    medal_name: "Target Tercapai",
    medal_tier: "gold",
    medal_description: "Menyelesaikan satu rencana latihan penuh",
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
export async function checkActivityMedals(
  userId: string,
  activityType: "running" | "cycling",
  distanceKm: number,
): Promise<NewMedal[]> {
  const sb = supabase as any;
  const earned: NewMedal[] = [];
  const { count } = await sb
    .from("activity_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("activity_type", activityType);
  const sessionCount = count || 0;

  if (activityType === "running") {
    if (sessionCount <= 1) {
      const m = await awardIfNew(userId, {
        medal_id: "FIRST_RUN", medal_name: "Pelari Baru", medal_tier: "bronze",
        medal_description: "Menyelesaikan sesi lari pertama",
      });
      if (m) earned.push(m);
    }
    if (distanceKm >= 5) {
      const m = await awardIfNew(userId, {
        medal_id: "RUN_5K", medal_name: "5K Finisher", medal_tier: "silver",
        medal_description: "Menyelesaikan lari 5 km",
      });
      if (m) earned.push(m);
    }
    if (distanceKm >= 10) {
      const m = await awardIfNew(userId, {
        medal_id: "RUN_10K", medal_name: "10K Hero", medal_tier: "gold",
        medal_description: "Menyelesaikan lari 10 km",
      });
      if (m) earned.push(m);
    }
  } else {
    if (sessionCount <= 1) {
      const m = await awardIfNew(userId, {
        medal_id: "FIRST_RIDE", medal_name: "Pesepeda Baru", medal_tier: "bronze",
        medal_description: "Menyelesaikan sesi sepeda pertama",
      });
      if (m) earned.push(m);
    }
    if (distanceKm >= 20) {
      const m = await awardIfNew(userId, {
        medal_id: "RIDE_20K", medal_name: "20K Rider", medal_tier: "silver",
        medal_description: "Menyelesaikan ride 20 km",
      });
      if (m) earned.push(m);
    }
  }
  return earned;
}
