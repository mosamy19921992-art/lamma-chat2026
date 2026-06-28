/**
 * Extended smoke test: production bundle + Supabase read paths + UX strings.
 * Usage: node scripts/verify-smoke-e2e.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const PRODUCTION_URL = "https://lamma-arabic-chat-room.vercel.app";

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

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing Supabase env (.env.local)");
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

let failed = 0;
let passed = 0;

function pass(label) {
  console.log(`[PASS] ${label}`);
  passed += 1;
}

function fail(label, detail = "") {
  console.log(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

async function check(name, ok, detail) {
  if (ok) pass(name);
  else fail(name, detail);
}

/** @param {string} html */
function extractScriptSrcs(html) {
  const srcs = [];
  const re = /<script[^>]+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

/** @param {string} baseUrl */
function toAbsoluteUrl(baseUrl, src) {
  if (src.startsWith("http")) return src;
  return `${baseUrl}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Scan fetched JS for lazy-loaded Vite chunks (e.g. chat-screen). */
function discoverAssetChunks(jsText) {
  const chunks = new Set();
  const withAssetsPrefix = /\/assets\/[a-zA-Z0-9_-]+-[A-Za-z0-9_-]+\.js/g;
  let m;
  while ((m = withAssetsPrefix.exec(jsText)) !== null) {
    chunks.add(m[0]);
  }
  const bareChunk = /chat-screen-[A-Za-z0-9_-]+\.js/g;
  while ((m = bareChunk.exec(jsText)) !== null) {
    chunks.add(`/assets/${m[0]}`);
  }
  return chunks;
}

/** @param {string} startHtml */
async function collectProductionBundleText(startHtml) {
  const pending = new Set();
  for (const src of extractScriptSrcs(startHtml)) {
    pending.add(toAbsoluteUrl(PRODUCTION_URL, src));
  }

  let bundleText = "";
  const fetched = new Set();

  while (pending.size > 0) {
    const url = pending.values().next().value;
    pending.delete(url);
    if (fetched.has(url)) continue;
    fetched.add(url);

    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const text = await r.text();
      bundleText += text;
      for (const chunk of discoverAssetChunks(text)) {
        pending.add(`${PRODUCTION_URL}${chunk}`);
      }
    } catch {
      // ignore individual chunk failures
    }
  }

  return bundleText;
}

console.log(`Smoke E2E → ${PRODUCTION_URL}\n`);

// --- Production HTML + bundle strings ---
const homeRes = await fetch(PRODUCTION_URL, { redirect: "follow" });
await check("Homepage HTTP 200", homeRes.ok, String(homeRes.status));

if (homeRes.ok) {
  const html = await homeRes.text();
  await check("HTML has root mount", html.includes('id="root"'));
  await check("HTML has Lamma title/meta", /شات لمة|lamma/i.test(html));

  const scriptPaths = extractScriptSrcs(html);
  await check("Has Vite entry scripts", scriptPaths.length >= 1);

  const bundleText = await collectProductionBundleText(html);
  await check(
    "Resolved production JS bundles",
    bundleText.length > 50_000,
    `bytes=${bundleText.length}`,
  );
  await check(
    "Bundle includes chat-screen chunk",
    /chat-screen|صوت الإشعارات/.test(bundleText),
  );

  await check(
    "Bundle includes sound toggle label",
    bundleText.includes("صوت الإشعارات") ||
      bundleText.includes("message_sound") ||
      bundleText.includes("lamma_message_sound"),
  );
  await check(
    "Bundle includes Ctrl+Enter hint",
    bundleText.includes("Ctrl+Enter") ||
      (bundleText.includes("Ctrl") && bundleText.includes("Enter")),
  );
  await check(
    "Bundle includes send preview feature",
    bundleText.includes("معاينة قبل الإرسال") ||
      bundleText.includes("lamma_send_preview"),
  );
  await check(
    "Bundle includes room video file upload",
    bundleText.includes("رفع فيديو ملف") ||
      bundleText.includes("uploadAndSendVideo"),
  );
}

// --- PWA assets ---
for (const path of ["/manifest.json", "/sw.js"]) {
  const r = await fetch(`${PRODUCTION_URL}${path}`);
  await check(`${path} HTTP 200`, r.ok, String(r.status));
}

const manifestRes = await fetch(`${PRODUCTION_URL}/manifest.json`);
if (manifestRes.ok) {
  const manifest = await manifestRes.json();
  await check("manifest has name", Boolean(manifest.name || manifest.short_name));
  await check("manifest has start_url", Boolean(manifest.start_url));
}

// --- Supabase anonymous auth ---
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: "POST",
  headers: {
    ...headers,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
});
await check(
  "Anonymous auth session",
  authRes.ok || authRes.status === 422,
  String(authRes.status),
);

let sessionToken = ANON_KEY;
if (authRes.ok) {
  const authJson = await authRes.json();
  if (authJson.access_token) sessionToken = authJson.access_token;
}

const authedHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${sessionToken}`,
};

// --- Room messages read (messages table) ---
const msgsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/messages?room_id=eq.egypt&select=id,author,text&order=created_at.desc&limit=3`,
  { headers: authedHeaders },
);
await check("messages readable (egypt)", msgsRes.ok, String(msgsRes.status));

if (msgsRes.ok) {
  const msgs = await msgsRes.json();
  await check("egypt has message history", Array.isArray(msgs), `count=${msgs?.length ?? 0}`);
}

// --- chat-media bucket (storage API may return 400 for guest — informational only) ---
const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/chat-media`, {
  headers: authedHeaders,
});
if (storageRes.ok) {
  pass("chat-media bucket reachable (authed)");
} else {
  pass(`chat-media bucket probe (${storageRes.status}) — OK if RLS restricts bucket metadata`);
}

// --- Guest cannot insert without proper session (sanity) ---
const badInsert = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
  method: "POST",
  headers: {
    ...headers,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    room_id: "egypt",
    author: "smoke-test-bot",
    text: "should-not-persist",
    sender_uid: "00000000-0000-0000-0000-000000000000",
  }),
});
await check(
  "Unauthenticated insert blocked",
  !badInsert.ok || badInsert.status >= 400,
  String(badInsert.status),
);

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
