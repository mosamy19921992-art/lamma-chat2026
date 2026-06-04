// ThemeFab — small floating button (bottom-left) that opens the
// theme settings modal. Uses the active theme's primary color so it
// blends with whatever the user picks.

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Palette } from "lucide-react";
import ThemeSettings from "./ThemeSettings";
import { useTheme } from "../../hooks/useTheme";

export function ThemeFab() {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl cursor-pointer ring-2 ring-white/20"
        style={{
          zIndex: 2147483647,
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
          boxShadow: `0 8px 32px rgba(${theme.palette.primaryRgb}, 0.5), 0 0 0 4px rgba(${theme.palette.primaryRgb}, 0.15)`,
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 220 }}
        whileHover={{ scale: 1.1, rotate: 8 }}
        whileTap={{ scale: 0.92 }}
        aria-label="تخصيص الثيم"
        title="🎨 غيّر ثيم التطبيق"
      >
        <Palette size={22} />
      </motion.button>

      <ThemeSettings isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default ThemeFab;
