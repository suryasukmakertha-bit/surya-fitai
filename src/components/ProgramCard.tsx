import { useNavigate } from "react-router-dom";
import { Dumbbell, Zap, Scissors, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProgramDef {
  id: string;
  titleKey: "beginnerTitle" | "bulkingTitle" | "cuttingTitle" | "seniorTitle";
  descKey: "beginnerDesc" | "bulkingDesc" | "cuttingDesc" | "seniorDesc";
  benefitsKey: "beginnerBenefits" | "bulkingBenefits" | "cuttingBenefits" | "seniorBenefits";
  goalKey: "beginnerGoal" | "bulkingGoal" | "cuttingGoal" | "seniorGoal";
  icon: typeof Heart;
}

const programDefs: ProgramDef[] = [
  { id: "beginner", titleKey: "beginnerTitle", descKey: "beginnerDesc", benefitsKey: "beginnerBenefits", goalKey: "beginnerGoal", icon: Heart },
  { id: "bulking", titleKey: "bulkingTitle", descKey: "bulkingDesc", benefitsKey: "bulkingBenefits", goalKey: "bulkingGoal", icon: Dumbbell },
  { id: "cutting", titleKey: "cuttingTitle", descKey: "cuttingDesc", benefitsKey: "cuttingBenefits", goalKey: "cuttingGoal", icon: Scissors },
  { id: "senior", titleKey: "seniorTitle", descKey: "seniorDesc", benefitsKey: "seniorBenefits", goalKey: "seniorGoal", icon: Zap },
];

// Keep a static list for ProgramForm to reference goals by id
const programs = [
  { id: "beginner", title: "Beginner Program", goal: "Build fitness foundation" },
  { id: "bulking", title: "Bulking Program", goal: "Build muscle mass" },
  { id: "cutting", title: "Cutting Program", goal: "Lose fat and get lean" },
  { id: "senior", title: "Senior Fitness", goal: "Improve mobility and strength" },
];

export default function ProgramCard({ onSelect }: { onSelect?: (id: string) => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSelect = (id: string) => {
    if (onSelect) onSelect(id);
    else navigate(`/program/${id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {programDefs.map((program, i) => {
        const Icon = program.icon;
        const benefits = t[program.benefitsKey] as string[];
        return (
          <button
            key={program.id}
            onClick={() => handleSelect(program.id)}
            className="card-gradient rounded-lg p-6 text-left border border-border/50 hover:neon-border transition-all duration-300 group"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground">{t[program.titleKey] as string}</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">{t[program.descKey] as string}</p>
            <div className="flex flex-wrap gap-2">
              {benefits.map((b) => (
                <span key={b} className="text-xs bg-secondary px-2.5 py-1 rounded-full text-secondary-foreground">
                  {b}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { programs };
