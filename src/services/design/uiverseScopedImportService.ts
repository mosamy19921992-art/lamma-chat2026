import { isSafeHttpUrl } from "../../lib/chatHelpers";
import {
  extractCssFromHtml,
  extractPreviewMarkupFromHtml,
  buildFallbackPreviewMarkup,
  parseAndScopeUiverseCss,
  type ParsedUiverseCss,
} from "./uiverseCssParser";
import {
  inferUiverseTargetFromUrl,
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
  "loaders",
  "Notifications",
  "Patterns",
  "Radio-buttons",
  "Toggle-switches",
  "Tooltips",
];

export interface UiverseFetchResult {
  css: string;
  source: "uiverse-page" | "galaxy";
  title?: string;
  previewMarkup?: string;
  suggestedTargetAr?: string;
}

function buildFetchResult(
  css: string,
  source: UiverseFetchResult["source"],
  title: string,
  rawHtml?: string | null,
  url?: string,
): UiverseFetchResult {
  const previewMarkup =
    (rawHtml ? extractPreviewMarkupFromHtml(rawHtml) : null) ??
    buildFallbackPreviewMarkup(css);
  const inferred = url ? inferUiverseTargetFromUrl(url) : null;
  const suggestedTargetAr = inferred
    ? resolveUiverseTargetFromText(
        inferred.region === "column-cards" ? "بطاقة الراديو" : "الأزرار",
        { urlHint: url, allowDefault: true },
      ).target?.labelAr
    : undefined;

  return {
    css,
    source,
    title,
    previewMarkup,
    suggestedTargetAr,
  };
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
  const fileNames = [
    `${author}_${slug}.html`,
    `${author.toLowerCase()}_${slug}.html`,
    `${author}_${slug.toLowerCase()}.html`,
  ];

  for (const folder of GALAXY_FOLDERS) {
    for (const fileName of fileNames) {
      const url = `https://raw.githubusercontent.com/uiverse-io/galaxy/main/${folder}/${encodeURIComponent(fileName)}`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          if (text.trim()) return text;
        }
      } catch {
        // try next folder
      }
    }
  }
  return null;
}

async function fetchViaProxy(
  url: string,
): Promise<{ html: string | null; css: string | null; source?: string; error?: string }> {
  try {
    const proxyUrl = `/api/fetch-uiverse?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { cache: "no-store" });
    const data = (await res.json()) as {
      html?: string;
      css?: string;
      source?: string;
      error?: string;
      hint?: string;
    };

    if (!res.ok) {
      return {
        html: null,
        css: null,
        error:
          data.hint ||
          data.error ||
          (res.status === 502
            ? "تعذّر جلب المكوّن — UIverse يحجب بعض الطلبات. جرّب رابطًا آخر."
            : `فشل الجلب (HTTP ${res.status})`),
      };
    }

    if (data.css?.trim()) {
      return { html: null, css: data.css, source: data.source };
    }
    if (data.html) {
      return { html: data.html, css: null, source: data.source };
    }
    return { html: null, css: null, error: data.hint || "لم يُرجع الخادم CSS." };
  } catch {
    return { html: null, css: null, error: "تعذّر الاتصال بخادم الجلب." };
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
  let fetchError: string | null = null;

  const proxy = await fetchViaProxy(trimmed);
  if (proxy.error && !proxy.css && !proxy.html) {
    fetchError = proxy.error;
  }
  if (proxy.css?.trim()) {
    return {
      result: buildFetchResult(
        proxy.css,
        proxy.source === "galaxy" ? "galaxy" : "uiverse-page",
        `${uiverse.author}/${uiverse.slug}`,
        proxy.html,
        trimmed,
      ),
      error: null,
    };
  }
  if (proxy.html) {
    html = proxy.html;
    if (proxy.source === "galaxy") source = "galaxy";
  }

  if (!html) {
    html = await fetchFromGalaxy(uiverse.author, uiverse.slug);
    if (html) source = "galaxy";
  }

  if (!html) {
    return {
      result: null,
      error:
        fetchError ||
        "تعذّر جلب المكوّن من UIverse. تأكد من الرابط (مثال: https://uiverse.io/user/slug) أو جرّب مكوّنًا أقدم من الأرشيف.",
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
    result: buildFetchResult(
      css,
      source,
      `${uiverse.author}/${uiverse.slug}`,
      html,
      trimmed,
    ),
    error: null,
  };
}

export function applyUiverseCssToTarget(
  css: string,
  targetText: string,
  sourceUrl: string,
  options?: { allowDefault?: boolean },
): UiverseApplyResult {
  if (typeof document === "undefined") {
    return { ok: false, error: "التطبيق متاح في المتصفح فقط." };
  }

  const { target, error: targetError } = resolveUiverseTargetFromText(
    targetText,
    { urlHint: sourceUrl, allowDefault: options?.allowDefault },
  );
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
