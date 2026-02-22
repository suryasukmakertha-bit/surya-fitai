import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Loader2, Dumbbell } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const redirectTo = (location.state as any)?.redirectTo || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: t.welcomeBackToast });
        navigate(redirectTo);
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast({ title: t.accountCreated, description: t.checkEmail });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {isLogin ? t.welcomeBack : t.createAccount}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? t.signInAccess : t.signUpSave}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-gradient rounded-lg p-6 border border-border/50 space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label>{t.displayName}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" className="bg-secondary border-border" />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t.email}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>{t.password}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-secondary border-border" />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? t.signIn : t.signUp}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? t.dontHaveAccount : t.alreadyHaveAccount}{" "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
              {isLogin ? t.signUp : t.signIn}
            </button>
          </p>
        </form>
      </div>
      </div>
    </div>
  );
}
