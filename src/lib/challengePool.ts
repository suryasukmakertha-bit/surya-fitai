// Hardcoded daily challenge exercise pool.
// Used only by the Challenge Timer popup to determine the target value
// and whether the exercise is reps-based or time-based.
// This does NOT change how daily_challenges rows are generated server-side.

export type ChallengeKind = "reps" | "time";
export type ChallengeDifficulty = "mudah" | "sedang" | "sulit";

export interface ChallengePoolEntry {
  key: string;            // canonical English name (matches existing daily_challenges.exercise_name when possible)
  kind: ChallengeKind;
  targets: { mudah: number; sedang: number; sulit: number };
  xp: { mudah: number; sedang: number; sulit: number };
  // ExerciseDB API lookup token (lowercase, space separated)
  apiName: string;
}

const XP_STANDARD = { mudah: 25, sedang: 50, sulit: 100 };

export const CHALLENGE_POOL: ChallengePoolEntry[] = [
  // REPS-based
  { key: "Push-up",          kind: "reps", targets: { mudah: 10, sedang: 20, sulit: 35 }, xp: XP_STANDARD, apiName: "push up" },
  { key: "Sit-up",           kind: "reps", targets: { mudah: 15, sedang: 25, sulit: 40 }, xp: XP_STANDARD, apiName: "sit up" },
  { key: "Squat",            kind: "reps", targets: { mudah: 15, sedang: 30, sulit: 50 }, xp: XP_STANDARD, apiName: "squat" },
  { key: "Lunge",            kind: "reps", targets: { mudah: 10, sedang: 20, sulit: 35 }, xp: XP_STANDARD, apiName: "lunge" },
  { key: "Burpee",           kind: "reps", targets: { mudah: 5,  sedang: 10, sulit: 20 }, xp: XP_STANDARD, apiName: "burpee" },
  { key: "Mountain Climber", kind: "reps", targets: { mudah: 20, sedang: 40, sulit: 60 }, xp: XP_STANDARD, apiName: "mountain climber" },
  { key: "Jump Squat",       kind: "reps", targets: { mudah: 10, sedang: 20, sulit: 30 }, xp: XP_STANDARD, apiName: "jump squat" },
  { key: "Crunch",           kind: "reps", targets: { mudah: 15, sedang: 30, sulit: 50 }, xp: XP_STANDARD, apiName: "crunch" },
  { key: "High Knees",       kind: "reps", targets: { mudah: 20, sedang: 40, sulit: 60 }, xp: XP_STANDARD, apiName: "high knee" },
  { key: "Jumping Jack",     kind: "reps", targets: { mudah: 20, sedang: 40, sulit: 60 }, xp: XP_STANDARD, apiName: "jumping jack" },
  // TIME-based (seconds)
  { key: "Plank",             kind: "time", targets: { mudah: 20, sedang: 45, sulit: 90 }, xp: XP_STANDARD, apiName: "plank" },
  { key: "Wall Sit",          kind: "time", targets: { mudah: 20, sedang: 45, sulit: 75 }, xp: XP_STANDARD, apiName: "wall sit" },
  { key: "Dead Hang",         kind: "time", targets: { mudah: 15, sedang: 30, sulit: 60 }, xp: XP_STANDARD, apiName: "dead hang" },
  { key: "Glute Bridge Hold", kind: "time", targets: { mudah: 20, sedang: 40, sulit: 70 }, xp: XP_STANDARD, apiName: "glute bridge" },
  { key: "Superman Hold",     kind: "time", targets: { mudah: 15, sedang: 30, sulit: 60 }, xp: XP_STANDARD, apiName: "superman" },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[-–—]/g, " ").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function findChallengeEntry(exerciseName: string): ChallengePoolEntry | null {
  const target = norm(exerciseName);
  for (const e of CHALLENGE_POOL) {
    if (norm(e.key) === target) return e;
  }
  // tolerant: contains match (e.g. "Standard Push-Up" → push up)
  for (const e of CHALLENGE_POOL) {
    const k = norm(e.key);
    if (target.includes(k) || k.includes(target)) return e;
  }
  return null;
}