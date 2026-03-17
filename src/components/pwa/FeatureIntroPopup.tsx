import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Brain, ClipboardCheck, Utensils, ShieldCheck, TrendingUp, Layers,
  ChevronRight, Dumbbell, Heart, AlertTriangle, Target, BarChart3,
  Download, Share2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Lang } from "@/contexts/LanguageContext";

const INTRO_SEEN_KEY = "fitai-intro-seen";
const HAS_PLAN_KEY = "fitai-has-created-plan";

const langs: { code: Lang; flag: string }[] = [
  { code: "en", flag: "🇬🇧" },
  { code: "id", flag: "🇮🇩" },
  { code: "zh", flag: "🇨🇳" },
];

const slides = {
  en: [
    {
      title: "Your AI Personal Trainer",
      desc: "Generate a fully personalized workout plan in seconds.",
      type: "ai" as const,
    },
    {
      title: "Smart Fitness Assessment",
      desc: "We analyze your goals, injuries, allergies, and fitness level before generating your plan.",
      type: "checklist" as const,
    },
    {
      title: "More Than Just Workouts",
      desc: "Surya-FitAi provides workout plans, meal plans, safety guidance, and fitness insights.",
      type: "features" as const,
    },
    {
      title: "Track and Share Your Progress",
      desc: "Track your workouts, download progress reports, and share achievements.",
      type: "progress" as const,
    },
  ],
  id: [
    {
      title: "Pelatih AI Pribadi Anda",
      desc: "Buat program latihan personal dalam hitungan detik.",
      type: "ai" as const,
    },
    {
      title: "Penilaian Kebugaran Cerdas",
      desc: "Kami menganalisis tujuan, cedera, alergi, dan tingkat kebugaran Anda sebelum membuat rencana.",
      type: "checklist" as const,
    },
    {
      title: "Lebih dari Sekadar Latihan",
      desc: "Surya-FitAi menyediakan program latihan, pola makan, panduan keamanan, dan wawasan kebugaran.",
      type: "features" as const,
    },
    {
      title: "Lacak dan Bagikan Progres Anda",
      desc: "Lacak latihan, unduh laporan progres, dan bagikan pencapaian Anda.",
      type: "progress" as const,
    },
  ],
  zh: [
    {
      title: "你的 AI 私人教练",
      desc: "几秒钟内生成完全个性化的训练计划。",
      type: "ai" as const,
    },
    {
      title: "智能健身评估",
      desc: "在生成计划之前，我们会分析您的目标、伤病、过敏和健身水平。",
      type: "checklist" as const,
    },
    {
      title: "不仅仅是训练",
      desc: "Surya-FitAi 提供训练计划、饮食计划、安全指导和健身洞察。",
      type: "features" as const,
    },
    {
      title: "追踪和分享你的进度",
      desc: "追踪训练、下载进度报告并分享成就。",
      type: "progress" as const,
    },
  ],
};

const ctaTexts = {
  en: { start: "Start My First Plan", skip: "Skip Intro" },
  id: { start: "Mulai Plan Pertama Saya", skip: "Lewati Intro" },
  zh: { start: "开始我的第一个计划", skip: "跳过介绍" },
};

const checklistItems = {
  en: ["Your fitness goals", "Injury history", "Food allergies", "Current fitness level"],
  id: ["Tujuan kebugaran Anda", "Riwayat cedera", "Alergi makanan", "Tingkat kebugaran saat ini"],
  zh: ["你的健身目标", "伤病史", "食物过敏", "当前健身水平"],
};

const featureItems = {
  en: [
    { icon: Dumbbell, label: "Workout Plans" },
    { icon: Utensils, label: "Meal Plans" },
    { icon: ShieldCheck, label: "Safety Guidance" },
    { icon: TrendingUp, label: "Fitness Insights" },
  ],
  id: [
    { icon: Dumbbell, label: "Program Latihan" },
    { icon: Utensils, label: "Pola Makan" },
    { icon: ShieldCheck, label: "Panduan Keamanan" },
    { icon: TrendingUp, label: "Wawasan Kebugaran" },
  ],
  zh: [
    { icon: Dumbbell, label: "训练计划" },
    { icon: Utensils, label: "饮食计划" },
    { icon: ShieldCheck, label: "安全指导" },
    { icon: TrendingUp, label: "健身洞察" },
  ],
};

const exerciseCards = {
  en: ["Push Ups", "Squats", "Deadlifts", "Planks"],
  id: ["Push Up", "Squat", "Deadlift", "Plank"],
  zh: ["俯卧撑", "深蹲", "硬拉", "平板支撑"],
};

interface FeatureIntroPopupProps {
  onDone: () => void;
}

// Staggered animation hook
function useSlideAnimation(active: boolean, itemCount: number) {
  const [visible, setVisible] = useState(false);
  const [visibleItems, setVisibleItems] = useState<boolean[]>([]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setVisibleItems([]);
      return;
    }
    const t1 = setTimeout(() => setVisible(true), 100);
    const timers: ReturnType<typeof setTimeout>[] = [t1];

    for (let i = 0; i < itemCount; i++) {
      const t = setTimeout(() => {
        setVisibleItems((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 400 + i * 120);
      timers.push(t);
    }

    return () => timers.forEach(clearTimeout);
  }, [active, itemCount]);

  return { visible, visibleItems };
}

// --- Slide Components ---

function SlideAI({ active, lang }: { active: boolean; lang: Lang }) {
  const cards = exerciseCards[lang];
  const { visible, visibleItems } = useSlideAnimation(active, cards.length);

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <div
        className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.5)",
        }}
      >
        <Brain className="w-10 h-10 text-primary" />
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
        {cards.map((card, i) => (
          <div
            key={card}
            className="rounded-xl bg-card border border-border/50 p-3 text-center transition-all duration-300"
            style={{
              opacity: visibleItems[i] ? 1 : 0,
              transform: visibleItems[i] ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <Dumbbell className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <span className="text-xs font-medium text-foreground">{card}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideChecklist({ active, lang }: { active: boolean; lang: Lang }) {
  const items = checklistItems[lang];
  const icons = [Target, AlertTriangle, Heart, BarChart3];
  const { visible, visibleItems } = useSlideAnimation(active, items.length);

  return (
    <div className="flex flex-col items-center gap-5 pt-4">
      <div
        className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.5)",
        }}
      >
        <ClipboardCheck className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-2.5 w-full max-w-[300px]">
        {items.map((item, i) => {
          const Icon = icons[i];
          return (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl bg-card border border-border/50 px-4 py-3 transition-all duration-300"
              style={{
                opacity: visibleItems[i] ? 1 : 0,
                transform: visibleItems[i] ? "translateX(0)" : "translateX(-20px)",
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlideFeatures({ active, lang }: { active: boolean; lang: Lang }) {
  const items = featureItems[lang];
  const { visible, visibleItems } = useSlideAnimation(active, items.length);

  return (
    <div className="flex flex-col items-center gap-5 pt-4">
      <div
        className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.5)",
        }}
      >
        <Layers className="w-8 h-8 text-primary" />
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-[300px]">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/50 p-4 transition-all duration-300"
            style={{
              opacity: visibleItems[i] ? 1 : 0,
              transform: visibleItems[i] ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground text-center">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideProgress({ active, lang }: { active: boolean; lang: Lang }) {
  const { visible, visibleItems } = useSlideAnimation(active, 3);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    const t = setTimeout(() => setProgress(78), 600);
    return () => clearTimeout(t);
  }, [active]);

  const icons = [
    { icon: BarChart3, label: lang === "en" ? "Track" : lang === "id" ? "Lacak" : "追踪" },
    { icon: Download, label: lang === "en" ? "Download" : lang === "id" ? "Unduh" : "下载" },
    { icon: Share2, label: lang === "en" ? "Share" : lang === "id" ? "Bagikan" : "分享" },
  ];

  return (
    <div className="flex flex-col items-center gap-5 pt-4">
      <div
        className="w-full max-w-[300px] rounded-2xl bg-card border border-border/50 p-5 transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">
            {lang === "en" ? "Weekly Progress" : lang === "id" ? "Progres Mingguan" : "每周进度"}
          </span>
          <span className="text-xs font-bold text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3 [&>div]:transition-all [&>div]:duration-1000 [&>div]:ease-out" />
      </div>

      <div className="flex gap-4">
        {icons.map((item, i) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1.5 transition-all duration-300"
            style={{
              opacity: visibleItems[i] ? 1 : 0,
              transform: visibleItems[i] ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Component ---

export default function FeatureIntroPopup({ onDone }: FeatureIntroPopupProps) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("fitai-language") as Lang) || "en";
  });
  const [current, setCurrent] = useState(0);
  const touchRef = useRef<{ startX: number; startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasPlan = localStorage.getItem(HAS_PLAN_KEY) === "true";
    const seen = localStorage.getItem(INTRO_SEEN_KEY) === "true";
    if (!hasPlan && !seen) setOpen(true);
  }, []);

  const handleLang = (code: Lang) => {
    setLang(code);
    localStorage.setItem("fitai-language", code);
  };

  const finish = useCallback(() => {
    localStorage.setItem(INTRO_SEEN_KEY, "true");
    setOpen(false);
    onDone();
  }, [onDone]);

  const goNext = () => setCurrent((p) => Math.min(p + 1, 3));
  const goPrev = () => setCurrent((p) => Math.max(p - 1, 0));

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchRef.current = null;
  };

  if (!open) return null;

  const t = slides[lang] || slides.en;
  const cta = ctaTexts[lang] || ctaTexts.en;
  const slide = t[current];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Language selector */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-full px-2 py-1 border border-border/50">
        {langs.map((l) => (
          <button
            key={l.code}
            onClick={() => handleLang(l.code)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
              lang === l.code
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <span className="text-sm">{l.flag}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={finish}
        className="absolute top-4 right-4 z-10 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm"
      >
        {cta.skip}
      </button>

      {/* Slide area */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Logo */}
        <div className="mb-4">
          <div className="w-14 h-14 rounded-2xl bg-card border border-primary/20 flex items-center justify-center overflow-hidden p-2 shadow-lg">
            <img src="/icons/icon-192.png" alt="Surya-FitAi" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Title & Description with stagger */}
        <div className="text-center mb-6" key={`text-${current}-${lang}`}>
          <h2
            className="text-2xl font-display font-bold text-foreground mb-2 transition-all duration-300 ease-out"
            style={{
              animation: "introFadeUp 0.3s ease-out 0.2s both",
            }}
          >
            {slide.title}
          </h2>
          <p
            className="text-sm text-muted-foreground max-w-[300px] mx-auto leading-relaxed"
            style={{
              animation: "introFadeUp 0.3s ease-out 0.3s both",
            }}
          >
            {slide.desc}
          </p>
        </div>

        {/* Animated content per slide */}
        <div className="w-full max-w-[340px]" key={`slide-${current}-${lang}`}>
          {slide.type === "ai" && <SlideAI active={true} lang={lang} />}
          {slide.type === "checklist" && <SlideChecklist active={true} lang={lang} />}
          {slide.type === "features" && <SlideFeatures active={true} lang={lang} />}
          {slide.type === "progress" && <SlideProgress active={true} lang={lang} />}
        </div>
      </div>

      {/* Bottom area: dots + buttons */}
      <div className="px-6 pb-8 pt-4 space-y-5">
        {/* Navigation dots with haptic-style micro-interactions */}
        <div className="flex items-center justify-center gap-2">
          {t.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-200 ease-out active:scale-75 active:duration-100 ${
                i === current
                  ? "w-8 h-2.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                  : "w-2.5 h-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50 active:bg-primary/60"
              }`}
              style={{
                transform: i === current ? "scale(1)" : undefined,
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA buttons with haptic feedback */}
        {current === 3 ? (
          <Button 
            className="w-full h-13 font-bold text-base gap-2 cta-bounce active:scale-[0.98] active:transition-transform active:duration-100" 
            onClick={finish}
          >
            {cta.start}
            <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button 
            className="w-full h-13 font-bold text-base gap-2 active:scale-[0.98] active:transition-transform active:duration-100" 
            onClick={goNext}
          >
            {lang === "en" ? "Next" : lang === "id" ? "Lanjut" : "下一步"}
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </div>

      <style>{`
        @keyframes introFadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ctaBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .cta-bounce {
          animation: ctaBounce 2s ease-in-out infinite;
        }
        .cta-bounce:active {
          animation: none;
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
