import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { playWorkoutComplete } from "@/utils/sounds";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, resolveExerciseKeyToEnglish } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Moon, Zap, Lightbulb, ArrowLeftRight, Dumbbell, StickyNote, ChevronRight } from "lucide-react";
import DailyProgressImage from "@/components/DailyProgressImage";
import ExerciseGifPlayer from "@/components/ExerciseGifPlayer";
import DailyCelebrationPopup from "@/components/DailyCelebrationPopup";
import { usePreloadExerciseMedia } from "@/hooks/usePreloadExerciseMedia";
import { checkWorkoutStreakMedals, checkProgramCompleteMedal } from "@/lib/dailyChallenge";
import { emitMedalsEarned } from "@/lib/medalEvents";
import { getPlanProgress } from "@/lib/planProgress";
import { syncLongestStreak } from "@/lib/longestStreak";

function getRIRText(rir: number | string | undefined, tempo: string | undefined, lang: string): string | null {
  let n: number | null = null;
  if (rir !== undefined && rir !== null && rir !== '') {
    const parsed = typeof rir === 'number' ? rir : parseInt(String(rir), 10);
    if (Number.isFinite(parsed) && parsed >= 0) n = parsed;
  }
  if (n === null && tempo) {
    const match = tempo.match(/(\d)/);
    if (match) n = parseInt(match[1], 10);
  }
  if (n === null) return null;
  if (n <= 0) {
    if (lang === 'id') return 'Sampai gagal (failure)';
    if (lang === 'zh') return '力竭为止';
    return 'To failure';
  }
  if (lang === 'id') return `Berhenti saat tersisa ~${n} rep`;
  if (lang === 'zh') return `还剩约${n}次时停止`;
  return `Stop with ~${n} reps left`;
}

function isBodyweight(weight?: string, intensity?: string): boolean {
  const s = `${weight || ''} ${intensity || ''}`.toLowerCase();
  return /bodyweight|berat\s*badan|自重/.test(s);
}

function bodyweightLabel(lang: string): string {
  if (lang === 'id') return 'Berat Badan';
  if (lang === 'zh') return '自重';
  return 'Bodyweight';
}

function derivePctFromReps(reps?: string): string | null {
  if (!reps) return null;
  const nums = reps.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const lo = parseInt(nums[0], 10);
  const hi = nums[1] ? parseInt(nums[1], 10) : lo;
  const mid = (lo + hi) / 2;
  let pct: number;
  if (mid <= 6) pct = 86;
  else if (mid <= 8) pct = 82;
  else if (mid <= 10) pct = 77;
  else if (mid <= 12) pct = 72;
  else if (mid <= 15) pct = 67;
  else pct = 62;
  return `~${pct}%`;
}

function formatWeightLine(weight: string, intensity: string | undefined, reps: string | undefined, lang: string): string {
  if (isBodyweight(weight, intensity)) return bodyweightLabel(lang);
  const pct = (intensity && intensity.trim()) || derivePctFromReps(reps) || '';
  if (lang === 'id') {
    return pct
      ? `${weight} (${pct} dari 1RM kamu — beban maksimal yang bisa diangkat 1 kali dengan form sempurna)`
      : `${weight}`;
  }
  if (lang === 'zh') {
    return pct
      ? `${weight}（约为你1RM的${pct.replace('~','')} — 用完美姿势能举起一次的最大重量）`
      : `${weight}`;
  }
  return pct
    ? `${weight} (${pct} of your 1RM — the max you can lift once with perfect form)`
    : `${weight}`;
}

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tempo?: string;
  cues?: string;
  alternative?: string;
  weight_kg?: string;
  intensity_pct?: string;
  notes?: string;
  rir?: number | string;
}

interface DayPlan {
  day: string;
  exercises: Exercise[];
}

interface WorkoutChecklistProps {
  workoutPlan: DayPlan[];
  planId?: string;
  selectedWeek?: number;
  /** When set, only completions with completed_at >= planStartedAt count as "done"
   *  in the UI. Older history rows remain in the DB but are filtered out. */
  planStartedAt?: string | null;
  planMonthNumber?: number;
}

interface CompletionState {
  [key: string]: boolean;
}

export default function WorkoutChecklist({ workoutPlan, planId, selectedWeek, planStartedAt, planMonthNumber }: WorkoutChecklistProps) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [completionState, setCompletionState] = useState<CompletionState>({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [celebration, setCelebration] = useState<{
    dayLabel: string;
    exercises: Exercise[];
    completedExercises: string[];
    totalExercises: number;
    dayNumber: number;
  } | null>(null);

  // Preload all exercise demo images in background
  const allExerciseNames = useMemo(() => {
    return workoutPlan?.flatMap(day => day.exercises.map(ex => ex.name)) || [];
  }, [workoutPlan]);
  usePreloadExerciseMedia(allExerciseNames);

  // Extract date from day label like "Week 1 - Friday, 2026-02-20" or fallback to today
  const extractDate = (dayLabel: string): string => {
    const match = dayLabel.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : format(new Date(), "yyyy-MM-dd");
  };

  // Use date-based key for locale-independent persistence
  const buildKey = (dayLabel: string, exerciseName: string) => {
    const date = extractDate(dayLabel);
    return `${date}::${exerciseName}`;
  };

  // Build key from DB row (uses workout_date directly)
  const buildDbKey = (workoutDate: string, exerciseId: string) => `${workoutDate}::${exerciseId}`;

  const fetchWorkoutState = useCallback(async () => {
    if (!user || !planId) return;
    const { data, error } = await supabase
      .from("workout_completions")
      .select("exercise_id, day_label, workout_date, completed, completed_at")
      .eq("user_id", user.id)
      .eq("plan_id", planId);

    if (error) {
      console.error("Fetch workout state error:", error);
      return;
    }

    const state: CompletionState = {};
    data?.forEach((row) => {
      state[buildDbKey(row.workout_date, row.exercise_id)] = row.completed;
    });
    setCompletionState(state);
    setLoading(false);
  }, [user, planId, planStartedAt]);

  useEffect(() => {
    if (!user || !planId) return;
    fetchWorkoutState();
  }, [fetchWorkoutState]);

  useEffect(() => {
    if (!user || !planId) return;

    const channel = supabase
      .channel(`workout-sync-${planId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_completions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchWorkoutState();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, planId, fetchWorkoutState]);

  const handleToggle = async (dayLabel: string, exerciseName: string) => {
    if (!user || !planId) return;
    const key = buildKey(dayLabel, exerciseName);
    const workoutDate = extractDate(dayLabel);
    const previousState = completionState[key] || false;
    const newState = !previousState;

    setCompletionState((prev) => ({ ...prev, [key]: newState }));

    const { error } = await supabase
      .from("workout_completions")
      .upsert(
        {
          user_id: user.id,
          plan_id: planId,
          workout_date: workoutDate,
          exercise_id: exerciseName,
          day_label: dayLabel,
          completed: newState,
          completed_at: newState ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,plan_id,workout_date,exercise_id,day_label" }
      );

    if (error) {
      setCompletionState((prev) => ({ ...prev, [key]: previousState }));
      console.error("Toggle error:", error);
      toast({ title: t.failedToSave, variant: "destructive" });
    } else if (newState) {
      // Check if all exercises for this day are now complete
      const dayPlan = workoutPlan?.find((d) => d.day === dayLabel);
      if (dayPlan && dayPlan.exercises.length > 0) {
        const updatedState = { ...completionState, [key]: newState };
        const allDone = dayPlan.exercises.every(
          (ex) => updatedState[buildKey(dayLabel, ex.name)] === true
        );
        if (allDone) playWorkoutComplete();
        if (allDone) {
          const dateKey = workoutDate;
          const storageKey = `celebrationShown_${planId}_${dateKey}`;
          if (typeof window !== "undefined" && !window.localStorage.getItem(storageKey)) {
            window.localStorage.setItem(storageKey, "1");
            const dayIndex = workoutPlan?.findIndex((d) => d.day === dayLabel) ?? -1;
            setCelebration({
              dayLabel,
              exercises: dayPlan.exercises,
              completedExercises: dayPlan.exercises
                .filter((ex) => updatedState[buildKey(dayLabel, ex.name)] === true)
                .map((ex) => ex.name),
              totalExercises: dayPlan.exercises.length,
              dayNumber: dayIndex >= 0 ? dayIndex + 1 : 1,
            });
          }
        }
      }
      // Award streak / program-complete medals (silent if already owned)
      try {
        const streakMedals = await checkWorkoutStreakMedals(user.id);
        emitMedalsEarned(streakMedals);
        if (planId) {
          const p = await getPlanProgress(user.id, { id: planId, plan_data: { workout_plan: workoutPlan } });
          const programMedals = await checkProgramCompleteMedal(user.id, p.completedDays, p.totalDays);
          emitMedalsEarned(programMedals);
        }
      } catch (e) { /* swallow */ }
      // Bump the historical-best streak server-side whenever a workout day is
      // checked off. Server validates and only raises profiles.longest_streak;
      // client cannot supply a value. Trigger lives here (not on page load)
      // so the stored value always reflects the highest streak achieved.
      try { await syncLongestStreak(user.id); } catch { /* swallow */ }
    }
    // Recompute profile-wide totals (total_workouts, active_days) server-side
    // on every toggle (on or off) so the counters always match
    // workout_completions across ALL plans, ALL time.
    try { await (supabase as any).rpc("sync_workout_counters"); } catch { /* swallow */ }
  };

  const getDayProgress = (day: DayPlan) => {
    const total = day.exercises.length;
    const done = day.exercises.filter(
      (ex) => completionState[buildKey(day.day, ex.name)] === true
    ).length;
    return { done, total };
  };

  if (!user || !planId) return null;
  if (loading) {
    return (
      <div className="space-y-4">
        {workoutPlan?.map((_, i) => (
          <div key={i} className="card-gradient rounded-lg p-5 border border-border/50 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {workoutPlan?.map((day, i) => {
          const isRestDay = day.exercises.length === 0;

          if (isRestDay) {
            return (
              <div key={`day-${day.day}-${i}`} className="card-gradient rounded-lg p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-foreground">{day.day}</h3>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: "rgba(255,107,0,0.12)" }} aria-label="Rest day">
                    <Moon className="w-3.5 h-3.5" style={{ color: "#ff6b00" }} />
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-secondary/50 rounded-md px-4 py-4 text-sm">
                  <Moon className="w-8 h-8 shrink-0" style={{ color: "#ff6b00" }} aria-hidden />
                  <div>
                    <p className="text-foreground font-medium">{(t as any).restDayTitle || "Rest & Recovery"}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{(t as any).restDayTip || "Focus on mobility, nutrition, or light walks today."}</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">{(t as any).coachRestTip}</p>
                  </div>
                </div>
              </div>
            );
          }

          const { done, total } = getDayProgress(day);
          return (
            <div key={`day-${day.day}-${i}`} className="card-gradient rounded-lg p-5 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-foreground">{day.day}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {done}/{total} {t.done}
                </span>
              </div>
              <div className="mb-3">
                <Progress value={total > 0 ? (done / total) * 100 : 0} className="h-2" />
                <p className="text-[11px] text-muted-foreground mt-1 text-right">
                  {total > 0 ? Math.round((done / total) * 100) : 0}% {t.completed}
                </p>
              </div>
              <div className="space-y-2">
                {day.exercises.map((ex) => {
                  const key = buildKey(day.day, ex.name);
                  const isDone = completionState[key] === true;
                  return (
                    <div
                      key={`${day.day}-${ex.name}`}
                      className={`flex items-center justify-between bg-secondary/50 rounded-md px-4 py-2.5 text-sm transition-opacity cursor-pointer hover:bg-secondary/70 border-l-2 ${isDone ? "opacity-60" : ""}`}
                      style={{ borderLeftColor: "#FF6A00", boxShadow: "inset 1px 0 0 rgba(255,106,0,0.15)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1" onClick={() => setSelectedExercise(ex)}>
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => handleToggle(day.day, ex.name)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`text-foreground font-medium ${isDone ? "line-through" : ""}`}>
                          {ex.name}
                        </span>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 ml-2 shrink-0"
                        style={{ color: "#FF6A00" }}
                        onClick={() => setSelectedExercise(ex)}
                      />
                    </div>
                  );
                })}
              </div>
              {done === total && total > 0 && (
                <p className="text-primary text-xs text-center mt-3 mb-1 inline-flex items-center justify-center gap-1.5 w-full">
                  <Zap className="w-4 h-4" style={{ color: "#ff6b00" }} aria-hidden />
                  <span>{((t as any).coachCompletedDay || "").replace(/[💪😌🌿]/g, "").trim()}</span>
                </p>
              )}
              <DailyProgressImage
                dayLabel={day.day}
                exercises={day.exercises}
                completedExercises={day.exercises
                  .filter((ex) => completionState[buildKey(day.day, ex.name)] === true)
                  .map((ex) => ex.name)}
                totalExercises={day.exercises.length}
                planMonthNumber={planMonthNumber}
              />
            </div>
          );
        })}
      </div>

      {/* Exercise Detail Popup */}
      <Dialog open={!!selectedExercise} onOpenChange={(open) => !open && setSelectedExercise(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto" aria-describedby="exercise-detail-desc">
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-xl font-display font-bold text-foreground pr-8">
                {selectedExercise?.name}
              </DialogTitle>
            </div>
            <DialogDescription id="exercise-detail-desc" className="sr-only">Exercise technique details</DialogDescription>

            {/* Exercise GIF Demo */}
            {selectedExercise && (
              <ExerciseGifPlayer exerciseName={selectedExercise.name} />
            )}

            {/* Sets × Reps • Rest • RIR */}
            <div className="bg-secondary/50 rounded-lg px-4 py-3">
              <p className="text-sm text-foreground font-medium">
                {selectedExercise?.sets} × {selectedExercise?.reps} • {t.rest.charAt(0).toUpperCase() + t.rest.slice(1)} {selectedExercise?.rest}
                {getRIRText(selectedExercise?.rir, selectedExercise?.tempo, lang) ? ` • ${getRIRText(selectedExercise?.rir, selectedExercise?.tempo, lang)}` : ''}
              </p>
            </div>

            {/* Tips */}
            {selectedExercise?.cues && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide inline-flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> {(t as any).tipsLabel}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedExercise.cues}</p>
              </div>
            )}

            {/* Alternative */}
            {selectedExercise?.alternative && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide inline-flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5" /> {(t as any).alternativeLabel}
                </p>
                <p className="text-sm text-muted-foreground">{selectedExercise.alternative}</p>
              </div>
            )}

            {/* Weight Recommendation */}
            {selectedExercise?.weight_kg && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide inline-flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5" /> {(t as any).weightRecommendation}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatWeightLine(selectedExercise.weight_kg, selectedExercise.intensity_pct, selectedExercise.reps, lang)}
                </p>
              </div>
            )}

            {/* Notes */}
            {selectedExercise?.notes && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" /> {(t as any).notesLabel || "Notes"}
                </p>
                <p className="text-sm text-muted-foreground">{selectedExercise.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {celebration && (
        <DailyCelebrationPopup
          open={!!celebration}
          onClose={() => setCelebration(null)}
          dayLabel={celebration.dayLabel}
          exercises={celebration.exercises}
          completedExercises={celebration.completedExercises}
          totalExercises={celebration.totalExercises}
          planMonthNumber={planMonthNumber}
          dayNumber={celebration.dayNumber}
        />
      )}
    </>
  );
}
