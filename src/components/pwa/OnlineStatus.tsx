// OnlineStatus — a tiny, non-intrusive pill that appears at the top
// of the app when the user goes offline and disappears when they
// come back. Slides in from above; auto-dismisses after 3s on reconnection.

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, WifiOff } from "lucide-react";

interface OnlineStatusProps {
  isOnline: boolean;
}

export function OnlineStatus({ isOnline }: OnlineStatusProps) {
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed top-3 inset-x-3 sm:top-6 sm:right-1/2 sm:translate-x-1/2 sm:w-fit z-[9998]"
          role="status"
          aria-live="polite"
        >
          <div className="px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 lamma-status-offline">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              aria-hidden
            >
              <WifiOff size={16} className="text-red-400" />
            </motion.div>
            <div className="min-w-0">
              <span className="block text-xs font-black text-red-300">
                اتصالك توقف مؤقتاً
              </span>
              <span className="block text-[10px] font-bold text-red-200/80">
                الرسائل هتكمل أول ما الشبكة ترجع.
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed top-3 inset-x-3 sm:top-6 sm:right-1/2 sm:translate-x-1/2 sm:w-fit z-[9998]"
          role="status"
          aria-live="polite"
        >
          <div className="px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 lamma-status-online">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 18, stiffness: 260 }}
              aria-hidden
            >
              <Wifi size={16} className="text-emerald-400" />
            </motion.div>
            <div className="min-w-0">
              <span className="block text-xs font-black text-emerald-300">
                رجع الاتصال
              </span>
              <span className="block text-[10px] font-bold text-emerald-200/80">
                الشات رجع يتزامن بشكل طبيعي.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnlineStatus;
