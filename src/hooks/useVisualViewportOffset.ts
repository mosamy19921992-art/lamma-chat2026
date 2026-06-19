import { useEffect, useState } from "react";

/** Offset (px) when the on-screen keyboard shrinks visualViewport — mobile composer lift. */
export function useVisualViewportOffset(enabled = true) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const layoutHeight = window.innerHeight;
      const visualHeight = vv.height;
      const top = Math.max(0, vv.offsetTop);
      const raw = Math.max(0, layoutHeight - visualHeight - top);
      const keyboardLikelyOpen =
        visualHeight > 0 && visualHeight < layoutHeight * 0.78;
      setKeyboardOffset(
        keyboardLikelyOpen && raw > 80 ? Math.min(Math.round(raw), layoutHeight * 0.55) : 0,
      );
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [enabled]);

  return keyboardOffset;
}
