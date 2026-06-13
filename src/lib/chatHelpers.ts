// Chat helpers extracted from ChatScreen.tsx — pure refactor, no behavior change.

export function getYoutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace("#", "").trim();
  const value = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (value.length !== 6) return `rgba(16,185,129,${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * getRoleFromAuthor — النسخة الآمنة
 *
 * الدور يُحدَّد فقط من:
 *   1. currentUserObj.role  (لو الرسالة من المستخدم الحالي)
 *   2. chatMembers list المُمررة (لو الرسالة من عضو آخر)
 *
 * لا يعتمد أبداً على نص الاسم لأن أي مستخدم يقدر يحط
 * "(المالك)" أو "Admin" في اسمه ويكسب صلاحيات بالخطأ.
 */
export const getRoleFromAuthor = (
  author: string,
  currentUserObj: any,
  chatMembers?: Array<{ nickname: string; role: string }>,
): "owner" | "admin" | "platinum_vip" | "vip" | "none" => {
  // --- المستخدم الحالي: استخدم الـ role المُخزن مباشرة ---
  if (author === currentUserObj.nickname) {
    const roleLower = (currentUserObj.role || "").toLowerCase();
    if (roleLower === "owner") return "owner";
    if (roleLower === "admin") return "admin";
    if (roleLower === "platinum_vip") return "platinum_vip";
    if (roleLower === "vip") return "vip";
    return "none";
  }

  // --- عضو آخر: ابحث في chatMembers فقط ---
  if (chatMembers && chatMembers.length > 0) {
    const member = chatMembers.find((m) => m.nickname === author);
    if (member) {
      const roleLower = (member.role || "").toLowerCase();
      if (roleLower === "owner") return "owner";
      if (roleLower === "admin") return "admin";
      if (roleLower === "platinum_vip") return "platinum_vip";
      if (roleLower === "vip") return "vip";
    }
  }

  return "none";
};

export const getFrameFromAuthor = (
  author: string,
  currentUserObj: any,
  chatMembers?: Array<{ nickname: string; role: string }>,
): string => {
  if (author === currentUserObj.nickname) {
    return currentUserObj.frame || "";
  }
  const role = getRoleFromAuthor(author, currentUserObj, chatMembers);
  if (role === "platinum_vip") {
    return "from-yellow-400 via-amber-500 to-yellow-600";
  }
  return "";
};

export function getShortenedNickname(nickname: string): string {
  let cleanName = nickname
    .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
    .trim();
  if (cleanName.startsWith("LC-Guest")) {
    cleanName = cleanName.replace("LC-Guest", "LC-");
  } else if (cleanName.startsWith("LC_Guest_")) {
    cleanName = cleanName.replace("LC_Guest_", "LC-");
  } else if (cleanName.startsWith("LammaGuest_")) {
    cleanName = cleanName.replace("LammaGuest_", "LC-");
  } else if (cleanName.startsWith("LammaGuest")) {
    cleanName = cleanName.replace("LammaGuest", "LC-");
  } else if (cleanName.includes("Guest")) {
    // If nickname contains Guest, like Guest-3891 or Guest492
    cleanName = cleanName.replace(/Guest[-_]*/gi, "LC-");
  } else if (cleanName.includes("زائر")) {
    cleanName = cleanName.replace(/زائر[-_]*/g, "LC-");
  }
  return cleanName;
}

