/**
 * Sync PWA cache version token across service worker and React hook.
 * Run automatically before production builds.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildId = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  String(Date.now())
).slice(0, 12);
const token = `lamma-${buildId}`;

const swPath = join(root, "public", "sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(
  /const VERSION = "lamma-[^"]+";/,
  `const VERSION = "${token}";`,
);
writeFileSync(swPath, sw);

const hookPath = join(root, "src", "hooks", "useServiceWorker.ts");
let hook = readFileSync(hookPath, "utf8");
hook = hook.replace(
  /const VERSION_TOKEN = "[^"]+";/,
  `const VERSION_TOKEN = "${buildId}";`,
);
writeFileSync(hookPath, hook);

console.log(`PWA version synced: ${token}`);
