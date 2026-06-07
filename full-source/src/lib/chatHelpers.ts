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

export const getRoleFromAuthor = (
  author: string,
  currentUserObj: any,
): "owner" | "admin" | "platinum_vip" | "vip" | "none" => {
  if (author === currentUserObj.nickname) {
    const roleLower = currentUserObj.role.toLowerCase();
    if (
      roleLower === "owner" ||
      roleLower === "malek" ||
      roleLower === "المالك"
    )
      return "owner";
    if (roleLower === "admin" || roleLower === "أدمن" || roleLower === "مشرف")
      return "admin";
    if (roleLower === "platinum_vip") return "platinum_vip";
    if (roleLower === "vip") return "vip";
    return "none";
  }

  if (
    author.includes("تاج المالك") ||
    author.includes("(المالك)") ||
    author.includes("المالك") ||
    author.includes("Owner")
  )
    return "owner";
  if (
    author.includes("(أدمن)") ||
    author.includes("أدمن") ||
    author.includes("Admin")
  )
    return "admin";
  if (author.includes("بلاتيني") || author.includes("platinum"))
    return "platinum_vip";
  if (
    author.includes("(VIP)") ||
    author.includes("VIP") ||
    author.includes("vip")
  )
    return "vip";

  return "none";
};

export const getFrameFromAuthor = (author: string, currentUserObj: any): string => {
  if (author === currentUserObj.nickname) {
    return currentUserObj.frame || "";
  }
  const role = getRoleFromAuthor(author, currentUserObj);
  if (role === "platinum_vip") {
    return "from-yellow-400 via-amber-500 to-yellow-600";
  }
  return "";
};
