import React from "react";
import { OWNER_ID_CARD_IMAGE } from "../lib/ownerIdentity";

export interface OwnerIdCardProps {
  nickname: string;
  tagline?: string;
  compact?: boolean;
  className?: string;
}

/** Full BOSS owner identification card with live member details overlaid. */
export function OwnerIdCard({
  nickname,
  tagline = "غرفة القيادة • LAMMA CHAT",
  compact = false,
  className = "",
}: OwnerIdCardProps) {
  return (
    <div
      className={`owner-id-card ${compact ? "owner-id-card--compact" : ""} ${className}`.trim()}
      dir="rtl"
    >
      <img
        src={OWNER_ID_CARD_IMAGE}
        alt="بطاقة المالك BOSS"
        className="owner-id-card__art"
        draggable={false}
      />
      <div className="owner-id-card__overlay" aria-hidden="false">
        <div className="owner-id-card__identity">
          <div className="owner-id-card__nickname">{nickname}</div>
          <div className="owner-id-card__role">BOSS • OWNER • المالك</div>
          {tagline ? <div className="owner-id-card__tagline">{tagline}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default OwnerIdCard;
