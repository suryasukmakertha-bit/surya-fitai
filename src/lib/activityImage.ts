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
  root.style.cssText = `position:fixed;left:-9999px;top:0;width:400px;background:transparent;color:#fff;font-family:Inter,system-ui,sans-serif;`;
  root.innerHTML = `
    <div style="width:400px;height:660px;position:relative;background:rgba(0,0,0,0.75);border-radius:24px;border:1.5px solid rgba(255,107,0,0.3);padding:28px 20px;box-sizing:border-box;display:flex;flex-direction:column;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);border-radius:24px 24px 0 0;"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);border-radius:0 0 24px 24px;"></div>
      <img src="${window.location.origin}/logo-new.png" crossorigin="anonymous" alt="" style="height:32px;width:auto;object-fit:contain;display:block;margin:8px auto 8px;" />
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
        ${session.activity_type === "running" ? `<svg viewBox="0 0 24 24" fill="none" stroke="#ff6b00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M4 16v-2.38c0-.83.13-1.66.4-2.45l.32-.94C5.4 8.6 7.13 7.5 9 7.5c.83 0 1.5.67 1.5 1.5v3.5"/><path d="M4 16c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-1.5"/><path d="M14 13.5V11c0-.83.67-1.5 1.5-1.5 1.87 0 3.6 1.1 4.28 2.73l.32.94c.27.79.4 1.62.4 2.45V18"/><path d="M14 18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-1.5"/></svg>` : ""}
        <p style="margin:0;font-size:13px;letter-spacing:0.15em;color:#ff6b00;font-weight:800;text-align:center;text-shadow:0 0 20px rgba(255,107,0,0.4);">SURYA-FITAI · ${i18n.title.toUpperCase()}</p>
      </div>
      <p style="margin:18px 0 24px;font-size:64px;font-weight:900;color:#ff6b00;text-align:center;line-height:1;text-shadow:0 2px 8px rgba(0,0,0,0.8), 0 0 40px rgba(255,107,0,0.3);">${session.distance_km.toFixed(2)} <span style="font-size:20px;color:rgba(255,255,255,0.6);font-weight:700;">km</span></p>
      <div style="height:1px;background:rgba(255,255,255,0.15);width:85%;margin:0 auto 4px;"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px;margin-bottom:14px;">
        ${[
          [i18n.time, formatDuration(session.duration_seconds)],
          [i18n.pace, formatPace(session.avg_pace_seconds_per_km) + " /km"],
          [i18n.calories, `${session.calories} kcal`],
          [i18n.speed, `${Number(session.avg_speed_kmh).toFixed(1)} km/h`],
          [i18n.maxSpeed, `${Number(session.max_speed_kmh).toFixed(1)} km/h`],
          [i18n.elevation, `${Math.round(Number(session.elevation_gain_m))} m`],
        ].map(([l, v]) => `
          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,107,0,0.18);border-radius:10px;padding:10px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${l}</p>
            <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#ffffff;text-shadow:0 1px 4px rgba(0,0,0,0.8);">${v}</p>
          </div>
        `).join("")}
      </div>
      ${splits.length ? `
        <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 12px;margin-bottom:auto;">
          <p style="margin:0 0 6px;font-size:10px;color:#ff6b00;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">${i18n.splits}</p>
          ${splits.map(s => `<div style="display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.85);font-weight:600;padding:2px 0;text-shadow:0 1px 3px rgba(0,0,0,0.8);"><span>KM ${s.km}</span><span>${formatPace(s.pace_seconds)} /km</span></div>`).join("")}
        </div>
      ` : `<div style="flex:1;"></div>`}
      <div style="margin-top:20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${userName} · ${dateStr}</p>
        <p style="margin:8px 0 18px;font-size:10px;color:#ff6b00;letter-spacing:0.15em;font-weight:800;text-shadow:0 0 15px rgba(255,107,0,0.5);">${i18n.tagline}</p>
      </div>
    </div>`;
  document.body.appendChild(root);
  try {
    const canvas = await html2canvas(root.firstElementChild as HTMLElement, {
      scale: 2, backgroundColor: null, useCORS: true, logging: false,
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