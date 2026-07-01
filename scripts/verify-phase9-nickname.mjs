/**
 * Phase 9 nickname change requests hook closure checks (static + unit tests).
 * Usage: node scripts/verify-phase9-nickname.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const hookPath = join(root, "src/hooks/useNicknameChangeRequests.ts");
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

if (existsSync(hookPath)) pass("Hook exists: useNicknameChangeRequests.ts");
else fail("Hook exists: useNicknameChangeRequests.ts");

const hook = readFileSync(hookPath, "utf8");

if (hook.includes("export function useNicknameChangeRequests")) {
  pass("useNicknameChangeRequests exported");
} else {
  fail("useNicknameChangeRequests exported");
}

if (hook.includes("fetchNicknameChangeRequests")) {
  pass("Nickname fetch lives in hook");
} else {
  fail("Nickname fetch lives in hook");
}

if (hook.includes("submitNicknameChangeRequest")) {
  pass("Nickname submit lives in hook");
} else {
  fail("Nickname submit lives in hook");
}

if (hook.includes("processNicknameChangeRequest")) {
  pass("Nickname process lives in hook");
} else {
  fail("Nickname process lives in hook");
}

if (hook.includes("nickname_change_requests_owner_sync")) {
  pass("Owner realtime sync lives in hook");
} else {
  fail("Owner realtime sync lives in hook");
}

if (chatScreen.includes("useNicknameChangeRequests")) {
  pass("ChatScreen imports useNicknameChangeRequests");
} else {
  fail("ChatScreen imports useNicknameChangeRequests");
}

const forbiddenPatterns = [
  "fetchNicknameChangeRequests(",
  "submitNicknameChangeRequest(",
  "processNicknameChangeRequest(",
  "updateAuthNicknameMetadata(",
  "const fetchNicknameRequests",
  "const [nicknameRequests, setNicknameRequests]",
  "lamma_nickname_request_applied_",
];

for (const pattern of forbiddenPatterns) {
  if (!chatScreen.includes(pattern)) {
    pass(`Removed duplicate pattern: ${pattern.split("\n")[0]}`);
  } else {
    fail("Duplicate nickname request logic still in ChatScreen", pattern);
  }
}

if (packageJson.scripts?.["verify:phase9"]) {
  pass("package.json defines verify:phase9");
} else {
  fail("package.json defines verify:phase9");
}

if (packageJson.scripts?.["verify:all"]?.includes("verify:phase9")) {
  pass("verify:all includes verify:phase9");
} else {
  fail("verify:all includes verify:phase9");
}

const unit = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--test", "scripts/unit-lib.test.ts"],
  { cwd: root, encoding: "utf8", shell: process.platform === "win32" },
);

if (unit.status === 0) {
  pass("Lib unit tests (8 checks)");
} else {
  fail("Lib unit tests", unit.stderr || unit.stdout || `exit ${unit.status}`);
}

console.log(
  `\nSummary: ${failed === 0 ? "PHASE 9 NICKNAME OK" : `${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
