import { formatDuration, formatPace, haversineKm, type ActivitySession } from "./activityTracking";

interface PngOpts {
  session: ActivitySession;
  userName: string;
  isPB?: boolean;
  showPremium?: boolean;
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
  const out: { lat: number; lng: number; t: number }[] = [];
  for (const p of valid) {
    const prev = out[out.length - 1];
    if (!prev) { out.push(p); continue; }
    const km = haversineKm(prev, p);
    const dtH = Math.max(1e-6, (p.t - prev.t) / 3_600_000);
    if (km / dtH > 50) continue;
    out.push(p);
  }
  return out;
}

function drawRouteMap(
  ctx: CanvasRenderingContext2D,
  pts: { lat: number; lng: number }[],
  x: number, y: number, w: number, h: number,
  endpoints?: { start: { lat: number; lng: number }; end: { lat: number; lng: number } },
) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,107,0,0.2)";
  ctx.stroke();

  if (pts.length === 0) return;

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  if (maxLat === minLat || maxLng === minLng) {
    ctx.fillStyle = "#ff6b00";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const PAD = 10;
  const ix = x + PAD, iy = y + PAD, iw = w - PAD * 2, ih = h - PAD * 2;
  const latPad = (maxLat - minLat) * 0.1;
  const lngPad = (maxLng - minLng) * 0.1;
  const lat0 = minLat - latPad, lat1 = maxLat + latPad;
  const lng0 = minLng - lngPad, lng1 = maxLng + lngPad;
  const sx = (lng: number) => ix + ((lng - lng0) / (lng1 - lng0)) * iw;
  const sy = (lat: number) => iy + ih - ((lat - lat0) / (lat1 - lat0)) * ih;

  if (pts.length >= 3) {
    ctx.strokeStyle = "#ff6b00";
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = sx(p.lng), py = sy(p.lat);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  } else {
    ctx.fillStyle = "#ff6b00";
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(sx(p.lng), sy(p.lat), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const start = endpoints?.start ?? pts[0];
  const end = endpoints?.end ?? pts[pts.length - 1];
  ctx.fillStyle = "#4ade80";
  ctx.beginPath(); ctx.arc(sx(start.lng), sy(start.lat), 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.arc(sx(end.lng), sy(end.lat), 4, 0, Math.PI * 2); ctx.fill();
}

export async function downloadActivityPng(opts: PngOpts): Promise<void> {
  const { session, i18n, isPB = false, showPremium = true } = opts;

  const dateStr = new Date(session.created_at || new Date()).toLocaleDateString(i18n.locale, {
    day: "numeric", month: "short", year: "numeric",
  });

  // Splits bars (mirror Summary UI logic)
  const fullSplits = (session.splits_json || []).map((s) => ({ label: String(s.km), pace: s.pace_seconds }));
  const partialKm = session.distance_km - fullSplits.length;
  const bars: { label: string; pace: number }[] = [...fullSplits];
  if (partialKm >= 0.1 && Number(session.avg_pace_seconds_per_km) > 0) {
    bars.push({ label: session.distance_km.toFixed(1), pace: Number(session.avg_pace_seconds_per_km) });
  }
  const showSplits = showPremium && session.distance_km >= 1.0 && bars.length > 0;
  const showPB = showPremium && isPB;

  // Layout
  const W = 390;
  const PAD_X = 24;
  const INNER_W = W - PAD_X * 2;
  const RADIUS = 24;
  const DPR = 2;

  const HEADER_H = 28;
  const PB_H = 72;
  const STATS_H = 64;
  const ROUTE_LABEL_H = 18;
  const ROUTE_H = 90;
  const SPLITS_LABEL_H = 18;
  const SPLITS_BARS_H = 52;
  const SPLITS_X_H = 16;
  const FOOTER_H = 36;
  const GAP = 14;
  const TOP_PAD = 24;
  const BOTTOM_PAD = 16;

  let H = TOP_PAD + HEADER_H + GAP;
  if (showPB) H += PB_H + GAP;
  H += STATS_H + GAP;
  H += ROUTE_LABEL_H + 6 + ROUTE_H + GAP;
  if (showSplits) H += SPLITS_LABEL_H + 6 + SPLITS_BARS_H + SPLITS_X_H + GAP;
  H += FOOTER_H + BOTTOM_PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  ctx.textBaseline = "alphabetic";
  ctx.clearRect(0, 0, W, H);

  // Transparent background — no fill, no border

  const setTextShadow = (strong = false) => {
    ctx.shadowColor = strong ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.8)";
    ctx.shadowBlur = strong ? 8 : 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  };
  const clearShadow = () => {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  // Logo
  const logo =
    (await loadImage(`${window.location.origin}/logo.png`)) ||
    (await loadImage(`${window.location.origin}/logo-new.png`));

  let cy = TOP_PAD;

  // HEADER
  if (logo) {
    const lh = HEADER_H;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, PAD_X, cy, lw, lh);
  }
  const badgeText = i18n.title.toUpperCase();
  ctx.font = "700 11px Inter, 'Plus Jakarta Sans', system-ui, sans-serif";
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgePadX = 12;
  const badgeW = badgeTextW + badgePadX * 2;
  const badgeH = 24;
  const badgeX = W - PAD_X - badgeW;
  const badgeY = cy + (HEADER_H - badgeH) / 2;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 20);
  ctx.fillStyle = "rgba(255,107,0,0.15)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,107,0,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  setTextShadow(true);
  ctx.fillStyle = "#ff6b00";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
  ctx.textBaseline = "alphabetic";
  clearShadow();
  cy += HEADER_H + GAP;

  // PB BANNER
  if (showPB) {
    const x = PAD_X, y = cy, w = INNER_W, h = PB_H;
    roundRect(ctx, x, y, w, h, 12);
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, "rgba(255,107,0,0.2)");
    g.addColorStop(1, "rgba(255,61,127,0.08)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,107,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "18px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui,sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("🏆", x + 14, y + h / 2);

    const tx = x + 46;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ff6b00";
    ctx.font = "700 9px Inter, system-ui, sans-serif";
    ctx.fillText("PERSONAL BEST", tx, y + 22);

    const pace = formatPace(session.avg_pace_seconds_per_km);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 20px Inter, system-ui, sans-serif";
    ctx.fillText(pace, tx, y + 44);
    const paceW = ctx.measureText(pace).width;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 12px Inter, system-ui, sans-serif";
    ctx.fillText(" /km", tx + paceW, y + 44);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "400 10px Inter, system-ui, sans-serif";
    ctx.fillText("Fastest pace ever recorded", tx, y + 60);

    ctx.font = "700 11px Inter, system-ui, sans-serif";
    const pillTextW = ctx.measureText("PB").width;
    const pillW = pillTextW + 24;
    const pillH = 26;
    const pillX = x + w - 14 - pillW;
    const pillY = y + (h - pillH) / 2;
    roundRect(ctx, pillX, pillY, pillW, pillH, 20);
    const pillG = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pillG.addColorStop(0, "#ff6b00");
    pillG.addColorStop(1, "#ff3d7f");
    ctx.fillStyle = pillG;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PB", pillX + pillW / 2, pillY + pillH / 2 + 0.5);
    ctx.textBaseline = "alphabetic";
    cy += PB_H + GAP;
  }

  // STATS ROW (4 cols)
  const stats: { label: string; value: string; unit: string }[] = [
    { label: i18n.distance || "DISTANCE", value: session.distance_km.toFixed(2), unit: "km" },
    { label: i18n.time, value: formatDuration(session.duration_seconds).replace(/^00:/, ""), unit: "min" },
    { label: i18n.pace, value: formatPace(session.avg_pace_seconds_per_km), unit: "/km" },
    { label: i18n.calories, value: String(session.calories), unit: "kcal" },
  ];
  const cellGap = 8;
  const cellW = (INNER_W - cellGap * 3) / 4;
  for (let i = 0; i < 4; i++) {
    const cxs = PAD_X + i * (cellW + cellGap);
    roundRect(ctx, cxs, cy, cellW, STATS_H, 10);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    setTextShadow();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "700 8px Inter, system-ui, sans-serif";
    ctx.fillText(stats[i].label.toUpperCase(), cxs + cellW / 2, cy + 16);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 16px Inter, system-ui, sans-serif";
    ctx.fillText(stats[i].value, cxs + cellW / 2, cy + 38);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "400 9px Inter, system-ui, sans-serif";
    ctx.fillText(stats[i].unit, cxs + cellW / 2, cy + 54);
    clearShadow();
  }
  ctx.textAlign = "left";
  cy += STATS_H + GAP;

  // ROUTE
  setTextShadow();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "700 9px Inter, system-ui, sans-serif";
  ctx.fillText("ROUTE", PAD_X, cy + 12);
  clearShadow();
  cy += ROUTE_LABEL_H + 6;
  const rawPts = (Array.isArray(session.route_json) ? session.route_json : []).filter(
    (p) => p && typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng),
  ) as { lat: number; lng: number }[];
  const endpoints = rawPts.length >= 2
    ? { start: rawPts[0], end: rawPts[rawPts.length - 1] }
    : undefined;
  drawRouteMap(ctx, cleanRoute(session.route_json), PAD_X, cy, INNER_W, ROUTE_H, endpoints);
  cy += ROUTE_H + GAP;

  // SPLITS
  if (showSplits) {
    setTextShadow();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "700 9px Inter, system-ui, sans-serif";
    ctx.fillText("SPLITS PER KM", PAD_X, cy + 12);
    clearShadow();
    cy += SPLITS_LABEL_H + 6;

    const paces = bars.map((b) => b.pace).filter((p) => p > 0);
    const minPace = Math.min(...paces);
    const maxPace = Math.max(...paces);
    const fastestIdx = bars.findIndex((b) => b.pace === minPace);
    const MIN_H = 20, MAX_H = SPLITS_BARS_H;
    const heightFor = (p: number) =>
      maxPace === minPace ? MAX_H : MIN_H + ((maxPace - p) / (maxPace - minPace)) * (MAX_H - MIN_H);

    const barGap = 5;
    const barW = (INNER_W - barGap * (bars.length - 1)) / bars.length;
    const baseY = cy + SPLITS_BARS_H;
    bars.forEach((b, i) => {
      const bh = heightFor(b.pace);
      const bx = PAD_X + i * (barW + barGap);
      const by = baseY - bh;
      const isFastest = i === fastestIdx;
      const top = isFastest ? "#ff3d7f" : "#ff6b00";
      const bottom = isFastest ? "rgba(255,61,127,0.25)" : "rgba(255,107,0,0.25)";
      if (isFastest) {
        ctx.shadowColor = "rgba(255,61,127,0.55)";
        ctx.shadowBlur = 10;
      }
      roundRect(ctx, bx, by, barW, bh, 3);
      const bg2 = ctx.createLinearGradient(0, by, 0, by + bh);
      bg2.addColorStop(0, top);
      bg2.addColorStop(1, bottom);
      ctx.fillStyle = bg2;
      ctx.fill();
      ctx.shadowBlur = 0;

      setTextShadow();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "400 8px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.label, bx + barW / 2, baseY + 12);
      ctx.textAlign = "left";
      clearShadow();
    });
    cy += SPLITS_BARS_H + SPLITS_X_H + GAP;
  }

  // FOOTER
  const footerY = H - BOTTOM_PAD - 14;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, footerY - 14);
  ctx.lineTo(W - PAD_X, footerY - 14);
  ctx.stroke();

  setTextShadow();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "400 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(dateStr, PAD_X, footerY);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "700 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("surya-fitai.com", W - PAD_X, footerY);
  clearShadow();

  // Export
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `surya-fitai-${session.activity_type}-${session.date}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
