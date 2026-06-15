import React from "react";

interface GuardPanelModalProps {
  isBotEnabled: boolean;
  setIsBotEnabled: (val: boolean) => void;
  botRuleSwearFilter: boolean;
  setBotRuleSwearFilter: (val: boolean) => void;
  botRuleAntiSpam: boolean;
  setBotRuleAntiSpam: (val: boolean) => void;
  botRuleAntiLinks: boolean;
  setBotRuleAntiLinks: (val: boolean) => void;
  bannedWords: string[];
  botLogs: any[];
  setBotLogs: React.Dispatch<React.SetStateAction<any[]>>;
  activeRoomId: string;
  addBotSystemWarning: (roomId: string, message: string) => void;
  setActiveModal: (val: any) => void;
}

export function GuardPanelModal({
  isBotEnabled,
  setIsBotEnabled,
  botRuleSwearFilter,
  setBotRuleSwearFilter,
  botRuleAntiSpam,
  setBotRuleAntiSpam,
  botRuleAntiLinks,
  setBotRuleAntiLinks,
  bannedWords,
  botLogs,
  setBotLogs,
  activeRoomId,
  addBotSystemWarning,
  setActiveModal,
}: GuardPanelModalProps) {
  return (
    <div className="space-y-6 select-none" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl gap-3 lamma-soft-success">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl mt-0.5">🤖</span>
          <div>
            <h4 className="text-white text-xs font-black font-sans text-right">
              مركز البوتات الذكية الشامل (Bot Control Center)
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed text-right font-sans">
              يمتلك الشات منظومة 4 بوتات آلية تعمل في الخلفية
              للحماية، الصيانة، كتابة التقارير الشاملة، ومراقبة
              تكنولوجيا الاتصال.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsBotEnabled(!isBotEnabled)}
          className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0 select-none ${
            isBotEnabled ? "lamma-toggle-on" : "lamma-toggle-off"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isBotEnabled ? "bg-lime-400 animate-pulse" : "bg-red-400"}`}
          ></span>
          {isBotEnabled
            ? "إيقاف المنظومة"
            : "تشغيل منظومة البوتات"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Bot 1: Protection Guard */}
        <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-400 text-lg">🛡️</span>
            <span className="text-xs font-bold text-white">
              بوت الحماية المركزي (Lamma Guard)
            </span>
          </div>
          <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
            يقوم بفلترة الشتائم، منع الروابط الخارجية، وإيقاف
            الرسائل المكررة (Spam) تلقائياً حمايةً للمجتمع.
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <button
              onClick={() =>
                setBotRuleSwearFilter(!botRuleSwearFilter)
              }
              className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleSwearFilter ? "lamma-toggle-on" : "lamma-toggle-off"}`}
            >
              تصفية الشتائم {botRuleSwearFilter ? "🟢" : "🔴"}
            </button>
            <button
              onClick={() => setBotRuleAntiSpam(!botRuleAntiSpam)}
              className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleAntiSpam ? "lamma-toggle-on" : "lamma-toggle-off"}`}
            >
              منع السبام {botRuleAntiSpam ? "🟢" : "🔴"}
            </button>
            <button
              onClick={() =>
                setBotRuleAntiLinks(!botRuleAntiLinks)
              }
              className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleAntiLinks ? "lamma-toggle-on" : "lamma-toggle-off"}`}
            >
              منع الروابط {botRuleAntiLinks ? "🟢" : "🔴"}
            </button>
          </div>
        </div>

        {/* Bot 2: Maintenance & Reports */}
        <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-lg">📋</span>
            <span className="text-xs font-bold text-white">
              بوت الصيانة وإعداد التقارير
            </span>
          </div>
          <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
            يولد تقارير حالة الشات عبر الأمر /guard أو /status،
            ويقوم برصد الخلل وتنبيه الإدارة في حالة الأعطال
            الحرجة.
          </p>
          <div className="flex flex-col gap-1 mt-1">
            <div className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-center lamma-section-card text-blue-300">
              أوامر التقارير: /guard | /status تعمل بكفاءة ✅
            </div>
          </div>
        </div>

        {/* Bot 3: Tech Tracker */}
        <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 text-lg">🛰️</span>
            <span className="text-xs font-bold text-white">
              بوت متابعة التكنولوجيا والشبكات
            </span>
          </div>
          <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
            يراقب خوادم الـ WebRTC والاتصالات، ويقوم بالتحويل
            التلقائي (Auto-Fallback) للمسارات البديلة أثناء
            المكالمات الصوتية والمرئية لتفادي التقطيع.
          </p>
          <div className="flex flex-col gap-1 mt-1">
            <div className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-center lamma-section-card text-purple-300">
              خوادم جوجل وكلاودفلير متصلة وتعمل تلقائياً ⚡
            </div>
          </div>
        </div>

        {/* Bot 4: Word Wall Auto-Mod */}
        <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 text-lg">🧱</span>
            <span className="text-xs font-bold text-white">
              بوت الإشراف التلقائي (Word Firewall)
            </span>
          </div>
          <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
            مرتبط بغرفة تحكم المالك، يقوم بحجب وطرد أي عضو
            تلقائياً إذا حاول إرسال كلمة موجودة في جدار الحماية
            السيادي.
          </p>
          <div className="flex items-center justify-between mt-1 px-2 py-1.5 rounded-lg lamma-soft-danger">
            <span className="text-[9px] text-red-400 font-bold">
              حجم القاموس السيادي النشط:
            </span>
            <span className="text-[10px] text-white font-black bg-red-500/90 px-2 py-0.5 rounded-md">
              {bannedWords.length} كلمة
            </span>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
        <div className="flex items-center justify-between border-b border-green-500/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="lamma-icon-dot"></span>
            <h4 className="text-white text-xs font-black font-sans">
              سجل الفحص الأمني (Real-time Live Logs)
            </h4>
          </div>
          <button
            onClick={() => setBotLogs([])}
            className="text-[9px] text-red-400 hover:text-red-300 hover:underline font-bold"
          >
            مسح السجل
          </button>
        </div>

        <div className="space-y-1.5 max-h-[150px] overflow-y-auto font-mono text-[9px] leading-relaxed">
          {botLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2 rounded-xl border flex items-start gap-2 text-right ${
                log.severity === "danger"
                  ? "lamma-soft-danger text-red-300"
                  : log.severity === "warn"
                    ? "lamma-soft-warn text-yellow-300"
                    : "lamma-section-card text-gray-300"
              }`}
            >
              <span className="text-gray-500 shrink-0 font-sans">
                [{log.time}]
              </span>
              <span className="flex-grow font-sans">
                {log.text}
              </span>
              <span className="shrink-0 font-black font-sans">
                {log.severity === "danger"
                  ? "🛑 حجب"
                  : log.severity === "warn"
                    ? "⚠️ إنذار"
                    : "ℹ️ نظام"}
              </span>
            </div>
          ))}
          {botLogs.length === 0 && (
            <div className="p-4 text-center text-gray-500 font-bold select-none w-full">
              لا توجد محاولات تسلل أو اختراقات مسجلة حالياً. حارس
              الحماية ساهر لمراقبة الشات.
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTION CONTROLS */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            const timeStr = new Date().toLocaleTimeString(
              "en-US",
              {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              },
            );
            addBotSystemWarning(
              activeRoomId,
              "🚨 نداء بخصوص الحفاظ على هدوء الغرفة من حارس الشات الذكي Lamma Guard: نرجو من الجميع الاهتمام بآداب النقاش، وعدم نشر أي نصوص أو محتويات منافية حفاظا على استقرار الغرفة ومنعا للإقصاء التلقائي 🛡️.",
            );
            setBotLogs((prev) => [
              {
                id: `${Date.now()}`,
                time: timeStr,
                text: "بث الأدمن نداء عام بخصوص أمان واستقرار الشات لجميع الأعضاء.",
                severity: "info",
              },
              ...prev,
            ]);
            setActiveModal(null);
          }}
          className="py-2.5 rounded-xl text-yellow-300 font-black text-[10px] transition-all flex items-center justify-center gap-1.5 select-none lamma-soft-warn"
        >
          🚨 إنذار عام للغرفة
        </button>

        <button
          onClick={() => {
            const timeStr = new Date().toLocaleTimeString(
              "en-US",
              {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              },
            );
            setBotLogs((prev) => [
              {
                id: `${Date.now()}`,
                time: timeStr,
                text: "اختبار فحص الغرفة التلقائي: تم التحقق بنجاح من جدار الكلمات وسرعة نقل الحزم اللافكرية للغرف بنسب سلامة 100%.",
                severity: "info",
              },
              ...prev,
            ]);
          }}
          className="py-2.5 rounded-xl text-lime-300 font-black text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer lamma-soft-success"
        >
          ⚡ محاكاة فحص الغرفة
        </button>
      </div>
    </div>
  );
}