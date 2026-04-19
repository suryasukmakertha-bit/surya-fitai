import { useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import html2canvas from "html2canvas";

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

interface DailyProgressImageProps {
  dayLabel: string;
  exercises: Exercise[];
  completedExercises: string[];
  totalExercises: number;
  planMonthNumber?: number;
}

const GREEN = "#00ff78";

export default function DailyProgressImage({
  dayLabel,
  exercises,
  completedExercises,
  totalExercises,
  planMonthNumber = 1,
}: DailyProgressImageProps) {
  const { lang } = useLanguage();

  const completedList = exercises.filter((ex) => completedExercises.includes(ex.name));
  const completedCount = completedList.length;

  // Title lines
  const titleParts =
    lang === "id"
      ? { l1: "KAMU", l2: "VS", l3: "KAMU." }
      : lang === "zh"
      ? { l1: "你", l2: "VS", l3: "你." }
      : { l1: "YOU", l2: "VS", l3: "YOU." };

  const monthLabel =
    lang === "id" ? `Bulan ${planMonthNumber}` : lang === "zh" ? `第${planMonthNumber}月` : `Month ${planMonthNumber}`;

  const downloadLabel =
    lang === "id" ? "Unduh Kemajuan Harian" : lang === "zh" ? "下载每日进度" : "Download Daily Progress";

  // Date formatting
  const formatDate = (label: string): string => {
    const dateMatch = label.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch
      ? (() => {
          const [y, m, d] = dateMatch[1].split("-").map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date();

    const dayNames: Record<string, string[]> = {
      en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      zh: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
    };
    const monthNames: Record<string, string[]> = {
      en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
      zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    };
    const dayName = (dayNames[lang] || dayNames.en)[date.getDay()];
    const monthName = (monthNames[lang] || monthNames.en)[date.getMonth()];
    return `${dayName}, ${String(date.getDate()).padStart(2, "0")} ${monthName} ${date.getFullYear()}`;
  };

  const subtitleText = (() => {
    const ds = formatDate(dayLabel);
    if (lang === "id") return `${completedCount} dari ${totalExercises} exercise selesai · ${ds}`;
    if (lang === "zh") return `${completedCount}/${totalExercises} 个训练完成 · ${ds}`;
    return `${completedCount} of ${totalExercises} exercises done · ${ds}`;
  })();

  const handleDownload = useCallback(async () => {
    // Build the card off-screen with explicit transparent wrapper
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;background:transparent !important;";
    document.body.appendChild(container);

    const isOdd = completedList.length % 2 === 1;

    // Pill items — exact spec
    const pillsHTML = completedList
      .map((ex, idx) => {
        const fullWidth = isOdd && idx === completedList.length - 1;
        const safeName = ex.name.replace(/[<>&"]/g, (c) =>
          ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" } as Record<string, string>)[c]
        );
        return `
          <div style="display:flex;flex-direction:row;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;min-height:44px;box-sizing:border-box;${
            fullWidth ? "grid-column:1 / -1;" : ""
          }min-width:0;">
            <div style="width:20px;height:20px;min-width:20px;min-height:20px;border-radius:50%;background:rgba(0,255,120,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:center;">
              <svg width="10" height="10" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="${GREEN}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div style="font-size:12px;font-weight:500;color:rgba(255,255,255,0.85);line-height:1.3;word-break:break-word;white-space:normal;overflow:visible;text-overflow:unset;flex:1;align-self:center;">${safeName}</div>
          </div>`;
      })
      .join("");

    const cardHTML = `
      <div id="dpi-card" style="
        width:360px;
        background:#111111;
        border-radius:20px;
        padding:28px;
        position:relative;
        overflow:hidden;
        font-family:'Space Grotesk','Inter',system-ui,-apple-system,sans-serif;
        box-sizing:border-box;
      ">
        <div style="position:absolute;bottom:-40px;left:-40px;width:160px;height:160px;background:radial-gradient(circle, rgba(0,255,120,0.1) 0%, transparent 70%);pointer-events:none;border-radius:50%;"></div>

        <div style="position:relative;z-index:1;">
          <!-- Header: single flex row, space-between -->
          <div style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;width:100%;margin-bottom:22px;">
            <div style="display:flex;flex-direction:row;align-items:center;gap:8px;">
              <div style="width:8px;height:8px;min-width:8px;min-height:8px;border-radius:50%;background:${GREEN};display:inline-block;"></div>
              <div style="font-size:11px;font-weight:700;color:${GREEN};letter-spacing:2px;text-transform:uppercase;line-height:1;white-space:nowrap;">SuryaFitAi · Coach Surya</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:center;padding:4px 12px;height:26px;background:rgba(0,255,120,0.08);border:1px solid rgba(0,255,120,0.3);border-radius:6px;font-size:11px;font-weight:600;color:rgba(0,255,120,0.8);white-space:nowrap;line-height:1;box-sizing:border-box;">${monthLabel}</div>
          </div>

          <!-- Big Title -->
          <div style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-1.5px;line-height:1;">
            <div>${titleParts.l1}</div>
            <div>${titleParts.l2}</div>
            <div style="color:${GREEN};">${titleParts.l3}</div>
          </div>

          <!-- Subtitle -->
          <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:6px;margin-bottom:24px;line-height:1.4;">${subtitleText}</div>

          <!-- Grid of exercise pills -->
          <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-bottom:24px;">
            ${pillsHTML}
          </div>

          <!-- Footer -->
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;">
            <div style="font-size:11px;color:rgba(255,255,255,0.25);">surya-fitai.com</div>
            <div style="display:flex;align-items:baseline;gap:2px;">
              <span style="font-size:22px;font-weight:800;color:${GREEN};line-height:1;">${completedCount}</span><span style="font-size:13px;color:rgba(255,255,255,0.3);line-height:1;">/${totalExercises}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = cardHTML;
    const cardEl = container.querySelector("#dpi-card") as HTMLElement;

    // Wait a tick for fonts/layout
    await new Promise((r) => setTimeout(r, 50));

    // Step E — ensure parent (container) is transparent before capture
    const prevBg = container.style.background;
    container.style.background = "transparent";

    try {
      const canvas = await html2canvas(cardEl, {
        background: null,
        backgroundColor: null,
        useCORS: true,
        scale: 2,
        logging: false,
        removeContainer: true,
      } as any);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeDate = formatDate(dayLabel).replace(/[, ]+/g, "-");
      link.download = `surya-fitai-${safeDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      container.style.background = prevBg;
      if (container.parentNode) document.body.removeChild(container);
    }
  }, [completedList, totalExercises, dayLabel, lang, monthLabel, subtitleText, titleParts, completedCount]);

  if (completedList.length === 0) return null;

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      size="sm"
      className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/10"
      aria-label={downloadLabel}
    >
      <Download className="w-4 h-4 mr-2" />
      {downloadLabel}
    </Button>
  );
}
