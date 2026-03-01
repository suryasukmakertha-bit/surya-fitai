import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Flame, Droplets, Dumbbell, Apple, ShoppingCart, TrendingUp, TrendingDown, Sparkles, Save, Loader2, Download, MessageCircle, Scale, Plus, Trash2, Clock, Shield, RefreshCw, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportPlanToPDF } from "@/lib/exportPdf";
import WorkoutChecklist from "@/components/WorkoutChecklist";
import WorkoutProgressSummary from "@/components/WorkoutProgressSummary";
import ProgressDownloadCard from "@/components/ProgressDownloadCard";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { ResponsiveContainer, Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { addDays, format as fnsFormat } from "date-fns";
import { id as idLocale, zhCN } from "date-fns/locale";

interface DayPlan {
  day: string;
  exercises: {
    name: string;
    sets: string;
    reps: string;
    rest: string;
    tempo?: string;
    cues?: string;
    alternative?: string;
    estimatedTimeMinutes?: number;
    weight_kg?: string;
    notes?: string;
  }[];
}

interface MealPlan {
  meal: string;
  time?: string;
  foods: string[];
  calories: number;
}

interface PlanData {
  // New enhanced fields
  programOverview?: string;
  durationWeeks?: number;
  weeklySplit?: string[];
  estimatedSessionTimeMinutes?: number;
  warmUp?: string;
  coolDown?: string;
  progressionRules?: string;
  deloadWeek?: string;
  recoveryTips?: string;
  warnings?: string[];
  // Existing fields
  workout_plan: DayPlan[];
  meal_plan: MealPlan[];
  calorie_target: number;
  protein: number;
  carbs: number;
  fat: number;
  water_liters: number;
  weekly_schedule: string[];
  safety_notes: string[];
  motivational_message: string;
  grocery_list: string[];
  estimated_calories_burned: number;
  weight_projection: string;
}

interface CheckIn {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Monday=0 ... Sunday=6

type DayToken = {
  token: string;
  idx: DayIndex;
  ambiguous?: boolean;
};

const DAY_TOKEN_LOOKUP: DayToken[] = [
  { token: "monday", idx: 0 },
  { token: "mon", idx: 0 },
  { token: "senin", idx: 0 },
  { token: "星期一", idx: 0 },
  { token: "周一", idx: 0 },

  { token: "tuesday", idx: 1 },
  { token: "tues", idx: 1 },
  { token: "tue", idx: 1 },
  { token: "selasa", idx: 1 },
  { token: "星期二", idx: 1 },
  { token: "周二", idx: 1 },

  { token: "wednesday", idx: 2 },
  { token: "wed", idx: 2 },
  { token: "rabu", idx: 2 },
  { token: "星期三", idx: 2 },
  { token: "周三", idx: 2 },

  { token: "thursday", idx: 3 },
  { token: "thurs", idx: 3 },
  { token: "thur", idx: 3 },
  { token: "thu", idx: 3 },
  { token: "kamis", idx: 3 },
  { token: "星期四", idx: 3 },
  { token: "周四", idx: 3 },

  { token: "friday", idx: 4 },
  { token: "fri", idx: 4 },
  { token: "jumat", idx: 4 },
  { token: "星期五", idx: 4 },
  { token: "周五", idx: 4 },

  { token: "saturday", idx: 5 },
  { token: "sat", idx: 5 },
  { token: "sabtu", idx: 5 },
  { token: "星期六", idx: 5 },
  { token: "周六", idx: 5 },

  // "minggu" can mean Sunday OR "week" in Indonesian context, so mark ambiguous.
  { token: "sunday", idx: 6 },
  { token: "sun", idx: 6 },
  { token: "minggu", idx: 6, ambiguous: true },
  { token: "ahad", idx: 6 },
  { token: "星期日", idx: 6 },
  { token: "周日", idx: 6 },
];

const getDayIndexFromText = (value: string): DayIndex | null => {
  const normalized = value
    .toLowerCase()
    .replace(/[，、]/g, ",")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
  // date-fns ISO day: 1=Monday ... 7=Sunday
  return (Number(fnsFormat(date, "i")) - 1) as DayIndex;
};

const isRestLabelText = (value: string) => {
  const lower = value.toLowerCase();
  const hasWorkoutHint = /(power|hypertrophy|strength|stability|cardio|hiit|upper|lower|full\s*body|mobilitas|kekuatan|functional|balance|core|push|pull|legs?|endurance|otot|massa|fat\s*loss)/i.test(lower);
  const hasRestHint = /(\brest\b(?:\s*[/&-]\s*recover(?:y)?)?|\brest\s*day(?:s)?\b|istirahat|pemulihan|active\s*recovery|recovery|休息|恢复)/i.test(lower);

  return hasRestHint && !hasWorkoutHint;
};

const parseWeeklySplit = (weeklySplit: string[] | undefined) => {
  const workoutByDay = new Map<DayIndex, string>();
  const restDays = new Set<DayIndex>();
  const orderedWorkoutLabels: string[] = [];

  const lines = (weeklySplit ?? [])
    .flatMap((entry) => entry.split(/\n+/))
    .map((entry) => entry.trim())
    .filter(Boolean);

  const assignDay = (dayToken: string, label: string) => {
    const idx = getDayIndexFromText(dayToken);
    if (idx === null) return false;

    if (isRestLabelText(label)) {
      restDays.add(idx);
      workoutByDay.delete(idx);
    } else {
      workoutByDay.set(idx, label.trim());
      restDays.delete(idx);
    }
    return true;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/[–—]/g, "-").trim();

    // Format: "Day 1 (Minggu): Kekuatan ..." / "Hari 2 (Rabu): ..."
    const numberedParenthesized = line.match(/^(?:day|hari)\s*\d+\s*\(([^)]+)\)\s*:\s*(.+)$/i);
    if (numberedParenthesized) {
      const [, dayToken, label] = numberedParenthesized;
      assignDay(dayToken, label);
      continue;
    }

    // Format: "Day 1: Full Body Strength & Form (Monday)" — day name in trailing parentheses
    const numberedTrailingDay = line.match(/^(?:day|hari)\s*\d+\s*:\s*(.+?)\s*\(([^)]+)\)\s*$/i);
    if (numberedTrailingDay) {
      const [, label, dayToken] = numberedTrailingDay;
      if (assignDay(dayToken, label)) continue;
    }

    // Format: "Day 3-7: Recovery & Sleep Focus" — day range as rest
    const numberedRange = line.match(/^(?:day|hari)\s*(\d+)\s*-\s*(\d+)\s*:\s*(.+)$/i);
    if (numberedRange) {
      const [, , , label] = numberedRange;
      if (isRestLabelText(label)) {
        // We can't map numbered ranges to specific weekdays without more context,
        // so skip — the gap-filling logic will mark unmapped days as rest.
      }
      continue;
    }

    // Format: "Day 1: Full Body A" (no weekday token) — keep order for later inference
    const numberedNoWeekday = line.match(/^(?:day|hari)\s*(\d+)\s*:\s*(.+)$/i);
    if (numberedNoWeekday) {
      const [, orderToken, label] = numberedNoWeekday;
      const order = Number(orderToken);
      if (Number.isFinite(order) && order > 0 && !isRestLabelText(label)) {
        orderedWorkoutLabels[order - 1] = label.trim();
      }
      continue;
    }

    // Format: "Day 1: Saturday - Full Body ..." / "Hari 2: Rabu - Istirahat"
    const numberedWithDash = line.match(/^(?:day|hari)\s*\d+\s*:\s*([^-:]+?)\s*-\s*(.+)$/i);
    if (numberedWithDash) {
      const [, dayToken, label] = numberedWithDash;
      assignDay(dayToken, label);
      continue;
    }

    // Format: "Rest days: Tuesday, Thursday" / "Hari istirahat: Selasa, Kamis"
    const restList = line.match(/^(?:rest\s*days?|hari\s*istirahat)\s*:\s*(.+)$/i);
    if (restList) {
      const tokens = restList[1]
        .replace(/\band\b/gi, ",")
        .split(/[,/|]/)
        .map((part) => part.trim())
        .filter(Boolean);

      tokens.forEach((token) => {
        const idx = getDayIndexFromText(token);
        if (idx !== null) {
          restDays.add(idx);
          workoutByDay.delete(idx);
        }
      });
      continue;
    }

    // Format: "Senin: Full Body ..." / "Wednesday: Upper Body"
    const directDayColon = line.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (directDayColon) {
      const [, dayToken, label] = directDayColon;
      if (assignDay(dayToken, label)) continue;
    }

    // Format: "Wednesday - Upper Body"
    const directDayDash = line.match(/^([^-:]+?)\s*-\s*(.+)$/);
    if (directDayDash) {
      const [, dayToken, label] = directDayDash;
      if (assignDay(dayToken, label)) continue;
    }

    // Fallback: line contains a day token + rest keyword
    const fallbackIdx = getDayIndexFromText(line);
    if (fallbackIdx !== null && isRestLabelText(line)) {
      restDays.add(fallbackIdx);
      workoutByDay.delete(fallbackIdx);
    }
  }

  return {
    workoutByDay,
    restDays,
    orderedWorkoutLabels: orderedWorkoutLabels.filter(Boolean),
  };
};

const DRAFT_KEY = "suryaFitDraft";

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const stored = localStorage.getItem("suryaFitSelectedWeek");
    return stored ? parseInt(stored) : 0;
  });

  // Resolve plan: from navigation state, or restore from draft
  const stateplan: PlanData | undefined = location.state?.plan;
  const stateUserInfo = location.state?.userInfo;
  const stateProgramType = location.state?.programType;
  const stateClientGeneratedId: string | undefined = location.state?.clientGeneratedId;
  const statePlanId: string | undefined = location.state?.planId;

  const [plan, setPlan] = useState<PlanData | undefined>(stateplan);
  const [userInfo, setUserInfo] = useState(stateUserInfo);
  const [programType, setProgramType] = useState(stateProgramType);
  const [clientGeneratedId, setClientGeneratedId] = useState(stateClientGeneratedId || crypto.randomUUID());
  const [planId, setPlanId] = useState<string | undefined>(statePlanId);

  // Draft restore on mount
  useEffect(() => {
    if (!stateplan && !statePlanId) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          setPlan(parsed.plan);
          setUserInfo(parsed.userInfo);
          setProgramType(parsed.programType);
          setClientGeneratedId(parsed.clientGeneratedId || crypto.randomUUID());
          setRestoredFromDraft(true);
          toast({ title: (t as any).draftRestored || "Recovered your last generated plan." });
        }
      } catch {}
    }
  }, []);

  // Draft auto-save: save to localStorage when we have a preview (no planId = not saved yet)
  useEffect(() => {
    if (plan && !planId) {
      const draft = JSON.stringify({ plan, userInfo, programType, clientGeneratedId });
      localStorage.setItem(DRAFT_KEY, draft);
    }
  }, [plan, userInfo, programType, clientGeneratedId, planId]);

  // Mark as saved if viewing from saved plans
  useEffect(() => {
    if (statePlanId) setSaved(true);
  }, [statePlanId]);

  // Progress state (only for saved plans)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [progressWeight, setProgressWeight] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressDate, setProgressDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addingCheckIn, setAddingCheckIn] = useState(false);

  useEffect(() => {
    setCheckIns([]);
    if (planId && user) {
      fetchCheckIns();
    }
  }, [planId, user]);

  const fetchCheckIns = async () => {
    if (!user || !planId) return;
    const { data } = await supabase
      .from("progress_checkins")
      .select("id, date, weight, note")
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .order("date", { ascending: true });
    if (data) {
      setCheckIns(data.map((d) => ({ ...d, weight: Number(d.weight) })));
    }
  };

  const addCheckIn = async () => {
    const w = parseFloat(progressWeight);
    if (!w || w < 20 || w > 500) {
      toast({ title: t.validWeight, variant: "destructive" });
      return;
    }
    if (!user) return;
    setAddingCheckIn(true);
    const { data, error } = await supabase
      .from("progress_checkins")
      .insert({ user_id: user.id, plan_id: planId, date: progressDate, weight: w, note: progressNote.trim() || null })
      .select("id, date, weight, note")
      .single();
    if (error) {
      console.error('Check-in error:', error);
      toast({ title: t.errorSaving, variant: "destructive" });
    } else if (data) {
      setCheckIns((prev) => [...prev, { ...data, weight: Number(data.weight) }]);
      setProgressWeight("");
      setProgressNote("");
      toast({ title: t.checkInLogged });
    }
    setAddingCheckIn(false);
  };

  const removeCheckIn = async (id: string) => {
    await supabase.from("progress_checkins").delete().eq("id", id);
    setCheckIns((prev) => prev.filter((c) => c.id !== id));
  };
  // Week computation (must be before early return for hooks rules)
  const totalWeeks = plan?.durationWeeks || (plan?.workout_plan ? Math.max(1, Math.ceil(plan.workout_plan.length / 7)) : 4);
  const trainingDaysPerWeek = plan?.workout_plan ? Math.ceil(plan.workout_plan.length / totalWeeks) : 5;

  // Resolve the EXACT training start date from user profile
  const trainingStartDate = useMemo(() => {
    const startDateStr = userInfo?.startDate || userInfo?.trainingStartDate;
    if (!startDateStr) {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    }

    // Parse as local date at noon to avoid timezone/day-boundary drift.
    const parts = startDateStr.split("-");
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0, 0);
    }

    const parsed = new Date(startDateStr);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
  }, [userInfo]);

  const dateLocale = lang === "id" ? idLocale : lang === "zh" ? zhCN : undefined;

  const weekOptions = useMemo(() => {
    const opts: { value: number; label: string }[] = [];
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = addDays(trainingStartDate, w * 7);
      const dayName = fnsFormat(weekStart, "EEEE", { locale: dateLocale });
      const dateStr = fnsFormat(weekStart, "yyyy-MM-dd");
      const prefix = lang === "zh" ? `${(t as any).weekLabel} ${w + 1} ${(t as any).weeksLabel}` : `${(t as any).weekLabel} ${w + 1}`;
      opts.push({ value: w, label: `${prefix} - ${dayName}, ${dateStr}` });
    }
    return opts;
  }, [totalWeeks, trainingStartDate, lang, t, dateLocale]);

  // Build 7 daily cards from Weekly Split (single source of truth)
  const weekWorkoutDays = useMemo(() => {
    if (!plan?.workout_plan) return [];

    const weekStartDate = addDays(trainingStartDate, selectedWeek * 7);
    const weekNum = selectedWeek + 1;
    const prefixWeek = lang === "zh" ? `${(t as any).weekLabel} ${weekNum} ${(t as any).weeksLabel}` : `${(t as any).weekLabel} ${weekNum}`;

    const splitConfigured = Array.isArray(plan.weeklySplit) && plan.weeklySplit.length > 0;

    if (splitConfigured) {
      console.log("[WeeklySplitDebug] Raw weeklySplit:", JSON.stringify(plan.weeklySplit));
      const split = parseWeeklySplit(plan.weeklySplit);

      // Inference fallback for formats like: "Day 1: Full Body A" (no weekday token)
      if (split.workoutByDay.size === 0 && split.orderedWorkoutLabels.length > 0) {
        const templateDayOrder = plan.workout_plan
          .filter((entry) => entry.exercises.length > 0)
          .map((entry) => getDayIndexFromText(entry.day))
          .filter((idx): idx is DayIndex => idx !== null)
          .filter((idx, index, arr) => arr.indexOf(idx) === index);

        const scheduleDayOrder = (plan.weekly_schedule ?? [])
          .flatMap((entry) => {
            const [dayToken, ...labelParts] = entry.split(":");
            const idx = getDayIndexFromText(dayToken ?? entry);
            if (idx === null) return [];

            const scheduleLabel = labelParts.join(":").trim() || entry;
            if (isRestLabelText(scheduleLabel)) return [];
            return [idx];
          })
          .filter((idx, index, arr) => arr.indexOf(idx) === index);

        const inferredDayOrder = templateDayOrder.length > 0 ? templateDayOrder : scheduleDayOrder;

        split.orderedWorkoutLabels.forEach((label, order) => {
          const dayIdx = inferredDayOrder[order];
          if (dayIdx !== undefined) {
            split.workoutByDay.set(dayIdx, label);
          }
        });

        if (split.workoutByDay.size > 0) {
          console.log("[WeeklySplitDebug] Inferred workoutByDay from ordered labels:", Object.fromEntries(split.workoutByDay));
        }
      }

      console.log("[WeeklySplitDebug] Parsed workoutByDay:", Object.fromEntries(split.workoutByDay), "restDays:", [...split.restDays]);

      if (split.workoutByDay.size === 0 && split.restDays.size === 0) {
        console.warn("[WeeklySplitDebug] Could not parse any weekday mapping. Falling through to legacy logic.");
      } else {
        // Fill gaps: any weekday not explicitly mapped → treat as rest
        for (let i = 0; i < 7; i++) {
          const idx = i as DayIndex;
          if (!split.workoutByDay.has(idx) && !split.restDays.has(idx)) {
            split.restDays.add(idx);
          }
        }

        const workoutTemplates = plan.workout_plan.filter((entry) => entry.exercises.length > 0);
        const workoutTemplateByDay = new Map<DayIndex, DayPlan>();

        for (const template of workoutTemplates) {
          const idx = getDayIndexFromText(template.day);
          if (idx !== null && !workoutTemplateByDay.has(idx)) {
            workoutTemplateByDay.set(idx, template);
          }
        }

        const splitTrainingDays = Array.from(split.workoutByDay.keys()).sort((a, b) => a - b);
        const unmatchedTemplates = workoutTemplates.filter((template) => {
          const idx = getDayIndexFromText(template.day);
          return idx === null || !split.workoutByDay.has(idx);
        });

        for (const splitDayIdx of splitTrainingDays) {
          if (!workoutTemplateByDay.has(splitDayIdx)) {
            const nextTemplate = unmatchedTemplates.shift();
            if (nextTemplate) workoutTemplateByDay.set(splitDayIdx, nextTemplate);
          }
        }

        const days: DayPlan[] = [];

        for (let d = 0; d < 7; d++) {
          const dayDate = addDays(weekStartDate, d);
          const dayName = fnsFormat(dayDate, "EEEE", { locale: dateLocale });
          const dateStr = fnsFormat(dayDate, "yyyy-MM-dd");
          const dayIndex = getMondayBasedDayIndex(dayDate);

          const workoutLabel = split.workoutByDay.get(dayIndex);

          console.log("[WeeklySplitDebug]", {
            date: dateStr,
            resolvedWeekday: dayName,
            dayIndex,
            matchedSplitType: workoutLabel ? "workout" : "rest",
          });

          if (!workoutLabel) {
            const restLabel = lang === "id" ? "Istirahat" : lang === "zh" ? "休息日" : "Rest Day";
            days.push({
              day: `${prefixWeek} - ${dayName}, ${dateStr} (${restLabel})`,
              exercises: [],
            });
            continue;
          }

          const template = workoutTemplateByDay.get(dayIndex) ?? workoutTemplates[0];
          days.push({
            day: `${prefixWeek} - ${dayName}, ${dateStr} (${workoutLabel})`,
            exercises: template?.exercises ?? [],
          });
        }

        return days;
      }
    }

    // Legacy fallback for old plans without weeklySplit
    const days: DayPlan[] = [];
    const planStart = selectedWeek * trainingDaysPerWeek;
    const weekExercises = plan.workout_plan.slice(planStart, planStart + trainingDaysPerWeek);

    for (let d = 0; d < 7; d++) {
      const dayDate = addDays(weekStartDate, d);
      const dayName = fnsFormat(dayDate, "EEEE", { locale: dateLocale });
      const dateStr = fnsFormat(dayDate, "yyyy-MM-dd");
      const dayWorkout = weekExercises[d];

      if (dayWorkout) {
        const focusMatch = dayWorkout.day.match(/\(([^)]+)\)/);
        const focus = focusMatch ? ` (${focusMatch[1]})` : "";
        days.push({ ...dayWorkout, day: `${prefixWeek} - ${dayName}, ${dateStr}${focus}` });
      } else {
        const restLabel = lang === "id" ? "Istirahat" : lang === "zh" ? "休息日" : "Rest Day";
        days.push({ day: `${prefixWeek} - ${dayName}, ${dateStr} (${restLabel})`, exercises: [] });
      }
    }

    return days;
  }, [
    plan?.workout_plan,
    plan?.weeklySplit,
    selectedWeek,
    trainingDaysPerWeek,
    trainingStartDate,
    lang,
    t,
    dateLocale,
  ]);

  useEffect(() => {
    localStorage.setItem("suryaFitSelectedWeek", String(selectedWeek));
  }, [selectedWeek]);

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t.noPlanData}</p>
          <button onClick={() => navigate("/programs")} className="text-primary hover:underline">{t.goBackPrograms}</button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user) {
      toast({ title: t.signInToSave, description: t.signInToSaveDesc, variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (saving || saved) return; // prevent double saves
    setSaving(true);
    try {
      const planName = `${userInfo?.name || "User"} - ${(programType || "custom").charAt(0).toUpperCase() + (programType || "custom").slice(1)}`;
      const { data, error } = await supabase.from("saved_plans").insert({
        user_id: user.id,
        program_type: programType || "custom",
        user_info: userInfo as any,
        plan_data: plan as any,
        plan_name: planName,
        client_generated_id: clientGeneratedId,
      } as any).select("id").single();
      if (error) {
        // If conflict (duplicate), treat as success
        if (error.code === '23505') {
          setSaved(true);
          toast({ title: t.planSaved });
          localStorage.removeItem(DRAFT_KEY);
          return;
        }
        throw error;
      }
      setSaved(true);
      localStorage.removeItem(DRAFT_KEY);
      if (data) {
        setPlanId(data.id);
        navigate("/results", { state: { plan, userInfo, programType, planId: data.id }, replace: true });
      }
      toast({ title: t.planSaved });
    } catch (err: any) {
      console.error('Save plan error:', err);
      toast({ title: t.errorSaving, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const subtitle = userInfo?.name
    ? t.heyUser.replace("{name}", userInfo.name).replace("{type}", programType || "")
    : t.hereCustom.replace("{type}", programType || "");

  const waLink = "https://wa.me/6281802003107?text=Hello%20Coach%20Surya,%20I%20would%20like%20assistance%20with%20my%20Surya-FitAi%20training%20plan%20for%20safer%20and%20more%20effective%20results.";

  // Progress calculations
  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const firstWeight = sorted[0]?.weight;
  const lastWeight = sorted[sorted.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : 0;
  const trending = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  const heightCm = userInfo?.height ? parseInt(userInfo.height) : 170;
  const bmi = lastWeight ? (lastWeight / ((heightCm / 100) ** 2)).toFixed(1) : "—";
  const progressPercent = sorted.length >= 2 ? Math.min(100, Math.round((sorted.length / 12) * 100)) : 0;
  const chartData = sorted.map((c) => ({
    date: new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: c.weight,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div />
          <div className="flex items-center gap-2">
            <Button onClick={() => exportPlanToPDF(plan, programType, userInfo?.name)} variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-1" /> {t.exportPdf}
            </Button>
            <Button onClick={handleSave} disabled={saving || saved} variant={saved ? "secondary" : "default"} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {saved ? t.saved : t.savePlan}
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {t.yourPersonalized} <span className="text-gradient">{t.aiPlan}</span>
          </h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* Session Time Banner */}
        {plan.estimatedSessionTimeMinutes && (
          <div className="rounded-xl p-4 mb-8 bg-primary/10 border border-primary/30 flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary shrink-0" />
            <p className="text-foreground font-semibold text-sm md:text-base">
              ✅ {(t as any).sessionTimeBanner
                ? (t as any).sessionTimeBanner.replace("{minutes}", String(plan.estimatedSessionTimeMinutes))
                : `Session time matched: ${plan.estimatedSessionTimeMinutes} minutes (5 min warm-up + lifting + 5 min cool-down)`}
            </p>
          </div>
        )}

        {/* Program Overview */}
        {plan.programOverview && (
          <div className="neon-border rounded-lg p-4 mb-8 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-foreground text-sm italic">{plan.programOverview}</p>
          </div>
        )}

        {!plan.programOverview && plan.motivational_message && (
          <div className="neon-border rounded-lg p-4 mb-8 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-foreground text-sm italic">{plan.motivational_message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: t.dailyCalories, value: `${plan.calorie_target} kcal` },
            { icon: Dumbbell, label: t.protein, value: `${plan.protein}g` },
            { icon: Apple, label: t.carbsFat, value: `${plan.carbs}g / ${plan.fat}g` },
            { icon: Droplets, label: t.water, value: `${plan.water_liters}L / ${t.day}` },
          ].map((stat) => (
            <div key={stat.label} className="card-gradient rounded-lg p-4 border border-border/50 text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="workout" className="space-y-6">
          <TabsList className="bg-secondary w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="workout" className="whitespace-nowrap">{t.workoutPlan}</TabsTrigger>
            <TabsTrigger value="meals" className="whitespace-nowrap">{t.mealPlan}</TabsTrigger>
            <TabsTrigger value="grocery" className="whitespace-nowrap">{t.groceryList}</TabsTrigger>
            <TabsTrigger value="info" className="whitespace-nowrap">{t.infoSafety}</TabsTrigger>
            {planId && user && (
              <TabsTrigger value="progress" className="whitespace-nowrap">{t.progressTab}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="workout" className="space-y-4">
            {/* Week Selector */}
            {totalWeeks > 1 && (
              <div className="card-gradient rounded-lg p-4 border border-primary/30">
                <label className="text-sm font-medium text-foreground mb-2 block">{(t as any).selectWeekLabel}</label>
                <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(parseInt(v))}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Warm-Up */}
            {plan.warmUp && (
              <div className="card-gradient rounded-lg p-5 border border-primary/30">
                <h3 className="font-display font-bold text-primary mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> {(t as any).warmUpLabel || "Warm-Up"}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{plan.warmUp}</p>
              </div>
            )}

            {/* Weekly Split Overview */}
            {plan.weeklySplit && plan.weeklySplit.length > 0 && (
              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-3">{(t as any).weeklySplitLabel || "Weekly Split"}</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.weeklySplit.map((split, i) => (
                    <span key={i} className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-medium">{split}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Workout Days */}
            {planId && user ? (
              <WorkoutChecklist workoutPlan={weekWorkoutDays} planId={planId} selectedWeek={selectedWeek} />
            ) : (
              weekWorkoutDays.map((day, i) => {
                const isRestDay = day.exercises.length === 0;
                if (isRestDay) {
                  return (
                    <div key={i} className="card-gradient rounded-lg p-5 border border-border/50">
                      <h3 className="font-display font-bold text-foreground mb-3">{day.day}</h3>
                      <div className="flex items-center gap-3 bg-secondary/50 rounded-md px-4 py-4 text-sm">
                        <span className="text-2xl">😌</span>
                        <div>
                          <p className="text-foreground font-medium">{(t as any).restDayTitle || "Rest & Recovery"}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">{(t as any).restDayTip || "Focus on mobility, nutrition, or light walks today."}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className="card-gradient rounded-lg p-5 border border-border/50">
                    <h3 className="font-display font-bold text-foreground mb-3">{day.day}</h3>
                    <div className="space-y-2">
                      {day.exercises.map((ex, j) => (
                        <div key={j} className="bg-secondary/50 rounded-md px-4 py-3 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-foreground font-medium">{ex.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {ex.sets} × {ex.reps} · {ex.rest} {t.rest}
                              {ex.tempo && ` · ${(t as any).tempoLabel || "Tempo"}: ${ex.tempo}`}
                            </span>
                          </div>
                          {ex.cues && (
                            <p className="text-xs text-muted-foreground/80 italic">💡 {ex.cues}</p>
                          )}
                          {ex.alternative && (
                            <p className="text-xs text-muted-foreground/70">↔ {(t as any).alternativeLabel || "Alt"}: {ex.alternative}</p>
                          )}
                          {ex.weight_kg && (
                            <p className="text-xs text-primary/80">🏋️ {ex.weight_kg}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {/* Cool-Down */}
            {plan.coolDown && (
              <div className="card-gradient rounded-lg p-5 border border-primary/30">
                <h3 className="font-display font-bold text-primary mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> {(t as any).coolDownLabel || "Cool-Down"}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{plan.coolDown}</p>
              </div>
            )}

            {plan.estimated_calories_burned > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t.estimatedCalories.replace("{count}", String(plan.estimated_calories_burned))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meals" className="space-y-4">
            {plan.meal_plan?.map((meal, i) => (
              <div key={i} className="card-gradient rounded-lg p-5 border border-border/50">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-display font-bold text-foreground">{meal.meal}</h3>
                    {meal.time && <p className="text-xs text-muted-foreground">{meal.time}</p>}
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{meal.calories} kcal</span>
                </div>
                <ul className="space-y-1">
                  {meal.foods.map((f, j) => (
                    <li key={j} className="text-sm text-muted-foreground">• {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="grocery">
            <div className="card-gradient rounded-lg p-5 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h3 className="font-display font-bold text-foreground">{t.weeklyGrocery}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {plan.grocery_list?.map((item, i) => (
                  <div key={i} className="bg-secondary/50 rounded-md px-3 py-2 text-sm text-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            {/* Warnings */}
            {plan.warnings && plan.warnings.length > 0 && (
              <div className="card-gradient rounded-lg p-5 border border-destructive/30">
                <h3 className="font-display font-bold text-destructive mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> {(t as any).warningsLabel || "Warnings"}
                </h3>
                <ul className="space-y-2">
                  {plan.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive mt-0.5">⚠</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recovery Tips */}
            {plan.recoveryTips && (
              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" /> {(t as any).recoveryTipsLabel || "Recovery Tips"}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{plan.recoveryTips}</p>
              </div>
            )}

            {/* Deload Week */}
            {plan.deloadWeek && (
              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-2">{(t as any).deloadWeekLabel || "Deload Week"}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{plan.deloadWeek}</p>
              </div>
            )}

            {plan.weight_projection && (
              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-2">{t.progressProjection}</h3>
                <p className="text-sm text-muted-foreground">{plan.weight_projection}</p>
              </div>
            )}
            {plan.safety_notes?.length > 0 && (
              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-3">{t.safetyNotes}</h3>
                <ul className="space-y-2">
                  {plan.safety_notes.map((note, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">⚠</span> {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.weekly_schedule?.length > 0 && (
              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-3">{t.weeklySchedule}</h3>
                <div className="grid grid-cols-7 gap-2">
                  {plan.weekly_schedule.map((day, i) => (
                    <div key={i} className="bg-secondary/50 rounded-md p-2 text-center text-xs text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Progress Tab - only for saved plans */}
          {planId && user && (
            <TabsContent value="progress" className="space-y-6">
              <WorkoutProgressSummary planId={planId} />

              {/* Progression Rules */}
              {plan.progressionRules && (
                <div className="card-gradient rounded-lg p-5 border border-primary/30">
                  <h3 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> {(t as any).progressionRulesLabel || "Progression Rules"}
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{plan.progressionRules}</p>
                </div>
              )}

              {/* Duration */}
              {plan.durationWeeks && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {(t as any).programDuration || "Program Duration"}: <span className="font-bold text-foreground">{plan.durationWeeks} {(t as any).weeksLabel || "weeks"}</span>
                </div>
              )}

              {sorted.length >= 2 && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="card-gradient rounded-lg p-4 border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{t.start}</p>
                      <p className="text-lg font-bold text-foreground">{firstWeight} kg</p>
                    </div>
                    <div className="card-gradient rounded-lg p-4 border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{t.current}</p>
                      <p className="text-lg font-bold text-foreground">{lastWeight} kg</p>
                    </div>
                    <div className="card-gradient rounded-lg p-4 border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{t.change}</p>
                      <div className="flex items-center justify-center gap-1">
                        {trending === "down" ? <TrendingDown className="w-4 h-4 text-primary" /> : trending === "up" ? <TrendingUp className="w-4 h-4 text-destructive" /> : null}
                        <p className={`text-lg font-bold ${trending === "down" ? "text-primary" : trending === "up" ? "text-destructive" : "text-foreground"}`}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                        </p>
                      </div>
                    </div>
                  </div>
                  <ProgressDownloadCard
                    userName={userInfo?.name || user?.user_metadata?.display_name || user?.email || "User"}
                    programName={programType || "Fitness"}
                    duration={userInfo?.duration || "Ongoing"}
                    weight={lastWeight || 0}
                    bmi={bmi}
                    calorieTarget={plan.calorie_target || 2000}
                    progressPercent={progressPercent}
                    weeklyAdherence={Math.min(100, Math.round((sorted.length / 12) * 100))}
                  />
                </>
              )}

              {chartData.length >= 2 ? (
                <div className="card-gradient rounded-lg p-5 border border-border/50">
                  <h3 className="font-display font-bold text-foreground mb-4">{t.weightOverTime}</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(135, 100%, 60%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(135, 100%, 60%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                        <XAxis dataKey="date" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                        <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(0, 0%, 95%)" }} labelStyle={{ color: "hsl(135, 100%, 60%)" }} />
                        <Area type="monotone" dataKey="weight" stroke="hsl(135, 100%, 60%)" fill="url(#weightGradient)" strokeWidth={2} dot={{ fill: "hsl(135, 100%, 60%)", r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="card-gradient rounded-lg p-8 border border-border/50 text-center">
                  <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{t.logAtLeast2}</p>
                </div>
              )}

              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-4">{t.logCheckIn}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>{t.date}</Label>
                    <Input type="date" value={progressDate} onChange={(e) => setProgressDate(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.weightLabel}</Label>
                    <Input type="number" value={progressWeight} onChange={(e) => setProgressWeight(e.target.value)} placeholder="75" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.noteOptional}</Label>
                    <Input value={progressNote} onChange={(e) => setProgressNote(e.target.value)} placeholder={t.notePlaceholder} className="bg-secondary border-border" />
                  </div>
                </div>
                <Button onClick={addCheckIn} disabled={addingCheckIn} className="w-full sm:w-auto">
                  {addingCheckIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} {t.addCheckIn}
                </Button>
              </div>

              {sorted.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-foreground mb-3">{t.history}</h3>
                  {[...sorted].reverse().map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded-md px-4 py-3 text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{new Date(c.date).toLocaleDateString()}</span>
                        <span className="text-foreground font-medium">{c.weight} kg</span>
                        {c.note && <span className="text-muted-foreground italic">— {c.note}</span>}
                      </div>
                      <button onClick={() => removeCheckIn(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* WhatsApp CTA */}
        <div className="mt-10">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full rounded-xl px-6 py-4 font-bold text-white text-base shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle className="w-6 h-6" />
            {t.whatsappCta}
          </a>
        </div>
      </div>
    </div>
  );
}
