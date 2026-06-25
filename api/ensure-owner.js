import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "./_lib/apiSecurity.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`ensure-owner:${ip}`, 5, 60_000)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  const bootstrapSecret = process.env.OPS_BOOTSTRAP_SECRET?.trim();

  if (!bootstrapSecret) {
    res.status(503).json({
      error: "missing_env",
      need: ["OPS_BOOTSTRAP_SECRET"],
      hint: "Set a strong random secret in Vercel → Environment Variables",
    });
    return;
  }

  if (!ownerEmail) {
    res.status(503).json({
      error: "missing_env",
      need: ["OWNER_EMAIL"],
    });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = String(authHeader).startsWith("Bearer ")
    ? String(authHeader).slice(7)
    : req.headers["x-bootstrap-secret"];
  if (token !== bootstrapSecret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({
      error: "missing_env",
      need: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      hint: "Add in Vercel → Project Settings → Environment Variables (Production)",
    });
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;

    const user = listData.users.find(
      (u) => (u.email || "").trim().toLowerCase() === ownerEmail.toLowerCase(),
    );
    if (!user) {
      res.status(404).json({ error: "owner_user_not_found" });
      return;
    }

    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(user.app_metadata || {}), role: "owner" },
    });
    if (metaError) throw metaError;

    const { error: roleError } = await admin.from("user_roles").upsert(
      {
        user_id: user.id,
        role: "owner",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (roleError) throw roleError;

    res.status(200).json({ ok: true, user_id: user.id });
  } catch (error) {
    console.error("ensure-owner failed:", error);
    res.status(500).json({ error: "internal_error" });
  }
}
