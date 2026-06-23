import React, { useState } from "react";
import { MaintenancePanel } from "./MaintenancePanel";

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
  const [trackerResult, setTrackerResult] = useState<string | null>(null);
  const [trackerLoading, setTrackerLoading] = useState(false);

  async function runTrackerCheck() {
    setTrackerLoading(true);
    setTrackerResult(null);
    try {
      const t0 = performance.now();
      const resp = await fetch("https://www.google.com/generate_204", {
        mode: "no-cors",
        cache: "no-store",
      });
      const ms = Math.round(performance.now() - t0);
      void resp;
      setTrackerResult(`🟢 الشبكة متصلة — زمن الاستجابة: ${ms}ms`);
    } catch {
      setTrackerResult("🔴 تعذر الوصول للشبكة — تحقق من الاتصال.");
    }
    setTrackerLoading(false);
  }

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
              منظومة بوتات تعمل في الخلفية للحماية والصيانة ومراقبة
              الشبكة — كلها حقيقية وفاعلة في الغرف العامة فقط.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsBotEnabled(!isBotEnabled);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0 select-none cursor-pointer ${
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
              🔥 بوت الحماية المركزي (LC-Fire)
            </span>
          </div>
          <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
            يحجب الروابط الخارجية، يمنع السبام، وينفذ جدار الكلمات
            بحجب الرسالة كاملةً — يعمل في الغرف العامة فقط.
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <button
              type="button"
              onClick={() =>
                setBotRuleSwearFilter(!botRuleSwearFilter)
              }
              onPointerDown={(event) => event.stopPropagation()}
              className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleSwearFilter ? "lamma-toggle-on" : "lamma-toggle-off"}`}
            >
              جدار الكلمات {botRuleSwearFilter ? "🟢" : "🔴"}
            </button>
            <button
              type="button"
              onClick={() => setBotRuleAntiSpam(!botRuleAntiSpam)}
              onPointerDown={(event) => event.stopPropagation()}
              className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleAntiSpam ? "lamma-toggle-on" : "lamma-toggle-off"}`}
            >
              منع السبام {botRuleAntiSpam ? "🟢" : "🔴"}
            </button>
            <button
              type="button"
              onClick={() =>
                setBotRuleAntiLinks(!botRuleAntiLinks)
              }
              onPointerDown={(event) => event.stopPropagation()}
              className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleAntiLinks ? "lamma-toggle-on" : "lamma-toggle-off"}`}
            >
              حجب الروابط {botRuleAntiLinks ? "🟢" : "🔴"}
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
            يفحص اتصال السيرفر والتخزين وسلامة البيانات فعليًا،
            ويصلح المشاكل تلقائيًا من لوحة الصيانة بالأسفل.
          </p>
          <div className="flex flex-col gap-1 mt-1">
            <div className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-center lamma-section-card text-blue-300">
              فحص حقيقي + إصلاح تلقائي ↓ /guard | /status ✅
            </div>
          </div>
        </div>

        {/* Bot 3: Tech Tracker — real network check */}
        <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 text-lg">🛰️</span>
            <span className="text-xs font-bold text-white">
              بوت متابعة الشبكة (Network Tracker)
            </span>
          </div>
          <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
            يقيس زمن استجابة الشبكة الفعلي ويكشف انقطاع الاتصال
            في الوقت الحقيقي.
          </p>
          <div className="flex flex-col gap-1 mt-1">
            <button
              type="button"
              onClick={runTrackerCheck}
              onPointerDown={(event) => event.stopPropagation()}
              disabled={trackerLoading}
              className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-center lamma-section-card text-purple-300 cursor-pointer hover:text-purple-200 transition-colors disabled:opacity-60"
            >
              {trackerLoading ? "⏳ جارٍ الفحص..." : "⚡ فحص الشبكة الآن"}
            </button>
            {trackerResult && (
              <div className="px-2 py-1 rounded-lg text-[9px] font-bold text-center lamma-section-card text-lime-300">
                {trackerResult}
              </div>
            )}
          </div>
        </div>

        {/* Bot 4: Word Wall */}
        <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 text-lg">🧱</span>
            <span className="text-xs font-bold text-white">
              جدار الكلمات السيادي (Word Firewall)
            </span>
          </div>
          <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
            يحجب أي رسالة تحتوي على كلمة من قائمة المحظورات
            فوراً — القائمة تُدار من لوحة تحكم المالك.
          </p>
          <div className="flex items-center justify-between mt-1 px-2 py-1.5 rounded-lg lamma-soft-danger">
            <span className="text-[9px] text-red-400 font-bold">
              كلمات محجوبة:
            </span>
            <span className="text-[10px] text-white font-black bg-red-500/90 px-2 py-0.5 rounded-md">
              {bannedWords.length} كلمة
            </span>
          </div>
        </div>
      </div>

      <MaintenancePanel
        activeRoomId={activeRoomId}
        setBotLogs={setBotLogs}
        addBotSystemWarning={addBotSystemWarning}
      />

      {/* Live security log */}
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
              <span className="flex-grow font-sans">{log.text}</span>
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
              لا توجد محاولات مسجلة حالياً — الحارس ساهر.
            </div>
          )}
        </div>
      </div>

      {/* Quick action */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const timeStr = new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          });
          addBotSystemWarning(
            activeRoomId,
            "🔥 نداء من LC-Fire: نرجو من الجميع الالتزام بآداب الحوار وعدم نشر روابط أو محتوى مخالف. شكراً 🛡️",
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
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full py-2.5 rounded-xl text-yellow-300 font-black text-[10px] transition-all flex items-center justify-center gap-1.5 select-none lamma-soft-warn"
      >
        🚨 إنذار عام للغرفة
      </button>
    </div>
  );
}
