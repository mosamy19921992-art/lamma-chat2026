/**
 * One-shot Supabase production setup (full hardening chain + OAuth URLs).
 *
 * Order matches SQL_MIGRATIONS.md (+ reply, pen-test, reactions).
 * Do NOT run supabase-storage.sql after identity-hardening
 * (it overwrites folder-scoped upload policies).
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="your_pat_from_supabase.com/dashboard/account/tokens"
 *   node scripts/apply-production-setup.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT_REF = "detvapbvkabvdjsdttfy";
const SITE_URL = "https://lamma-arabic-chat-room.vercel.app";
const REDIRECT_URLS = [
  `${SITE_URL}/`,
  `${SITE_URL}/?room=egypt`,
  `${SITE_URL}/index.html`,
  "http://localhost:5173/",
  "http://localhost:5173/?room=egypt",
];

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

async function applySqlFile(root, filename, label) {
  const path = join(root, "..", filename);
  if (!existsSync(path)) {
    console.warn(`Skipping missing ${filename}`);
    return;
  }
  const sql = readFileSync(path, "utf8");
  console.log(`Applying ${label || filename} ...`);
  await api(`/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: sql }),
  });
  console.log(`Done: ${label || filename}`);
}

async function applySql() {
  const root = dirname(fileURLToPath(import.meta.url));

  const migrationChain = [
    ["supabase-production-hardening.sql", "production hardening"],
    ["supabase-social-network.sql", "social network schema"],
    ["supabase-security-audit-fixes.sql", "security audit fixes"],
    ["supabase-identity-hardening.sql", "identity + storage folder RLS"],
    ["supabase-launch-hardening.sql", "launch hardening (PM + call_signals)"],
    ["supabase-participation-hardening.sql", "participation (ban/invite/calls)"],
    ["supabase-private-media.sql", "private PM media bucket"],
    ["supabase-room-member-roles.sql", "per-room mod/vip roles"],
    ["supabase-role-policy-v2.sql", "host + temp grants"],
    ["supabase-private-rooms.sql", "password rooms + creation quota"],
    ["supabase-moderation-hardening.sql", "moderation P0 (typed bans + RPC)"],
    ["supabase-moderation-p1.sql", "moderation P1 (kick + layout)"],
    ["supabase-p2-owner-settings-public.sql", "public settings mirror (P2)"],
    ["supabase-moderation-p2.sql", "moderation P2 (shadow ban)"],
    ["supabase-media-performance-fix.sql", "media URL RLS + bucket limits"],
    ["supabase-api-validation-hardening.sql", "API validation length checks"],
    ["supabase-rpc-anon-lockdown.sql", "RPC anon lockdown (participation)"],
    ["supabase-message-reactions-rpc.sql", "message reactions RPC"],
    ["supabase-message-reply.sql", "room message reply columns"],
    ["supabase-security-pen-test-fixes.sql", "roles from user_roles only"],
    ["supabase-schema-rls-hardening.sql", "schema RLS hardening"],
  ];

  for (const [file, label] of migrationChain) {
    await applySqlFile(root, file, label);
  }
}

async function updateAuthUrls() {
  console.log("Updating Supabase Auth redirect URLs ...");
  const current = await api(`/projects/${PROJECT_REF}/config/auth`);
  const merged = Array.from(
    new Set([...(current.uri_allow_list || []), ...REDIRECT_URLS]),
  );

  await api(`/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      site_url: SITE_URL,
      uri_allow_list: merged,
    }),
  });

  console.log("Auth URLs updated:", merged.join("\n  "));
}

try {
  await applySql();
  await updateAuthUrls();
  console.log("\nDone. Full production Supabase hardening chain applied.");

  console.log("\nRunning behavioral verification ...");
  const verify = spawnSync(process.execPath, ["scripts/verify-production-hardening.mjs"], {
    stdio: "inherit",
    cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
  });
  if (verify.status !== 0) {
    process.exit(verify.status ?? 1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
