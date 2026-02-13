import { useNavigate } from "react-router-dom";
import { Dumbbell, Zap, Scissors, Heart } from "lucide-react";

const programs = [
  {
    id: "beginner",
    title: "Beginner Program",
    description: "Perfect for those new to gym and healthy lifestyle. Build a solid foundation with guided exercises.",
    icon: Heart,
    benefits: ["Learn proper form", "Build basic strength", "Establish routine", "Nutrition basics"],
    goal: "Build fitness foundation",
  },
  {
    id: "bulking",
    title: "Bulking Program",
    description: "Maximize muscle gain and mass building with high-volume training and caloric surplus plans.",
    icon: Dumbbell,
    benefits: ["Muscle hypertrophy", "Progressive overload", "High protein meals", "Recovery optimization"],
    goal: "Build muscle mass",
  },
  {
    id: "cutting",
    title: "Cutting Program",
    description: "Shed body fat while preserving muscle. Get defined and lean with strategic training and nutrition.",
    icon: Scissors,
    benefits: ["Fat loss focus", "Maintain muscle", "Calorie deficit meals", "HIIT integration"],
    goal: "Lose fat and get lean",
  },
  {
    id: "senior",
    title: "Senior Fitness",
    description: "Safe, adaptive workouts designed for older adults. Focus on mobility, balance, and functional strength.",
    icon: Zap,
    benefits: ["Joint-friendly exercises", "Balance training", "Flexibility focus", "Safe progression"],
    goal: "Improve mobility and strength",
  },
];

export default function ProgramCard({ onSelect }: { onSelect?: (id: string) => void }) {
  const navigate = useNavigate();

  const handleSelect = (id: string) => {
    if (onSelect) onSelect(id);
    else navigate(`/program/${id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {programs.map((program, i) => {
        const Icon = program.icon;
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
              <h3 className="text-xl font-display font-bold text-foreground">{program.title}</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">{program.description}</p>
            <div className="flex flex-wrap gap-2">
              {program.benefits.map((b) => (
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
