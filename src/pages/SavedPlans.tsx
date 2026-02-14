import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Loader2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SavedPlan {
  id: string;
  program_type: string;
  user_info: any;
  plan_data: any;
  created_at: string;
}

export default function SavedPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("saved_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPlans(data);
    setLoading(false);
  };

  const deletePlan = async (id: string) => {
    await supabase.from("saved_plans").delete().eq("id", id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Plan deleted" });
  };

  if (loading) {
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
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Saved <span className="text-gradient">Plans</span>
        </h1>
        <p className="text-muted-foreground mb-8">Your previously generated AI fitness plans.</p>

        {plans.length === 0 ? (
          <div className="card-gradient rounded-lg p-8 border border-border/50 text-center">
            <p className="text-muted-foreground mb-4">No saved plans yet.</p>
            <Button onClick={() => navigate("/programs")}>Generate Your First Plan</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.id} className="card-gradient rounded-lg p-5 border border-border/50 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-foreground capitalize">{p.program_type} Program</h3>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate("/results", { state: { plan: p.plan_data, userInfo: p.user_info, programType: p.program_type } })}
                  >
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  <button onClick={() => deletePlan(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
