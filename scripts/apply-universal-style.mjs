/**
 * Apply supabase-universal-style.sql (universal_style_config column).
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="your_pat"
 *   node scripts/apply-universal-style.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT_REF = "detvapbvkabvdjsdttfy";

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const apiBase = "https://api.supabase.com/v1";
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, { headers, ...options });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw
  }
  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }
  return body;
}

const root = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(root, "..", "supabase-universal-style.sql"),
  "utf8",
);

console.log("Applying supabase-universal-style.sql ...");
await api(`/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  body: JSON.stringify({ query: sql }),
});
console.log("Done — owner_settings.universal_style_config is ready.");
