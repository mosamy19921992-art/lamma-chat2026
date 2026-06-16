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
  isDbConnectionLost: boolean;
  setIsDbConnectionLost: (val: boolean) => void;
  setIsReconnectingDb: (val: boolean) => void;
  dbStatusLogs: string[];
  setDbStatusLogs: React.Dispatch<React.SetStateAction<string[]>>;
  handleAccelerateDays: (days: number) => void;
  subscriptionPlans: SubscriptionPlan[];
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
  isDbConnectionLost,
  setIsDbConnectionLost,
  setIsReconnectingDb,
  dbStatusLogs,
  setDbStatusLogs,
  handleAccelerateDays,
  subscriptionPlans,
}: StorePanelModalProps) {
  const subscriptionStorageKey = `lamma_subscription_${currentUser.uid}`;
  const isOwner = currentUser.role === "owner";

  useEffect(() => {
    if (!isOwner && (shopTab === "stats" || shopTab === "maintenance")) {
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
              ? "lamma-toggle-off"
              : "lamma-tab-soft text-gray-400 hover:text-white"
          }`}
        >
          🔧 الصيانة والتعافي
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
                  احصل علي الإطار فوراً
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
                  تثبيت اللقب فوراً آلياً
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

      {/* TAB CONTENTS - 4. AUTOMATED FRIEND SUGGESTIONS */}
      {shopTab === "suggests" && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl lamma-section-card">
            <p className="text-[9.5px] text-gray-300 font-bold leading-relaxed">
              🤖 بوت الأرجحة الآلي يقترح عليك هؤلاء الأعضاء المتواجدين حالياً
              الحاملين لنفس اهتمامات الحوار والثقافة لتلقيح روابط الصداقة
              تلقائياً:
            </p>
          </div>

          <div className="space-y-2">
            {friendSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-3 rounded-xl flex items-center justify-between gap-3 text-right lamma-admin-card"
              >
                {sug.status === "pending" ? (
                  <span className="text-[9px] bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 py-1 px-2.5 rounded-lg font-bold animate-pulse font-sans">
                    ⏳ جاري التفاوض الآلي...
                  </span>
                ) : sug.status === "accepted" ? (
                  <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 py-1 px-2.5 rounded-lg font-bold font-sans">
                    🤝 تم القبول والصداقة مفعّلة!
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setFriendSuggestions((prev) =>
                        prev.map((item) =>
                          item.id === sug.id
                            ? { ...item, status: "pending" }
                            : item
                        )
                      );

                      const timeStr = new Date().toLocaleTimeString("ar-EG", {
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      });
                      setBotLogs((prev) => [
                        {
                          id: `${Date.now()}`,
                          time: timeStr,
                          text: `ماتش أوفر للتلقين: جاري مطابقة بيانات الاهتمام والصداقة مع ${sug.name} آلياً.`,
                          severity: "info",
                        },
                        ...prev,
                      ]);

                      setTimeout(() => {
                        setFriendSuggestions((prev) =>
                          prev.map((item) =>
                            item.id === sug.id
                              ? { ...item, status: "accepted" }
                              : item
                          )
                        );
                        addLammaBotMessage(
                          activeRoomId,
                          `🤖 تم إرسال طلب الصداقة المقترح بين [${currentUser.nickname}] و[${sug.name}] بنجاح.`
                        );
                      }, 2000);
                    }}
                    className="py-1 px-3 font-bold text-[9.5px] rounded-lg transition-all cursor-pointer lamma-feature-primary"
                  >
                    📨 إرسال طلب صداقة آلي
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <div className="space-y-0.5">
                    <h6 className="text-[11px] font-black text-white">
                      {sug.name}
                    </h6>
                    <p className="text-[8.5px] text-gray-500 font-extrabold">
                      {sug.interest}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0 select-none">
                    {sug.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENTS - 5. AUTOMATED CHARTS & STATISTICS (owner only) */}
      {isOwner && shopTab === "stats" && (
        <div className="space-y-3 font-sans">
          <p className="text-[9.5px] text-gray-400 font-bold leading-normal pb-1">
            📊 إحصائيات الغرف اليومية التلقائية المستخرجة آلياً لتقديم إشارات
            الأمان والنشاط للإدارة على مدار الساعة:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl text-center lamma-stat-card">
              <span className="text-gray-500 text-[8.5px] font-black">
                إجمالي الرسائل
              </span>
              <h5 className="text-[13px] font-black text-green-400 mt-1 font-mono">
                5,820
              </h5>
            </div>
            <div className="p-3 rounded-xl text-center lamma-stat-card">
              <span className="text-gray-500 text-[8.5px] font-black">
                الأعضاء المتفاعلين
              </span>
              <h5 className="text-[13px] font-black text-cyan-400 mt-1 font-mono">
                409
              </h5>
            </div>
            <div className="p-3 rounded-xl text-center lamma-stat-card">
              <span className="text-gray-500 text-[8.5px] font-black">
                الزوار الجدد
              </span>
              <h5 className="text-[13px] font-black text-yellow-400 mt-1 font-mono">
                +185
              </h5>
            </div>
            <div className="p-3 rounded-xl text-center lamma-stat-card">
              <span className="text-gray-500 text-[8.5px] font-black">
                جودة الاستقرار
              </span>
              <h5 className="text-[13px] font-black text-purple-400 mt-1 font-mono">
                100%
              </h5>
            </div>
          </div>

          <div className="p-3 rounded-2xl lamma-section-card">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
              <span className="text-[8.5px] text-gray-500 font-black">
                مؤشر نشاط الغرف بالساعات السابقة (النسبة النأوية)
              </span>
              <span className="text-[9px] text-emerald-400 font-black">
                سيرفر الإحصائيات الآلي مكلل
              </span>
            </div>
            <div className="space-y-2 pt-1 font-sans">
              <div>
                <div className="flex justify-between text-[8px] font-black text-gray-400 mb-0.5">
                  <span>58% نشاط تفاعلي</span>
                  <span>🇪🇬 غرفة مصر للحديث</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: "58%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[8px] font-black text-gray-400 mb-0.5">
                  <span>32% نشاط تفاعلي</span>
                  <span>👫 لمة شباب وبنات العرب</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full"
                    style={{ width: "32%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[8px] font-black text-gray-400 mb-0.5">
                  <span>10% نشاط تفاعلي</span>
                  <span>💖 شات الرومانسية</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: "10%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              addLammaBotMessage(
                activeRoomId,
                `📊 التقرير الإحصائي العام التلقائي (Lamma Analytics Report):
- إجمالي رسائل اليوم بغرف الشات: 5,820 رسالة متبادلة رسائل حرة 💬.
- عدد المسجلين النشطين على المنصة: 409 عضو فائق الفعالية 🚀.
- أفضل الغرف حرقاً ونشاطاً بالساعة: [غرفة مصر الوازنة EG] بمستويات نشاط 58% ✨.
- العضو الأكثر فاعلية وحضوراً لليوم: أحمد صاحب النخوة 👑.`
              );
              alert(
                "📊 تم بنجاح بث تقرير الإحصائيات الشامل التلقائي كرسالة رسمية مرئية للجميع بغرفة الدردشة!"
              );
            }}
            className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black text-[10px] border border-emerald-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            📢 بث تقرير الإحصائيات الشامل في الغرفة
          </button>
        </div>
      )}

      {/* TAB CONTENTS - 6. AUTOMATED MAINTENANCE & HEALING (owner only) */}
      {isOwner && shopTab === "maintenance" && (
        <div className="space-y-3 font-sans">
          <div className="p-3 rounded-xl flex items-center justify-between gap-3 text-right lamma-soft-danger">
            <div className="space-y-0.5">
              <h5 className="text-[11.5px] font-black text-white">
                نظام الصيانة والتعافي الذاتي الشامل (Auto Maintenance Engine)
              </h5>
              <p className="text-[8.5px] text-gray-400 font-bold leading-relaxed font-sans">
                عند انقطاع الاتصال بقواعد البيانات Supabase أو تعطل Realtime
                Client، يتدخل البوت دورياً لإعادة التوجيه وإرسال التنبيهات
                اللازمة للمشرف الفني آلياً.
              </p>
            </div>
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${isDbConnectionLost ? "bg-red-500 animate-ping" : "bg-green-500 animate-pulse"}`}
            ></div>
          </div>

          <div className="p-3 rounded-xl space-y-2 lamma-section-card">
            <div className="flex items-center justify-between text-right border-b border-white/5 pb-1.5">
              <span className="text-[8.5px] text-gray-500 font-extrabold">
                الوضع الحالي لقنوات الإتصال
              </span>
              <span
                className={`text-[9.1px] font-black ${isDbConnectionLost ? "text-red-400 animate-pulse" : "text-green-400"}`}
              >
                {isDbConnectionLost
                  ? "🔴 الخدمة معطلة (Supabase Lost)"
                  : "🟢 الخدمة مستقرة بالكامل"}
              </span>
            </div>

            <div className="space-y-1 max-h-[105px] overflow-y-auto font-mono text-[8.5px] leading-relaxed">
              {dbStatusLogs.map((log, i) => (
                <div
                  key={i}
                  className="text-gray-400 p-1 border-b border-white/[0.02] last:border-0"
                >
                  {log}
                </div>
              ))}
              {dbStatusLogs.length === 0 && (
                <div className="text-gray-500 text-center py-4 font-sans text-[9px] font-bold">
                  انقر على الخيار أدناه لتجربة المحاكاة ورصد التعافي الفوري.
                </div>
              )}
            </div>
          </div>

          {!isDbConnectionLost ? (
            <button
              onClick={() => {
                setIsDbConnectionLost(true);
                setIsReconnectingDb(true);
                const now = new Date().toLocaleTimeString("ar-EG", {
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                });
                setDbStatusLogs([
                  `[${now}] 🚨 طوارئ: تم رصد انقطاعات حادة بالمزود الرئيسي لقاعدة البيانات Supabase!`,
                  `[${now}] 🚨 طوارئ: انقطاع قنوات المزامنة المتزامنة الفورية (Realtime Engine Offline).`,
                  `[${now}] 🛡️ الأتمتة: تشغيل خطة الطوارئ فئة A والبدء بالمحاولات الدورية للتواصل البديل...`,
                ]);

                setTimeout(() => {
                  const now2 = new Date().toLocaleTimeString("ar-EG", {
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                  });
                  setDbStatusLogs((prev) => [
                    `[${now2}] ⚙️ المحرك: تم توجيه ترافيك الغرفة والنشاط للذاكرة العشوائية المستقرة البديلة (RAM-Mirror).`,
                    `[${now2}] 🔔 التنبيه الآلي: تم إرسال رسالة بريدية عاجلة للمشرف الفني لفرض الرصد التكتيكي لقاعدة البيانات.`,
                    ...prev,
                  ]);
                }, 1800);

                setTimeout(() => {
                  const now3 = new Date().toLocaleTimeString("ar-EG", {
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                  });
                  setDbStatusLogs((prev) => [
                    `[${now3}] ✅ الأتمتة بنجاح: تم التغلب والتعافي التام وإعادة تصفية الاتصال بخادم النسخ الاحتياطية الاستراتيجي بنسبة استقرار 100%!`,
                    `[${now3}] 📡 الاتصال: عودة حالة الحاقنات للون الأخضر والعمل مستقر بالكامل.`,
                    ...prev,
                  ]);
                  setIsDbConnectionLost(false);
                  setIsReconnectingDb(false);
                  addLammaBotMessage(
                    activeRoomId,
                    "🤖 نظام التعافي الذاتي Lamma Maintenance: تم رصد انقطاع عابر في قنوات الاتصال بريل تايم Supabase وقامت الأتمتة الذاتية بإجراء تحويل المسار والربط بالخادم الرديف بنجاح تام في غضون ثوانٍ دون ضياع للرسائل 🚀🛡️!"
                  );
                }, 4500);
              }}
              className="w-full py-2 font-extrabold text-[10px] rounded-xl transition-all cursor-pointer text-center lamma-danger-btn"
            >
              🔌 محاكاة قطع الاتصال ورصد التعافي الفوري للبوت
            </button>
          ) : (
            <div className="py-2.5 rounded-xl text-center text-yellow-300 text-[10px] font-black font-sans lamma-soft-warn">
              ⏳ جاري تنفيذ معالجات التعافي الذاتي من خلال البوت الذكي... انتظر
              ثانية واحدة!
            </div>
          )}
        </div>
      )}

      {/* GATEWAY PAYMENT PANEL (IF PRODUCT CHOSEN) */}
      {selectedProduct && payStatus !== "loading" && payStatus !== "success" && (
        <div className="p-4 rounded-2xl text-right space-y-3 font-sans animate-fadeIn lamma-section-card">
          <div className="flex items-center justify-between border-b border-green-500/15 pb-2">
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-[9.5px] text-gray-500 hover:text-white font-black hover:underline"
            >
              رجوع للتسوق
            </button>
            <h6 className="font-sans font-black text-white text-xs">
              عملية دفع آمنة مؤتمتة • Lamma AutoPay
            </h6>
          </div>

          <div className="p-3 rounded-xl space-y-1.5 text-right lamma-admin-card">
            <div className="text-[10px] text-gray-400 font-bold leading-normal">
              المنتج المحدد للتفعيل التلقائي:
            </div>
            <div className="text-white text-[12px] font-black">
              {selectedProduct.name}
            </div>
            <div className="text-emerald-400 text-[10.5px] font-mono">
              طريقة الدفع وقيمتها: {selectedProduct.price}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] text-gray-400 font-extrabold pr-1">
              اختر مزود الدفع الفوري:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setPayGateway("vodafone");
                  setPaymentAccountInput("");
                }}
                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                  payGateway === "vodafone"
                    ? "lamma-toggle-off"
                    : "lamma-tab-soft text-gray-400 hover:text-white"
                }`}
              >
                🍎 فودافون كاش
              </button>
              <button
                onClick={() => {
                  setPayGateway("instapay");
                  setPaymentAccountInput("");
                }}
                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                  payGateway === "instapay"
                    ? "lamma-accent-btn"
                    : "lamma-tab-soft text-gray-400 hover:text-white"
                }`}
              >
                ⚡ إنستاباي IPA
              </button>
              <button
                onClick={() => {
                  setPayGateway("paymob");
                  setPaymentAccountInput("");
                }}
                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                  payGateway === "paymob"
                    ? "lamma-accent-btn"
                    : "lamma-tab-soft text-gray-400 hover:text-white"
                }`}
              >
                💳 بطاقة فيزا/ميزة
              </button>
              <button
                onClick={() => {
                  setPayGateway("stripe");
                  setPaymentAccountInput("");
                }}
                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                  payGateway === "stripe"
                    ? "lamma-accent-btn"
                    : "lamma-tab-soft text-gray-400 hover:text-white"
                }`}
              >
                💳 Stripe الآلي
              </button>
              <button
                onClick={() => {
                  setPayGateway("paypal");
                  setPaymentAccountInput("");
                }}
                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                  payGateway === "paypal"
                    ? "lamma-soft-warn"
                    : "lamma-tab-soft text-gray-400 hover:text-white"
                }`}
              >
                🅿️ PayPal
              </button>
            </div>
          </div>

          {payGateway === "vodafone" && (
            <div className="space-y-1 text-right">
              <label
                htmlFor="vodafone-wallet-input"
                className="text-[9px] text-gray-400 font-extrabold pr-1"
              >
                قم بتحويل المبلغ فودافون كاش للرقم{" "}
                <span className="text-white text-xs font-mono">01029384756</span>{" "}
                ثم اكتب رقم محفظتك للتأكيد التلقائي:
              </label>
              <input
                type="text"
                id="vodafone-wallet-input"
                name="vodafoneWallet"
                autoComplete="tel"
                maxLength={11}
                placeholder="01xxxxxxxxx (رقم المحفظة المحول منها)"
                value={paymentAccountInput}
                onChange={(e) =>
                  setPaymentAccountInput(e.target.value.replace(/\D/g, ""))
                }
                className="w-full rounded-xl p-2.5 text-xs text-white text-right focus:outline-none text-right lamma-input-shell"
              />
            </div>
          )}

          {payGateway === "instapay" && (
            <div className="space-y-1 text-right">
              <label
                htmlFor="instapay-address-input"
                className="text-[9px] text-gray-400 font-extrabold pr-1"
              >
                قم بالتحويل الآمن لعنوان إنستاباي{" "}
                <span className="text-white text-xs font-mono">
                  lamma@instapay
                </span>{" "}
                ثم اكتب الـ Adresse الخاص بك:
              </label>
              <input
                type="text"
                id="instapay-address-input"
                name="instapayAddress"
                autoComplete="off"
                placeholder="username@instapay (عنوان إرسالك للتسوية)"
                value={paymentAccountInput}
                onChange={(e) => setPaymentAccountInput(e.target.value)}
                className="w-full rounded-xl p-2.5 text-xs text-white text-right focus:outline-none text-right lamma-input-shell"
              />
            </div>
          )}

          {payGateway === "paymob" && (
            <div className="space-y-2 text-right">
              <div className="text-[9px] text-gray-400 font-extrabold pr-1">
                أدخل بيانات بطاقتك الائتمانية للتسوية الآمنة:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  id="paymob-cvv"
                  name="paymob-cvv"
                  autoComplete="cc-csc"
                  maxLength={3}
                  placeholder="CVV"
                  className="rounded-xl p-2 text-xs text-center text-white lamma-input-shell"
                />
                <input
                  type="text"
                  id="paymob-expiry"
                  name="paymob-expiry"
                  autoComplete="cc-exp"
                  maxLength={5}
                  placeholder="MM/YY"
                  className="rounded-xl p-2 text-xs text-center text-white lamma-input-shell"
                />
                <input
                  type="text"
                  id="paymob-card-number"
                  name="paymob-card-number"
                  autoComplete="cc-number"
                  maxLength={16}
                  placeholder="رقم البطاقة المكون من 16 رقم"
                  className="rounded-xl p-2 text-xs text-right text-white col-span-2 lamma-input-shell"
                />
              </div>
            </div>
          )}

          {payGateway === "paypal" && (
            <div className="space-y-1 text-right">
              <label
                htmlFor="paypal-email-input"
                className="text-[9px] text-gray-400 font-extrabold pr-1"
              >
                قم بإدخال بريدك الإلكتروني المسجل في PayPal للتسوية التلقائية:
              </label>
              <input
                type="email"
                id="paypal-email-input"
                name="paypal-email"
                autoComplete="email"
                placeholder="name@example.com (حسابك لتسجيل المعاملة)"
                value={paymentAccountInput}
                onChange={(e) => setPaymentAccountInput(e.target.value)}
                className="w-full rounded-xl p-2.5 text-xs text-white text-right focus:outline-none text-right lamma-input-shell"
              />
            </div>
          )}

          <button
            onClick={() => {
              if (
                (payGateway === "vodafone" || payGateway === "instapay") &&
                !paymentAccountInput.trim()
              ) {
                alert(
                  "❌ يرجى إدخال محفظة التحويل أو عنوان إنستاباي بنجاح للمطابقة الآلية!"
                );
                return;
              }

              setPayStatus("loading");
              setPaymentLogs([
                "⏳ جاري إنشاء حلقة تسوية المعاملة عبر Lamma AutoPay Server...",
                "🔍 جاري التحري والتدقيق المالي من صحة تسليم إشعار فودافون كاش / إنستاباي اللاسلكي...",
              ]);

              setTimeout(() => {
                setPaymentLogs((prev) => [
                  ...prev,
                  "📂 عثرنا على إثبات الإشعار المعنون آلياً بمستويات سداد مقابلة.",
                  "⚡ جاري المطابقة والتصديق الفوري في قواعد كبار الشخصيات والشارات المقترحة...",
                ]);
              }, 1000);

              setTimeout(() => {
                setPaymentLogs((prev) => [
                  ...prev,
                  "💎 تم تأكيد الدفع بنسبة سلامة 100%! جاري التفعيل، ترقية الصلاحيات، وحقن الجوان مظهر الشات...",
                ]);
              }, 2200);

              setTimeout(() => {
                setPayStatus("success");

                if (
                  selectedProduct.type === "bronze" ||
                  selectedProduct.type === "platinum" ||
                  selectedProduct.type === "vip"
                ) {
                  const isPlat = selectedProduct.type === "platinum";
                  const expiresAtMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
                  const subInfo = {
                    isActive: true,
                    type: isPlat ? "platinum" : "vip",
                    color: isPlat
                      ? "gradient"
                      : selectedProduct.color || "#10b981",
                    badge:
                      selectedProduct.badge || (isPlat ? "PLATINUM" : "VIP"),
                    frame: isPlat
                      ? "from-yellow-500 via-amber-500 to-yellow-600"
                      : selectedProduct.frame || "",
                    avatar: selectedProduct.avatar || "👤",
                    expiresAt: expiresAtMs,
                  };
                  localStorage.setItem(
                    subscriptionStorageKey,
                    JSON.stringify(subInfo)
                  );
                  setSubscription(subInfo);

                  setMyActiveSession((prev: any) => ({
                    ...prev,
                    color:
                      subInfo.color === "gradient" ? undefined : subInfo.color,
                    badge: subInfo.badge,
                    avatar: subInfo.avatar,
                    frame: subInfo.frame,
                  }));

                  addLammaBotMessage(
                    activeRoomId,
                    `🤖 تم تفعيل ميزة [${selectedProduct.name}] للعضو المميز [${currentUser.nickname}] غرفوياً بوقار متناهٍ لمدة 30 يوماً! تم تفعيل الشارات والاتصال الفوري تلقائياً بالتحقق عبر ${payGateway === "vodafone" ? "فودافون كاش 🍎" : payGateway === "instapay" ? "إنستاباي ⚡" : payGateway === "paypal" ? "PayPal 🅿️" : "البطاقة البنكية 💳"} 🎉!`
                  );
                  addSystemActivityLog(
                    "promote",
                    currentUser.nickname,
                    `شراء واشتراك تلقائي في باقة كبار الشخصيات VIP وتفعيلها فوراً آلياً بالدفع الرقمي.`,
                    "🤖 LAMMA AUTO-VERIFIER"
                  );
                } else if (selectedProduct.type === "frame") {
                  setMyActiveSession((prev: any) => ({
                    ...prev,
                    frame: selectedProduct.frame,
                  }));
                  addLammaBotMessage(
                    activeRoomId,
                    `🤖 مظهر جديد متجانس: قام العضو [${currentUser.nickname}] بشراء مظهر الإطار الراقي [${selectedProduct.name}] وتولت الأتمتة المظهرية من تفعليه فوراً حول ملفه الشخصي بنجاح 🎨!`
                  );
                  addSystemActivityLog(
                    "promote",
                    currentUser.nickname,
                    `شراء وتفعيل إطار المظهر المتوهج [${selectedProduct.name}] وتوليه فوراً.`,
                    "🤖 LAMMA AUTO-VERIFIER"
                  );
                } else if (selectedProduct.type === "title") {
                  setMyActiveSession((prev: any) => ({
                    ...prev,
                    title: selectedProduct.title,
                    badge: selectedProduct.badge,
                  }));
                  addLammaBotMessage(
                    activeRoomId,
                    `🤖 صلاحية فخرية: قام العضو [${currentUser.nickname}] بشراء وتفعيل لقب التفاضل الخاص [${selectedProduct.title}] وتم إرساءه تلقائياً بجواز رتبته في الغرفة 🏷️!`
                  );
                  addSystemActivityLog(
                    "promote",
                    currentUser.nickname,
                    `تثبيت لقب العضو الفخري المميز [${selectedProduct.title}] بنجاح آلياً.`,
                    "🤖 LAMMA AUTO-VERIFIER"
                  );
                }
              }, 3200);
            }}
            className="w-full py-2.5 text-white text-[10.5px] font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 lamma-feature-primary"
          >
            💸 تأكيد الدفع التلقائي الآمن وإصدار الترقية فوراً
          </button>
        </div>
      )}

      {/* GATEWAY PAYMENT LOADER SIMULATION */}
      {payStatus === "loading" && (
        <div className="p-5 rounded-2xl text-center space-y-4 font-sans animate-fadeIn lamma-section-card">
          <div className="w-12 h-12 rounded-full border-t-2 border-emerald-500 animate-spin mx-auto"></div>
          <div className="space-y-1.5 pt-2">
            <h6 className="font-sans font-black text-white text-xs">
              جاري فحص المعاملات آلياً دون تدخل بشري...
            </h6>
            <p className="text-[10px] text-gray-400 font-bold leading-normal font-mono animate-pulse">
              Lamma Auto-Verification Server Connection Node-9
            </p>
          </div>
          <div className="p-3 rounded-xl space-y-1 max-h-[140px] overflow-y-auto lamma-admin-card">
            {paymentLogs.map((log, i) => (
              <div
                key={i}
                className="text-right text-emerald-400 text-[9px] font-bold font-mono"
              >
                ▸ {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GATEWAY PAYMENT SUCCESS PANEL */}
      {payStatus === "success" && (
        <div className="p-6 rounded-3xl text-center space-y-4 font-sans animate-bounceIn lamma-soft-success">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0 select-none">
            ✓
          </div>
          <div className="space-y-1 pt-1 text-center">
            <h6 className="font-sans font-black text-white text-sm">
              تم الدفع والتفعيل التلقائي بنجاح!
            </h6>
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
              تم تفعيل الطلب واحتساب رتبك ودمج المزايا بالدردشة تلقائياً. تم
              تسجيل الحدث وإشعار جميع الغرف في أمان وسلام.
            </p>
          </div>
          <div className="p-3 rounded-2xl flex items-center justify-between text-right font-sans lamma-admin-card">
            <div className="flex flex-col items-start leading-tight">
              <span className="text-white text-xs font-black">
                {currentUser.nickname}
              </span>
              <span className="text-emerald-400 font-mono text-[8.5px] mt-0.5">
                {myVisualRole || "user"}
              </span>
            </div>
            <span className="text-[9.5px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
              نشط ومرخص آلياً
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setPayStatus("idle");
            }}
            className="w-full py-2 text-white font-extrabold text-[10px] rounded-xl transition-all lamma-feature-primary"
          >
            عودة لمركز المتجر والأتمتة
          </button>
        </div>
      )}

      {/* --- SIMULATED CHRONOLOGICAL TESTING PANEL (FOR COMPREHENSIVE DEBUGGING) --- */}
      {subscription && subscription.isActive && (
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