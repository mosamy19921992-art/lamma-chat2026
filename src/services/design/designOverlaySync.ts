/** Debounced Supabase sync — isolated to avoid circular imports with overlay services. */

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight: Promise<void> | null = null;

export function scheduleDesignOverlaysSync(ownerSettingsRowId = "global"): void {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushDesignOverlaysToSupabase(ownerSettingsRowId).catch((error) => {
      console.warn("[DesignOverlays] sync failed:", error);
    });
  }, 150);
}

/** Cancel debounce and push overlays immediately (modal close / page hide). */
export async function flushDesignOverlaysSync(
  ownerSettingsRowId = "global",
): Promise<void> {
  if (typeof window === "undefined") return;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (pushInFlight) {
    await pushInFlight;
    return;
  }
  pushInFlight = pushDesignOverlaysToSupabase(ownerSettingsRowId).finally(() => {
    pushInFlight = null;
  });
  await pushInFlight;
}

export async function pushDesignOverlaysToSupabase(
  ownerSettingsRowId = "global",
): Promise<void> {
  const [{ attachOverlaysToConfig }, storage, types] = await Promise.all([
    import("./designOverlayBundle"),
    import("./universalStyleStorage"),
    import("./universalStyleTypes"),
  ]);

  const base =
    storage.loadUniversalStyleLocal() ?? types.createDefaultUniversalStyle();
  const merged = attachOverlaysToConfig(base);
  storage.saveUniversalStyleLocal(merged);

  await storage.syncUniversalStyleToSupabase(merged, ownerSettingsRowId, {
    skipOverlayCollect: true,
  });
}
