import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Radio } from "lucide-react";

interface RealtimeStatusProps {
  realtimeConnected: boolean;
}

/** Shown when HTTP works but Supabase Realtime channel is reconnecting. */
export function RealtimeStatus({ realtimeConnected }: RealtimeStatusProps) {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const show = isOnline && !realtimeConnected;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed top-16 inset-x-3 sm:top-[4.5rem] sm:right-1/2 sm:translate-x-1/2 sm:w-fit z-[9997]"
          role="status"
          aria-live="polite"
        >
          <div className="px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 lamma-status-offline border border-amber-500/30">
            <motion.div
              animate={{ opacity: [1, 0.45, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              aria-hidden
            >
              <Radio size={16} className="text-amber-400" />
            </motion.div>
            <div className="min-w-0">
              <span className="block text-xs font-black text-amber-200">
                بنعيد الاتصال بالشات
              </span>
              <span className="block text-[10px] font-bold text-amber-100/80">
                الرسائل الجديدة هتظهر تلقائياً بعد لحظات.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RealtimeStatus;
