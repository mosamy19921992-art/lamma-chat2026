import { supabase } from "../../lib/supabase";
import { applyUniversalStyleToDom } from "./universalStyleApply";
import { attachOverlaysToConfig } from "./designOverlayBundle";
import {
  UNIVERSAL_STYLE_STORAGE_KEY,
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from "./universalStyleTypes";

const SUPABASE_WRITE_TIMEOUT_MS = 10_000;

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

export function saveUniversalStyleLocal(config: UniversalStyleConfig): void {
  try {
    localStorage.setItem(UNIVERSAL_STYLE_STORAGE_KEY, JSON.stringify(config));
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
  saveUniversalStyleLocal(merged);
  if (!supabase) return;

  const patch = {
    universal_style_config: merged,
    updated_at: new Date().toISOString(),
  };

  const { error } = await withWriteTimeout(
    supabase
      .from("owner_settings")
      .update(patch)
      .eq("id", ownerSettingsRowId),
    "حفظ التصميم",
  );

  if (error) {
    const { error: upsertError } = await withWriteTimeout(
      supabase.from("owner_settings").upsert(
        {
          id: ownerSettingsRowId,
          ...patch,
        },
        { onConflict: "id" },
      ),
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
  }
}

export async function loadUniversalStyleFromSupabase(
  ownerSettingsRowId = "global",
): Promise<UniversalStyleConfig | null> {
  if (!supabase) return loadUniversalStyleLocal();

  const { data, error } = await supabase
    .from("owner_settings")
    .select("universal_style_config")
    .eq("id", ownerSettingsRowId)
    .maybeSingle();

  if (error) {
    console.warn("[UniversalStyle] load failed:", error.message);
    return loadUniversalStyleLocal();
  }

  const remote = (data as { universal_style_config?: UniversalStyleConfig } | null)
    ?.universal_style_config;

  if (remote?.version === 1) {
    const normalized = normalizeUniversalStyleConfig(remote);
    saveUniversalStyleLocal(normalized);
    return normalized;
  }

  return loadUniversalStyleLocal();
}

export function ensureUniversalStyleBoot(): UniversalStyleConfig {
  return loadUniversalStyleLocal() || createDefaultUniversalStyle();
}

/** Apply remote/local universal style bundle (DOM + localStorage). */
export function persistAndApplyUniversalStyle(config: UniversalStyleConfig): void {
  saveUniversalStyleLocal(config);
  applyUniversalStyleToDom(config, { preview: false });
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
