const BUILD_KEY = "lamma_app_build_id";

export async function purgeLegacyAppCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("lamma-"))
          .map((key) => caches.delete(key)),
      );
    }
  } catch (error) {
    console.warn("[appCache] Failed to purge legacy caches:", error);
  }
}

/** Reload once when a new production build is detected (clears stale JS chunks). */
export async function ensureFreshAppBuild(): Promise<void> {
  if (typeof window === "undefined") return;

  const buildId = __APP_BUILD_ID__;
  const previousBuildId = localStorage.getItem(BUILD_KEY);

  if (previousBuildId === buildId) return;

  localStorage.setItem(BUILD_KEY, buildId);

  if (!previousBuildId) return;

  await purgeLegacyAppCaches();
  window.location.reload();
}
