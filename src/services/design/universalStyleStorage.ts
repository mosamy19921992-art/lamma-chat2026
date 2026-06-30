import { supabase } from "../../lib/supabase";
import { applyUniversalStyleToDom } from "./universalStyleApply";
import { applyDesignOverlays, attachOverlaysToConfig, collectDesignOverlays } from "./designOverlayBundle";
import { shouldPreferLocalChaseLight } from "./chaseLightBarService";
import {
  UNIVERSAL_STYLE_SAVED_AT_KEY,
  UNIVERSAL_STYLE_STORAGE_KEY,
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from "./universalStyleTypes";

const SUPABASE_WRITE_TIMEOUT_MS = 10_000;
/** Local theme wins over remote if saved this many ms after remote updated_at */
const LOCAL_NEWER_GRACE_MS = 800;

async function withWriteTimeout<T>(
  promise: PromiseLike<T>,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} — انتهت مهلة الاتصال بالسيرفر`)),
      SUPABASE_WRITE_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getUniversalStyleLocalSavedAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(UNIVERSAL_STYLE_SAVED_AT_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function markUniversalStyleSavedAt(ts = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UNIVERSAL_STYLE_SAVED_AT_KEY, String(ts));
  } catch {
    // ignore
  }
}

export function loadUniversalStyleLocal(): UniversalStyleConfig | null {
  try {
    const raw = localStorage.getItem(UNIVERSAL_STYLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UniversalStyleConfig;
    if (parsed?.version !== 1) return null;
    return normalizeUniversalStyleConfig(parsed);
  } catch {
    return null;
  }
}

export function saveUniversalStyleLocal(
  config: UniversalStyleConfig,
  savedAt?: number,
): void {
  try {
    localStorage.setItem(UNIVERSAL_STYLE_STORAGE_KEY, JSON.stringify(config));
    markUniversalStyleSavedAt(savedAt ?? Date.now());
  } catch {
    // ignore quota
  }
}

export async function syncUniversalStyleToSupabase(
  config: UniversalStyleConfig,
  ownerSettingsRowId = "global",
  options?: { skipOverlayCollect?: boolean },
): Promise<void> {
  const merged = options?.skipOverlayCollect
    ? normalizeUniversalStyleConfig(config)
    : attachOverlaysToConfig(config);
  const savedAt = Date.now();
  saveUniversalStyleLocal(merged, savedAt);
  if (!supabase) return;

  const patch = {
    universal_style_config: merged,
    updated_at: new Date(savedAt).toISOString(),
  };

  const { data, error } = await withWriteTimeout(
    supabase
      .from("owner_settings")
      .update(patch)
      .eq("id", ownerSettingsRowId)
      .select("updated_at")
      .maybeSingle(),
    "حفظ التصميم",
  );

  if (error) {
    const { data: upsertData, error: upsertError } = await withWriteTimeout(
      supabase
        .from("owner_settings")
        .upsert(
          {
            id: ownerSettingsRowId,
            ...patch,
          },
          { onConflict: "id" },
        )
        .select("updated_at")
        .maybeSingle(),
      "حفظ التصميم (upsert)",
    );
    if (upsertError) {
      if (upsertError.code === "42501") {
        throw new Error(
          "RLS: حسابك لا يملك صلاحية الكتابة — أضف role=owner في user_roles",
        );
      }
      if (
        upsertError.message.includes("universal_style_config") ||
        upsertError.code === "PGRST204"
      ) {
        throw new Error(
          "عمود universal_style_config غير موجود — شغّل supabase-universal-style.sql",
        );
      }
      throw new Error(upsertError.message);
    }
    const remoteTs = parseRemoteUpdatedAt(
      (upsertData as { updated_at?: string } | null)?.updated_at,
    );
    if (remoteTs) saveUniversalStyleLocal(merged, remoteTs);
    return;
  }

  const remoteTs = parseRemoteUpdatedAt(
    (data as { updated_at?: string } | null)?.updated_at,
  );
  if (remoteTs) saveUniversalStyleLocal(merged, remoteTs);
}

function parseRemoteUpdatedAt(value?: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export async function loadUniversalStyleFromSupabase(
  ownerSettingsRowId = "global",
): Promise<UniversalStyleConfig | null> {
  const localCached = loadUniversalStyleLocal();
  const localSavedAt = getUniversalStyleLocalSavedAt();

  if (!supabase) return localCached;

  const { data, error } = await supabase
    .from("owner_settings")
    .select("universal_style_config, updated_at")
    .eq("id", ownerSettingsRowId)
    .maybeSingle();

  if (error) {
    console.warn("[UniversalStyle] load failed:", error.message);
    return localCached;
  }

  const row = data as {
    universal_style_config?: UniversalStyleConfig;
    updated_at?: string;
  } | null;
  const remoteUpdatedAt = parseRemoteUpdatedAt(row?.updated_at) ?? 0;
  const remote = row?.universal_style_config;

  if (
    localCached &&
    localSavedAt > remoteUpdatedAt + LOCAL_NEWER_GRACE_MS
  ) {
    console.info(
      "[UniversalStyle] local theme is newer than remote — keeping local and re-pushing",
    );
    void syncUniversalStyleToSupabase(localCached, ownerSettingsRowId).catch(
      (pushError) => {
        console.warn("[UniversalStyle] re-push local theme failed:", pushError);
      },
    );
    return normalizeUniversalStyleConfig(localCached);
  }

  if (remote?.version === 1) {
    const normalized = normalizeUniversalStyleConfig(remote);
    saveUniversalStyleLocal(
      normalized,
      remoteUpdatedAt > 0 ? remoteUpdatedAt : Date.now(),
    );
    return normalized;
  }

  return localCached;
}

export function ensureUniversalStyleBoot(): UniversalStyleConfig {
  return loadUniversalStyleLocal() || createDefaultUniversalStyle();
}

/** Apply remote/local universal style bundle (DOM + localStorage + overlays). */
export function persistAndApplyUniversalStyle(config: UniversalStyleConfig): void {
  const normalized = normalizeUniversalStyleConfig(config);
  saveUniversalStyleLocal(normalized);
  applyUniversalStyleToDom(normalized, { preview: false });
  const localOverlays = collectDesignOverlays();
  const remoteOverlays = normalized.overlays;
  applyDesignOverlays({
    version: 1,
    ...remoteOverlays,
    ...(shouldPreferLocalChaseLight()
      ? { chaseLight: localOverlays.chaseLight }
      : {}),
  });
}

/** True when universal style uses the built-in chat wallpaper (MAN.png layer). */
export function isDefaultWallpaperConfig(config: UniversalStyleConfig): boolean {
  const defaults = createDefaultUniversalStyle();
  const g = config.backgrounds.global;
  const f = config.backgrounds.feed;
  return (
    g.kind === "color" &&
    f.kind === "color" &&
    g.value === defaults.backgrounds.global.value &&
    f.value === defaults.backgrounds.feed.value
  );
}

/** Strip custom wallpaper layers from a style config (keeps colors, glass, effects). */
export function resetConfigWallpaperToDefault(
  config: UniversalStyleConfig,
): UniversalStyleConfig {
  const next = structuredClone(normalizeUniversalStyleConfig(config));
  const defaults = createDefaultUniversalStyle();
  next.backgrounds.global = { ...defaults.backgrounds.global };
  next.backgrounds.feed = { ...defaults.backgrounds.feed };
  next.backgrounds.sidebar = { ...defaults.backgrounds.sidebar };
  if (next.regions?.["chat-wallpaper"]) {
    next.regions["chat-wallpaper"] = {
      ...next.regions["chat-wallpaper"],
      clean: true,
      removeColors: true,
      darken: 0,
    };
  }
  if (next.regions?.["chat-feed"]) {
    next.regions["chat-feed"] = { ...next.regions["chat-feed"], darken: 0 };
  }
  return next;
}
