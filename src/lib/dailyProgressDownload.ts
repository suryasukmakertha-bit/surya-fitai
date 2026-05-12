interface Exercise { name: string; sets: string; reps: string; rest: string; }

export function downloadDailyProgress(opts: {
  dayLabel: string;
  exercises: Exercise[];
  completedExercises: string[];
  totalExercises: number;
  planMonthNumber?: number;
  lang: "en" | "id" | "zh";
}) {
  const { dayLabel, exercises, completedExercises, totalExercises, planMonthNumber = 1, lang } = opts;
  const completedList = exercises.filter((ex) => completedExercises.includes(ex.name));
  const exerciseNames = completedList.map((e) => e.name);

  const formatDate = (label: string): string => {
    const dateMatch = label.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch
      ? (() => { const [y, m, d] = dateMatch[1].split("-").map(Number); return new Date(y, m - 1, d); })()
      : new Date();
    const dayNames: Record<string, string[]> = {
      en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
      id: ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"],
      zh: ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"],
    };
    const monthNames: Record<string, string[]> = {
      en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      id: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
      zh: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    };
    const dayName = (dayNames[lang] || dayNames.en)[date.getDay()];
    const monthName = (monthNames[lang] || monthNames.en)[date.getMonth()];
    return `${dayName}, ${String(date.getDate()).padStart(2,"0")} ${monthName} ${date.getFullYear()}`;
  };

  const SCALE = 2;
  const W = 360;
  const PAD = 28;
  const GREEN = "#ff6b00";
  const DARK = "#111111";
  const WHITE = "#ffffff";

  const strings: Record<string, { brand: string; month: string; line1: string; line2: string; line3: string; subtitle: string; site: string }> = {
    id: { brand: "SURYAFITAI · COACH SURYA", month: `Bulan ${planMonthNumber}`, line1: "KAMU", line2: "VS", line3: "KAMU.", subtitle: `${exerciseNames.length} dari ${totalExercises} exercise selesai · ${formatDate(dayLabel)}`, site: "surya-fitai.com" },
    en: { brand: "SURYAFITAI · COACH SURYA", month: `Month ${planMonthNumber}`, line1: "YOU", line2: "VS", line3: "YOU.", subtitle: `${exerciseNames.length} of ${totalExercises} exercises done · ${formatDate(dayLabel)}`, site: "surya-fitai.com" },
    zh: { brand: "SURYAFITAI · COACH SURYA", month: `第${planMonthNumber}个月`, line1: "你", line2: "VS", line3: "你.", subtitle: `${exerciseNames.length}/${totalExercises} 个训练完成 · ${formatDate(dayLabel)}`, site: "surya-fitai.com" },
  };
  const s = strings[lang] || strings.id;

  const PILL_H = 52;
  const PILL_GAP = 8;
  const PILL_W = (W - PAD * 2 - PILL_GAP) / 2;
  const rows = Math.max(1, Math.ceil(exerciseNames.length / 2));
  const isOdd = exerciseNames.length % 2 !== 0;
  const gridH = exerciseNames.length === 0 ? 0 : rows * PILL_H + (rows - 1) * PILL_GAP;

  const HEADER_Y = PAD;
  const TITLE_Y = HEADER_Y + 40 + 22;
  const TITLE_LINE_H = 42;
  const SUBTITLE_Y = TITLE_Y + TITLE_LINE_H * 3 + 8;
  const GRID_Y = SUBTITLE_Y + 36 + 16;
  const FOOTER_Y = GRID_Y + gridH + 20;
  const CARD_H = FOOTER_Y + 36 + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(SCALE, SCALE);

  const anyCtx = ctx as CanvasRenderingContext2D & { roundRect?: (x:number,y:number,w:number,h:number,r:number)=>void };
  if (!anyCtx.roundRect) {
    anyCtx.roundRect = function (x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    };
  }

  ctx.clearRect(0, 0, W, CARD_H);
  const r = 20;
  const cardPath = () => {
    ctx.beginPath();
    ctx.moveTo(r,0); ctx.lineTo(W-r,0); ctx.quadraticCurveTo(W,0,W,r);
    ctx.lineTo(W,CARD_H-r); ctx.quadraticCurveTo(W,CARD_H,W-r,CARD_H);
    ctx.lineTo(r,CARD_H); ctx.quadraticCurveTo(0,CARD_H,0,CARD_H-r);
    ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath();
  };
  cardPath(); ctx.fillStyle = DARK; ctx.fill();
  cardPath();
  const grd = ctx.createRadialGradient(0, CARD_H, 0, 0, CARD_H, 140);
  grd.addColorStop(0, "rgba(255,107,0,0.10)");
  grd.addColorStop(1, "rgba(255,107,0,0)");
  ctx.fillStyle = grd; ctx.fill();

  ctx.save(); cardPath(); ctx.clip();

  ctx.beginPath(); ctx.arc(PAD+4, HEADER_Y+12, 4, 0, Math.PI*2); ctx.fillStyle = GREEN; ctx.fill();
  ctx.font = '700 11px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = GREEN; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(s.brand, PAD+16, HEADER_Y+12);

  ctx.font = '600 11px Inter, "Space Grotesk", system-ui, sans-serif';
  const pillText = s.month;
  const pillTextW = ctx.measureText(pillText).width;
  const pillPadX = 12;
  const pillW = pillTextW + pillPadX * 2;
  const pillH = 26;
  const pillX = W - PAD - pillW;
  const pillY = HEADER_Y;
  anyCtx.roundRect!(pillX, pillY, pillW, pillH, 6);
  ctx.fillStyle = "rgba(255,107,0,0.08)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,107,0,0.30)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "rgba(255,107,0,0.8)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(pillText, pillX + pillW/2, pillY + pillH/2);

  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.font = '900 38px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText(s.line1, PAD, TITLE_Y);
  ctx.fillText(s.line2, PAD, TITLE_Y + TITLE_LINE_H);
  ctx.fillStyle = GREEN;
  ctx.fillText(s.line3, PAD, TITLE_Y + TITLE_LINE_H * 2);

  ctx.font = '400 12px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.textBaseline = "top";
  ctx.fillText(s.subtitle, PAD, SUBTITLE_Y);

  exerciseNames.forEach((name, i) => {
    const isLastOdd = isOdd && i === exerciseNames.length - 1;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = isLastOdd ? PAD : PAD + col * (PILL_W + PILL_GAP);
    const y = GRID_Y + row * (PILL_H + PILL_GAP);
    const w = isLastOdd ? W - PAD * 2 : PILL_W;
    const h = PILL_H;
    anyCtx.roundRect!(x, y, w, h, 10);
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.stroke();
    const cx = x + 16 + 10; const cy = y + h / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,107,0,0.2)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx-4, cy); ctx.lineTo(cx-1, cy+3); ctx.lineTo(cx+4, cy-3.5);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    ctx.font = '500 12px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const textX = cx + 14; const maxTextW = x + w - textX - 12;
    let displayName = name;
    if (ctx.measureText(displayName).width > maxTextW) {
      while (displayName.length > 1 && ctx.measureText(displayName + "…").width > maxTextW) displayName = displayName.slice(0, -1);
      displayName = displayName + "…";
    }
    ctx.fillText(displayName, textX, cy);
  });

  ctx.font = '400 11px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(s.site, PAD, FOOTER_Y + 10);

  const totalText = `/${totalExercises}`;
  ctx.font = '400 13px Inter, "Space Grotesk", system-ui, sans-serif';
  const totalW = ctx.measureText(totalText).width;
  ctx.fillStyle = "rgba(255,255,255,0.30)"; ctx.textAlign = "left";
  ctx.fillText(totalText, W - PAD - totalW, FOOTER_Y + 10);
  ctx.font = '800 22px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = GREEN; ctx.textAlign = "right";
  ctx.fillText(`${exerciseNames.length}`, W - PAD - totalW - 2, FOOTER_Y + 10);

  ctx.restore();

  const link = document.createElement("a");
  const safeDate = formatDate(dayLabel).replace(/[, ]+/g, "-");
  link.download = `surya-fitai-${safeDate}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
