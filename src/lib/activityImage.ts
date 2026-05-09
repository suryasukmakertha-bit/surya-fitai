import { formatDuration, formatPace, haversineKm, type ActivitySession } from "./activityTracking";

interface PngOpts {
  session: ActivitySession;
  userName: string;
  i18n: {
    title: string;
    distance: string;
    time: string;
    pace: string;
    calories: string;
    speed: string;
    maxSpeed: string;
    elevation: string;
    splits: string;
    locale: string;
    tagline: string;
  };
}

// ---------- helpers ----------
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function cleanRoute(route: ActivitySession["route_json"]): { lat: number; lng: number; t: number }[] {
  if (!Array.isArray(route)) return [];
  const valid = route.filter(
    (p) => p && typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng),
  ) as { lat: number; lng: number; t: number }[];
  // GPS noise filter: drop point if speed from previous > 50 km/h
  const out: { lat: number; lng: number; t: number }[] = [];
  for (const p of valid) {
    const prev = out[out.length - 1];
    if (!prev) { out.push(p); continue; }
    const km = haversineKm(prev, p);
    const dtH = Math.max(1e-6, (p.t - prev.t) / 3_600_000);
    const speed = km / dtH;
    if (speed > 50) continue;
    out.push(p);
  }
  return out;
}

function drawRouteMap(
  ctx: CanvasRenderingContext2D,
  pts: { lat: number; lng: number }[],
  x: number, y: number, w: number, h: number,
  noRouteText: string,
  indoorText: string,
) {
  // Map background
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  if (pts.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(noRouteText, x + w / 2, y + h / 2);
    return;
  }

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const dLat = maxLat - minLat;
  const dLng = maxLng - minLng;

  if (dLat < 1e-7 && dLng < 1e-7) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(indoorText, x + w / 2, y + h / 2);
    return;
  }

  const pad = 20;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const sx = (lng: number) => x + pad + (dLng > 0 ? ((lng - minLng) / dLng) * innerW : innerW / 2);
  // Y inverted: higher latitude → smaller y
  const sy = (lat: number) => y + pad + (dLat > 0 ? (1 - (lat - minLat) / dLat) * innerH : innerH / 2);

  if (pts.length >= 3) {
    ctx.strokeStyle = "#FF6B00";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = sx(p.lng), py = sy(p.lat);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  } else {
    // dots only
    ctx.fillStyle = "#FF6B00";
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(sx(p.lng), sy(p.lat), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const start = pts[0], end = pts[pts.length - 1];
  ctx.fillStyle = "#00ff78";
  ctx.beginPath(); ctx.arc(sx(start.lng), sy(start.lat), 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ff4444";
  ctx.beginPath(); ctx.arc(sx(end.lng), sy(end.lat), 6, 0, Math.PI * 2); ctx.fill();
}

export async function downloadActivityPng(opts: PngOpts): Promise<void> {
  const { session, userName, i18n } = opts;
  const dateStr = new Date(session.created_at || new Date()).toLocaleDateString(i18n.locale, {
    day: "2-digit", month: "short", year: "numeric",
  });

  // ---- Card layout (logical px, then upscaled by DPR=2) ----
  const W = 400;
  const H = 660;
  const DPR = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  ctx.textBaseline = "alphabetic";

  // Transparent area outside card
  ctx.clearRect(0, 0, W, H);

  // Card background — dark gradient #0f0f0f → #1a1a1a
  const cardX = 0, cardY = 0, cardW = W, cardH = H, radius = 24;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0f0f0f");
  grad.addColorStop(1, "#1a1a1a");
  roundRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.fillStyle = grad;
  ctx.fill();

  // Top + bottom orange→pink accent bars
  const drawAccent = (yy: number, top: boolean) => {
    ctx.save();
    roundRect(ctx, 0, yy, W, 5, 0);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#ff6b00");
    g.addColorStop(1, "#ff3d7f");
    // Clip to card rounded rect so accent bars match corner radius
    ctx.restore();
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(0, top ? 0 : H - 5, W, 5);
    ctx.restore();
  };
  drawAccent(0, true);
  drawAccent(H - 5, false);

  // ---- Header: logo + activity label ----
  const logo = await loadImage(`${window.location.origin}/logo-new.png`);
  let cursorY = 22;
  if (logo) {
    const lh = 28;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, (W - lw) / 2, cursorY, lw, lh);
    cursorY += lh + 8;
  } else {
    cursorY += 12;
  }

  ctx.fillStyle = "#ff6b00";
  ctx.font = "800 13px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(255,107,0,0.45)";
  ctx.shadowBlur = 12;
  ctx.fillText(`SURYA-FITAI · ${i18n.title.toUpperCase()}`, W / 2, cursorY + 14);
  ctx.shadowBlur = 0;
  cursorY += 26;

  // ---- Route map (40% of card height) ----
  const mapH = Math.round(H * 0.4);
  const mapPadX = 20;
  const mapY = cursorY + 6;
  const cleanedPts = cleanRoute(session.route_json);
  drawRouteMap(
    ctx,
    cleanedPts,
    mapPadX,
    mapY,
    W - mapPadX * 2,
    mapH,
    "No Route Data",
    "Indoor / Treadmill",
  );
  cursorY = mapY + mapH + 14;

  // ---- Distance (large, orange, centered) ----
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff6b00";
  ctx.shadowColor = "rgba(255,107,0,0.35)";
  ctx.shadowBlur = 16;
  ctx.font = "900 44px Inter, system-ui, sans-serif";
  const distText = session.distance_km.toFixed(2);
  const distMetrics = ctx.measureText(distText);
  const unitFont = "700 16px Inter, system-ui, sans-serif";
  ctx.font = unitFont;
  const unitMetrics = ctx.measureText(" km");
  const totalW = distMetrics.width + unitMetrics.width + 4;
  const startX = (W - totalW) / 2;
  ctx.font = "900 44px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(distText, startX, cursorY + 36);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = unitFont;
  ctx.fillText(" km", startX + distMetrics.width + 4, cursorY + 36);
  cursorY += 50;

  // ---- Stats grid: 3 cols × 2 rows ----
  const stats: [string, string][] = [
    [i18n.time, formatDuration(session.duration_seconds)],
    [i18n.pace, formatPace(session.avg_pace_seconds_per_km) + " /km"],
    [i18n.calories, `${session.calories} kcal`],
    [i18n.speed, `${Number(session.avg_speed_kmh).toFixed(1)} km/h`],
    [i18n.maxSpeed, `${Number(session.max_speed_kmh).toFixed(1)} km/h`],
    [i18n.elevation, `${Math.round(Number(session.elevation_gain_m))} m`],
  ];
  const gridX = 16;
  const gridGap = 8;
  const cellW = (W - gridX * 2 - gridGap * 2) / 3;
  const cellH = 54;
  for (let i = 0; i < stats.length; i++) {
    const r = Math.floor(i / 3), c = i % 3;
    const cx = gridX + c * (cellW + gridGap);
    const cy = cursorY + r * (cellH + gridGap);
    roundRect(ctx, cx, cy, cellW, cellH, 10);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,107,0,0.18)";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "700 9px Inter, system-ui, sans-serif";
    ctx.fillText(stats[i][0].toUpperCase(), cx + 10, cy + 16);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 16px Inter, system-ui, sans-serif";
    ctx.fillText(stats[i][1], cx + 10, cy + 38);
  }
  cursorY += cellH * 2 + gridGap + 16;

  // ---- Footer: name+date (left) / tagline (right) ----
  const footerY = H - 26;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "600 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${userName} · ${dateStr}`, 20, footerY);

  ctx.fillStyle = "#ff6b00";
  ctx.font = "800 9px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.shadowColor = "rgba(255,107,0,0.5)";
  ctx.shadowBlur = 10;
  ctx.fillText(i18n.tagline, W - 20, footerY);
  ctx.shadowBlur = 0;

  // ---- Export ----
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `surya-fitai-${session.activity_type}-${session.date}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}