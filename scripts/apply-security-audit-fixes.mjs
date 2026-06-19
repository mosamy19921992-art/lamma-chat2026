/**
 * Apply supabase-security-audit-fixes.sql to production Supabase.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="your_pat_from_supabase.com/dashboard/account/tokens"
 *   node scripts/apply-security-audit-fixes.mjs
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
const auditSql = readFileSync(
  join(root, "..", "supabase-security-audit-fixes.sql"),
  "utf8",
);

console.log("Applying supabase-security-audit-fixes.sql ...");
await api(`/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  body: JSON.stringify({ query: auditSql }),
});
console.log("Security audit SQL applied.");

const verify = await api(`/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  body: JSON.stringify({
    query: `
      select tablename, policyname, cmd
      from pg_policies
      where schemaname = 'public'
        and tablename in (
          'subscription_orders',
          'messages',
          'pm_messages',
          'social_posts',
          'post_comments',
          'call_signals'
        )
      order by tablename, policyname;
    `,
  }),
});

console.log("\nVerified policies:");
console.log(JSON.stringify(verify, null, 2));
console.log("\nDone.");
