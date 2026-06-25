import type { DesignImportPack } from "./designImportCatalog";
import { isSafeHttpUrl } from "../../lib/chatHelpers";

const IMPORT_STORAGE_KEY = "lamma_design_imported_packs";
const MAX_IMPORTED = 24;

function isValidPack(raw: unknown): raw is DesignImportPack {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.subtitle === "string" &&
    typeof p.emoji === "string" &&
    typeof p.category === "string" &&
    Array.isArray(p.tags) &&
    typeof p.previewGradient === "string"
  );
}

export function loadImportedDesignPacks(): DesignImportPack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IMPORT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPack).slice(0, MAX_IMPORTED);
  } catch {
    return [];
  }
}

export function saveImportedDesignPacks(packs: DesignImportPack[]): void {
  try {
    localStorage.setItem(
      IMPORT_STORAGE_KEY,
      JSON.stringify(packs.slice(0, MAX_IMPORTED)),
    );
  } catch {
    // ignore quota
  }
}

export function addImportedDesignPack(pack: DesignImportPack): DesignImportPack[] {
  const existing = loadImportedDesignPacks().filter((p) => p.id !== pack.id);
  const next = [{ ...pack, sourceUrl: pack.sourceUrl }, ...existing].slice(
    0,
    MAX_IMPORTED,
  );
  saveImportedDesignPacks(next);
  return next;
}

export async function fetchDesignPackFromUrl(
  url: string,
): Promise<{ pack: DesignImportPack | null; error: string | null }> {
  const trimmed = url.trim();
  if (!isSafeHttpUrl(trimmed)) {
    return { pack: null, error: "الرابط يجب أن يبدأ بـ https://" };
  }

  try {
    const res = await fetch(trimmed, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return { pack: null, error: `فشل الجلب — HTTP ${res.status}` };
    }
    const contentType = res.headers.get("content-type") || "";
    if (
      !String(contentType).includes("json") &&
      !trimmed.endsWith(".json") &&
      !trimmed.includes("raw.githubusercontent")
    ) {
      return { pack: null, error: "الرابط لازم يرجّع JSON (ملف ثيم)." };
    }
    const data: unknown = await res.json();
    if (Array.isArray(data)) {
      const first = data.find(isValidPack);
      if (!first) {
        return { pack: null, error: "الملف لا يحتوي على pack صالح." };
      }
      return {
        pack: { ...first, sourceUrl: trimmed, id: `import-${first.id}` },
        error: null,
      };
    }
    if (!isValidPack(data)) {
      return { pack: null, error: "صيغة JSON غير متوافقة مع Lamma Design Pack." };
    }
    const pack = data as DesignImportPack;
    return {
      pack: {
        ...pack,
        sourceUrl: trimmed,
        id: pack.id.startsWith("import-") ? pack.id : `import-${pack.id}`,
      },
      error: null,
    };
  } catch {
    return { pack: null, error: "تعذر الاتصال بالرابط — تحقق من CORS أو الرابط." };
  }
}

export async function fetchBundledDesignPack(
  bundlePath: string,
): Promise<DesignImportPack | null> {
  if (!bundlePath.startsWith("/")) return null;
  try {
    const res = await fetch(bundlePath, { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isValidPack(data)) return null;
    return data as DesignImportPack;
  } catch {
    return null;
  }
}

export function resolvePublicImportUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${String(base).replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
