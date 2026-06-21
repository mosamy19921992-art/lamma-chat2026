import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface NewRoomDetails {
  name: string;
  password: string;
}

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: NewRoomDetails) => void | Promise<void>;
  passwordRequired?: boolean;
  quotaRemaining?: number;
  quotaTotal?: number;
  isUnlimited?: boolean;
  creating?: boolean;
}

const EMPTY_DETAILS: NewRoomDetails = { name: "", password: "" };

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreate,
  passwordRequired = false,
  quotaRemaining = 0,
  quotaTotal = 0,
  isUnlimited = false,
  creating = false,
}: CreateRoomModalProps) {
  const [details, setDetails] = useState<NewRoomDetails>(EMPTY_DETAILS);

  useEffect(() => {
    if (!isOpen) setDetails(EMPTY_DETAILS);
  }, [isOpen]);

  const handleClose = () => {
    if (creating) return;
    setDetails(EMPTY_DETAILS);
    onClose();
  };

  const handleCreate = () => {
    void onCreate(details);
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
            <h2 className="text-sm font-black text-white">
              إنشاء غرفة خاصة جديدة
            </h2>
            {isUnlimited ? (
              <p className="text-[10px] text-lime-300/90 font-bold">
                لديك صلاحية غير محدودة لإنشاء الغرف.
              </p>
            ) : (
              <p className="text-[10px] text-yellow-300/90 font-bold">
                المتبقي من حصتك: {quotaRemaining} / {quotaTotal} غرف
              </p>
            )}
            <input
              type="text"
              id="createRoomName"
              name="createRoomName"
              autoComplete="off"
              placeholder="اسم الغرفة"
              value={details.name}
              disabled={creating}
              onChange={(e) =>
                setDetails((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full p-3 rounded-xl text-white text-xs lamma-input-shell"
            />
            <input
              type="password"
              id="createRoomPassword"
              name="createRoomPassword"
              autoComplete="new-password"
              placeholder={
                passwordRequired
                  ? "كلمة مرور الغرفة (4 أحرف على الأقل)"
                  : "كلمة مرور الغرفة (اختياري للمالك/الأدمن)"
              }
              value={details.password}
              disabled={creating}
              onChange={(e) =>
                setDetails((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full p-3 rounded-xl text-white text-xs lamma-input-shell"
            />
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
              {passwordRequired
                ? "الغرف التي ينشئها الأعضاء يجب أن تكون مقفولة بكلمة مرور. شارك كلمة المرور مع من تريد دعوتهم."
                : "يمكنك ترك كلمة المرور فارغة لغرفة مفتوحة، أو وضع كلمة مرور لحماية الدخول."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={creating}
                className="flex-1 p-2 rounded-xl text-red-400 text-xs font-bold lamma-danger-btn"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 p-2 rounded-xl text-xs font-bold lamma-feature-primary disabled:opacity-60"
              >
                {creating ? "جاري الإنشاء…" : "إنشاء"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CreateRoomModal;
