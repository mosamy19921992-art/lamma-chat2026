/**
 * Phase 10 temp entry topic hook closure checks (static + unit tests).
 * Usage: node scripts/verify-phase10-temp-entry.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const hookPath = join(root, "src/hooks/useTempEntryTopic.ts");
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

if (existsSync(hookPath)) pass("Hook exists: useTempEntryTopic.ts");
else fail("Hook exists: useTempEntryTopic.ts");

const hook = readFileSync(hookPath, "utf8");

if (hook.includes("export function useTempEntryTopic")) {
  pass("useTempEntryTopic exported");
} else {
  fail("useTempEntryTopic exported");
}

if (hook.includes("fetchTempEntryTopicMetadata")) {
  pass("Temp entry topic fetch lives in hook");
} else {
  fail("Temp entry topic fetch lives in hook");
}

if (hook.includes("updateTempEntryTopicMetadata")) {
  pass("Temp entry topic persist lives in hook");
} else {
  fail("Temp entry topic persist lives in hook");
}

if (chatScreen.includes("useTempEntryTopic")) {
  pass("ChatScreen imports useTempEntryTopic");
} else {
  fail("ChatScreen imports useTempEntryTopic");
}

const forbiddenPatterns = [
  "fetchTempEntryTopicMetadata(",
  "updateTempEntryTopicMetadata(",
  "readStoredTempEntryTopic",
  "persistTempEntryTopic(",
  "tempEntryTopicStorageKey",
  "tempEntryTopicTimerRef",
  "const [tempEntryTopicInput, setTempEntryTopicInput]",
  "lamma_temp_entry_topic_",
];

for (const pattern of forbiddenPatterns) {
  if (!chatScreen.includes(pattern)) {
    pass(`Removed duplicate pattern: ${pattern.split("\n")[0]}`);
  } else {
    fail("Duplicate temp entry topic logic still in ChatScreen", pattern);
  }
}

if (packageJson.scripts?.["verify:phase10"]) {
  pass("package.json defines verify:phase10");
} else {
  fail("package.json defines verify:phase10");
}

if (packageJson.scripts?.["verify:all"]?.includes("verify:phase10")) {
  pass("verify:all includes verify:phase10");
} else {
  fail("verify:all includes verify:phase10");
}

const unit = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--test", "scripts/unit-lib.test.ts"],
  { cwd: root, encoding: "utf8", shell: process.platform === "win32" },
);

if (unit.status === 0) {
  pass("Lib unit tests (9 checks)");
} else {
  fail("Lib unit tests", unit.stderr || unit.stdout || `exit ${unit.status}`);
}

console.log(
  `\nSummary: ${failed === 0 ? "PHASE 10 TEMP ENTRY OK" : `${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
