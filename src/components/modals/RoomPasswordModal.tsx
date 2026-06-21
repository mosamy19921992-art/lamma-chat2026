import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock } from "lucide-react";

export interface RoomPasswordModalProps {
  isOpen: boolean;
  roomName: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean>;
}

export function RoomPasswordModal({
  isOpen,
  roomName,
  onClose,
  onSubmit,
}: RoomPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError("أدخل كلمة المرور.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ok = await onSubmit(password);
      if (ok) {
        setPassword("");
        onClose();
      } else {
        setError("كلمة المرور غير صحيحة.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
        >
          <div className="p-6 rounded-3xl w-full max-w-sm space-y-4 lamma-modal-shell">
            <div className="flex items-center gap-2 text-white">
              <Lock size={18} className="text-yellow-300" />
              <h2 className="text-sm font-black">غرفة مقفولة 🔒</h2>
            </div>
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
              الغرفة «{roomName}» محمية بكلمة مرور. أدخل كلمة المرور للدخول.
            </p>
            <input
              type="password"
              id="roomPasswordInput"
              name="roomPasswordInput"
              autoComplete="off"
              placeholder="كلمة مرور الغرفة"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
              }}
              className="w-full p-3 rounded-xl text-white text-xs lamma-input-shell"
            />
            {error && (
              <p className="text-[10px] text-red-400 font-bold">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 p-2 rounded-xl text-red-400 text-xs font-bold lamma-danger-btn"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={loading}
                className="flex-1 p-2 rounded-xl text-xs font-bold lamma-feature-primary"
              >
                {loading ? "جاري التحقق…" : "دخول"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RoomPasswordModal;
