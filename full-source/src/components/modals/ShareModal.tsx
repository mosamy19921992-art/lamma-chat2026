// ShareModal — lets the user copy the chat link or scan a QR code.
// Extracted from ChatScreen.tsx — pure refactor, no behavior change.

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLink: string;
}

export function ShareModal({ isOpen, onClose, appLink }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } else {
        throw new Error("fallback prompt");
      }
    } catch (err) {
      prompt("يرجى نسخ الرابط يدوياً من المربع أدناه:", text);
    }
  };

  const handleCopy = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(appLink)
          .then(() => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 3000);
          })
          .catch(() => fallbackCopy(appLink));
      } else {
        fallbackCopy(appLink);
      }
    } catch (err) {
      fallbackCopy(appLink);
    }
  };

  const handleClose = () => {
    setCopiedLink(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-md rounded-[28px] p-6 text-right relative my-8 lamma-modal-shell"
          >
            <div className="flex items-center justify-between pb-4 mb-4 lamma-modal-header -mx-6 px-6 pt-0">
              <div className="flex items-center gap-2">
                <span className="lamma-icon-dot" />
                <h3 className="text-base font-black text-white">
                  طريقة الدخول ومشاركة شات لمة 💚
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition-all cursor-pointer lamma-soft-action"
              >
                إغلاق
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                💡{" "}
                <strong className="text-green-400 font-black">
                  ليه شات لمة مش بيظهر بالبحث على جوجل؟
                </strong>
                <br />
                شات لمة بيشتغل بخصوصية تامة ومشفر لتوفير غرف آمنة وسريعة لك
                ولأصدقائك. محركات البحث مثل جوجل لا تقوم بأرشفة هذه الروابط
                لحماية خصوصيتك وسرية غرفتك من الغرباء أو المتسللين.
              </p>

              <div className="p-3 rounded-xl lamma-section-card">
                <label
                  htmlFor="share-modal-app-link-input"
                  className="block text-[10px] text-gray-400 font-bold mb-1.5"
                >
                  رابط الدخول المباشر للغرفة:
                </label>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={handleCopy}
                    className={`px-4 py-2.5 rounded-lg font-black text-xs transition-all flex-shrink-0 cursor-pointer ${
                      copiedLink
                        ? "lamma-feature-primary"
                        : "lamma-feature-primary"
                    }`}
                  >
                    {copiedLink ? "✅ تم النسخ!" : "إنسخ الرابط"}
                  </button>
                  <input
                    id="share-modal-app-link-input"
                    type="text"
                    readOnly
                    value={appLink}
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select();
                    }}
                    className="w-full rounded-lg p-2 text-center text-xs text-gray-200 font-mono select-all focus:outline-none lamma-input-shell"
                  />
                </div>
                <span className="block text-[9px] text-gray-500 mt-1.5">
                  💡 تلميح: لو كبس الزرار مش مدعوم في متصفحك بسبب الحماية،
                  اضغط داخل المربع الفوقاني لتحديد العنوان كله ثم انسخه بنفسك
                  يدوياً.
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-4 rounded-xl text-center lamma-section-card">
                <span className="text-[10px] text-gray-400 font-bold mb-2">
                  أو وجّه كاميرا موبايلك (أو موبايل صديقك) نحو الكود ده للدخول
                  فوراً:
                </span>
                <div className="bg-white p-2.5 rounded-2xl inline-block border-2 border-[#a3e635]/20 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                  <img
                    loading="lazy"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(appLink)}`}
                    alt="QR Code"
                    className="w-[140px] h-[140px]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[9px] text-green-400 mt-2 font-black">
                  🟢 اتصال مباشر آمن ومفعل بالكامل
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ShareModal;
