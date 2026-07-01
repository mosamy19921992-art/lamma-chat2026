/**
 * Phase 7 owner member access hook + lib unit tests closure.
 * Usage: node scripts/verify-phase7-owner.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const hookPath = join(root, "src/hooks/useOwnerMemberAccess.ts");
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

if (existsSync(hookPath)) pass("Hook exists: useOwnerMemberAccess.ts");
else fail("Hook exists: useOwnerMemberAccess.ts");

const hook = readFileSync(hookPath, "utf8");

if (hook.includes("export function useOwnerMemberAccess")) {
  pass("useOwnerMemberAccess exported");
} else {
  fail("useOwnerMemberAccess exported");
}

if (hook.includes("upsertOwnerMemberPermissions")) {
  pass("Member permissions sync lives in hook");
} else {
  fail("Member permissions sync lives in hook");
}

if (chatScreen.includes("useOwnerMemberAccess")) {
  pass("ChatScreen imports useOwnerMemberAccess");
} else {
  fail("ChatScreen imports useOwnerMemberAccess");
}

const forbiddenPatterns = [
  'channel("owner_permissions_sync")',
  'channel("owner_cosmetics_sync")',
  "upsertOwnerMemberPermissions(",
  "const [memberCustomPermissions, setMemberCustomPermissions]",
];

for (const pattern of forbiddenPatterns) {
  if (!chatScreen.includes(pattern)) {
    pass(`Removed duplicate pattern: ${pattern.split("\n")[0]}`);
  } else {
    fail("Duplicate owner member access logic still in ChatScreen", pattern);
  }
}

if (packageJson.scripts?.["verify:phase7"]) {
  pass("package.json defines verify:phase7");
} else {
  fail("package.json defines verify:phase7");
}

if (packageJson.scripts?.["verify:unit"]) {
  pass("package.json defines verify:unit");
} else {
  fail("package.json defines verify:unit");
}

if (packageJson.scripts?.["verify:all"]?.includes("verify:phase7")) {
  pass("verify:all includes verify:phase7");
} else {
  fail("verify:all includes verify:phase7");
}

const unit = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--test", "scripts/unit-lib.test.ts"],
  { cwd: root, encoding: "utf8", shell: process.platform === "win32" },
);

if (unit.status === 0) {
  pass("Lib unit tests (authProfile, inviteAccess, chatHelpers)");
} else {
  fail("Lib unit tests", unit.stderr || unit.stdout || `exit ${unit.status}`);
}

console.log(
  `\nSummary: ${failed === 0 ? "PHASE 7 OWNER OK" : `${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
