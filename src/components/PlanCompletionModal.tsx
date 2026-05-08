import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Flame, RefreshCw, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlanCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthNumber: number;
  totalWorkouts: number;
  totalActiveDays: number;
  onContinue: () => void;
  onStartFresh: () => void;
  loading?: boolean;
}

export default function PlanCompletionModal({
  open,
  onOpenChange,
  monthNumber,
  totalWorkouts,
  totalActiveDays,
  onContinue,
  onStartFresh,
  loading = false,
}: PlanCompletionModalProps) {
  const { lang, t } = useLanguage();

  const title =
    lang === "id"
      ? `Bulan ${monthNumber} Selesai! Kamu Luar Biasa!`
      : lang === "zh"
        ? `第${monthNumber}个月完成！你太棒了！`
        : `Month ${monthNumber} Complete! You're Amazing!`;

  const subtitle =
    lang === "id"
      ? "Konsistensimu membuahkan hasil. Lanjutkan momentum ini!"
      : lang === "zh"
        ? "你的坚持有了回报。保持这股势头！"
        : "Your consistency is paying off. Keep the momentum going!";

  const totalWorkoutsLabel =
    lang === "id" ? "Total Latihan Selesai" : lang === "zh" ? "完成的训练总数" : "Total Workouts Completed";
  const totalActiveDaysLabel =
    lang === "id" ? "Hari Aktif" : lang === "zh" ? "活跃天数" : "Days Active";

  const continueLabel =
    lang === "id"
      ? `Lanjut ke Bulan ${monthNumber + 1}`
      : lang === "zh"
        ? `继续第${monthNumber + 1}个月`
        : `Continue to Month ${monthNumber + 1}`;

  const startFreshLabel =
    lang === "id" ? "Mulai Program Baru" : lang === "zh" ? "开始新计划" : "Start New Program";

  const maybeLaterLabel =
    lang === "id" ? "Nanti saja" : lang === "zh" ? "稍后再说" : "Maybe later";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-primary/30 shadow-2xl shadow-primary/20 p-0 overflow-hidden">
        <span
          className="absolute right-3 top-10 z-10 pointer-events-none select-none"
          style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}
        >
          {maybeLaterLabel}
        </span>
        <div className="p-8 text-center space-y-6">
          {/* Celebration icon */}
          <div className="flex justify-center" aria-hidden="true">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center animate-bounce">
              <Trophy size={48} style={{ color: "#ff6b00" }} strokeWidth={1.5} />
            </div>
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-2xl font-display font-bold text-foreground leading-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground inline-flex items-center justify-center gap-1.5 flex-wrap">
              <Sparkles size={20} style={{ color: "#ff6b00" }} strokeWidth={1.5} />
              <span>{subtitle}</span>
            </DialogDescription>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
              <p className="text-3xl font-bold text-primary">{totalWorkouts}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{totalWorkoutsLabel}</p>
            </div>
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
              <p className="text-3xl font-bold text-primary">{totalActiveDays}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{totalActiveDaysLabel}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={onContinue}
              disabled={loading}
              className="flex-1 h-12 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="truncate">{(t as any).extendingPlan}</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  <span className="truncate">{continueLabel}</span>
                </>
              )}
            </Button>
            <Button
              onClick={onStartFresh}
              disabled={loading}
              variant="outline"
              className="flex-1 h-12 text-base font-semibold border-primary/40 hover:bg-primary/10"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              <span className="truncate">{startFreshLabel}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
