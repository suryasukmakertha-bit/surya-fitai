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
      <path d="M4 16v-2.38c0-.83.13-1.66.4-2.45l.32-.94C5.4 8.6 7.13 7.5 9 7.5c.83 0 1.5.67 1.5 1.5v3.5" />
      <path d="M4 16c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-1.5" />
      <path d="M14 13.5V11c0-.83.67-1.5 1.5-1.5 1.87 0 3.6 1.1 4.28 2.73l.32.94c.27.79.4 1.62.4 2.45V18" />
      <path d="M14 18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-1.5" />
    </svg>
  );
}
