import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Brain, ClipboardCheck, Utensils, ShieldCheck, TrendingUp, Layers, ChevronRight, Globe,
} from "lucide-react";
import type { Lang } from "@/contexts/LanguageContext";

const INTRO_SEEN_KEY = "fitai-intro-seen";
const HAS_PLAN_KEY = "fitai-has-created-plan";

const langs: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "id", label: "ID" },
  { code: "zh", label: "中文" },
];

const texts = {
  en: {
    title: "Meet Surya-FitAi",
    subtitle: "Your AI-powered fitness planner.",
    cta: "Start My First Plan",
    features: [
      { icon: Brain, title: "AI Workout Plan Generator", desc: "Generate personalized workout programs powered by AI." },
      { icon: ClipboardCheck, title: "Detailed Fitness Assessment", desc: "Answer questions about injuries, allergies, and fitness level before generating your plan." },
      { icon: Utensils, title: "Workout Plan + Meal Plan", desc: "Get both training guidance and nutrition recommendations." },
      { icon: ShieldCheck, title: "Exercise Safety Information", desc: "Receive safety tips and guidance to reduce injury risk." },
      { icon: TrendingUp, title: "Track Your Progress", desc: "Track workouts and download or share progress to social media." },
      { icon: Layers, title: "Multiple Training Plans", desc: "Create and manage more than one workout plan." },
    ],
  },
  id: {
    title: "Kenalan dengan Surya-FitAi",
    subtitle: "Perencana kebugaran berbasis AI.",
    cta: "Mulai Plan Pertama Saya",
    features: [
      { icon: Brain, title: "Generator Program AI", desc: "Buat program latihan personal dengan teknologi AI." },
      { icon: ClipboardCheck, title: "Penilaian Kebugaran Detail", desc: "Jawab pertanyaan tentang cedera, alergi, dan tingkat kebugaran Anda." },
      { icon: Utensils, title: "Program Latihan + Pola Makan", desc: "Dapatkan panduan latihan dan rekomendasi nutrisi sekaligus." },
      { icon: ShieldCheck, title: "Info Keamanan Latihan", desc: "Dapatkan tips keamanan untuk mengurangi risiko cedera." },
      { icon: TrendingUp, title: "Lacak Progres Anda", desc: "Lacak latihan dan unduh atau bagikan progres ke media sosial." },
      { icon: Layers, title: "Banyak Rencana Latihan", desc: "Buat dan kelola lebih dari satu rencana latihan." },
    ],
  },
  zh: {
    title: "认识 Surya-FitAi",
    subtitle: "您的 AI 健身规划师。",
    cta: "开始我的第一个计划",
    features: [
      { icon: Brain, title: "AI 训练计划生成器", desc: "利用 AI 生成个性化训练计划。" },
      { icon: ClipboardCheck, title: "详细健身评估", desc: "回答有关伤病、过敏和健身水平的问题。" },
      { icon: Utensils, title: "训练计划 + 饮食计划", desc: "同时获得训练指导和营养建议。" },
      { icon: ShieldCheck, title: "运动安全信息", desc: "获取安全提示以降低受伤风险。" },
      { icon: TrendingUp, title: "追踪您的进度", desc: "追踪训练并下载或分享到社交媒体。" },
      { icon: Layers, title: "多个训练计划", desc: "创建和管理多个训练计划。" },
    ],
  },
};

interface FeatureIntroPopupProps {
  onDone: () => void;
}

export default function FeatureIntroPopup({ onDone }: FeatureIntroPopupProps) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const hasPlan = localStorage.getItem(HAS_PLAN_KEY) === "true";
    const seen = localStorage.getItem(INTRO_SEEN_KEY) === "true";
    if (!hasPlan && !seen) {
      setOpen(true);
    }
  }, []);

  const handleStart = () => {
    localStorage.setItem(INTRO_SEEN_KEY, "true");
    setOpen(false);
    onDone();
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      localStorage.setItem(INTRO_SEEN_KEY, "true");
      setOpen(false);
    }
  };

  const t = texts[lang] || texts.en;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto border-primary/20 p-0 rounded-2xl animate-enter">
        {/* Language selector */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                lang === l.code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-transparent pt-12 pb-4 px-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-black border border-primary/20 flex items-center justify-center overflow-hidden p-3 shadow-lg">
            <img src="/icons/icon-192.png" alt="Surya-FitAi" className="w-full h-full object-contain" />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-foreground">{t.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">{t.subtitle}</DialogDescription>
        </div>

        {/* Features */}
        <div className="px-5 pb-2 space-y-2.5">
          {t.features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 pb-5 pt-3">
          <Button className="w-full h-12 font-bold text-base gap-2" onClick={handleStart}>
            {t.cta}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
