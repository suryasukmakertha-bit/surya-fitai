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

function isRestLabel(label: string): boolean {
  if (!label) return true;
  return /rest|istirahat|休息/i.test(label);
}

/** Returns set of Mon-based day-of-week indices (0=Mon..6=Sun) that are rest days. */
export function getRestDayIndices(planData: any): Set<number> {
  const rest = new Set<number>();
  const split = planData?.weeklySplit;
  if (!Array.isArray(split) || split.length !== 7) return rest;
  split.forEach((d: any, i: number) => {
    const label = typeof d === "string" ? d : d?.day || "";
    if (isRestLabel(label)) rest.add(i);
  });
  return rest;
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