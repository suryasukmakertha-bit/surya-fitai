/**
 * Streak calculation that respects rest days.
 *
 * Rest days are derived from the active plan's `weeklySplit` (7 entries,
 * Mon-based: index 0 = Monday ... index 6 = Sunday). Entries whose label
 * contains "rest" / "istirahat" / "休息" are treated as scheduled rest.
 *
 * - Streak increments ONLY on unique dates with completed workout entries.
 * - Rest days NEVER break the streak — they are skipped entirely.
 * - Only a missed scheduled workout day resets the streak.
 */

/**
 * weeklySplit is a free-form string[] (one entry per scheduled day) — not a
 * 7-slot Mon..Sun array. Each entry is parsed to extract its weekday token
 * (EN / ID / ZH) and to detect whether the label is a workout or a rest day.
 */

type DayIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Mon=0 .. Sun=6

const DAY_TOKENS: Array<{ token: string; idx: DayIdx; ambiguous?: boolean }> = [
  { token: "monday", idx: 0 }, { token: "mon", idx: 0 }, { token: "senin", idx: 0 }, { token: "星期一", idx: 0 }, { token: "周一", idx: 0 },
  { token: "tuesday", idx: 1 }, { token: "tues", idx: 1 }, { token: "tue", idx: 1 }, { token: "selasa", idx: 1 }, { token: "星期二", idx: 1 }, { token: "周二", idx: 1 },
  { token: "wednesday", idx: 2 }, { token: "wed", idx: 2 }, { token: "rabu", idx: 2 }, { token: "星期三", idx: 2 }, { token: "周三", idx: 2 },
  { token: "thursday", idx: 3 }, { token: "thurs", idx: 3 }, { token: "thur", idx: 3 }, { token: "thu", idx: 3 }, { token: "kamis", idx: 3 }, { token: "星期四", idx: 3 }, { token: "周四", idx: 3 },
  { token: "friday", idx: 4 }, { token: "fri", idx: 4 }, { token: "jumat", idx: 4 }, { token: "星期五", idx: 4 }, { token: "周五", idx: 4 },
  { token: "saturday", idx: 5 }, { token: "sat", idx: 5 }, { token: "sabtu", idx: 5 }, { token: "星期六", idx: 5 }, { token: "周六", idx: 5 },
  { token: "sunday", idx: 6 }, { token: "sun", idx: 6 }, { token: "minggu", idx: 6, ambiguous: true }, { token: "ahad", idx: 6 }, { token: "星期日", idx: 6 }, { token: "周日", idx: 6 },
];

function getDayIdxFromText(value: string): DayIdx | null {
  const normalized = value.toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const matches: Array<{ idx: DayIdx; pos: number; ambiguous: boolean }> = [];
  for (const { token, idx, ambiguous } of DAY_TOKENS) {
    const isAscii = /^[a-z]+$/.test(token);
    const pattern = isAscii ? new RegExp(`\\b${token}\\b`, "g") : new RegExp(token, "g");
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(normalized)) !== null) {
      matches.push({ idx, pos: m.index, ambiguous: Boolean(ambiguous) });
    }
  }
  if (matches.length === 0) return null;
  const hasUnambig = matches.some((m) => !m.ambiguous);
  const list = hasUnambig ? matches.filter((m) => !m.ambiguous) : matches;
  list.sort((a, b) => b.pos - a.pos);
  return list[0].idx;
}

function isRestLabelText(value: string): boolean {
  const lower = value.toLowerCase();
  const hasWorkoutHint = /(power|hypertrophy|strength|stability|cardio|hiit|upper|lower|full\s*body|mobilitas|kekuatan|functional|balance|core|push|pull|legs?|endurance|otot|massa|fat\s*loss)/i.test(lower);
  const hasRestHint = /(\brest\b(?:\s*[/&-]\s*recover(?:y)?)?|\brest\s*day(?:s)?\b|istirahat|pemulihan|active\s*recovery|recovery|休息|恢复)/i.test(lower);
  return hasRestHint && !hasWorkoutHint;
}

/**
 * Returns Mon-based day-of-week indices (0=Mon..6=Sun) treated as REST for the
 * given plan. A day is "rest" if it is explicitly labeled rest OR if it does
 * NOT appear at all in weeklySplit (i.e. the plan never schedules it). Only
 * scheduled workout days that are missed should break the streak.
 */
export function getRestDayIndices(planData: any): Set<number> {
  const split = planData?.weeklySplit;
  if (!Array.isArray(split) || split.length === 0) return new Set<number>();

  const workoutDays = new Set<DayIdx>();
  const restDays = new Set<DayIdx>();

  const lines = split
    .flatMap((entry: any) => (typeof entry === "string" ? entry.split(/\n+/) : [String(entry?.day || "")]))
    .map((l: string) => l.replace(/[–—]/g, "-").trim())
    .filter(Boolean);

  for (const line of lines) {
    const idx = getDayIdxFromText(line);
    if (idx === null) continue;
    if (isRestLabelText(line)) {
      restDays.add(idx);
      workoutDays.delete(idx);
    } else {
      workoutDays.add(idx);
      restDays.delete(idx);
    }
  }

  // If we couldn't identify any workout days, fall back to "no rest days" so
  // the streak walker doesn't silently skip everything.
  if (workoutDays.size === 0) return new Set<number>();

  // Any weekday not scheduled as a workout is effectively a rest day for streak
  // purposes (it must never break the streak).
  const result = new Set<number>();
  for (let i = 0; i < 7; i++) {
    if (!workoutDays.has(i as DayIdx)) result.add(i);
  }
  return result;
}

/** Local Mon-based day index for a YYYY-MM-DD string. */
function dowMon(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return (d.getDay() + 6) % 7;
}

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function completedDateSet(completedDates: Iterable<string>): Set<string> {
  const set = new Set<string>();
  for (const value of completedDates) {
    const key = typeof value === "string" ? value.slice(0, 10) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) set.add(key);
  }
  return set;
}

/**
 * Current streak ending today (or yesterday if today has no workout yet).
 * Walks backwards; rest days are skipped, missed scheduled days break.
 */
export function computeCurrentStreak(
  completedDates: Iterable<string>,
  restDays: Set<number>
): number {
  const set = completedDateSet(completedDates);
  if (set.size === 0) return 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If today is a workout day and not done yet, start checking from yesterday
  // so a pending "today" doesn't artificially break the streak.
  if (!set.has(fmtLocal(cursor)) && !restDays.has((cursor.getDay() + 6) % 7)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  // Safety cap to avoid infinite loops on all-rest plans.
  for (let i = 0; i < 365; i++) {
    const key = fmtLocal(cursor);
    const isRest = restDays.has((cursor.getDay() + 6) % 7);
    if (isRest) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (set.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return Math.min(streak, set.size);
}

/**
 * Longest streak across history. Iterates each calendar day from the earliest
 * completed date to today; rest days are skipped, missed scheduled days reset.
 */
export function computeLongestStreak(
  completedDates: Iterable<string>,
  restDays: Set<number>
): number {
  const set = completedDateSet(completedDates);
  if (set.size === 0) return 0;
  const sorted = Array.from(set).sort();
  const start = new Date(sorted[0] + "T00:00:00");
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  let longest = 0;
  let cur = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const isRest = restDays.has((cursor.getDay() + 6) % 7);
    if (!isRest) {
      if (set.has(fmtLocal(cursor))) {
        cur += 1;
        if (cur > longest) longest = cur;
      } else {
        cur = 0;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.min(longest, set.size);
}

// Re-export helper for callers that already have a date string.
export { dowMon };