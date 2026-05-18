import { CSSProperties } from "react";

export type SunyMood = "excited" | "focused" | "hype" | "struggle" | "celebrate";

// Suny SVG mascot used inside the Challenge Timer popup.
// SVG + CSS only — no image files. Mirrors the helmet/visor base
// from MascotCompanion.tsx so the character stays consistent.
function Eyes({ mood }: { mood: SunyMood }) {
  const bright = "#FFB300";
  const intense = "#FF6A00";
  const glow = "drop-shadow(0 0 4px #FF6A00)";
  switch (mood) {
    case "excited":
      return (
        <g style={{ filter: glow }} fill={bright}>
          <polygon points="58,94 66,80 74,94" />
          <polygon points="86,94 94,80 102,94" />
        </g>
      );
    case "focused":
      return (
        <g style={{ filter: glow }} stroke={intense} strokeWidth="4" strokeLinecap="round">
          <line x1="56" y1="89" x2="76" y2="89" />
          <line x1="84" y1="89" x2="104" y2="89" />
        </g>
      );
    case "hype":
      return (
        <g style={{ filter: glow }} fill={bright}>
          <circle cx="66" cy="89" r="7" />
          <circle cx="94" cy="89" r="7" />
          <circle cx="66" cy="89" r="3" fill="#0a0a0a" />
          <circle cx="94" cy="89" r="3" fill="#0a0a0a" />
        </g>
      );
    case "struggle":
      return (
        <g style={{ filter: glow }} stroke={intense} strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M56 86 L66 92 L76 86" />
          <path d="M84 92 L94 86 L104 92" />
        </g>
      );
    case "celebrate":
      return (
        <g style={{ filter: glow }} fill={bright}>
          {[66, 94].map((cx) => (
            <polygon
              key={cx}
              points={`${cx},80 ${cx + 2.4},86 ${cx + 8},86 ${cx + 3.5},90 ${cx + 5.5},96 ${cx},92 ${cx - 5.5},96 ${cx - 3.5},90 ${cx - 8},86 ${cx - 2.4},86`}
            />
          ))}
        </g>
      );
  }
}

const animByMood: Record<SunyMood, string> = {
  excited: "sunyBounce 1.4s ease-in-out infinite",
  focused: "none",
  hype: "sunyWiggle 0.6s ease-in-out infinite",
  struggle: "sunyShake 0.25s ease-in-out infinite",
  celebrate: "sunyJump 0.8s ease-in-out infinite",
};

export default function SunyMascot({ mood, size = 140 }: { mood: SunyMood; size?: number }) {
  const wrapStyle: CSSProperties = {
    width: size,
    height: size * 1.125,
    animation: animByMood[mood],
    transformOrigin: "center bottom",
  };
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <style>{`
        @keyframes sunyBounce { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-6px);} }
        @keyframes sunyWiggle { 0%,100% { transform: rotate(-3deg);} 50% { transform: rotate(3deg);} }
        @keyframes sunyShake  { 0%,100% { transform: translateX(0);} 25% { transform: translateX(-2px);} 75% { transform: translateX(2px);} }
        @keyframes sunyJump   { 0%,100% { transform: translateY(0);} 40% { transform: translateY(-14px);} 60% { transform: translateY(-10px);} }
        @keyframes sunySweat  { 0% { transform: translateY(0); opacity: 1;} 100% { transform: translateY(14px); opacity: 0;} }
        @keyframes sunyStar   { 0% { transform: scale(0.3) rotate(0deg); opacity: 0;} 30% { opacity: 1;} 100% { transform: scale(1.1) rotate(180deg); opacity: 0;} }
      `}</style>
      <div style={wrapStyle}>
        <svg viewBox="0 0 160 180" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id="sunyHelmet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F0F0F0" />
              <stop offset="100%" stopColor="#CFCFCF" />
            </linearGradient>
            <linearGradient id="sunyBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5F5F5" />
              <stop offset="100%" stopColor="#C8C8C8" />
            </linearGradient>
            <radialGradient id="sunyRing">
              <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FF6A00" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Body */}
          <rect x="50" y="118" width="60" height="44" rx="14" fill="url(#sunyBody)" stroke="#0a0a0a" strokeWidth="1.2" />
          <text x="80" y="156" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="14" fill="#FF6A00">S</text>
          <ellipse cx="46" cy="132" rx="6" ry="9" fill="#1a1a1a" />
          <ellipse cx="114" cy="132" rx="6" ry="9" fill="#1a1a1a" />

          {/* Helmet */}
          <ellipse cx="80" cy="72" rx="52" ry="50" fill="url(#sunyHelmet)" stroke="#0a0a0a" strokeWidth="1.2" />
          {/* Visor */}
          <rect x="36" y="56" width="88" height="50" rx="22" fill="#0a0a0a" />
          <rect x="38" y="58" width="84" height="14" rx="14" fill="#1a1a1a" opacity="0.7" />
          <Eyes mood={mood} />
          {/* Ears */}
          <circle cx="28" cy="78" r="11" fill="url(#sunyRing)" />
          <circle cx="30" cy="78" r="8" fill="#2a2a2a" stroke="#FF6A00" strokeWidth="1.6" />
          <circle cx="132" cy="78" r="11" fill="url(#sunyRing)" />
          <circle cx="130" cy="78" r="8" fill="#2a2a2a" stroke="#FF6A00" strokeWidth="1.6" />
          {/* L accent */}
          <path d="M68 30 L82 30 L82 34 L72 34 L72 44 L68 44 Z" fill="#FF6A00" />

          {/* Struggle sweat drop */}
          {mood === "struggle" && (
            <g style={{ animation: "sunySweat 1s ease-in-out infinite" }}>
              <path d="M120 50 Q116 58 120 62 Q124 58 120 50 Z" fill="#4FC3F7" stroke="#0288D1" strokeWidth="0.8" />
            </g>
          )}
        </svg>
      </div>

      {/* Celebrate star particles */}
      {mood === "celebrate" && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * Math.PI * 2;
            const dx = Math.cos(angle) * (size * 0.55);
            const dy = Math.sin(angle) * (size * 0.55);
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 14,
                  height: 14,
                  marginLeft: -7,
                  marginTop: -7,
                  transform: `translate(${dx}px, ${dy}px)`,
                  animation: `sunyStar 1.2s ease-out ${i * 0.1}s infinite`,
                  color: "#FFB300",
                  fontSize: 14,
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                ★
              </span>
            );
          })}
        </>
      )}
    </div>
  );
}