import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Layers, ClipboardCheck, Brain, BookmarkCheck, Dumbbell, TrendingUp, ChevronRight, Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const HAS_PLAN_KEY = "fitai-has-created-plan";

interface Step {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const texts: Record<string, { heading: string; subtitle: string; emptyMsg: string; cta: string; steps: Step[] }> = {
  en: {
    heading: "How Surya-FitAi Works",
    subtitle: "Follow these simple steps to get your personalized workout plan.",
    emptyMsg: "You don't have a workout plan yet.",
    cta: "Create Your First Plan",
    steps: [
      { icon: Layers, title: "Choose Your Program", desc: "Select the type of training program that matches your goal." },
      { icon: ClipboardCheck, title: "Fill Your Assessment", desc: "Answer questions about your fitness level, injuries, allergies, and training preferences." },
      { icon: Brain, title: "Generate and Save Your Plan", desc: "Our AI generates a personalized workout plan based on your answers. Save the plan to your account." },
      { icon: BookmarkCheck, title: "View Saved Plans", desc: "Access your saved workout plans anytime in the Saved Plans section. You can create multiple plans." },
      { icon: Dumbbell, title: "Start Your Workout", desc: "Follow the exercises and mark each exercise checkbox as completed." },
      { icon: TrendingUp, title: "Track and Download Progress", desc: "Track your daily progress and download or share your workout progress." },
    ],
  },
  id: {
    heading: "Cara Kerja Surya-FitAi",
    subtitle: "Ikuti langkah-langkah sederhana ini untuk mendapatkan program latihan personal Anda.",
    emptyMsg: "Anda belum memiliki program latihan.",
    cta: "Buat Plan Pertama Anda",
    steps: [
      { icon: Layers, title: "Pilih Program Anda", desc: "Pilih jenis program latihan yang sesuai dengan tujuan Anda." },
      { icon: ClipboardCheck, title: "Isi Penilaian Anda", desc: "Jawab pertanyaan tentang tingkat kebugaran, cedera, alergi, dan preferensi latihan Anda." },
      { icon: Brain, title: "Buat dan Simpan Plan", desc: "AI kami membuat program latihan personal berdasarkan jawaban Anda. Simpan ke akun Anda." },
      { icon: BookmarkCheck, title: "Lihat Plan Tersimpan", desc: "Akses program latihan tersimpan kapan saja di bagian Saved Plans. Anda bisa membuat banyak plan." },
      { icon: Dumbbell, title: "Mulai Latihan", desc: "Ikuti latihan dan tandai setiap checkbox latihan setelah selesai." },
      { icon: TrendingUp, title: "Lacak dan Unduh Progres", desc: "Lacak progres harian dan unduh atau bagikan progres latihan Anda." },
    ],
  },
  zh: {
    heading: "Surya-FitAi 使用指南",
    subtitle: "按照这些简单步骤获取您的个性化训练计划。",
    emptyMsg: "您还没有训练计划。",
    cta: "创建您的第一个计划",
    steps: [
      { icon: Layers, title: "选择您的计划", desc: "选择适合您目标的训练计划类型。" },
      { icon: ClipboardCheck, title: "填写评估", desc: "回答有关您的健身水平、伤病、过敏和训练偏好的问题。" },
      { icon: Brain, title: "生成并保存计划", desc: "我们的 AI 根据您的回答生成个性化训练计划。保存到您的账户。" },
      { icon: BookmarkCheck, title: "查看已保存的计划", desc: "随时在已保存计划中访问您的训练计划。您可以创建多个计划。" },
      { icon: Dumbbell, title: "开始训练", desc: "按照练习进行并在完成后勾选每个练习。" },
      { icon: TrendingUp, title: "追踪和下载进度", desc: "追踪每日进度并下载或分享您的训练进度。" },
    ],
  },
};

export default function HowItWorksGuide() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();

  const hasPlan = localStorage.getItem(HAS_PLAN_KEY) === "true";

  // Only show for new users or users without a plan
  if (hasPlan) return null;

  const t = texts[language] || texts.en;

  const handleCta = () => {
    if (user) {
      navigate("/programs");
    } else {
      navigate("/auth", { state: { redirectTo: "/programs" } });
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium tracking-wide uppercase">
              {language === "id" ? "Panduan" : language === "zh" ? "指南" : "Guide"}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            {t.heading}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.subtitle}</p>
        </div>

        {/* Steps — horizontal scroll on mobile, grid on desktop */}
        <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {t.steps.map((step, i) => (
            <div
              key={i}
              className="min-w-[260px] md:min-w-0 snap-center flex-shrink-0 card-gradient rounded-xl border border-border/50 p-5 group hover:neon-border transition-all duration-300 relative"
            >
              {/* Step number badge */}
              <div className="absolute -top-3 -left-1 md:left-4 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
                {i + 1}
              </div>

              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mt-2 group-hover:bg-primary/20 transition-colors">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-display font-bold text-foreground mb-1.5">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Empty state CTA */}
        <div className="mt-12 text-center">
          <div className="inline-block neon-border rounded-2xl p-8 md:p-10 max-w-md mx-auto">
            <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-5">{t.emptyMsg}</p>
            <Button size="lg" onClick={handleCta} className="h-12 px-8 font-bold gap-2">
              {t.cta}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
