import React, { useEffect, useState } from "react";
import {
  CustomFeature,
  SubscriptionOrder,
  SubscriptionPlan,
  confirmOrder,
  deletePlan,
  fetchAllOrders,
  fetchAllPlans,
  fetchCustomFeatures,
  fetchPaymentInfo,
  rejectOrder,
  saveCustomFeatures,
  savePaymentInfo,
  upsertPlan,
  type PaymentInfo,
} from "../../services/store/subscriptionService";

interface OwnerStorePanelModalProps {
  ownerNickname: string;
  addLammaBotMessage: (roomId: string, text: string) => void;
  activeRoomId: string;
}

const EMPTY_PLAN: Partial<SubscriptionPlan> = {
  name: "",
  description: "",
  price: 50,
  duration_days: 30,
  badge: "💎",
  color: "#10b981",
  features: [],
  is_active: true,
  sort_order: 0,
};

type StoreOwnerTab = "plans" | "orders" | "payment" | "features";

export function OwnerStorePanelModal({
  ownerNickname,
  addLammaBotMessage,
  activeRoomId,
}: OwnerStorePanelModalProps) {
  const [tab, setTab] = useState<StoreOwnerTab>("orders");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({});
  const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<"pending" | "confirmed" | "rejected" | "all">("pending");

  // Features editor state
  const [newFeatIcon, setNewFeatIcon] = useState("⭐");
  const [newFeatLabel, setNewFeatLabel] = useState("");
  const [editingFeatIdx, setEditingFeatIdx] = useState<number | null>(null);
  const [featSaving, setFeatSaving] = useState(false);

  async function reload() {
    setLoading(true);
    const [p, o, pay, feats] = await Promise.all([
      fetchAllPlans(),
      fetchAllOrders(),
      fetchPaymentInfo(),
      fetchCustomFeatures(),
    ]);
    setPlans(p);
    setOrders(o);
    setPaymentInfo(pay);
    setCustomFeatures(feats);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function handleSavePlan() {
    if (!editingPlan?.name || !editingPlan.price) return;
    setSaving(true);
    const { error } = await upsertPlan(editingPlan as any);
    setSaving(false);
    if (error) { alert("خطأ: " + error); return; }
    setEditingPlan(null);
    reload();
  }

  async function handleDeletePlan(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الخطة؟")) return;
    await deletePlan(id);
    reload();
  }

  async function handleConfirm(order: SubscriptionOrder) {
    const plan = plans.find((p) => p.id === order.plan_id);
    if (!plan) { alert("الخطة غير موجودة — ربما تم حذفها."); return; }
    setSaving(true);
    const { error } = await confirmOrder(order, plan, ownerNickname);
    setSaving(false);
    if (error) { alert("خطأ: " + error); return; }
    addLammaBotMessage(
      activeRoomId,
      `🎉 تهانينا لـ [${order.user_nickname}]! تم تفعيل باقة ${order.plan_name} بنجاح. استمتع بمميزاتك 💎`,
    );
    reload();
  }

  async function handleReject(order: SubscriptionOrder) {
    const note = rejectNote[order.id] || "";
    setSaving(true);
    const { error } = await rejectOrder(order.id, note);
    setSaving(false);
    if (error) { alert("خطأ: " + error); return; }
    reload();
  }

  async function handleSavePayment() {
    setSaving(true);
    await savePaymentInfo(paymentInfo);
    setSaving(false);
    alert("✅ تم حفظ بيانات الدفع بنجاح.");
  }

  const filteredOrders = orders.filter((o) =>
    filterStatus === "all" ? true : o.status === filterStatus,
  );
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-4 text-right font-sans select-none" dir="rtl">
      {/* Header */}
      <div className="p-4 rounded-2xl lamma-soft-success flex items-center justify-between">
        <button
          onClick={reload}
          disabled={loading}
          className="text-[9px] text-emerald-300 font-bold hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? "⏳" : "🔄 تحديث"}
        </button>
        <div>
          <h4 className="text-white text-xs font-black">🏪 إدارة المتجر</h4>
          <p className="text-[9px] text-gray-400 mt-0.5">
            أنشئ الخطط، راجع الطلبات، وفعّل الاشتراكات
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-2">
        {(["orders", "plans", "features", "payment"] as StoreOwnerTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all relative ${
              tab === t ? "lamma-toggle-on" : "lamma-tab-soft text-gray-400 hover:text-white"
            }`}
          >
            {t === "orders" && `📬 الطلبات`}
            {t === "plans" && "📋 الخطط"}
            {t === "features" && "✨ المميزات"}
            {t === "payment" && "💳 الدفع"}
            {t === "orders" && pendingCount > 0 && (
              <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ── */}
      {tab === "orders" && (
        <div className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {(["pending", "confirmed", "rejected", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                  filterStatus === s
                    ? "lamma-toggle-on"
                    : "lamma-section-card text-gray-400 hover:text-white"
                }`}
              >
                {s === "pending" && `⏳ انتظار (${pendingCount})`}
                {s === "confirmed" && "✅ مؤكدة"}
                {s === "rejected" && "❌ مرفوضة"}
                {s === "all" && "📋 الكل"}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center text-gray-500 text-[10px] font-bold py-8">
              {filterStatus === "pending" ? "لا توجد طلبات معلقة 🎉" : "لا توجد طلبات"}
            </div>
          )}

          {filteredOrders.map((order) => (
            <div key={order.id} className="p-3 rounded-xl lamma-admin-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                    order.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : order.status === "confirmed"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {order.status === "pending" ? "⏳ معلق" : order.status === "confirmed" ? "✅ مؤكد" : "❌ مرفوض"}
                </span>
                <div className="text-right">
                  <div className="text-white text-[11px] font-black">{order.user_nickname}</div>
                  <div className="text-emerald-400 text-[9px] font-bold">{order.plan_name} — {order.amount} جنيه</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[9px] text-gray-400 font-bold">
                <div>📱 {order.payment_method === "vodafone_cash" ? "فودافون كاش" : order.payment_method === "instapay" ? "إنستاباي" : order.payment_method === "fawry" ? "فوري" : order.payment_method}</div>
                <div>☎️ {order.payment_phone || "—"}</div>
                <div className="col-span-2">🔖 الكود: {order.payment_ref || "—"}</div>
                <div className="col-span-2 text-gray-500">{new Date(order.created_at).toLocaleString("ar-EG")}</div>
              </div>

              {order.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleConfirm(order)}
                    disabled={saving}
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-black lamma-toggle-on disabled:opacity-50"
                  >
                    ✅ تأكيد التفعيل
                  </button>
                  <div className="flex-1 flex gap-1">
                    <input
                      value={rejectNote[order.id] || ""}
                      onChange={(e) => setRejectNote((p) => ({ ...p, [order.id]: e.target.value }))}
                      placeholder="سبب الرفض..."
                      className="flex-1 px-2 py-1 rounded-lg text-[9px] bg-white/5 text-white border border-white/10 outline-none"
                    />
                    <button
                      onClick={() => handleReject(order)}
                      disabled={saving}
                      className="px-2 py-1 rounded-lg text-[9px] font-black lamma-soft-danger text-red-300 disabled:opacity-50"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              )}

              {order.status === "rejected" && order.owner_note && (
                <div className="text-[9px] text-red-400 font-bold">
                  السبب: {order.owner_note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PLANS TAB ── */}
      {tab === "plans" && (
        <div className="space-y-3">
          {!editingPlan && (
            <button
              onClick={() => setEditingPlan({ ...EMPTY_PLAN })}
              className="w-full py-2 rounded-xl text-[10px] font-black lamma-toggle-on"
            >
              ➕ إنشاء خطة جديدة
            </button>
          )}

          {/* Plan editor */}
          {editingPlan && (
            <div className="p-3 rounded-xl lamma-admin-card space-y-2">
              <div className="text-white text-[11px] font-black text-center border-b border-white/10 pb-2">
                {editingPlan.id ? "تعديل الخطة" : "خطة جديدة"}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-[9px] text-gray-400 font-bold">اسم الخطة *</label>
                  <input
                    value={editingPlan.name || ""}
                    onChange={(e) => setEditingPlan((p) => ({ ...p, name: e.target.value }))}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
                    placeholder="مثال: VIP برونز"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[9px] text-gray-400 font-bold">الوصف</label>
                  <textarea
                    value={editingPlan.description || ""}
                    onChange={(e) => setEditingPlan((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none resize-none"
                    placeholder="وصف مختصر للباقة..."
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-400 font-bold">السعر (جنيه) *</label>
                  <input
                    type="number"
                    min={0}
                    value={editingPlan.price ?? 50}
                    onChange={(e) => setEditingPlan((p) => ({ ...p, price: Number(e.target.value) }))}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-400 font-bold">المدة (أيام) *</label>
                  <input
                    type="number"
                    min={1}
                    value={editingPlan.duration_days ?? 30}
                    onChange={(e) => setEditingPlan((p) => ({ ...p, duration_days: Number(e.target.value) }))}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-400 font-bold">أيقونة الشارة</label>
                  <input
                    value={editingPlan.badge || "💎"}
                    onChange={(e) => setEditingPlan((p) => ({ ...p, badge: e.target.value }))}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
                    placeholder="💎"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-400 font-bold">لون الفقاعة</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="color"
                      value={editingPlan.color || "#10b981"}
                      onChange={(e) => setEditingPlan((p) => ({ ...p, color: e.target.value }))}
                      className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-[9px] text-gray-400 font-mono">{editingPlan.color}</span>
                  </div>
                </div>
              </div>

              {/* Features — from owner's custom list */}
              <div>
                <label className="text-[9px] text-gray-400 font-bold">
                  المميزات
                  <span className="text-[8px] text-emerald-400 mr-1">(اضغط لتفعيل / إلغاء)</span>
                </label>
                {customFeatures.length === 0 && (
                  <p className="text-[9px] text-yellow-400 mt-1">
                    لا توجد مميزات — أضف مميزاتك من تبويب "✨ المميزات" أولاً.
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {customFeatures.map((f) => {
                    const active = (editingPlan.features || []).includes(f.key);
                    return (
                      <button
                        key={f.key}
                        onClick={() =>
                          setEditingPlan((p) => ({
                            ...p,
                            features: active
                              ? (p?.features || []).filter((x) => x !== f.key)
                              : [...(p?.features || []), f.key],
                          }))
                        }
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                          active ? "lamma-toggle-on" : "lamma-section-card text-gray-400"
                        }`}
                      >
                        {f.icon} {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[9px] text-gray-400 font-bold flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_active ?? true}
                    onChange={(e) => setEditingPlan((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  نشطة في المتجر
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSavePlan}
                  disabled={saving || !editingPlan.name}
                  className="flex-1 py-2 rounded-xl text-[10px] font-black lamma-toggle-on disabled:opacity-50"
                >
                  {saving ? "⏳ جاري الحفظ..." : "💾 حفظ الخطة"}
                </button>
                <button
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black lamma-section-card text-gray-400 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Plans list */}
          {plans.map((plan) => (
            <div key={plan.id} className="p-3 rounded-xl lamma-admin-card">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingPlan({ ...plan })}
                    className="text-[9px] text-blue-300 hover:text-white font-bold"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="text-[9px] text-red-400 hover:text-white font-bold"
                  >
                    حذف
                  </button>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-base">{plan.badge}</span>
                    <span className="text-white text-[11px] font-black">{plan.name}</span>
                    {!plan.is_active && (
                      <span className="text-[8px] text-red-400 font-bold">(مخفية)</span>
                    )}
                  </div>
                  <div className="text-[9px] text-gray-400 font-bold">
                    {plan.price} جنيه / {plan.duration_days} يوم
                  </div>
                </div>
              </div>
              {plan.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {plan.features.map((f) => {
                    const feat = customFeatures.find((x) => x.key === f);
                    return feat ? (
                      <span key={f} className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                        {feat.icon} {feat.label}
                      </span>
                    ) : (
                      <span key={f} className="text-[8px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                        {f}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {plans.length === 0 && !editingPlan && (
            <div className="text-center text-gray-500 text-[10px] font-bold py-6">
              لا توجد خطط بعد — أنشئ الخطة الأولى!
            </div>
          )}
        </div>
      )}

      {/* ── FEATURES TAB ── */}
      {tab === "features" && (
        <div className="space-y-3">
          <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
            هنا تُنشئ قائمة المميزات الخاصة بيك — كل ميزة تظهر عند إنشاء/تعديل الباقات.
            تقدر تضيف، تعدّل، أو تحذف أي ميزة بحرية كاملة.
          </p>

          {/* Add new feature */}
          <div className="p-3 rounded-xl lamma-admin-card space-y-2">
            <div className="text-white text-[11px] font-black text-center">
              {editingFeatIdx !== null ? "✏️ تعديل الميزة" : "➕ إضافة ميزة جديدة"}
            </div>
            <div className="flex gap-2">
              <div className="w-16">
                <label className="text-[9px] text-gray-400 font-bold">أيقونة</label>
                <input
                  value={editingFeatIdx !== null ? customFeatures[editingFeatIdx]?.icon ?? newFeatIcon : newFeatIcon}
                  onChange={(e) => {
                    if (editingFeatIdx !== null) {
                      setCustomFeatures((prev) =>
                        prev.map((f, i) => i === editingFeatIdx ? { ...f, icon: e.target.value } : f),
                      );
                    } else {
                      setNewFeatIcon(e.target.value);
                    }
                  }}
                  placeholder="⭐"
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-base bg-white/5 text-white border border-white/10 outline-none text-center"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] text-gray-400 font-bold">اسم الميزة</label>
                <input
                  value={editingFeatIdx !== null ? customFeatures[editingFeatIdx]?.label ?? "" : newFeatLabel}
                  onChange={(e) => {
                    if (editingFeatIdx !== null) {
                      setCustomFeatures((prev) =>
                        prev.map((f, i) => i === editingFeatIdx ? { ...f, label: e.target.value } : f),
                      );
                    } else {
                      setNewFeatLabel(e.target.value);
                    }
                  }}
                  placeholder="مثال: شارة نجمة ذهبية"
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={featSaving || (editingFeatIdx === null && !newFeatLabel.trim())}
                onClick={async () => {
                  if (editingFeatIdx !== null) {
                    setFeatSaving(true);
                    await saveCustomFeatures(customFeatures);
                    setFeatSaving(false);
                    setEditingFeatIdx(null);
                  } else {
                    if (!newFeatLabel.trim()) return;
                    const key = newFeatLabel
                      .trim()
                      .toLowerCase()
                      .replace(/\s+/g, "_")
                      .replace(/[^a-z0-9_\u0600-\u06ff]/g, "");
                    const updated = [
                      ...customFeatures,
                      { key: key || `feat_${Date.now()}`, label: newFeatLabel.trim(), icon: newFeatIcon || "⭐" },
                    ];
                    setFeatSaving(true);
                    const { error } = await saveCustomFeatures(updated);
                    setFeatSaving(false);
                    if (error) { alert("خطأ: " + error); return; }
                    setCustomFeatures(updated);
                    setNewFeatLabel("");
                    setNewFeatIcon("⭐");
                  }
                }}
                className="flex-1 py-2 rounded-xl text-[10px] font-black lamma-toggle-on disabled:opacity-50"
              >
                {featSaving ? "⏳ جاري الحفظ..." : editingFeatIdx !== null ? "💾 حفظ التعديل" : "➕ إضافة"}
              </button>
              {editingFeatIdx !== null && (
                <button
                  onClick={() => setEditingFeatIdx(null)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black lamma-section-card text-gray-400 hover:text-white"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {/* Features list */}
          {customFeatures.length === 0 && (
            <div className="text-center text-gray-500 text-[10px] font-bold py-4">
              لا توجد مميزات بعد — أضف الأولى!
            </div>
          )}

          <div className="space-y-1.5">
            {customFeatures.map((f, idx) => (
              <div
                key={f.key}
                className={`p-2.5 rounded-xl lamma-admin-card flex items-center justify-between gap-2 ${
                  editingFeatIdx === idx ? "border border-emerald-500/40" : ""
                }`}
              >
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEditingFeatIdx(editingFeatIdx === idx ? null : idx)}
                    className="text-[9px] text-blue-300 hover:text-white font-bold"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={async () => {
                      const updated = customFeatures.filter((_, i) => i !== idx);
                      setFeatSaving(true);
                      await saveCustomFeatures(updated);
                      setFeatSaving(false);
                      setCustomFeatures(updated);
                      if (editingFeatIdx === idx) setEditingFeatIdx(null);
                    }}
                    className="text-[9px] text-red-400 hover:text-white font-bold"
                  >
                    حذف
                  </button>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-white text-[11px] font-bold">{f.label}</span>
                  <span className="text-xl">{f.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {customFeatures.length > 0 && (
            <button
              onClick={async () => {
                setFeatSaving(true);
                await saveCustomFeatures(customFeatures);
                setFeatSaving(false);
                alert("✅ تم حفظ كل المميزات بنجاح.");
              }}
              disabled={featSaving}
              className="w-full py-2 rounded-xl text-[10px] font-black lamma-toggle-on disabled:opacity-50"
            >
              {featSaving ? "⏳ جاري الحفظ..." : "💾 حفظ جميع المميزات"}
            </button>
          )}
        </div>
      )}

      {/* ── PAYMENT TAB ── */}
      {tab === "payment" && (
        <div className="space-y-3">
          <p className="text-[10px] text-gray-400 font-bold text-right leading-relaxed">
            هنا تكتب بياناتك التي يحول إليها المشتركون. ستظهر للعضو عند الشراء.
          </p>

          {/* Vodafone Cash */}
          <div className="p-3 rounded-xl lamma-admin-card space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[11px] font-black text-white">فودافون كاش</span>
              <span className="text-lg">📱</span>
            </div>
            <input
              value={paymentInfo.vodafone_cash?.number || ""}
              onChange={(e) =>
                setPaymentInfo((p) => ({
                  ...p,
                  vodafone_cash: { ...p.vodafone_cash, number: e.target.value, name: p.vodafone_cash?.name || "" },
                }))
              }
              placeholder="رقم الهاتف مثال: 01XXXXXXXXX"
              className="w-full px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
            />
            <input
              value={paymentInfo.vodafone_cash?.name || ""}
              onChange={(e) =>
                setPaymentInfo((p) => ({
                  ...p,
                  vodafone_cash: { ...p.vodafone_cash, name: e.target.value, number: p.vodafone_cash?.number || "" },
                }))
              }
              placeholder="اسم المستلم (اختياري)"
              className="w-full px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
            />
          </div>

          {/* InstaPay */}
          <div className="p-3 rounded-xl lamma-admin-card space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[11px] font-black text-white">إنستاباي</span>
              <span className="text-lg">💳</span>
            </div>
            <input
              value={paymentInfo.instapay?.handle || ""}
              onChange={(e) =>
                setPaymentInfo((p) => ({
                  ...p,
                  instapay: { handle: e.target.value },
                }))
              }
              placeholder="مثال: @username"
              className="w-full px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
            />
          </div>

          {/* Fawry */}
          <div className="p-3 rounded-xl lamma-admin-card space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[11px] font-black text-white">فوري</span>
              <span className="text-lg">🏪</span>
            </div>
            <input
              value={paymentInfo.fawry?.code || ""}
              onChange={(e) =>
                setPaymentInfo((p) => ({
                  ...p,
                  fawry: { code: e.target.value },
                }))
              }
              placeholder="كود فوري"
              className="w-full px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none"
            />
          </div>

          {/* Note */}
          <div className="p-3 rounded-xl lamma-admin-card">
            <label className="text-[9px] text-gray-400 font-bold">ملاحظة إضافية (تظهر للمشتري)</label>
            <textarea
              value={paymentInfo.note || ""}
              onChange={(e) =>
                setPaymentInfo((p) => ({ ...p, note: e.target.value }))
              }
              rows={2}
              placeholder="مثال: برجاء ذكر اسم الباقة في تعليق التحويل"
              className="w-full mt-1 px-2 py-1.5 rounded-lg text-[10px] bg-white/5 text-white border border-white/10 outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSavePayment}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-[10px] font-black lamma-toggle-on disabled:opacity-50"
          >
            {saving ? "⏳ جاري الحفظ..." : "💾 حفظ بيانات الدفع"}
          </button>
        </div>
      )}
    </div>
  );
}
