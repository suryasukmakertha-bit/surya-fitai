import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon } from "lucide-react";
import { programs } from "@/components/ProgramCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeButton from "@/components/HomeButton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
    restDays: "2",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.weight || !form.height || !startDate) {
      toast({ title: t.fillRequired, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const occupation = form.occupation === "other" ? form.occupationOther : form.occupation;
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const startDayName = format(startDate, "EEEE");
      const res = await supabase.functions.invoke("generate-plan", {
        body: { ...form, occupation, programType: type, language: lang, startDate: startDateStr, startDay: startDayName },
      });
      if (res.error) throw res.error;
      navigate("/results", { state: { plan: res.data, userInfo: form, programType: type } });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <HomeButton />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{programTitle}</h1>
          <p className="text-muted-foreground">{t.tellUs}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
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
                <Input
                  value={form.occupationOther}
                  onChange={(e) => set("occupationOther", e.target.value)}
                  placeholder={t.occupationOtherPlaceholder}
                  className="bg-secondary border-border mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.fitnessGoal}</Label>
              <Input value={form.goal} onChange={(e) => set("goal", e.target.value)} className="bg-secondary border-border" />
            </div>

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
                <Label>{t.restDays}</Label>
                <Select value={form.restDays} onValueChange={(v) => set("restDays", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t.restDay1}</SelectItem>
                    <SelectItem value="2">{t.restDay2}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.limitations}</Label>
              <Textarea value={form.limitations} onChange={(e) => set("limitations", e.target.value)} placeholder={t.limitationsPlaceholder} className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label>{t.allergies}</Label>
              <Textarea value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder={t.allergiesPlaceholder} className="bg-secondary border-border" />
            </div>

            {/* Training Start Date */}
            <div className="space-y-2">
              <Label>{t.trainingStartDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-secondary border-border",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "EEEE, dd-MM-yyyy") : t.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t.generating}</> : t.generatePlan}
          </Button>
        </form>
      </div>
    </div>
  );
}
