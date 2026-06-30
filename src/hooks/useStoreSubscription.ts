import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ActivityLog } from "../lib/chatTypes";
import { storage } from "../lib/storage";
import {
  fetchActivePlans,
  fetchMySubscription,
  subscribeToMySubscription,
  subscribeToNewOrders,
  type SubscriptionPlan,
} from "../services/store/subscriptionService";

export type ShopTabId =
  | "vip"
  | "skins"
  | "badges"
  | "suggests"
  | "stats"
  | "maintenance"
  | "offers";

export type PayGatewayId =
  | "vodafone"
  | "instapay"
  | "paymob"
  | "stripe"
  | "paypal"
  | null;

export type PayStatus = "idle" | "loading" | "success" | "error";

export type LocalSubscription = {
  isActive: boolean;
  expiresAt: number;
  badge?: string;
  type?: string;
  color?: string;
  frame?: string;
  title?: string;
  avatar?: string;
} | null;

interface UseStoreSubscriptionOptions {
  subscriptionStorageKey: string;
  userId: string | undefined;
  userNickname: string;
  userRole: string;
  userColor: string;
  isOwnerRole: boolean;
  activeRoomId: string;
  addLammaBotMessage: (roomId: string, message: string) => void;
  addSystemActivityLog: (
    type: ActivityLog["type"],
    userNickname: string,
    details: string,
    operatorNickname?: string,
  ) => void;
  setMyActiveSession: Dispatch<
    SetStateAction<{
      nickname: string;
      role: string;
      color: string;
      frame: string;
      title: string;
      badge: string;
      avatar: string;
    }>
  >;
}

export function useStoreSubscription({
  subscriptionStorageKey,
  userId,
  userNickname,
  userRole,
  userColor,
  isOwnerRole,
  activeRoomId,
  addLammaBotMessage,
  addSystemActivityLog,
  setMyActiveSession,
}: UseStoreSubscriptionOptions) {
  const [subscription, setSubscriptionState] = useState<LocalSubscription>(() =>
    storage.get<LocalSubscription>(subscriptionStorageKey, null),
  );
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [subscriptionNowMs, setSubscriptionNowMs] = useState(() => Date.now());

  const [shopTab, setShopTab] = useState<ShopTabId>("vip");
  const [selectedProduct, setSelectedProduct] = useState<Record<string, unknown> | null>(
    null,
  );
  const [payGateway, setPayGateway] = useState<PayGatewayId>(null);
  const [paymentAccountInput, setPaymentAccountInput] = useState("");
  const [payStatus, setPayStatus] = useState<PayStatus>("idle");
  const [paymentLogs, setPaymentLogs] = useState<string[]>([]);

  const activeRoomIdRef = useRef(activeRoomId);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const setSubscription = useCallback(
    (value: SetStateAction<LocalSubscription>) => {
      setSubscriptionState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        if (next) {
          storage.set(subscriptionStorageKey, next);
        } else {
          storage.remove(subscriptionStorageKey);
        }
        return next;
      });
    },
    [subscriptionStorageKey],
  );

  useEffect(() => {
    const id = window.setInterval(() => setSubscriptionNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hasActiveSubscription =
    Boolean(subscription?.isActive) &&
    (subscription?.expiresAt ?? 0) > subscriptionNowMs;

  const subscriptionVisualRole = hasActiveSubscription
    ? subscription?.type === "platinum"
      ? "platinum_vip"
      : "vip"
    : null;

  useEffect(() => {
    fetchActivePlans()
      .then(setSubscriptionPlans)
      .catch((err) => console.warn("fetchActivePlans failed:", err));
  }, []);

  useEffect(() => {
    if (!userId) return;

    fetchMySubscription(userId)
      .then((dbSub) => {
        if (dbSub && dbSub.isActive) {
          setSubscription((prev) => {
            if (prev?.isActive && (prev.expiresAt ?? 0) >= dbSub.expiresAt) {
              return prev;
            }
            return {
              isActive: true,
              expiresAt: dbSub.expiresAt,
              badge: dbSub.badge,
              type: "vip",
            };
          });
        }
      })
      .catch((err) => console.warn("fetchMySubscription failed:", err));

    return subscribeToMySubscription(userId, (activated) => {
      setSubscription({
        isActive: true,
        expiresAt: activated.expiresAt,
        badge: activated.badge,
        type: "vip",
      });
      addLammaBotMessage(
        activeRoomIdRef.current,
        `🎉 تم تفعيل اشتراكك في ${activated.planName} بنجاح! استمتع بمميزاتك 💎`,
      );
    });
  }, [userId, addLammaBotMessage, setSubscription]);

  useEffect(() => {
    if (!isOwnerRole) return;
    return subscribeToNewOrders(() => {
      setPendingOrdersCount((count) => count + 1);
    });
  }, [isOwnerRole]);

  useEffect(() => {
    if (!subscription?.isActive || !subscription.expiresAt) return;

    const botCheckSub = () => {
      const now = Date.now();
      const remainingMs = subscription.expiresAt - now;
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      const savedReminders = storage.get<Record<string, boolean>>(
        "lamma_bot_reminders",
        {},
      );

      if (remainingDays <= 0) {
        const expiredSub = { ...subscription, isActive: false };
        storage.set(subscriptionStorageKey, expiredSub);
        setSubscriptionState(expiredSub);

        setMyActiveSession((prev) => ({
          ...prev,
          role: userRole,
          color: userColor,
          frame: "",
          title: "",
          badge: "",
        }));

        addLammaBotMessage(
          activeRoomIdRef.current || "room1",
          `🤖 إشعار الاشتراك: انتهت صلاحية باقة VIP الخاصة بالعضو [${userNickname}] وتم تحديث المزايا تلقائياً.`,
        );
        addSystemActivityLog(
          "demote",
          userNickname,
          "انقضاء فترة اشتراك VIP تلقائياً وسحب الصلاحيات من نظام الأتمتة.",
          "🤖 LAMMA AUTO-BOT",
        );
        return;
      }

      const reminders: Array<[string, number]> = [
        ["1", 1],
        ["3", 3],
        ["7", 7],
      ];

      for (const [key, threshold] of reminders) {
        if (remainingDays <= threshold && !savedReminders[key]) {
          savedReminders[key] = true;
          storage.set("lamma_bot_reminders", savedReminders);
          const dayLabel =
            threshold === 1
              ? "24 ساعة"
              : threshold === 3
                ? "3 أيام"
                : "7 أيام";
          addLammaBotMessage(
            activeRoomIdRef.current || "room1",
            `🤖 إشعار الاشتراك: ${
              threshold === 7
                ? `باقة VIP الخاصة بالعضو [${userNickname}] ستنتهي خلال ${dayLabel}.`
                : `يتبقى ${dayLabel} على انتهاء باقة VIP الخاصة بالعضو [${userNickname}].`
            }`,
          );
          break;
        }
      }
    };

    botCheckSub();
    const interval = window.setInterval(botCheckSub, 60_000);
    return () => window.clearInterval(interval);
  }, [
    subscription,
    userNickname,
    userRole,
    userColor,
    subscriptionStorageKey,
    addLammaBotMessage,
    addSystemActivityLog,
    setMyActiveSession,
  ]);

  const handleAccelerateDays = useCallback(
    (days: number) => {
      const sub = storage.get<LocalSubscription>(subscriptionStorageKey, null);
      if (!sub) {
        alert(
          "❌ لا يوجد اشتراك VIP نشط حالياً لتسريع عجلة الزمن عليه! يرجى شراء باقة VIP أولاً من واجهة المتجر.",
        );
        return;
      }

      if (!sub.isActive) {
        alert("❌ الاشتراك الحالي معطل أو منتهي بالفعل!");
        return;
      }

      const adjustedSub = {
        ...sub,
        expiresAt: sub.expiresAt - days * 24 * 60 * 60 * 1000,
      };
      storage.set(subscriptionStorageKey, adjustedSub);
      setSubscriptionState(adjustedSub);

      addLammaBotMessage(
        activeRoomIdRef.current || "room1",
        `⏳ تم تقديم الوقت بمقدار ${days} أيام على نظام متابعة الاشتراك لأغراض المراجعة.`,
      );
    },
    [subscriptionStorageKey, addLammaBotMessage],
  );

  const shopCheckout = useMemo(
    () => ({
      shopTab,
      setShopTab,
      selectedProduct,
      setSelectedProduct,
      payGateway,
      setPayGateway,
      paymentAccountInput,
      setPaymentAccountInput,
      payStatus,
      setPayStatus,
      paymentLogs,
      setPaymentLogs,
    }),
    [
      shopTab,
      selectedProduct,
      payGateway,
      paymentAccountInput,
      payStatus,
      paymentLogs,
    ],
  );

  return {
    subscription,
    setSubscription,
    subscriptionPlans,
    pendingOrdersCount,
    setPendingOrdersCount,
    subscriptionNowMs,
    hasActiveSubscription,
    subscriptionVisualRole,
    handleAccelerateDays,
    shopCheckout,
  };
}
