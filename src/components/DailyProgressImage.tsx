import { useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadDailyProgress } from "@/lib/dailyProgressDownload";

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

interface DailyProgressImageProps {
  dayLabel: string;
  exercises: Exercise[];
  completedExercises: string[];
  totalExercises: number;
  planMonthNumber?: number;
}

export default function DailyProgressImage({
  dayLabel,
  exercises,
  completedExercises,
  totalExercises,
  planMonthNumber = 1,
}: DailyProgressImageProps) {
  const { lang, tKey } = useLanguage();
  const resolveExerciseName = (raw: string): string =>
    raw && raw.startsWith("exercise.") ? tKey(raw) : raw;

  const completedList = exercises.filter((ex) => completedExercises.includes(ex.name));

  const downloadLabel =
    lang === "id" ? "Unduh Kemajuan Harian" : lang === "zh" ? "下载每日进度" : "Download Daily Progress";

  const handleDownload = useCallback(() => {
    downloadDailyProgress({
      dayLabel,
      exercises,
      completedExercises,
      totalExercises,
      planMonthNumber,
      lang,
      resolveExerciseName,
    });
  }, [dayLabel, exercises, completedExercises, totalExercises, planMonthNumber, lang, tKey]);

  if (completedList.length === 0) return null;

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      size="sm"
      className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/10"
      aria-label={downloadLabel}
    >
      <Download className="w-4 h-4 mr-2" />
      {downloadLabel}
    </Button>
  );
}
