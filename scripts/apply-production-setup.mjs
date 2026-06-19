/**
 * One-shot Supabase production setup (full hardening chain + OAuth URLs).
 *
 * Order matters — do NOT run supabase-storage.sql after identity-hardening
 * (it overwrites folder-scoped upload policies).
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="your_pat_from_supabase.com/dashboard/account/tokens"
 *   node scripts/apply-production-setup.mjs
 */

import { readFileSync, existsSync } from "node:fs";
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
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
