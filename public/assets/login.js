import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const panel = document.getElementById("panel");
const openOptions = document.getElementById("openOptions");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const emailMethod = document.getElementById("emailMethod");
const emailMethodPanel = document.getElementById("emailMethodPanel");
const emailMethodToggle = document.getElementById("emailMethodToggle");

const AUTH_CONFIG_ENDPOINT = "/api/auth-config";
const APP_ENTRY_PATH = "/index.html";
const GUEST_STORAGE_KEY = "lamma_guest_session";
const GUEST_COLORS = [
  "#22c55e",
  "#3fb950",
  "#58a6ff",
  "#a371f7",
  "#ef4444",
  "#f59e0b",
];

let authContextPromise = null;

function setEmailMethodOpen(nextOpen) {
  if (!(emailMethod instanceof HTMLElement)) return;
  if (!(emailMethodPanel instanceof HTMLElement)) return;
  if (!(emailMethodToggle instanceof HTMLButtonElement)) return;

  emailMethod.classList.toggle("is-open", nextOpen);
  emailMethodPanel.hidden = !nextOpen;
  emailMethodToggle.setAttribute("aria-expanded", String(nextOpen));
}

function getAppEntryUrl(baseUrl = window.location.origin) {
  return new URL(APP_ENTRY_PATH, baseUrl).toString();
}

function redirectToApp(baseUrl) {
  window.location.assign(getAppEntryUrl(baseUrl));
}

function getRandomGuestId() {
  return `LC-Guest${Math.floor(10000 + Math.random() * 90000)}`;
}

function getRandomColor() {
  return GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
}

function deriveNicknameFromEmail(email) {
  const localPart = email.split("@")[0] || "";
  const cleaned = localPart.replace(/[^a-zA-Z0-9_\u0600-\u06FF.-]/g, "").slice(0, 24);
  return cleaned || `Member${Math.floor(1000 + Math.random() * 9000)}`;
}

function getSubmitButton(form) {
  return form?.querySelector('button[type="submit"]') || null;
}

function setButtonLoading(form, loading) {
  const submitButton = getSubmitButton(form);
  if (!(submitButton instanceof HTMLButtonElement)) return;
  const text = submitButton.querySelector(".btnText");
  if (text instanceof HTMLElement) {
    if (!submitButton.dataset.defaultLabel) {
      submitButton.dataset.defaultLabel = text.textContent || "";
    }
    text.textContent = loading ? "جارٍ التنفيذ..." : submitButton.dataset.defaultLabel;
  }
  submitButton.disabled = loading;
  submitButton.setAttribute("aria-busy", String(loading));
}

async function getAuthContext() {
  if (authContextPromise) return authContextPromise;

  authContextPromise = (async () => {
    const response = await fetch(AUTH_CONFIG_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.configured) {
      throw new Error(
        payload?.message || "إعدادات تسجيل الدخول غير مكتملة حاليًا على السيرفر.",
      );
    }

    return {
      appUrl: payload.appUrl || window.location.origin,
      client: createClient(payload.supabaseUrl, payload.supabaseAnonKey),
    };
  })();

  return authContextPromise;
}

async function redirectIfAuthenticated() {
  try {
    const { client, appUrl } = await getAuthContext();
    const {
      data: { session },
    } = await client.auth.getSession();

    if (session?.user) {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      redirectToApp(appUrl);
    }
  } catch (_) {}
}

function setView(view) {
  if (!panel) return;
  panel.dataset.view = view;
}

function saveGuestSession() {
  localStorage.setItem(
    GUEST_STORAGE_KEY,
    JSON.stringify({
      nickname: getRandomGuestId(),
      role: "guest",
      color: getRandomColor(),
      authProvider: "guest",
    }),
  );
}

async function handleGoogleLogin() {
  const { client, appUrl } = await getAuthContext();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAppEntryUrl(appUrl),
    },
  });
  if (error) throw error;
}

function handleQuickGuestLogin() {
  saveGuestSession();
  redirectToApp(window.location.origin);
}

openOptions?.addEventListener("click", () => {
  setView("options");
});

document.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const back = target.closest('[data-action="back"]');
  if (back) {
    setView("main");
    return;
  }

  const emailTab = target.closest("[data-email-tab-btn]");
  if (emailTab instanceof HTMLElement) {
    const tab = emailTab.getAttribute("data-email-tab-btn");
    const wrapper = emailTab.closest(".emailPanel");
    if (wrapper instanceof HTMLElement && (tab === "login" || tab === "register")) {
      wrapper.dataset.emailTab = tab;
    }
    return;
  }

  const actionEl = target.closest("[data-action]");
  if (actionEl instanceof HTMLElement) {
    const action = actionEl.getAttribute("data-action");

    if (action === "google") {
      try {
        await handleGoogleLogin();
      } catch (error) {
        alert(error instanceof Error ? error.message : "تعذر بدء تسجيل الدخول عبر Google.");
      }
      return;
    }

    if (action === "toggle-email") {
      const isOpen = emailMethodToggle?.getAttribute("aria-expanded") === "true";
      setEmailMethodOpen(!isOpen);
      return;
    }

    if (action === "quick") {
      handleQuickGuestLogin();
      return;
    }

    if (action === "share") {
      const url = `${window.location.origin}/`;
      const title = "Lamma Chat";

      if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
        return;
      }

      const write = navigator.clipboard?.writeText?.(url);
      if (write && write instanceof Promise) {
        write.then(
          () => alert("اتنسخ الرابط"),
          () => alert(url),
        );
        return;
      }

      alert(url);
      return;
    }
  }

  const toggle = target.closest("[data-toggle-password]");
  if (toggle) {
    const inputId = toggle.getAttribute("data-toggle-password");
    if (!inputId) return;
    const input = document.getElementById(inputId);
    if (!(input instanceof HTMLInputElement)) return;

    const next = input.type === "password" ? "text" : "password";
    input.type = next;
    toggle.textContent = next === "password" ? "إظهار" : "إخفاء";
  }
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const formData = new FormData(form);
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!identifier) {
    alert("اكتب البريد الإلكتروني أولاً.");
    return;
  }

  if (!password) {
    alert("اكتب كلمة المرور أولاً.");
    return;
  }

  if (!identifier.includes("@")) {
    alert("في النسخة الحالية من الصفحة الثابتة، تسجيل الدخول هنا يدعم البريد الإلكتروني فقط.");
    return;
  }

  setButtonLoading(form, true);
  try {
    const { client, appUrl } = await getAuthContext();
    const { error } = await client.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (error) throw error;

    localStorage.removeItem(GUEST_STORAGE_KEY);
    redirectToApp(appUrl);
  } catch (error) {
    alert(error instanceof Error ? error.message : "فشل تسجيل الدخول.");
  } finally {
    setButtonLoading(form, false);
  }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const password2 = String(formData.get("password2") || "").trim();

  if (!email) {
    alert("اكتب البريد الإلكتروني أولاً.");
    return;
  }

  if (!password) {
    alert("اكتب كلمة المرور أولاً.");
    return;
  }

  if (password.length < 6) {
    alert("كلمة المرور لازم تكون 6 أحرف على الأقل.");
    return;
  }

  if (password !== password2) {
    alert("تأكيد كلمة المرور غير مطابق.");
    return;
  }

  setButtonLoading(form, true);
  try {
    const { client, appUrl } = await getAuthContext();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: deriveNicknameFromEmail(email),
        },
        emailRedirectTo: getAppEntryUrl(appUrl),
      },
    });

    if (error) throw error;

    if (data?.session?.user) {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      redirectToApp(appUrl);
      return;
    }

    const wrapper = form.closest(".emailPanel");
    if (wrapper instanceof HTMLElement) {
      wrapper.dataset.emailTab = "login";
    }
    const loginIdentifier = document.getElementById("loginIdentifier");
    if (loginIdentifier instanceof HTMLInputElement) {
      loginIdentifier.value = email;
    }
    form.reset();
    alert("تم إنشاء الحساب. لو تفعيل البريد مطلوب، راجع بريدك ثم سجّل الدخول.");
  } catch (error) {
    alert(error instanceof Error ? error.message : "فشل إنشاء الحساب.");
  } finally {
    setButtonLoading(form, false);
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

redirectIfAuthenticated();
