/**
 * Phase 5 layout hooks + bundle split closure checks (static, no network).
 * Usage: node scripts/verify-phase5-layout.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const requiredHooks = [
  "src/hooks/useRoomNavigation.ts",
  "src/hooks/useStoreSubscription.ts",
];

const chatScreenPath = join(root, "src/components/ChatScreen.tsx");
const chatScreen = readFileSync(chatScreenPath, "utf8");
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

for (const rel of requiredHooks) {
  const abs = join(root, rel);
  if (existsSync(abs)) pass(`Hook exists: ${rel}`);
  else fail(`Hook exists: ${rel}`);
}

const requiredImports = [
  "useRoomNavigation",
  "useStoreSubscription",
  "lazy(() => import(\"./social/SocialFeedPanel\"))",
];

for (const token of requiredImports) {
  if (chatScreen.includes(token)) pass(`ChatScreen imports ${token.split("(")[0]}`);
  else fail(`ChatScreen imports ${token}`);
}

if (chatScreen.includes("<Suspense") && chatScreen.includes("<SocialFeedPanel")) {
  pass("SocialFeedPanel wrapped in Suspense");
} else {
  fail("SocialFeedPanel wrapped in Suspense");
}

const forbiddenPatterns = [
  "// Global Automatic Bot Subscription Monitor",
  "const handleSwitchRoom = (roomId: string)",
  "fetchActivePlans()",
  "subscribeToNewOrders(",
];

for (const pattern of forbiddenPatterns) {
  if (!chatScreen.includes(pattern)) {
    pass(`Removed duplicate pattern: ${pattern.split("\n")[0]}`);
  } else {
    fail(`Duplicate logic still in ChatScreen`, pattern.split("\n")[0]);
  }
}

const roomNav = readFileSync(join(root, requiredHooks[0]), "utf8");
const storeSub = readFileSync(join(root, requiredHooks[1]), "utf8");

if (roomNav.includes("export function useRoomNavigation")) {
  pass("useRoomNavigation exported");
} else {
  fail("useRoomNavigation exported");
}

if (storeSub.includes("export function useStoreSubscription")) {
  pass("useStoreSubscription exported");
} else {
  fail("useStoreSubscription exported");
}

if (storeSub.includes("fetchActivePlans")) {
  pass("Subscription fetch lives in useStoreSubscription");
} else {
  fail("Subscription fetch lives in useStoreSubscription");
}

if (packageJson.scripts?.["verify:phase5"]) {
  pass("package.json defines verify:phase5");
} else {
  fail("package.json defines verify:phase5");
}

if (packageJson.scripts?.["verify:all"]?.includes("verify:phase5")) {
  pass("verify:all includes verify:phase5");
} else {
  fail("verify:all includes verify:phase5");
}

console.log(
  `\nSummary: ${failed === 0 ? "PHASE 5 LAYOUT OK" : `${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
