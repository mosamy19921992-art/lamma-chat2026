/**
 * Verify production design-center bundle contains restored 2026 UI + handlers.
 * Run: node scripts/verify-design-center-bundle.mjs
 */
const base = process.env.VITE_APP_URL || "https://lamma-arabic-chat-room.vercel.app";

const checks = [
  "بوت التصميم السريع",
  "Neon Glassmorphism",
  "Mega 2026",
  "ثيمات الألوان السريعة",
  "سحر التصميم 2026",
  "iOS Liquid Glass",
  "إطفاء الأنوار والـ FX",
  "نص هولوجرافيك",
  "ليل بنفسجي",
  "سيبربانك ناري",
];

function extractScriptSrcs(html) {
  const srcs = [];
  const re = /<script[^>]+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

function toAbsoluteUrl(src) {
  if (src.startsWith("http")) return src;
  return `${base}${src.startsWith("/") ? "" : "/"}${src}`;
}

function discoverAssetChunks(jsText) {
  const chunks = new Set();
  const withAssetsPrefix = /\/assets\/[a-zA-Z0-9_-]+-[A-Za-z0-9_-]+\.js/g;
  let m;
  while ((m = withAssetsPrefix.exec(jsText)) !== null) chunks.add(m[0]);
  for (const bare of ["design-center-modal", "chat-screen", "design-modules"]) {
    const bareRe = new RegExp(`${bare}-[A-Za-z0-9_-]+\\.js`, "g");
    while ((m = bareRe.exec(jsText)) !== null) chunks.add(`/assets/${m[0]}`);
  }
  return chunks;
}

const html = await fetch(`${base}/`).then((r) => {
  if (!r.ok) throw new Error(`homepage ${r.status}`);
  return r.text();
});

const pending = new Set(extractScriptSrcs(html).map(toAbsoluteUrl));
const fetched = new Set();
let bundleJs = "";
let bundleName = "";

while (pending.size > 0) {
  const url = pending.values().next().value;
  pending.delete(url);
  if (fetched.has(url)) continue;
  fetched.add(url);
  const js = await fetch(url).then((r) => (r.ok ? r.text() : ""));
  if (!js) continue;
  if (url.includes("design-center-modal-")) {
    bundleJs = js;
    bundleName = url.split("/").pop() || url;
  }
  for (const chunk of discoverAssetChunks(js)) {
    pending.add(toAbsoluteUrl(chunk));
  }
}

if (!bundleJs) {
  console.error("FAIL: design-center-modal chunk not found in production bundle graph");
  process.exit(1);
}

let failed = 0;
for (const c of checks) {
  const ok = bundleJs.includes(c);
  console.log(`${ok ? "PASS" : "FAIL"}: ${c}`);
  if (!ok) failed++;
}
console.log(`Bundle: ${bundleName} (${Math.round(bundleJs.length / 1024)}KB)`);
if (failed) process.exit(1);
console.log("Summary: ALL OK");
