/**
 * Apply participation hardening only (ban / invite-only / call permissions).
 * Requires SUPABASE_ACCESS_TOKEN or token in .env.local
 *
 * Usage:
 *   node scripts/apply-participation-hardening-only.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "detvapbvkabvdjsdttfy";
const root = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filename) {
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
  process.env.SUPABASE_ACCESS_TOKEN ||
  loadEnvFile(".env.local").SUPABASE_ACCESS_TOKEN ||
  loadEnvFile(".env.production.local").SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.supabase.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} failed (${response.status}): ${text}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const sql = readFileSync(
  join(root, "..", "supabase-participation-hardening.sql"),
  "utf8",
);

await api(`/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  body: JSON.stringify({ query: sql }),
});

console.log("Participation hardening applied.");
console.log("Run: npm run verify:hardening");
