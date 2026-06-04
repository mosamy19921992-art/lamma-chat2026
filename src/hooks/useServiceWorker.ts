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

const SW_URL = "/sw.js";

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

    // Register the service worker.
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((registration) => {
        // Listen for a waiting worker (an update is available).
        if (registration.waiting) {
          setNeedRefresh(true);
        }
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setNeedRefresh(true);
            }
            if (newWorker.state === "activated") {
              setOfflineReady(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });

    // Listen for controller changes (after skipWaiting).
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
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
