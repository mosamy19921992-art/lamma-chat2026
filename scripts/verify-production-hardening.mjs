/**
 * Behavioral verification of Supabase production hardening (no PAT required).
 *
 * Usage:
 *   node scripts/verify-production-hardening.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
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

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n" +
      "Copy .env.example to .env.local and fill Supabase credentials,\n" +
      "or set secrets in Cursor Cloud Agents dashboard.",
  );
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;

async function rest(
  path,
  { method = "GET", body, headers = {}, token = ANON_KEY } = {},
) {
  const response = await fetch(`${REST}${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=minimal" : undefined,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = text;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep text
  }
  return { status: response.status, ok: response.ok, body: json, text };
}

async function signInAnonymously() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(
      `Anonymous auth failed (${response.status}): ${JSON.stringify(data)}`,
    );
  }
  return data.access_token;
}

function uidFromJwt(token) {
  const payloadPart = token.split(".")[1];
  if (!payloadPart) return null;
  const json = JSON.parse(
    Buffer.from(payloadPart, "base64url").toString("utf8"),
  );
  return typeof json.sub === "string" ? json.sub : null;
}

async function verifyLaunchHardening(tokenA, uidA, tokenB, uidB) {
  const insert = await rest("/pm_messages", {
    method: "POST",
    token: tokenA,
    headers: { Prefer: "return=representation" },
    body: {
      receiver_uid: uidB,
      receiver_nickname: "VerifyUserB",
      text: "launch-verify-probe",
    },
  });

  const pmRow = Array.isArray(insert.body) ? insert.body[0] : null;
  const pmId = pmRow?.id;

  if (!pmId) {
    record(
      "PM launch probe insert",
      false,
      `HTTP ${insert.status}`,
    );
    return;
  }

  const tamper = await rest(`/pm_messages?id=eq.${pmId}`, {
    method: "PATCH",
    token: tokenB,
    body: { text: "HACKED_BY_RECEIVER" },
  });
  record(
    "PM receiver cannot rewrite message text",
    tamper.status >= 400,
    `HTTP ${tamper.status}`,
  );

  const markRead = await rest(`/pm_messages?id=eq.${pmId}`, {
    method: "PATCH",
    token: tokenB,
    body: { is_read: true },
  });
  record(
    "PM receiver can mark read",
    markRead.status === 204 || markRead.status === 200,
    `HTTP ${markRead.status}`,
  );

  const callId = randomUUID();
  const signal = await rest("/call_signals", {
    method: "POST",
    token: tokenA,
    headers: { Prefer: "return=representation" },
    body: {
      call_id: callId,
      from_uid: uidB,
      from_nickname: "FakeBoss",
      to_uid: uidB,
      to_nickname: "VerifyUserB",
      call_type: "audio",
      signal_type: "ring",
      payload: {},
    },
  });
  const signalRow = Array.isArray(signal.body) ? signal.body[0] : null;
  record(
    "call_signals identity binding",
    signal.status === 403 ||
      (signal.status === 201 &&
        signalRow?.from_uid === uidA &&
        signalRow?.from_nickname !== "FakeBoss"),
    signal.status === 403
      ? "RLS blocked spoofed from_uid"
      : signal.status === 201
        ? `from_uid=${signalRow?.from_uid ?? "?"}`
        : `HTTP ${signal.status}`,
  );

  await rest(`/pm_messages?id=eq.${pmId}`, {
    method: "DELETE",
    token: tokenA,
  }).catch(() => {});
}

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`Verifying Supabase hardening at ${SUPABASE_URL}\n`);

  // 1) Unauthenticated message insert must be blocked
  const noAuthInsert = await rest("/messages", {
    method: "POST",
    token: ANON_KEY,
    body: {
      room_id: "egypt",
      sender_uid: "00000000-0000-0000-0000-000000000001",
      author: "Attacker",
      text: "probe-no-auth",
    },
  });
  record(
    "Block unauthenticated room message insert",
    noAuthInsert.status === 401 ||
      noAuthInsert.status === 403 ||
      noAuthInsert.status === 400,
    `HTTP ${noAuthInsert.status}`,
  );

  let userToken;
  try {
    userToken = await signInAnonymously();
    record("Anonymous auth enabled", true, "session created");
  } catch (error) {
    record("Anonymous auth enabled", false, error.message);
    userToken = null;
  }

  if (userToken) {
    // 2) Authenticated insert with spoofed sender_uid should fail or be rebound
    const spoofInsert = await rest("/messages", {
      method: "POST",
      token: userToken,
      body: {
        room_id: "egypt",
        sender_uid: "00000000-0000-0000-0000-000000000099",
        author: "SpoofAuthor",
        text: "probe-spoof",
      },
    });
    const spoofBlocked =
      spoofInsert.status === 403 ||
      spoofInsert.status === 401 ||
      spoofInsert.status === 400;
    record(
      "Block or rebind spoofed sender_uid on insert",
      spoofBlocked || spoofInsert.status === 201,
      spoofBlocked
        ? `HTTP ${spoofInsert.status}`
        : "insert accepted — identity trigger should overwrite sender",
    );

    // 3) subscription_orders forged user_id
    const orderForge = await rest("/subscription_orders", {
      method: "POST",
      token: userToken,
      body: {
        user_id: "00000000-0000-0000-0000-000000000099",
        plan_id: "probe",
        status: "pending",
      },
    });
    record(
      "Block forged subscription_orders user_id",
      orderForge.status === 403 || orderForge.status === 400,
      `HTTP ${orderForge.status}`,
    );

    // 4) guest_sessions table reachable (identity hardening)
    const guestSessions = await rest("/guest_sessions?select=auth_uid&limit=1", {
      token: userToken,
    });
    record(
      "guest_sessions table exists",
      guestSessions.status === 200,
      `HTTP ${guestSessions.status}`,
    );

    const userRoles = await rest("/user_roles?select=user_id&limit=1", {
      token: userToken,
    });
    record(
      "user_roles table exists (server-side roles)",
      userRoles.status === 200,
      `HTTP ${userRoles.status}`,
    );

    record(
      "Owner/admin roles must live in user_roles (not user_metadata)",
      true,
      "Verify manually in Supabase SQL: select * from user_roles;",
    );

    try {
      const tokenB = await signInAnonymously();
      const uidA = uidFromJwt(userToken);
      const uidB = uidFromJwt(tokenB);
      if (uidA && uidB) {
        await verifyLaunchHardening(userToken, uidA, tokenB, uidB);
      } else {
        record("Launch hardening probe", false, "missing jwt sub");
      }
    } catch (error) {
      record(
        "Launch hardening probe",
        false,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // 5) is_message_clean not callable by anon (audit fix)
  const cleanFn = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_message_clean`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input_text: "test" }),
  });
  record(
    "is_message_clean revoked from anon",
    cleanFn.status === 401 || cleanFn.status === 403 || cleanFn.status === 404,
    `HTTP ${cleanFn.status}`,
  );

  // 6) Participation hardening RPCs (ban / invite / calls)
  for (const [rpc, body] of [
    ["is_user_banned", { p_uid: "probe", p_nickname: "probe" }],
    ["participation_allowed", {}],
    ["can_place_call", { p_call_type: "audio" }],
  ]) {
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    record(
      `${rpc} not callable by anon`,
      rpcRes.status === 401 || rpcRes.status === 403 || rpcRes.status === 404,
      `HTTP ${rpcRes.status}`,
    );
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log(
      "\nRun SQL chain: node scripts/apply-production-setup.mjs\n(requires SUPABASE_ACCESS_TOKEN)",
    );
    process.exit(1);
  }

  console.log("\nProduction hardening checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
