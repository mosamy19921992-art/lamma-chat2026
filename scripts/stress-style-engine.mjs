/**
 * Stress-test Universal Style Engine parser (no browser, no Supabase).
 * Usage: node scripts/stress-style-engine.mjs
 */

import { performance } from "node:perf_hooks";

const PROMPTS = [
  "make the site cyberpunk neon",
  "fabulous glassmorphic look",
  "make buttons rounder",
  "more blur neon darker",
  "background https://example.com/bg.jpg for feed",
  "javascript:alert(1) style neon",
];

async function main() {
  const { parseOwnerStylePrompt, isOwnerStylePrompt } = await import(
    "../src/services/design/universalStyleEngine.ts"
  );
  const { createDefaultUniversalStyle } = await import(
    "../src/services/design/universalStyleTypes.ts"
  );

  let config = createDefaultUniversalStyle();
  const start = performance.now();
  let iterations = 0;

  for (let round = 0; round < 200; round += 1) {
    for (const prompt of PROMPTS) {
      if (!isOwnerStylePrompt(prompt) && !prompt.includes("javascript")) continue;
      const result = parseOwnerStylePrompt(prompt, config);
      config = result.config;
      iterations += 1;
    }
  }

  const elapsed = performance.now() - start;
  console.log(`Iterations: ${iterations}`);
  console.log(`Elapsed: ${elapsed.toFixed(1)}ms`);
  console.log(`Final theme: ${config.themeId} / ${config.label}`);
  console.log(
    elapsed < 5000 ? "PASS — parser stress within budget" : "WARN — parser slow",
  );
}

main().catch((error) => {
  console.error("Stress test failed:", error);
  process.exit(1);
});
