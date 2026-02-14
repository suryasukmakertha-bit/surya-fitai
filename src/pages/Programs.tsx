import ProgramCard from "@/components/ProgramCard";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Programs() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">{t.chooseYour} <span className="text-gradient">{t.program}</span></h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.programsDesc}</p>
        </div>
        <ProgramCard />
      </div>
    </div>
  );
}
