import React, { useMemo, useRef, useState } from "react";
import { ChevronRight, LogIn, Mail, Shield, Sparkles } from "lucide-react";
import LoginScreen from "./LoginScreen";
import { supabase } from "../lib/supabase";

interface SimpleLoginScreenProps {
  onLogin: (
    username: string,
    role: string,
    color: string,
    uid?: string,
    email?: string,
    authProvider?: "supabase" | "guest",
  ) => void;
  primaryTheme: "dark" | "amoled";
  setPrimaryTheme: (theme: "dark" | "amoled") => void;
}

type WallTheme = "fire" | "ice" | "violet";

function generateRandomGuestId() {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `LC_Guest_${num}`;
}

const NICKNAME_COLORS = [
  "#22c55e",
  "#3fb950",
  "#58a6ff",
  "#a371f7",
  "#ef4444",
  "#f59e0b",
];

export default function SimpleLoginScreen({
  onLogin,
  primaryTheme,
  setPrimaryTheme,
}: SimpleLoginScreenProps) {
  const brandName = import.meta.env.VITE_BRAND_NAME || "Lamma Chat";
  const loginHeroBg = import.meta.env.VITE_LOGIN_HERO_BG || "/images/login-hero.jpg";

  const [wallTheme, setWallTheme] = useState<WallTheme>(() => {
    const saved = localStorage.getItem("lamma_wall_theme");
    if (saved === "fire" || saved === "ice" || saved === "violet") return saved;
    return "fire";
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const guestId = useMemo(() => generateRandomGuestId(), []);

  if (showAdvanced) {
    return (
      <LoginScreen
        onLogin={onLogin}
        primaryTheme={primaryTheme}
        setPrimaryTheme={setPrimaryTheme}
      />
    );
  }

  const setWallThemeSafe = (theme: WallTheme) => {
    setWallTheme(theme);
    localStorage.setItem("lamma_wall_theme", theme);
  };

  const [loginError, setLoginError] = useState<string | null>(null);
  const loginErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLoginError = (msg: string) => {
    if (loginErrorTimerRef.current) clearTimeout(loginErrorTimerRef.current);
    setLoginError(msg);
    loginErrorTimerRef.current = setTimeout(() => setLoginError(null), 4500);
  };

  const handleGuestEnter = () => {
    const assignedColor =
      NICKNAME_COLORS[Math.floor(Math.random() * NICKNAME_COLORS.length)];
    onLogin(guestId, "guest", assignedColor, undefined, undefined, "guest");
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      showLoginError("اعدادات Supabase غير مكتملة. تواصل مع المشرف.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) showLoginError(error.message);
  };

  return (
    <div
      className="h-[100dvh] w-full relative overflow-hidden font-sans bg-transparent text-[color:var(--text-primary)]"
      dir="rtl"
      data-lamma-wall={wallTheme}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black lamma-simple-hero">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url("${loginHeroBg}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/28 via-black/12 to-black/32" />
        <div className="absolute inset-0 bg-black/8 backdrop-blur-[0.5px]" />
        <div
          className="absolute left-1/2 top-[6%] h-[18rem] w-[78rem] -translate-x-1/2 rounded-[50%] blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.12) 0%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.05) 38%, transparent 74%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-[-12%] h-[22rem] opacity-55 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 151, 73, 0.08) 0%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.03) 42%, transparent 78%)",
          }}
        />
      </div>

      <div className="relative z-10 h-full w-full flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[520px] rounded-[46px] px-7 py-9 sm:px-10 sm:py-11 text-center lamma-simple-card">
          <img
            src="/images/am-logo.png"
            alt={brandName}
            onError={(e) => {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = "/images/lamma-logo.png";
            }}
            className="mx-auto h-[210px] sm:h-[250px] w-auto object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
            draggable={false}
          />

          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl px-7 py-3 text-[13px] font-black backdrop-blur-xl lamma-simple-brand-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgba(255,222,146,0.85)]" />
            <span>{brandName}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[rgba(255,222,146,0.85)]" />
          </div>

          <button
            type="button"
            onClick={() => setShowOptions(true)}
            className="mt-7 mx-auto w-full max-w-[320px] rounded-2xl px-6 py-3 font-black text-[14px] text-emerald-200 transition-all cursor-pointer relative lamma-simple-cta"
          >
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">
              <ChevronRight size={16} className="rotate-180" />
            </span>
            <span>دوس هنا</span>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-90">
              <Sparkles size={16} />
            </span>
          </button>

          <div className="mt-4 text-[11px] leading-relaxed font-bold text-gray-200/85">
            <div>لمة شات… كل اللي ناقصك في غيره وفرناه.</div>
            <div>عشان اللمة تحلى بكتير وتبقى أسهل وأمتع.</div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setWallThemeSafe("fire")}
              className={`h-2.5 w-2.5 rounded-full transition-all cursor-pointer ${
                wallTheme === "fire"
                  ? "bg-amber-400 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"
                  : "bg-slate-400/60 hover:bg-slate-200/70"
              }`}
              aria-label="Fire"
            />
            <button
              type="button"
              onClick={() => setWallThemeSafe("ice")}
              className={`h-2.5 w-2.5 rounded-full transition-all cursor-pointer ${
                wallTheme === "ice"
                  ? "bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.22)]"
                  : "bg-slate-400/60 hover:bg-slate-200/70"
              }`}
              aria-label="Ice"
            />
            <button
              type="button"
              onClick={() => setWallThemeSafe("violet")}
              className={`h-2.5 w-2.5 rounded-full transition-all cursor-pointer ${
                wallTheme === "violet"
                  ? "bg-violet-400 shadow-[0_0_0_3px_rgba(167,139,250,0.22)]"
                  : "bg-slate-400/60 hover:bg-slate-200/70"
              }`}
              aria-label="Violet"
            />
          </div>

          <div className="mt-6 text-[10px] text-gray-400 font-bold">
            © {new Date().getFullYear()} {brandName}
          </div>
        </div>
      </div>

      {showOptions && (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setShowOptions(false)}
        >
          <div
            className="w-full max-w-4xl rounded-[26px] p-5 text-right lamma-simple-modal-shell"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 lamma-modal-header">
              <h3 className="text-base font-black text-white">مرحباً بيك في {brandName}</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="rounded-full px-3 py-1.5 text-xs text-gray-400 transition-all cursor-pointer lamma-soft-action hover:text-white"
              >
                إغلاق
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[760px] grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-4 lamma-simple-panel">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)]" />
                    <h4 className="text-sm font-black text-white">مواصفات الشات</h4>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">هنظبطها مع بعض</span>
                </div>
                <ul className="space-y-2 text-[11px] text-gray-200/90 font-bold leading-relaxed">
                  <li className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                    اكتب مواصفات الشات اللي عايزها وهنحطها هنا كنقاط.
                  </li>
                  <li className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                    تقدر تبعت: الخصوصية، الغرف، الراديو، المكالمات، الإشعارات، VIP… إلخ.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl p-4 lamma-simple-panel">
                <div className="flex items-center gap-2 mb-3">
                  <LogIn size={16} className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)]" />
                  <h4 className="text-sm font-black text-white">طرق التسجيل</h4>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGuestEnter}
                    className="w-full py-2.5 rounded-2xl font-black text-[12px] transition-all cursor-pointer text-white flex items-center justify-between px-4 lamma-simple-option"
                  >
                    <span>دخول كزائر</span>
                    <ChevronRight size={14} className="rotate-180 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowOptions(false);
                      setShowAdvanced(true);
                    }}
                    className="w-full py-2.5 rounded-2xl font-black text-[12px] transition-all cursor-pointer text-white flex items-center justify-between px-4 lamma-simple-option"
                  >
                    <span className="flex items-center gap-2">
                      <Mail size={14} />
                      دخول / إنشاء حساب
                    </span>
                    <ChevronRight size={14} className="rotate-180 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-2.5 rounded-2xl font-black text-[12px] transition-all cursor-pointer text-white flex items-center justify-between px-4 lamma-simple-option"
                  >
                    <span>متابعة باستخدام Google</span>
                    <ChevronRight size={14} className="rotate-180 opacity-70" />
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {loginError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-2xl text-sm font-bold text-red-300 lamma-glass backdrop-blur-xl shadow-lg max-w-xs text-center"
          style={{ direction: "rtl" }}
        >
          {loginError}
        </div>
      )}
    </div>
  );
}
