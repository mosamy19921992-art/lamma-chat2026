// CreateRoomModal — lets admins / owners create a new private room.
// Extracted from ChatScreen.tsx — pure refactor, no behavior change.

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface NewRoomDetails {
  name: string;
  password: string;
}

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: NewRoomDetails) => void;
}

const EMPTY_DETAILS: NewRoomDetails = { name: "", password: "" };

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreate,
}: CreateRoomModalProps) {
  const [details, setDetails] = useState<NewRoomDetails>(EMPTY_DETAILS);

  const handleClose = () => {
    setDetails(EMPTY_DETAILS);
    onClose();
  };

  const handleCreate = () => {
    onCreate(details);
    setDetails(EMPTY_DETAILS);
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
          <div className="bg-[#0a0f0c] p-6 rounded-3xl border border-green-500/30 w-full max-w-sm space-y-4 shadow-2xl">
            <h2 className="text-sm font-black text-white">
              إنشاء غرفة خاصة جديدة
            </h2>
            <input
              type="text"
              id="createRoomName"
              name="createRoomName"
              autoComplete="off"
              placeholder="اسم الغرفة"
              value={details.name}
              onChange={(e) =>
                setDetails((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full p-3 rounded-xl bg-black border border-white/10 text-white text-xs"
            />
            <input
              type="password"
              id="createRoomPassword"
              name="createRoomPassword"
              autoComplete="off"
              placeholder="كلمة المرور (اختياري)"
              value={details.password}
              onChange={(e) =>
                setDetails((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full p-3 rounded-xl bg-black border border-white/10 text-white text-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 p-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 p-2 rounded-xl bg-green-500 text-black text-xs font-bold"
              >
                إنشاء
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CreateRoomModal;
