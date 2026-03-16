import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Layers,
  ClipboardCheck,
  BookmarkCheck,
  Dumbbell,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LANG_OPTIONS: { value: Lang; flag: string; label: string }[] = [
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "id", flag: "🇮🇩", label: "Indonesia" },
  { value: "zh", flag: "🇨🇳", label: "中文" },
];

const HAS_PLAN_KEY = "fitai-has-created-plan";
const GUIDE_SEEN_KEY = "fitai-guide-popup-seen";

interface Step {
  icon: LucideIcon;
  title: string;
}

const texts: Record<string, { title: string; cta: string; close: string; steps: Step[] }> = {
  en: {
    title: "How Surya-FitAi Works",
    cta: "Start My First Plan",
    close: "Close",
    steps: [
      { icon: Layers, title: "Choose Program" },
      { icon: ClipboardCheck, title: "Fill Your Data" },
      { icon: BookmarkCheck, title: "Save Your Plan" },
      { icon: Dumbbell, title: "Start Your Workout" },
      { icon: TrendingUp, title: "Track and Download Progress" },
    ],
  },
  id: {
    title: "Cara Kerja Surya-FitAi",
    cta: "Buat Plan Pertama",
    close: "Tutup",
    steps: [
      { icon: Layers, title: "Pilih Program" },
      { icon: ClipboardCheck, title: "Isi Data Anda" },
      { icon: BookmarkCheck, title: "Simpan Plan" },
      { icon: Dumbbell, title: "Mulai Latihan" },
      { icon: TrendingUp, title: "Lacak dan Unduh Progres" },
    ],
  },
  zh: {
    title: "Surya-FitAi 使用指南",
    cta: "创建第一个计划",
    close: "关闭",
    steps: [
      { icon: Layers, title: "选择计划" },
      { icon: ClipboardCheck, title: "填写数据" },
      { icon: BookmarkCheck, title: "保存计划" },
      { icon: Dumbbell, title: "开始训练" },
      { icon: TrendingUp, title: "追踪和下载进度" },
    ],
  },
};

export default function HowItWorksPopup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();

  const hasPlan = localStorage.getItem(HAS_PLAN_KEY) === "true";
  const guideSeen = localStorage.getItem(GUIDE_SEEN_KEY) === "true";

  const [open, setOpen] = useState(!hasPlan && !guideSeen);

  const t = texts[lang] || texts.en;

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(GUIDE_SEEN_KEY, "true");
  };

  const handleCta = () => {
    handleClose();
    if (user) {
      navigate("/programs");
    } else {
      navigate("/auth", { state: { redirectTo: "/programs" } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm mx-auto rounded-xl">
        {/* Language switcher flags */}
        <div className="absolute top-3.5 right-12 flex items-center gap-0.5">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLang(opt.value)}
              className={`text-base w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                lang === opt.value
                  ? "bg-primary/15 ring-1 ring-primary scale-110"
                  : "opacity-40 hover:opacity-80 hover:bg-muted"
              }`}
              title={opt.label}
            >
              {opt.flag}
            </button>
          ))}
        </div>

        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-center">
            {t.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Steps to get started with Surya-FitAi
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          {t.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                {i + 1}
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{step.title}</span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button onClick={handleCta} className="w-full font-bold gap-1">
            {t.cta} <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={handleClose} className="w-full text-muted-foreground">
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
