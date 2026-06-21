export type AuthRole =
  | "owner"
  | "admin"
  | "guest"
  | "user"
  | "vip"
  | "platinum_vip"
  | "host"
  | "mod";

type SupabaseLikeUser = {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

const PROFILE_COLOR_PALETTE = [
  "#22c55e",
  "#3fb950",
  "#58a6ff",
  "#a371f7",
  "#ef4444",
  "#f59e0b",
];
const OWNER_TOKENS = new Set(["owner", "malek", "المالك"]);
const ADMIN_TOKENS = new Set(["admin", "أدمن"]);
const SUSPICIOUS_TEST_TOKENS = new Set([
  "check",
  "test",
  "temp",
  "demo",
  "verify",
  "trial",
  "testing",
  "اختبار",
  "تجريبي",
  "فحص",
  "تست",
]);

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function splitNicknameTokens(value: string) {
  return normalizeToken(value)
    .split(/[\s\-_]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function normalizeAuthRole(rawRole?: string): AuthRole {
  const role = normalizeToken(rawRole || "");
  if (role === "owner" || role === "malek" || role === "المالك") return "owner";
  if (role === "admin" || role === "أدمن") return "admin";
  if (
    role === "guest" ||
    role === "user" ||
    role === "vip" ||
    role === "platinum_vip" ||
    role === "host" ||
    role === "mod"
  ) {
    return role;
  }
  return "user";
}

export function getResolvedSupabaseNickname(user: SupabaseLikeUser): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [
    meta.nickname,
    meta.full_name,
    meta.name,
    meta.preferred_username,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function getDeterministicPaletteColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PROFILE_COLOR_PALETTE[hash % PROFILE_COLOR_PALETTE.length] ?? "#58a6ff";
}

export function getResolvedSupabaseColor(user: SupabaseLikeUser): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.color === "string" && meta.color.trim()) {
    return meta.color.trim();
  }

  const seed = [
    typeof user?.id === "string" ? user.id : "",
    typeof user?.email === "string" ? user.email : "",
    getResolvedSupabaseNickname(user),
  ]
    .filter(Boolean)
    .join("|");

  return getDeterministicPaletteColor(seed || "lamma-default-user");
}

const AUTH_REDIRECT_QUERY_KEYS = ["room", "invite", "reading"] as const;

/** Preserve deep-link params (room/invite/reading) after Supabase OAuth/email redirects. */
export function buildAuthRedirectUrl(fallbackOrigin?: string): string {
  if (typeof window === "undefined") {
    return (fallbackOrigin || import.meta.env.VITE_APP_URL || "").trim();
  }

  const current = new URL(window.location.href);
  const redirect = new URL(
    `${current.origin}${current.pathname || "/"}`,
  );

  for (const key of AUTH_REDIRECT_QUERY_KEYS) {
    const value = current.searchParams.get(key);
    if (value) {
      redirect.searchParams.set(key, value);
    }
  }

  if (!redirect.searchParams.has("room")) {
    redirect.searchParams.set("room", "egypt");
  }

  return redirect.toString();
}

export function hasPlaceholderSupabaseNickname(user: SupabaseLikeUser): boolean {
  const nickname = getResolvedSupabaseNickname(user);
  const role = normalizeAuthRole(
    typeof user?.user_metadata?.role === "string"
      ? user.user_metadata.role
      : undefined,
  );

  if (!nickname) return true;

  const normalizedNickname = normalizeToken(nickname);
  const tokens = splitNicknameTokens(nickname);
  const hasSuspiciousToken = tokens.some((token) =>
    SUSPICIOUS_TEST_TOKENS.has(token),
  );
  const hasOwnerToken = tokens.some((token) => OWNER_TOKENS.has(token));
  const hasAdminToken = tokens.some((token) => ADMIN_TOKENS.has(token));

  if (role === "owner") {
    if (OWNER_TOKENS.has(normalizedNickname)) return true;
    if (hasOwnerToken && hasSuspiciousToken) return true;
  }

  if (role === "admin") {
    if (ADMIN_TOKENS.has(normalizedNickname)) return true;
    if (hasAdminToken && hasSuspiciousToken) return true;
  }

  return false;
}
