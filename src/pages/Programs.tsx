import ProgramCard from "@/components/ProgramCard";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Programs() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">Choose Your <span className="text-gradient">Program</span></h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Select the program that matches your fitness goals. Our AI will create a fully personalized plan for you.</p>
        </div>
        <ProgramCard />
      </div>
    </div>
  );
}
