import { useState, useEffect } from "react";
import { Flame, Calendar, Trophy, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
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

export default function WorkoutProgressSummary() {
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
  }, [user]);

  const fetchData = async () => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);

    const { data } = await supabase
      .from("workout_checkins")
      .select("completed_date, exercise_name")
      .gte("completed_date", format(sevenDaysAgo, "yyyy-MM-dd"))
      .lte("completed_date", format(today, "yyyy-MM-dd"));

    if (data) {
      const countMap = new Map<string, number>();
      data.forEach((d) => {
        countMap.set(d.completed_date, (countMap.get(d.completed_date) || 0) + 1);
      });

      const days = eachDayOfInterval({ start: sevenDaysAgo, end: today });
      const chartData = days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return {
          date: format(d, "EEE"),
          count: countMap.get(key) || 0,
        };
      });
      setWeeklyData(chartData);

      const todayKey = format(today, "yyyy-MM-dd");
      setTodayCount(countMap.get(todayKey) || 0);
      setTotalCompleted(data.length);
    }

    const { data: allDates } = await supabase
      .from("workout_checkins")
      .select("completed_date")
      .order("completed_date", { ascending: false });

    if (allDates && allDates.length > 0) {
      const uniqueDates = [...new Set(allDates.map((d) => d.completed_date))].sort().reverse();
      let currentStreak = 0;
      let checkDate = startOfDay(new Date());

      for (const dateStr of uniqueDates) {
        const expected = format(checkDate, "yyyy-MM-dd");
        if (dateStr === expected) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
        } else if (dateStr < expected) {
          if (currentStreak === 0) {
            checkDate = subDays(checkDate, 1);
            const prevExpected = format(checkDate, "yyyy-MM-dd");
            if (dateStr === prevExpected) {
              currentStreak++;
              checkDate = subDays(checkDate, 1);
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }
      setStreak(currentStreak);
    }

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
            value: `${weeklyData.filter((d) => d.count > 0).length}/7`,
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
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(0, 0%, 95%)" }}
                labelStyle={{ color: "hsl(135, 100%, 60%)" }}
                formatter={(value: number) => [`${value} ${t.exercises}`, t.completed]}
              />
              <Bar dataKey="count" fill="hsl(135, 100%, 60%)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">{t.noCompletions}</p>
      )}
    </div>
  );
}
