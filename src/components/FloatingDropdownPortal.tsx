import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface FloatingDropdownPortalProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
  placement?: "below" | "above";
}

export function FloatingDropdownPortal({
  open,
  anchorRef,
  children,
  className = "",
  align = "start",
  placement = "below",
}: FloatingDropdownPortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const gap = 8;

      if (placement === "above") {
        setStyle({
          position: "fixed",
          bottom: window.innerHeight - rect.top + gap,
          left: align === "end" ? undefined : rect.left,
          right:
            align === "end" ? Math.max(8, window.innerWidth - rect.right) : undefined,
          zIndex: 10050,
          visibility: "visible",
        });
        return;
      }

      setStyle({
        position: "fixed",
        top: rect.bottom + gap,
        left: align === "end" ? undefined : rect.left,
        right:
          align === "end" ? Math.max(8, window.innerWidth - rect.right) : undefined,
        zIndex: 10050,
        visibility: "visible",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, open, placement]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: placement === "above" ? 6 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: placement === "above" ? 6 : -6 }}
          transition={{ duration: 0.14 }}
          style={style}
          className={`lamma-floating-dropdown ${className}`.trim()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
