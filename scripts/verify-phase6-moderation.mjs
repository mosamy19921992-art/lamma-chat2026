/**
 * Phase 6 moderation hook + social bundle closure checks (static, no network).
 * Usage: node scripts/verify-phase6-moderation.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const hookPath = join(root, "src/hooks/useModeration.ts");
const chatScreenPath = join(root, "src/components/ChatScreen.tsx");
const profileModalPath = join(
  root,
  "src/components/modals/UserProfilePageModal.tsx",
);
const chatScreen = readFileSync(chatScreenPath, "utf8");
const profileModal = readFileSync(profileModalPath, "utf8");
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

let failed = 0;

function pass(label) {
  console.log(`[PASS] ${label}`);
}

function fail(label, detail = "") {
  console.log(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

if (existsSync(hookPath)) pass("Hook exists: useModeration.ts");
else fail("Hook exists: useModeration.ts");

const moderation = readFileSync(hookPath, "utf8");

if (moderation.includes("export function useModeration")) {
  pass("useModeration exported");
} else {
  fail("useModeration exported");
}

if (moderation.includes("fetchBannedUserRows")) {
  pass("Ban sync lives in useModeration");
} else {
  fail("Ban sync lives in useModeration");
}

if (chatScreen.includes("useModeration")) {
  pass("ChatScreen imports useModeration");
} else {
  fail("ChatScreen imports useModeration");
}

const forbiddenChatPatterns = [
  'channel("banned_users_sync")',
  "fetchMyActiveSanctions()",
  "const addBanEntry = async",
  "mergeBanLists(",
  'supabase.from("banned_users")',
];

for (const pattern of forbiddenChatPatterns) {
  if (!chatScreen.includes(pattern)) {
    pass(`Removed duplicate pattern: ${pattern.split("\n")[0]}`);
  } else {
    fail("Duplicate moderation logic still in ChatScreen", pattern);
  }
}

if (
  profileModal.includes('lazy(() => import("../social/SocialFeedPanel"))') &&
  profileModal.includes("<Suspense") &&
  !profileModal.includes('import { SocialFeedPanel } from "../social/SocialFeedPanel"')
) {
  pass("UserProfilePageModal lazy-loads SocialFeedPanel");
} else {
  fail("UserProfilePageModal lazy-loads SocialFeedPanel");
}

if (chatScreen.includes('lazy(() => import("./social/SocialFeedPanel"))')) {
  pass("ChatScreen lazy-loads SocialFeedPanel");
} else {
  fail("ChatScreen lazy-loads SocialFeedPanel");
}

if (packageJson.scripts?.["verify:phase6"]) {
  pass("package.json defines verify:phase6");
} else {
  fail("package.json defines verify:phase6");
}

if (packageJson.scripts?.["verify:all"]?.includes("verify:phase6")) {
  pass("verify:all includes verify:phase6");
} else {
  fail("verify:all includes verify:phase6");
}

console.log(
  `\nSummary: ${failed === 0 ? "PHASE 6 MODERATION OK" : `${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
