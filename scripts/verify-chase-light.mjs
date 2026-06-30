/**
 * Verify chase-light 2026 neon-beam wiring (edge chase per-region removed).
 * Run: node scripts/verify-chase-light.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(
  join(root, "src/services/design/chaseLightBarService.ts"),
  "utf8",
);
const shapes = readFileSync(
  join(root, "src/components/modals/DesignShapesPanel.tsx"),
  "utf8",
);

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

assert(src.includes("hydrateNeonBeamTargets"), "hydrateNeonBeamTargets exists");
assert(src.includes("stripEdgeChaseStyle"), "stripEdgeChaseStyle migrates legacy edge chase");
assert(!src.includes("buildChaseAllSettings"), "buildChaseAllSettings removed");
assert(src.includes("NEON_BEAM_ALL_TARGETS"), "all targets exported");
assert(!src.includes("rainbow-ring"), "legacy rainbow preset id removed from service");
assert(!shapes.includes("إضاءة الحواف"), "edge lighting UI removed from shapes panel");
assert(!shapes.includes("تخصيص لكل منطقة"), "per-region chase UI removed from shapes panel");

const css = readFileSync(join(root, "src/styles/chase-light-bars.css"), "utf8");
assert(css.includes("data-neon-beam-targets~=\"store\""), "neon-beam store selector");
assert(!css.includes("data-chase-columns=\"aurora-flow\""), "aurora-flow column CSS removed");
assert(css.includes("data-us-sidebar-chase"), "legacy chase suppressed in CSS");

const apply = readFileSync(
  join(root, "src/services/design/universalStyleApply.ts"),
  "utf8",
);
assert(
  apply.includes("Legacy rainbow sidebar chase removed"),
  "universalStyleApply no longer sets data-us-sidebar-chase",
);
assert(!apply.includes('setAttribute("data-us-sidebar-chase", "true")'), "sidebar chase attribute removed");

console.log("OK: chase-light 2026 wiring verified");
