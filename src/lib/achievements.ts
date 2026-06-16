export type UserStats = {
  messagesSent: number;
  giftsSent: number;
  firstVisitAt: number;
  sessionCount: number;
};

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
};

const STATS_KEY = "lamma_user_stats";

function safeReadStats(): UserStats {
  const fallback: UserStats = {
    messagesSent: 0,
    giftsSent: 0,
    firstVisitAt: Date.now(),
    sessionCount: 1,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      localStorage.setItem(STATS_KEY, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<UserStats>;
    return {
      messagesSent: Number(parsed.messagesSent) || 0,
      giftsSent: Number(parsed.giftsSent) || 0,
      firstVisitAt: Number(parsed.firstVisitAt) || Date.now(),
      sessionCount: Number(parsed.sessionCount) || 1,
    };
  } catch {
    return fallback;
  }
}

function writeStats(stats: UserStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function bumpUserStat(
  field: keyof Pick<UserStats, "messagesSent" | "giftsSent" | "sessionCount">,
  amount = 1,
): UserStats {
  const stats = safeReadStats();
  stats[field] = (stats[field] as number) + amount;
  writeStats(stats);
  return stats;
}

export function getUserStats(): UserStats {
  return safeReadStats();
}

export function computeAchievements(
  stats: UserStats,
  role: string,
): Achievement[] {
  const daysSinceJoin = Math.floor(
    (Date.now() - stats.firstVisitAt) / (24 * 60 * 60 * 1000),
  );

  const items: Achievement[] = [
    {
      id: "first-message",
      icon: "🌟",
      title: "أول رسالة",
      description: "أرسلت أول رسالة في الشات",
      earned: stats.messagesSent >= 1,
    },
    {
      id: "active-talker",
      icon: "💬",
      title: "متحدث نشط",
      description: "أرسلت 50 رسالة أو أكثر",
      earned: stats.messagesSent >= 50,
    },
    {
      id: "generous",
      icon: "🎁",
      title: "كريم",
      description: "أرسلت 5 هدايا أو أكثر",
      earned: stats.giftsSent >= 5,
    },
    {
      id: "regular",
      icon: "📅",
      title: "عضو دائم",
      description: "مرّ 7 أيام منذ أول زيارة",
      earned: daysSinceJoin >= 7,
    },
    {
      id: "loyal",
      icon: "🔁",
      title: "زائر مخلص",
      description: "دخلت الشات 10 مرات أو أكثر",
      earned: stats.sessionCount >= 10,
    },
  ];

  if (role === "vip" || role === "platinum_vip") {
    items.push({
      id: "vip",
      icon: "⭐",
      title: "عضو VIP",
      description: "لديك عضوية VIP نشطة",
      earned: true,
    });
  }

  if (role === "admin") {
    items.push({
      id: "admin",
      icon: "🛡️",
      title: "مشرف",
      description: "صلاحيات إدارية في الشات",
      earned: true,
    });
  }

  if (role === "owner") {
    items.push({
      id: "owner",
      icon: "👑",
      title: "مالك الشات",
      description: "مالك غرفة لمة",
      earned: true,
    });
  }

  return items;
}
