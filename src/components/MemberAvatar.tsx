import React from "react";
import {
  isAvatarImageUrl,
  normalizeAvatarValue,
} from "../lib/avatarDisplay";

type MemberAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<MemberAvatarSize, string> = {
  xs: "text-[11px]",
  sm: "text-[13px]",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

export interface MemberAvatarProps {
  avatar?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  size?: MemberAvatarSize;
}

export function MemberAvatar({
  avatar,
  alt = "صورة العضو",
  className = "",
  imageClassName = "",
  size = "md",
}: MemberAvatarProps) {
  const value = normalizeAvatarValue(avatar);

  if (isAvatarImageUrl(value)) {
    return (
      <img
        src={value}
        alt={alt}
        className={`object-cover ${imageClassName || className}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center leading-none select-none ${SIZE_CLASS[size]} ${className}`}
      aria-hidden={alt ? undefined : true}
    >
      {value}
    </span>
  );
}
