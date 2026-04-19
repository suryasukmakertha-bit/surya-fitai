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
    const DARK_CARD = "#111f11";
    const GREEN_BRIGHT = "#00ff66";
    const GREEN_DIM = "#1a3a1a";
    const GREEN_BORDER = "#1a4a1a";
    const WHITE = "#ffffff";
    const GRAY = "#8a9a8a";
    const CANVAS_BG = "#0d1f0d";

    // === CANVAS SETUP ===
    const SCALE = 2;
    const W = 780;
    const H = 1380;

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

    // ====== STEP 2: HEADER CARD (y:30, h:160) ======
    ctx.save();
    roundedPath(30, 30, 720, 160, 16);
    ctx.fillStyle = DARK_CARD;
    ctx.fill();

    // Brand label
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 22px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(s.brand, 50, 80);

    // User name
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 64px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.fillText(userName.toUpperCase(), 50, 150);

    // Subtitle
    ctx.fillStyle = GRAY;
    ctx.font = 'normal 22px Inter, sans-serif';
    ctx.fillText(`${programName} · ${duration}`, 50, 185);

    // Green dot
    ctx.beginPath();
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.arc(720, 80, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ====== STEP 3: STATS ROW (y:215, h:120) ======
    const statsData = [
      { label: s.weight, value: `${weight} kg` },
      { label: s.bmi, value: bmi },
      { label: s.kcal, value: `${calorieTarget}` },
    ];
    const statXs = [30, 270, 510];
    statsData.forEach((stat, i) => {
      const x = statXs[i];
      const y = 215;
      const w = 225;
      const h = 120;

      ctx.save();
      // Card background — explicit fillStyle reset
      roundedPath(x, y, w, h, 12);
      ctx.fillStyle = DARK_CARD;
      ctx.fill();

      // Green top bar
      ctx.fillStyle = GREEN_BRIGHT;
      ctx.fillRect(x + 12, y, w - 24, 4);

      // Label
      ctx.fillStyle = GRAY;
      ctx.font = 'normal 18px Inter, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(stat.label, x + w / 2, y + 50);

      // Value
      ctx.fillStyle = WHITE;
      ctx.font = 'bold 32px Inter, sans-serif';
      ctx.fillText(stat.value, x + w / 2, y + 95);
      ctx.restore();
    });

    // ====== STEP 4: DURATION ROW (y:355, h:70) ======
    ctx.save();
    roundedPath(30, 355, 720, 70, 12);
    ctx.fillStyle = DARK_CARD;
    ctx.fill();

    ctx.fillStyle = GRAY;
    ctx.font = 'normal 18px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.duration, 50, 382);

    ctx.fillStyle = WHITE;
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(s.durValue, 50, 412);

    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(s.durRight, 720, 412);
    ctx.restore();

    // ====== STEP 5: WORKOUT COMPLETION CARD (y:445, h:280) ======
    ctx.save();
    roundedPath(30, 445, 720, 280, 16);
    ctx.fillStyle = DARK_CARD;
    ctx.fill();
    ctx.strokeStyle = GREEN_BORDER;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.completion, 50, 485);

    // Big percentage
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 96px Inter, sans-serif';
    ctx.fillText(`${pctClamped}%`, 50, 590);

    // Progress bar track
    roundedPath(50, 620, 380, 8, 4);
    ctx.fillStyle = GREEN_DIM;
    ctx.fill();

    // Progress bar fill
    const fillW = (380 * pctClamped) / 100;
    if (fillW > 0) {
      roundedPath(50, 620, fillW, 8, 4);
      ctx.fillStyle = GREEN_BRIGHT;
      ctx.fill();
    }

    // Progress dot
    ctx.beginPath();
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.arc(50 + fillW, 624, 10, 0, Math.PI * 2);
    ctx.fill();

    // Circular ring track
    ctx.beginPath();
    ctx.strokeStyle = GREEN_DIM;
    ctx.lineWidth = 16;
    ctx.arc(600, 570, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Circular ring progress
    ctx.beginPath();
    ctx.strokeStyle = GREEN_BRIGHT;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * pctClamped) / 100;
    ctx.arc(600, 570, 80, startAngle, endAngle);
    ctx.stroke();
    ctx.lineCap = "butt";

    // Ring center text
    ctx.fillStyle = GRAY;
    ctx.font = 'normal 22px Inter, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${completedDays}/${totalDays}`, 600, 575);
    ctx.restore();

    // ====== STEP 6: QUOTE CARD (y:745, h:90) ======
    ctx.save();
    roundedPath(30, 745, 720, 90, 12);
    ctx.fillStyle = DARK_CARD;
    ctx.fill();

    // Green left accent bar
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.fillRect(30, 745, 5, 90);

    // Quote text
    ctx.fillStyle = "#e0e0e0";
    ctx.font = 'italic 22px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let quote = `"${motText}"`;
    const maxQuoteW = 640;
    if (ctx.measureText(quote).width > maxQuoteW) {
      while (quote.length > 4 && ctx.measureText(quote.slice(0, -1) + '..."').width > maxQuoteW) {
        quote = quote.slice(0, -1);
      }
      quote = quote.slice(0, -1) + '..."';
    }
    ctx.fillText(quote, 60, 800);
    ctx.restore();

    // ====== STEP 7: FOOTER (y:1350) ======
    ctx.save();
    ctx.fillStyle = GRAY;
    ctx.font = 'normal 18px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.footer, 30, 1350);

    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(dateStr, 750, 1350);
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
