import AMLogo from "./AMLogo";

interface BossSigilProps {
  size?: number;
  className?: string;
}

export default function BossSigil({ size = 14, className = "" }: BossSigilProps) {
  return (
    <span
      className={`lamma-boss-sigil ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <AMLogo size={size} variant="circular" glow={false} crownRole="none" />
    </span>
  );
}
