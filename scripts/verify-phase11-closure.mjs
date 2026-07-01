/**
 * Phase 11 final closure gate — hooks matrix + critical path bundle checks.
 * Usage: node scripts/verify-phase11-closure.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

const requiredHooks = [
  "src/hooks/useRoomNavigation.ts",
  "src/hooks/useStoreSubscription.ts",
  "src/hooks/useModeration.ts",
  "src/hooks/useOwnerMemberAccess.ts",
  "src/hooks/useOwnerSettingsSync.ts",
  "src/hooks/useNicknameChangeRequests.ts",
  "src/hooks/useTempEntryTopic.ts",
];

const criticalBundleStrings = [
  "Ctrl+Enter",
  "500",
  "طلبات تغيير الاسم",
  "تم حفظ التوبيك المؤقت",
];

let failed = 0;

function pass(label) {
  console.log(`[PASS] ${label}`);
}

function fail(label, detail = "") {
  console.log(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

for (const rel of requiredHooks) {
  if (existsSync(join(root, rel))) pass(`Hook exists: ${rel.split("/").pop()}`);
  else fail(`Hook exists: ${rel}`);
}

const chatScreen = readFileSync(
  join(root, "src/components/ChatScreen.tsx"),
  "utf8",
);

const wiredHooks = [
  "useRoomNavigation",
  "useStoreSubscription",
  "useModeration",
  "useOwnerMemberAccess",
  "useOwnerSettingsSync",
  "useNicknameChangeRequests",
  "useTempEntryTopic",
];

for (const hookName of wiredHooks) {
  if (chatScreen.includes(hookName)) pass(`ChatScreen wires ${hookName}`);
  else fail(`ChatScreen wires ${hookName}`);
}

for (let phase = 4; phase <= 11; phase += 1) {
  const key = `verify:phase${phase}`;
  if (packageJson.scripts?.[key]) pass(`package.json defines ${key}`);
  else fail(`package.json defines ${key}`);
}

if (packageJson.scripts?.["verify:all"]?.includes("verify:phase11")) {
  pass("verify:all includes verify:phase11");
} else {
  fail("verify:all includes verify:phase11");
}

const distAssets = join(root, "dist/assets");
if (existsSync(distAssets)) {
  const bundles = readFileSync(
    join(root, "dist/index.html"),
    "utf8",
  ).match(/\/assets\/[^"']+\.js/g);

  if (bundles?.length) {
    pass(`Production bundles resolved (${bundles.length})`);
    const chatBundle = bundles.find((entry) => entry.includes("chat-screen"));
    if (chatBundle) {
      const bundlePath = join(root, "dist", chatBundle.replace(/^\//, ""));
      const bundleText = readFileSync(bundlePath, "utf8");
      for (const token of criticalBundleStrings) {
        if (bundleText.includes(token)) pass(`Bundle includes: ${token}`);
        else fail(`Bundle missing critical string: ${token}`);
      }
    } else {
      fail("chat-screen bundle not found in dist/index.html");
    }

    const assetFiles = readdirSync(distAssets);
    const socialChunk = assetFiles.find((name) => name.includes("SocialFeedPanel"));
    if (socialChunk) pass("Lazy social feed chunk present");
    else fail("Lazy social feed chunk missing from dist/assets");
  } else {
    fail("Could not resolve production bundles from dist/index.html");
  }
} else {
  fail("dist/assets missing — run npm run build before verify:phase11");
}

const unit = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--test", "scripts/unit-lib.test.ts"],
  { cwd: root, encoding: "utf8", shell: process.platform === "win32" },
);

if (unit.status === 0) {
  pass("Lib unit tests (closure)");
} else {
  fail("Lib unit tests", unit.stderr || unit.stdout || `exit ${unit.status}`);
}

console.log(
  `\nSummary: ${failed === 0 ? "PHASE 11 CLOSURE OK" : `${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
