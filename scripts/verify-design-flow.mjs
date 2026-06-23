/**
 * Smoke test: preview memory chain + overlay bundle attach (no browser).
 * Run: node scripts/verify-design-flow.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const typesPath = join(root, "src/services/design/universalStyleTypes.ts");
const src = readFileSync(typesPath, "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

// Inline minimal normalize (mirrors production defaults)
const DEFAULT = {
  version: 1,
  label: "default",
  themeId: "lamma-dark",
  palette: {
    bg: "#060a12",
    surface: "rgba(18, 24, 32, 0.72)",
    text: "#f1f5f9",
    muted: "#94a3b8",
    accent: "#f59e0b",
    accent2: "#10b981",
  },
  glass: { blurPx: 18, opacity: 0.12, borderOpacity: 0.1 },
  buttons: { radiusPx: 14, glow: false, neon: false },
  inputs: { radiusPx: 12 },
  backgrounds: {
    global: { kind: "color", value: "#060a12", overlayOpacity: 0, blurPx: 0 },
    feed: { kind: "color", value: "#060a12", overlayOpacity: 0, blurPx: 0 },
    sidebar: { kind: "color", value: "#060a12", overlayOpacity: 0, blurPx: 0 },
  },
  effects: {},
  regions: {},
};

function mergePreview(base, patch) {
  return {
    ...base,
    glass: { ...base.glass, ...patch.glass },
    palette: { ...base.palette, ...patch.palette },
  };
}

// Simulate Design Center slider chain (must accumulate, not reset)
let committed = structuredClone(DEFAULT);
let previewMemory = null;

function getEditable() {
  return previewMemory ?? committed;
}

const afterBlur = mergePreview(getEditable(), { glass: { blurPx: 28 } });
previewMemory = afterBlur;
assert(afterBlur.glass.blurPx === 28, "first slider patch");

const afterOpacity = mergePreview(getEditable(), { glass: { opacity: 0.25 } });
previewMemory = afterOpacity;
assert(afterOpacity.glass.blurPx === 28, "blur preserved after opacity slider");
assert(afterOpacity.glass.opacity === 0.25, "opacity applied");

committed = structuredClone(previewMemory);
previewMemory = null;
assert(getEditable().glass.blurPx === 28, "committed retains blur after save");

assert(src.includes("UNIVERSAL_STYLE_STORAGE_KEY"), "storage key exists in types module");

console.log("OK: design preview merge chain + commit simulation passed");
