// useServiceWorker — registers the service worker, exposes
// install / update state to the React tree, and is safe to call
// even when the browser doesn't support service workers.
//
// Exposes:
//   - needRefresh: true when a new SW is waiting (the page should reload)
//   - offlineReady: true once the SW has cached the shell successfully
//   - update: tells the SW to skip waiting
//   - installPromptEvent: the native beforeinstallprompt event, if any

import { useEffect, useState, useCallback, useRef } from "react";

export const PWA_ENABLED = import.meta.env.VITE_ENABLE_PWA === "true";
const ENABLE_PWA = PWA_ENABLED;
const CACHE_PREFIXES = ["lamma-"];
const VERSION_TOKEN = "178243140065";

interface ServiceWorkerState {
  needRefresh: boolean;
  offlineReady: boolean;
  installPromptEvent: any | null;
  isInstalled: boolean;
  isPwaEnabled: boolean;
  update: () => Promise<void>;
  promptInstall: () => Promise<boolean>;
  isOnline: boolean;
}

async function clearLammaCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .map((key) => caches.delete(key)),
  );
}

async function unregisterAllServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export function useServiceWorker(): ServiceWorkerState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any | null>(null);
  const installPromptRef = useRef<any | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;
    let hasRefreshedForUpdate = false;

    const updateInstalledState = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
        window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (mounted) {
        setIsInstalled(Boolean(standalone));
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const bindRegistrationEvents = (registration: ServiceWorkerRegistration) => {
      if (!mounted) return;

      if (registration.waiting) {
        setNeedRefresh(true);
        const standalone =
          typeof window !== "undefined" &&
          (window.matchMedia?.("(display-mode: standalone)")?.matches ||
            (window.navigator as Navigator & { standalone?: boolean })
              .standalone === true);
        if (standalone) {
          registration.waiting.postMessage("SKIP_WAITING");
        }
      }

      if (registration.active) {
        setOfflineReady(true);
      }

      registration.addEventListener("updatefound", () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;

        nextWorker.addEventListener("statechange", () => {
          if (!mounted || nextWorker.state !== "installed") return;

          if (navigator.serviceWorker.controller) {
            setNeedRefresh(true);
            const standalone =
              window.matchMedia?.("(display-mode: standalone)")?.matches ||
              (window.navigator as Navigator & { standalone?: boolean })
                .standalone === true;
            if (standalone && registration.waiting) {
              registration.waiting.postMessage("SKIP_WAITING");
            }
            return;
          }

          setOfflineReady(true);
        });
      });
    };

    const disableServiceWorker = async () => {
      try {
        await unregisterAllServiceWorkers();
        await clearLammaCaches();
      } catch (err) {
        console.warn("[SW] Cleanup failed:", err);
      } finally {
        if (mounted) {
          setNeedRefresh(false);
          setOfflineReady(false);
          installPromptRef.current = null;
          setInstallPromptEvent(null);
          updateInstalledState();
        }
      }
    };

    let unregisterSwListeners: (() => void) | undefined;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${VERSION_TOKEN}`,
        );
        if (!mounted) return;

        bindRegistrationEvents(registration);
        await registration.update().catch(() => {});

        const refreshRegistration = () => {
          registration.update().catch(() => {});
        };
        const intervalId = window.setInterval(refreshRegistration, 5 * 60 * 1000);
        const handleVisibility = () => {
          if (document.visibilityState === "visible") {
            refreshRegistration();
          }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        unregisterSwListeners = () => {
          window.clearInterval(intervalId);
          document.removeEventListener("visibilitychange", handleVisibility);
        };
      } catch (err) {
        console.warn("[SW] Registration failed:", err);
      }
    };

    updateInstalledState();

    if (!("serviceWorker" in navigator) || !ENABLE_PWA) {
      void disableServiceWorker();
      return () => {
        mounted = false;
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // Listen for the native install prompt only when PWA mode is enabled.
    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      installPromptRef.current = event;
      setInstallPromptEvent(event);
    };
    const handleAppInstalled = () => {
      updateInstalledState();
      installPromptRef.current = null;
      setInstallPromptEvent(null);
    };
    const handleControllerChange = () => {
      if (hasRefreshedForUpdate) return;
      hasRefreshedForUpdate = true;
      window.location.reload();
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void registerServiceWorker();

    return () => {
      mounted = false;
      unregisterSwListeners?.();
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const update = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      setNeedRefresh(false);
      registration.waiting.postMessage("SKIP_WAITING");
    }
  }, []);

  const promptInstall = useCallback(async () => {
    const waitForPrompt = async (timeoutMs: number) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const event = installPromptRef.current;
        if (event) return event;
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      return installPromptRef.current;
    };

    const event = installPromptRef.current ?? (await waitForPrompt(3200));
    if (!event) return false;

    event.prompt();
    try {
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        return true;
      }
    } catch (err) {
      console.warn("[Install] prompt failed:", err);
    } finally {
      installPromptRef.current = null;
      setInstallPromptEvent(null);
    }
    return false;
  }, []);

  return {
    needRefresh,
    offlineReady,
    installPromptEvent,
    isInstalled,
    isPwaEnabled: ENABLE_PWA,
    update,
    promptInstall,
    isOnline,
  };
}

export default useServiceWorker;
