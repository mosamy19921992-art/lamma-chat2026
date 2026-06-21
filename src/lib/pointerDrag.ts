/** Window-level pointer drag with guaranteed listener cleanup. */
export function attachWindowPointerDrag(
  onMove: (event: PointerEvent) => void,
  onEnd?: () => void,
): () => void {
  const end = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    onEnd?.();
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);

  return end;
}
