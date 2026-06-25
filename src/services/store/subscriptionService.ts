import { supabase } from "../../lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  badge: string;
  color: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface SubscriptionOrder {
  id: string;
  created_at: string;
  user_id: string;
  user_nickname: string;
  user_email?: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  payment_method: string;
  payment_ref?: string;
  payment_phone?: string;
  status: "pending" | "confirmed" | "rejected";
  owner_note?: string;
  confirmed_at?: string;
  confirmed_by?: string;
}

export interface PaymentInfo {
  vodafone_cash?: { number: string; name: string };
  instapay?: { handle: string };
  fawry?: { code: string };
  note?: string;
}

// A single feature definition (editable by owner)
export interface CustomFeature {
  key: string;   // unique slug, e.g. "vip_badge"
  label: string; // human label, e.g. "شارة VIP بجانب الاسم"
  icon: string;  // emoji, e.g. "💎"
}

// Fallback/default features when DB has none yet
export const DEFAULT_PLAN_FEATURES: CustomFeature[] = [
  { key: "vip_badge",    label: "شارة VIP بجانب الاسم",      icon: "💎" },
  { key: "custom_color", label: "لون فقاعة دردشة مخصص",      icon: "🎨" },
  { key: "send_images",  label: "إرسال صور بلا قيود",         icon: "🖼️" },
  { key: "room_creation",label: "إنشاء غرف جديدة",            icon: "🏠" },
  { key: "no_ads",       label: "إخفاء الإعلانات",            icon: "🚫" },
  { key: "mic_priority", label: "أولوية المايك في الغرف",      icon: "🎤" },
];

// Kept for backward-compat (components that imported it)
export const PLAN_FEATURES = DEFAULT_PLAN_FEATURES;

// ── Custom Features (owner-editable) ─────────────────────────────────────────

export async function fetchCustomFeatures(): Promise<CustomFeature[]> {
  if (!supabase) return DEFAULT_PLAN_FEATURES;
  const { data } = await supabase
    .from("owner_settings")
    .select("custom_features")
    .eq("id", "global")
    .maybeSingle();
  const list = data?.custom_features as CustomFeature[] | null;
  return Array.isArray(list) && list.length > 0 ? list : DEFAULT_PLAN_FEATURES;
}

export async function saveCustomFeatures(
  features: CustomFeature[],
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متاح" };
  const { error } = await supabase
    .from("owner_settings")
    .update({ custom_features: features })
    .eq("id", "global");
  return { error: error?.message || null };
}

// ── Plans ────────────────────────────────────────────────────────────────────

export async function fetchActivePlans(): Promise<SubscriptionPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("fetchActivePlans error:", error.message);
    return [];
  }
  return (data || []).map((p) => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : [],
  }));
}

export async function fetchAllPlans(): Promise<SubscriptionPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("fetchAllPlans error:", error.message);
    return [];
  }
  return (data || []).map((p) => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : [],
  }));
}

export async function upsertPlan(
  plan: Partial<SubscriptionPlan> & { name: string; price: number; duration_days: number },
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متاح" };
  const payload = {
    ...plan,
    updated_at: mongoSanitize.sanitize({ data: new Date().toISOString() }).data,
  };
  const { error } = plan.id
    ? await supabase.from("subscription_plans").update(payload).eq("id", plan.id)
    : await supabase.from("subscription_plans").insert([payload]);
  return { error: error?.message || null };
}

export async function deletePlan(id: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متاح" };
  const { error } = await supabase
    .from("subscription_plans")
    .delete()
    .eq("id", id);
  return { error: error?.message || null };
}

// ── Orders ───────────────────────────────────────────────────────────────────

export interface SubmitOrderInput {
  user_id: string;
  user_nickname: string;
  user_email?: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  payment_method: string;
  payment_ref: string;
  payment_phone: string;
}

export async function submitOrder(
  input: SubmitOrderInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متاح" };
  const { error } = await supabase.from("subscription_orders").insert([
    { ...input, status: "pending" },
  ]);
  return { error: error?.message || null };
}

export async function fetchPendingOrders(): Promise<SubscriptionOrder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subscription_orders")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("fetchPendingOrders error:", error.message);
    return [];
  }
  return data || [];
}

export async function fetchAllOrders(): Promise<SubscriptionOrder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subscription_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchAllOrders error:", error.message);
    return [];
  }
  return data || [];
}

export async function confirmOrder(
  order: SubscriptionOrder,
  plan: SubscriptionPlan,
  confirmedBy: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متاح" };

  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + plan.duration_days * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Update order status
  const { error: orderErr } = await supabase
    .from("subscription_orders")
    .update({
      status: "confirmed",
      confirmed_at: now,
      confirmed_by: confirmedBy,
    })
    .eq("id", order.id);

  if (orderErr) return { error: orderErr.message };

  // Write to vip_subscriptions (activate)
  const { error: subErr } = await supabase.from("vip_subscriptions").upsert(
    [
      {
        user_id: order.user_id,
        plan: plan.name,
        is_active: true,
        expires_at: expiresAt,
        badge: plan.badge,
        avatar: null,
        granted_by: confirmedBy,
      },
    ],
    { onConflict: "user_id" },
  );

  return { error: subErr?.message || null };
}

export async function rejectOrder(
  orderId: string,
  ownerNote: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متاح" };
  const { error } = await supabase
    .from("subscription_orders")
    .update({ status: "rejected", owner_note: ownerNote })
    .eq("id", orderId);
  return { error: error?.message || null };
}

// ── User subscription from DB ─────────────────────────────────────────────────

export async function fetchMySubscription(
  userId: string,
): Promise<{ isActive: boolean; expiresAt: number; badge: string; planName: string } | null> {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("vip_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt < Date.now()) return null;
  return {
    isActive: true,
    expiresAt,
    badge: data.badge || "💎",
    planName: data.plan || "VIP",
  };
}

// ── Payment info from owner_settings ─────────────────────────────────────────

export async function fetchPaymentInfo(): Promise<PaymentInfo> {
  if (!supabase) return {};
  const { data } = await supabase
    .from("owner_settings")
    .select("payment_info")
    .eq("id", "global")
    .maybeSingle();
  return (data?.payment_info as PaymentInfo) || {};
}

export async function savePaymentInfo(
  info: PaymentInfo,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متاح" };
  const { error } = await supabase
    .from("owner_settings")
    .update({ payment_info: info })
    .eq("id", "global");
  return { error: error?.message || null };
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

export function subscribeToNewOrders(
  onNew: (order: SubscriptionOrder) => void,
) {
  if (!supabase) return null;
  return supabase
    .channel("store_orders_owner")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "subscription_orders" },
      (payload) => onNew(payload.new as SubscriptionOrder),
    )
    .subscribe();
}

export function subscribeToMySubscription(
  userId: string,
  onActivated: (sub: { badge: string; planName: string; expiresAt: number }) => void,
) {
  if (!supabase || !userId) return null;
  return supabase
    .channel(`my_vip_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vip_subscriptions",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row?.is_active) {
          onActivated({
            badge: row.badge || "💎",
            planName: row.plan || "VIP",
            expiresAt: new Date(row.expires_at).getTime(),
          });
        }
      },
    )
    .subscribe();
}
