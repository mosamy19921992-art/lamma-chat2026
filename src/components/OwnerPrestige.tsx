import React from "react";
import { Crown } from "lucide-react";

/** Crown + flame aura beside owner names */
export function OwnerCrownMark({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`lamma-boss-sigil lamma-owner-crown-mark ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      title="المالك"
    >
      <Crown
        size={Math.max(10, size * 0.72)}
        strokeWidth={2.4}
        className="relative z-[2] text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.85)]"
        fill="currentColor"
        fillOpacity={0.32}
      />
    </span>
  );
}

/** Fire halo wrapper around owner avatars */
export function OwnerAvatarAura({
  active = true,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;
  return <div className="lamma-owner-aura">{children}</div>;
}

export default OwnerCrownMark;
