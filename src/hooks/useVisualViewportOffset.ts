import { useEffect, useState } from "react";

export type VisualViewportLayout = {
  /** Legacy margin lift — space eaten by keyboard from layout bottom. */
  keyboardOffset: number;
  keyboardOpen: boolean;
  /** When keyboard is open, shrink the app shell to the visible viewport. */
  shellHeight: number | null;
  shellTop: number;
};

const DEFAULT_LAYOUT: VisualViewportLayout = {
  keyboardOffset: 0,
  keyboardOpen: false,
  shellHeight: null,
  shellTop: 0,
};

/** Tracks visualViewport so mobile composer + chat stay visible when keyboard opens. */
export function useVisualViewportLayout(enabled = true): VisualViewportLayout {
  const [layout, setLayout] = useState<VisualViewportLayout>(DEFAULT_LAYOUT);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setLayout(DEFAULT_LAYOUT);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const layoutHeight = window.innerHeight;
      const visualHeight = vv.height;
      const top = Math.max(0, vv.offsetTop);
      const insetBottom = Math.max(0, layoutHeight - visualHeight - top);
      const ae = document.activeElement;
      const composerFocused =
        ae instanceof HTMLElement &&
        (ae.id === "messageInput" ||
          ae.id === "pmInputText" ||
          ae.tagName === "TEXTAREA" ||
          (ae.tagName === "INPUT" &&
            ["text", "search", "email", "password"].includes(
              (ae as HTMLInputElement).type,
            )));
      const keyboardLikelyOpen =
        composerFocused &&
        visualHeight > 0 &&
        visualHeight < layoutHeight * 0.78 &&
        insetBottom > 80;

      if (!keyboardLikelyOpen) {
        setLayout(DEFAULT_LAYOUT);
        return;
      }

      setLayout({
        keyboardOffset: Math.min(Math.round(insetBottom), layoutHeight * 0.55),
        keyboardOpen: true,
        shellHeight: Math.round(visualHeight),
        shellTop: Math.round(top),
      });
    };

    let raf = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    scheduleUpdate();
    vv.addEventListener("resize", scheduleUpdate);
    vv.addEventListener("scroll", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("focusin", scheduleUpdate);
    document.addEventListener("focusout", scheduleUpdate);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", scheduleUpdate);
      vv.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("focusin", scheduleUpdate);
      document.removeEventListener("focusout", scheduleUpdate);
    };
  }, [enabled]);

  return layout;
}

/** @deprecated Prefer useVisualViewportLayout — kept for docs/back-compat. */
export function useVisualViewportOffset(enabled = true): number {
  return useVisualViewportLayout(enabled).keyboardOffset;
}
