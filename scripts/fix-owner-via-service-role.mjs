/**
 * Fix owner role using Supabase service_role key (bypasses RLS).
 *
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   node scripts/fix-owner-via-service-role.mjs
 *
 * Or with PAT (also applies SQL migrations):
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *   node scripts/ensure-owner-role.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const fileEnv = {
  ...loadEnvFile(".env.local"),
  ...loadEnvFile(".env.vercel.runtime"),
};

const supabaseUrl =
  process.env.VITE_SUPABASE_URL?.trim() ||
  fileEnv.VITE_SUPABASE_URL?.trim() ||
  `https://${PROJECT_REF}.supabase.co`;

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();

const ownerEmail = (process.argv[2] || DEFAULT_OWNER_EMAIL).trim().toLowerCase();

if (!serviceKey) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy it from Supabase → Project Settings → API → service_role\n" +
      "Then: $env:SUPABASE_SERVICE_ROLE_KEY=\"...\"; node scripts/fix-owner-via-service-role.mjs",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`Fixing owner role for ${ownerEmail} on ${supabaseUrl}`);

const { data: listData, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("listUsers failed:", listError.message);
  process.exit(1);
}

const user = listData.users.find(
  (u) => (u.email || "").trim().toLowerCase() === ownerEmail,
);

if (!user) {
  console.error(`No auth user found for email: ${ownerEmail}`);
  process.exit(1);
}

console.log(`Found user ${user.id}`);

const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
  user_metadata: {
    ...(user.user_metadata || {}),
    role: "owner",
  },
});

if (metaError) {
  console.error("updateUserById failed:", metaError.message);
  process.exit(1);
}

const { error: roleError } = await admin.from("user_roles").upsert(
  {
    user_id: user.id,
    role: "owner",
    updated_at: new Date().toISOString(),
  },
  { onConflict: "user_id" },
);

if (roleError) {
  console.error("user_roles upsert failed:", roleError.message);
  process.exit(1);
}

const { error: settingsError } = await admin.from("owner_settings").upsert(
  {
    id: "global",
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" },
);

if (settingsError) {
  console.warn("owner_settings touch warning:", settingsError.message);
}

console.log("✅ Owner role granted successfully.");
console.log(JSON.stringify({ user_id: user.id, email: user.email }, null, 2));
