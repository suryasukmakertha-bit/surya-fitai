import { useState } from "react";
import { Download, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import gymBgSrc from "@/assets/gym-bg.jpg";
import logoSrc from "@/assets/logo.png";

interface ProgressDownloadProps {
  userName: string;
  programName: string;
  duration: string;
  weight: number;
  bmi: string;
  calorieTarget: number;
  progressPercent: number;
  weeklyAdherence?: number; // 0-100
}

// Preload images once
let gymBgImg: HTMLImageElement | null = null;
let logoImg: HTMLImageElement | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function ProgressDownloadCard({
  userName,
  programName,
  duration,
  weight,
  bmi,
  calorieTarget,
  progressPercent,
  weeklyAdherence = 92,
}: ProgressDownloadProps) {
  const { t } = useLanguage();
  const [showShare, setShowShare] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const isComplete = progressPercent >= 100;

  const shareCaption = isComplete
    ? "I just completed my training program with Surya-FitAi.\nConsistency. Discipline. Results. 🔥\n#SuryaFitAi #ProgressComplete #FitnessJourney"
    : "Making progress every day with Surya-FitAi 💪\n#SuryaFitAi #FitnessJourney";

  const generateImage = async (): Promise<Blob> => {
    // Load images
    if (!gymBgImg) gymBgImg = await loadImage(gymBgSrc);
    if (!logoImg) logoImg = await loadImage(logoSrc);

    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // === BACKGROUND: Dark gym image with overlay ===
    ctx.drawImage(gymBgImg, 0, 0, W, H);
    // Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(0, 0, W, H);
    // Slight blur effect via extra dim overlay
    ctx.fillStyle = "rgba(5, 5, 15, 0.3)";
    ctx.fillRect(0, 0, W, H);

    // === GLASSMORPHISM CARD ===
    const cardX = 50;
    const cardY = 60;
    const cardW = W - 100;
    const cardH = H - 120;
    const cardR = 28;

    // Card glow border
    ctx.save();
    ctx.shadowColor = "rgba(0, 255, 136, 0.15)";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.strokeStyle = "rgba(0, 255, 136, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Card fill (glass)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.clip();
    ctx.fillStyle = "rgba(15, 15, 25, 0.75)";
    ctx.fill();
    // subtle inner border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // === COMPLETION: Confetti particles (inside card clip) ===
    if (isComplete) {
      const rng = (seed: number) => {
        let s = seed;
        return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
      };
      const rand = rng(42);
      const colors = [
        "rgba(0, 255, 136, 0.12)",
        "rgba(255, 215, 0, 0.1)",
        "rgba(255, 255, 255, 0.08)",
        "rgba(0, 255, 136, 0.08)",
        "rgba(255, 215, 0, 0.06)",
      ];
      for (let i = 0; i < 60; i++) {
        const px = cardX + rand() * cardW;
        const py = cardY + rand() * cardH;
        const radius = 2 + rand() * 6;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.fill();
      }
    }
    ctx.restore();

    // === NEON GREEN TOP ACCENT LINE ===
    const accentGrad = ctx.createLinearGradient(cardX + 60, 0, cardX + cardW - 60, 0);
    accentGrad.addColorStop(0, "rgba(0, 255, 136, 0)");
    accentGrad.addColorStop(0.2, "rgba(0, 255, 136, 0.9)");
    accentGrad.addColorStop(0.8, "rgba(0, 255, 136, 0.9)");
    accentGrad.addColorStop(1, "rgba(0, 255, 136, 0)");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(cardX + 40, cardY, cardW - 80, 4);

    // === LOGO (with glow) ===
    const logoW = 240;
    const logoH = 100;
    const logoX = (W - logoW) / 2;
    const logoY = cardY + 50;
    ctx.save();
    ctx.shadowColor = "rgba(0, 255, 136, 0.5)";
    ctx.shadowBlur = 30;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    ctx.restore();

    // === SUBTITLE: Progress Report ===
    let y = logoY + logoH + 30;
    ctx.fillStyle = "rgba(180, 190, 200, 0.9)";
    ctx.font = "300 28px 'Segoe UI', 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Progress Report", W / 2, y);

    // === DIVIDER ===
    y += 30;
    const divGrad = ctx.createLinearGradient(140, 0, W - 140, 0);
    divGrad.addColorStop(0, "rgba(255,255,255,0)");
    divGrad.addColorStop(0.5, "rgba(255,255,255,0.12)");
    divGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = divGrad;
    ctx.fillRect(140, y, W - 280, 1);

    // === DATA ROWS ===
    y += 50;
    const leftX = cardX + 80;
    const rightX = cardX + cardW - 80;
    const rowHeight = 65;

    const stats = [
      ["Name", userName],
      ["Program", programName],
      ["Duration", duration],
      ["Weight", `${weight} kg`],
      ["BMI", bmi],
      ["Calorie Target", `${calorieTarget} kcal`],
    ];

    for (const [label, value] of stats) {
      // Label
      ctx.fillStyle = "rgba(150, 160, 175, 0.85)";
      ctx.font = "300 26px 'Segoe UI', 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, leftX, y);
      // Value
      ctx.fillStyle = "rgba(240, 245, 250, 0.95)";
      ctx.font = "600 30px 'Segoe UI', 'Inter', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(value, rightX, y);
      y += rowHeight;
    }

    // === PROGRESS SECTION ===
    y += 20;
    ctx.fillStyle = "rgba(240, 245, 250, 0.95)";
    ctx.font = "700 36px 'Segoe UI', 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Progress: ${Math.min(progressPercent, 100)}%`, W / 2, y);

    // Progress bar
    y += 25;
    const barX = cardX + 80;
    const barW = cardW - 160;
    const barH = 32;
    const barR = 16;

    // Bar background
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.roundRect(barX, y, barW, barH, barR);
    ctx.fill();

    // Bar fill with glow
    const fillW = Math.max(barR * 2, barW * (Math.min(progressPercent, 100) / 100));
    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    if (isComplete) {
      barGrad.addColorStop(0, "#00FF88");
      barGrad.addColorStop(0.5, "#66FF44");
      barGrad.addColorStop(1, "#CCFF00");
    } else {
      barGrad.addColorStop(0, "#00CC66");
      barGrad.addColorStop(1, "#00FF88");
    }

    ctx.save();
    if (isComplete) {
      ctx.shadowColor = "rgba(0, 255, 136, 0.6)";
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(barX, y, fillW, barH, barR);
    ctx.fill();
    ctx.restore();

    // === COMPLETION: Flame aura on progress bar ===
    if (isComplete) {
      ctx.save();
      // Outer glow
      ctx.shadowColor = "rgba(0, 255, 136, 0.4)";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.roundRect(barX, y, barW, barH, barR);
      ctx.strokeStyle = "rgba(0, 255, 136, 0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Flame particles above bar
      const flameRng = (seed: number) => {
        let s = seed;
        return () => { s = (s * 48271 + 0) % 2147483647; return s / 2147483647; };
      };
      const fRand = flameRng(77);
      for (let i = 0; i < 20; i++) {
        const fx = barX + fRand() * barW;
        const fy = y - 5 - fRand() * 35;
        const fr = 1.5 + fRand() * 3;
        const flameGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * 2);
        flameGrad.addColorStop(0, `rgba(200, 255, 0, ${0.3 + fRand() * 0.3})`);
        flameGrad.addColorStop(1, "rgba(0, 255, 136, 0)");
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, fr * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // === MOTIVATIONAL TEXT ===
    y += barH + 45;
    const motText = isComplete
      ? "You Built This. Discipline Wins. 🔥"
      : "Keep pushing towards your goals! 💪";

    ctx.textAlign = "center";
    if (isComplete) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 255, 136, 0.3)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(200, 255, 180, 0.95)";
      ctx.font = "italic 600 28px 'Segoe UI', 'Inter', sans-serif";
      ctx.fillText(motText, W / 2, y);
      ctx.restore();
    } else {
      ctx.fillStyle = "rgba(160, 175, 190, 0.85)";
      ctx.font = "italic 300 26px 'Segoe UI', 'Inter', sans-serif";
      ctx.fillText(motText, W / 2, y);
    }

    // === COMPLETION: Gold Elite Badge (top-right of progress area) ===
    if (isComplete) {
      const badgeX = rightX - 60;
      const badgeY2 = y - 120;
      const badgeW2 = 180;
      const badgeH2 = 44;

      // Badge background
      ctx.save();
      ctx.shadowColor = "rgba(255, 215, 0, 0.3)";
      ctx.shadowBlur = 15;
      const goldGrad = ctx.createLinearGradient(badgeX - badgeW2 / 2, badgeY2, badgeX + badgeW2 / 2, badgeY2 + badgeH2);
      goldGrad.addColorStop(0, "rgba(255, 200, 50, 0.9)");
      goldGrad.addColorStop(0.5, "rgba(255, 230, 120, 0.95)");
      goldGrad.addColorStop(1, "rgba(255, 200, 50, 0.9)");
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.roundRect(badgeX - badgeW2 / 2, badgeY2, badgeW2, badgeH2, badgeH2 / 2);
      ctx.fill();
      ctx.restore();

      // Badge text
      ctx.fillStyle = "rgba(30, 20, 0, 0.9)";
      ctx.font = "800 15px 'Segoe UI', 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏆 ELITE COMPLETED", badgeX, badgeY2 + 28);
    }

    // === COMPLETION: Mini Weekly Progress Ring ===
    if (isComplete) {
      const ringCX = rightX - 40;
      const ringCY = y + 60;
      const ringR = 30;
      const ringLineW = 5;

      // Ring background
      ctx.beginPath();
      ctx.arc(ringCX, ringCY, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = ringLineW;
      ctx.stroke();

      // Ring fill
      ctx.save();
      ctx.shadowColor = "rgba(0, 255, 136, 0.4)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ringCX, ringCY, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * weeklyAdherence / 100));
      ctx.strokeStyle = "#00FF88";
      ctx.lineWidth = ringLineW;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // Ring percentage
      ctx.fillStyle = "rgba(240, 245, 250, 0.9)";
      ctx.font = "700 16px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${weeklyAdherence}%`, ringCX, ringCY);
      ctx.textBaseline = "alphabetic";

      // Label
      ctx.fillStyle = "rgba(150, 160, 175, 0.7)";
      ctx.font = "300 14px 'Segoe UI', sans-serif";
      ctx.fillText("Consistency", ringCX, ringCY + ringR + 18);
    }

    // === FOOTER ===
    ctx.fillStyle = "rgba(120, 130, 145, 0.6)";
    ctx.font = "300 22px 'Segoe UI', 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Generated by Surya-FitAi", W / 2, H - 90);

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
    ctx.font = "300 20px 'Segoe UI', 'Inter', sans-serif";
    ctx.fillText(dateStr, W / 2, H - 60);

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.95);
    });
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Surya-FitAi-Progress-${userName.replace(/\s/g, "-")}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
    setShowShare(true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      const blob = await generateImage();
      const file = new File([blob], "surya-fitai-progress.jpg", { type: "image/jpeg" });
      try {
        await navigator.share({
          title: "My Surya-FitAi Progress",
          text: shareCaption,
          files: [file],
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

  return (
    <div className="space-y-3" data-tour="download-progress">
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
              {captionCopied ? "Copied!" : "Copy Caption"}
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
