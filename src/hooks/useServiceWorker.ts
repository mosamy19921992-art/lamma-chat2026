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

    const bindRegistrationEvents = (registration: ServiceWorkerRegistration) => {
      if (!mounted) return;

      if (registration.waiting) {
        setNeedRefresh(true);
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
            return;
          }

          setOfflineReady(true);
        });
      });
    };

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (!mounted) return;

        bindRegistrationEvents(registration);
        await registration.update().catch(() => {});
      } catch (err) {
        console.warn("[SW] Registration failed:", err);
      }
    };

    // Listen for the native install prompt.
    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };
    const handleAppInstalled = () => {
      updateInstalledState();
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

    // Online / offline tracking.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    updateInstalledState();
    void registerServiceWorker();

    return () => {
      mounted = false;
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
