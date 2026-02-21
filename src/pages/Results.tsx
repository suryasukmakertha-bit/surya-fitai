import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Flame, Droplets, Dumbbell, Apple, ShoppingCart, TrendingUp, TrendingDown, Sparkles, Save, Loader2, Download, MessageCircle, Scale, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface DayPlan {
  day: string;
  exercises: { name: string; sets: string; reps: string; rest: string }[];
}

interface MealPlan {
  meal: string;
  foods: string[];
  calories: number;
}

interface PlanData {
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

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const plan: PlanData | undefined = location.state?.plan;
  const userInfo = location.state?.userInfo;
  const programType = location.state?.programType;
  const planId: string | undefined = location.state?.planId;

  // Progress state (only for saved plans)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [progressWeight, setProgressWeight] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressDate, setProgressDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addingCheckIn, setAddingCheckIn] = useState(false);

  useEffect(() => {
    setCheckIns([]); // Reset on plan switch
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
    setSaving(true);
    try {
      const { data, error } = await supabase.from("saved_plans").insert({
        user_id: user.id,
        program_type: programType || "custom",
        user_info: userInfo as any,
        plan_data: plan as any,
      }).select("id").single();
      if (error) throw error;
      setSaved(true);
      if (data) {
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

        {plan.motivational_message && (
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
            {planId && user ? (
              <WorkoutChecklist workoutPlan={plan.workout_plan} planId={planId} />
            ) : (
              plan.workout_plan?.map((day, i) => (
                <div key={i} className="card-gradient rounded-lg p-5 border border-border/50">
                  <h3 className="font-display font-bold text-foreground mb-3">{day.day}</h3>
                  <div className="space-y-2">
                    {day.exercises.map((ex, j) => (
                      <div key={j} className="flex items-center justify-between bg-secondary/50 rounded-md px-4 py-2.5 text-sm">
                        <span className="text-foreground font-medium">{ex.name}</span>
                        <span className="text-muted-foreground">{ex.sets} × {ex.reps} · {ex.rest} {t.rest}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
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
                  <h3 className="font-display font-bold text-foreground">{meal.meal}</h3>
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
                    userName={user?.user_metadata?.display_name || user?.email || "User"}
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
