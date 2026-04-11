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
    const PAD = 40;
    const W = 800;
    const itemH = 64;
    const logoAreaH = 60;
    const taglineAreaH = 50;
    const fractionAreaH = 36;
    const listTopPad = 60;
    const footerH = 80;
    const headerH = PAD + logoAreaH + taglineAreaH + fractionAreaH;
    const listH = completedList.length * itemH;
    const H = headerH + listTopPad + listH + footerH + PAD;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Transparent background
    ctx.clearRect(0, 0, W, H);

    // ── SMALL LOGO + "FitAi" text at top center ──
    const logoY = PAD + 10;
    if (logoRef.current) {
      const logo = logoRef.current;
      const logoH = 44;
      const aspect = logo.naturalWidth / logo.naturalHeight;
      const logoW = logoH * aspect;

      // Measure "FitAi" text width for centering the group
      ctx.font = "bold 32px 'Space Grotesk', system-ui, sans-serif";
      const fitaiTextW = ctx.measureText("FitAi").width;
      const gap = 8;
      const totalW = logoW + gap + fitaiTextW;
      const startX = (W - totalW) / 2;

      // Draw logo small
      ctx.drawImage(logo, startX, logoY - logoH / 2 + 8, logoW, logoH);

      // Draw "FitAi" text
      ctx.textAlign = "left";
      ctx.font = "bold 32px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillStyle = "#4ade80";
      ctx.fillText("FitAi", startX + logoW + gap, logoY + 18);
    } else {
      ctx.textAlign = "center";
      ctx.font = "bold 32px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillStyle = "#4ade80";
      ctx.fillText("FitAi", W / 2, logoY + 18);
    }

    // ── TAGLINE: "THIS IS YOU VS YOU! 🏆" ──
    const taglineY = PAD + logoAreaH + 36;
    ctx.textAlign = "center";

    // Measure parts
    ctx.font = "bold 26px 'Space Grotesk', system-ui, sans-serif";
    const thisIsWidth = ctx.measureText(thisIs).width;

    ctx.font = "bold italic 26px 'Space Grotesk', system-ui, sans-serif";
    const youVsYouWidth = ctx.measureText(youVsYou).width;

    ctx.font = "26px serif";
    const trophyWidth = ctx.measureText(" 🏆").width;

    const totalTaglineW = thisIsWidth + youVsYouWidth + trophyWidth;
    let tagX = (W - totalTaglineW) / 2;

    // Draw "THIS IS "
    ctx.textAlign = "left";
    ctx.font = "bold 26px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#4ade80";
    ctx.fillText(thisIs, tagX, taglineY);
    tagX += thisIsWidth;

    // Draw "YOU VS YOU!" italic
    ctx.font = "bold italic 26px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#4ade80";
    ctx.fillText(youVsYou, tagX, taglineY);
    tagX += youVsYouWidth;

    // Draw trophy
    ctx.font = "26px serif";
    ctx.fillText(" 🏆", tagX, taglineY);

    // ── PROGRESS FRACTION ──
    const fractionY = taglineY + 32;
    ctx.textAlign = "center";
    ctx.font = "16px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(
      `${completedList.length}/${totalExercises} ${completedLabel}`,
      W / 2,
      fractionY
    );

    // ── EXERCISE LIST ──
    const listStartY = headerH + listTopPad;
    const listLeft = 140; // left-aligned area
    const barWidth = 6;
    const barX = listLeft;
    const checkRadius = 16;
    const gapBarToCheck = 24;
    const gapCheckToText = 16;

    // Green vertical bar (full height, with glow)
    const barTop = listStartY;
    const barHeight = listH;
    const barRadius = barWidth / 2;

    ctx.save();
    ctx.shadowColor = "#4ade80";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#4ade80";
    roundedRect(ctx, barX - barWidth / 2, barTop, barWidth, barHeight, barRadius);
    ctx.fill();
    ctx.restore();

    // Draw each exercise item
    const checkCenterX = barX + gapBarToCheck + checkRadius;
    ctx.textAlign = "left";
    completedList.forEach((ex, i) => {
      const y = listStartY + i * itemH + itemH / 2;

      // Green filled circle
      ctx.beginPath();
      ctx.arc(checkCenterX, y, checkRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.closePath();

      // White checkmark
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(checkCenterX - 6, y - 1);
      ctx.lineTo(checkCenterX - 2, y + 4);
      ctx.lineTo(checkCenterX + 7, y - 5);
      ctx.stroke();

      // Exercise name in white bold
      const textX = checkCenterX + checkRadius + gapCheckToText;
      ctx.font = "bold 22px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ex.name, textX, y + 7);
    });

    // ── DATE (bottom center) ──
    const dateText = extractReadableDate(dayLabel).toLowerCase();
    ctx.textAlign = "center";
    ctx.font = "15px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(dateText, W / 2, H - PAD);

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
