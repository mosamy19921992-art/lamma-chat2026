import {
  BUILTIN_DESIGN_IMPORT_PACKS,
  type DesignImportPack,
  findImportPackById,
} from "./designImportCatalog";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function formatDesignImportLibrarySummary(
  extra: DesignImportPack[] = [],
): string {
  const merged = [...BUILTIN_DESIGN_IMPORT_PACKS, ...extra];
  const ios = merged.filter((p) => p.category === "ios");
  const themes = merged.filter((p) => p.category === "theme");
  const lines: string[] = [
    "📚 مكتبة ثيمات مهندس التصميم — اختر من مركز التصميم → مكتبة الثيمات، أو اكتب اسم الثيم:",
    "",
    "🍎 iOS:",
    ...ios.map((p) => `• ${p.emoji} ${p.title} — «${p.id}»`),
    "",
    "🎨 ثيمات:",
    ...themes.slice(0, 4).map((p) => `• ${p.emoji} ${p.title} — «${p.id}»`),
    "",
    "🔗 استيراد من النت: الصق رابط JSON في المكتبة، أو اكتب:",
    "استورد من https://…/theme.json",
    "",
    "أمثلة: «liquid glass» · «ios vibrancy» · «طبّق ios-liquid-glass»",
  ];
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
      if (lower.includes(pack.id) || lower.includes(idNorm)) score += 8;
      for (const tag of pack.tags) {
        if (lower.includes(tag.toLowerCase())) score += 3;
      }
      if (lower.includes("liquid") && pack.id.includes("liquid")) score += 6;
      if (lower.includes("vibrancy") && pack.id.includes("vibrancy")) score += 6;
      if (lower.includes("ios") && pack.category === "ios") score += 4;
      if (lower.includes(pack.title.toLowerCase())) score += 5;
      return { pack, score };
    })
    .filter((r) => r.score >= 4)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.pack ?? null;
}

export function describeImportPackApply(pack: DesignImportPack): string {
  const parts: string[] = [`${pack.emoji} ${pack.title}`];
  if (pack.glassFormId) parts.push(`فورم زجاج: ${pack.glassFormId}`);
  if (pack.columnCardStyleId) parts.push(`بطاقات: ${pack.columnCardStyleId}`);
  if (pack.templateId) parts.push(`قالب: ${pack.templateId}`);
  if (pack.stylePrompt) parts.push(`ألوان/مظهر: ${pack.stylePrompt.slice(0, 48)}…`);
  return parts.join(" · ");
}
