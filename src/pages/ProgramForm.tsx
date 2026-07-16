import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { playGeneratePlanSuccess } from "@/utils/sounds";
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
import { useGenerateLimit } from "@/hooks/useGenerateLimit";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionPopup from "@/components/subscription/SubscriptionPopup";
import SubscribeRequiredModal from "@/components/subscription/SubscribeRequiredModal";

const EQUIPMENT_OPTIONS = [
  { value: "bodyweight", labelKey: "equipBodyweight" },
  { value: "full-gym", labelKey: "equipFullGym" },
] as const;

// Allowed weekly training days per experience level (WORKOUT_TEMPLATE_LOGIC §0).
// Frontend restriction — the engine has entries for all combos but out-of-spec
// pairs silently produce off-spec splits.
const DAYS_BY_EXPERIENCE: Record<string, number[]> = {
  Beginner:     [2, 3, 4, 5],
  Intermediate: [2, 3, 4, 5, 6],
  Advanced:     [2, 3, 4, 5, 6, 7],
};

// Canonical limitation tokens matched (case-insensitive substring) by the
// edge function's parseLimitations. The token string is what gets sent in
// the payload; the label is looked up via i18n. "lower back" (with space)
// is required to trigger the parser's lower_back branch.
const LIMITATION_OPTIONS = [
  { token: "knee",       labelKey: "limKnee" },
  { token: "lower back", labelKey: "limLowerBack" },
  { token: "shoulder",   labelKey: "limShoulder" },
  { token: "wrist",      labelKey: "limWrist" },
  { token: "ankle",      labelKey: "limAnkle" },
  { token: "hip",        labelKey: "limHip" },
  { token: "elbow",      labelKey: "limElbow" },
  { token: "pregnancy",  labelKey: "limPregnancy" },
  { token: "none",       labelKey: "limNone" },
] as const;

// Maps Programs-page route param (programType) to the canonical 5-value
// Fitness Goal enum expected by computeAll/calculateMacros. Mirrors the
// edge function normalizeGoal programType fallback. Preview widget only.
function programTypeToGoal(type: string | undefined): string {
  switch (type) {
    case "bulking": return "Hypertrophy";
    case "cutting": return "Fat Loss";
    case "beginner":
    case "senior":
    default: return "General Fitness";
  }
}

// Maps the user-facing single-select equipment value to the engine
// equipment array consumed by the AI prompt in `generate-plan`.
const EQUIPMENT_ENGINE_MAP: Record<string, string[]> = {
  "bodyweight": ["bodyweight"],
  "full-gym": ["barbell", "dumbbell", "cable", "machine", "gym", "bodyweight"],
};

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
  const [loadingStep, setLoadingStep] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const { info: genLimit, refetch: refetchLimit } = useGenerateLimit();
  const { userEmail, openPopup, showPopup, popupTrigger, closePopup, access, refetch: refetchSub } = useSubscription();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);

  const titleKey = `${type}Title` as keyof typeof t;
  const programTitle = (t[titleKey] as string) || program?.title || "Program";

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    weight: "",
    height: "",
    goal: (t as any)[`${type}Goal`] || program?.goal || "",
    // Duration is now hardcoded to 1 month — selector removed from UI.
    // Plans are 4 weeks; users continue to month 2/3/etc via the completion modal.
    duration: "1 Month",
    experience: "Beginner",
    limitations: "",
    allergies: "",
    trainingDaysPerWeek: "4",
    foodStyle: "",
    dietType: "",
    sessionDuration: 60,
    equipment: "full-gym" as string,
    dailySteps: "4000-8000",
    mealFrequency: "4",
    intermittentFasting: false,
  });

  // Sync goal text when language changes
  useEffect(() => {
    const goalKey = `${type}Goal` as keyof typeof t;
    const localizedGoal = (t as any)[goalKey];
    if (localizedGoal) {
      setForm((p) => ({ ...p, goal: localizedGoal }));
    }
  }, [lang, type, t]);

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const selectEquipment = (val: string) => {
    setForm((p) => ({ ...p, equipment: val }));
  };

  // Real-time calculations
  const metrics = useMemo(() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    const a = parseInt(form.age);
    if (!w || !h || !a || !form.gender) return null;
    return computeAll(w, h, a, form.gender, parseInt(form.trainingDaysPerWeek) || 4, form.dailySteps, programTypeToGoal(type));
  }, [form.weight, form.height, form.age, form.gender, form.trainingDaysPerWeek, form.dailySteps, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.weight || !form.height || !startDate || !form.foodStyle) {
      toast({ title: t.fillRequired, variant: "destructive" });
      return;
    }
    // Client-side gate (server still enforces).
    // Free / expired-fallback users: 1x per calendar month → show upgrade popup when used.
    if (genLimit.status === "free" && !genLimit.canGenerate) {
      openPopup('generate_limit' as any);
      return;
    }
    if (!genLimit.canGenerate && genLimit.status !== "loading" && genLimit.status !== "admin") {
      const msgs = {
        id: genLimit.status === "trial"
          ? "Batas generate selama trial (3x) tercapai. Subscribe untuk generate plan bulanan bersama Coach Surya."
          : "Batas generate bulan ini (3x) tercapai. Reset otomatis pada renewal berikutnya.",
        en: genLimit.status === "trial"
          ? "Trial generate limit (3x) reached. Subscribe to get monthly generates with Coach Surya."
          : "Monthly generate limit (3x) reached. Resets automatically on next renewal.",
        zh: genLimit.status === "trial"
          ? "试用生成限制（3次）已达到。订阅以获得每月生成次数。"
          : "本月生成限制（3次）已达到。将于续订日期自动重置。",
      };
      toast({
        title: msgs[lang as keyof typeof msgs] ?? msgs.en,
        variant: "destructive",
        action: genLimit.status === "trial" ? (
          <button type="button" onClick={() => setShowPaymentPopup(true)} className="ml-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
            {lang === "id" ? "Berlangganan Sekarang" : lang === "zh" ? "立即订阅" : "Subscribe Now"}
          </button>
        ) as any : undefined,
      });
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 8000);
    try {
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const startDayName = format(startDate, "EEEE");
      const trainingDaysPerWeek = parseInt(form.trainingDaysPerWeek) || 4;
      const restDays = 7 - trainingDaysPerWeek;
      // Experience-aware time validator
      const targetLiftingMinutes = form.sessionDuration - 10;
      const avgMinutesPerSet = 2.3;
      let targetSets = Math.floor(targetLiftingMinutes / avgMinutesPerSet);
      const effectiveExperience = type === 'beginner' ? 'Beginner' : form.experience;
      if (effectiveExperience === 'Beginner') targetSets = Math.max(targetSets, 10);
      else if (effectiveExperience === 'Intermediate') targetSets = Math.max(targetSets, 16);
      else if (effectiveExperience === 'Advanced') targetSets = Math.max(targetSets, 22);

      const res = await supabase.functions.invoke("generate-plan", {
        body: {
          ...form,
          experience: effectiveExperience,
          programType: type,
          language: lang,
          startDate: startDateStr,
          startDay: startDayName,
          restDays: String(restDays),
          trainingDaysPerWeek,
          foodStyle: form.foodStyle,
          sessionDuration: form.sessionDuration,
          equipment: EQUIPMENT_ENGINE_MAP[form.equipment] ?? (form.equipment ? [form.equipment] : []),
          dailySteps: form.dailySteps,
          mealFrequency: form.mealFrequency,
          intermittentFasting: form.intermittentFasting,
          calculatedMetrics: metrics,
          targetLiftingMinutes,
          targetTotalSets: targetSets,
        },
      });
      // Map edge function status codes to localized, user-friendly messages.
      // The edge function returns CORS-headed JSON for every error path
      // (408 timeout, 422 parse, 429 rate limit, 402 credits, 500 internal),
      // so res.error.context.status is reliably populated.
      if (res.error) {
        const status: number | undefined = (res.error as any)?.context?.status;
        // 403 = subscription gate from server (expired or limit reached). Surface
        // the right UI (modal vs toast) and short-circuit before the generic mapping.
        if (status === 403) {
          let body: any = null;
          try { body = await (res.error as any)?.context?.json?.(); } catch {}
          const code = body?.error;
          if (code === 'free_limit_reached' || code === 'subscription_expired') {
            openPopup('generate_limit' as any);
          } else {
            const trial = code === 'trial_limit_reached';
            const msgs = {
              id: trial
                ? "Batas generate selama trial (3x) tercapai. Subscribe untuk generate plan bulanan bersama Coach Surya."
                : "Batas generate bulan ini (3x) tercapai. Reset otomatis pada renewal berikutnya.",
              en: trial
                ? "Trial generate limit (3x) reached. Subscribe to get monthly generates with Coach Surya."
                : "Monthly generate limit (3x) reached. Resets automatically on next renewal.",
              zh: trial
                ? "试用生成限制（3次）已达到。订阅以获得每月生成次数。"
                : "本月生成限制（3次）已达到。将于续订日期自动重置。",
            };
            toast({
              title: msgs[lang as keyof typeof msgs] ?? msgs.en,
              variant: "destructive",
              action: trial ? (
                <button type="button" onClick={() => setShowPaymentPopup(true)} className="ml-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                  {lang === "id" ? "Berlangganan Sekarang" : lang === "zh" ? "立即订阅" : "Subscribe Now"}
                </button>
              ) as any : undefined,
            });
          }
          await refetchLimit();
          return;
        }
        let description: string = (t as any).planErrInternal;
        if (status === 408) description = (t as any).planErrTimeout;
        else if (status === 422) description = (t as any).planErrParse;
        else if (status === 429) description = (t as any).planErrRate;
        else if (status === 402) description = (t as any).planErrCredits;
        else if (status === 500) description = (t as any).planErrInternal;
        else if (!status) description = (t as any).planErrNetwork;

        toast({
          title: "Error",
          description,
          variant: "destructive",
          action: (
            <button
              type="button"
              onClick={() => handleSubmit(e)}
              className="ml-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              {(t as any).retry}
            </button>
          ) as any,
        });
        return;
      }

      // Generate a client ID for idempotent saves — do NOT auto-save
      const clientGeneratedId = crypto.randomUUID();

      playGeneratePlanSuccess();
      await refetchLimit();
      navigate("/results", { state: { plan: res.data, userInfo: { ...form, foodStyle: form.foodStyle, startDate: startDateStr }, programType: type, clientGeneratedId } });
    } catch (err: any) {
      // Network-level failure (no response at all)
      toast({ title: "Error", description: (t as any).planErrNetwork, variant: "destructive" });
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{programTitle}</h1>
        </div>

        <form data-tour="form-fields" onSubmit={handleSubmit} className="space-y-6">
          {/* Coach Intro Banner */}
          <div className="mb-5 px-4 py-3 rounded-2xl flex items-start gap-3"
            style={{ backgroundColor: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)' }}>
            <span className="text-xl flex-shrink-0">👋</span>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {(t as any).coachFormIntro}
            </p>
          </div>

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
              <Label>{t.fitnessGoal}</Label>
              <Input value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder={(t as any).fitnessGoalPlaceholder} className="bg-secondary border-border" />
            </div>
          </div>

          {/* Training Configuration Section */}
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
            <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider text-primary">{t.trainingConfigSection}</h3>

            {/* Duration selector removed: all plans are now fixed at 4 weeks (1 month).
                Users can extend to the next month via the completion celebration modal. */}
            <div className={cn("grid gap-4", type === 'beginner' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
              {type !== 'beginner' && (
                <div className="space-y-2">
                  <Label>{t.experienceLevel}</Label>
                  <Select
                    value={form.experience}
                    onValueChange={(v) => {
                      const maxDays = (DAYS_BY_EXPERIENCE[v] ?? [7]).slice(-1)[0];
                      const currentDays = parseInt(form.trainingDaysPerWeek) || 4;
                      setForm((p) => ({
                        ...p,
                        experience: v,
                        trainingDaysPerWeek: currentDays > maxDays ? String(maxDays) : p.trainingDaysPerWeek,
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">{t.beginner}</SelectItem>
                      <SelectItem value="Intermediate">{t.intermediate}</SelectItem>
                      <SelectItem value="Advanced">{t.advanced}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <label
                    key={eq.value}
                    className={cn(
                      "flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2.5 text-sm cursor-pointer border transition-colors",
                      form.equipment === eq.value ? "border-primary bg-primary/10" : "border-transparent"
                    )}
                  >
                    <input
                      type="radio"
                      name="equipment"
                      value={eq.value}
                      checked={form.equipment === eq.value}
                      onChange={() => selectEquipment(eq.value)}
                      className="h-4 w-4 accent-primary cursor-pointer"
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
          </div>

          {/* Nutrition Section */}
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
            <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider text-primary">{t.nutritionSection}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{(t as any).dietTypeLabel}</Label>
                <Select value={form.dietType} onValueChange={(v) => set("dietType", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder={(t as any).dietTypePlaceholder} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="omnivore">{(t as any).dietOmnivore}</SelectItem>
                    <SelectItem value="vegetarian">{(t as any).dietVegetarian}</SelectItem>
                    <SelectItem value="vegan">{(t as any).dietVegan}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.foodStyleLabel}</Label>
                <Select value={form.foodStyle} onValueChange={(v) => set("foodStyle", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder={t.foodStylePlaceholder} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="western">{t.foodStyleWestern}</SelectItem>
                    <SelectItem value="asian">{t.foodStyleAsian}</SelectItem>
                    <SelectItem value="high-protein">{t.foodStyleHighProtein}</SelectItem>
                    <SelectItem value="budget">{t.foodStyleBudget}</SelectItem>
                    <SelectItem value="premium">{t.foodStylePremium}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <p className="text-xs text-muted-foreground">{(t as any).limitationsHelper}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {LIMITATION_OPTIONS.map(opt => {
                  const selected = form.limitations
                    .split(",")
                    .map(s => s.trim().toLowerCase())
                    .filter(Boolean);
                  const isChecked = selected.includes(opt.token);
                  const toggle = () => {
                    let next: string[];
                    if (opt.token === "none") {
                      next = isChecked ? [] : ["none"];
                    } else if (isChecked) {
                      next = selected.filter(s => s !== opt.token);
                    } else {
                      next = [...selected.filter(s => s !== "none"), opt.token];
                    }
                    set("limitations", next.length ? next.join(", ") : "None");
                  };
                  return (
                    <label
                      key={opt.token}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer bg-secondary border-border text-sm select-none",
                        isChecked && "border-primary bg-primary/10"
                      )}
                    >
                      <Checkbox checked={isChecked} onCheckedChange={toggle} />
                      <span>{(t as any)[opt.labelKey]}</span>
                    </label>
                  );
                })}
              </div>
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
              <p className="text-muted-foreground text-xs mb-3">
                {(t as any).coachMetricsSubtitle}
              </p>
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

          <Button data-tour="generate-button" type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="animate-pulse">
                  {[(t as any).generatingStep1, (t as any).generatingStep2, (t as any).generatingStep3, (t as any).generatingStep4][loadingStep]}
                </span>
              </>
            ) : t.generatePlan}
          </Button>
          {/* Generate-limit counter (hidden for admin & loading) */}
          {genLimit.status !== "admin" && genLimit.status !== "loading" && (
            <p
              className="text-center mt-2"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
            >
              {(() => {
                const remaining = genLimit.remaining;
                const max = genLimit.max;
                if (genLimit.status === "free") {
                  if (lang === "id") return `Sisa generate gratis bulan ini: ${remaining}/${max}`;
                  if (lang === "zh") return `本月剩余免费生成次数：${remaining}/${max}`;
                  return `Free generates remaining this month: ${remaining}/${max}`;
                }
                if (genLimit.status === "trial") {
                  if (lang === "id") return `Sisa generate trial: ${remaining}/${max}`;
                  if (lang === "zh") return `剩余试用生成次数：${remaining}/${max}`;
                  return `Trial generates remaining: ${remaining}/${max}`;
                }
                // active
                if (lang === "id") return `Sisa generate bulan ini: ${remaining}/${max}`;
                if (lang === "zh") return `本月剩余生成次数：${remaining}/${max}`;
                return `Remaining generates this month: ${remaining}/${max}`;
              })()}
            </p>
          )}
          <p className="text-muted-foreground/60 text-xs text-center mt-2">
            {(t as any).coachGenerateHelper}
          </p>
          <p className="text-muted-foreground text-xs text-center mt-3 leading-relaxed px-4">
            {(t as any).monthlyPlanHelper}
          </p>
        </form>
      </div>
      <SubscribeRequiredModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        onSubscribe={() => { setShowSubscribeModal(false); setShowPaymentPopup(true); }}
      />
      <SubscriptionPopup
        isOpen={showPaymentPopup || showPopup}
        onClose={() => { setShowPaymentPopup(false); closePopup(); }}
        trigger={showPopup ? popupTrigger : 'save_plan'}
        userEmail={userEmail}
        onPaymentDone={() => { setShowPaymentPopup(false); closePopup(); refetchLimit(); refetchSub(); }}
        trialNotStarted={access.trialNotStarted}
        isTrialActive={genLimit.status === "trial"}
      />
    </div>
  );
}
