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
    const SCALE = 2;
    const W = 420;
    const PAD = 20;
    const GREEN = "#00ff78";
    const GREEN_DIM = "rgba(0,255,120,0.15)";
    const GREEN_TEXT = "#00ff78";
    const DARK = "#0e0f12";
    const PANEL = "#16181d";
    const PANEL_BORDER = "rgba(255,255,255,0.06)";
    const WHITE = "#ffffff";
    const MUTED = "rgba(255,255,255,0.45)";

    // i18n strings
    const strings: Record<string, { brand: string; subBrand: string; weight: string; bmi: string; kcal: string; duration: string; durValue: string; durRight: string; completion: string; motivation: string; footer: string }> = {
      id: {
        brand: "SURYA-FITAI · LAPORAN PROGRES",
        subBrand: `${programName} · ${duration}`,
        weight: "BERAT",
        bmi: "IMT",
        kcal: "KCAL",
        duration: "DURASI PROGRAM",
        durValue: "1 Bulan",
        durRight: "4 Minggu",
        completion: "PENYELESAIAN WORKOUT",
        motivation: motText,
        footer: "surya-fitai.com · Coach Surya",
      },
      en: {
        brand: "SURYA-FITAI · PROGRESS REPORT",
        subBrand: `${programName} · ${duration}`,
        weight: "WEIGHT",
        bmi: "BMI",
        kcal: "KCAL",
        duration: "PROGRAM DURATION",
        durValue: "1 Month",
        durRight: "4 Weeks",
        completion: "WORKOUT COMPLETION",
        motivation: motText,
        footer: "surya-fitai.com · Coach Surya",
      },
      zh: {
        brand: "SURYA-FITAI · 进度报告",
        subBrand: `${programName} · ${duration}`,
        weight: "体重",
        bmi: "BMI",
        kcal: "千卡",
        duration: "计划周期",
        durValue: "1 个月",
        durRight: "4 周",
        completion: "训练完成度",
        motivation: motText,
        footer: "surya-fitai.com · Coach Surya",
      },
    };
    const s = strings[lang] || strings.id;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

    // Layout
    const HEADER_H = 110;
    const STATS_H = 100;
    const DURATION_H = 70;
    const WORKOUT_H = 220;
    const QUOTE_H = 70;
    const FOOTER_H = 30;
    const GAP = 14;

    const HEADER_Y = PAD;
    const STATS_Y = HEADER_Y + HEADER_H + GAP;
    const DURATION_Y = STATS_Y + STATS_H + GAP;
    const WORKOUT_Y = DURATION_Y + DURATION_H + GAP;
    const QUOTE_Y = WORKOUT_Y + WORKOUT_H + GAP;
    const FOOTER_Y = QUOTE_Y + QUOTE_H + 24;
    const CARD_H = FOOTER_Y + FOOTER_H + PAD;

    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = CARD_H * SCALE;
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

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      anyCtx.roundRect!(x, y, w, h, r);
    };

    // Transparent background
    ctx.clearRect(0, 0, W, CARD_H);

    // Outer card
    const OUTER_R = 24;
    drawRoundRect(0, 0, W, CARD_H, OUTER_R);
    ctx.fillStyle = DARK;
    ctx.fill();

    // Subtle bottom-left green glow
    ctx.save();
    drawRoundRect(0, 0, W, CARD_H, OUTER_R);
    ctx.clip();
    const grd = ctx.createRadialGradient(0, CARD_H, 0, 0, CARD_H, 260);
    grd.addColorStop(0, "rgba(0,255,120,0.10)");
    grd.addColorStop(1, "rgba(0,255,120,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, CARD_H);
    ctx.restore();

    // Clip to card
    ctx.save();
    drawRoundRect(0, 0, W, CARD_H, OUTER_R);
    ctx.clip();

    // ====== HEADER PANEL ======
    drawRoundRect(PAD, HEADER_Y, W - PAD * 2, HEADER_H, 14);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.strokeStyle = PANEL_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Header label
    ctx.font = '700 11px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = GREEN_TEXT;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(s.brand, PAD + 18, HEADER_Y + 18);

    // Name big
    ctx.font = '900 38px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = WHITE;
    ctx.fillText(userName.toUpperCase(), PAD + 18, HEADER_Y + 36);

    // Sub line
    ctx.font = '400 13px Inter, sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(s.subBrand, PAD + 18, HEADER_Y + 80);

    // Status dot top right
    ctx.beginPath();
    ctx.arc(W - PAD - 22, HEADER_Y + 26, 7, 0, Math.PI * 2);
    ctx.fillStyle = GREEN;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W - PAD - 22, HEADER_Y + 26, 11, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,255,120,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ====== STATS ROW (3 cards) ======
    const statGap = 10;
    const statW = (W - PAD * 2 - statGap * 2) / 3;
    const statsData = [
      { label: s.weight, value: `${weight} kg` },
      { label: s.bmi, value: bmi },
      { label: s.kcal, value: `${calorieTarget}` },
    ];

    statsData.forEach((stat, i) => {
      const x = PAD + i * (statW + statGap);
      const y = STATS_Y;

      // panel
      drawRoundRect(x, y, statW, STATS_H, 12);
      ctx.fillStyle = PANEL;
      ctx.fill();
      ctx.strokeStyle = PANEL_BORDER;
      ctx.lineWidth = 1;
      ctx.stroke();

      // green top bar (rounded)
      const barW = statW - 32;
      drawRoundRect(x + 16, y - 2, barW, 4, 2);
      ctx.fillStyle = GREEN;
      ctx.fill();

      // label
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(stat.label, x + statW / 2, y + 18);

      // value
      ctx.font = '800 22px Inter, sans-serif';
      ctx.fillStyle = WHITE;
      ctx.fillText(stat.value, x + statW / 2, y + 44);
    });

    // ====== DURATION ROW ======
    drawRoundRect(PAD, DURATION_Y, W - PAD * 2, DURATION_H, 12);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.strokeStyle = PANEL_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(s.duration, PAD + 18, DURATION_Y + 14);

    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillStyle = WHITE;
    ctx.fillText(s.durValue, PAD + 18, DURATION_Y + 32);

    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillStyle = GREEN_TEXT;
    ctx.textAlign = "right";
    ctx.fillText(s.durRight, W - PAD - 18, DURATION_Y + 32);

    // ====== WORKOUT COMPLETION ======
    drawRoundRect(PAD, WORKOUT_Y, W - PAD * 2, WORKOUT_H, 14);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,255,120,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // label
    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillStyle = GREEN_TEXT;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(s.completion, PAD + 18, WORKOUT_Y + 16);

    // big % number
    ctx.font = '900 64px Inter, sans-serif';
    ctx.fillStyle = GREEN;
    ctx.textBaseline = "top";
    ctx.fillText(`${pct}%`, PAD + 18, WORKOUT_Y + 38);

    // slider track
    const trackY = WORKOUT_Y + 130;
    const trackX = PAD + 18;
    const trackW = 180;
    drawRoundRect(trackX, trackY, trackW, 4, 2);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fill();

    // slider fill
    drawRoundRect(trackX, trackY, (trackW * pct) / 100, 4, 2);
    ctx.fillStyle = GREEN;
    ctx.fill();

    // slider knob
    const knobX = trackX + (trackW * pct) / 100;
    ctx.beginPath();
    ctx.arc(knobX, trackY + 2, 7, 0, Math.PI * 2);
    ctx.fillStyle = GREEN;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(knobX, trackY + 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = DARK;
    ctx.fill();

    // Circular progress on right
    const ringCx = W - PAD - 70;
    const ringCy = WORKOUT_Y + WORKOUT_H / 2 + 4;
    const ringR = 56;
    const ringStroke = 12;

    // background ring
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = ringStroke;
    ctx.stroke();

    // progress arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * pct) / 100;
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, ringR, startAngle, endAngle);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = ringStroke;
    ctx.lineCap = "round";
    ctx.stroke();

    // ring center text
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${pct}/100`, ringCx, ringCy);

    // ====== QUOTE ======
    drawRoundRect(PAD, QUOTE_Y, W - PAD * 2, QUOTE_H, 12);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.strokeStyle = PANEL_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    // green left accent bar
    drawRoundRect(PAD + 6, QUOTE_Y + 12, 3, QUOTE_H - 24, 2);
    ctx.fillStyle = GREEN;
    ctx.fill();

    // quote text (truncate to one line if needed)
    ctx.font = 'italic 500 14px Inter, sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let quote = `"${s.motivation}"`;
    const maxQuoteW = W - PAD * 2 - 40;
    if (ctx.measureText(quote).width > maxQuoteW) {
      while (quote.length > 4 && ctx.measureText(quote.slice(0, -1) + '..."').width > maxQuoteW) {
        quote = quote.slice(0, -1);
      }
      quote = quote.slice(0, -1) + '..."';
    }
    ctx.fillText(quote, PAD + 22, QUOTE_Y + QUOTE_H / 2);

    // ====== FOOTER ======
    ctx.font = '400 11px Inter, sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(s.footer, PAD + 6, FOOTER_Y + 8);

    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillStyle = GREEN_TEXT;
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - PAD - 6, FOOTER_Y + 8);

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
