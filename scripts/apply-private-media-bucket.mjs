import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT_REF = "detvapbvkabvdjsdttfy";

function loadEnvFile(filename) {
  const root = dirname(fileURLToPath(import.meta.url));
  const path = join(root, "..", filename);
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

const token =
  process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
  loadEnvFile(".env.local").SUPABASE_ACCESS_TOKEN?.trim();

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const root = dirname(fileURLToPath(import.meta.url));

async function applyFile(filename) {
  const sql = readFileSync(join(root, "..", filename), "utf8");
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const body = await response.text();
  if (!response.ok) {
    console.error(`Apply failed (${filename}):`, response.status, body);
    process.exit(1);
  }
  console.log(`Applied ${filename} OK`);
}

await applyFile("supabase-private-media.sql");
await applyFile("supabase-media-performance-fix.sql");
