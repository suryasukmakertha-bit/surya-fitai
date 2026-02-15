import ProgramCard from "@/components/ProgramCard";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeButton from "@/components/HomeButton";

export default function Programs() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <HomeButton />
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">{t.chooseYour} <span className="text-gradient">{t.program}</span></h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.programsDesc}</p>
        </div>
        <ProgramCard />
      </div>
    </div>
  );
}
