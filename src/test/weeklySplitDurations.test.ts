import { describe, it, expect } from "vitest";
import { format as fnsFormat } from "date-fns";

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type NumberedDayEntry = {
  order: number;
  label: string;
  isRest: boolean;
};

const getMondayBasedDayIndex = (date: Date): DayIndex => {
  return (Number(fnsFormat(date, "i")) - 1) as DayIndex;
};

const isRestLabelText = (value: string) => {
  const lower = value.toLowerCase();
  const hasWorkoutHint = /(power|hypertrophy|strength|stability|cardio|hiit|upper|lower|full\s*body|mobilitas|kekuatan|functional|balance|core|push|pull|legs?|endurance|otot|massa|fat\s*loss)/i.test(lower);
  const hasRestHint = /(\brest\b(?:\s*[/&-]\s*recover(?:y)?)?|\brest\s*day(?:s)?\b|istirahat|pemulihan|active\s*recovery|recovery|休息|恢复)/i.test(lower);
  return hasRestHint && !hasWorkoutHint;
};

const parseNumberedDayEntries = (weeklySplit: string[]): NumberedDayEntry[] => {
  const entries = new Map<number, NumberedDayEntry>();

  const lines = weeklySplit
    .flatMap((entry) => entry.split(/\n+/))
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const rawLine of lines) {
    const line = rawLine.replace(/[–—]/g, "-").trim();
    const numberedNoWeekday = line.match(/^(?:day|hari)\s*(\d+)\s*:\s*(.+)$/i);
    if (!numberedNoWeekday) continue;

    const [, orderToken, label] = numberedNoWeekday;
    const order = Number(orderToken);
    if (!Number.isFinite(order) || order <= 0) continue;

    const trimmedLabel = label.trim();
    entries.set(order, {
      order,
      label: trimmedLabel,
      isRest: isRestLabelText(trimmedLabel),
    });
  }

  return Array.from(entries.values()).sort((a, b) => a.order - b.order);
};

const mapNumberedDayEntries = (entries: NumberedDayEntry[], weekStartDayIndex: DayIndex) => {
  const workoutByDay = new Map<DayIndex, string>();
  const restDays = new Set<DayIndex>();

  entries.forEach((entry) => {
    const dayOffset = (entry.order - 1) % 7;
    const mappedDayIdx = ((weekStartDayIndex + dayOffset + 7) % 7) as DayIndex;

    if (entry.isRest) {
      restDays.add(mappedDayIdx);
      workoutByDay.delete(mappedDayIdx);
    } else {
      workoutByDay.set(mappedDayIdx, entry.label);
      restDays.delete(mappedDayIdx);
    }
  });

  for (let i = 0; i < 7; i++) {
    const idx = i as DayIndex;
    if (!workoutByDay.has(idx) && !restDays.has(idx)) {
      restDays.add(idx);
    }
  }

  return { workoutByDay, restDays };
};

const inferByOrderedLabels = (
  orderedWorkoutLabels: string[],
  templateDayOrder: DayIndex[],
  scheduleDayOrder: DayIndex[]
) => {
  const workoutByDay = new Map<DayIndex, string>();
  const inferredDayOrder =
    scheduleDayOrder.length > templateDayOrder.length ? scheduleDayOrder : templateDayOrder;

  orderedWorkoutLabels.forEach((label, order) => {
    const dayIdx = inferredDayOrder[order];
    if (dayIdx !== undefined) {
      workoutByDay.set(dayIdx, label);
    }
  });

  return workoutByDay;
};

describe("weekly split numbered-day mapping", () => {
  it("maps 4-day split correctly when week starts on Sunday", () => {
    const weeklySplit = [
      "Day 1: Upper Body Focus (Push/Pull)",
      "Day 2: Lower Body Focus (Legs/Glutes)",
      "Day 3: Rest & Active Recovery",
      "Day 4: Full Body Strength",
      "Day 5: Rest Day",
      "Day 6: Full Body + Core",
      "Day 7: Rest Day",
    ];

    const entries = parseNumberedDayEntries(weeklySplit);
    const sundayStart = new Date(2026, 2, 1, 12, 0, 0); // Sunday
    const mapped = mapNumberedDayEntries(entries, getMondayBasedDayIndex(sundayStart));

    // Sunday, Monday, Wednesday, Friday should be workouts
    expect(mapped.workoutByDay.has(6)).toBe(true);
    expect(mapped.workoutByDay.has(0)).toBe(true);
    expect(mapped.workoutByDay.has(2)).toBe(true);
    expect(mapped.workoutByDay.has(4)).toBe(true);

    expect(mapped.workoutByDay.size).toBe(4);
    expect(mapped.restDays.size).toBe(3);
  });

  it("prefers broader weekly_schedule order over short workout template order", () => {
    const orderedLabels = [
      "Upper Body Focus (Push/Pull)",
      "Lower Body Focus (Legs/Glutes)",
      "Full Body Strength",
      "Full Body + Core",
    ];

    const templateDayOrder: DayIndex[] = [6, 0]; // incomplete from workout_plan
    const scheduleDayOrder: DayIndex[] = [6, 0, 2, 4]; // complete from weekly_schedule

    const inferred = inferByOrderedLabels(orderedLabels, templateDayOrder, scheduleDayOrder);

    expect(inferred.size).toBe(4);
    expect(inferred.has(6)).toBe(true);
    expect(inferred.has(0)).toBe(true);
    expect(inferred.has(2)).toBe(true);
    expect(inferred.has(4)).toBe(true);
  });

  it("keeps workout/rest counts consistent for 2..7 days per week", () => {
    const mondayStart = new Date(2026, 2, 2, 12, 0, 0); // Monday
    const startIdx = getMondayBasedDayIndex(mondayStart);

    for (let trainingDays = 2; trainingDays <= 7; trainingDays++) {
      const weeklySplit = Array.from({ length: 7 }, (_, index) => {
        const day = index + 1;
        return day <= trainingDays ? `Day ${day}: Workout ${day}` : `Day ${day}: Rest Day`;
      });

      const entries = parseNumberedDayEntries(weeklySplit);
      const mapped = mapNumberedDayEntries(entries, startIdx);

      expect(mapped.workoutByDay.size).toBe(trainingDays);
      expect(mapped.restDays.size).toBe(7 - trainingDays);
    }
  });
});
