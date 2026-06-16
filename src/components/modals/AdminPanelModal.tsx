import React, { useEffect, useState } from "react";
import { ActivityLog, BanInfo, ChatMember, ProductTab, ProductType, UserSession } from "../../lib/chatTypes";

interface AdminPanelModalProps {
  adminTab: string;
  setAdminTab: (val: any) => void;
  activityLogs: ActivityLog[];
  bannedUsersList: BanInfo[];
  storeProducts: any[];
  chatMembers: ChatMember[];
  isMaintenanceMode: boolean;
  setIsMaintenanceMode: (val: boolean) => void;
  isGlobalMute: boolean;
  setIsGlobalMute: (val: boolean) => void;
  isGlobalMicMute: boolean;
  setIsGlobalMicMute: (val: boolean) => void;
  isAdsEnabled: boolean;
  setIsAdsEnabled: (val: boolean) => void;
  isBotEnabled: boolean;
  setIsBotEnabled: (val: boolean) => void;
  isWelcomeToastEnabled: boolean;
  setIsWelcomeToastEnabled: (val: boolean) => void;
  isInviteOnlyMode: boolean;
  setIsInviteOnlyMode: (val: boolean) => void;
  addSystemActivityLog: (type: any, userNickname: string, details: string, operator?: string) => void;
  addLammaBotMessage: (roomId: string, text: string) => void;
  currentUser: UserSession;
  setRoomMessages: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeRoomId: string;
  myFingerprint: string;
  myBrowserSig: string;
  myIp: string;
  setBannedUsersList: React.Dispatch<React.SetStateAction<BanInfo[]>>;
  
  newProdName: string;
  setNewProdName: (val: string) => void;
  newProdTab: ProductTab;
  setNewProdTab: (val: ProductTab) => void;
  newProdPrice: string;
  setNewProdPrice: (val: string) => void;
  newProdDesc: string;
  setNewProdDesc: (val: string) => void;
  newProdType: ProductType;
  setNewProdType: (val: ProductType) => void;
  newProdBadge: string;
  setNewProdBadge: (val: string) => void;
  newProdColor: string;
  setNewProdColor: (val: string) => void;
  newProdFrame: string;
  setNewProdFrame: (val: string) => void;
  newProdTitle: string;
  setNewProdTitle: (val: string) => void;
  newProdExt: string;
  setNewProdExt: (val: string) => void;
  setStoreProducts: React.Dispatch<React.SetStateAction<any[]>>;
  editingProduct: any;
  setEditingProduct: (val: any) => void;
}

export function AdminPanelModal({
  adminTab,
  setAdminTab,
  activityLogs,
  bannedUsersList,
  storeProducts,
  chatMembers,
  isMaintenanceMode,
  setIsMaintenanceMode,
  isGlobalMute,
  setIsGlobalMute,
  isGlobalMicMute,
  setIsGlobalMicMute,
  isAdsEnabled,
  setIsAdsEnabled,
  isBotEnabled,
  setIsBotEnabled,
  isWelcomeToastEnabled,
  setIsWelcomeToastEnabled,
  isInviteOnlyMode,
  setIsInviteOnlyMode,
  addSystemActivityLog,
  addLammaBotMessage,
  currentUser,
  setRoomMessages,
  activeRoomId,
  myFingerprint,
  myBrowserSig,
  myIp,
  setBannedUsersList,
  newProdName,
  setNewProdName,
  newProdTab,
  setNewProdTab,
  newProdPrice,
  setNewProdPrice,
  newProdDesc,
  setNewProdDesc,
  newProdType,
  setNewProdType,
  newProdBadge,
  setNewProdBadge,
  newProdColor,
  setNewProdColor,
  newProdFrame,
  setNewProdFrame,
  newProdTitle,
  setNewProdTitle,
  newProdExt,
  setNewProdExt,
  setStoreProducts,
  editingProduct,
  setEditingProduct,
}: AdminPanelModalProps) {
  const [ping, setPing] = useState<string>("جاري القياس...");

  useEffect(() => {
    const start = Date.now();
    fetch("https://www.google.com/generate_204", { mode: "no-cors", cache: "no-store" })
      .then(() => setPing(`${Date.now() - start} ms ✅`))
      .catch(() => setPing("تعذر القياس ⚠️"));
  }, []);

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Tabs triggers */}
      <div className="flex border-b border-green-500/10 pb-0.5 gap-2 select-none overflow-x-auto scroller-hidden">
        <button
          onClick={() => setAdminTab("actions")}
          className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
            adminTab === "actions"
              ? "border-[#a3e635] text-[#a3e635]"
              : "border-transparent text-gray-405 hover:text-white"
          }`}
        >
          ⚡ الإحصاءات والتحكم السريع
        </button>
        <button
          onClick={() => setAdminTab("logs")}
          className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
            adminTab === "logs"
              ? "border-[#a3e635] text-[#a3e635]"
              : "border-transparent text-gray-405 hover:text-white"
          }`}
        >
          📝 سجل العمليات والأنشطة ({activityLogs.length})
        </button>
        <button
          onClick={() => setAdminTab("bans")}
          className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
            adminTab === "bans"
              ? "border-[#a3e635] text-[#a3e635]"
              : "border-transparent text-gray-405 hover:text-white"
          }`}
        >
          🚫 المطرودين والـ Mega Ban ({bannedUsersList.length})
        </button>
        <button
          onClick={() => setAdminTab("store_mgmt")}
          className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
            adminTab === "store_mgmt"
              ? "border-[#a3e635] text-[#a3e635]"
              : "border-transparent text-gray-405 hover:text-white"
          }`}
        >
          🏪 عروض وإضافات المتجر ({storeProducts.length})
        </button>
      </div>

      {/* Sub-tab 1: actions */}
      {adminTab === "actions" && (
        <div
          className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 text-right font-sans select-none"
          dir="rtl"
        >
          {/* Dynamic Live Counter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-black/40 rounded-xl border border-emerald-500/10 text-center">
              <div className="text-sm font-black text-emerald-400">
                {chatMembers.filter((m) => m.status === "online").length}
              </div>
              <div className="text-[8.5px] text-gray-400 font-extrabold">
                المتواجدين الآن
              </div>
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl border border-yellow-500/10 text-center">
              <div className="text-sm font-black text-yellow-500">
                {chatMembers.filter(
                  (m) =>
                    m.role === "vip" ||
                    m.role === "platinum_vip" ||
                    m.role === "owner" ||
                    m.role === "admin" ||
                    m.role === "mod",
                ).length}
              </div>
              <div className="text-[8.5px] text-gray-400 font-extrabold">
                الرتب والـ VIP النشط
              </div>
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl border border-red-500/10 text-center">
              <div className="text-sm font-black text-red-500">
                {bannedUsersList.length}
              </div>
              <div className="text-[8.5px] text-gray-400 font-extrabold">
                العقوبات والبلاغات
              </div>
            </div>
            <div className="p-2.5 bg-black/40 rounded-xl border border-cyan-500/10 text-center">
              <div className="text-sm font-black text-cyan-300 text-[11px]">
                {ping}
              </div>
              <div className="text-[8.5px] text-gray-400 font-extrabold">
                زمن استجابة السيرفر
              </div>
            </div>
          </div>

          {/* SECTION A: GLOBAL ONE-CLICK SWITCHES */}
          <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-3">
            <h5 className="text-[10px] font-black text-emerald-400 border-b border-white/5 pb-1.5 flex items-center gap-1.5">
              🔒 مفاتيح السيطرة والتحكم السريع بضغطة واحدة (Global Safety Toggles)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Toggle 1: Maintenance Mode */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isMaintenanceMode;
                  setIsMaintenanceMode(nextVal);
                  addSystemActivityLog(
                    "demote",
                    currentUser.nickname,
                    `تغيير حالة وضع الصيانة العام لموقع شات لمة إلى: [${nextVal ? "مفعّل" : "ملغى"}]`,
                    "👑 إدارة المالك",
                  );
                  addLammaBotMessage(
                    activeRoomId,
                    `🤖 إشعار إداري: تم ${nextVal ? "تفعيل وضع الصيانة مؤقتاً" : "إنهاء وضع الصيانة وعودة الشات للعمل بشكل طبيعي"}.`,
                  );
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                  isMaintenanceMode
                    ? "bg-yellow-500/10 border-yellow-500/35 text-yellow-400 shadow-md"
                    : "lamma-tab-soft text-gray-300 hover:text-white"
                }`}
              >
                <span>⚙️ وضع الصيانة الشامل</span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isMaintenanceMode ? "bg-yellow-500/20 text-yellow-300" : "bg-white/5 text-gray-400"}`}
                >
                  {isMaintenanceMode ? "نشط حالياً" : "صامت/مغلق"}
                </span>
              </button>

              {/* Toggle 2: Global Mute */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isGlobalMute;
                  setIsGlobalMute(nextVal);
                  addSystemActivityLog(
                    "ban",
                    currentUser.nickname,
                    `تغيير كتم الروم العام للدردشة إلى: [${nextVal ? "كتم نشط" : "مفتوح"}]`,
                    "👑 إدارة المالك",
                  );
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                  isGlobalMute
                    ? "bg-red-500/10 border-red-500/35 text-red-400 shadow-md"
                    : "lamma-tab-soft text-gray-300 hover:text-white"
                }`}
              >
                <span>🔇 كتم الشات العام للجميع</span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isGlobalMute ? "bg-red-500/20 text-red-300" : "bg-white/5 text-gray-400"}`}
                >
                  {isGlobalMute ? "الروم مكتوم" : "الدردشة مفتوحة"}
                </span>
              </button>

              {/* Toggle 3: Global Mic Mute */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isGlobalMicMute;
                  setIsGlobalMicMute(nextVal);
                  addSystemActivityLog(
                    "ban",
                    currentUser.nickname,
                    `تغيير حظر المايكروفون الصوتي بالرومات إلى: [${nextVal ? "حظر شامل" : "مسموح"}]`,
                    "👑 إدارة المالك",
                  );
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                  isGlobalMicMute
                    ? "bg-red-500/10 border-red-500/35 text-red-400 shadow-md"
                    : "lamma-tab-soft text-gray-300 hover:text-white"
                }`}
              >
                <span>🎙️ حظر المايكروفون العام</span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isGlobalMicMute ? "bg-red-500/20 text-red-300" : "bg-white/5 text-gray-400"}`}
                >
                  {isGlobalMicMute ? "المايك مغلق" : "المايك مسموح"}
                </span>
              </button>

              {/* Toggle 4: AI Guard — controls bot protection system */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isBotEnabled;
                  setIsBotEnabled(nextVal);
                  addSystemActivityLog(
                    "promote",
                    currentUser.nickname,
                    `تغيير حارس الذكاء الاصطناعي (منظومة البوتات) إلى: [${nextVal ? "مفعّل" : "معطّل"}]`,
                    "👑 إدارة المالك",
                  );
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                  isBotEnabled
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300 shadow-md"
                    : "lamma-tab-soft text-gray-300 hover:text-white"
                }`}
              >
                <span>🤖 حارس الذكاء الاصطناعي الآلي</span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isBotEnabled ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-gray-400"}`}
                >
                  {isBotEnabled ? "يعمل" : "متوقف"}
                </span>
              </button>

              {/* Toggle 5: VIP Force Enable — invite-only access */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isInviteOnlyMode;
                  setIsInviteOnlyMode(nextVal);
                  addSystemActivityLog(
                    "promote",
                    currentUser.nickname,
                    `تغيير نظام الدعوات فقط إلى: [${nextVal ? "مفعّل" : "معطّل"}]`,
                    "👑 إدارة المالك",
                  );
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                  isInviteOnlyMode
                    ? "bg-yellow-500/10 border-yellow-500/35 text-yellow-300 shadow-md"
                    : "lamma-tab-soft text-gray-300 hover:text-white"
                }`}
              >
                <span>⭐ إجبار نظام الدعوات فقط</span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isInviteOnlyMode ? "bg-yellow-500/20 text-yellow-200" : "bg-white/5 text-gray-400"}`}
                >
                  {isInviteOnlyMode ? "دعوة فقط" : "مفتوح"}
                </span>
              </button>

              {/* Toggle 6: Global Splash Screen — join/leave greetings ticker */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isWelcomeToastEnabled;
                  setIsWelcomeToastEnabled(nextVal);
                  addSystemActivityLog(
                    "promote",
                    currentUser.nickname,
                    `تغيير ترحيب الدخول الفلاشي إلى: [${nextVal ? "مفعّل" : "معطّل"}]`,
                    "👑 إدارة المالك",
                  );
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                  isWelcomeToastEnabled
                    ? "bg-cyan-500/10 border-cyan-500/35 text-cyan-300 shadow-md"
                    : "lamma-tab-soft text-gray-300 hover:text-white"
                }`}
              >
                <span>✨ ترحيب الدخول الفلاشي</span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isWelcomeToastEnabled ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-gray-400"}`}
                >
                  {isWelcomeToastEnabled ? "ظاهر" : "مخفي"}
                </span>
              </button>

              {/* Toggle 7: Footer Advertising deals */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isAdsEnabled;
                  setIsAdsEnabled(nextVal);
                  addSystemActivityLog(
                    "promote",
                    currentUser.nickname,
                    `تغيير عرض شريط عروض المتجر السفلي إلى: [${nextVal ? "معروض" : "مخفي"}]`,
                    "👑 إدارة المالك",
                  );
                }}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                  isAdsEnabled
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400"
                    : "lamma-tab-soft text-gray-300 hover:text-white"
                }`}
              >
                <span>🔥 تفعيل شريط عروض المتجر بالسفل</span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isAdsEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-400"}`}
                >
                  {isAdsEnabled ? "يظهر للمستخدمين" : "الشريط مخفي"}
                </span>
              </button>

              {/* Action 8: Purge Chat messages */}
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "☠️ تحذير إخلاء وتطهير الروم العام: هل أنت متأكد تماماً من الرغبة في بتر ومسح كافة البيانات والمحادثات لجميع الأعضاء في الغرفة الحالية فوراً؟ لا يمكن استعادة البيانات!",
                    )
                  ) {
                    setRoomMessages((prev) => ({
                      ...prev,
                      [activeRoomId]: [],
                    }));
                    addSystemActivityLog(
                      "demote",
                      currentUser.nickname,
                      `قام المالك بعمل تطهير جذري (Purge) لجميع رسائل غرفة ${activeRoomId}.`,
                      "👑 أوامر سيادية",
                    );
                    addLammaBotMessage(
                      activeRoomId,
                      "🧹 إشعار سيادي: تم تنفيذ أمر تطهير وإخلاء الروم من جميع المحادثات السابقة بواسطة الإدارة العليا.",
                    );
                  }
                }}
                className="p-2.5 rounded-xl border border-red-500/30 text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-red-300"
              >
                <span>🧹 تطهير رسائل الشات الحالية كلياً</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                  خطر/لا يمكن التراجع
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Logs */}
      {adminTab === "logs" && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl border border-white/5 bg-black/40 text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">
                  {log.time}
                </span>
                <div className="flex gap-1.5 items-center">
                  <span className="text-[10px] font-black text-gray-300 bg-white/5 px-2 py-0.5 rounded-md">
                    المشرف: {log.operatorNickname}
                  </span>
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded-md font-black ${
                      log.type === "ban"
                        ? "bg-red-500/15 text-red-400"
                        : log.type === "promote"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : log.type === "demote"
                            ? "bg-orange-500/15 text-orange-400"
                            : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {log.type === "ban"
                      ? "عقوبة"
                      : log.type === "promote"
                        ? "ترقية/تفعيل"
                        : log.type === "demote"
                          ? "تخفيض/تعطيل"
                          : log.type === "login"
                            ? "تسجيل دخول"
                            : "عملية"}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-gray-300 leading-relaxed">
                <span className="font-bold text-white ml-1">
                  المستهدف: [{log.userNickname}]
                </span>{" "}
                - {log.details}
              </div>
            </div>
          ))}
          {activityLogs.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-xs font-bold rounded-2xl lamma-section-card">
              سجل العمليات الإدارية نظيف وفارغ حالياً.
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Bans */}
      {adminTab === "bans" && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {bannedUsersList.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 text-right flex justify-between items-center"
              dir="rtl"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-black text-white">
                    {item.nickname}
                  </span>
                  <span
                    className={`text-[8px] px-1 rounded font-black ${item.type === "megaban" ? "bg-red-500/15 text-red-400 border border-red-500/10" : "bg-orange-500/15 text-orange-400 border border-orange-500/10"}`}
                  >
                    {item.type === "megaban"
                      ? "باند نهائي للهاتف/الشبكة"
                      : item.type === "mute"
                        ? "كتم صوتي/كتابي"
                        : item.type === "shadow"
                          ? "حظر الظل الخفي"
                          : item.type === "room"
                            ? "طرد من الغرفة"
                            : "طرد مؤقت"}
                  </span>
                </div>
                <div className="text-[9px] text-gray-400">
                  بواسطة: {item.banner} | {item.time}
                </div>
                <div className="text-[9px] text-gray-500 mt-0.5">
                  السبب: {item.reason}
                </div>
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `هل أنت متأكد من فك الحظر عن [${item.nickname}] وإعفائه من العقوبة؟`,
                    )
                  ) {
                    setBannedUsersList((prev) => {
                      const nextList = prev.filter(
                        (b) => b.id !== item.id,
                      );
                      localStorage.setItem(
                        "lamma_banned_list",
                        JSON.stringify(nextList),
                      );
                      return nextList;
                    });
                    addSystemActivityLog(
                      "promote",
                      item.nickname,
                      `تم إصدار قرار بالعفو وإزالة عقوبة [${item.type}] عن طريق إدارة الشات.`,
                      currentUser.nickname,
                    );
                  }
                }}
                className="px-3 py-1.5 text-[9px] font-bold rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/5"
              >
                فك الحظر
              </button>
            </div>
          ))}
          {bannedUsersList.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-xs font-bold rounded-2xl lamma-section-card">
              لا يوجد أي أعضاء معاقبين أو محظورين في السجلات، المجتمع آمن.
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 4: Store Management */}
      {adminTab === "store_mgmt" && (
        <div
          className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 text-right font-sans select-none"
          dir="rtl"
        >
          {/* Create new product form */}
          <div className="p-4 rounded-2xl border border-white/5 bg-black/40 space-y-3">
            <h5 className="text-[11px] font-black text-emerald-400 border-b border-white/5 pb-2">
              {editingProduct
                ? "✏️ تعديل بيانات المنتج"
                : "✨ إضافة منتج أو اشتراك جديد للمتجر"}
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="اسم العرض أو المنتج (مثال: باقة بلاتينيوم)"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500/50"
              />
              <input
                type="text"
                placeholder="السعر (مثال: 50 EGP)"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500/50"
              />
              <select
                value={newProdTab}
                onChange={(e) =>
                  setNewProdTab(e.target.value as ProductTab)
                }
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer appearance-none"
              >
                <option value="vip">قسم الـ VIP والاشتراكات</option>
                <option value="badges">قسم الألقاب والشارات</option>
                <option value="skins">قسم الألوان والمظاهر</option>
              </select>
              <select
                value={newProdType}
                onChange={(e) =>
                  setNewProdType(e.target.value as ProductType)
                }
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer appearance-none"
              >
                <option value="title">لقب نصي (Title)</option>
                <option value="frame">إطار مضيء (Frame)</option>
                <option value="bronze">رتبة برونزية</option>
                <option value="platinum">رتبة بلاتينية (أعلى فئة)</option>
              </select>
            </div>
            <textarea
              placeholder="وصف مميزات العرض وما سيحصل عليه المشتري..."
              value={newProdDesc}
              onChange={(e) => setNewProdDesc(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500/50 h-16 resize-none"
            ></textarea>

            {/* Dynamic fields based on product type */}
            <div className="grid grid-cols-2 gap-2 bg-white/5 p-2 rounded-xl">
              {newProdType === "title" ||
              newProdType === "bronze" ||
              newProdType === "platinum" ? (
                <>
                  <input
                    type="text"
                    placeholder="اللقب المكتوب (مثال: زعيم الشات)"
                    value={newProdTitle}
                    onChange={(e) => setNewProdTitle(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="رمز الشارة (مثال: 👑 ملك)"
                    value={newProdBadge}
                    onChange={(e) => setNewProdBadge(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none"
                  />
                </>
              ) : null}

              {newProdType === "frame" ? (
                <input
                  type="text"
                  placeholder="كود الإطار اللوني (Tailwind Gradient)"
                  value={newProdFrame}
                  onChange={(e) => setNewProdFrame(e.target.value)}
                  className="col-span-2 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none"
                />
              ) : null}

              <div className="col-span-2 flex items-center justify-between mt-1">
                <span className="text-[9px] text-gray-400">
                  لون الاسم الخاص بالعرض:
                </span>
                <input
                  type="color"
                  value={newProdColor}
                  onChange={(e) => setNewProdColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (!newProdName || !newProdPrice || !newProdDesc) {
                    alert(
                      "يرجى ملء جميع الحقول الأساسية (الاسم، السعر، الوصف).",
                    );
                    return;
                  }

                  if (editingProduct) {
                    setStoreProducts((prev) =>
                      prev.map((p) =>
                        p.id === editingProduct.id
                          ? {
                              ...p,
                              name: newProdName,
                              tab: newProdTab,
                              price: newProdPrice,
                              description: newProdDesc,
                              type: newProdType,
                              badge: newProdBadge,
                              color: newProdColor,
                              frame: newProdFrame,
                              title: newProdTitle,
                              ext: newProdExt,
                            }
                          : p,
                      ),
                    );
                    addSystemActivityLog(
                      "promote",
                      "النظام الآلي",
                      `تم تحديث وتعديل عرض بالمتجر: [${newProdName}].`,
                      currentUser.nickname,
                    );
                  } else {
                    const newId = `prod-${Date.now()}`;
                    const nextProduct = {
                      id: newId,
                      name: newProdName,
                      tab: newProdTab,
                      price: newProdPrice,
                      description: newProdDesc,
                      type: newProdType,
                      badge: newProdBadge,
                      color: newProdColor,
                      frame: newProdFrame,
                      title: newProdTitle,
                      ext: newProdExt,
                    };
                    setStoreProducts((prev) => [nextProduct, ...prev]);
                    addSystemActivityLog(
                      "promote",
                      "النظام الآلي",
                      `تم تدشين وإضافة عرض جديد للمتجر: [${newProdName}].`,
                      currentUser.nickname,
                    );
                  }

                  // Reset form
                  setEditingProduct(null);
                  setNewProdName("");
                  setNewProdPrice("");
                  setNewProdDesc("");
                  setNewProdTitle("");
                  setNewProdBadge("");
                }}
                className="flex-1 py-2 text-[10px] font-black rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
              >
                {editingProduct ? "💾 حفظ التعديلات" : "➕ إضافة للمتجر"}
              </button>
              {editingProduct && (
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setNewProdName("");
                    setNewProdPrice("");
                    setNewProdDesc("");
                  }}
                  className="py-2 px-4 text-[10px] font-black rounded-xl bg-gray-500/20 text-gray-400 hover:bg-gray-500 hover:text-white transition-all"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {/* List of existing products */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-gray-400 pr-2">
              قائمة المنتجات الفعالة بالمتجر ({storeProducts.length})
            </h5>
            {storeProducts.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-white/5 bg-black/20 flex flex-col gap-2 relative overflow-hidden group"
              >
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] bg-white/5 p-1 rounded-md">
                      {p.tab === "vip"
                        ? "👑 اشتراكات"
                        : p.tab === "skins"
                          ? "🎨 مظاهر"
                          : "🏷️ ألقاب وشارات"}
                    </span>
                    <span>{p.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setNewProdName(p.name);
                        setNewProdTab(p.tab);
                        setNewProdPrice(p.price);
                        setNewProdDesc(p.description);
                        setNewProdType(p.type || "title");
                        setNewProdBadge(p.badge || "");
                        setNewProdColor(p.color || "#10b981");
                        setNewProdFrame(
                          p.frame || "from-purple-600 to-pink-600",
                        );
                        setNewProdTitle(p.title || "");
                        setNewProdExt(p.ext || "");
                      }}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `هل تريد مسح عرض [${p.name}] من المتجر نهائياً؟`,
                          )
                        ) {
                          setStoreProducts((prev) =>
                            prev.filter((item) => item.id !== p.id),
                          );
                          addSystemActivityLog(
                            "demote",
                            "النظام الآلي",
                            `تم مسح وإزالة منتج من المتجر: [${p.name}].`,
                            currentUser.nickname,
                          );
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 font-medium leading-relaxed max-w-[280px] z-10">
                  {p.description}
                </p>
                <div className="text-[9px] text-emerald-500 font-mono flex items-center gap-2 justify-end z-10">
                  <span>
                    السعر:{" "}
                    <strong className="text-white text-[10px]">
                      {p.price}
                    </strong>
                  </span>
                  {p.type && (
                    <span>
                      • النوع التقني:{" "}
                      <strong className="text-gray-300">
                        {p.type}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {storeProducts.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-xs font-bold rounded-2xl lamma-section-card">
                المتجر فارغ! استخدم النموذج أعلاه لإنشاء عرقيات وعروض جديدة للربح والتأثير.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}