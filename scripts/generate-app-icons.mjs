import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "public/images/lamma-logo-nice.png");
const outDir = path.join(root, "public/images");

const BG = { r: 11, g: 18, b: 24, alpha: 1 }; // #0b1218

async function makeIcon(size, { maskable = false } = {}) {
  const padding = maskable ? Math.round(size * 0.18) : Math.round(size * 0.1);
  const inner = size - padding * 2;

  const logo = await sharp(source)
    .resize({ width: inner, height: inner, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  const meta = await sharp(logo).metadata();
  const left = Math.round((size - (meta.width ?? inner)) / 2);
  const top = Math.round((size - (meta.height ?? inner)) / 2);

  const suffix = maskable ? "-maskable" : "";
  const out = path.join(outDir, `lamma-app-icon-${size}${suffix}.png`);

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(out);

  console.log("wrote", path.relative(root, out));
}

await mkdir(outDir, { recursive: true });

for (const size of [180, 192, 512, 1024]) {
  await makeIcon(size);
  if (size >= 512) await makeIcon(size, { maskable: true });
}

console.log("done");
