import { useNavigate, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HomeButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  if (location.pathname === "/") return null;

  return (
    <button
      onClick={() => navigate("/")}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      <Home className="w-4 h-4" />
      <span className="font-medium">Home</span>
    </button>
  );
}
