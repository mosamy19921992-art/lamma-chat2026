import type { ChatMember } from "./chatTypes";

export type FriendSuggestion = {
  id: string;
  nickname: string;
  role: string;
  avatar?: string | null;
  reason: string;
  score: number;
};

const ROLE_SCORE: Record<string, number> = {
  owner: 100,
  admin: 80,
  vip: 60,
  platinum_vip: 55,
  user: 20,
  guest: 10,
};

export function buildFriendSuggestions(
  members: ChatMember[],
  currentNickname: string,
  limit = 8,
): FriendSuggestion[] {
  const self = currentNickname.trim().toLowerCase();
  const seen = new Set<string>();

  return members
    .filter((member) => {
      const key = member.nickname.trim().toLowerCase();
      if (!key || key === self || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((member) => {
      const role = member.role || "user";
      const roleScore = ROLE_SCORE[role] ?? 15;
      const onlineScore = member.status === "online" ? 25 : 0;
      const score = roleScore + onlineScore;
      let reason = "متصل الآن في الغرفة";
      if (role === "owner") reason = "مالك الشات — تواصل معه للدعم";
      else if (role === "admin") reason = "مشرف نشط — يمكنه مساعدتك";
      else if (role === "vip" || role === "platinum_vip") reason = "عضو VIP نشط";
      else if (member.status !== "online") reason = "عضو شارك في الجلسة";

      return {
        id: member.id || member.nickname,
        nickname: member.nickname,
        role,
        avatar: member.avatar ?? null,
        reason,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
