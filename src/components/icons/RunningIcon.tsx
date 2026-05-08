interface Props {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function RunningIcon({ size = 24, color = "#ff6b00", className, style }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle cx="13" cy="4" r="2" />
      <path d="M7.5 13.5L10 12l2 5 3-3 2 2" />
      <path d="M10 12l1-4 3 1 2-3" />
      <path d="M7 17l1.5 3M15 13l2 4" />
    </svg>
  );
}
