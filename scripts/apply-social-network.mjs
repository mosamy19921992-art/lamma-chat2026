/**
 * Apply supabase-social-network.sql to production Supabase.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="your_pat_from_supabase.com/dashboard/account/tokens"
 *   node scripts/apply-social-network.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT_REF = "detvapbvkabvdjsdttfy";

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN.\nCreate one at: https://supabase.com/dashboard/account/tokens",
  );
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
    // keep raw text
  }
  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }
  return body;
}

const root = dirname(fileURLToPath(import.meta.url));
const socialSql = readFileSync(
  join(root, "..", "supabase-social-network.sql"),
  "utf8",
);

console.log("Applying supabase-social-network.sql ...");
await api(`/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  body: JSON.stringify({ query: socialSql }),
});
console.log("Social network schema applied successfully.");
