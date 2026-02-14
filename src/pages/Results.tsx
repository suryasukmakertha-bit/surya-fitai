import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Droplets, Dumbbell, Apple, ShoppingCart, TrendingUp, Sparkles, Save, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const plan: PlanData | undefined = location.state?.plan;
  const userInfo = location.state?.userInfo;
  const programType = location.state?.programType;

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No plan data found.</p>
          <button onClick={() => navigate("/programs")} className="text-primary hover:underline">Go back to programs</button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Sign in to save your plan", description: "Create an account to save and access your plans anytime.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("saved_plans").insert({
        user_id: user.id,
        program_type: programType || "custom",
        user_info: userInfo as any,
        plan_data: plan as any,
      });
      if (error) throw error;
      setSaved(true);
      toast({ title: "Plan saved!" });
    } catch (err: any) {
      toast({ title: "Error saving plan", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/programs")} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Programs
          </button>
          <Button onClick={handleSave} disabled={saving || saved} variant={saved ? "secondary" : "default"} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {saved ? "Saved" : "Save Plan"}
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Your Personalized <span className="text-gradient">AI Plan</span>
          </h1>
          <p className="text-muted-foreground">
            {userInfo?.name ? `Hey ${userInfo.name}! ` : ""}Here's your custom {programType} program.
          </p>
        </div>

        {/* Motivational message */}
        {plan.motivational_message && (
          <div className="neon-border rounded-lg p-4 mb-8 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-foreground text-sm italic">{plan.motivational_message}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: "Daily Calories", value: `${plan.calorie_target} kcal` },
            { icon: Dumbbell, label: "Protein", value: `${plan.protein}g` },
            { icon: Apple, label: "Carbs / Fat", value: `${plan.carbs}g / ${plan.fat}g` },
            { icon: Droplets, label: "Water", value: `${plan.water_liters}L / day` },
          ].map((stat) => (
            <div key={stat.label} className="card-gradient rounded-lg p-4 border border-border/50 text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="workout" className="space-y-6">
          <TabsList className="bg-secondary w-full justify-start">
            <TabsTrigger value="workout">Workout Plan</TabsTrigger>
            <TabsTrigger value="meals">Meal Plan</TabsTrigger>
            <TabsTrigger value="grocery">Grocery List</TabsTrigger>
            <TabsTrigger value="info">Info & Safety</TabsTrigger>
          </TabsList>

          <TabsContent value="workout" className="space-y-4">
            {plan.workout_plan?.map((day, i) => (
              <div key={i} className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-3">{day.day}</h3>
                <div className="space-y-2">
                  {day.exercises.map((ex, j) => (
                    <div key={j} className="flex items-center justify-between bg-secondary/50 rounded-md px-4 py-2.5 text-sm">
                      <span className="text-foreground font-medium">{ex.name}</span>
                      <span className="text-muted-foreground">{ex.sets} × {ex.reps} · {ex.rest} rest</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {plan.estimated_calories_burned > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-primary" />
                Estimated {plan.estimated_calories_burned} calories burned per session
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
                <h3 className="font-display font-bold text-foreground">Weekly Grocery List</h3>
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
                <h3 className="font-display font-bold text-foreground mb-2">Progress Projection</h3>
                <p className="text-sm text-muted-foreground">{plan.weight_projection}</p>
              </div>
            )}
            {plan.safety_notes?.length > 0 && (
              <div className="card-gradient rounded-lg p-5 border border-border/50">
                <h3 className="font-display font-bold text-foreground mb-3">Safety Notes</h3>
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
                <h3 className="font-display font-bold text-foreground mb-3">Weekly Schedule Overview</h3>
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
        </Tabs>
      </div>
    </div>
  );
}
