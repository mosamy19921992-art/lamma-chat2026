import React, { useState } from "react";
import { Megaphone, Pencil, Trash2 } from "lucide-react";
import type { ProductTab, ProductType, UserSession } from "../../lib/chatTypes";

export interface StoreProduct {
  id: string;
  name: string;
  tab: ProductTab;
  price: string;
  description: string;
  type: ProductType;
  badge?: string;
  color?: string;
  frame?: string;
  title?: string;
  ext?: string;
}

interface StoreOffersPanelProps {
  storeProducts: StoreProduct[];
  setStoreProducts: React.Dispatch<React.SetStateAction<StoreProduct[]>>;
  currentUser: UserSession;
  activeRoomId: string;
  addLammaBotMessage: (roomId: string, text: string) => void;
  addSystemActivityLog: (
    type: string,
    userNickname: string,
    details: string,
    operator?: string,
  ) => void;
}

const TAB_LABELS: Record<ProductTab, string> = {
  vip: "VIP",
  skins: "المظهر",
  badges: "الألقاب",
};

export function StoreOffersPanel({
  storeProducts,
  setStoreProducts,
  currentUser,
  activeRoomId,
  addLammaBotMessage,
  addSystemActivityLog,
}: StoreOffersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [tab, setTab] = useState<ProductTab>("skins");
  const [type, setType] = useState<ProductType>("frame");
  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("");
  const [frame, setFrame] = useState("");
  const [color, setColor] = useState("#10b981");

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrice("");
    setDesc("");
    setTab("skins");
    setType("frame");
    setTitle("");
    setBadge("");
    setFrame("");
    setColor("#10b981");
  }

  function loadForEdit(product: StoreProduct) {
    setEditingId(product.id);
    setName(product.name);
    setPrice(product.price);
    setDesc(product.description);
    setTab(product.tab);
    setType(product.type);
    setTitle(product.title || "");
    setBadge(product.badge || "");
    setFrame(product.frame || "");
    setColor(product.color || "#10b981");
  }

  function buildProduct(): StoreProduct | null {
    if (!name.trim() || !price.trim() || !desc.trim()) {
      alert("املأ الاسم والسعر والوصف.");
      return null;
    }
    return {
      id: editingId || `prod-${Date.now()}`,
      name: name.trim(),
      tab,
      price: price.trim(),
      description: desc.trim(),
      type,
      badge: badge.trim() || undefined,
      color,
      frame: frame.trim() || undefined,
      title: title.trim() || undefined,
    };
  }

  function saveProduct(publish: boolean) {
    const product = buildProduct();
    if (!product) return;

    setStoreProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [product, ...prev];
    });

    addSystemActivityLog(
      "promote",
      currentUser.nickname,
      `${editingId ? "تعديل" : "إضافة"} عرض بالمتجر: [${product.name}]`,
      currentUser.nickname,
    );

    if (publish) {
      publishOffer(product);
    }

    resetForm();
  }

  function publishOffer(product: StoreProduct) {
    addLammaBotMessage(
      activeRoomId,
      `🛒 **عرض جديد في متجر لمة**\n\n✨ ${product.name}\n💰 ${product.price}\n📂 القسم: ${TAB_LABELS[product.tab]}\n\n${product.description}\n\n👉 افتح المتجر من القائمة واختر «${TAB_LABELS[product.tab]}»`,
    );
    addSystemActivityLog(
      "promote",
      currentUser.nickname,
      `نشر عرض في الشات: [${product.name}]`,
      currentUser.nickname,
    );
  }

  function deleteProduct(id: string) {
    if (!confirm("حذف هذا العرض من المتجر؟")) return;
    setStoreProducts((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <div className="space-y-4 text-right font-sans" dir="rtl">
      <div className="p-3 rounded-xl lamma-soft-success">
        <h5 className="text-xs font-black text-white flex items-center gap-2 justify-end">
          <Megaphone size={14} className="text-emerald-300" />
          إدارة عروض المتجر
        </h5>
        <p className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed">
          اكتب العروض هنا وانشرها للأعضاء. «حفظ ونشر» يبعت إعلان في الشات الحالي.
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-white/5 bg-black/40 space-y-3">
        <h6 className="text-[10px] font-black text-emerald-400">
          {editingId ? "✏️ تعديل عرض" : "✨ عرض جديد"}
        </h6>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="اسم العرض"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500/50"
          />
          <input
            type="text"
            placeholder="السعر (مثال: 50 جنيه)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500/50"
          />
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as ProductTab)}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="vip">قسم VIP</option>
            <option value="skins">المظهر والإطارات</option>
            <option value="badges">الألقاب والشارات</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ProductType)}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="frame">إطار</option>
            <option value="title">لقب</option>
            <option value="bronze">VIP برونزي</option>
            <option value="platinum">VIP بلاتيني</option>
          </select>
        </div>
        <textarea
          placeholder="وصف العرض — ماذا يحصل المشتري؟"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none h-16 resize-none"
        />
        {(type === "title" || type === "bronze" || type === "platinum") && (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="اللقب"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white"
            />
            <input
              type="text"
              placeholder="الشارة (مثال: 👑)"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white"
            />
          </div>
        )}
        {type === "frame" && (
          <input
            type="text"
            placeholder="كود الإطار (Tailwind gradient)"
            value={frame}
            onChange={(e) => setFrame(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white"
          />
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => saveProduct(false)}
            className="flex-1 py-2 text-[10px] font-black rounded-xl bg-white/5 text-gray-200 hover:bg-white/10 transition-all"
          >
            💾 حفظ فقط
          </button>
          <button
            type="button"
            onClick={() => saveProduct(true)}
            className="flex-1 py-2 text-[10px] font-black rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all"
          >
            📢 حفظ ونشر في الشات
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 text-[10px] font-black rounded-xl bg-gray-500/20 text-gray-400"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        <h6 className="text-[10px] font-bold text-gray-400 pr-1">
          العروض المنشورة ({storeProducts.length})
        </h6>
        {storeProducts.map((p) => (
          <div
            key={p.id}
            className="p-3 rounded-xl border border-white/5 bg-black/25 flex items-start justify-between gap-2"
          >
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => publishOffer(p)}
                className="p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-500/10"
                title="نشر في الشات"
              >
                <Megaphone size={12} />
              </button>
              <button
                type="button"
                onClick={() => loadForEdit(p)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-white/5"
                title="تعديل"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => deleteProduct(p.id)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                title="حذف"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="text-[11px] font-black text-white truncate">{p.name}</div>
              <div className="text-[9px] text-emerald-400 font-bold">{p.price}</div>
              <div className="text-[8.5px] text-gray-500">{TAB_LABELS[p.tab]}</div>
            </div>
          </div>
        ))}
        {storeProducts.length === 0 && (
          <p className="text-center text-gray-500 text-[10px] font-bold py-4">
            مفيش عروض لسه — اكتب أول عرض من الفورم فوق.
          </p>
        )}
      </div>
    </div>
  );
}
