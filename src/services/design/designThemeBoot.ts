/**
 * Boot + prefetch design theme to prevent old-theme flash on login/refresh.
 */
import {
  applyDesignOverlays,
  collectDesignOverlays,
  ensureAllDesignOverlaysApplied,
} from "./designOverlayBundle";
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

function applyFullDesignTheme(
  config: UniversalStyleConfig,
  options?: { overlaysFromConfig?: boolean },
): void {
  const normalized = normalizeUniversalStyleConfig(config);
  applyUniversalStyleToDom(normalized, { preview: false });
  if (options?.overlaysFromConfig && normalized.overlays?.version === 1) {
    applyDesignOverlays(normalized.overlays);
  } else {
    applyDesignOverlays(collectDesignOverlays());
  }
  ensureAllDesignOverlaysApplied();
}

/** Synchronous — run in main.tsx before first React paint. */
export function bootCachedDesignTheme(): void {
  const cached = loadUniversalStyleLocal();
  applyFullDesignTheme(cached ?? createDefaultUniversalStyle(), {
    overlaysFromConfig: false,
  });
}

/** Fetch remote theme once; shared by App prefetch + ChatScreen hook. */
export function prefetchRemoteDesignTheme(
  ownerSettingsRowId = OWNER_SETTINGS_ROW_ID,
): Promise<UniversalStyleConfig | null> {
  if (!remoteReadyPromise) {
    remoteReadyPromise = loadUniversalStyleFromSupabase(ownerSettingsRowId).then(
      (loaded) => {
        if (loaded) {
          applyFullDesignTheme(loaded, { overlaysFromConfig: true });
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
