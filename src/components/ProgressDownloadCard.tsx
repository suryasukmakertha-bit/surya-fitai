import { useState } from "react";
import { Download, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlanProgress } from "@/lib/planProgress";

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
  /** Real completed workout days for this plan (single source of truth). */
  completedDays?: number;
  /** Real total workout days for this plan (totalWeeks * workoutsPerWeek). */
  totalDays?: number;
  /** Total weeks in the plan, used in PNG "DURASI" right-side label. */
  totalWeeks?: number;
  /** Plan id — when provided, fresh progress is re-fetched from DB at download time. */
  planId?: string;
  /** plan_data — used together with planId to recompute total workout days. */
  planData?: any;
  /** plan_started_at — scopes recompute to current month (extend-aware). */
  planStartedAt?: string | null;
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
  const _totalWeeks = (data as any).totalWeeks as number | undefined;

  // ── CONSTANTS ──────────────────────────────────────────
  const W = 390;
  const H = 600;
  const P = 28;
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
      durasi_r:   `${_totalWeeks ?? 4} Minggu`,
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
      durasi_r:   `${_totalWeeks ?? 4} Weeks`,
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
      durasi_r:   `${_totalWeeks ?? 4}周`,
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

  // ── FULLY TRANSPARENT BASE ────────────────────────────
  ctx.clearRect(0, 0, W, H);

  // ── HELPER: drop-shadow text (painted twice for punch)
  const shadowText = (
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: CanvasTextAlign = 'left',
    baseline: CanvasTextBaseline = 'top'
  ) => {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  // ══════════════════════════════════════════════════════
  // 1. EYEBROW — 3 dots (first orange) + brand label
  // ══════════════════════════════════════════════════════
  let y = P;
  const dotColors = [G, '#444', '#444'];
  dotColors.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(P + 3.5 + i * 12, y + 4, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
  shadowText(s.brand, P + 48, y, `700 11px ${FONT}`, '#ff8c3d', 'left', 'top');

  // ══════════════════════════════════════════════════════
  // 2. NAME (no box, shadow only) + thin orange rule + meta
  // ══════════════════════════════════════════════════════
  y += 14;
  shadowText(name.toUpperCase(), P, y, `900 42px ${FONT}`, '#ffffff', 'left', 'top');
  y += 48;
  ctx.fillStyle = G;
  ctx.fillRect(P, y, 56, 3);
  y += 11;
  shadowText(s.sub, P, y, `500 12px ${FONT}`, '#cccccc', 'left', 'top');

  // ══════════════════════════════════════════════════════
  // 3. STATS ROW — rgba(0,0,0,0.72)
  // ══════════════════════════════════════════════════════
  y += 24;
  const innerW = W - P * 2;
  const SH = 64;
  rr(ctx, P, y, innerW, SH, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fill();
  const SW = innerW / 3;
  const stats3: [string, string][] = [
    [s.berat, `${weight} kg`],
    [s.imt, `${bmi}`],
    [s.kcal, `${targetCalories}`],
  ];
  stats3.forEach(([label, value], i) => {
    const cx = P + i * SW + SW / 2;
    shadowText(label, cx, y + 14, `700 9px ${FONT}`, '#999999', 'center', 'top');
    shadowText(value, cx, y + 30, `800 18px ${FONT}`, '#ffffff', 'center', 'top');
  });
  y += SH + 12;

  // ══════════════════════════════════════════════════════
  // 4. DURATION ROW — rgba(0,0,0,0.72)
  // ══════════════════════════════════════════════════════
  const DH = 52;
  rr(ctx, P, y, innerW, DH, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fill();
  shadowText(s.durasi_lbl, P + 16, y + 10, `700 9px ${FONT}`, '#999999', 'left', 'top');
  shadowText(s.durasi_val, P + 16, y + 23, `700 16px ${FONT}`, '#ffffff', 'left', 'top');
  shadowText(s.durasi_r, W - P - 16, y + 18, `800 16px ${FONT}`, G, 'right', 'top');
  y += DH + 12;

  // ══════════════════════════════════════════════════════
  // 5. COMPLETION BOX — rgba(0,0,0,0.72) + orange border
  // ══════════════════════════════════════════════════════
  const CH = 92;
  rr(ctx, P, y, innerW, CH, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fill();
  rr(ctx, P, y, innerW, CH, 16);
  ctx.strokeStyle = 'rgba(255,107,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  shadowText(s.comp, P + 18, y + 16, `700 10px ${FONT}`, '#ff8c3d', 'left', 'top');
  shadowText(`${completionPct}%`, P + 18, y + 32, `900 40px ${FONT}`, '#ffffff', 'left', 'top');

  // Ring — kept exactly as conic style (orange arc + dark hole + fraction)
  const ringR = 32;
  const acx = W - P - 18 - ringR;
  const acy = y + CH / 2;
  // background track
  ctx.beginPath();
  ctx.arc(acx, acy, ringR - 5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 9;
  ctx.stroke();
  // orange progress
  ctx.beginPath();
  ctx.arc(acx, acy, ringR - 5, -Math.PI / 2, -Math.PI / 2 + (completionPct / 100) * Math.PI * 2);
  ctx.strokeStyle = G;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.stroke();
  // fraction centered (no shadow on this — sits on solid dark already)
  ctx.save();
  ctx.font = `700 11px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 6;
  ctx.fillText(`${completedDays}/${totalDays}`, acx, acy);
  ctx.restore();

  y += CH + 16;

  // ══════════════════════════════════════════════════════
  // 6. QUOTE — orange left border + italic text
  // ══════════════════════════════════════════════════════
  ctx.fillStyle = G;
  ctx.fillRect(P, y, 3, 28);
  shadowText(`"${quote}"`, P + 12, y + 14, `italic 400 12px ${FONT}`, '#dddddd', 'left', 'middle');
  y += 36;

  // ══════════════════════════════════════════════════════
  // 7. FOOTER — left brand · right date
  // ══════════════════════════════════════════════════════
  const FY = H - P;
  shadowText(s.footer, P, FY, `700 11px ${FONT}`, '#cccccc', 'left', 'bottom');
  shadowText(dateStr, W - P, FY, `700 11px ${FONT}`, '#cccccc', 'right', 'bottom');

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
  completedDays: completedDaysProp,
  totalDays: totalDaysProp,
  totalWeeks: totalWeeksProp,
  planId,
  planData,
  planStartedAt,
}: ProgressDownloadProps) {
  const { t, lang } = useLanguage();
  const [showShare, setShowShare] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  // Prefer real completion data when provided; fall back to legacy progressPercent.
  const realTotalDays = totalDaysProp && totalDaysProp > 0 ? totalDaysProp : 28;
  const realCompletedDays = Math.max(0, Math.min(realTotalDays, completedDaysProp ?? 0));
  const computedPct = totalDaysProp && totalDaysProp > 0
    ? Math.round((realCompletedDays / realTotalDays) * 100)
    : Math.max(0, Math.min(100, progressPercent));
  const pct = computedPct;
  const isComplete = totalDaysProp && totalDaysProp > 0
    ? realCompletedDays >= realTotalDays && realTotalDays > 0
    : pct >= 100;
  const motText = isComplete
    ? t.motCompleted.replace(/[^\w\s.,!?'"()-]/g, "").trim()
    : t.motInProgress.replace(/[^\w\s.,!?'"()-]/g, "").trim();

  const shareCaption = isComplete
    ? "I just completed my training program with Surya-FitAi.\nConsistency. Discipline. Results.\n#SuryaFitAi #ProgressComplete #FitnessJourney"
    : "Making progress every day with Surya-FitAi\n#SuryaFitAi #FitnessJourney";

  const buildData = (override?: { completedDays: number; totalDays: number; pct: number; totalWeeks?: number }): DownloadProgressData => {
    const pctClamped = Math.max(0, Math.min(override?.pct ?? pct, 100));
    const totalDays = override?.totalDays ?? realTotalDays;
    const completedDays = override
      ? override.completedDays
      : totalDaysProp && totalDaysProp > 0
        ? realCompletedDays
        : Math.round((pctClamped / 100) * totalDays);
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;

    const effectiveTotalWeeks = override?.totalWeeks ?? totalWeeksProp;
    return {
      name: userName,
      program: programName,
      monthNumber,
      weight,
      bmi: parseFloat(bmi) || 0,
      targetCalories: calorieTarget,
      completionPct: pctClamped,
      completedDays,
      totalDays,
      quote: motText,
      language: lang,
      dateStr,
      // Pass through totalWeeks for the DURASI right label (consumed via cast).
      ...(effectiveTotalWeeks ? { totalWeeks: effectiveTotalWeeks } as any : {}),
    };
  };

  const handleDownload = async () => {
    try {
      let override: { completedDays: number; totalDays: number; pct: number; totalWeeks?: number } | undefined;
      if (planId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            const fresh = await getPlanProgress(user.id, {
              id: planId,
              plan_data: planData,
              plan_started_at: planStartedAt ?? null,
            });
            override = {
              completedDays: fresh.completedDays,
              totalDays: fresh.totalDays,
              pct: fresh.percentage,
              totalWeeks: fresh.totalWeeks,
            };
          }
        } catch (err) {
          console.warn("Fresh progress fetch failed, using prop values:", err);
        }
      }
      downloadProgressReport(buildData(override));
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
