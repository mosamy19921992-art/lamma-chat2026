import React from "react";
import type { ChatMember, MemberCosmeticGrant, UserSession } from "../lib/chatTypes";
import {
  getRoleFromAuthor,
  getStoreVipChip,
  isOwnerAuthor,
} from "../lib/chatHelpers";
import { OWNER_DISPLAY_BADGE } from "../lib/ownerIdentity";

interface MemberPrestigeBadgesProps {
  member: Pick<ChatMember, "nickname" | "role" | "badge" | "title">;
  currentUser: UserSession;
  chatMembers: ChatMember[];
  subscription?: { type?: string; isActive?: boolean; expiresAt?: number } | null;
  memberCosmeticGrants?: Record<string, MemberCosmeticGrant>;
  size?: "xs" | "sm";
  showBadge?: boolean;
  showTitle?: boolean;
  highlightYou?: boolean;
}

export function MemberPrestigeBadges({
  member,
  currentUser,
  chatMembers,
  subscription,
  memberCosmeticGrants,
  size = "xs",
  showBadge = true,
  showTitle = true,
  highlightYou = false,
}: MemberPrestigeBadgesProps) {
  const isYou = member.nickname === currentUser.nickname;
  const storeForMember =
    isYou && subscription?.isActive && (subscription.expiresAt ?? 0) > Date.now()
      ? subscription
      : null;
  const vipChip = getStoreVipChip(
    member.nickname,
    currentUser,
    storeForMember ?? undefined,
    memberCosmeticGrants,
  );
  const role = getRoleFromAuthor(member.nickname, currentUser, chatMembers);
  const ownerRow = isOwnerAuthor(member.nickname, currentUser, chatMembers);
  const textSize = size === "sm" ? "text-[8px]" : "text-[7px]";

  const showPlatinum =
    !ownerRow &&
    (vipChip === "platinum" || member.role === "platinum_vip");
  const showVip =
    !ownerRow &&
    !showPlatinum &&
    (vipChip === "vip" || member.role === "vip");

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {highlightYou && isYou && (
        <span className={`${textSize} lamma-you-chip shrink-0`}>✦ أنت</span>
      )}
      {ownerRow && (
        <span className={`${textSize} lamma-role-chip lamma-role-owner lamma-boss-badge shrink-0`}>
          👑 {OWNER_DISPLAY_BADGE}
        </span>
      )}
      {!ownerRow && role === "admin" && (
        <span className={`${textSize} lamma-role-chip lamma-role-admin shrink-0`}>
          ADMIN
        </span>
      )}
      {!ownerRow && member.role === "mod" && (
        <span className={`${textSize} lamma-role-chip lamma-role-mod shrink-0`}>
          MOD
        </span>
      )}
      {showPlatinum && (
        <span className={`${textSize} lamma-role-chip lamma-role-plat shrink-0`}>
          PLATINUM
        </span>
      )}
      {showVip && (
        <span className={`${textSize} lamma-role-chip lamma-role-vip shrink-0`}>
          VIP
        </span>
      )}
      {showBadge && member.badge && (
        <span className={`${textSize} lamma-badge-chip shrink-0`}>{member.badge}</span>
      )}
      {showTitle && member.title && (
        <span className={`${textSize} lamma-title-chip shrink-0`}>
          [{member.title}]
        </span>
      )}
    </div>
  );
}
