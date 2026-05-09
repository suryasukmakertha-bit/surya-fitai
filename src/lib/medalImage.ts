import html2canvas from "html2canvas";
import { TIER_COLOR } from "@/lib/medalCatalog";

interface MedalCardData {
  medal_id: string;
  medal_name: string;
  medal_tier: string;
  medal_description: string;
  earned_at?: string;
  user_name?: string;
  /** Optional localized strings; if omitted, falls back to provided medal_* fields */
  i18n?: {
    name?: string;
    description?: string;
    tier?: string;
    header?: string;
    tagline?: string;
    earnedLabel?: string; // e.g. "Earned: 06 May 2026"
    locale?: string;
  };
}

function buildCard(m: MedalCardData): HTMLDivElement {
  const tierColor = TIER_COLOR[m.medal_tier] || "#ff6b00";
  const locale = m.i18n?.locale || "en-US";
  const dateStr = (m.earned_at ? new Date(m.earned_at) : new Date())
    .toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  const earnedLabel = m.i18n?.earnedLabel || `Earned: ${dateStr}`;
  const name = m.i18n?.name || m.medal_name;
  const description = m.i18n?.description || m.medal_description;
  const tierLabel = (m.i18n?.tier || m.medal_tier).toUpperCase();
  const headerLabel = m.i18n?.header || "SURYA-FITAI · ACHIEVEMENT";
  const taglineLabel = m.i18n?.tagline || "AI-POWERED. YOU. LIMITLESS.";
  const tierKey = (m.medal_tier || "bronze").toLowerCase();
  // Force per-tier badge palette + shadow for legibility on transparent bg
  const badgePalette: Record<string, { bg: string; color: string; shadow: string }> = {
    bronze:   { bg: "#cd7f32", color: "#ffffff", shadow: "0 1px 2px rgba(0,0,0,0.5)" },
    silver:   { bg: "#c0c0c0", color: "#1a1a1a", shadow: "none" },
    gold:     { bg: "#ffd700", color: "#1a1a1a", shadow: "none" },
    platinum: { bg: "#a8a9ad", color: "#ffffff", shadow: "0 1px 2px rgba(0,0,0,0.5)" },
  };
  const bp = badgePalette[tierKey] || badgePalette.bronze;
  const root = document.createElement("div");
  root.style.cssText = `position:fixed;left:-9999px;top:0;width:400px;height:500px;background:transparent;color:#fff;font-family:'Space Grotesk',Inter,system-ui,sans-serif;box-sizing:border-box;`;
  root.innerHTML = `
    <div style="position:relative;width:400px;height:500px;background:rgba(0,0,0,0.75);border-radius:24px;border:1.5px solid rgba(255,107,0,0.4);padding:32px 24px;box-sizing:border-box;overflow:hidden;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);">
      <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);border-radius:24px 24px 0 0;"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#ff6b00,#ff3d7f);border-radius:0 0 24px 24px;"></div>
      <div style="margin-top:8px;text-align:center;font-size:13px;letter-spacing:0.2em;color:#ff6b00;font-weight:800;text-shadow:0 0 20px rgba(255,107,0,0.5);">${escapeHtml(headerLabel)}</div>
      <div style="width:100px;height:100px;border-radius:50%;margin:20px auto 0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:2px solid ${tierColor};filter:drop-shadow(0 0 16px ${tierColor});">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${tierColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
      </div>
      <div style="margin:16px auto 0;text-align:center;">
        <span class="medal-tier-badge" data-tier="${escapeHtml(tierKey)}" style="display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:80px;padding:0 16px;border-radius:14px;background:${bp.bg};color:${bp.color};font-size:12px;font-weight:800;letter-spacing:0.12em;line-height:1;text-transform:uppercase;box-sizing:border-box;text-shadow:${bp.shadow};">${escapeHtml(tierLabel)}</span>
      </div>
      <div style="margin:16px 28px 0;font-size:32px;font-weight:900;text-align:center;line-height:1.15;color:#ffffff;letter-spacing:-0.02em;text-shadow:0 2px 8px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.1);">${escapeHtml(name)}</div>
      <div style="margin:10px 28px 0;font-size:14px;font-weight:500;color:rgba(255,255,255,0.85);text-align:center;line-height:1.4;text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(description)}</div>
      <div style="margin:20px auto 0;width:80%;height:1px;background:rgba(255,255,255,0.15);"></div>
      <div style="margin-top:14px;text-align:center;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);text-shadow:0 1px 3px rgba(0,0,0,0.8);">${escapeHtml(earnedLabel)}</div>
      <div style="margin-top:4px;text-align:center;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);text-shadow:0 1px 3px rgba(0,0,0,0.8);">${escapeHtml(m.user_name || "")}</div>
      <div style="position:absolute;bottom:18px;left:0;right:0;text-align:center;font-size:11px;letter-spacing:0.15em;color:#ff6b00;font-weight:800;text-shadow:0 0 15px rgba(255,107,0,0.6);">${escapeHtml(taglineLabel)}</div>
    </div>
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
    const canvas = await html2canvas(card, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: (clonedDoc: Document) => {
        const badges = clonedDoc.querySelectorAll<HTMLElement>(".medal-tier-badge");
        badges.forEach((b) => {
          b.style.display = "inline-flex";
          b.style.alignItems = "center";
          b.style.justifyContent = "center";
          b.style.lineHeight = "1";
          b.style.padding = "0 16px";
          b.style.height = "28px";
          b.style.borderRadius = "14px";
          b.style.fontWeight = "800";
          b.style.fontSize = "12px";
          b.style.letterSpacing = "0.12em";
          const tier = (b.getAttribute("data-tier") || "").toLowerCase();
          if (tier === "bronze")   { b.style.backgroundColor = "#cd7f32"; b.style.color = "#ffffff"; b.style.textShadow = "0 1px 2px rgba(0,0,0,0.5)"; }
          if (tier === "silver")   { b.style.backgroundColor = "#c0c0c0"; b.style.color = "#1a1a1a"; b.style.textShadow = "none"; }
          if (tier === "gold")     { b.style.backgroundColor = "#ffd700"; b.style.color = "#1a1a1a"; b.style.textShadow = "none"; }
          if (tier === "platinum") { b.style.backgroundColor = "#a8a9ad"; b.style.color = "#ffffff"; b.style.textShadow = "0 1px 2px rgba(0,0,0,0.5)"; }
        });
      },
    });
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
