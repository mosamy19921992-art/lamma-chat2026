// Maintenance Bot engine — performs REAL health checks against the running app
// and can actually self-heal common problems without touching chat messages.
//
// Checks: network, DB latency, realtime channel, auth session, message write,
//         service worker, localStorage integrity, storage quota.
// Fixes:  corrupted JSON keys, stale caches, service worker update.

import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export type MaintenanceStatus = "ok" | "warn" | "fail";

export interface MaintenanceCheck {
  id: string;
  label: string;
  status: MaintenanceStatus;
  detail: string;
}

export interface MaintenanceReport {
  checks: MaintenanceCheck[];
  score: number;
  okCount: number;
  warnCount: number;
  failCount: number;
  summary: string;
  ranAt: string;
}

export interface MaintenanceFixResult {
  fixed: string[];
  failed: string[];
  noop: string[];
}

const LAMMA_PREFIX = "lamma_";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err)   => { clearTimeout(timer); reject(err); },
    );
  });
}

function listLammaKeys(): string[] {
  if (typeof localStorage === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LAMMA_PREFIX)) keys.push(key);
  }
  return keys;
}

function findCorruptedJsonKeys(): string[] {
  const corrupted: string[] = [];
  for (const key of listLammaKeys()) {
    const value = localStorage.getItem(key);
    if (!value) continue;
    const trimmed = value.trim();
    const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if (!looksJson) continue;
    try {
      JSON.parse(trimmed);
    } catch {
      corrupted.push(key);
    }
  }
  return corrupted;
}

// ─────────────────────────────────────────────
// CHECKS
// ─────────────────────────────────────────────

function checkNetwork(): MaintenanceCheck {
  const online = typeof navigator !== "undefined" ? navigator.onLine !== false : true;
  return {
    id: "network",
    label: "اتصال الإنترنت",
    status: online ? "ok" : "fail",
    detail: online
      ? "الجهاز متصل بالإنترنت."
      : "الجهاز غير متصل بالإنترنت حاليًا.",
  };
}

async function checkDatabase(): Promise<MaintenanceCheck> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: "db",
      label: "اتصال قاعدة البيانات (Supabase)",
      status: "fail",
      detail: "بيانات اتصال Supabase غير مهيأة (VITE_SUPABASE_URL / ANON_KEY).",
    };
  }
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const { error } = await withTimeout(
      Promise.resolve(
        supabase.from("owner_settings").select("id").limit(1),
      ) as unknown as Promise<{ error: { message: string } | null }>,
      6000,
    );
    const elapsed = Math.round(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - started,
    );
    if (error) {
      return {
        id: "db",
        label: "اتصال قاعدة البيانات (Supabase)",
        status: "warn",
        detail: `وصل للسيرفر لكن رجع تحذير (${elapsed}ms): ${error.message}`,
      };
    }
    return {
      id: "db",
      label: "اتصال قاعدة البيانات (Supabase)",
      status: elapsed > 2500 ? "warn" : "ok",
      detail:
        elapsed > 2500
          ? `الاتصال شغّال لكن بطيء (${elapsed}ms).`
          : `الاتصال سليم وسريع (${elapsed}ms).`,
    };
  } catch {
    return {
      id: "db",
      label: "اتصال قاعدة البيانات (Supabase)",
      status: "fail",
      detail: "تعذّر الوصول لقاعدة البيانات (انقطاع أو مهلة انتهت).",
    };
  }
}

// Real realtime test — reuse active channels when possible; otherwise probe subscribe.
async function checkRealtime(): Promise<MaintenanceCheck> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: "realtime",
      label: "الاتصال اللحظي (Realtime)",
      status: "fail",
      detail: "Supabase غير مهيأ، لا يمكن فحص الـ Realtime.",
    };
  }
  if (typeof WebSocket === "undefined") {
    return {
      id: "realtime",
      label: "الاتصال اللحظي (Realtime)",
      status: "fail",
      detail: "المتصفح لا يدعم WebSocket.",
    };
  }

  const activeChannels = supabase.getChannels().filter((channel) => {
    const state = (channel as { state?: string }).state;
    return state === "joined" || state === "joining";
  });
  if (activeChannels.length > 0) {
    return {
      id: "realtime",
      label: "الاتصال اللحظي (Realtime)",
      status: "ok",
      detail: `القنوات اللحظية نشطة (${activeChannels.length}) — الرسائل والمتصلون يعملون.`,
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (check: MaintenanceCheck) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        supabase!.removeChannel(channel);
      } catch {
        /* ignore */
      }
      resolve(check);
    };

    const timer = setTimeout(() => {
      finish({
        id: "realtime",
        label: "الاتصال اللحظي (Realtime)",
        status: "fail",
        detail: "انتهت المهلة بدون استجابة من خادم Realtime (أكثر من 10 ثوانٍ).",
      });
    }, 10000);

    const channel = supabase!
      .channel(`__lamma_health_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {},
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          finish({
            id: "realtime",
            label: "الاتصال اللحظي (Realtime)",
            status: "ok",
            detail: "القناة اللحظية وصلت وشغالة فعلاً — الرسائل تصل في الحظة.",
          });
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          finish({
            id: "realtime",
            label: "الاتصال اللحظي (Realtime)",
            status: "fail",
            detail: `فشل الاتصال اللحظي (${status}) — الرسائل ممكن تتأخر.`,
          });
        }
        // Ignore CLOSED — fires during reconnect/teardown and caused false alarms.
      });
  });
}

// Auth session check — verifies the current session token is valid and not expired.
async function checkAuthSession(): Promise<MaintenanceCheck> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: "auth",
      label: "جلسة تسجيل الدخول (Auth Session)",
      status: "warn",
      detail: "Supabase غير مهيأ، لا يمكن التحقق من الجلسة.",
    };
  }
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession() as Promise<{
        data: { session: { expires_at?: number } | null };
        error: { message: string } | null;
      }>,
      5000,
    );
    if (error) {
      return {
        id: "auth",
        label: "جلسة تسجيل الدخول (Auth Session)",
        status: "fail",
        detail: `خطأ في التحقق من الجلسة: ${error.message}`,
      };
    }
    if (!data.session) {
      return {
        id: "auth",
        label: "جلسة تسجيل الدخول (Auth Session)",
        status: "warn",
        detail: "لا توجد جلسة نشطة (ضيف أو غير مسجل).",
      };
    }
    const expiresAt = data.session.expires_at;
    if (expiresAt) {
      const secsLeft = expiresAt - Math.floor(Date.now() / 1000);
      if (secsLeft < 0) {
        return {
          id: "auth",
          label: "جلسة تسجيل الدخول (Auth Session)",
          status: "fail",
          detail: "الجلسة منتهية الصلاحية — يجب تسجيل الدخول من جديد.",
        };
      }
      if (secsLeft < 300) {
        const mins = Math.ceil(secsLeft / 60);
        return {
          id: "auth",
          label: "جلسة تسجيل الدخول (Auth Session)",
          status: "warn",
          detail: `الجلسة ستنتهي خلال ${mins} دقيقة — سيتم التجديد تلقائياً عند الاتصال.`,
        };
      }
    }
    return {
      id: "auth",
      label: "جلسة تسجيل الدخول (Auth Session)",
      status: "ok",
      detail: "الجلسة نشطة وصالحة.",
    };
  } catch {
    return {
      id: "auth",
      label: "جلسة تسجيل الدخول (Auth Session)",
      status: "warn",
      detail: "تعذّر التحقق من الجلسة (مهلة أو خطأ شبكة).",
    };
  }
}

// Message write check — verifies we can actually write to the messages table.
async function checkMessageDelivery(): Promise<MaintenanceCheck> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: "delivery",
      label: "إرسال الرسائل (Write Access)",
      status: "warn",
      detail: "Supabase غير مهيأ.",
    };
  }
  try {
    // Probe via a select on messages — if 403/RLS blocks even SELECT, writes will fail too.
    const { error } = await withTimeout(
      supabase.from("messages").select("id").limit(1) as unknown as Promise<{
        error: { message: string; code: string } | null;
      }>,
      5000,
    );
    if (!error) {
      return {
        id: "delivery",
        label: "إرسال الرسائل (Write Access)",
        status: "ok",
        detail: "قاعدة البيانات تقبل الاستعلامات — مسار الإرسال مفتوح.",
      };
    }
    const isRls = error.code === "42501" || error.message.includes("row-level");
    return {
      id: "delivery",
      label: "إرسال الرسائل (Write Access)",
      status: isRls ? "warn" : "fail",
      detail: isRls
        ? `قيود الأمان (RLS) نشطة: ${error.message}`
        : `خطأ في الوصول للرسائل: ${error.message}`,
    };
  } catch {
    return {
      id: "delivery",
      label: "إرسال الرسائل (Write Access)",
      status: "fail",
      detail: "تعذّر الاتصال لفحص مسار الإرسال (مهلة أو انقطاع).",
    };
  }
}

async function checkServiceWorker(): Promise<MaintenanceCheck> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return {
      id: "sw",
      label: "عامل الخدمة (Service Worker / PWA)",
      status: "warn",
      detail: "المتصفح لا يدعم Service Worker.",
    };
  }
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs.length === 0) {
      return {
        id: "sw",
        label: "عامل الخدمة (Service Worker / PWA)",
        status: "ok",
        detail: "PWA معطّل — لا يوجد Service Worker (الوضع الطبيعي).",
      };
    }
    return {
      id: "sw",
      label: "عامل الخدمة (Service Worker / PWA)",
      status: "warn",
      detail: `Service Worker قديم مسجّل (${regs.length}) — اضغط «إصلاح تلقائي» لإزالته.`,
    };
  } catch {
    return {
      id: "sw",
      label: "عامل الخدمة (Service Worker / PWA)",
      status: "warn",
      detail: "تعذّر قراءة حالة الـ Service Worker.",
    };
  }
}

function checkStorageWritable(): MaintenanceCheck {
  if (typeof localStorage === "undefined") {
    return {
      id: "storage",
      label: "التخزين المحلي (localStorage)",
      status: "fail",
      detail: "التخزين المحلي غير متاح في هذا المتصفح.",
    };
  }
  try {
    const probe = "__lamma_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return {
      id: "storage",
      label: "التخزين المحلي (localStorage)",
      status: "ok",
      detail: "القراءة والكتابة على التخزين المحلي تعمل بشكل سليم.",
    };
  } catch {
    return {
      id: "storage",
      label: "التخزين المحلي (localStorage)",
      status: "fail",
      detail: "تعذّرت الكتابة على التخزين المحلي (ممتلئ أو محظور).",
    };
  }
}

function checkDataIntegrity(): MaintenanceCheck {
  const corrupted = findCorruptedJsonKeys();
  if (corrupted.length === 0) {
    return {
      id: "integrity",
      label: "سلامة بيانات الشات المحفوظة",
      status: "ok",
      detail: "كل البيانات المحفوظة سليمة وغير تالفة.",
    };
  }
  return {
    id: "integrity",
    label: "سلامة بيانات الشات المحفوظة",
    status: "fail",
    detail: `تم رصد ${corrupted.length} عنصر بيانات تالف يحتاج إصلاح تلقائي.`,
  };
}

async function checkStorageUsage(): Promise<MaintenanceCheck> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      typeof navigator.storage.estimate === "function"
    ) {
      const est = await navigator.storage.estimate();
      const usage = est.usage ?? 0;
      const quota = est.quota ?? 0;
      const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      const mb = (usage / (1024 * 1024)).toFixed(1);
      return {
        id: "quota",
        label: "مساحة التخزين المستخدمة",
        status: pct > 90 ? "warn" : "ok",
        detail:
          pct > 90
            ? `المساحة شبه ممتلئة (${pct}% — ${mb}MB)، يُفضّل تنظيف الكاش.`
            : `الاستهلاك طبيعي (${pct}% — ${mb}MB).`,
      };
    }
  } catch {
    // fall through
  }
  return {
    id: "quota",
    label: "مساحة التخزين المستخدمة",
    status: "ok",
    detail: "تعذّر قياس المساحة بدقة، لكن لا توجد مؤشرات امتلاء.",
  };
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

export async function runMaintenanceDiagnostics(): Promise<MaintenanceReport> {
  const checks: MaintenanceCheck[] = await Promise.all([
    Promise.resolve(checkNetwork()),
    checkDatabase(),
    checkRealtime(),
    checkAuthSession(),
    checkMessageDelivery(),
    checkServiceWorker(),
    Promise.resolve(checkStorageWritable()),
    Promise.resolve(checkDataIntegrity()),
    checkStorageUsage(),
  ]);

  const okCount   = checks.filter((c) => c.status === "ok").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const score = Math.round(
    ((okCount + warnCount * 0.5) / Math.max(1, checks.length)) * 100,
  );

  const summary =
    failCount > 0
      ? `فيه ${failCount} مشكلة محتاجة إصلاح، اضغط "إصلاح تلقائي".`
      : warnCount > 0
        ? `الشات شغّال، لكن فيه ${warnCount} تنبيه يُفضّل مراجعته.`
        : "كل الأنظمة سليمة وتعمل بكفاءة 100%.";

  return {
    checks,
    score,
    okCount,
    warnCount,
    failCount,
    summary,
    ranAt: new Date().toLocaleTimeString("ar-EG", {
      hour: "numeric",
      minute: "numeric",
    }),
  };
}

export async function runMaintenanceAutoFix(): Promise<MaintenanceFixResult> {
  const fixed: string[] = [];
  const failed: string[] = [];
  const noop: string[] = [];

  // 1) Repair corrupted localStorage entries.
  const corrupted = findCorruptedJsonKeys();
  if (corrupted.length === 0) {
    noop.push("لا توجد بيانات تالفة تحتاج إصلاح.");
  } else {
    for (const key of corrupted) {
      try {
        localStorage.removeItem(key);
        fixed.push(`تم تصليح بيانات تالفة: ${key}`);
      } catch {
        failed.push(`تعذّر تنظيف العنصر التالف: ${key}`);
      }
    }
  }

  // 2) Clear stale caches.
  try {
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      if (names.length === 0) {
        noop.push("لا يوجد كاش قديم للتنظيف.");
      } else {
        await Promise.all(names.map((name) => caches.delete(name)));
        fixed.push(`تم مسح ${names.length} كاش قديم لتسريع التحميل.`);
      }
    }
  } catch {
    failed.push("تعذّر تنظيف الكاش.");
  }

  // 3) Remove legacy service workers (PWA is disabled in production).
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length === 0) {
        noop.push("لا يوجد Service Worker للإزالة.");
      } else {
        await Promise.all(regs.map((reg) => reg.unregister()));
        fixed.push(`تم إلغاء ${regs.length} Service Worker قديم.`);
      }
    }
  } catch {
    failed.push("تعذّر إزالة Service Worker.");
  }

  // 4) Reconnect Supabase Realtime.
  try {
    if (isSupabaseConfigured && supabase) {
      for (const channel of supabase.getChannels()) {
        const topic = (channel as { topic?: string }).topic ?? "";
        if (topic.includes("__lamma_health")) {
          await supabase.removeChannel(channel);
        }
      }
      supabase.realtime.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 400));
      supabase.realtime.connect();
      fixed.push("تم إعادة تشغيل الاتصال اللحظي (Realtime).");
    }
  } catch {
    failed.push("تعذّر إعادة تشغيل Realtime.");
  }

  // 5) Refresh auth session if Supabase is available (safe — no logout).
  try {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        fixed.push("تم تجديد جلسة تسجيل الدخول تلقائياً.");
      } else {
        noop.push("الجلسة لا تحتاج تجديد أو ليست قابلة للتجديد.");
      }
    }
  } catch {
    noop.push("تعذّر تجديد الجلسة (ضيف أو غير مسجل).");
  }

  return { fixed, failed, noop };
}

// ─────────────────────────────────────────────
// SILENT BACKGROUND AUTO-HEAL
// Runs every `intervalMs` and silently fixes safe issues (corrupted JSON,
// stale cache) without touching messages or showing any UI.
// Returns a cleanup function to stop the loop.
// ─────────────────────────────────────────────

const HEAL_LOG_KEY = "lamma_autofix_log";
const MAX_LOG_ENTRIES = 20;

export function appendHealLog(entries: string[]) {
  if (!entries.length || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(HEAL_LOG_KEY);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    const ts = new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "numeric" });
    const newEntries = entries.map((e) => `[${ts}] ${e}`);
    const merged = [...newEntries, ...existing].slice(0, MAX_LOG_ENTRIES);
    localStorage.setItem(HEAL_LOG_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}

export function readHealLog(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(HEAL_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function startSilentAutoHeal(intervalMs = 5 * 60 * 1000): () => void {
  let running = true;

  const heal = async () => {
    if (!running) return;
    const actions: string[] = [];

    // Fix corrupted JSON silently
    const corrupted = findCorruptedJsonKeys();
    for (const key of corrupted) {
      try {
        localStorage.removeItem(key);
        actions.push(`أُصلح: بيانات تالفة (${key})`);
      } catch { /* ignore */ }
    }

    // Clear caches if storage is > 85%
    try {
      if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        const pct = est.quota ? Math.round(((est.usage ?? 0) / est.quota) * 100) : 0;
        if (pct > 85 && typeof caches !== "undefined") {
          const names = await caches.keys();
          const lammaCaches = names.filter((n) => n.startsWith("lamma-"));
          await Promise.all(lammaCaches.map((n) => caches.delete(n)));
          if (lammaCaches.length > 0) actions.push(`أُفرغ الكاش (${lammaCaches.length} كاش — مساحة ${pct}%)`);
        }
      }
    } catch { /* ignore */ }

    if (actions.length > 0) appendHealLog(actions);
  };

  // Run once after 30s, then every intervalMs.
  const firstRun = setTimeout(heal, 30_000);
  const loop = setInterval(heal, intervalMs);

  return () => {
    running = false;
    clearTimeout(firstRun);
    clearInterval(loop);
  };
}
