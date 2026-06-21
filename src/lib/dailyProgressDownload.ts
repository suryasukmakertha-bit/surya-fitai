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
  const PAD = 24;
  const ORANGE = "#ff6b00";
  const ORANGE_SOFT = "#ff8c3d";
  const WHITE = "#ffffff";

  const strings: Record<string, { brand: string; month: string; line1: string; line2: string; line3: string; subtitle: string; site: string }> = {
    id: { brand: "SURYAFITAI · COACH SURYA", month: `Bulan ${planMonthNumber}`, line1: "KAMU", line2: "VS", line3: "KAMU.", subtitle: `${exerciseNames.length} dari ${totalExercises} exercise selesai · ${formatDate(dayLabel)}`, site: "surya-fitai.com" },
    en: { brand: "SURYAFITAI · COACH SURYA", month: `Month ${planMonthNumber}`, line1: "YOU", line2: "VS", line3: "YOU.", subtitle: `${exerciseNames.length} of ${totalExercises} exercises done · ${formatDate(dayLabel)}`, site: "surya-fitai.com" },
    zh: { brand: "SURYAFITAI · COACH SURYA", month: `第${planMonthNumber}个月`, line1: "你", line2: "VS", line3: "你.", subtitle: `${exerciseNames.length}/${totalExercises} 个训练完成 · ${formatDate(dayLabel)}`, site: "surya-fitai.com" },
  };
  const s = strings[lang] || strings.id;

  // Grid: 2 cols at 88% width
  const GRID_W = Math.round(W * 0.88);
  const GRID_X = Math.round((W - GRID_W) / 2);
  const PILL_GAP = 9;
  const PILL_W = (GRID_W - PILL_GAP) / 2;
  const PILL_H = 44;
  const rows = Math.max(1, Math.ceil(exerciseNames.length / 2));
  const isOdd = exerciseNames.length % 2 !== 0;
  const gridH = exerciseNames.length === 0 ? 0 : rows * PILL_H + (rows - 1) * PILL_GAP;

  const HEADER_Y = PAD;           // eyebrow row center y baseline area
  const HEADER_H = 26;            // pill height
  const TITLE_Y = HEADER_Y + HEADER_H + 18;
  const TITLE_LINE_H = 40;
  const TITLE_BLOCK_H = TITLE_LINE_H * 3;
  const RULE_Y = TITLE_Y + TITLE_BLOCK_H + 4;
  const SUBTITLE_Y = RULE_Y + 3 + 14;
  const GRID_Y = SUBTITLE_Y + 14 + 22;
  const DIVIDER_Y = GRID_Y + gridH + 18;
  const FRAC_Y = DIVIDER_Y + 18;
  const URL_Y = FRAC_Y + 22;
  const CARD_H = URL_Y + 12 + PAD;

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

  // FULLY TRANSPARENT base canvas — paint nothing on the canvas itself.
  ctx.clearRect(0, 0, W, CARD_H);

  // Shadow helper: paint text twice for legibility punch.
  const drawTextShadowed = (text: string, x: number, y: number) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const CX = W / 2;

  // ===== EYEBROW ROW (centered): [dot brand] · [month pill] =====
  ctx.font = '700 11px Inter, "Space Grotesk", system-ui, sans-serif';
  const brandW = ctx.measureText(s.brand).width;
  const dotW = 6;
  const dotGap = 8;
  const sepText = "·";
  const sepGap = 10;
  ctx.font = '600 11px Inter, "Space Grotesk", system-ui, sans-serif';
  const sepW = ctx.measureText(sepText).width;
  const pillTextW = ctx.measureText(s.month).width;
  const pillPadX = 11;
  const pillW = pillTextW + pillPadX * 2;
  const pillH = 22;

  const eyebrowTotalW = dotW + dotGap + brandW + sepGap + sepW + sepGap + pillW;
  let eyeX = CX - eyebrowTotalW / 2;
  const eyeCY = HEADER_Y + HEADER_H / 2;

  // dot
  ctx.beginPath(); ctx.arc(eyeX + dotW / 2, eyeCY, dotW / 2, 0, Math.PI * 2);
  ctx.fillStyle = ORANGE; ctx.fill();
  eyeX += dotW + dotGap;

  // brand text
  ctx.font = '700 11px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = ORANGE_SOFT; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  drawTextShadowed(s.brand, eyeX, eyeCY);
  eyeX += brandW + sepGap;

  // separator
  ctx.font = '600 11px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = "#777";
  ctx.fillText(sepText, eyeX, eyeCY);
  eyeX += sepW + sepGap;

  // month pill
  const pillX = eyeX;
  const pillY = eyeCY - pillH / 2;
  anyCtx.roundRect!(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,107,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '700 10px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = ORANGE_SOFT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  drawTextShadowed(s.month, pillX + pillW / 2, pillY + pillH / 2 + 0.5);

  // ===== TITLE (centered 3 lines, line3 orange) =====
  ctx.font = '900 38px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillStyle = WHITE;
  drawTextShadowed(s.line1, CX, TITLE_Y);
  drawTextShadowed(s.line2, CX, TITLE_Y + TITLE_LINE_H);
  ctx.fillStyle = ORANGE;
  drawTextShadowed(s.line3, CX, TITLE_Y + TITLE_LINE_H * 2);

  // accent rule
  anyCtx.roundRect!(CX - 24, RULE_Y, 48, 3, 2);
  ctx.fillStyle = ORANGE; ctx.fill();

  // ===== SUBTITLE =====
  ctx.font = '500 12px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = "#dddddd"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  drawTextShadowed(s.subtitle, CX, SUBTITLE_Y);

  // ===== EXERCISE GRID (88% width, 2 cols, dark item bg) =====
  exerciseNames.forEach((name, i) => {
    const isLastOdd = isOdd && i === exerciseNames.length - 1;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = isLastOdd ? GRID_X : GRID_X + col * (PILL_W + PILL_GAP);
    const y = GRID_Y + row * (PILL_H + PILL_GAP);
    const w = isLastOdd ? GRID_W : PILL_W;
    const h = PILL_H;

    anyCtx.roundRect!(x, y, w, h, 12);
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fill();

    // orange check circle
    const checkR = 13;
    const cx = x + 12 + checkR;
    const cy = y + h / 2;
    ctx.beginPath(); ctx.arc(cx, cy, checkR, 0, Math.PI * 2);
    ctx.fillStyle = ORANGE; ctx.fill();
    // check mark
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx - 1, cy + 4);
    ctx.lineTo(cx + 5, cy - 4);
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2.2;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();

    // exercise name
    ctx.font = '600 11.5px Inter, "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = WHITE; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const textX = cx + checkR + 8;
    const maxTextW = x + w - textX - 10;
    let displayName = name;
    if (ctx.measureText(displayName).width > maxTextW) {
      while (displayName.length > 1 && ctx.measureText(displayName + "…").width > maxTextW) {
        displayName = displayName.slice(0, -1);
      }
      displayName = displayName + "…";
    }
    drawTextShadowed(displayName, textX, cy);
  });

  // ===== DIVIDER =====
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(GRID_X, DIVIDER_Y, GRID_W, 1);

  // ===== FOOTER: fraction centered + url centered =====
  // measure fraction
  ctx.font = '900 26px Inter, "Space Grotesk", system-ui, sans-serif';
  const numText = `${exerciseNames.length}`;
  const numW = ctx.measureText(numText).width;
  ctx.font = '900 17px Inter, "Space Grotesk", system-ui, sans-serif';
  const denText = `/${totalExercises}`;
  const denW = ctx.measureText(denText).width;
  const fracW = numW + denW;
  const fracStartX = CX - fracW / 2;

  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.font = '900 26px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = ORANGE;
  drawTextShadowed(numText, fracStartX, FRAC_Y);
  ctx.font = '900 17px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = "#aaaaaa";
  drawTextShadowed(denText, fracStartX + numW, FRAC_Y + 3);

  ctx.font = '600 10.5px Inter, "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = "#999999"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  drawTextShadowed(s.site, CX, URL_Y);

  const link = document.createElement("a");
  const safeDate = formatDate(dayLabel).replace(/[, ]+/g, "-");
  link.download = `surya-fitai-${safeDate}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
