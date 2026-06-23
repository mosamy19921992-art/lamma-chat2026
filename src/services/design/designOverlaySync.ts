/** Debounced Supabase sync — isolated to avoid circular imports with overlay services. */

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleDesignOverlaysSync(ownerSettingsRowId = "global"): void {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushDesignOverlaysToSupabase(ownerSettingsRowId);
  }, 150);
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

  try {
    await storage.syncUniversalStyleToSupabase(merged, ownerSettingsRowId, {
      skipOverlayCollect: true,
    });
  } catch (error) {
    console.warn("[DesignOverlays] sync failed:", error);
  }
}
