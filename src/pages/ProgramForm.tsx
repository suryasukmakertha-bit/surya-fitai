import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { programs } from "@/components/ProgramCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ProgramForm() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const program = programs.find((p) => p.id === type);
  const [loading, setLoading] = useState(false);

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
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.weight || !form.height) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("generate-plan", {
        body: { ...form, programType: type },
      });
      if (res.error) throw res.error;
      navigate("/results", { state: { plan: res.data, userInfo: form, programType: type } });
    } catch (err: any) {
      toast({ title: "Error generating plan", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button onClick={() => navigate("/programs")} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Programs
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{program?.title || "Program"}</h1>
          <p className="text-muted-foreground">Tell us about yourself so our AI can create your personalized plan.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card-gradient rounded-lg p-6 border border-border/50 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="25" className="bg-secondary border-border" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weight (kg) *</Label>
                <Input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="75" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Height (cm) *</Label>
                <Input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="175" className="bg-secondary border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fitness Goal</Label>
              <Input value={form.goal} onChange={(e) => set("goal", e.target.value)} className="bg-secondary border-border" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Training Duration</Label>
                <Select value={form.duration} onValueChange={(v) => set("duration", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2 Weeks">2 Weeks</SelectItem>
                    <SelectItem value="1 Month">1 Month</SelectItem>
                    <SelectItem value="3 Months">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select value={form.experience} onValueChange={(v) => set("experience", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Physical Limitations or Injuries (optional)</Label>
              <Textarea value={form.limitations} onChange={(e) => set("limitations", e.target.value)} placeholder="E.g., knee injury, lower back pain..." className="bg-secondary border-border" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating Your Plan...</> : "Generate My AI Plan"}
          </Button>
        </form>
      </div>
    </div>
  );
}
