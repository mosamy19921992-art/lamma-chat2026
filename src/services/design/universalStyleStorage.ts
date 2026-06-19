import { supabase } from "../../lib/supabase";
import { applyUniversalStyleToDom } from "./universalStyleApply";
import {
  UNIVERSAL_STYLE_STORAGE_KEY,
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from "./universalStyleTypes";

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
): Promise<void> {
  saveUniversalStyleLocal(config);
  if (!supabase) return;

  const { error } = await supabase
    .from("owner_settings")
    .update({
      universal_style_config: config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ownerSettingsRowId);

  if (error) {
    // Fallback: row may not exist yet — safe partial upsert
    const { error: upsertError } = await supabase.from("owner_settings").upsert(
      {
        id: ownerSettingsRowId,
        universal_style_config: config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (upsertError) {
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
