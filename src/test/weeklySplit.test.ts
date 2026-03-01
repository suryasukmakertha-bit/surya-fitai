import { describe, it, expect } from "vitest";
import { addDays, format as fnsFormat } from "date-fns";

// ---- Copy of production types & logic from Results.tsx ----
type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type DayToken = { token: string; idx: DayIndex; ambiguous?: boolean };

const DAY_TOKEN_LOOKUP: DayToken[] = [
  { token: "monday", idx: 0 }, { token: "mon", idx: 0 }, { token: "senin", idx: 0 },
  { token: "tuesday", idx: 1 }, { token: "tue", idx: 1 }, { token: "selasa", idx: 1 },
  { token: "wednesday", idx: 2 }, { token: "wed", idx: 2 }, { token: "rabu", idx: 2 },
  { token: "thursday", idx: 3 }, { token: "thu", idx: 3 }, { token: "kamis", idx: 3 },
  { token: "friday", idx: 4 }, { token: "fri", idx: 4 }, { token: "jumat", idx: 4 },
  { token: "saturday", idx: 5 }, { token: "sat", idx: 5 }, { token: "sabtu", idx: 5 },
  { token: "sunday", idx: 6 }, { token: "sun", idx: 6 },
  { token: "minggu", idx: 6, ambiguous: true }, { token: "ahad", idx: 6 },
];

const getDayIndexFromText = (value: string): DayIndex | null => {
  const normalized = value.toLowerCase().replace(/[，、]/g, ",").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const matches: Array<{ idx: DayIndex; position: number; ambiguous: boolean }> = [];
  DAY_TOKEN_LOOKUP.forEach(({ token, idx, ambiguous }) => {
    const isAscii = /^[a-z]+$/.test(token);
    const pattern = isAscii ? new RegExp(`\\b${token}\\b`, "g") : new RegExp(token, "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(normalized)) !== null) {
      matches.push({ idx, position: match.index, ambiguous: Boolean(ambiguous) });
    }
  });
  if (matches.length === 0) return null;
  const hasNonAmbiguous = matches.some((m) => !m.ambiguous);
  const relevantMatches = hasNonAmbiguous ? matches.filter((m) => !m.ambiguous) : matches;
  relevantMatches.sort((a, b) => b.position - a.position);
  return relevantMatches[0].idx;
};

const getMondayBasedDayIndex = (date: Date): DayIndex => {
  return (Number(fnsFormat(date, "i")) - 1) as DayIndex;
};

const parseWeeklySplit = (weeklySplit: string[]) => {
  const workoutByDay = new Map<DayIndex, string>();
  const restDays = new Set<DayIndex>();
  const lines = weeklySplit.flatMap((e) => e.split(/\n+/)).map((e) => e.trim()).filter(Boolean);

  const isRestLabel = (value: string) => {
    const lower = value.toLowerCase();
    const hasWorkoutHint = /(power|hypertrophy|strength|stability|cardio|hiit|upper|lower|full\s*body|mobilitas|kekuatan|functional|balance|core|push|pull|legs?|endurance|otot|massa|fat\s*loss)/i.test(lower);
    const hasRestHint = /(\brest\b(?:\s*[/&-]\s*recover(?:y)?)?|\brest\s*day(?:s)?\b|istirahat|pemulihan|active\s*recovery|recovery|休息|恢复)/i.test(lower);
    return hasRestHint && !hasWorkoutHint;
  };

  const assignDay = (dayToken: string, label: string) => {
    const idx = getDayIndexFromText(dayToken);
    if (idx === null) return false;
    if (isRestLabel(label)) { restDays.add(idx); workoutByDay.delete(idx); }
    else { workoutByDay.set(idx, label.trim()); restDays.delete(idx); }
    return true;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/[–—]/g, "-").trim();
    const numberedParenthesized = line.match(/^(?:day|hari)\s*\d+\s*\(([^)]+)\)\s*:\s*(.+)$/i);
    if (numberedParenthesized) { assignDay(numberedParenthesized[1], numberedParenthesized[2]); continue; }
    const numberedWithDash = line.match(/^(?:day|hari)\s*\d+\s*:\s*([^-:]+?)\s*-\s*(.+)$/i);
    if (numberedWithDash) { assignDay(numberedWithDash[1], numberedWithDash[2]); continue; }
    const restList = line.match(/^(?:rest\s*days?|hari\s*istirahat)\s*:\s*(.+)$/i);
    if (restList) { restList[1].replace(/\band\b/gi, ",").split(/[,/|]/).map((p) => p.trim()).filter(Boolean).forEach((token) => { const idx = getDayIndexFromText(token); if (idx !== null) { restDays.add(idx); workoutByDay.delete(idx); } }); continue; }
    const directDayColon = line.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (directDayColon && assignDay(directDayColon[1], directDayColon[2])) continue;
    const directDayDash = line.match(/^([^-:]+?)\s*-\s*(.+)$/);
    if (directDayDash && assignDay(directDayDash[1], directDayDash[2])) continue;
    const fallbackIdx = getDayIndexFromText(line);
    if (fallbackIdx !== null && isRestLabel(line)) { restDays.add(fallbackIdx); workoutByDay.delete(fallbackIdx); }
  }
  return { workoutByDay, restDays };
};

// ---- Tests ----

describe("parseWeeklySplit", () => {
  it("parses Indonesian 3-day split (Senin/Rabu/Jumat) with colon format", () => {
    const split = parseWeeklySplit([
      "Senin: Full Body Strength & Mobility",
      "Selasa: Rest / Recovery",
      "Rabu: Cardio & Core Focus",
      "Kamis: Rest / Recovery",
      "Jumat: Full Body Endurance",
      "Sabtu: Active Recovery (Jalan Santai)",
      "Minggu: Rest / Recovery",
    ]);
    expect(split.workoutByDay.size).toBe(3);
    expect(split.workoutByDay.has(0)).toBe(true); // Monday
    expect(split.workoutByDay.has(2)).toBe(true); // Wednesday
    expect(split.workoutByDay.has(4)).toBe(true); // Friday
    expect(split.restDays.has(1)).toBe(true); // Tuesday
    expect(split.restDays.has(3)).toBe(true); // Thursday
    expect(split.restDays.has(6)).toBe(true); // Sunday
  });

  it("parses English dash format (Mon/Wed/Fri)", () => {
    const split = parseWeeklySplit([
      "Monday - Upper Body Power",
      "Tuesday - Rest & Recovery",
      "Wednesday - Lower Body",
      "Thursday - Rest & Recovery",
      "Friday - Full Body HIIT",
      "Saturday - Rest & Recovery",
      "Sunday - Rest & Recovery",
    ]);
    expect(split.workoutByDay.size).toBe(3);
    expect(split.workoutByDay.get(0)).toBe("Upper Body Power");
    expect(split.workoutByDay.get(2)).toBe("Lower Body");
    expect(split.workoutByDay.get(4)).toBe("Full Body HIIT");
    expect(split.restDays.size).toBe(4);
  });

  it("parses numbered parenthesized format", () => {
    const split = parseWeeklySplit([
      "Hari 1 (Senin): Kekuatan Full Body",
      "Hari 2 (Selasa): Istirahat",
      "Hari 3 (Rabu): Cardio & Core",
      "Hari 4 (Kamis): Istirahat",
      "Hari 5 (Jumat): Full Body Endurance",
      "Hari 6 (Sabtu): Pemulihan",
      "Hari 7 (Minggu): Istirahat",
    ]);
    expect(split.workoutByDay.size).toBe(3);
    expect(split.workoutByDay.has(0)).toBe(true);
    expect(split.workoutByDay.has(2)).toBe(true);
    expect(split.workoutByDay.has(4)).toBe(true);
  });

  it("Active Recovery (Jalan Santai) is treated as rest, not workout", () => {
    const split = parseWeeklySplit(["Sabtu: Active Recovery (Jalan Santai)"]);
    expect(split.restDays.has(5)).toBe(true);
    expect(split.workoutByDay.has(5)).toBe(false);
  });
});

describe("getMondayBasedDayIndex", () => {
  it("maps dates correctly to Monday=0 ... Sunday=6", () => {
    // 2026-03-02 is a Monday
    const monday = new Date(2026, 2, 2, 12, 0, 0);
    expect(getMondayBasedDayIndex(monday)).toBe(0);

    const wednesday = new Date(2026, 2, 4, 12, 0, 0);
    expect(getMondayBasedDayIndex(wednesday)).toBe(2);

    const friday = new Date(2026, 2, 6, 12, 0, 0);
    expect(getMondayBasedDayIndex(friday)).toBe(4);

    const sunday = new Date(2026, 2, 8, 12, 0, 0);
    expect(getMondayBasedDayIndex(sunday)).toBe(6);
  });
});

describe("weekly card generation (3-day Mon/Wed/Fri)", () => {
  const weeklySplit = [
    "Senin: Full Body Strength & Mobility",
    "Selasa: Rest / Recovery",
    "Rabu: Cardio & Core Focus",
    "Kamis: Rest / Recovery",
    "Jumat: Full Body Endurance",
    "Sabtu: Active Recovery (Jalan Santai)",
    "Minggu: Rest / Recovery",
  ];

  const split = parseWeeklySplit(weeklySplit);

  // Simulate week generation for Week 1 starting 2026-03-02 (Monday)
  const startDate = new Date(2026, 2, 2, 12, 0, 0);

  const generateWeek = (weekOffset: number) => {
    const weekStart = addDays(startDate, weekOffset * 7);
    const results: Array<{ date: string; dayName: string; type: "workout" | "rest" }> = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = addDays(weekStart, d);
      const dayIndex = getMondayBasedDayIndex(dayDate);
      const dateStr = fnsFormat(dayDate, "yyyy-MM-dd");
      const dayName = fnsFormat(dayDate, "EEEE");
      const isWorkout = split.workoutByDay.has(dayIndex);
      results.push({ date: dateStr, dayName, type: isWorkout ? "workout" : "rest" });
    }
    return results;
  };

  it("Week 1: Mon/Wed/Fri are workouts, rest are rest days", () => {
    const week = generateWeek(0);
    expect(week[0]).toMatchObject({ dayName: "Monday", type: "workout" });
    expect(week[1]).toMatchObject({ dayName: "Tuesday", type: "rest" });
    expect(week[2]).toMatchObject({ dayName: "Wednesday", type: "workout" });
    expect(week[3]).toMatchObject({ dayName: "Thursday", type: "rest" });
    expect(week[4]).toMatchObject({ dayName: "Friday", type: "workout" });
    expect(week[5]).toMatchObject({ dayName: "Saturday", type: "rest" });
    expect(week[6]).toMatchObject({ dayName: "Sunday", type: "rest" });
  });

  it("Week 2: same pattern repeats", () => {
    const week = generateWeek(1);
    expect(week[0]).toMatchObject({ dayName: "Monday", type: "workout" });
    expect(week[2]).toMatchObject({ dayName: "Wednesday", type: "workout" });
    expect(week[4]).toMatchObject({ dayName: "Friday", type: "workout" });
    expect(week.filter((d) => d.type === "workout").length).toBe(3);
    expect(week.filter((d) => d.type === "rest").length).toBe(4);
  });

  it("Week 4: still 3 workout days, 4 rest days", () => {
    const week = generateWeek(3);
    expect(week.filter((d) => d.type === "workout").length).toBe(3);
    expect(week.filter((d) => d.type === "rest").length).toBe(4);
  });

  it("Week 12: no all-rest-week bug", () => {
    const week = generateWeek(11);
    expect(week.filter((d) => d.type === "workout").length).toBe(3);
  });
});
