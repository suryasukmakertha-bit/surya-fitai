import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

interface DayPlan {
  day: string;
  exercises: Exercise[];
}

interface WorkoutChecklistProps {
  workoutPlan: DayPlan[];
  planId?: string;
}

export default function WorkoutChecklist({ workoutPlan, planId }: WorkoutChecklistProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user || !planId) return;
    fetchCheckins();
  }, [user, planId, today]);

  const fetchCheckins = async () => {
    const { data } = await supabase
      .from("workout_checkins")
      .select("exercise_name, day_label")
      .eq("plan_id", planId!)
      .eq("completed_date", today);
    if (data) {
      setCompleted(new Set(data.map((d) => `${d.day_label}::${d.exercise_name}`)));
    }
  };

  const toggle = async (dayLabel: string, exerciseName: string) => {
    if (!user || !planId) return;
    const key = `${dayLabel}::${exerciseName}`;
    const isCompleted = completed.has(key);

    if (isCompleted) {
      await supabase
        .from("workout_checkins")
        .delete()
        .eq("user_id", user.id)
        .eq("plan_id", planId)
        .eq("exercise_name", exerciseName)
        .eq("day_label", dayLabel)
        .eq("completed_date", today);
      setCompleted((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      await supabase.from("workout_checkins").insert({
        user_id: user.id,
        plan_id: planId,
        exercise_name: exerciseName,
        day_label: dayLabel,
        completed_date: today,
      });
      setCompleted((prev) => new Set(prev).add(key));
    }
  };

  const getDayProgress = (day: DayPlan) => {
    const total = day.exercises.length;
    const done = day.exercises.filter((ex) => completed.has(`${day.day}::${ex.name}`)).length;
    return { done, total };
  };

  if (!user || !planId) return null;

  return (
    <div className="space-y-4">
      {workoutPlan?.map((day, i) => {
        const { done, total } = getDayProgress(day);
        return (
          <div key={i} className="card-gradient rounded-lg p-5 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-foreground">{day.day}</h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {done}/{total} {t.done}
              </span>
            </div>
            <div className="space-y-2">
              {day.exercises.map((ex, j) => {
                const key = `${day.day}::${ex.name}`;
                const isDone = completed.has(key);
                return (
                  <label
                    key={j}
                    className={`flex items-center justify-between bg-secondary/50 rounded-md px-4 py-2.5 text-sm cursor-pointer transition-opacity ${isDone ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={() => toggle(day.day, ex.name)}
                      />
                      <span className={`text-foreground font-medium ${isDone ? "line-through" : ""}`}>
                        {ex.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground">{ex.sets} × {ex.reps} · {ex.rest} {t.rest}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
