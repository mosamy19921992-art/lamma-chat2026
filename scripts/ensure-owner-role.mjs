/**
 * Grant owner role in user_roles + metadata for the site owner account.
 *
 * Usage:
 *   node scripts/ensure-owner-role.mjs
 *   node scripts/ensure-owner-role.mjs owner@example.com
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT_REF = "detvapbvkabvdjsdttfy";
const DEFAULT_OWNER_EMAIL = "mohamed.samy2821992@gmail.com";

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
  console.error("Missing SUPABASE_ACCESS_TOKEN in env or .env.local");
  process.exit(1);
}

const ownerEmail = (process.argv[2] || DEFAULT_OWNER_EMAIL).trim().toLowerCase();

const apiBase = "https://api.supabase.com/v1";
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function runSql(query) {
  const response = await fetch(`${apiBase}/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw
  }
  if (!response.ok) {
    throw new Error(
      `SQL failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }
  return body;
}

const sql = `
-- Ensure universal style column exists
alter table public.owner_settings
  add column if not exists universal_style_config jsonb default null;

-- Ensure member permission media columns exist
alter table public.owner_member_permissions
  add column if not exists images_allowed boolean not null default false,
  add column if not exists youtube_allowed boolean not null default false;

-- Grant owner role by email
insert into public.user_roles (user_id, role)
select id, 'owner'
from auth.users
where lower(email) = lower('${ownerEmail.replace(/'/g, "''")}')
on conflict (user_id) do update
  set role = 'owner', updated_at = timezone('utc'::text, now());

-- Metadata fallback for current_app_role()
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
where lower(email) = lower('${ownerEmail.replace(/'/g, "''")}');

select ur.user_id, ur.role, u.email
from public.user_roles ur
join auth.users u on u.id = ur.user_id
where ur.role = 'owner';
`;

console.log(`Ensuring owner role for: ${ownerEmail}`);
const result = await runSql(sql);
console.log("Owner rows:", JSON.stringify(result, null, 2));
console.log("Done.");
