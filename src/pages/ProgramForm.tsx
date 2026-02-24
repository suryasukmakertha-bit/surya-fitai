import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, CalendarIcon, HelpCircle, Activity, Flame, Beef, Wheat, Droplet } from "lucide-react";
import { programs } from "@/components/ProgramCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { computeAll } from "@/lib/fitnessCalculations";

const EQUIPMENT_OPTIONS = [
  { value: "bodyweight", labelKey: "equipBodyweight" },
  { value: "dumbbell", labelKey: "equipDumbbell" },
  { value: "full-gym", labelKey: "equipFullGym" },
  { value: "home-barbell", labelKey: "equipHomeBarbell" },
  { value: "resistance-bands", labelKey: "equipBands" },
  { value: "none", labelKey: "equipNone" },
] as const;

function WhyTooltip({ text }: { text: string }) {
  const { t } = useLanguage();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center align-middle ml-1 focus:outline-none" aria-label="Why we ask this">
          <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="max-w-[280px] rounded-xl border border-primary/30 bg-card p-4 shadow-lg shadow-primary/10"
      >
        <p className="text-xs font-semibold text-primary mb-1.5">{t.whyWeAsk}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
      </PopoverContent>
    </Popover>
  );
}

export default function ProgramForm() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const program = programs.find((p) => p.id === type);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);

  const titleKey = `${type}Title` as keyof typeof t;
  const programTitle = (t[titleKey] as string) || program?.title || "Program";

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    weight: "",
    height: "",
    goal: program?.goal || "",
    duration: "1 Month",
    experience: "Beginner",
    limitations: "",
    allergies: "",
    occupation: "",
    occupationOther: "",
    trainingDaysPerWeek: "4",
    foodStyle: "",
    // New fields
    sessionDuration: 60,
    equipment: [] as string[],
    dailySteps: "4000-8000",
    sleepHours: "",
    sleepQuality: 7,
    stressLevel: 5,
    nightShift: false,
    mealFrequency: "4",
    intermittentFasting: false,
  });

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const toggleEquipment = (val: string) => {
    setForm((p) => {
      const eq = p.equipment.includes(val)
        ? p.equipment.filter((e) => e !== val)
        : [...p.equipment, val];
      return { ...p, equipment: eq };
    });
  };

  // Real-time calculations
  const metrics = useMemo(() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    const a = parseInt(form.age);
    if (!w || !h || !a || !form.gender) return null;
    return computeAll(w, h, a, form.gender, parseInt(form.trainingDaysPerWeek) || 4, form.dailySteps, type || "beginner");
  }, [form.weight, form.height, form.age, form.gender, form.trainingDaysPerWeek, form.dailySteps, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.weight || !form.height || !startDate || !form.foodStyle) {
      toast({ title: t.fillRequired, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const occupation = form.occupation === "other" ? form.occupationOther : form.occupation;
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const startDayName = format(startDate, "EEEE");
      const trainingDaysPerWeek = parseInt(form.trainingDaysPerWeek) || 4;
      const restDays = 7 - trainingDaysPerWeek;
      const res = await supabase.functions.invoke("generate-plan", {
        body: {
          ...form,
          occupation,
          programType: type,
          language: lang,
          startDate: startDateStr,
          startDay: startDayName,
          restDays: String(restDays),
          trainingDaysPerWeek,
          foodStyle: form.foodStyle,
          // New fields
          sessionDuration: form.sessionDuration,
          equipment: form.equipment,
          dailySteps: form.dailySteps,
          sleepHours: form.sleepHours,
          sleepQuality: form.sleepQuality,
          stressLevel: form.stressLevel,
          nightShift: form.nightShift,
          mealFrequency: form.mealFrequency,
          intermittentFasting: form.intermittentFasting,
          // Pre-calculated metrics
          calculatedMetrics: metrics,
        },
      });
      if (res.error) throw res.error;
      navigate("/results", { state: { plan: res.data, userInfo: { ...form, foodStyle: form.foodStyle }, programType: type } });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{programTitle}</h1>
          <p className="text-muted-foreground">{t.tellUs}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
            <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider text-primary">{t.basicInfoSection}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.fullName}</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>{t.age}</Label>
                <Input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="25" className="bg-secondary border-border" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t.gender}</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder={t.genderSelect} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t.male}</SelectItem>
                    <SelectItem value="female">{t.female}</SelectItem>
                    <SelectItem value="other">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.weightKg}</Label>
                <Input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="75" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>{t.heightCm}</Label>
                <Input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="175" className="bg-secondary border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.occupation}</Label>
              <Select value={form.occupation} onValueChange={(v) => set("occupation", v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder={t.occupationSelect} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t.occupationStudent}</SelectItem>
                  <SelectItem value="office">{t.occupationOffice}</SelectItem>
                  <SelectItem value="field">{t.occupationField}</SelectItem>
                  <SelectItem value="freelancer">{t.occupationFreelancer}</SelectItem>
                  <SelectItem value="business">{t.occupationBusiness}</SelectItem>
                  <SelectItem value="other">{t.other}</SelectItem>
                </SelectContent>
              </Select>
              {form.occupation === "other" && (
                <Input value={form.occupationOther} onChange={(e) => set("occupationOther", e.target.value)} placeholder={t.occupationOtherPlaceholder} className="bg-secondary border-border mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.fitnessGoal}</Label>
              <Input value={form.goal} onChange={(e) => set("goal", e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>

          {/* Training Configuration Section */}
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
            <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider text-primary">{t.trainingConfigSection}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t.trainingDuration}</Label>
                <Select value={form.duration} onValueChange={(v) => set("duration", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 Month">{t.month1}</SelectItem>
                    <SelectItem value="3 Months">{t.months3}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.experienceLevel}</Label>
                <Select value={form.experience} onValueChange={(v) => set("experience", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">{t.beginner}</SelectItem>
                    <SelectItem value="Intermediate">{t.intermediate}</SelectItem>
                    <SelectItem value="Advanced">{t.advanced}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.trainingFrequency}</Label>
                <Select value={form.trainingDaysPerWeek} onValueChange={(v) => set("trainingDaysPerWeek", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>{(t as any)[`freq${n}`]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Session Duration Slider */}
            <div className="space-y-3">
              <Label>
                {t.sessionDurationLabel} <WhyTooltip text={t.whySessionDuration} />
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[form.sessionDuration]}
                  onValueChange={([v]) => set("sessionDuration", v)}
                  min={30}
                  max={90}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-bold text-primary w-16 text-right">{form.sessionDuration} {t.minutes}</span>
              </div>
            </div>

            {/* Available Equipment Multi-Select */}
            <div className="space-y-3">
              <Label>
                {t.equipmentLabel} <WhyTooltip text={t.whyEquipment} />
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <label
                    key={eq.value}
                    className={cn(
                      "flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2.5 text-sm cursor-pointer border transition-colors",
                      form.equipment.includes(eq.value) ? "border-primary bg-primary/10" : "border-transparent"
                    )}
                  >
                    <Checkbox
                      checked={form.equipment.includes(eq.value)}
                      onCheckedChange={() => toggleEquipment(eq.value)}
                    />
                    <span className="text-foreground">{(t as any)[eq.labelKey]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Training Start Date */}
            <div className="space-y-2">
              <Label>{t.trainingStartDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal bg-secondary border-border", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "EEEE, dd-MM-yyyy") : t.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Lifestyle & Recovery Section */}
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
            <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider text-primary">{t.lifestyleSection}</h3>

            {/* Daily Steps / NEAT */}
            <div className="space-y-2">
              <Label>
                {t.dailyStepsLabel} <WhyTooltip text={t.whyDailySteps} />
              </Label>
              <Select value={form.dailySteps} onValueChange={(v) => set("dailySteps", v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="<4000">{t.steps0}</SelectItem>
                  <SelectItem value="4000-8000">{t.steps1}</SelectItem>
                  <SelectItem value="8000-12000">{t.steps2}</SelectItem>
                  <SelectItem value=">12000">{t.steps3}</SelectItem>
                  <SelectItem value="desk">{t.stepsDesk}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sleep */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t.sleepHoursLabel} <WhyTooltip text={t.whySleep} />
                </Label>
                <Input type="number" value={form.sleepHours} onChange={(e) => set("sleepHours", e.target.value)} placeholder="7" min={3} max={12} step={0.5} className="bg-secondary border-border" />
              </div>
              <div className="space-y-3">
                <Label>{t.sleepQualityLabel}: <span className="text-primary font-bold">{form.sleepQuality}/10</span></Label>
                <Slider value={[form.sleepQuality]} onValueChange={([v]) => set("sleepQuality", v)} min={1} max={10} step={1} />
              </div>
            </div>

            {/* Stress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>
                  {t.stressLevelLabel}: <span className="text-primary font-bold">{form.stressLevel}/10</span>
                  <WhyTooltip text={t.whyStress} />
                </Label>
                <Slider value={[form.stressLevel]} onValueChange={([v]) => set("stressLevel", v)} min={1} max={10} step={1} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.nightShift} onCheckedChange={(v) => set("nightShift", v)} />
                <Label className="cursor-pointer">{t.nightShiftLabel}</Label>
              </div>
            </div>
          </div>

          {/* Nutrition Section */}
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
            <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider text-primary">{t.nutritionSection}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.foodStyleLabel}</Label>
                <Select value={form.foodStyle} onValueChange={(v) => set("foodStyle", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder={t.foodStylePlaceholder} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">{t.foodStyleLocal}</SelectItem>
                    <SelectItem value="western">{t.foodStyleWestern}</SelectItem>
                    <SelectItem value="asian">{t.foodStyleAsian}</SelectItem>
                    <SelectItem value="high-protein">{t.foodStyleHighProtein}</SelectItem>
                    <SelectItem value="budget">{t.foodStyleBudget}</SelectItem>
                    <SelectItem value="premium">{t.foodStylePremium}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.mealFrequencyLabel}</Label>
                <Select value={form.mealFrequency} onValueChange={(v) => set("mealFrequency", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">{t.meals3}</SelectItem>
                    <SelectItem value="4">{t.meals4}</SelectItem>
                    <SelectItem value="5">{t.meals5}</SelectItem>
                    <SelectItem value="6">{t.meals6}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.intermittentFasting} onCheckedChange={(v) => set("intermittentFasting", v)} />
              <Label className="cursor-pointer">
                {t.ifLabel} <WhyTooltip text={t.whyIF} />
              </Label>
            </div>

            <div className="space-y-2">
              <Label>{t.limitations}</Label>
              <Textarea value={form.limitations} onChange={(e) => set("limitations", e.target.value)} placeholder={t.limitationsPlaceholder} className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label>{t.allergies}</Label>
              <Textarea value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder={t.allergiesPlaceholder} className="bg-secondary border-border" />
            </div>
          </div>

          {/* Live Metrics Card */}
          {metrics && (
            <div className="card-gradient rounded-lg p-6 border border-primary/30 space-y-4">
              <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                <Activity className="w-4 h-4" /> {t.liveMetricsTitle}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-secondary/60 rounded-lg p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">BMI</p>
                  <p className="text-lg font-bold text-foreground">{metrics.bmi}</p>
                  <p className={cn("text-[10px] font-medium",
                    metrics.bmiCategory === "Normal" ? "text-primary" :
                    metrics.bmiCategory === "Underweight" ? "text-accent-foreground" : "text-destructive"
                  )}>{(t as any)[`bmiCat${metrics.bmiCategory}`] || metrics.bmiCategory}</p>
                </div>
                <div className="bg-secondary/60 rounded-lg p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">BMR</p>
                  <p className="text-lg font-bold text-foreground">{metrics.bmr}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/{t.day}</p>
                </div>
                <div className="bg-secondary/60 rounded-lg p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">TDEE</p>
                  <p className="text-lg font-bold text-foreground">{metrics.tdee}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/{t.day}</p>
                </div>
                <div className="bg-secondary/60 rounded-lg p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">{t.targetCalories}</p>
                  <p className="text-lg font-bold text-primary">{metrics.calories}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/{t.day}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/60 rounded-lg p-3 text-center">
                  <Beef className="w-4 h-4 text-destructive mx-auto mb-1" />
                  <p className="text-[11px] text-muted-foreground">{t.protein}</p>
                  <p className="text-sm font-bold text-foreground">{metrics.protein}g</p>
                </div>
                <div className="bg-secondary/60 rounded-lg p-3 text-center">
                  <Wheat className="w-4 h-4 text-accent-foreground mx-auto mb-1" />
                  <p className="text-[11px] text-muted-foreground">{t.carbsLabel}</p>
                  <p className="text-sm font-bold text-foreground">{metrics.carbs}g</p>
                </div>
                <div className="bg-secondary/60 rounded-lg p-3 text-center">
                  <Droplet className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-[11px] text-muted-foreground">{t.fatLabel}</p>
                  <p className="text-sm font-bold text-foreground">{metrics.fat}g</p>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t.generating}</> : t.generatePlan}
          </Button>
        </form>
      </div>
    </div>
  );
}
