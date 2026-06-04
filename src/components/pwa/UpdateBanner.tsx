// UpdateBanner — shows a graceful banner when the service worker
// has downloaded a new version. User can reload immediately or later.

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Sparkles, X } from "lucide-react";

interface UpdateBannerProps {
  needRefresh: boolean;
  offlineReady: boolean;
  onUpdate: () => Promise<void>;
}

export function UpdateBanner({
  needRefresh,
  offlineReady,
  onUpdate,
}: UpdateBannerProps) {
  const [showUpdate, setShowUpdate] = useState(false);
  const [showOfflineReady, setShowOfflineReady] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      const t = setTimeout(() => setShowUpdate(true), 1500);
      return () => clearTimeout(t);
    }
  }, [needRefresh]);

  useEffect(() => {
    if (offlineReady && !showOfflineReady) {
      const t = setTimeout(() => setShowOfflineReady(true), 3000);
      return () => clearTimeout(t);
    }
  }, [offlineReady, showOfflineReady]);

  return (
    <>
      <AnimatePresence>
        {showUpdate && (
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ type: "spring", damping: 20, stiffness: 240 }}
            className="fixed top-4 inset-x-4 sm:top-6 sm:right-6 sm:left-auto sm:w-[400px] z-[9999]"
            role="alert"
          >
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-[#0a1a10]/95 to-[#0a0f0c]/95 backdrop-blur-2xl shadow-2xl shadow-emerald-500/20">
              <div
                className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/30 rounded-full blur-2xl"
                aria-hidden
              />
              <div className="relative p-4 flex items-start gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30"
                >
                  <Sparkles size={18} className="text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-white mb-0.5">
                    في نسخة جديدة من شات لمة! ✨
                  </h3>
                  <p className="text-[10.5px] text-gray-300 leading-relaxed">
                    بنحسّن الأداء ونضيف ميزات. حدّث دلوقتي عشان تستمتع بالتجربة
                    الأحسن.
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => {
                        setShowUpdate(false);
                        onUpdate();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-black flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw size={11} />
                      حدّث دلوقتي
                    </button>
                    <button
                      onClick={() => setShowUpdate(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold"
                    >
                      بعدين
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdate(false)}
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                  aria-label="إغلاق"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOfflineReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ delay: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]"
          >
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-xl shadow-lg flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="text-base"
              >
                ✅
              </motion.span>
              التطبيق جاهز يشتغل أوفلاين
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default UpdateBanner;
