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
  monthNumber?: number;
}

interface DownloadProgressData {
  name: string;
  program: string;
  monthNumber: number;
  weight: number;
  bmi: number;
  targetCalories: number;
  completionPct: number;
  completedDays: number;
  totalDays: number;
  quote: string;
  language: string;
  dateStr: string;
}

function downloadProgressReport(data: DownloadProgressData) {
  const {
    name,
    program,
    monthNumber,
    weight,
    bmi,
    targetCalories,
    completionPct,
    completedDays,
    totalDays,
    quote,
    language,
    dateStr,
  } = data;

  // ── CONSTANTS ──────────────────────────────────────────
  const W = 390;
  const H = 630;
  const P = 24;
  const SCALE = 2;
  const G = '#ff6b00';
  const FONT = 'Inter, Arial, sans-serif';

  // ── LANGUAGE STRINGS ───────────────────────────────────
  const strings: Record<string, Record<string, string>> = {
    id: {
      brand:      'SURYA-FITAI · LAPORAN PROGRES',
      program_lbl:'PROGRAM',
      bulan:      `Bulan ${monthNumber}`,
      sub:        `${program} · Bulan ${monthNumber}`,
      berat:      'BERAT',
      imt:        'IMT',
      kcal:       'KCAL',
      durasi_lbl: 'DURASI',
      durasi_val: `${monthNumber} Bulan`,
      durasi_r:   '4 Minggu',
      comp:       'PENYELESAIAN WORKOUT',
      footer:     'surya-fitai.com · Coach Surya',
    },
    en: {
      brand:      'SURYA-FITAI · PROGRESS REPORT',
      program_lbl:'PROGRAM',
      bulan:      `Month ${monthNumber}`,
      sub:        `${program} · Month ${monthNumber}`,
      berat:      'WEIGHT',
      imt:        'BMI',
      kcal:       'KCAL',
      durasi_lbl: 'DURATION',
      durasi_val: `${monthNumber} Month`,
      durasi_r:   '4 Weeks',
      comp:       'WORKOUT COMPLETION',
      footer:     'surya-fitai.com · Coach Surya',
    },
    zh: {
      brand:      'SURYA-FITAI · 进度报告',
      program_lbl:'计划',
      bulan:      `第${monthNumber}个月`,
      sub:        `${program} · 第${monthNumber}个月`,
      berat:      '体重',
      imt:        'BMI',
      kcal:       '卡路里',
      durasi_lbl: '时长',
      durasi_val: `${monthNumber}个月`,
      durasi_r:   '4周',
      comp:       '训练完成度',
      footer:     'surya-fitai.com · Coach Surya',
    },
  };
  const s = strings[language] || strings.id;

  // ── HELPER: rounded rect path ──────────────────────────
  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

  // ── HELPER: arc progress ───────────────────────────────
  function drawArc(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pct: number,
    color: string,
    bgColor: string,
    lineW: number
  ) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = lineW;
    ctx.stroke();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (pct / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ── CREATE OFFSCREEN CANVAS ────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(SCALE, SCALE);

  // ── CLEAR (transparent background) ────────────────────
  ctx.clearRect(0, 0, W, H);

  // ══════════════════════════════════════════════════════
  // 1. OUTER CARD SHAPE — dark gradient, NOT green
  // ══════════════════════════════════════════════════════
  rr(ctx, 0, 0, W, H, 20);
  const cardBg = ctx.createLinearGradient(0, 0, W, H);
  cardBg.addColorStop(0, '#0f0f0f');
  cardBg.addColorStop(0.5, '#141414');
  cardBg.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = cardBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── CLIP everything to card shape ─────────────────────
  ctx.save();
  rr(ctx, 0, 0, W, H, 20);
  ctx.clip();

  // ══════════════════════════════════════════════════════
  // 2. BACKGROUND GLOWS (subtle, corner only)
  // ══════════════════════════════════════════════════════
  const glowTR = ctx.createRadialGradient(W, 0, 0, W, 0, 180);
  glowTR.addColorStop(0, 'rgba(255, 107, 0, 0.10)');
  glowTR.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = glowTR;
  ctx.fillRect(0, 0, W, H);

  const glowBL = ctx.createRadialGradient(0, H, 0, 0, H, 160);
  glowBL.addColorStop(0, 'rgba(255, 61, 127, 0.06)');
  glowBL.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowBL;
  ctx.fillRect(0, 0, W, H);

  // ══════════════════════════════════════════════════════
  // 3. HEADER — 3 green dots + brand text + name + sub
  // ══════════════════════════════════════════════════════
  const dotColors = [G, 'rgba(255,107,0,0.5)', 'rgba(255,107,0,0.2)'];
  const dotSizes = [3, 2.5, 2];
  dotColors.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(P + i * 14, 22, dotSizes[i], 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });

  ctx.font = `600 9px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 107, 0, 0.50)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(s.brand, P + 50, 16);

  ctx.font = `900 46px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.fillText(name.toUpperCase(), P, 34);

  const nameWidth = ctx.measureText(name.toUpperCase()).width;
  ctx.fillStyle = G;
  ctx.fillRect(P, 82, nameWidth, 2);

  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.textBaseline = 'top';
  ctx.fillText(s.sub, P, 92);

  // ══════════════════════════════════════════════════════
  // 4. STATS STRIP — 3 columns in one pill
  // ══════════════════════════════════════════════════════
  const SY = 118;
  const SH = 58;
  const SW = (W - P * 2) / 3;

  rr(ctx, P, SY, W - P * 2, SH, 12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const stats3: [string, string][] = [
    [s.berat, `${weight} kg`],
    [s.imt, `${bmi}`],
    [s.kcal, `${targetCalories}`],
  ];
  stats3.forEach(([label, value], i) => {
    const cx = P + i * SW + SW / 2;
    if (i > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(P + i * SW, SY + 10, 1, 38);
    }
    ctx.font = `600 8px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, cx, SY + 12);

    ctx.font = `700 19px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, cx, SY + 28);
  });

  // ══════════════════════════════════════════════════════
  // 5. DURASI ROW
  // ══════════════════════════════════════════════════════
  const DY = SY + SH + 10;
  rr(ctx, P, DY, W - P * 2, 44, 10);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `600 8px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(s.durasi_lbl, P + 14, DY + 10);

  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(s.durasi_val, P + 14, DY + 26);

  ctx.fillStyle = G;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(s.durasi_r, W - P - 14, DY + 26);

  // ══════════════════════════════════════════════════════
  // 6. COMPLETION BLOCK
  // ══════════════════════════════════════════════════════
  const CY = DY + 56;
  rr(ctx, P, CY, W - P * 2, 160, 16);
  const compBg = ctx.createLinearGradient(P, CY, W - P, CY + 160);
  compBg.addColorStop(0, 'rgba(255, 107, 0, 0.07)');
  compBg.addColorStop(1, 'rgba(255, 107, 0, 0.02)');
  ctx.fillStyle = compBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.30)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = `700 8px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 107, 0, 0.60)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(s.comp, P + 14, CY + 14);

  ctx.font = `900 60px ${FONT}`;
  ctx.fillStyle = G;
  ctx.textBaseline = 'top';
  ctx.fillText(`${completionPct}%`, P + 14, CY + 26);

  const acx = W - P - 60;
  const acy = CY + 82;
  drawArc(ctx, acx, acy, 46, completionPct, G, 'rgba(255,255,255,0.07)', 10);

  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${completedDays}/${totalDays}`, acx, acy);

  const bx = P + 14;
  const by = CY + 100;
  const bw = 188;
  const bh = 5;
  const fill = (completionPct / 100) * bw;
  rr(ctx, bx, by, bw, bh, 3);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  rr(ctx, bx, by, fill, bh, 3);
  ctx.fillStyle = G;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bx + fill, by + 2.5, 5, 0, Math.PI * 2);
  ctx.fillStyle = G;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + fill, by + 2.5, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 107, 0, 0.20)';
  ctx.fill();

  // ══════════════════════════════════════════════════════
  // 7. QUOTE
  // ══════════════════════════════════════════════════════
  const QY = CY + 172;
  ctx.fillStyle = G;
  ctx.fillRect(P, QY, 3, 28);

  ctx.font = `italic 400 12px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`"${quote}"`, P + 12, QY + 14);

  // ══════════════════════════════════════════════════════
  // 8. FOOTER
  // ══════════════════════════════════════════════════════
  const FY = H - 32;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(P, FY - 6, W - P * 2, 1);

  ctx.font = `400 9px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.footer, P, FY + 12);

  ctx.font = `600 9px ${FONT}`;
  ctx.fillStyle = G;
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - P, FY + 12);

  ctx.restore();

  // ── DOWNLOAD ───────────────────────────────────────────
  const link = document.createElement('a');
  link.download = `Surya-FitAi-Progress-${name}-${dateStr.replace(/\//g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export default function ProgressDownloadCard({
  userName,
  programName,
  duration,
  weight,
  bmi,
  calorieTarget,
  progressPercent,
  monthNumber = 1,
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

  const buildData = (): DownloadProgressData => {
    const pctClamped = Math.max(0, Math.min(pct, 100));
    const totalDays = 28;
    const completedDays = Math.round((pctClamped / 100) * totalDays);
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;

    return {
      name: userName,
      program: programName,
      monthNumber,
      weight,
      bmi: parseFloat(bmi) || 0,
      targetCalories: calorieTarget,
      completionPct: Math.round(pctClamped),
      completedDays,
      totalDays,
      quote: motText,
      language: lang,
      dateStr,
    };
  };

  const handleDownload = () => {
    try {
      downloadProgressReport(buildData());
      setShowShare(true);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Surya-FitAi Progress",
          text: shareCaption,
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

  // Reference unused prop to avoid lint complaints
  void duration;

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
