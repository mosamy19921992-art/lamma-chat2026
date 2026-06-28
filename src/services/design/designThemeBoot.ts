/**
 * Boot + prefetch design theme to prevent old-theme flash on login/refresh.
 */
import {
  applyDesignOverlays,
  applyFx2026FromLocalStorage,
  collectDesignOverlays,
  ensureAllDesignOverlaysApplied,
} from "./designOverlayBundle";
import {
  ensureUniversalStyleApplied,
} from "./universalStyleApply";
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
const SHELL_WAIT_MS = 5000;

let remoteReadyPromise: Promise<UniversalStyleConfig> | null = null;

function applyOverlayBundleForConfig(
  config: UniversalStyleConfig,
  overlaysFromConfig: boolean,
): void {
  const normalized = normalizeUniversalStyleConfig(config);
  if (overlaysFromConfig && normalized.overlays?.version === 1) {
    applyDesignOverlays(normalized.overlays);
  } else {
    applyDesignOverlays(collectDesignOverlays());
  }
  applyFx2026FromLocalStorage();
}

/** Apply universal style + overlays once the chat shell is mounted. */
export function applyFullDesignTheme(
  config: UniversalStyleConfig,
  options?: { overlaysFromConfig?: boolean },
): boolean {
  const normalized = normalizeUniversalStyleConfig(config);
  applyOverlayBundleForConfig(normalized, Boolean(options?.overlaysFromConfig));
  return ensureUniversalStyleApplied(normalized, { preview: false });
}

/** Synchronous — run in main.tsx before first React paint (body/overlays only). */
export function bootCachedDesignTheme(): void {
  const cached = loadUniversalStyleLocal();
  applyOverlayBundleForConfig(
    cached ?? createDefaultUniversalStyle(),
    false,
  );
  ensureAllDesignOverlaysApplied();
}

/** Fetch remote theme once; shared by App prefetch + ChatThemeGate. */
export function prefetchRemoteDesignTheme(
  ownerSettingsRowId = OWNER_SETTINGS_ROW_ID,
): Promise<UniversalStyleConfig> {
  if (!remoteReadyPromise) {
    remoteReadyPromise = loadUniversalStyleFromSupabase(ownerSettingsRowId).then(
      (loaded) => {
        const config = normalizeUniversalStyleConfig(
          loaded ?? loadUniversalStyleLocal() ?? createDefaultUniversalStyle(),
        );
        applyOverlayBundleForConfig(config, Boolean(loaded));
        return config;
      },
    );
  }
  return remoteReadyPromise;
}

/** Poll until `.lamma-neutral-glass` exists and the resolved theme is painted. */
export function waitForDesignThemeShell(
  config: UniversalStyleConfig,
  timeoutMs = SHELL_WAIT_MS,
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  const normalized = normalizeUniversalStyleConfig(config);
  const started = performance.now();

  return new Promise((resolve) => {
    const tick = () => {
      const root = document.querySelector(".lamma-neutral-glass");
      if (root?.getAttribute("data-universal-style") === "active") {
        ensureAllDesignOverlaysApplied();
        resolve(true);
        return;
      }
      if (applyFullDesignTheme(normalized, { overlaysFromConfig: true })) {
        resolve(true);
        return;
      }
      if (performance.now() - started > timeoutMs) {
        resolve(false);
        return;
      }
      window.requestAnimationFrame(tick);
    };
    tick();
  });
}

export function getRemoteDesignThemePromise(): Promise<UniversalStyleConfig> | null {
  return remoteReadyPromise;
}

export function resetRemoteDesignThemePrefetch(): void {
  remoteReadyPromise = null;
}
