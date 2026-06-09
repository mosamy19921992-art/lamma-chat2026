// useServiceWorker — registers the service worker, exposes
// install / update state to the React tree, and is safe to call
// even when the browser doesn't support service workers.
//
// Exposes:
//   - needRefresh: true when a new SW is waiting (the page should reload)
//   - offlineReady: true once the SW has cached the shell successfully
//   - update: tells the SW to skip waiting
//   - installPromptEvent: the native beforeinstallprompt event, if any

import { useEffect, useState, useCallback } from "react";

interface ServiceWorkerState {
  needRefresh: boolean;
  offlineReady: boolean;
  installPromptEvent: any | null;
  isInstalled: boolean;
  update: () => Promise<void>;
  promptInstall: () => Promise<void>;
  isOnline: boolean;
}

const SW_RESET_KEY = "lamma_sw_reset_v1";

export function useServiceWorker(): ServiceWorkerState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        const hadRegistrations = registrations.length > 0;

        await Promise.all(
          registrations.map(async (registration) => {
            try {
              registration.active?.postMessage("CLEAR_CACHES");
            } catch {
              // Ignore stale worker messaging failures.
            }
            await registration.unregister();
          }),
        );

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }

        // Reload once after clearing old workers/caches so the app boots
        // from the network instead of a stale shell.
        if (hadRegistrations && !sessionStorage.getItem(SW_RESET_KEY)) {
          sessionStorage.setItem(SW_RESET_KEY, "true");
          const url = new URL(window.location.href);
          url.searchParams.set("cache_reset", Date.now().toString());
          window.location.replace(url.toString());
          return;
        }

        // Clean up the cache_reset param left over from the redirect above.
        if (window.location.search.includes("cache_reset")) {
          const clean = new URL(window.location.href);
          clean.searchParams.delete("cache_reset");
          window.history.replaceState(null, "", clean.toString());
        }

        setNeedRefresh(false);
        setOfflineReady(false);
      })
      .catch((err) => {
        console.warn("[SW] Reset failed:", err);
      });

    // Listen for the native install prompt.
    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Online / offline tracking.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const update = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage("SKIP_WAITING");
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    try {
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (err) {
      console.warn("[Install] prompt failed:", err);
    } finally {
      setInstallPromptEvent(null);
    }
  }, [installPromptEvent]);

  return {
    needRefresh,
    offlineReady,
    installPromptEvent,
    isInstalled,
    update,
    promptInstall,
    isOnline,
  };
}

export default useServiceWorker;
