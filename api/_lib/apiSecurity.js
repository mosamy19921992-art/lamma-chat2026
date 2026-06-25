import { createClient } from "@supabase/supabase-js";

/** @type {Map<string, { count: number; resetAt: number }>} */
const rateBuckets = new Map();

const RATE_BUCKET_SWEEP_MS = 60_000;
let lastSweep = Date.now();

function sweepRateBuckets(now) {
  if (now - lastSweep < RATE_BUCKET_SWEEP_MS) return;
  lastSweep = now;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}

/**
 * Simple per-instance rate limiter (best-effort on Vercel serverless).
 * @returns {boolean} true when allowed
 */
export function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  sweepRateBuckets(now);
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  bucket.count += 1;
  return true;
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && String(forwarded).trim()) {
    return String(forwarded.split(",")[0]).trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

let supabaseAuthClient = null;

function getSupabaseAuthClient() {
  if (supabaseAuthClient) return supabaseAuthClient;
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    "";
  if (!url || !anonKey) return null;
  supabaseAuthClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAuthClient;
}

/** Verify Supabase JWT from Authorization: Bearer header. */
export async function verifySupabaseJwt(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = String(authHeader.slice(7)).trim();
  if (!token) return null;

  const client = getSupabaseAuthClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const RGBA_COLOR =
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function sanitizeColor(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 64);
  if (HEX_COLOR.test(trimmed) || RGBA_COLOR.test(trimmed)) return trimmed;
  return null;
}

/** Strip unknown keys and unsafe values from Gemini design patches. */
export function sanitizeDesignPatch(patch) {
  if (!patch || typeof patch !== "object") return {};

  const out = {};

  if (patch.palette && typeof patch.palette === "object") {
    const palette = {};
    for (const key of ["bg", "accent", "accent2", "text", "muted", "surface"]) {
      const color = sanitizeColor(patch.palette[key]);
      if (color) palette[key] = color;
    }
    if (Object.keys(palette).length) out.palette = palette;
  }

  if (patch.glass && typeof patch.glass === "object") {
    const glass = {};
    const blurPx = clampNumber(patch.glass.blurPx, 0, 48);
    const opacity = clampNumber(patch.glass.opacity, 0.02, 0.5);
    const borderOpacity = clampNumber(patch.glass.borderOpacity, 0.02, 0.4);
    if (blurPx != null) glass.blurPx = blurPx;
    if (opacity != null) glass.opacity = opacity;
    if (borderOpacity != null) glass.borderOpacity = borderOpacity;
    if (Object.keys(glass).length) out.glass = glass;
  }

  if (patch.buttons && typeof patch.buttons === "object") {
    const buttons = {};
    const radiusPx = clampNumber(patch.buttons.radiusPx, 0, 32);
    if (radiusPx != null) buttons.radiusPx = radiusPx;
    if (typeof patch.buttons.glow === "boolean") buttons.glow = patch.buttons.glow;
    if (typeof patch.buttons.neon === "boolean") buttons.neon = patch.buttons.neon;
    if (Object.keys(buttons).length) out.buttons = buttons;
  }

  if (patch.inputs && typeof patch.inputs === "object") {
    const inputs = {};
    const radiusPx = clampNumber(patch.inputs.radiusPx, 0, 28);
    const borderOpacity = clampNumber(patch.inputs.borderOpacity, 0.02, 0.4);
    if (radiusPx != null) inputs.radiusPx = radiusPx;
    if (borderOpacity != null) inputs.borderOpacity = borderOpacity;
    if (Object.keys(inputs).length) out.inputs = inputs;
  }

  return out;
}

export function sanitizeSummaryText(value, maxLen = 240) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLen);
}
