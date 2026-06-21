import {
  BUILTIN_DESIGN_IMPORT_PACKS,
  DESIGN_IMPORT_CATEGORY_LABELS,
  findImportPackById,
  type DesignImportCategory,
  type DesignImportPack,
} from "./designImportCatalog";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const CATEGORY_ORDER: DesignImportCategory[] = [
  "colors",
  "uiverse",
  "ios",
  "glass-card",
  "columns",
  "theme",
];

export function formatDesignImportLibrarySummary(
  extra: DesignImportPack[] = [],
): string {
  const merged = [...BUILTIN_DESIGN_IMPORT_PACKS, ...extra];
  const lines: string[] = [
    "📚 مكتبة الثيمات — اختر تصنيفًا في مركز التصميم:",
    "",
  ];

  for (const cat of CATEGORY_ORDER) {
    const packs = merged.filter((p) => p.category === cat);
    if (packs.length === 0) continue;
    lines.push(`${DESIGN_IMPORT_CATEGORY_LABELS[cat]} (${packs.length})`);
    for (const p of packs.slice(0, 3)) {
      lines.push(`  • ${p.emoji} ${p.title} — «${p.id}»`);
    }
    if (packs.length > 3) lines.push(`  … +${packs.length - 3} أخرى`);
    lines.push("");
  }

  lines.push(
    "🔗 استيراد JSON: مركز التصميم → مكتبة الثيمات → الصق رابط",
    "⚡ تطبيق سريع: «طبّق uiverse-neon-glow» أو «طبّق colors-midnight-blue»",
  );
  return lines.join("\n");
}

export function matchImportPackFromPrompt(
  text: string,
  extra: DesignImportPack[] = [],
): DesignImportPack | null {
  const lower = normalize(text);
  const all = [...extra, ...BUILTIN_DESIGN_IMPORT_PACKS];

  const idMatch = lower.match(
    /(?:طبّ?ق|apply|استورد|import)\s+([a-z0-9-]+)/i,
  );
  if (idMatch?.[1]) {
    const byId = findImportPackById(idMatch[1], extra);
    if (byId) return byId;
  }

  const ranked = all
    .map((pack) => {
      let score = 0;
      const idNorm = pack.id.replace(/-/g, " ");
      if (lower.includes(pack.id) || lower.includes(idNorm)) score += 10;
      if (lower.includes(pack.title.toLowerCase())) score += 6;
      for (const tag of pack.tags) {
        if (lower.includes(tag.toLowerCase())) score += 3;
      }
      if (lower.includes("uiverse") && pack.category === "uiverse") score += 5;
      if (lower.includes("liquid") && pack.id.includes("liquid")) score += 5;
      if (lower.includes("neon") && pack.tags.some((t) => t.includes("neon")))
        score += 4;
      return { pack, score };
    })
    .filter((r) => r.score >= 5)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.pack ?? null;
}

export function describeImportPackApply(pack: DesignImportPack): string {
  const parts: string[] = [`${pack.emoji} ${pack.title}`];
  if (pack.glassFormId) parts.push(`زجاج: ${pack.glassFormId}`);
  if (pack.columnCardStyleId) parts.push(`بطاقة: ${pack.columnCardStyleId}`);
  if (pack.templateId) parts.push(`قالب: ${pack.templateId}`);
  parts.push(DESIGN_IMPORT_CATEGORY_LABELS[pack.category]);
  return parts.join(" · ");
}
