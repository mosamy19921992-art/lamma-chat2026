import fs from "node:fs";
import path from "node:path";

const distAssets = path.join(process.cwd(), "dist", "assets");
const cssFile = fs
  .readdirSync(distAssets)
  .find((name) => name.startsWith("index-") && name.endsWith(".css"));
const jsFile = fs
  .readdirSync(distAssets)
  .find((name) => name.startsWith("chat-screen-") && name.endsWith(".js"));

if (!cssFile || !jsFile) {
  console.error("Missing dist assets — run npm run build first");
  process.exit(1);
}

const css = fs.readFileSync(path.join(distAssets, cssFile), "utf8");
const js = fs.readFileSync(path.join(distAssets, jsFile), "utf8");

function hasWallpaperFireScrollOverride(sheet) {
  const compact = sheet.replace(/\s+/g, "");
  return (
    compact.includes("data-custom-wallpaper") &&
    compact.includes("lamma-fire-scroll") &&
    (compact.includes("background:00") ||
      compact.includes("background:transparent") ||
      compact.includes("background:0%200"))
  );
}

function hasWallpaperCascade(sheet) {
  return (
    sheet.includes("data-custom-wallpaper") &&
    sheet.includes("--chat-wallpaper-bg")
  );
}

function hasComposerGlassOnWallpaper(sheet) {
  if (!sheet.includes("data-custom-wallpaper")) return false;
  const compact = sheet.replace(/\s+/g, "");
  return (
    compact.includes("lamma-composer-bar") &&
    compact.includes("blur(16px)") &&
    (compact.includes("#ffffff08") ||
      compact.includes("0.03") ||
      compact.includes("255,255,255,.03"))
  );
}

const checks = [
  ["css has data-custom-wallpaper selector", css.includes("data-custom-wallpaper")],
  [
    "css light fire-scroll override",
    hasWallpaperFireScrollOverride(css),
  ],
  ["js sets data-custom-wallpaper", js.includes("data-custom-wallpaper")],
  [
    "css removes MMM sidebar bg override",
    css.includes("background-image:none") || css.includes("background-image: none"),
  ],
  ["css wallpaper cascade (--chat-wallpaper-bg)", hasWallpaperCascade(css)],
  ["css composer glass on wallpaper mode", hasComposerGlassOnWallpaper(css)],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "FAIL"}: ${label}`);
  if (!ok) failed += 1;
}

async function checkProduction() {
  try {
    const html = await fetch("https://lamma-arabic-chat-room.vercel.app/").then((r) =>
      r.text(),
    );
    const cssMatch = html.match(/\/assets\/index-[^"]+\.css/);
    if (!cssMatch) {
      console.log("WARN: production css asset not found in html");
      failed += 1;
      return;
    }
    const prodCss = await fetch(
      `https://lamma-arabic-chat-room.vercel.app${cssMatch[0]}`,
    ).then((r) => r.text());
    const liveWallpaper = prodCss.includes("data-custom-wallpaper");
    const liveCascade =
      liveWallpaper && prodCss.includes("--chat-wallpaper-bg");
    console.log(
      `${liveWallpaper ? "OK" : "FAIL"}: production css has data-custom-wallpaper`,
    );
    console.log(
      `${liveCascade ? "OK" : "WARN"}: production css has wallpaper cascade (deploy may lag local)`,
    );
    if (!liveWallpaper) failed += 1;
  } catch (err) {
    console.log("WARN: could not verify production", err.message);
  }
}

await checkProduction();

if (failed) {
  console.log(`\nSummary: ${failed} check(s) failed`);
  process.exit(1);
}

console.log("\nSummary: ALL OK");
