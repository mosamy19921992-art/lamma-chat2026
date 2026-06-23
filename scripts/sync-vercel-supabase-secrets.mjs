/**
 * Sync Supabase service_role key to Vercel (Production) using a valid PAT.
 *
 * Usage:
 *   1. Refresh PAT: https://supabase.com/dashboard/account/tokens
 *   2. Update SUPABASE_ACCESS_TOKEN in .env.local
 *   3. node scripts/sync-vercel-supabase-secrets.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "detvapbvkabvdjsdttfy";

function loadEnvFile(filename) {
  const root = dirname(fileURLToPath(import.meta.url));
  const path = join(root, "..", filename);
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const token =
  process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
  loadEnvFile(".env.local").SUPABASE_ACCESS_TOKEN?.trim();

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const keysRes = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
  { headers },
);

if (!keysRes.ok) {
  console.error(`Failed to fetch API keys (${keysRes.status})`);
  if (keysRes.status === 401) {
    console.error(
      "PAT expired — create new token: https://supabase.com/dashboard/account/tokens",
    );
  }
  process.exit(1);
}

const keys = await keysRes.json();
const serviceKey =
  keys.find((k) => k.name === "service_role" || k.type === "service_role")
    ?.api_key ?? null;

if (!serviceKey) {
  console.error("service_role key not found in API response");
  process.exit(1);
}

const add = spawnSync(
  "npx",
  ["vercel", "env", "add", "SUPABASE_SERVICE_ROLE_KEY", "production", "--yes"],
  {
    input: serviceKey,
    cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
    encoding: "utf8",
    shell: true,
  },
);

if (add.status !== 0) {
  console.error(add.stderr || add.stdout || "vercel env add failed");
  process.exit(add.status ?? 1);
}

console.log("SUPABASE_SERVICE_ROLE_KEY synced to Vercel Production.");
console.log("Run: npx vercel --prod --yes");
