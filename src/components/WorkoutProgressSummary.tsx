import { useState, useEffect } from "react";
import { Flame, Calendar, Trophy, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, subDays, eachDayOfInterval } from "date-fns";
import {
  computeCurrentStreak,
  computeForwardStreak,
  computeForwardStreakByOffsets,
  getRestDayIndices,
  getRestOffsetsFromPlan,
} from "@/lib/streak";
import { getTodayLocal, fmtLocal } from "@/lib/dateLocal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
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
  const [activeDaysCount, setActiveDaysCount] = useState(0);
  const [activeDaysOf, setActiveDaysOf] = useState(7);
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
      // Authoritative rest pattern comes from the plan's workout_plan template
      // (positional, indexed from plan_started_at). Falls back to weekday-name
      // parsing only if no workout_plan is present.
      const restOffsets = getRestOffsetsFromPlan(planData);
      const restDays = getRestDayIndices(planData);
      if (planStartedAt && restOffsets.size > 0) {
        setStreak(computeForwardStreakByOffsets(dates, restOffsets, planStartedAt));
      } else if (planStartedAt) {
        setStreak(computeForwardStreak(dates, restDays, planStartedAt));
      } else {
        setStreak(computeCurrentStreak(dates, restDays));
      }
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
  const todayLabel = format(new Date(), "EEE");
  const GlassTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        style={{
          background: "rgba(10,10,18,0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,94,26,0.3)",
          borderRadius: 10,
          padding: "6px 10px",
          color: "#fff",
          fontSize: 12,
          lineHeight: 1.3,
        }}
      >
        <div style={{ opacity: 0.6, fontSize: 10 }}>{label}</div>
        <div style={{ fontWeight: 700 }}>
          {payload[0].value} {t.exercises}
        </div>
      </div>
    );
  };

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
              <defs>
                <linearGradient id="wpsBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5E1A" stopOpacity={1} />
                  <stop offset="100%" stopColor="#FF5E1A" stopOpacity={0.2} />
                </linearGradient>
                <filter id="wpsBarGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FF5E1A" floodOpacity="0.8" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(255,94,26,0.08)" }} content={<GlassTooltip />} />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
                animationBegin={0}
                background={{ fill: "rgba(255,255,255,0.05)", radius: 4 } as any}
              >
                {weeklyData.map((d, i) => (
                  <Cell
                    key={i}
                    fill="url(#wpsBarGrad)"
                    style={d.date === todayLabel ? { filter: "url(#wpsBarGlow)" } : undefined}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">{t.noCompletions}</p>
      )}
    </div>
  );
}
