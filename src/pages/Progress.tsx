import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, TrendingDown, TrendingUp, Scale, Loader2, Activity, SlidersHorizontal, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format as fnsFormat } from "date-fns";
import { ResponsiveContainer, Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { checkCheckinMedals } from "@/lib/dailyChallenge";
import { emitMedalsEarned } from "@/lib/medalEvents";
import WorkoutProgressSummary from "@/components/WorkoutProgressSummary";
import ProgressDownloadCard from "@/components/ProgressDownloadCard";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";

interface CheckIn {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

export default function Progress() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  });
  const [loadingData, setLoadingData] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchCheckIns();
  }, [user]);

  const fetchCheckIns = async () => {
    // Fetch all check-ins for the user (Progress page is a global overview)
    const { data, error } = await supabase
      .from("progress_checkins")
      .select("id, date, weight, note, plan_id")
      .order("date", { ascending: true });
    if (!error && data) {
      setCheckIns(data.map((d) => ({ ...d, weight: Number(d.weight) })));
    }
    setLoadingData(false);
  };

  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));

  const addCheckIn = async () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 500) {
      toast({ title: t.validWeight, variant: "destructive" });
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("progress_checkins")
      .insert({ user_id: user!.id, date, weight: w, note: note.trim() || null })
      .select("id, date, weight, note")
      .single();
    if (error) {
      console.error('Check-in error:', error);
      toast({ title: t.errorSaving || "Error", variant: "destructive" });
    } else if (data) {
      setCheckIns((prev) => [...prev, { ...data, weight: Number(data.weight) }]);
      setWeight("");
      setNote("");
      toast({ title: t.checkInLogged });
      try {
        const medals = await checkCheckinMedals(user!.id, w, null);
        emitMedalsEarned(medals);
      } catch {}
    }
    setAdding(false);
  };

  const removeCheckIn = async (id: string) => {
    await supabase.from("progress_checkins").delete().eq("id", id);
    setCheckIns((prev) => prev.filter((c) => c.id !== id));
  };

  const firstWeight = sorted[0]?.weight;
  const lastWeight = sorted[sorted.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : 0;
  const trending = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";

  const heightCm = 170;
  const bmi = lastWeight ? (lastWeight / ((heightCm / 100) ** 2)).toFixed(1) : "—";
  const progressPercent = sorted.length >= 2 ? Math.min(100, Math.round((sorted.length / 12) * 100)) : 0;

  const eightWeeksAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 56);
    return d.toISOString().slice(0, 10);
  })();
  const recentSorted = sorted.filter((c) => c.date >= eightWeeksAgo);
  const chartSource = recentSorted.length >= 2 ? recentSorted : sorted;
  const chartData = chartSource.map((c) => ({
    date: new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: c.weight,
  }));

  const WeightTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs text-white"
        style={{
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,107,0,0.3)",
        }}
      >
        <span className="font-semibold">{label}</span>
        <span className="opacity-70"> — </span>
        <span style={{ color: "#ff6b00" }}>{payload[0].value} kg</span>
      </div>
    );
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {t.progressTracker} <span className="text-gradient">{t.tracker}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t.progressDesc}</p>

        <WorkoutProgressSummary />

        {sorted.length >= 2 && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
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
            <div className="mb-8">
              <ProgressDownloadCard
                userName={user?.user_metadata?.display_name || user?.email || "User"}
                programName="Fitness"
                duration="Ongoing"
                weight={lastWeight || 0}
                bmi={bmi}
                calorieTarget={2000}
                progressPercent={progressPercent}
              />
            </div>
          </>
        )}

        {chartData.length >= 2 && (
          <div className="card-gradient rounded-lg p-5 border border-border/50 mb-8">
            <h3 className="font-display font-bold text-foreground mb-1">{t.weightOverTime}</h3>
            <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mb-3">
              <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-primary text-xs">{(t as any).coachWeightChartSub}</p>
            </div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b00" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ff6b00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--foreground))", fillOpacity: 0.5, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: "hsl(var(--foreground))", fillOpacity: 0.5, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<WeightTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#ff6b00"
                    fill="url(#weightGradient)"
                    strokeWidth={2}
                    dot={{ fill: "#ff6b00", stroke: "#ff6b00", r: 4 }}
                    activeDot={{ fill: "#ff6b00", stroke: "#ff6b00", r: 6, style: { filter: "drop-shadow(0 0 4px #ff6b00)" } }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartData.length < 2 && (
          <div className="card-gradient rounded-lg p-8 border border-border/50 mb-8 text-center">
            <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{(t as any).weightChartNotEnoughData}</p>
          </div>
        )}

        <div className="card-gradient rounded-lg p-5 border border-border/50 mb-8">
          <h3 className="font-display font-bold text-foreground mb-1">{t.logCheckIn}</h3>
          <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-primary text-xs">{(t as any).coachCheckInSub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>{t.date}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal bg-secondary border-border", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? fnsFormat(new Date(date + "T00:00:00"), "dd/MM/yyyy") : (t as any).pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date + "T00:00:00") : undefined}
                    onSelect={(d) => d && setDate(fnsFormat(d, "yyyy-MM-dd"))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t.weightLabel}</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75" className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>{t.noteOptional}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} className="bg-secondary border-border" />
            </div>
          </div>
          <Button onClick={addCheckIn} disabled={adding} className="w-full sm:w-auto">
            {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} {t.addCheckIn}
          </Button>
        </div>

        {sorted.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-display font-bold text-foreground mb-1">{t.history}</h3>
            <p className="text-muted-foreground text-xs mb-3">{(t as any).coachHistorySub}</p>
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
      </div>
    </div>
  );
}
