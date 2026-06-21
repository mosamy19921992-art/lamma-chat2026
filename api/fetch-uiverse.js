/** Server-side fetch for UIverse component pages (bypasses browser CORS). */

const ALLOWED_HOST = "uiverse.io";
const MAX_BYTES = 512_000;

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname.endsWith(ALLOWED_HOST);
  } catch {
    return false;
  }
}

function extractCssFromHtml(html) {
  const styles = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1]?.trim()) styles.push(m[1].trim());
  }
  if (styles.length) return styles.join("\n");

  const next = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (next?.[1]) {
    try {
      const json = JSON.parse(next[1]);
      const found = findCss(json);
      if (found) return found;
    } catch {
      // ignore
    }
  }

  const scoped = html.match(/"scopedCss"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (scoped?.[1]) {
    return JSON.parse(`"${scoped[1]}"`);
  }

  return "";
}

function findCss(obj, depth = 0) {
  if (depth > 12 || !obj || typeof obj !== "object") return null;
  if (typeof obj.scopedCss === "string" && obj.scopedCss.trim()) {
    return obj.scopedCss;
  }
  if (typeof obj.css === "string" && obj.css.trim()) return obj.css;
  for (const value of Object.values(obj)) {
    const nested = findCss(value, depth + 1);
    if (nested) return nested;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const url = String(req.query.url || "").trim();
  if (!isAllowedUrl(url)) {
    res.status(400).json({ error: "invalid_url", hint: "https://uiverse.io/user/slug only" });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; LammaDesignBot/1.0; +https://lamma-arabic-chat-room.vercel.app)",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      res.status(502).json({ error: "upstream_failed", status: response.status });
      return;
    }

    const buf = await response.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      res.status(413).json({ error: "payload_too_large" });
      return;
    }

    const html = new TextDecoder("utf-8").decode(buf);
    const css = extractCssFromHtml(html);

    res.status(200).json({
      ok: true,
      html: html.slice(0, MAX_BYTES),
      css,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
}
