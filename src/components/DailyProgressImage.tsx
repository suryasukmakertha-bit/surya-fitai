import { useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";


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
}

export default function DailyProgressImage({
  dayLabel,
  exercises,
  completedExercises,
  totalExercises,
}: DailyProgressImageProps) {
  const { t, lang } = useLanguage();

  const completedList = exercises.filter((ex) => completedExercises.includes(ex.name));
  const progress = totalExercises > 0 ? completedList.length / totalExercises : 0;

  const youVsYou =
    lang === "id"
      ? "INI ADALAH KAMU VS KAMU!"
      : lang === "zh"
      ? "这是你对战你！"
      : "THIS IS YOU VS YOU!";

  const downloadLabel =
    lang === "id"
      ? "Unduh Kemajuan Harian"
      : lang === "zh"
      ? "下载每日进度"
      : "Download Daily Progress";

  const completedLabel = t.completed;

  // Extract readable date from day label like "Week 1 - Friday, 2026-02-28 (Upper Body)"
  const extractReadableDate = (label: string): string => {
    const dateMatch = label.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return label;
    const [y, m, d] = dateMatch[1].split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames: Record<string, string[]> = {
      en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      zh: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
    };
    const dayName = (dayNames[lang] || dayNames.en)[date.getDay()];
    return `${dayName}, ${dateMatch[1]}`;
  };

  const handleDownload = useCallback(async () => {
    const canvas = document.createElement("canvas");
    const W = 800;
    const itemH = 44;
    const headerH = 220;
    const footerH = 80;
    const H = headerH + completedList.length * itemH + footerH + 40;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Transparent background
    ctx.clearRect(0, 0, W, H);

    // Draw "Surya-FitAi" text logo
    ctx.textAlign = "center";
    ctx.font = "bold 44px 'Space Grotesk', system-ui, sans-serif";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeText("Surya-FitAi", W / 2, 70);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Surya-FitAi", W / 2, 70);

    // "THIS IS YOU VS YOU!" header
    ctx.textAlign = "center";
    ctx.font = "bold 32px 'Space Grotesk', system-ui, sans-serif";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    const headerY = 120;

    // Split "YOU VS YOU" to highlight
    if (lang === "en") {
      const parts = youVsYou.split(/(YOU VS YOU!)/);
      let xOffset = 0;
      ctx.textAlign = "left";
      const fullWidth = ctx.measureText(youVsYou).width;
      const startX = (W - fullWidth) / 2;
      for (const part of parts) {
        if (part === "YOU VS YOU!") {
          ctx.fillStyle = "#22c55e";
          ctx.fillText(part, startX + xOffset, headerY);
          ctx.fillStyle = "#1a1a2e";
        } else {
          ctx.fillText(part, startX + xOffset, headerY);
        }
        xOffset += ctx.measureText(part).width;
      }
      // Trophy emoji
      ctx.font = "32px serif";
      ctx.fillText(" 🏆", startX + xOffset, headerY);
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = "#22c55e";
      ctx.fillText(youVsYou + " 🏆", W / 2, headerY);
    }

    // Progress fraction
    ctx.textAlign = "center";
    ctx.font = "bold 18px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText(
      `${completedList.length}/${totalExercises} ${completedLabel}`,
      W / 2,
      headerY + 40
    );

    // Vertical progress bar on the left
    const barX = 60;
    const barTop = headerH;
    const barHeight = completedList.length * itemH;
    const barWidth = 16;
    const barRadius = barWidth / 2;

    // Bar background
    ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
    roundedRect(ctx, barX - barWidth / 2, barTop, barWidth, barHeight, barRadius);
    ctx.fill();

    // Bar fill
    const fillHeight = barHeight * progress;
    if (fillHeight > 0) {
      // Glow
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#22c55e";
      roundedRect(
        ctx,
        barX - barWidth / 2,
        barTop + barHeight - fillHeight,
        barWidth,
        fillHeight,
        barRadius
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Exercise list
    const listX = 110;
    ctx.textAlign = "left";
    completedList.forEach((ex, i) => {
      const y = headerH + i * itemH + 28;

      // Green checkmark circle
      ctx.beginPath();
      ctx.arc(listX, y - 6, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.closePath();

      // White check
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(listX - 5, y - 7);
      ctx.lineTo(listX - 1, y - 3);
      ctx.lineTo(listX + 6, y - 12);
      ctx.stroke();

      // Exercise name — white with black stroke
      ctx.font = "600 20px 'Space Grotesk', system-ui, sans-serif";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeText(ex.name, listX + 28, y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ex.name, listX + 28, y);
    });

    // Date at bottom
    const dateText = extractReadableDate(dayLabel).toLowerCase();
    ctx.textAlign = "center";
    ctx.font = "16px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(dateText, W / 2, H - 30);

    // Download
    const link = document.createElement("a");
    link.download = `surya-fitai-progress-${dateText.replace(/[, ]+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [completedList, totalExercises, dayLabel, lang, t, youVsYou, completedLabel, progress]);

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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
