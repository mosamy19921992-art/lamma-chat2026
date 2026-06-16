const INVITE_FLAG_KEY = "lamma_invite_verified";
export const INVITE_QUERY_PARAM = "invite";
export const INVITE_QUERY_VALUE = "lamma";

export function markInviteAccessFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get(INVITE_QUERY_PARAM) !== INVITE_QUERY_VALUE) return false;
  try {
    localStorage.setItem(INVITE_FLAG_KEY, "1");
  } catch {
    // ignore
  }
  return true;
}

export function hasStoredInviteAccess(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(INVITE_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function appendInviteParam(link: string): string {
  try {
    const url = new URL(link);
    url.searchParams.set(INVITE_QUERY_PARAM, INVITE_QUERY_VALUE);
    return url.toString();
  } catch {
    const sep = link.includes("?") ? "&" : "?";
    return `${link}${sep}${INVITE_QUERY_PARAM}=${INVITE_QUERY_VALUE}`;
  }
}
