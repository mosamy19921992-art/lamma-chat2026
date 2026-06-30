/**
 * Verify production bundles ship neon-beam customize fix.
 * Run: node scripts/verify-neon-beam-prod.mjs
 */
const PRODUCTION_URL = "https://lamma-arabic-chat-room.vercel.app";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function extractScriptSrcs(html) {
  const srcs = [];
  const re = /<script[^>]+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

function toAbsoluteUrl(baseUrl, src) {
  if (src.startsWith("http")) return src;
  return `${baseUrl}${src.startsWith("/") ? "" : "/"}${src}`;
}

function discoverAssetChunks(jsText) {
  const chunks = new Set();
  const withAssetsPrefix = /\/assets\/[a-zA-Z0-9_-]+-[A-Za-z0-9_-]+\.js/g;
  let m;
  while ((m = withAssetsPrefix.exec(jsText)) !== null) {
    chunks.add(m[0]);
  }
  for (const bare of [
    "chat-screen",
    "design-center-modal",
    "design-modules",
  ]) {
    const bareRe = new RegExp(`${bare}-[A-Za-z0-9_-]+\\.js`, "g");
    while ((m = bareRe.exec(jsText)) !== null) {
      chunks.add(`/assets/${m[0]}`);
    }
  }
  return chunks;
}

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

    const res = await fetch(url);
    assert(res.ok, `fetch ${url} HTTP ${res.status}`);
    const text = await res.text();
    bundleText += `\n${text}`;
    for (const chunk of discoverAssetChunks(text)) {
      pending.add(toAbsoluteUrl(PRODUCTION_URL, chunk));
    }
  }

  return bundleText;
}

const htmlRes = await fetch(PRODUCTION_URL);
assert(htmlRes.ok, `homepage HTTP ${htmlRes.status}`);
const html = await htmlRes.text();
const bundleText = await collectProductionBundleText(html);

assert(
  bundleText.includes("resolveChaseLightForRemoteApply") || bundleText.includes("shouldPreferLocalChaseLight"),
  "bundle protects neon from stale remote",
);
assert(
  bundleText.includes("markFx2026LocalEdit") || bundleText.includes("shouldPreferLocalFx2026"),
  "bundle protects FX from stale remote",
);
assert(bundleText.includes("data-neon-beam-targets"), "bundle sets neon beam targets");
assert(
  bundleText.includes("neonBeamTargets"),
  "bundle persists neon beam target picks",
);
assert(
  bundleText.includes("إطار نيون") || bundleText.includes("NEON_BEAM_ALL_TARGETS"),
  "bundle has neon beam customize UI",
);

console.log("OK: production neon-beam customize bundles verified");
