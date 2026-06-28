/**
 * Quick production health check (anon key only).
 * Usage: node scripts/verify-live-health.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const fileEnv = {
  ...loadEnvFile(".env.production.local"),
  ...loadEnvFile(".env.local"),
};

const env = { ...process.env };
for (const [key, value] of Object.entries(fileEnv)) {
  if (value) env[key] = value;
}

const SUPABASE_URL = (env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY || "";
const PRODUCTION_URL = "https://lamma-arabic-chat-room.vercel.app";
const configuredAppUrl = env.VITE_APP_URL || PRODUCTION_URL;
const APP_URL = configuredAppUrl.includes("localhost")
  ? PRODUCTION_URL
  : configuredAppUrl;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

let failed = 0;

function pass(label) {
  console.log(`[PASS] ${label}`);
}

function fail(label, detail = "") {
  console.log(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

async function check(name, ok, detail) {
  if (ok) pass(name);
  else fail(name, detail);
}

const appRes = await fetch(APP_URL, { redirect: "follow" });
await check("Production homepage", appRes.ok, String(appRes.status));

const settingsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/public_chat_settings?id=eq.global&select=payload`,
  { headers },
);
await check("public_chat_settings readable", settingsRes.ok, String(settingsRes.status));

if (settingsRes.ok) {
  const rows = await settingsRes.json();
  const payload = rows[0]?.payload ?? {};
  await check("payload has universal_style_config", payload.universal_style_config != null);
  await check("payload has store_products array", Array.isArray(payload.store_products));
  await check("payload has payment_info object", typeof payload.payment_info === "object");
  await check("payload has custom_features array", Array.isArray(payload.custom_features));
}

const pingRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ping_chat_backend`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: "{}",
});
await check("ping_chat_backend RPC", pingRes.ok, String(pingRes.status));

const plansRes = await fetch(
  `${SUPABASE_URL}/rest/v1/subscription_plans?select=id&is_active=eq.true&limit=1`,
  { headers },
);
await check("subscription_plans readable", plansRes.ok, String(plansRes.status));

console.log(`\nSummary: ${failed === 0 ? "ALL OK" : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
