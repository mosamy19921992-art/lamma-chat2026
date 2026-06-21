/** Parse, sanitize, and scope Uiverse CSS for safe injection on Lamma chat regions. */

const BLOCKED_PATTERNS = [
  /@import\b/i,
  /javascript\s*:/i,
  /expression\s*\(/i,
  /behavior\s*:/i,
  /-moz-binding/i,
  /url\s*\(\s*["']?\s*data:(?!image\/)/i,
];

const VISUAL_PROPS = new Set([
  "background",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "backdrop-filter",
  "-webkit-backdrop-filter",
  "border",
  "border-radius",
  "border-color",
  "border-width",
  "border-style",
  "box-shadow",
  "color",
  "filter",
  "opacity",
  "outline",
  "outline-color",
  "text-shadow",
  "transform",
  "transition",
  "animation",
  "animation-name",
  "animation-duration",
  "animation-timing-function",
  "animation-iteration-count",
  "mix-blend-mode",
  "clip-path",
  "padding",
  "gap",
]);

export interface ParsedUiverseCss {
  rawCss: string;
  scopedCss: string;
  rootClass: string | null;
  hasGlass: boolean;
  accentColors: string[];
  summaryAr: string;
}

export function extractCssFromHtml(html: string): string {
  const styles: string[] = [];
  const styleTagRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = styleTagRe.exec(html)) !== null) {
    if (m[1]?.trim()) styles.push(m[1].trim());
  }
  if (styles.length > 0) return styles.join("\n");

  const nextData = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (nextData?.[1]) {
    try {
      const json = JSON.parse(nextData[1]) as Record<string, unknown>;
      const found = findCssInObject(json);
      if (found) return found;
    } catch {
      // ignore
    }
  }

  const scopedMatch = html.match(/"scopedCss"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (scopedMatch?.[1]) {
    return JSON.parse(`"${scopedMatch[1]}"`) as string;
  }

  const cssMatch = html.match(/"css"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (cssMatch?.[1]) {
    return JSON.parse(`"${cssMatch[1]}"`) as string;
  }

  return "";
}

/** First HTML fragment before `<style>` — used for isolated UIverse preview. */
export function extractPreviewMarkupFromHtml(html: string): string | null {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const bodyMatch = withoutScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const fragment = (bodyMatch?.[1] ?? withoutScripts).split(/<style/i)[0]?.trim();
  if (!fragment || fragment.length < 3) return null;

  const cleaned = fragment
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .trim();

  return cleaned.length >= 3 ? cleaned.slice(0, 12_000) : null;
}

export function buildFallbackPreviewMarkup(css: string): string {
  const rootClass = findRootClass(css);
  if (rootClass) {
    return `<button type="button" class="${rootClass}"><span>معاينة</span></button>`;
  }
  return `<div class="uv-preview-fallback">●</div>`;
}

function findCssInObject(obj: unknown, depth = 0): string | null {
  if (depth > 12 || !obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  if (typeof rec.scopedCss === "string" && rec.scopedCss.trim()) {
    return rec.scopedCss;
  }
  if (typeof rec.css === "string" && rec.css.trim()) return rec.css;
  for (const value of Object.values(rec)) {
    const nested = findCssInObject(value, depth + 1);
    if (nested) return nested;
  }
  return null;
}

export function sanitizeCss(css: string): { css: string; blocked: string[] } {
  const blocked: string[] = [];
  let out = css.slice(0, 48_000);

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(out)) {
      blocked.push(pattern.source);
      out = out.replace(pattern, "/* blocked */");
    }
  }

  out = out.replace(/\b(html|body|:root|\*)\s*\{/gi, "/* blocked-global */{");

  return { css: out, blocked };
}

export function getRootClassFromCss(css: string): string | null {
  return findRootClass(css);
}

function findRootClass(css: string): string | null {
  const rules = css.match(/\.([a-zA-Z_][\w-]*)\s*\{/g);
  if (!rules?.length) return null;
  const counts = new Map<string, number>();
  for (const rule of rules) {
    const cls = rule.match(/\.([a-zA-Z_][\w-]*)/)?.[1];
    if (cls) counts.set(cls, (counts.get(cls) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [cls, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = cls;
    }
  }
  return best;
}

function extractHexColors(css: string): string[] {
  const found = new Set<string>();
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(css)) !== null) {
    found.add(`#${m[1].slice(0, 6)}`);
  }
  return [...found].slice(0, 8);
}

function renameKeyframes(css: string, suffix: string): string {
  const names = new Set<string>();
  css.replace(/@keyframes\s+([\w-]+)/g, (_, name: string) => {
    names.add(name);
    return "";
  });
  let out = css;
  for (const name of names) {
    const renamed = `lamma-uv-${suffix}-${name}`;
    out = out.replace(new RegExp(`@keyframes\\s+${name}\\b`, "g"), `@keyframes ${renamed}`);
    out = out.replace(new RegExp(`\\b${name}\\b`, "g"), renamed);
  }
  return out;
}

function scopeRulesToSelectors(
  css: string,
  rootClass: string | null,
  selectors: string[],
  scopeId: string,
): string {
  const safe = renameKeyframes(css, scopeId);
  const primary = selectors[0] ?? ".lamma-neutral-glass";
  const joined = selectors.join(",\n");

  if (!rootClass) {
    const declarations = extractVisualDeclarations(safe);
    if (!declarations) return "";
    return `${joined} {\n${declarations}\n}\n`;
  }

  const classRe = new RegExp(`\\.${rootClass}(?=[\\s:{.,#\\[+])`, "g");
  let scoped = safe.replace(classRe, joined);

  scoped = scoped.replace(
    new RegExp(`(${escapeRegExp(joined)})\\s*\\1`, "g"),
    "$1",
  );

  scoped = scoped.replace(
    /(\.lamma-neutral-glass[^{]+)::before/g,
    (match) => {
      if (match.includes("lamma-neutral-glass")) return match;
      return match;
    },
  );

  return scoped;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractVisualDeclarations(css: string): string {
  const blocks = css.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  const props: string[] = [];
  for (const block of blocks) {
    const body = block.match(/\{([\s\S]*)\}/)?.[1] ?? "";
    for (const line of body.split(";")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const prop = trimmed.split(":")[0]?.trim().toLowerCase();
      if (prop && VISUAL_PROPS.has(prop)) {
        props.push(trimmed);
      }
    }
  }
  return [...new Set(props)].join(";\n  ");
}

export function parseAndScopeUiverseCss(
  rawCss: string,
  selectors: string[],
  scopeId: string,
): ParsedUiverseCss {
  const { css: sanitized, blocked } = sanitizeCss(rawCss);
  const rootClass = findRootClass(sanitized);
  const hasGlass =
    /backdrop-filter|-webkit-backdrop-filter|rgba\s*\([^)]+\s*0\.\d/i.test(
      sanitized,
    );
  const accentColors = extractHexColors(sanitized);
  const scopedCss = scopeRulesToSelectors(
    sanitized,
    rootClass,
    selectors,
    scopeId,
  );

  const parts: string[] = [];
  if (hasGlass) parts.push("تأثير زجاجي");
  if (accentColors.length) parts.push(`${accentColors.length} لون`);
  if (rootClass) parts.push(`مكوّن .${rootClass}`);
  if (blocked.length) parts.push("فلتر أمان");

  return {
    rawCss: sanitized,
    scopedCss,
    rootClass,
    hasGlass,
    accentColors,
    summaryAr: parts.length ? parts.join(" · ") : "أنماط بصرية",
  };
}
