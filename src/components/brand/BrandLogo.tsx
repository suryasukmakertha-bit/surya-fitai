interface BrandLogoProps {
  /** size of SF icon square in px */
  size?: number;
  /** Hide the wordmark, only render the SF icon */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Surya-FitAi brand lockup.
 * - SF icon (dark tile, gradient mark) at `size`px
 * - Wordmark: "Surya-Fit" in foreground color, "Ai" in brand gradient
 */
export default function BrandLogo({ size = 32, iconOnly = false, className = "" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/logo-new.png"
        alt="Surya-FitAi"
        height={size}
        className="shrink-0"
        style={{ height: size, width: "auto", objectFit: "contain" }}
      />
      {!iconOnly && (
        <span className="font-display font-extrabold tracking-tight leading-none text-[18px] sm:text-[20px] flex items-baseline">
          <span className="text-foreground">Surya-Fit</span>
          <span className="text-gradient ml-[1px]">Ai</span>
        </span>
      )}
    </span>
  );
}