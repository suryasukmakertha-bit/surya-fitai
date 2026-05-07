import html2canvas from "html2canvas";
import { formatDuration, formatPace, type ActivitySession, type ActivityType } from "./activityTracking";

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

export async function downloadActivityPng(opts: PngOpts): Promise<void> {
  const { session, userName, i18n } = opts;
  const splits = (session.splits_json || []).slice(0, 6);
  const dateStr = new Date(session.created_at || new Date()).toLocaleDateString(i18n.locale, {
    day: "2-digit", month: "short", year: "numeric",
  });
  const root = document.createElement("div");
  root.style.cssText = `position:fixed;left:-9999px;top:0;width:400px;background:#0f0f11;color:#fff;font-family:Inter,system-ui,sans-serif;`;
  root.innerHTML = `
    <div style="width:400px;height:600px;position:relative;background:#0f0f11;padding:32px 24px;box-sizing:border-box;display:flex;flex-direction:column;">
      <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);"></div>
      <p style="margin:0;font-size:10px;letter-spacing:0.18em;color:#ff6b00;font-weight:800;text-align:center;">SURYA-FITAI · ${i18n.title.toUpperCase()}</p>
      <p style="margin:8px 0 18px;font-size:48px;font-weight:800;color:#ff6b00;text-align:center;line-height:1;">${session.distance_km.toFixed(2)} <span style="font-size:18px;color:#888;">km</span></p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
        ${[
          [i18n.time, formatDuration(session.duration_seconds)],
          [i18n.pace, formatPace(session.avg_pace_seconds_per_km) + " /km"],
          [i18n.calories, `${session.calories} kcal`],
          [i18n.speed, `${Number(session.avg_speed_kmh).toFixed(1)} km/h`],
          [i18n.maxSpeed, `${Number(session.max_speed_kmh).toFixed(1)} km/h`],
          [i18n.elevation, `${Math.round(Number(session.elevation_gain_m))} m`],
        ].map(([l, v]) => `
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,107,0,0.18);border-radius:10px;padding:10px;">
            <p style="margin:0;font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">${l}</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#fff;">${v}</p>
          </div>
        `).join("")}
      </div>
      ${splits.length ? `
        <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:8px 12px;margin-bottom:auto;">
          <p style="margin:0 0 6px;font-size:9px;color:#ff6b00;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${i18n.splits}</p>
          ${splits.map(s => `<div style="display:flex;justify-content:space-between;font-size:11px;color:#bbb;padding:2px 0;"><span>KM ${s.km}</span><span>${formatPace(s.pace_seconds)} /km</span></div>`).join("")}
        </div>
      ` : `<div style="flex:1;"></div>`}
      <div style="margin-top:14px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#bbb;font-weight:600;">${userName} · ${dateStr}</p>
        <p style="margin:6px 0 0;font-size:9px;color:#666;letter-spacing:0.18em;font-weight:700;">${i18n.tagline}</p>
      </div>
    </div>`;
  document.body.appendChild(root);
  try {
    const canvas = await html2canvas(root.firstElementChild as HTMLElement, {
      scale: 2, backgroundColor: "#0f0f11", useCORS: true, logging: false,
    });
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `surya-fitai-${session.activity_type}-${session.date}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    document.body.removeChild(root);
  }
}