import html2canvas from "html2canvas";
import { TIER_COLOR } from "@/lib/medalCatalog";

interface MedalCardData {
  medal_id: string;
  medal_name: string;
  medal_tier: string;
  medal_description: string;
  earned_at?: string;
  user_name?: string;
}

function buildCard(m: MedalCardData): HTMLDivElement {
  const tierColor = TIER_COLOR[m.medal_tier] || "#ff6b00";
  const dateStr = m.earned_at
    ? new Date(m.earned_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  // Tier color contrast
  const darkText = ["silver", "gold"].includes(m.medal_tier);
  const tierTextColor = darkText ? "#1a1a1a" : "#ffffff";
  const root = document.createElement("div");
  root.style.cssText = `position:fixed;left:-9999px;top:0;width:400px;height:500px;background:#0f0f11;color:#fff;font-family:'Space Grotesk',Inter,system-ui,sans-serif;box-sizing:border-box;overflow:hidden;`;
  root.innerHTML = `
    <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);"></div>
    <div style="margin-top:24px;text-align:center;font-size:11px;letter-spacing:0.2em;color:#ff6b00;font-weight:700;">SURYA-FITAI · ACHIEVEMENT</div>
    <div style="width:120px;height:120px;border-radius:60px;margin:20px auto 0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);filter:drop-shadow(0 0 20px ${tierColor});">
      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="${tierColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
    </div>
    <div style="margin:16px auto 0;text-align:center;">
      <span style="display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 16px;border-radius:14px;background:${tierColor};color:${tierTextColor};font-size:11px;font-weight:800;letter-spacing:0.12em;line-height:1;text-transform:uppercase;box-sizing:border-box;">${m.medal_tier.toUpperCase()}</span>
    </div>
    <div style="margin:16px 28px 0;font-size:28px;font-weight:800;text-align:center;line-height:1.2;">${escapeHtml(m.medal_name)}</div>
    <div style="margin:8px 28px 0;font-size:13px;color:#888;text-align:center;line-height:1.4;">${escapeHtml(m.medal_description)}</div>
    <div style="margin:20px auto 0;width:80%;height:1px;background:rgba(255,255,255,0.1);"></div>
    <div style="margin-top:16px;text-align:center;font-size:11px;color:#666;">Diraih: ${dateStr}</div>
    <div style="margin-top:4px;text-align:center;font-size:11px;color:#888;">${escapeHtml(m.user_name || "")}</div>
    <div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:9px;letter-spacing:0.15em;color:#ff6b00;font-weight:700;">AI-POWERED. YOU. LIMITLESS.</div>
  `;
  return root;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);
}

export async function downloadMedalPng(m: MedalCardData) {
  const card = buildCard(m);
  document.body.appendChild(card);
  try {
    const canvas = await html2canvas(card, { backgroundColor: "#0f0f11", scale: 2, useCORS: true, allowTaint: false, logging: false });
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
    const fileName = `medal-${m.medal_name.replace(/\s+/g, "_")}-${(m.earned_at || new Date().toISOString()).slice(0, 10)}.png`;
    const file = new File([blob], fileName, { type: "image/png" });
    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file], title: m.medal_name, text: `Saya meraih medal ${m.medal_name} di Surya-FitAi!` });
        return;
      } catch { /* fall through to download */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    card.remove();
  }
}
