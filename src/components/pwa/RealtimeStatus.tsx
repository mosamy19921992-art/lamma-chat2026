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
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed top-16 inset-x-4 sm:top-[4.5rem] sm:right-1/2 sm:translate-x-1/2 sm:w-fit z-[9997]"
          role="status"
        >
          <div className="px-4 py-2.5 rounded-2xl flex items-center gap-2.5 lamma-status-offline border border-amber-500/30">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Radio size={16} className="text-amber-400" />
            </motion.div>
            <span className="text-xs font-black text-amber-200">
              جاري إعادة الاتصال بالشات المباشر…
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RealtimeStatus;
