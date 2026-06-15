export default function handler(_req, res) {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(
      /\/rest\/v1\/?$/,
      "",
    );
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
    const appUrl = process.env.VITE_APP_URL || "";

    res.setHeader("Cache-Control", "no-store");

    if (!supabaseUrl || !supabaseAnonKey) {
      res.status(503).json({
        configured: false,
        message: "Supabase configuration is missing.",
      });
      return;
    }

    res.status(200).json({
      configured: true,
      supabaseUrl,
      supabaseAnonKey,
      appUrl,
    });
  } catch (error) {
    res.status(500).json({
      configured: false,
      message: error instanceof Error ? error.message : "Unexpected server error.",
    });
  }
}
