import React, { useEffect, useState } from "react";
import { ProductTab, ProductType, UserSession } from "../../lib/chatTypes";
import {
  CustomFeature,
  DEFAULT_PLAN_FEATURES,
  SubscriptionPlan,
  fetchCustomFeatures,
  fetchPaymentInfo,
  submitOrder,
  type PaymentInfo,
} from "../../services/store/subscriptionService";
import { MaintenancePanel } from "./MaintenancePanel";
import { StoreOffersPanel, type StoreProduct } from "./StoreOffersPanel";

interface StorePanelModalProps {
  shopTab: string;
  setShopTab: React.Dispatch<React.SetStateAction<any>>;
  payStatus: string;
  setPayStatus: React.Dispatch<React.SetStateAction<any>>;
  selectedProduct: any;
  setSelectedProduct: React.Dispatch<React.SetStateAction<any>>;
  storeProducts: any[];
  payGateway: string;
  setPayGateway: React.Dispatch<React.SetStateAction<any>>;
  paymentAccountInput: string;
  setPaymentAccountInput: (val: string) => void;
  paymentLogs: string[];
  setPaymentLogs: React.Dispatch<React.SetStateAction<string[]>>;
  subscription: any;
  setSubscription: (val: any) => void;
  setMyActiveSession: React.Dispatch<React.SetStateAction<any>>;
  currentUser: UserSession;
  activeRoomId: string;
  addLammaBotMessage: (roomId: string, text: string) => void;
  addSystemActivityLog: (type: any, userNickname: string, details: string, operator?: string) => void;
  myVisualRole: string | null;
  friendSuggestions: any[];
  setFriendSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
  setBotLogs: React.Dispatch<React.SetStateAction<any[]>>;
  addBotSystemWarning: (roomId: string, message: string) => void;
  setStoreProducts: React.Dispatch<React.SetStateAction<StoreProduct[]>>;
  isDbConnectionLost: boolean;
  setIsDbConnectionLost: (val: boolean) => void;
  setIsReconnectingDb: (val: boolean) => void;
  dbStatusLogs: string[];
  setDbStatusLogs: React.Dispatch<React.SetStateAction<string[]>>;
  handleAccelerateDays: (days: number) => void;
  subscriptionPlans: SubscriptionPlan[];
  chatMembers?: any[];
  bannedUsersList?: any[];
  openRooms?: { id: string; name: string }[];
  roomMessages?: Record<string, any[]>;
  onOpenMemberProfile?: (nickname: string) => void;
  onStartPrivateChat?: (nickname: string) => void;
}

export function StorePanelModal({
  shopTab,
  setShopTab,
  payStatus,
  setPayStatus,
  selectedProduct,
  setSelectedProduct,
  storeProducts,
  payGateway,
  setPayGateway,
  paymentAccountInput,
  setPaymentAccountInput,
  paymentLogs,
  setPaymentLogs,
  subscription,
  setSubscription,
  setMyActiveSession,
  currentUser,
  activeRoomId,
  addLammaBotMessage,
  addSystemActivityLog,
  myVisualRole,
  friendSuggestions,
  setFriendSuggestions,
  setBotLogs,
  addBotSystemWarning,
  setStoreProducts,
  isDbConnectionLost,
  setIsDbConnectionLost,
  setIsReconnectingDb,
  dbStatusLogs,
  setDbStatusLogs,
  handleAccelerateDays,
  subscriptionPlans,
  chatMembers = [],
  bannedUsersList = [],
  openRooms = [],
  roomMessages = {},
  onOpenMemberProfile,
  onStartPrivateChat,
}: StorePanelModalProps) {
  const subscriptionStorageKey = `lamma_subscription_${currentUser.uid}`;
  const isOwner = currentUser.role === "owner";

  useEffect(() => {
    if (!isOwner && (shopTab === "stats" || shopTab === "maintenance" || shopTab === "offers")) {
      setShopTab("vip");
    }
  }, [isOwner, setShopTab, shopTab]);

  // ── Real VIP plan ordering state ──────────────────────────────────────────
  const [planFeatures, setPlanFeatures] = useState<CustomFeature[]>(DEFAULT_PLAN_FEATURES);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [orderPayMethod, setOrderPayMethod] = useState<"vodafone_cash" | "instapay" | "fawry">("vodafone_cash");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [payInfo, setPayInfo] = useState<PaymentInfo | null>(null);

  useEffect(() => {
    fetchCustomFeatures().then(setPlanFeatures);
  }, []);

  async function loadPayInfo() {
    if (!payInfo) {
      const info = await fetchPaymentInfo();
      setPayInfo(info);
    }
  }

  function openOrderForm(plan: SubscriptionPlan) {
    setSelectedPlan(plan);
    setOrderPhone("");
    setOrderRef("");
    setOrderDone(false);
    loadPayInfo();
  }

  async function handleSubmitOrder() {
    if (!selectedPlan) return;
    if (!orderPhone.trim() || !orderRef.trim()) {
      alert("يرجى ملء رقم هاتفك ورقم العملية.");
      return;
    }
    setOrderLoading(true);
    const { error } = await submitOrder({
      user_id: currentUser.uid || currentUser.nickname,
      user_nickname: currentUser.nickname,
      user_email: currentUser.email || "",
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      amount: selectedPlan.price,
      payment_method: orderPayMethod,
      payment_ref: orderRef.trim(),
      payment_phone: orderPhone.trim(),
    });
    setOrderLoading(false);
    if (error) {
      alert("حدث خطأ: " + error);
      return;
    }
    setOrderDone(true);
  }

  return (
    <div className="space-y-4 text-right selection:bg-emerald-500/20 font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none lamma-soft-success">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 justify-end sm:justify-start">
            <span className="text-sm">{isOwner ? "💎" : "🛒"}</span>
            <h4 className="text-white text-xs font-black">
              {isOwner
                ? "مركز المتجر والأتمتة (للمالك)"
                : "متجر لمة — VIP والمظهر"}
            </h4>
          </div>
          <p className="text-[9.5px] text-gray-400 font-bold leading-relaxed font-sans mt-0.5">
            {isOwner
              ? "إدارة الباقات، الأتمتة، الإحصائيات، وصيانة المنصة."
              : "اشترك في VIP، اختر مظهرك، ألقابك وشاراتك — الدفع يُراجع من المالك."}
          </p>
        </div>
        {isOwner ? (
          <div className="shrink-0 text-left">
            <span className="text-[8.5px] font-black lamma-role-chip lamma-role-vip px-2.5 py-1 whitespace-nowrap">
              ● لوحة المالك
            </span>
          </div>
        ) : subscription?.isActive ? (
          <div className="shrink-0 text-left">
            <span className="text-[8.5px] font-black lamma-role-chip lamma-role-vip px-2.5 py-1 whitespace-nowrap">
              ● VIP نشط
            </span>
          </div>
        ) : null}
      </div>

      {/* App Tabs Selection Bar */}
      <div className="flex items-center gap-1 border-b border-white/5 pb-2 overflow-x-auto scroller-hidden select-none">
        <button
          onClick={() => {
            setShopTab("vip");
            setSelectedProduct(null);
            setPayStatus("idle");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
            shopTab === "vip"
              ? "lamma-toggle-on"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          💎 باقات VIP الشاملة
        </button>
        <button
          onClick={() => {
            setShopTab("skins");
            setSelectedProduct(null);
            setPayStatus("idle");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
            shopTab === "skins"
              ? "lamma-toggle-on"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          🎨 المظهر والإطارات
        </button>
        <button
          onClick={() => {
            setShopTab("badges");
            setSelectedProduct(null);
            setPayStatus("idle");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
            shopTab === "badges"
              ? "lamma-toggle-on"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          🏷️ الألقاب والشارات
        </button>
        <button
          onClick={() => {
            setShopTab("suggests");
            setPayStatus("idle");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
            shopTab === "suggests"
              ? "lamma-toggle-on"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          🤝 لقاء الرفاق آلياً
        </button>
        {isOwner && (
          <>
        <button
          type="button"
          onClick={() => {
            setShopTab("offers");
            setSelectedProduct(null);
            setPayStatus("idle");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
            shopTab === "offers"
              ? "lamma-toggle-on"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          📢 إدارة العروض
        </button>
        <button
          onClick={() => {
            setShopTab("stats");
            setPayStatus("idle");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
            shopTab === "stats"
              ? "lamma-toggle-on"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          📊 إحصائيات الغرف
        </button>
        <button
          onClick={() => {
            setShopTab("maintenance");
            setPayStatus("idle");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
            shopTab === "maintenance"
              ? "lamma-toggle-on"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          🔧 بوت الصيانة
        </button>
          </>
        )}
      </div>

      {/* TAB CONTENTS - 1. VIP BUNDLES (real plans from DB) */}
      {shopTab === "vip" && (
        <div className="space-y-3">

          {/* Order success */}
          {orderDone && (
            <div className="p-4 rounded-2xl lamma-soft-success text-center space-y-2">
              <div className="text-2xl">🎉</div>
              <div className="text-white text-xs font-black">تم إرسال طلبك بنجاح!</div>
              <div className="text-[9px] text-gray-300 leading-relaxed">
                سيراجع المالك طلبك ويفعّل اشتراكك خلال 24 ساعة.
                ستصلك رسالة في الشات فور التفعيل.
              </div>
              <button
                onClick={() => { setSelectedPlan(null); setOrderDone(false); }}
                className="px-4 py-1.5 rounded-xl text-[9px] font-black lamma-section-card text-gray-300 hover:text-white transition-colors"
              >
                العودة للمتجر
              </button>
            </div>
          )}

          {/* Order form */}
          {selectedPlan && !orderDone && (
            <div className="p-4 rounded-2xl lamma-admin-card space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-[9px] text-gray-400 hover:text-white font-bold"
                >
                  ← رجوع
                </button>
                <div className="text-right">
                  <div className="text-white text-xs font-black">{selectedPlan.badge} {selectedPlan.name}</div>
                  <div className="text-emerald-400 text-[10px] font-bold">{selectedPlan.price} جنيه / {selectedPlan.duration_days} يوم</div>
                </div>
              </div>

              {/* Payment method selector */}
              <div>
                <div className="text-[9px] text-gray-400 font-bold mb-1">اختر طريقة الدفع:</div>
                <div className="flex gap-1 flex-wrap">
                  {(["vodafone_cash", "instapay", "fawry"] as const).map((m) => {
                    const hasInfo = m === "vodafone_cash"
                      ? !!payInfo?.vodafone_cash?.number
                      : m === "instapay"
                        ? !!payInfo?.instapay?.handle
                        : !!payInfo?.fawry?.code;
                    if (!hasInfo && payInfo !== null) return null;
                    return (
                      <button
                        key={m}
                        onClick={() => setOrderPayMethod(m)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                          orderPayMethod === m ? "lamma-toggle-on" : "lamma-section-card text-gray-400"
                        }`}
                      >
                        {m === "vodafone_cash" ? "📱 فودافون كاش" : m === "instapay" ? "💳 إنستاباي" : "🏪 فوري"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment instructions */}
              {payInfo && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-right space-y-1">
                  <div className="text-[9px] text-emerald-300 font-black">تعليمات الدفع:</div>
                  {orderPayMethod === "vodafone_cash" && payInfo.vodafone_cash?.number && (
                    <div className="text-[10px] text-white font-bold">
                      حوّل <span className="text-emerald-400">{selectedPlan.price} جنيه</span> على فودافون كاش:
                      <span className="block text-base font-black text-white mt-0.5">{payInfo.vodafone_cash.number}</span>
                      {payInfo.vodafone_cash.name && <span className="text-[9px] text-gray-400">باسم: {payInfo.vodafone_cash.name}</span>}
                    </div>
                  )}
                  {orderPayMethod === "instapay" && payInfo.instapay?.handle && (
                    <div className="text-[10px] text-white font-bold">
                      حوّل <span className="text-emerald-400">{selectedPlan.price} جنيه</span> على إنستاباي:
                      <span className="block text-base font-black text-white mt-0.5">{payInfo.instapay.handle}</span>
                    </div>
                  )}
                  {orderPayMethod === "fawry" && payInfo.fawry?.code && (
                    <div className="text-[10px] text-white font-bold">
                      ادفع <span className="text-emerald-400">{selectedPlan.price} جنيه</span> عبر فوري:
                      <span className="block text-base font-black text-white mt-0.5">كود: {payInfo.fawry.code}</span>
                    </div>
                  )}
                  {payInfo.note && (
                    <div className="text-[9px] text-yellow-300 font-bold mt-1">ملاحظة: {payInfo.note}</div>
                  )}
                </div>
              )}

              {/* Order form fields */}
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] text-gray-400 font-bold">رقم هاتفك (اللي حوّلت منه) *</label>
                  <input
                    value={orderPhone}
                    onChange={(e) => setOrderPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 font-bold">رقم العملية / الكود المرجعي *</label>
                  <input
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value)}
                    placeholder="رقم التحويل من الرسالة"
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={orderLoading || !orderPhone.trim() || !orderRef.trim()}
                className="w-full py-2.5 rounded-xl text-[10px] font-black lamma-toggle-on disabled:opacity-50"
              >
                {orderLoading ? "⏳ جاري الإرسال..." : "✅ إرسال الطلب للمالك"}
              </button>
            </div>
          )}

          {/* Plans grid */}
          {!selectedPlan && !orderDone && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-2xl flex flex-col justify-between transition-all select-none lamma-admin-card"
                >
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] lamma-role-chip lamma-role-vip font-extrabold px-1.5 py-0.5 rounded-lg">
                        {plan.duration_days} يوماً
                      </span>
                      <h5 className="font-sans font-black text-white text-xs">
                        {plan.badge} {plan.name}
                      </h5>
                    </div>
                    {plan.description && (
                      <p className="text-[9px] text-gray-400 font-bold leading-relaxed">{plan.description}</p>
                    )}
                    {plan.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {plan.features.map((f) => {
                          const feat = planFeatures.find((x) => x.key === f);
                          return feat ? (
                            <span key={f} className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                              {feat.icon} {feat.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="pt-2 text-emerald-400 text-[10.5px] font-mono leading-none">
                      السعر:{" "}
                      <span className="text-white text-xs font-black">{plan.price} جنيه</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openOrderForm(plan)}
                    className="w-full mt-4 py-2 text-white font-extrabold text-[10px] rounded-xl transition-all cursor-pointer lamma-feature-primary"
                  >
                    اشترك الآن
                  </button>
                </div>
              ))}
              {subscriptionPlans.length === 0 && (
                <p className="col-span-2 text-center text-gray-500 text-[10px] font-bold py-6">
                  ⚠️ لا توجد باقات متاحة حالياً — تواصل مع المالك.
                </p>
              )}
            </div>
          )}

          {storeProducts.filter((p) => p.tab === "vip").length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <h5 className="text-[10px] font-black text-emerald-300 text-right">
                ✨ عروض خاصة من المالك
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {storeProducts
                  .filter((p) => p.tab === "vip")
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl lamma-admin-card text-right"
                    >
                      <h6 className="text-[11px] font-black text-white">{p.name}</h6>
                      <p className="text-[8.5px] text-gray-400 mt-1">{p.description}</p>
                      <div className="text-[10px] text-emerald-400 font-bold mt-2">{p.price}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setPayGateway("instapay");
                          setPaymentAccountInput("");
                          setPayStatus("idle");
                        }}
                        className="w-full mt-2 py-1.5 rounded-lg text-[9px] font-black lamma-toggle-on"
                      >
                        طلب العرض
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENTS - 2. SKINS & COSMETICS */}
      {shopTab === "skins" && payStatus !== "loading" && payStatus !== "success" && (
        <div id="lamma-skins-store-grid" className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {storeProducts
            .filter((p) => p.tab === "skins")
            .map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl flex flex-col justify-between transition-all text-right select-none lamma-admin-card"
              >
                <h5 className="font-sans font-black text-white text-[11px] flex items-center gap-1.5 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {p.name}
                </h5>
                <p className="text-[8.5px] text-gray-400 font-bold leading-relaxed mt-1">
                  {p.description}
                </p>
                <div className="mt-3 text-[10px] text-emerald-400 font-mono">
                  السعر: {p.price}
                </div>
                <button
                  onClick={() => {
                    setSelectedProduct(p);
                    setPayGateway("instapay");
                    setPaymentAccountInput("");
                    setPayStatus("idle");
                  }}
                  className="mt-2 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer lamma-toggle-on"
                >
                  طلب الإطار
                </button>
              </div>
            ))}
          {storeProducts.filter((p) => p.tab === "skins").length === 0 && (
            <p className="col-span-3 text-center text-gray-500 text-[10px] font-bold py-6">
              ⚠️ لا توجد مظاهر أو إطارات ملوّنة حالياً.
            </p>
          )}
        </div>
      )}

      {/* TAB CONTENTS - 3. BADGES & TITLES */}
      {shopTab === "badges" && payStatus !== "loading" && payStatus !== "success" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {storeProducts
            .filter((p) => p.tab === "badges")
            .map((p) => (
              <div key={p.id} className="p-4 rounded-2xl transition-all select-none lamma-admin-card">
                <h5 className="font-sans font-black text-white text-xs">
                  {p.name}
                </h5>
                <p className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed">
                  {p.description}
                </p>
                <div className="mt-3 text-[10px] text-green-400 font-mono">
                  السعر: {p.price}
                </div>
                <button
                  onClick={() => {
                    setSelectedProduct(p);
                    setPayGateway("instapay");
                    setPaymentAccountInput("");
                    setPayStatus("idle");
                  }}
                  className="w-full mt-3 py-1.5 rounded-xl text-[9px] font-black transition-all cursor-pointer lamma-toggle-on"
                >
                  طلب اللقب
                </button>
              </div>
            ))}
          {storeProducts.filter((p) => p.tab === "badges").length === 0 && (
            <p className="col-span-2 text-center text-gray-500 text-[10px] font-bold py-6">
              ⚠️ لا توجد ألقاب أو شارات متاحة حالياً.
            </p>
          )}
        </div>
      )}

      {/* TAB CONTENTS - 4. FRIEND SUGGESTIONS (coming soon) */}
      {shopTab === "suggests" && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl lamma-section-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👥</span>
              <div>
                <div className="text-[11px] font-black text-white">اقتراحات الأصدقاء</div>
                <div className="text-[9px] text-gray-400 font-bold">
                  أعضاء نشطون في الغرفة الآن — بناءً على التفاعل والحضور المباشر
                </div>
              </div>
            </div>
          </div>

          {friendSuggestions.length === 0 ? (
            <div className="p-6 rounded-2xl lamma-section-card text-center text-[10px] text-gray-500 font-bold">
              لا يوجد أعضاء مقترحون حالياً — انتظر حتى ينضم آخرون للغرفة.
            </div>
          ) : (
            <div className="grid gap-2">
              {friendSuggestions.map((friend: any) => (
                <div
                  key={friend.id || friend.nickname}
                  className="p-3 rounded-2xl lamma-admin-card flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-[11px] font-black text-white truncate">
                      {friend.nickname}
                    </div>
                    <div className="text-[9px] text-gray-400 font-bold mt-0.5">
                      {friend.reason}
                    </div>
                    <div className="text-[8px] text-green-400/80 font-bold mt-1">
                      {friend.role}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {onOpenMemberProfile && (
                      <button
                        type="button"
                        onClick={() => onOpenMemberProfile(friend.nickname)}
                        className="px-2.5 py-1 rounded-lg text-[8px] font-black lamma-soft-action text-gray-200"
                      >
                        الملف
                      </button>
                    )}
                    {onStartPrivateChat && (
                      <button
                        type="button"
                        onClick={() => onStartPrivateChat(friend.nickname)}
                        className="px-2.5 py-1 rounded-lg text-[8px] font-black lamma-toggle-on"
                      >
                        رسالة خاصة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENTS - 5. STATISTICS (owner only) — real live counts */}
      {isOwner && shopTab === "stats" && (
        <div className="space-y-3 font-sans">
          <p className="text-[9.5px] text-gray-400 font-bold leading-normal pb-1">
            📊 إحصائيات الجلسة الحالية (بيانات حقيقية من الاتصال المباشر):
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl text-center lamma-stat-card">
              <span className="text-gray-500 text-[8.5px] font-black">المتصلون الآن</span>
              <h5 className="text-[13px] font-black text-green-400 mt-1 font-mono">
                {chatMembers.length}
              </h5>
            </div>
            <div className="p-3 rounded-xl text-center lamma-stat-card">
              <span className="text-gray-500 text-[8.5px] font-black">المحظورون</span>
              <h5 className="text-[13px] font-black text-red-400 mt-1 font-mono">
                {bannedUsersList.length}
              </h5>
            </div>
          </div>

          <div className="p-3 rounded-2xl lamma-section-card">
            <div className="text-[9px] text-gray-400 font-black mb-2">رسائل الغرف المفتوحة (الجلسة الحالية):</div>
            <div className="space-y-2">
              {openRooms.slice(0, 5).map((room) => {
                const count = (roomMessages[room.id] || []).length;
                const maxCount = Math.max(...openRooms.map((r) => (roomMessages[r.id] || []).length), 1);
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={room.id}>
                    <div className="flex justify-between text-[8px] font-black text-gray-400 mb-0.5">
                      <span>{count} رسالة</span>
                      <span>{room.name}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB — Owner offers management */}
      {isOwner && shopTab === "offers" && (
        <StoreOffersPanel
          storeProducts={storeProducts as StoreProduct[]}
          setStoreProducts={setStoreProducts}
          currentUser={currentUser}
          activeRoomId={activeRoomId}
          addLammaBotMessage={addLammaBotMessage}
          addSystemActivityLog={addSystemActivityLog}
        />
      )}

      {/* TAB — Real maintenance bot (owner only) */}
      {isOwner && shopTab === "maintenance" && (
        <MaintenancePanel
          activeRoomId={activeRoomId}
          setBotLogs={setBotLogs}
          addBotSystemWarning={addBotSystemWarning}
        />
      )}

      {/* GATEWAY PAYMENT PANEL (IF PRODUCT CHOSEN) */}
      {selectedProduct && payStatus !== "success" && (
        <div className="p-4 rounded-2xl text-right space-y-3 font-sans animate-fadeIn lamma-section-card">
          <div className="flex items-center justify-between border-b border-green-500/15 pb-2">
            <button
              onClick={() => { setSelectedProduct(null); setPayStatus("idle"); setPaymentAccountInput(""); setPayGateway(null); }}
              className="text-[9.5px] text-gray-500 hover:text-white font-black hover:underline"
            >
              رجوع للتسوق
            </button>
            <h6 className="font-sans font-black text-white text-xs">
              طلب تفعيل • يراجعه المالك
            </h6>
          </div>

          <div className="p-3 rounded-xl space-y-1.5 text-right lamma-admin-card">
            <div className="text-[10px] text-gray-400 font-bold leading-normal">المنتج المطلوب:</div>
            <div className="text-white text-[12px] font-black">{selectedProduct.name}</div>
            <div className="text-emerald-400 text-[10.5px] font-mono">السعر: {selectedProduct.price}</div>
          </div>

          <div className="p-3 rounded-xl lamma-admin-card text-right space-y-1.5">
            <div className="text-[9px] text-amber-300 font-black">📋 آلية التفعيل</div>
            <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
              بعد إرسال الطلب، يتم مراجعته من المالك وتفعيله يدوياً خلال 24 ساعة.
              ستصلك رسالة في الشات فور التفعيل.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] text-gray-400 font-extrabold pr-1">اختر طريقة الإشعار:</span>
            <div className="grid grid-cols-2 gap-2">
              {(["vodafone", "instapay"] as const).map((m) => (
                <button key={m} onClick={() => { setPayGateway(m); setPaymentAccountInput(""); }}
                  className={`py-2 rounded-xl text-[9px] font-black border transition-all ${payGateway === m ? "lamma-toggle-on" : "lamma-tab-soft text-gray-400 hover:text-white"}`}>
                  {m === "vodafone" ? "📱 فودافون كاش" : "💳 إنستاباي"}
                </button>
              ))}
            </div>
          </div>

          {payGateway && (
            <div className="space-y-1 text-right">
              <label className="text-[9px] text-gray-400 font-extrabold pr-1">
                {payGateway === "vodafone" ? "رقم المحفظة اللي حولت منها:" : "عنوان إنستاباي:"}
              </label>
              <input type="text" autoComplete="off" value={paymentAccountInput}
                onChange={(e) => setPaymentAccountInput(e.target.value)}
                placeholder={payGateway === "vodafone" ? "01xxxxxxxxx" : "username@instapay"}
                className="w-full rounded-xl p-2.5 text-xs text-white text-right focus:outline-none lamma-input-shell" />
            </div>
          )}

          <button
            onClick={async () => {
              if (!payGateway) { alert("اختر طريقة الدفع أولاً"); return; }
              if (!paymentAccountInput.trim()) { alert("أدخل بيانات الدفع"); return; }
              const { error } = await submitOrder({
                user_id: currentUser.uid || "",
                user_nickname: currentUser.nickname,
                user_email: currentUser.email || undefined,
                plan_id: selectedProduct.id || "custom-product",
                plan_name: selectedProduct.name,
                amount: Number(selectedProduct.price) || 0,
                payment_method: payGateway,
                payment_ref: paymentAccountInput.trim(),
                payment_phone: payGateway === "vodafone" ? paymentAccountInput.trim() : "",
              });
              if (error) { alert(`❌ تعذر إرسال الطلب: ${error}`); return; }
              setPayStatus("success");
            }}
            className="w-full py-2.5 text-white text-[10.5px] font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 lamma-feature-primary"
          >
            📨 إرسال الطلب للمالك للمراجعة
          </button>
        </div>
      )}

      {/* ORDER SENT SUCCESS PANEL */}
      {payStatus === "success" && (
        <div className="p-6 rounded-3xl text-center space-y-4 font-sans lamma-soft-success">
          <div className="text-3xl">🎉</div>
          <div className="space-y-1 text-center">
            <h6 className="font-sans font-black text-white text-sm">تم إرسال طلبك بنجاح!</h6>
            <p className="text-[10px] text-gray-300 font-bold leading-relaxed">
              سيراجع المالك طلبك ويفعّله يدوياً خلال 24 ساعة.
              ستصلك رسالة في الشات فور التفعيل.
            </p>
          </div>
          <button onClick={() => { setSelectedProduct(null); setPayStatus("idle"); setPayGateway(null); setPaymentAccountInput(""); }}
            className="w-full py-2 text-white font-extrabold text-[10px] rounded-xl transition-all lamma-feature-primary">
            عودة للمتجر
          </button>
        </div>
      )}

      {/* --- SIMULATED CHRONOLOGICAL TESTING PANEL (FOR COMPREHENSIVE DEBUGGING) --- */}
      {isOwner && subscription && subscription.isActive && (
        <div className="p-4 bg-yellow-500/[0.03] border border-yellow-500/15 rounded-2xl text-right mt-4 space-y-2 select-none font-sans">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-yellow-400">⏳</span>
            <h6 className="font-sans font-black text-yellow-500 text-[10px]">
              ⚙️ لوحة اختبار المحاكاة الزمنية (خاصة بالمطورين ومراجعي النظام)
            </h6>
          </div>
          <p className="text-[8.5px] text-gray-400 font-bold leading-relaxed font-sans mt-0.5">
            تتيح لك اللوحة التقدم المرجعي لمشاهدة دورة حياة اشتراك VIP الممنوح
            بالكامل كأنه حقيقي وتفعيل البوت للتذكير الآلي وسحب الامتيازات
            فوراً!
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => handleAccelerateDays(7)}
              className="py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-black text-[9px] rounded-lg border border-yellow-500/20 transition-all"
            >
              🕒 تسريع 7 أيام
            </button>
            <button
              onClick={() => handleAccelerateDays(23)}
              className="py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-black text-[9px] rounded-lg border border-yellow-500/20 transition-all"
            >
              🕒 تسريع 23 يوماً (أسبوع متبقي)
            </button>
            <button
              onClick={() => handleAccelerateDays(27)}
              className="py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-black text-[9px] rounded-lg border border-yellow-500/20 transition-all"
            >
              🕒 تسريع 27 يوماً (3 أيام متبقية)
            </button>
            <button
              onClick={() => handleAccelerateDays(30)}
              className="py-1.5 text-red-400 font-black text-[9px] rounded-lg transition-all col-span-2 md:col-span-1 lamma-danger-btn"
            >
              ⚠️ إنهاء كامل (30 يوماً)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}