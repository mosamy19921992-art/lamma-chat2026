// InstallPrompt — Beautiful, glassmorphism install banner for the PWA.
// Auto-shows once per session when the browser fires beforeinstallprompt.
// User can dismiss; we won't pester them again this session.

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Smartphone, Zap, Bell } from "lucide-react";

const STORAGE_KEY = "lamma_install_dismissed_until";
const DISMISS_DAYS = 7;

interface InstallPromptProps {
  installPromptEvent: any | null;
  isInstalled: boolean;
  onInstall: () => Promise<void>;
}

export function InstallPrompt({
  installPromptEvent,
  isInstalled,
  onInstall,
}: InstallPromptProps) {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInstalled) return;
    if (!installPromptEvent) return;

    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    if (
      dismissedUntil &&
      Date.now() < parseInt(dismissedUntil, 10)
    ) {
      return;
    }
    // Slight delay so the page is interactive before we show the prompt.
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [installPromptEvent, isInstalled]);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(until));
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {visible && installPromptEvent && (
        <>
          {/* Backdrop on mobile only — full-screen modal look */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998] sm:hidden"
            aria-hidden
          />
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:bottom-6 sm:top-auto sm:left-auto sm:translate-x-0 sm:translate-y-0 sm:end-6 mx-4 sm:mx-0 sm:w-[420px] z-[9999] w-[calc(100%-2rem)]"
          role="dialog"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-3xl lamma-pwa-card">
            {/* Decorative gradient orbs */}
            <div
              className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none"
              aria-hidden
            />
            <div
              className="absolute -bottom-12 -left-12 w-32 h-32 bg-lime-400/20 rounded-full blur-3xl pointer-events-none"
              aria-hidden
            />

            <div className="relative p-5">
              {/* Close */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 end-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors lamma-soft-action"
                aria-label="إغلاق"
              >
                <X size={14} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg lamma-feature-primary"
                >
                  <Smartphone size={22} className="text-white" />
                </motion.div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    ثبّت تطبيق شات لمة
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-bold">
                    بنبعتلك إشعارات الرسائل الفورية ⚡
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-gray-300 leading-relaxed mb-4">
                ثبّت التطبيق على موبايلك عشان يفتح في ثانية واحدة، يشتغل
                أوفلاين، ويوصلك كل رسالة حتى لو الشات مقفول.
              </p>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold flex items-center gap-1 lamma-role-chip lamma-role-vip">
                  <Zap size={9} /> سرعة فائقة
                </span>
                <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold flex items-center gap-1 lamma-role-chip lamma-role-vip">
                  <Bell size={9} /> إشعارات لحظية
                </span>
                <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold flex items-center gap-1 lamma-role-chip lamma-role-vip">
                  📡 أوفلاين
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white text-xs font-black transition-all active:scale-95 disabled:opacity-50 lamma-feature-primary"
                >
                  {installing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري التثبيت...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      ثبّت مجاناً
                    </>
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-2xl text-gray-300 text-xs font-bold transition-all lamma-soft-action"
                >
                  ليس الآن
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default InstallPrompt;
