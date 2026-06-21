import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL =
  process.env.OWNER_EMAIL?.trim() || "mohamed.samy2821992@gmail.com";
const BOOTSTRAP_SECRET =
  process.env.OPS_BOOTSTRAP_SECRET?.trim() || "lamma-owner-bootstrap-2026";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.headers["x-bootstrap-secret"];
  if (token !== BOOTSTRAP_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "https://detvapbvkabvdjsdttfy.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceKey) {
    res.status(503).json({
      error: "missing_env",
      need: ["SUPABASE_SERVICE_ROLE_KEY"],
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
      (u) => (u.email || "").trim().toLowerCase() === OWNER_EMAIL.toLowerCase(),
    );
    if (!user) {
      res.status(404).json({ error: "owner_user_not_found", email: OWNER_EMAIL });
      return;
    }

    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), role: "owner" },
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

    res.status(200).json({ ok: true, user_id: user.id, email: user.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
