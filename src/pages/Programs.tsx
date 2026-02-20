import ProgramCard from "@/components/ProgramCard";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";

export default function Programs() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">{t.chooseYour} <span className="text-gradient">{t.program}</span></h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.programsDesc}</p>
        </div>
        <ProgramCard />
      </div>
    </div>
  );
}
