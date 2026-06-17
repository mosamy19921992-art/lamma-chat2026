import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import type { MemberCosmeticGrant, UserSession } from "../lib/chatTypes";
import {
  hasStorePlatinumDisplay,
  hasStoreVipDisplay,
} from "../lib/chatHelpers";
import { isOwnerChatRole } from "../lib/ownerIdentity";

export type WelcomeMode = { kind: "session"; visible: boolean };

type WelcomeTier = "owner" | "admin" | "platinum" | "vip" | "guest" | "member";

function getWelcomeCopy(
  user: UserSession,
  subscription?: { type?: string; isActive?: boolean; expiresAt?: number } | null,
  grants?: Record<string, MemberCosmeticGrant>,
) {
  const role = (user.role || "").toLowerCase();

  if (isOwnerChatRole(role)) {
    return {
      title: `أهلاً يا ${user.nickname}`,
      subtitle: "قائد اللمة — الغرفة بانتظارك 👑",
      tier: "owner" as WelcomeTier,
    };
  }
  if (role === "admin") {
    return {
      title: `أهلاً ${user.nickname}`,
      subtitle: "حارس اللمة — صوتك مسموع 🛡️",
      tier: "admin" as WelcomeTier,
    };
  }
  if (
    hasStorePlatinumDisplay(user.nickname, user, subscription ?? undefined, grants)
  ) {
    return {
      title: `يا ${user.nickname}`,
      subtitle: "عضو Platinum — حضورك يفرق ✨",
      tier: "platinum" as WelcomeTier,
    };
  }
  if (
    hasStoreVipDisplay(user.nickname, user, subscription ?? undefined, grants) ||
    role === "vip" ||
    role === "platinum_vip"
  ) {
    return {
      title: `أهلاً ${user.nickname}`,
      subtitle: "عضو VIP — نورت اللمة 💎",
      tier: "vip" as WelcomeTier,
    };
  }
  if (role === "guest") {
    return {
      title: `مرحباً ${user.nickname}`,
      subtitle: "زُرتنا — سهرة أحلى معاك 🌟",
      tier: "guest" as WelcomeTier,
    };
  }
  return {
    title: `أهلاً ${user.nickname}`,
    subtitle: "نورت اللمة — اللمة تحلى بيك 💚",
    tier: "member" as WelcomeTier,
  };
}

export interface WelcomeMomentProps {
  user: UserSession;
  mode: WelcomeMode | null;
  onDismiss: () => void;
  subscription?: { type?: string; isActive?: boolean; expiresAt?: number } | null;
  grants?: Record<string, MemberCosmeticGrant>;
}

export function WelcomeMoment({
  user,
  mode,
  onDismiss,
  subscription,
  grants,
}: WelcomeMomentProps) {
  useEffect(() => {
    if (!mode?.visible || mode.kind !== "session") return;
    const timer = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [mode, onDismiss]);

  const copy = getWelcomeCopy(user, subscription, grants);

  return (
    <AnimatePresence>
      {mode?.visible && mode.kind === "session" && (
        <motion.div
          key="session-welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none lamma-welcome-overlay"
        >
          <motion.div
            initial={{ scale: 0.86, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: -10, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className={`lamma-welcome-card lamma-welcome-${copy.tier}`}
            dir="rtl"
          >
            <Sparkles className="lamma-welcome-sparkle" size={26} strokeWidth={2.2} />
            <h2 className="lamma-welcome-title">{copy.title}</h2>
            <p className="lamma-welcome-subtitle">{copy.subtitle}</p>
            {(user.title || user.badge) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
                {user.title && (
                  <span className="text-[9px] lamma-title-chip">[{user.title}]</span>
                )}
                {user.badge && (
                  <span className="text-[9px] lamma-badge-chip">{user.badge}</span>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
