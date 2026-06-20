import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  icon,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="md:hidden fixed inset-0 z-[9999]"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 w-full h-full cursor-default"
            onClick={onClose}
            aria-label="إغلاق"
          />
          <motion.div
            initial={{ y: 520 }}
            animate={{ y: 0 }}
            exit={{ y: 520 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] min-h-0 flex-col overflow-hidden rounded-t-3xl lamma-sheet-shell bg-[#0a0a0a]"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-3 lamma-sheet-header border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="font-black text-white text-sm">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer bg-white/5 hover:bg-red-500/20"
                aria-label="إغلاق"
              >
                <X size={14} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
