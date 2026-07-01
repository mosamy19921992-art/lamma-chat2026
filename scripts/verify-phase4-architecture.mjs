/**
 * Phase 4 architecture closure checks (static, no network).
 * Usage: node scripts/verify-phase4-architecture.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const requiredServices = [
  "src/services/auth/userProfileMetadataService.ts",
  "src/services/profile/nicknameChangeService.ts",
  "src/services/chat/ownerActivityLogService.ts",
  "src/services/chat/ownerDashboardService.ts",
];

const chatScreenPath = join(root, "src/components/ChatScreen.tsx");
const chatScreen = readFileSync(chatScreenPath, "utf8");
const moderationHookPath = join(root, "src/hooks/useModeration.ts");
const moderationHook = existsSync(moderationHookPath)
  ? readFileSync(moderationHookPath, "utf8")
  : "";

let failed = 0;

function pass(label) {
  console.log(`[PASS] ${label}`);
}

function fail(label, detail = "") {
  console.log(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

for (const rel of requiredServices) {
  const abs = join(root, rel);
  if (existsSync(abs)) pass(`Service exists: ${rel}`);
  else fail(`Service exists: ${rel}`);
}

const requiredImports = [
  "fetchOwnerDashboardBundle",
  "persistRoomMediaMessage",
  "uploadPublicRoomMediaFile",
];

for (const token of requiredImports) {
  if (chatScreen.includes(token)) pass(`ChatScreen uses ${token}`);
  else fail(`ChatScreen uses ${token}`);
}

const moderationImports = ["fetchBannedUserRows", "insertBannedUserRow"];
const settingsImports = ["upsertOwnerSettingsRow"];
const nicknameImports = ["fetchNicknameChangeRequests"];
for (const token of moderationImports) {
  if (chatScreen.includes(token) || moderationHook.includes(token)) {
    pass(`Moderation stack uses ${token}`);
  } else {
    fail(`Moderation stack uses ${token}`);
  }
}

const settingsHookPath = join(root, "src/hooks/useOwnerSettingsSync.ts");
const settingsHook = existsSync(settingsHookPath)
  ? readFileSync(settingsHookPath, "utf8")
  : "";

for (const token of settingsImports) {
  if (chatScreen.includes(token) || settingsHook.includes(token)) {
    pass(`Owner settings stack uses ${token}`);
  } else {
    fail(`Owner settings stack uses ${token}`);
  }
}

const nicknameHookPath = join(root, "src/hooks/useNicknameChangeRequests.ts");
const nicknameHook = existsSync(nicknameHookPath)
  ? readFileSync(nicknameHookPath, "utf8")
  : "";

for (const token of nicknameImports) {
  if (chatScreen.includes(token) || nicknameHook.includes(token)) {
    pass(`Nickname stack uses ${token}`);
  } else {
    fail(`Nickname stack uses ${token}`);
  }
}

const forbiddenDirect = [
  'supabase.from("owner_settings")',
  'supabase.from("nickname_change_requests")',
  'supabase.from("owner_activity_logs")',
  'supabase.storage\n        .from("chat-media")',
];

for (const pattern of forbiddenDirect) {
  if (!chatScreen.includes(pattern)) pass(`No direct pattern: ${pattern.split("\n")[0]}`);
  else fail(`Removed direct Supabase call still present`, pattern.split("\n")[0]);
}

const loginHtml = readFileSync(join(root, "public/login.html"), "utf8");
if (loginHtml.includes('window.location.replace("/")')) {
  pass("login.html redirects to SPA root");
} else {
  fail("login.html redirects to SPA root");
}

console.log(`\nSummary: ${failed === 0 ? "PHASE 4 ARCHITECTURE OK" : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
