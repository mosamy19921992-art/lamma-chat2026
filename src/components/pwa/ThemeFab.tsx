// ThemeFab — small floating button (bottom-left) that opens the
// theme settings modal. Uses the active theme's primary color so it
// blends with whatever the user picks.

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Palette } from "lucide-react";
import ThemeSettings from "./ThemeSettings";
import { useTheme } from "../../hooks/useTheme";

interface ThemeFabProps {
  inChat?: boolean;
}

export function ThemeFab({ inChat = false }: ThemeFabProps) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className={`fixed flex items-center justify-center text-white shadow-2xl cursor-pointer ring-2 ring-white/14 ${
          inChat
            ? "bottom-28 sm:bottom-5 left-3 sm:left-5 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl"
            : "bottom-5 left-5 w-14 h-14 rounded-2xl"
        }`}
        style={{
          zIndex: 2147483647,
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
          boxShadow: inChat
            ? `0 8px 24px rgba(${theme.palette.primaryRgb}, 0.34), 0 0 0 4px rgba(${theme.palette.primaryRgb}, 0.10)`
            : `0 8px 32px rgba(${theme.palette.primaryRgb}, 0.5), 0 0 0 4px rgba(${theme.palette.primaryRgb}, 0.15)`,
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 220 }}
        whileHover={{ scale: inChat ? 1.06 : 1.1, rotate: inChat ? 4 : 8 }}
        whileTap={{ scale: 0.92 }}
        aria-label="تخصيص الثيم"
        title="🎨 غيّر ثيم التطبيق"
      >
        <Palette size={inChat ? 18 : 22} />
      </motion.button>

      <ThemeSettings isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default ThemeFab;
