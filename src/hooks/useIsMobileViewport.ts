import { useEffect, useState } from "react";

function detectMobileViewport(maxWidth = 767): boolean {
  if (typeof window === "undefined") return false;

  const narrow = window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return narrow || ((standalone || iosStandalone) && coarsePointer);
}

export function useIsMobileViewport(maxWidth = 767) {
  const [isMobile, setIsMobile] = useState(() => detectMobileViewport(maxWidth));

  useEffect(() => {
    const queries = [
      `(max-width: ${maxWidth}px)`,
      "(display-mode: standalone)",
      "(pointer: coarse)",
    ].map((q) => window.matchMedia(q));

    const update = () => setIsMobile(detectMobileViewport(maxWidth));
    update();

    queries.forEach((mq) => mq.addEventListener("change", update));
    window.addEventListener("orientationchange", update);
    return () => {
      queries.forEach((mq) => mq.removeEventListener("change", update));
      window.removeEventListener("orientationchange", update);
    };
  }, [maxWidth]);

  return isMobile;
}
