/**
 * Phase 8 owner settings sync hook closure checks (static + unit tests).
 * Usage: node scripts/verify-phase8-owner-settings.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const hookPath = join(root, "src/hooks/useOwnerSettingsSync.ts");
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

if (existsSync(hookPath)) pass("Hook exists: useOwnerSettingsSync.ts");
else fail("Hook exists: useOwnerSettingsSync.ts");

const hook = readFileSync(hookPath, "utf8");

if (hook.includes("export function useOwnerSettingsSync")) {
  pass("useOwnerSettingsSync exported");
} else {
  fail("useOwnerSettingsSync exported");
}

if (hook.includes("upsertOwnerSettingsRow")) {
  pass("Owner settings persist lives in hook");
} else {
  fail("Owner settings persist lives in hook");
}

if (chatScreen.includes("useOwnerSettingsSync")) {
  pass("ChatScreen imports useOwnerSettingsSync");
} else {
  fail("ChatScreen imports useOwnerSettingsSync");
}

const forbiddenPatterns = [
  'channel("owner_settings_sync")',
  'channel("public_chat_settings_sync")',
  "upsertOwnerSettingsRow(",
  "ownerSettingsSyncReadyRef",
];

for (const pattern of forbiddenPatterns) {
  if (!chatScreen.includes(pattern)) {
    pass(`Removed duplicate pattern: ${pattern.split("\n")[0]}`);
  } else {
    fail("Duplicate owner settings sync still in ChatScreen", pattern);
  }
}

if (packageJson.scripts?.["verify:phase8"]) {
  pass("package.json defines verify:phase8");
} else {
  fail("package.json defines verify:phase8");
}

if (packageJson.scripts?.["verify:all"]?.includes("verify:phase8")) {
  pass("verify:all includes verify:phase8");
} else {
  fail("verify:all includes verify:phase8");
}

const unit = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--test", "scripts/unit-lib.test.ts"],
  { cwd: root, encoding: "utf8", shell: process.platform === "win32" },
);

if (unit.status === 0) {
  pass("Lib unit tests (7 checks)");
} else {
  fail("Lib unit tests", unit.stderr || unit.stdout || `exit ${unit.status}`);
}

console.log(
  `\nSummary: ${failed === 0 ? "PHASE 8 OWNER SETTINGS OK" : `${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
