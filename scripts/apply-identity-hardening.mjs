/**
 * Apply supabase-identity-hardening.sql + enable Anonymous Auth.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="your_pat"
 *   node scripts/apply-identity-hardening.mjs
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

console.log("Enabling Anonymous Auth...");
await api(`/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  body: JSON.stringify({ external_anonymous_users_enabled: true }),
});
console.log("Anonymous Auth enabled.");

const root = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(root, "..", "supabase-identity-hardening.sql"),
  "utf8",
);

console.log("Applying supabase-identity-hardening.sql ...");
await api(`/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  body: JSON.stringify({ query: sql }),
});
console.log("Identity hardening applied.");

const verify = await api(`/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  body: JSON.stringify({
    query: `
      select tgname, relname
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal
        and tgname in (
          'messages_bind_identity',
          'pm_messages_bind_identity',
          'social_posts_bind_identity',
          'post_comments_bind_identity'
        )
      order by relname;
    `,
  }),
});

console.log("\nTriggers:", JSON.stringify(verify, null, 2));
console.log("\nDone.");
