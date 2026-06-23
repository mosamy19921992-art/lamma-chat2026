/**
 * Boot + prefetch design theme to prevent old-theme flash on login/refresh.
 */
import { applyDesignOverlays } from "./designOverlayBundle";
import { applyUniversalStyleToDom } from "./universalStyleApply";
import {
  loadUniversalStyleFromSupabase,
  loadUniversalStyleLocal,
} from "./universalStyleStorage";
import {
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from "./universalStyleTypes";

const OWNER_SETTINGS_ROW_ID = "global";

let remoteReadyPromise: Promise<UniversalStyleConfig | null> | null = null;

function applyFullDesignTheme(config: UniversalStyleConfig): void {
  const normalized = normalizeUniversalStyleConfig(config);
  applyUniversalStyleToDom(normalized, { preview: false });
  applyDesignOverlays(normalized.overlays);
}

/** Synchronous — run in main.tsx before first React paint. */
export function bootCachedDesignTheme(): void {
  const cached = loadUniversalStyleLocal();
  applyFullDesignTheme(cached ?? createDefaultUniversalStyle());
}

/** Fetch remote theme once; shared by App prefetch + ChatScreen hook. */
export function prefetchRemoteDesignTheme(
  ownerSettingsRowId = OWNER_SETTINGS_ROW_ID,
): Promise<UniversalStyleConfig | null> {
  if (!remoteReadyPromise) {
    remoteReadyPromise = loadUniversalStyleFromSupabase(ownerSettingsRowId).then(
      (loaded) => {
        if (loaded) {
          applyFullDesignTheme(loaded);
          return normalizeUniversalStyleConfig(loaded);
        }
        return loadUniversalStyleLocal();
      },
    );
  }
  return remoteReadyPromise;
}

export function getRemoteDesignThemePromise(): Promise<UniversalStyleConfig | null> | null {
  return remoteReadyPromise;
}

export function resetRemoteDesignThemePrefetch(): void {
  remoteReadyPromise = null;
}
