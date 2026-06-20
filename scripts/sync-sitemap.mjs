/**
 * Generate a static sitemap.xml at build time.
 * Google Search Console fetches static XML from the CDN more reliably
 * than serverless rewrites (avoids "Couldn't fetch" / cold-start issues).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_URL = (
  process.env.VITE_APP_URL || "https://lamma-arabic-chat-room.vercel.app"
).replace(/\/$/, "");

const PUBLIC_ROOMS = [
  { id: "egypt", priority: "0.9" },
  { id: "arab", priority: "0.85" },
  { id: "youth", priority: "0.85" },
  { id: "palestine", priority: "0.85" },
  { id: "posts-feed", priority: "0.75" },
  { id: "fun", priority: "0.8" },
  { id: "games", priority: "0.8" },
  { id: "romance", priority: "0.75" },
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrlEntry(loc, { lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

const lastmod = new Date().toISOString().slice(0, 10);

const entries = [
  buildUrlEntry(`${SITE_URL}/`, {
    lastmod,
    changefreq: "daily",
    priority: "1.0",
  }),
  ...PUBLIC_ROOMS.map((room) =>
    buildUrlEntry(`${SITE_URL}/?room=${encodeURIComponent(room.id)}`, {
      lastmod,
      changefreq: "daily",
      priority: room.priority,
    }),
  ),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  "</urlset>",
  "",
].join("\n");

writeFileSync(join(root, "public", "sitemap.xml"), xml, "utf8");
console.log(`Sitemap synced: ${PUBLIC_ROOMS.length + 1} URLs → public/sitemap.xml`);
