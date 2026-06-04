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
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed top-4 inset-x-4 sm:top-6 sm:right-1/2 sm:translate-x-1/2 sm:w-fit z-[9998]"
          role="status"
        >
          <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 backdrop-blur-xl shadow-lg shadow-red-500/20 flex items-center gap-2.5">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <WifiOff size={16} className="text-red-400" />
            </motion.div>
            <span className="text-xs font-black text-red-300">
              فقدنا الاتصال بالإنترنت
            </span>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed top-4 inset-x-4 sm:top-6 sm:right-1/2 sm:translate-x-1/2 sm:w-fit z-[9998]"
          role="status"
        >
          <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 border border-emerald-500/40 backdrop-blur-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2.5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Wifi size={16} className="text-emerald-400" />
            </motion.div>
            <span className="text-xs font-black text-emerald-300">
              رجع الاتصال! 🎉
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnlineStatus;
