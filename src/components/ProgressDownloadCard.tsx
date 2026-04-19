import { useState } from "react";
import { Download, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProgressDownloadProps {
  userName: string;
  programName: string;
  duration: string;
  weight: number;
  bmi: string;
  calorieTarget: number;
  progressPercent: number;
  weeklyAdherence?: number;
}

export default function ProgressDownloadCard({
  userName,
  programName,
  duration,
  weight,
  bmi,
  calorieTarget,
  progressPercent,
}: ProgressDownloadProps) {
  const { t, lang } = useLanguage();
  const [showShare, setShowShare] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const isComplete = progressPercent >= 100;

  const pct = Math.min(progressPercent, 100);
  const motText = isComplete
    ? t.motCompleted.replace(/[^\w\s.,!?'"()-]/g, "").trim()
    : t.motInProgress.replace(/[^\w\s.,!?'"()-]/g, "").trim();

  const shareCaption = isComplete
    ? "I just completed my training program with Surya-FitAi.\nConsistency. Discipline. Results.\n#SuryaFitAi #ProgressComplete #FitnessJourney"
    : "Making progress every day with Surya-FitAi\n#SuryaFitAi #FitnessJourney";

  const generateImage = async (): Promise<Blob> => {
    // === COLOR CONSTANTS ===
    const CARD_BG = "#0f1e0f";
    const CARD_BORDER = "#1f3a1f";
    const CANVAS_BG = "#091409";
    const GREEN_BRIGHT = "#00ff66";
    const GREEN_DIM = "#1a3a1a";
    const WORKOUT_BORDER = "#2a4a2a";
    const WHITE = "#ffffff";
    const GRAY = "#6a8a6a";

    // === CANVAS SETUP ===
    const SCALE = 2;
    const W = 780;
    const H = 1050;

    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.scale(SCALE, SCALE);

    // roundRect polyfill
    const anyCtx = ctx as CanvasRenderingContext2D & {
      roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
    };
    if (!anyCtx.roundRect) {
      anyCtx.roundRect = function (x, y, w, h, r) {
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
      };
    }
    const roundedPath = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      anyCtx.roundRect!(x, y, w, h, r);
    };
    const drawCard = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      borderColor: string = CARD_BORDER,
      borderWidth: number = 1
    ) => {
      ctx.save();
      roundedPath(x, y, w, h, r);
      ctx.fillStyle = CARD_BG;
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
      ctx.restore();
    };

    // === LANGUAGE STRINGS ===
    const strings: Record<
      string,
      {
        brand: string;
        weight: string;
        bmi: string;
        kcal: string;
        duration: string;
        durValue: string;
        durRight: string;
        completion: string;
        footer: string;
      }
    > = {
      id: {
        brand: "SURYA-FITAI · LAPORAN PROGRES",
        weight: "BERAT",
        bmi: "IMT",
        kcal: "KCAL",
        duration: "DURASI PROGRAM",
        durValue: "1 Bulan",
        durRight: "4 Minggu",
        completion: "PENYELESAIAN WORKOUT",
        footer: "surya-fitai.com · Coach Surya",
      },
      en: {
        brand: "SURYA-FITAI · PROGRESS REPORT",
        weight: "WEIGHT",
        bmi: "BMI",
        kcal: "KCAL",
        duration: "PROGRAM DURATION",
        durValue: "1 Month",
        durRight: "4 Weeks",
        completion: "WORKOUT COMPLETION",
        footer: "surya-fitai.com · Coach Surya",
      },
      zh: {
        brand: "SURYA-FITAI · 进度报告",
        weight: "体重",
        bmi: "BMI",
        kcal: "千卡",
        duration: "计划时长",
        durValue: "1 个月",
        durRight: "4 周",
        completion: "训练完成率",
        footer: "surya-fitai.com · Coach Surya",
      },
    };
    const s = strings[lang] || strings.id;

    const pctClamped = Math.max(0, Math.min(pct, 100));
    const completedDays = Math.round((pctClamped / 100) * 28);
    const totalDays = 28;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;

    // ====== STEP 1: CANVAS BACKGROUND ======
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, W, H);

    // ====== STEP 2: HEADER CARD (y:24, h:170) ======
    drawCard(28, 24, 724, 170, 14, CARD_BORDER, 1.5);

    ctx.save();
    // Brand label
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 18px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(s.brand, 50, 65);

    // User name
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 60px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.fillText(userName.toUpperCase(), 50, 135);

    // Subtitle
    ctx.fillStyle = GRAY;
    ctx.font = 'normal 20px Inter, sans-serif';
    ctx.fillText(`${programName} · ${duration}`, 50, 168);

    // Green dot
    ctx.beginPath();
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.arc(718, 70, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ====== STEP 3: STATS ROW (y:208, h:115) ======
    const statsData = [
      { label: s.weight, value: `${weight} kg` },
      { label: s.bmi, value: bmi },
      { label: s.kcal, value: `${calorieTarget}` },
    ];
    const statXs = [28, 265, 502];
    const STAT_W = 225;
    const STAT_H = 115;
    const STAT_Y = 208;
    statsData.forEach((stat, i) => {
      const x = statXs[i];

      // Card background
      drawCard(x, STAT_Y, STAT_W, STAT_H, 12);

      ctx.save();
      // Green top bar (3px)
      ctx.fillStyle = GREEN_BRIGHT;
      ctx.fillRect(x + 12, STAT_Y, STAT_W - 24, 3);

      // Label
      ctx.fillStyle = GRAY;
      ctx.font = 'normal 15px Inter, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(stat.label, x + STAT_W / 2, STAT_Y + 45);

      // Value
      ctx.fillStyle = WHITE;
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.fillText(stat.value, x + STAT_W / 2, STAT_Y + 90);
      ctx.restore();
    });

    // ====== STEP 4: DURATION ROW (y:337, h:72) ======
    drawCard(28, 337, 724, 72, 12);

    ctx.save();
    ctx.fillStyle = GRAY;
    ctx.font = 'normal 15px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.duration, 48, 361);

    ctx.fillStyle = WHITE;
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.fillText(s.durValue, 48, 391);

    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(s.durRight, 732, 391);
    ctx.restore();

    // ====== STEP 5: WORKOUT COMPLETION CARD (y:423, h:285) ======
    drawCard(28, 423, 724, 285, 16, WORKOUT_BORDER, 2);

    ctx.save();
    // Label
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.completion, 50, 463);

    // Big percentage
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 96px Inter, sans-serif';
    ctx.fillText(`${pctClamped}%`, 50, 568);

    // Progress bar track
    roundedPath(50, 598, 380, 8, 4);
    ctx.fillStyle = GREEN_DIM;
    ctx.fill();

    // Progress bar fill
    const fillW = (380 * pctClamped) / 100;
    if (fillW > 0) {
      roundedPath(50, 598, fillW, 8, 4);
      ctx.fillStyle = GREEN_BRIGHT;
      ctx.fill();
    }

    // Progress dot
    ctx.beginPath();
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.arc(50 + fillW, 602, 10, 0, Math.PI * 2);
    ctx.fill();

    // Circular ring track
    const ringCx = 600;
    const ringCy = 555;
    ctx.beginPath();
    ctx.strokeStyle = GREEN_DIM;
    ctx.lineWidth = 16;
    ctx.arc(ringCx, ringCy, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Circular ring progress
    ctx.beginPath();
    ctx.strokeStyle = GREEN_BRIGHT;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * pctClamped) / 100;
    ctx.arc(ringCx, ringCy, 80, startAngle, endAngle);
    ctx.stroke();
    ctx.lineCap = "butt";

    // Ring center text
    ctx.fillStyle = GRAY;
    ctx.font = 'normal 22px Inter, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${completedDays}/${totalDays}`, ringCx, ringCy);
    ctx.restore();

    // ====== STEP 6: QUOTE CARD (y:722, h:80) ======
    drawCard(28, 722, 724, 80, 12);

    ctx.save();
    // Green left accent bar
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.fillRect(28, 722, 5, 80);

    // Quote text
    ctx.fillStyle = "#d0d0d0";
    ctx.font = 'italic 19px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let quote = `"${motText}"`;
    const maxQuoteW = 660;
    if (ctx.measureText(quote).width > maxQuoteW) {
      while (quote.length > 4 && ctx.measureText(quote.slice(0, -1) + '..."').width > maxQuoteW) {
        quote = quote.slice(0, -1);
      }
      quote = quote.slice(0, -1) + '..."';
    }
    ctx.fillText(quote, 50, 762);
    ctx.restore();

    // ====== STEP 7: FOOTER (y:1010) ======
    ctx.save();
    ctx.fillStyle = GRAY;
    ctx.font = 'normal 16px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.footer, 30, 1010);

    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(dateStr, 750, 1010);
    ctx.restore();

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create image blob"));
        },
        "image/png"
      );
    });
  };

  const handleDownload = async () => {
    try {
      const blob = await generateImage();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Surya-FitAi-Progress-${userName.replace(/\s/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setShowShare(true);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const blob = await generateImage();
        const file = new File([blob], "surya-fitai-progress.png", { type: "image/png" });
        await navigator.share({
          title: "My Surya-FitAi Progress",
          text: shareCaption,
          files: [file],
        });
      } catch {
        // User cancelled
      }
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(shareCaption)}`,
        "_blank"
      );
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(shareCaption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleDownload} variant="secondary" size="sm">
          <Download className="w-4 h-4 mr-1" /> {t.downloadProgress || "Download Progress"}
        </Button>
        {showShare && (
          <>
            <Button onClick={handleShare} variant="secondary" size="sm">
              <Share2 className="w-4 h-4 mr-1" /> {t.shareProgress || "Share"}
            </Button>
            <Button onClick={handleCopyCaption} variant="outline" size="sm">
              {captionCopied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {captionCopied ? t.copied : t.copyCaption}
            </Button>
          </>
        )}
      </div>
      {showShare && (
        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-line border border-border/50">
          {shareCaption}
        </div>
      )}
    </div>
  );
}
