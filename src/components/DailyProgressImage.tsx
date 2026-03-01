import { useCallback, useRef, useEffect } from "react";
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
  const logoRef = useRef<HTMLImageElement | null>(null);

  // Preload logo image
  useEffect(() => {
    const img = new Image();
    img.src = "/images/surya-fitai-logo.png";
    img.onload = () => {
      logoRef.current = img;
    };
  }, []);

  const completedList = exercises.filter((ex) => completedExercises.includes(ex.name));
  const progress = totalExercises > 0 ? completedList.length / totalExercises : 0;

  const youVsYou =
    lang === "id"
      ? "KAMU VS KAMU!"
      : lang === "zh"
      ? "你对战你！"
      : "YOU VS YOU!";

  const thisIs =
    lang === "id"
      ? "INI ADALAH "
      : lang === "zh"
      ? "这是 "
      : "THIS IS ";

  const downloadLabel =
    lang === "id"
      ? "Unduh Kemajuan Harian"
      : lang === "zh"
      ? "下载每日进度"
      : "Download Daily Progress";

  const completedLabel = t.completed;

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
    const itemH = 52;
    const logoAreaH = 120;
    const taglineAreaH = 80;
    const fractionAreaH = 40;
    const listTopPad = 30;
    const footerH = 80;
    const headerH = logoAreaH + taglineAreaH + fractionAreaH;
    const listH = completedList.length * itemH;
    const H = headerH + listTopPad + listH + footerH + 20;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Transparent background
    ctx.clearRect(0, 0, W, H);

    // ── LOGO (graphical, centered, with glow) ──
    if (logoRef.current) {
      const logo = logoRef.current;
      const logoMaxW = 280;
      const aspect = logo.naturalWidth / logo.naturalHeight;
      const logoW = logoMaxW;
      const logoH = logoW / aspect;
      const logoX = (W - logoW) / 2;
      const logoY = 20;

      // Green glow behind logo
      ctx.save();
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(logo, logoX, logoY, logoW, logoH);
      ctx.restore();

      // Draw logo again without shadow for crispness
      ctx.drawImage(logo, logoX, logoY, logoW, logoH);
    } else {
      // Fallback: text logo if image not loaded
      ctx.textAlign = "center";
      ctx.font = "bold 48px 'Space Grotesk', system-ui, sans-serif";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#22c55e";
      ctx.fillText("Surya-FitAi", W / 2, 75);
      ctx.shadowBlur = 0;
    }

    // ── TAGLINE: "THIS IS YOU VS YOU! 🏆" ──
    const taglineY = logoAreaH + 30;
    ctx.textAlign = "center";

    // "THIS IS " in bold green
    ctx.font = "bold 30px 'Space Grotesk', system-ui, sans-serif";
    const thisIsWidth = ctx.measureText(thisIs).width;

    // "YOU VS YOU!" in bold italic green
    ctx.font = "bold italic 30px 'Space Grotesk', system-ui, sans-serif";
    const youVsYouWidth = ctx.measureText(youVsYou).width;

    // Trophy emoji
    ctx.font = "30px serif";
    const trophyWidth = ctx.measureText(" 🏆").width;

    const totalTaglineW = thisIsWidth + youVsYouWidth + trophyWidth;
    let tagX = (W - totalTaglineW) / 2;

    // Draw "THIS IS "
    ctx.textAlign = "left";
    ctx.font = "bold 30px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(thisIs, tagX, taglineY);
    tagX += thisIsWidth;

    // Draw "YOU VS YOU!" italic
    ctx.font = "bold italic 30px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(youVsYou, tagX, taglineY);
    tagX += youVsYouWidth;

    // Draw trophy
    ctx.font = "30px serif";
    ctx.fillText(" 🏆", tagX, taglineY);

    // ── PROGRESS FRACTION ──
    const fractionY = taglineY + 38;
    ctx.textAlign = "center";
    ctx.font = "bold 18px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText(
      `${completedList.length}/${totalExercises} ${completedLabel}`,
      W / 2,
      fractionY
    );

    // ── Measure max exercise name width for centering ──
    ctx.font = "bold 20px 'Space Grotesk', system-ui, sans-serif";
    let maxNameW = 0;
    completedList.forEach((ex) => {
      const w = ctx.measureText(ex.name).width;
      if (w > maxNameW) maxNameW = w;
    });

    // Group dimensions: bar(18) + gap(16) + checkCircle(30) + gap(14) + text
    const barWidth = 18;
    const gapBarToCheck = 16;
    const checkDiam = 30;
    const gapCheckToText = 14;
    const groupW = barWidth + gapBarToCheck + checkDiam + gapCheckToText + maxNameW;
    const groupLeft = (W - groupW) / 2;

    const barX = groupLeft + barWidth / 2;
    const barTop = headerH + listTopPad;
    const barHeight = listH;
    const barRadius = barWidth / 2;

    // Bar background track
    ctx.fillStyle = "rgba(200, 200, 200, 0.25)";
    roundedRect(ctx, barX - barWidth / 2, barTop, barWidth, barHeight, barRadius);
    ctx.fill();

    // Bar fill (from bottom)
    const fillHeight = barHeight * progress;
    if (fillHeight > 0) {
      ctx.save();
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 14;
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
      ctx.restore();
    }

    // ── EXERCISE LIST (centered as group) ──
    const listX = groupLeft + barWidth + gapBarToCheck + checkDiam / 2;
    ctx.textAlign = "left";
    completedList.forEach((ex, i) => {
      const y = barTop + i * itemH + 32;

      // Green checkmark circle
      ctx.beginPath();
      ctx.arc(listX, y - 6, 15, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.closePath();

      // White checkmark
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(listX - 5, y - 7);
      ctx.lineTo(listX - 1, y - 3);
      ctx.lineTo(listX + 6, y - 12);
      ctx.stroke();

      // Exercise name: white text with black stroke
      const textX = listX + checkDiam / 2 + gapCheckToText;
      ctx.font = "bold 20px 'Space Grotesk', system-ui, sans-serif";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeText(ex.name, textX, y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ex.name, textX, y);
    });

    // ── DATE (bottom center) ──
    const dateText = extractReadableDate(dayLabel).toLowerCase();
    ctx.textAlign = "center";
    ctx.font = "16px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(dateText, W / 2, H - 25);

    // Download
    const link = document.createElement("a");
    link.download = `surya-fitai-progress-${dateText.replace(/[, ]+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [completedList, totalExercises, dayLabel, lang, t, youVsYou, thisIs, completedLabel, progress]);

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
