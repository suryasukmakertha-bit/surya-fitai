import { Footprints } from "lucide-react";

interface Props {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function RunningIcon({ size = 24, color = "#ff6b00", className, style }: Props) {
  return (
    <Footprints size={size} color={color} className={className} style={style} aria-hidden="true" />
  );
}
