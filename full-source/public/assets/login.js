const panel = document.getElementById("panel");
const openOptions = document.getElementById("openOptions");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const installApp = document.getElementById("installApp");

function setView(view) {
  if (!panel) return;
  panel.dataset.view = view;
}

openOptions?.addEventListener("click", () => {
  setView("options");
});

document.addEventListener("click", (e) => {
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
      alert("متابعة Google هتتفعل من داخل التطبيق الأساسي.");
      return;
    }

    if (action === "quick") {
      alert("الدخول السريع هيتفعل من داخل التطبيق الأساسي.");
      return;
    }

    if (action === "share") {
      const url = "https://lamma-chat2026.vercel.app/";
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

loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
});

registerForm?.addEventListener("submit", (e) => {
  e.preventDefault();
});

let deferredInstallPrompt = null;

if (installApp instanceof HTMLButtonElement) {
  installApp.addEventListener("click", async () => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      window.matchMedia?.("(display-mode: minimal-ui)")?.matches;
    if (standalone) {
      installApp.style.display = "none";
      return;
    }

    if (!deferredInstallPrompt) {
      alert('من قائمة المتصفح اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية"');
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installApp instanceof HTMLElement) installApp.style.display = "none";
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
