// UpdateBanner — shows a graceful banner when the service worker
// has downloaded a new version. User can reload immediately or later.

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Sparkles, X } from "lucide-react";

interface UpdateBannerProps {
  needRefresh: boolean;
  onUpdate: () => Promise<void>;
}

export function UpdateBanner({
  needRefresh,
  onUpdate,
}: UpdateBannerProps) {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      const t = setTimeout(() => setShowUpdate(true), 300);
      return () => clearTimeout(t);
    }
    setShowUpdate(false);
  }, [needRefresh]);

  const handleUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdate();
    } finally {
      setShowUpdate(false);
      setIsUpdating(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showUpdate && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="fixed top-3 inset-x-3 sm:top-6 sm:right-6 sm:left-auto sm:w-[380px] z-[9999]"
            role="alert"
            aria-live="polite"
          >
            <div className="relative overflow-hidden rounded-2xl lamma-pwa-card">
              <div
                className="absolute -top-8 -right-8 w-20 h-20 bg-emerald-500/24 rounded-full blur-2xl"
                aria-hidden
              />
              <div className="relative p-3.5 flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0.92 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 18, stiffness: 260 }}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg lamma-feature-primary"
                >
                  <Sparkles size={16} className="text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-white mb-0.5">
                    تحديث جديد جاهز لشات لمة
                  </h3>
                  <p className="text-[10.5px] text-gray-300 leading-relaxed">
                    التحديث سريع ويحافظ على جلستك. اختار الوقت المناسب لك.
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => void handleUpdate()}
                      disabled={isUpdating}
                      className="px-3 py-1.5 rounded-xl text-white text-[11px] font-black flex items-center gap-1.5 transition-all disabled:opacity-70 disabled:cursor-wait lamma-feature-primary"
                    >
                      <RefreshCw size={11} className={isUpdating ? "animate-spin" : ""} />
                      {isUpdating ? "جاري التحديث..." : "تحديث الآن"}
                    </button>
                    <button
                      onClick={() => setShowUpdate(false)}
                      className="px-3 py-1.5 rounded-xl text-gray-300 text-[11px] font-bold lamma-soft-action"
                      disabled={isUpdating}
                    >
                      لاحقاً
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdate(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-white lamma-soft-action"
                  aria-label="إغلاق"
                  disabled={isUpdating}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default UpdateBanner;
