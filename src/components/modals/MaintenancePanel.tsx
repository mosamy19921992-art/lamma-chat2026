// MaintenancePanel — the UI for the real Maintenance Bot. Runs live diagnostics
// against the running app and can auto-heal common problems. Every result shown
// here reflects a real runtime check, not a simulation.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Wrench, RefreshCw, ShieldCheck } from "lucide-react";
import {
  runMaintenanceDiagnostics,
  runMaintenanceAutoFix,
  readHealLog,
  appendHealLog,
  type MaintenanceReport,
  type MaintenanceStatus,
} from "../../services/chat/maintenanceBot";

interface BotLogEntry {
  id: string;
  time: string;
  text: string;
  severity: "info" | "warn" | "danger";
}

interface MaintenancePanelProps {
  activeRoomId: string;
  setBotLogs: React.Dispatch<React.SetStateAction<BotLogEntry[]>>;
  addBotSystemWarning: (roomId: string, message: string) => void;
}

function statusColor(status: MaintenanceStatus): string {
  if (status === "ok") return "lamma-soft-success text-emerald-300";
  if (status === "warn") return "lamma-soft-warn text-yellow-300";
  return "lamma-soft-danger text-red-300";
}

function statusBadge(status: MaintenanceStatus): string {
  if (status === "ok") return "✅ سليم";
  if (status === "warn") return "⚠️ تنبيه";
  return "🛑 مشكلة";
}

function nowTime(): string {
  return new Date().toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
  });
}

export function MaintenancePanel({
  activeRoomId,
  setBotLogs,
  addBotSystemWarning,
}: MaintenancePanelProps) {
  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [notifyChatOnFix, setNotifyChatOnFix] = useState(false);
  const [healLog, setHealLog] = useState<string[]>([]);
  const [showHealLog, setShowHealLog] = useState(false);
  const initialScanDoneRef = useRef(false);

  const log = useCallback(
    (text: string, severity: BotLogEntry["severity"]) => {
      setBotLogs((prev) => [
        { id: `${Date.now()}-${Math.random()}`, time: nowTime(), text, severity },
        ...prev,
      ]);
    },
    [setBotLogs],
  );

  const runScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const result = await runMaintenanceDiagnostics();
      setReport(result);
      log(
        `فحص الصيانة الشامل: ${result.okCount} سليم / ${result.warnCount} تنبيه / ${result.failCount} مشكلة (الجودة ${result.score}%).`,
        result.failCount > 0 ? "danger" : result.warnCount > 0 ? "warn" : "info",
      );
    } finally {
      setIsScanning(false);
    }
  }, [log]);

  const runFix = useCallback(async () => {
    setIsFixing(true);
    try {
      const result = await runMaintenanceAutoFix();
      result.fixed.forEach((line) => log(line, "warn"));
      result.failed.forEach((line) => log(line, "danger"));
      result.noop.forEach((line) => log(line, "info"));

      if (result.fixed.length > 0) {
        appendHealLog(result.fixed);
        setHealLog(readHealLog());
        if (notifyChatOnFix) {
          addBotSystemWarning(
            activeRoomId,
            `🛠️ بوت الصيانة أصلح ${result.fixed.length} مشكلة تلقائيًا وحافظ على استقرار الشات.`,
          );
        }
      } else if (result.failed.length > 0) {
        log("تعذّر إكمال بعض خطوات الإصلاح — جرّب تحديث الصفحة.", "danger");
      } else {
        log("بوت الصيانة فحص ولم يجد مشاكل إضافية — جارٍ إعادة الفحص...", "info");
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      await runScan();
    } finally {
      setIsFixing(false);
    }
  }, [activeRoomId, addBotSystemWarning, log, notifyChatOnFix, runScan]);

  useEffect(() => {
    if (initialScanDoneRef.current) return;
    initialScanDoneRef.current = true;
    setHealLog(readHealLog());
  }, []);

  const score = report?.score ?? 0;
  const scoreColor =
    score >= 85
      ? "text-emerald-300"
      : score >= 60
        ? "text-yellow-300"
        : "text-red-300";

  return (
    <div className="p-4 rounded-2xl space-y-3 lamma-section-card" dir="rtl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-blue-300" />
          <h4 className="text-white text-xs font-black font-sans">
            بوت الصيانة الحقيقي (فحص وإصلاح فعلي)
          </h4>
        </div>
        <span className={`text-base font-black ${scoreColor}`}>
          {score}%
        </span>
      </div>

      <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
        البوت ده بيفحص اتصال السيرفر، التحديث اللحظي، التخزين، وسلامة البيانات
        فعليًا — ولو لقى مشكلة بيصلّحها تلقائيًا من غير ما ترجع للكود.
      </p>

      {report && (
        <div className="rounded-xl px-3 py-2 text-[10px] font-black text-center lamma-admin-card text-gray-200">
          {report.summary}
          <span className="block text-[9px] text-gray-500 font-bold mt-0.5">
            آخر فحص: {report.ranAt}
          </span>
        </div>
      )}

      <div className="space-y-1.5 max-h-[210px] overflow-y-auto">
        {report?.checks.map((check) => (
          <div
            key={check.id}
            className={`p-2 rounded-xl border flex items-start gap-2 text-right ${statusColor(
              check.status,
            )}`}
          >
            <span className="shrink-0 font-black font-sans text-[10px]">
              {statusBadge(check.status)}
            </span>
            <div className="flex-grow">
              <div className="text-[11px] font-black text-white font-sans">
                {check.label}
              </div>
              <div className="text-[9px] font-bold font-sans opacity-90">
                {check.detail}
              </div>
            </div>
          </div>
        ))}
        {!report && (
          <div className="p-4 text-center text-gray-500 font-bold text-[10px]">
            اضغط «إعادة فحص شامل» لبدء فحص الأنظمة.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void runScan();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={isScanning || isFixing}
          className="py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 lamma-soft-action text-gray-200 cursor-pointer"
        >
          <RefreshCw size={13} className={isScanning ? "animate-spin" : ""} />
          {isScanning ? "جارٍ الفحص..." : "إعادة فحص شامل"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void runFix();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={isScanning || isFixing}
          className="py-2.5 rounded-xl text-[10px] font-black text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 lamma-accent-btn cursor-pointer"
        >
          {isFixing ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : (
            <Wrench size={13} />
          )}
          {isFixing ? "جارٍ الإصلاح..." : "إصلاح تلقائي للمشاكل"}
        </button>
      </div>

      <label className="flex items-center justify-end gap-2 text-[9px] text-gray-400 font-bold cursor-pointer select-none">
        <input
          type="checkbox"
          checked={notifyChatOnFix}
          onChange={(e) => setNotifyChatOnFix(e.target.checked)}
          className="rounded border-white/20"
        />
        إرسال تنبيه في الشات عند الإصلاح (اختياري)
      </label>

      {report && report.failCount === 0 && report.warnCount === 0 && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-emerald-300 pt-1">
          <ShieldCheck size={13} />
          كل الأنظمة مستقرة، مفيش أي تدخل مطلوب.
        </div>
      )}

      {/* Silent Auto-Heal Log */}
      <div className="border-t border-white/8 pt-2">
        <button
          type="button"
          onClick={() => {
            setHealLog(readHealLog());
            setShowHealLog((v) => !v);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="w-full flex items-center justify-between text-[10px] font-black text-gray-400 hover:text-gray-200 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={11} className="text-blue-400" />
            سجل الإصلاح التلقائي الصامت
          </span>
          <span className="text-[9px] font-mono opacity-60">{showHealLog ? "▲" : "▼"}</span>
        </button>
        {showHealLog && (
          <div className="mt-1.5 space-y-1 max-h-[120px] overflow-y-auto">
            {healLog.length === 0 ? (
              <div className="text-[9px] text-gray-500 font-bold text-center py-2">
                لم يتم تسجيل أي إصلاح تلقائي بعد.
              </div>
            ) : (
              healLog.map((entry, i) => (
                <div
                  key={i}
                  className="text-[9px] text-gray-300 font-bold px-2 py-1 rounded-lg lamma-admin-card"
                >
                  {entry}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MaintenancePanel;
