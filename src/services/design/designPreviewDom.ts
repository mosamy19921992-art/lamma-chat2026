export function setDesignPreviewActive(active: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.querySelector(".lamma-neutral-glass") as HTMLElement | null;
  if (!root) return;
  if (active) {
    root.dataset.designPreview = "true";
  } else {
    delete root.dataset.designPreview;
  }
}

export function isDesignPreviewActive(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.querySelector(".lamma-neutral-glass")?.getAttribute("data-design-preview") ===
    "true"
  );
}

/** Verify universal-style preview/commit actually reached the DOM shell. */
export function readUniversalStyleDomState(): {
  shellReady: boolean;
  preview: boolean;
  accent: string;
  glassBlur: string;
  glassOpacity: string;
} | null {
  if (typeof document === "undefined") return null;
  const root = document.querySelector(".lamma-neutral-glass") as HTMLElement | null;
  if (!root) return null;
  const style = getComputedStyle(root);
  return {
    shellReady: root.getAttribute("data-universal-style") === "active",
    preview: root.getAttribute("data-universal-style-preview") === "true",
    accent: style.getPropertyValue("--us-accent").trim(),
    glassBlur: style.getPropertyValue("--us-glass-blur").trim(),
    glassOpacity: style.getPropertyValue("--us-glass-opacity").trim(),
  };
}
