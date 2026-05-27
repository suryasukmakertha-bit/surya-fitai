import { useState, useEffect } from "react";
import { Flame, Calendar, Trophy, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { computeCurrentStreak, getRestDayIndices } from "@/lib/streak";
import { getTodayLocal, fmtLocal } from "@/lib/dateLocal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DailyCount {
  date: string;
  count: number;
}

interface WorkoutProgressSummaryProps {
  planId?: string;
}

export default function WorkoutProgressSummary({ planId }: WorkoutProgressSummaryProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<DailyCount[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, planId]);

  const fetchData = async () => {
    // Today / chart window are computed in the user's LOCAL timezone — never UTC.
    const todayKey = getTodayLocal();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = subDays(today, 6);

    const sb = supabase as any;

    // Per-plan: fetch plan_data + plan_started_at so "This Week" / "Active Days"
    // / streak are all scoped correctly to the active plan's lifecycle.
    let planData: any = null;
    let planStartedAt: string | null = null;
    if (planId) {
      const { data: planRow } = await sb
        .from("saved_plans")
        .select("plan_data, plan_started_at")
        .eq("id", planId)
        .maybeSingle();
      planData = (planRow as any)?.plan_data || null;
      planStartedAt = (planRow as any)?.plan_started_at || null;
    }

    // 1) Last-7-days chart + today's count (local-day buckets).
    let chartQuery = supabase
      .from("workout_completions")
      .select("workout_date, exercise_id")
      .eq("completed", true)
      .gte("workout_date", fmtLocal(sevenDaysAgo))
      .lte("workout_date", todayKey);
    if (planId) chartQuery = chartQuery.eq("plan_id", planId);
    const { data: chartRows } = await chartQuery;

    const countMap = new Map<string, number>();
    (chartRows || []).forEach((d: any) => {
      countMap.set(d.workout_date, (countMap.get(d.workout_date) || 0) + 1);
    });
    const days = eachDayOfInterval({ start: sevenDaysAgo, end: today });
    setWeeklyData(days.map((d) => ({
      date: format(d, "EEE"),
      count: countMap.get(fmtLocal(d)) || 0,
    })));
    setTodayCount(countMap.get(todayKey) || 0);

    // 2) "This Week" → ALL completions for the active plan since plan_started_at
    //    (not calendar week). Falls back to last-7-day count when no plan.
    if (planId && planStartedAt) {
      const startKey = planStartedAt.slice(0, 10);
      const { data: planAll } = await sb
        .from("workout_completions")
        .select("workout_date", { count: "exact", head: false })
        .eq("user_id", user!.id)
        .eq("plan_id", planId)
        .eq("completed", true)
        .gte("workout_date", startKey)
        .lte("workout_date", todayKey)
        .limit(5000);
      setTotalCompleted((planAll || []).length);
    } else {
      setTotalCompleted((chartRows || []).length);
    }

    // 3) Streak = CURRENT streak for the active plan, respecting its rest days.
    if (user && planId) {
      const { data: planCompletions } = await sb
        .from("workout_completions")
        .select("workout_date")
        .eq("user_id", user.id)
        .eq("plan_id", planId)
        .eq("completed", true)
        .limit(2000);
      const dates = new Set<string>((planCompletions || []).map((r: any) => r.workout_date));
      const restDays = getRestDayIndices(planData);
      setStreak(computeCurrentStreak(dates, restDays));
    } else {
      setStreak(0);
    }

    // 4) "Active Days X/7" → distinct workout dates in the CURRENT plan week
    //    (resets at the start of each plan week). Falls back to last-7-day
    //    active-day count when no plan_started_at is available.
    let activeDays = 0;
    let weekSlots = 7;
    if (planId && planStartedAt) {
      const start = new Date(planStartedAt);
      start.setHours(0, 0, 0, 0);
      const msPerDay = 86_400_000;
      const daysSinceStart = Math.max(0, Math.floor((today.getTime() - start.getTime()) / msPerDay));
      const weekIdx = Math.floor(daysSinceStart / 7);
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + weekIdx * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const { data: weekRows } = await sb
        .from("workout_completions")
        .select("workout_date")
        .eq("user_id", user!.id)
        .eq("plan_id", planId)
        .eq("completed", true)
        .gte("workout_date", fmtLocal(weekStart))
        .lte("workout_date", fmtLocal(weekEnd))
        .limit(2000);
      activeDays = new Set<string>((weekRows || []).map((r: any) => r.workout_date)).size;
    } else {
      activeDays = days.filter((d) => (countMap.get(fmtLocal(d)) || 0) > 0).length;
    }
    setActiveDaysCount(activeDays);
    setActiveDaysOf(weekSlots);

    setLoading(false);
  };

  if (!user || loading) return null;

  const hasData = totalCompleted > 0;

  return (
    <div className="card-gradient rounded-lg p-5 border border-border/50 mb-8">
      <h3 className="font-display font-bold text-foreground mb-4">{t.workoutActivity}</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Flame, label: t.today, value: `${todayCount} ${t.exercises}` },
          { icon: Trophy, label: t.streak, value: `${streak} ${streak !== 1 ? t.days : t.day}` },
          { icon: Target, label: t.thisWeek, value: `${totalCompleted} ${t.total}` },
          {
            icon: Calendar,
            label: t.activeDays,
            value: `${activeDaysCount}/${activeDaysOf}`,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-secondary/50 rounded-lg p-3 text-center">
            <stat.icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="text-sm font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {hasData ? (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#555555", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#555555", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,61,127,0.10)" }}
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#ffffff" }}
                labelStyle={{ color: "#ffffff" }}
                itemStyle={{ color: "#ff6b00" }}
                formatter={(value: number) => [`${value} ${t.exercises}`, t.completed]}
              />
              <Bar dataKey="count" fill="#ff6b00" radius={[4, 4, 0, 0]} fillOpacity={0.95} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">{t.noCompletions}</p>
      )}
    </div>
  );
}
