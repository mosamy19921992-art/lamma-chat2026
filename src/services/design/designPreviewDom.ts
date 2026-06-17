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
