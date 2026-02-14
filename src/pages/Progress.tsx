import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, TrendingDown, TrendingUp, Scale, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import WorkoutProgressSummary from "@/components/WorkoutProgressSummary";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
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
    const { data, error } = await supabase
      .from("progress_checkins")
      .select("id, date, weight, note")
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setCheckIns((prev) => [...prev, { ...data, weight: Number(data.weight) }]);
      setWeight("");
      setNote("");
      toast({ title: t.checkInLogged });
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

  const chartData = sorted.map((c) => ({
    date: new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: c.weight,
  }));

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>

        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {t.progressTracker} <span className="text-gradient">{t.tracker}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t.progressDesc}</p>

        <WorkoutProgressSummary />

        {sorted.length >= 2 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
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
        )}

        {chartData.length >= 2 && (
          <div className="card-gradient rounded-lg p-5 border border-border/50 mb-8">
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
        )}

        {chartData.length < 2 && (
          <div className="card-gradient rounded-lg p-8 border border-border/50 mb-8 text-center">
            <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t.logAtLeast2}</p>
          </div>
        )}

        <div className="card-gradient rounded-lg p-5 border border-border/50 mb-8">
          <h3 className="font-display font-bold text-foreground mb-4">{t.logCheckIn}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>{t.date}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border" />
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
      </div>
    </div>
  );
}
