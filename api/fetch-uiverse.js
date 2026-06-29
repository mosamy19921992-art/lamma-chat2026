/** Server-side fetch for UIverse + any safe HTTPS CSS page — Galaxy archive + reader fallback. */

import {
  checkRateLimit,
  getClientIp,
  verifyOwnerUser,
  verifySupabaseJwt,
} from "./_lib/apiSecurity.js";

function validateRootDomain(url, domain) {
  if (!url || !domain) {
    return false;
  }
  try {
    const host = new URL(url).host;
    return host === domain || host.endsWith('.' + domain);
  } catch(_) {
    return false;
  }
}

const UIVERSE_HOST = "uiverse.io";
const MAX_BYTES = 512_000;
const GALAXY_BASE =
  "https://raw.githubusercontent.com/uiverse-io/galaxy/main";
const GALAXY_FOLDERS = [
  "Buttons",
  "Cards",
  "Checkboxes",
  "Forms",
  "Inputs",
  "loaders",
  "Notifications",
  "Patterns",
  "Radio-buttons",
  "Toggle-switches",
  "Tooltips",
];

const BROWSER_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  "Cache-Control": "no-cache",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://uiverse.io/",
};

// Allow only HTTPS requests to known design-source hosts, and block
// private / loopback / link-local / cloud-metadata targets (SSRF guard).
const ALLOWED_HOSTS = ["uiverse.io", "raw.githubusercontent.com", "r.jina.ai"];

function isPrivateHost(host) {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "::1" || h.endsWith(".localhost")) return true;
  // IPv4 private / loopback / link-local / cloud metadata (169.254.169.254)
  if (
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  ) {
    return true;
  }
  return false;
}

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (isPrivateHost(host)) return false;
    return ALLOWED_HOSTS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

function isUiverseUrl(raw) {
  try {
    const u = new URL(raw);
    return u.hostname.replace(/^www\./, "").endsWith(UIVERSE_HOST);
  } catch {
    return false;
  }
}

function parseUiverseUrl(raw) {
  try {
    const parsed = new URL(raw.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (!validateRootDomain(host, "uiverse.io")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const skip = new Set([
      "elements",
      "buttons",
      "cards",
      "checkboxes",
      "switches",
      "loaders",
      "inputs",
      "radio-buttons",
      "forms",
      "patterns",
      "tooltips",
      "profile",
      "blog",
      "design",
      "challenges",
      "ui-kits",
    ]);

    while (parts.length > 2 && skip.has(parts[0].toLowerCase())) {
      parts.shift();
    }

    if (parts.length < 2) return null;
    return { author: parts[0], slug: parts[1] };
  } catch {
    const short = String(raw).trim().match(/^([\w.-]+)\/([\w.-]+)$/);
    if (short) return { author: short[1], slug: short[2] };
    return null;
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

  const cssField = html.match(/"css"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (cssField?.[1]) {
    return JSON.parse(`"${cssField[1]}"`);
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

function extractCssFromJinaMarkdown(text) {
  const lines = text.split("\n");
  const cssLines = [];
  let inBlock = false;

  for (const line of lines) {
    const numbered = line.match(/^\s*(\d+)\.(.+)$/);
    if (numbered) {
      inBlock = true;
      cssLines.push(numbered[2]);
      continue;
    }

    if (inBlock) {
      if (!line.trim()) continue;
      if (/^#{1,3}\s/.test(line) || /^!\[/.test(line) || /^\[/.test(line)) {
        break;
      }
      if (cssLines.length > 4) break;
    }
  }

  const css = cssLines.join("\n").trim();
  if (css.length > 20 && css.includes("{")) return css;
  return "";
}

function galaxyFileNames(author, slug) {
  const names = new Set([`${author}_${slug}.html`]);
  names.add(`${author.toLowerCase()}_${slug}.html`);
  names.add(`${author}_${slug.toLowerCase()}.html`);
  return [...names];
}

async function fetchGalaxyHtml(author, slug) {
  const fileNames = galaxyFileNames(author, slug);

  for (const folder of GALAXY_FOLDERS) {
    for (const fileName of fileNames) {
      const url = `${GALAXY_BASE}/${folder}/${encodeURIComponent(fileName)}`;
      try {
        const res = await fetch(url, {
          headers: { Accept: "text/html", "User-Agent": BROWSER_HEADERS["User-Agent"] },
          cache: "no-store",
        });
        if (res.ok) {
          const html = await res.text();
          if (html.trim()) return { html, source: "galaxy", folder };
        }
      } catch {
        // try next
      }
    }
  }

  return null;
}

async function fetchViaJinaReader(pageUrl) {
  const readerUrl = `https://r.jina.ai/${pageUrl}`;
  try {
    const res = await fetch(readerUrl, {
      headers: {
        Accept: "text/plain",
        "User-Agent": BROWSER_HEADERS["User-Agent"],
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const text = await res.text();
    if (text.length > MAX_BYTES) return null;

    const css = extractCssFromJinaMarkdown(text);
    if (css.trim()) {
      return { css, source: "reader" };
    }

    const fromHtml = extractCssFromHtml(text);
    if (fromHtml.trim()) {
      return { css: fromHtml, source: "reader-html" };
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchUiversePage(pageUrl) {
  try {
    const response = await fetch(pageUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    if (!response.ok) return null;

    const buf = await response.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return null;

    const html = new TextDecoder("utf-8").decode(buf);
    const css = extractCssFromHtml(html);
    if (!css.trim()) return null;
    return { html, css, source: "uiverse-page" };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`uiverse:${ip}`, 30, 60_000)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const user = await verifySupabaseJwt(req);
  if (!user) {
    res.status(401).json({ error: "authentication_required" });
    return;
  }

  const ownerCheck = await verifyOwnerUser(user);
  if (ownerCheck === false) {
    res.status(403).json({ error: "owner_required" });
    return;
  }
  if (ownerCheck === null) {
    console.warn("[fetch-uiverse] SUPABASE_SERVICE_ROLE_KEY missing — blocking owner-gated CSS fetch");
    res.status(503).json({ error: "owner_check_unavailable" });
    return;
  }

  const url = String(req.query.url || "").trim();
  if (!isAllowedUrl(url)) {
    res.status(400).json({
      error: "invalid_url",
      hint: "الرابط يجب أن يبدأ بـ https://",
    });
    return;
  }

  try {
    // UIverse: try Galaxy archive first, then reader, then direct page fetch
    if (isUiverseUrl(url)) {
      const parsed = parseUiverseUrl(url);
      if (!parsed) {
        res.status(400).json({
          error: "invalid_path",
          hint: "مثال: https://uiverse.io/0x-Sarthak/hungry-penguin-30",
        });
        return;
      }

      const galaxyHit = await fetchGalaxyHtml(parsed.author, parsed.slug);
      if (galaxyHit) {
        const css = extractCssFromHtml(galaxyHit.html);
        if (css.trim()) {
          res.status(200).json({ ok: true, css, source: "galaxy", title: `${parsed.author}/${parsed.slug}` });
          return;
        }
      }

      const readerHit = await fetchViaJinaReader(url);
      if (readerHit?.css?.trim()) {
        res.status(200).json({ ok: true, css: readerHit.css, source: readerHit.source, title: `${parsed.author}/${parsed.slug}` });
        return;
      }

      const pageHit = await fetchUiversePage(url);
      if (pageHit?.css?.trim()) {
        res.status(200).json({ ok: true, css: pageHit.css, source: pageHit.source, title: `${parsed.author}/${parsed.slug}` });
        return;
      }

      res.status(502).json({
        error: "fetch_failed",
        hint: "تعذّر جلب CSS من UIverse. تأكد من الرابط أو جرّب مكوّنًا آخر.",
        author: parsed.author,
        slug: parsed.slug,
      });
      return;
    }

    // Generic HTTPS URL: try jina reader then direct page fetch
    const hostname = new URL(url).hostname;
    const readerHit = await fetchViaJinaReader(url);
    if (readerHit?.css?.trim()) {
      res.status(200).json({ ok: true, css: readerHit.css, source: "reader", title: hostname });
      return;
    }

    const pageHit = await fetchUiversePage(url);
    if (pageHit?.css?.trim()) {
      res.status(200).json({ ok: true, css: pageHit.css, source: "page", title: hostname });
      return;
    }

    res.status(502).json({
      error: "fetch_failed",
      hint: "تعذّر استخراج CSS من هذا الرابط. تأكد أن الصفحة تحتوي على <style> tags.",
    });
  } catch (error) {
    console.error("fetch-uiverse failed:", error);
    res.status(500).json({ error: "internal_error" });
  }
}
