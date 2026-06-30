/**
 * Stress-test Universal Style Engine parser via Vite SSR (proper import.meta.env).
 * Usage: node scripts/stress-style-engine.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { createServer, loadEnv } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filename) {
  const path = join(root, filename);
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

for (const [key, value] of Object.entries({
  ...loadEnv("development", root, ""),
  ...loadEnvFile(".env.production.local"),
  ...loadEnvFile(".env.local"),
})) {
  if (value && !process.env[key]) process.env[key] = value;
}

if (!process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = "https://detvapbvkabvdjsdttfy.supabase.co";
}

const PROMPTS = [
  "make the site cyberpunk neon",
  "fabulous glassmorphic look",
  "make buttons rounder",
  "more blur neon darker",
  "background https://example.com/bg.jpg for feed",
  "javascript:alert(1) style neon",
];

async function main() {
  const server = await createServer({
    configFile: join(root, "vite.config.ts"),
    root,
    logLevel: "error",
  });

  try {
    const { parseOwnerStylePrompt, isOwnerStylePrompt } =
      await server.ssrLoadModule("/src/services/design/universalStyleEngine.ts");
    const { createDefaultUniversalStyle } =
      await server.ssrLoadModule("/src/services/design/universalStyleTypes.ts");

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
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error("Stress test failed:", error);
  process.exit(1);
});
