import { isSafeHttpUrl } from "../../lib/chatHelpers";
import {
  extractCssFromHtml,
  parseAndScopeUiverseCss,
  type ParsedUiverseCss,
} from "./uiverseCssParser";
import {
  parseUiverseUrl,
  resolveUiverseTargetFromText,
  type ResolvedUiverseTarget,
} from "./uiverseTargetResolver";

const STYLE_ID_PREFIX = "lamma-uiverse-scoped";
const STORAGE_KEY = "lamma_uiverse_scoped_active";
const GALAXY_FOLDERS = [
  "Buttons",
  "Cards",
  "Checkboxes",
  "Forms",
  "Inputs",
  "Loaders",
  "Patterns",
  "Radio-buttons",
  "Switches",
  "Tooltips",
  "Other",
];

export interface UiverseFetchResult {
  css: string;
  source: "uiverse-page" | "galaxy";
  title?: string;
}

export interface UiverseApplyResult {
  ok: boolean;
  error?: string;
  parsed?: ParsedUiverseCss;
  target?: ResolvedUiverseTarget;
}

interface ActiveScopedApply {
  region: string;
  subTarget: string;
  styleId: string;
  targetLabel: string;
  sourceUrl: string;
}

function styleIdFor(region: string, subTarget: string): string {
  return `${STYLE_ID_PREFIX}-${region}-${subTarget}`;
}

function loadActive(): ActiveScopedApply[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActiveScopedApply[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveActive(list: ActiveScopedApply[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {
    // ignore
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchFromGalaxy(
  author: string,
  slug: string,
): Promise<string | null> {
  const fileName = `${author}_${slug}.html`;
  for (const folder of GALAXY_FOLDERS) {
    const url = `https://raw.githubusercontent.com/uiverse-io/galaxy/main/${folder}/${encodeURIComponent(fileName)}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.text();
    } catch {
      // try next folder
    }
  }
  return null;
}

async function fetchViaProxy(url: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/fetch-uiverse?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { html?: string; css?: string };
    if (data.css) return `<style>${data.css}</style>`;
    if (data.html) return data.html;
    return null;
  } catch {
    return null;
  }
}

export async function fetchUiverseCssFromUrl(
  url: string,
): Promise<{ result: UiverseFetchResult | null; error: string | null }> {
  const trimmed = url.trim();
  if (!isSafeHttpUrl(trimmed)) {
    return { result: null, error: "الرابط يجب أن يبدأ بـ https://" };
  }

  const uiverse = parseUiverseUrl(trimmed);
  if (!uiverse) {
    return {
      result: null,
      error: "رابط UIverse غير صالح — مثال: https://uiverse.io/user/slug",
    };
  }
  let html: string | null = null;
  let source: UiverseFetchResult["source"] = "uiverse-page";

  html = await fetchHtml(trimmed);
  if (!html) {
    html = await fetchViaProxy(trimmed);
  }
  if (!html) {
    html = await fetchFromGalaxy(uiverse.author, uiverse.slug);
    if (html) source = "galaxy";
  }

  if (!html) {
    return {
      result: null,
      error:
        "تعذّر جلب المكوّن من UIverse. تأكد من الرابط أو جرّب لاحقًا.",
    };
  }

  const css = extractCssFromHtml(html);
  if (!css.trim()) {
    return {
      result: null,
      error: "لم أجد CSS في صفحة UIverse — جرّب رابط مكوّن آخر.",
    };
  }

  return {
    result: {
      css,
      source,
      title: `${uiverse.author}/${uiverse.slug}`,
    },
    error: null,
  };
}

export function applyUiverseCssToTarget(
  css: string,
  targetText: string,
  sourceUrl: string,
): UiverseApplyResult {
  if (typeof document === "undefined") {
    return { ok: false, error: "التطبيق متاح في المتصفح فقط." };
  }

  const { target, error: targetError } = resolveUiverseTargetFromText(targetText);
  if (!target) {
    return { ok: false, error: targetError ?? "عنصر غير معروف." };
  }

  const scopeId = `${target.region}-${target.subTarget}`.replace(/[^a-z0-9-]/gi, "-");
  const parsed = parseAndScopeUiverseCss(css, target.selectors, scopeId);

  if (!parsed.scopedCss.trim()) {
    return { ok: false, error: "لم يتبقّ CSS آمن للتطبيق بعد الفلترة." };
  }

  const id = styleIdFor(target.region, target.subTarget);
  resetUiverseScopedStyle(target.region, target.subTarget);

  const styleEl = document.createElement("style");
  styleEl.id = id;
  styleEl.setAttribute("data-lamma-uiverse", "true");
  styleEl.textContent = `/* Lamma scoped UIverse — ${target.labelAr} */\n${parsed.scopedCss}`;
  document.head.appendChild(styleEl);

  markRegionApplied(target);

  const active = loadActive().filter(
    (a) => !(a.region === target.region && a.subTarget === target.subTarget),
  );
  active.unshift({
    region: target.region,
    subTarget: target.subTarget,
    styleId: id,
    targetLabel: target.labelAr,
    sourceUrl,
  });
  saveActive(active);

  return { ok: true, parsed, target };
}

function markRegionApplied(target: ResolvedUiverseTarget): void {
  const nodes = document.querySelectorAll(
    `.lamma-neutral-glass [data-design-region="${target.region}"]`,
  );
  nodes.forEach((node) => {
    if (node instanceof HTMLElement) {
      node.dataset.uiverseScoped = target.subTarget;
    }
  });
}

export function resetUiverseScopedStyle(
  region?: string,
  subTarget?: string,
): boolean {
  if (typeof document === "undefined") return false;

  if (!region) {
    const active = loadActive();
    for (const entry of active) {
      document.getElementById(entry.styleId)?.remove();
      clearRegionMarks(entry.region);
    }
    saveActive([]);
    return true;
  }

  const id = styleIdFor(region, subTarget ?? "all");
  document.getElementById(id)?.remove();
  clearRegionMarks(region);

  const next = loadActive().filter(
    (a) => !(a.region === region && a.subTarget === (subTarget ?? "all")),
  );
  saveActive(next);
  return true;
}

function clearRegionMarks(region: string): void {
  document
    .querySelectorAll(`[data-design-region="${region}"][data-uiverse-scoped]`)
    .forEach((el) => {
      if (el instanceof HTMLElement) {
        delete el.dataset.uiverseScoped;
      }
    });
}

export function getActiveUiverseScopedApplies(): ActiveScopedApply[] {
  return loadActive();
}

export function restoreUiverseScopedOnLoad(): void {
  if (typeof document === "undefined") return;
  const active = loadActive();
  for (const entry of active) {
    if (!document.getElementById(entry.styleId)) {
      clearRegionMarks(entry.region);
    }
  }
  saveActive(active.filter((a) => document.getElementById(a.styleId)));
}
