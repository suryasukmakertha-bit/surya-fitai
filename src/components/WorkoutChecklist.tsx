import { useState, useEffect, useCallback, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tempo?: string;
  cues?: string;
  alternative?: string;
  weight_kg?: string;
  notes?: string;
}

interface DayPlan {
  day: string;
  exercises: Exercise[];
}

interface WorkoutChecklistProps {
  workoutPlan: DayPlan[];
  planId?: string;
  selectedWeek?: number;
}

interface CompletionState {
  [key: string]: boolean;
}

export default function WorkoutChecklist({ workoutPlan, planId, selectedWeek }: WorkoutChecklistProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [completionState, setCompletionState] = useState<CompletionState>({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Extract date from day label like "Week 1 - Friday, 2026-02-20" or fallback to today
  const extractDate = (dayLabel: string): string => {
    const match = dayLabel.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : format(new Date(), "yyyy-MM-dd");
  };

  const buildKey = (dayLabel: string, exerciseName: string) => `${dayLabel}::${exerciseName}`;

  const fetchWorkoutState = useCallback(async () => {
    if (!user || !planId) return;
    const { data, error } = await supabase
      .from("workout_completions")
      .select("exercise_id, day_label, completed")
      .eq("user_id", user.id)
      .eq("plan_id", planId);

    if (error) {
      console.error("Fetch workout state error:", error);
      return;
    }

    const state: CompletionState = {};
    data?.forEach((row) => {
      state[buildKey(row.day_label, row.exercise_id)] = row.completed;
    });
    setCompletionState(state);
    setLoading(false);
  }, [user, planId]);

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
    }
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
                      className={`flex items-center justify-between bg-secondary/50 rounded-md px-4 py-2.5 text-sm transition-opacity cursor-pointer hover:bg-secondary/70 ${isDone ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1" onClick={() => setSelectedExercise(ex)}>
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => handleToggle(day.day, ex.name)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`text-foreground font-medium truncate ${isDone ? "line-through" : ""}`}>
                          {ex.name}
                        </span>
                      </div>
                      <span
                        className="text-muted-foreground text-xs ml-2 shrink-0"
                        onClick={() => setSelectedExercise(ex)}
                      >
                        {ex.sets} × {ex.reps} · {ex.rest} {t.rest}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Exercise Detail Popup */}
      <Dialog open={!!selectedExercise} onOpenChange={(open) => !open && setSelectedExercise(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-2xl p-0 overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-xl font-display font-bold text-foreground pr-8">
                {selectedExercise?.name}
              </DialogTitle>
            </div>

            {/* Sets × Reps · Rest · Tempo */}
            <div className="bg-secondary/50 rounded-lg px-4 py-3">
              <p className="text-sm text-foreground font-medium">
                {selectedExercise?.sets} × {selectedExercise?.reps} · {selectedExercise?.rest} {t.rest}
                {selectedExercise?.tempo && ` · ${(t as any).tempoLabel}: ${selectedExercise.tempo}`}
              </p>
            </div>

            {/* Tips */}
            {selectedExercise?.cues && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">💡 {(t as any).tipsLabel}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedExercise.cues}</p>
              </div>
            )}

            {/* Alternative */}
            {selectedExercise?.alternative && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">↔ {(t as any).alternativeLabel}</p>
                <p className="text-sm text-muted-foreground">{selectedExercise.alternative}</p>
              </div>
            )}

            {/* Weight Recommendation */}
            {selectedExercise?.weight_kg && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">🏋️ {(t as any).weightRecommendation}</p>
                <p className="text-sm text-muted-foreground">{selectedExercise.weight_kg}</p>
              </div>
            )}

            {/* Notes */}
            {selectedExercise?.notes && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📝 {(t as any).notesLabel || "Notes"}</p>
                <p className="text-sm text-muted-foreground">{selectedExercise.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
