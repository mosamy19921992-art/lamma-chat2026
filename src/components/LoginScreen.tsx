import React, { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  RefreshCw,
  Copy,
  Sparkles,
  Share2,
  Zap,
  Hash,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase.ts";

interface LoginScreenProps {
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

// Generate guest IDs like LC-Guest48291
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

export default function LoginScreen({
  onLogin,
  primaryTheme,
  setPrimaryTheme,
}: LoginScreenProps) {
  const brandName = import.meta.env.VITE_BRAND_NAME || "Lamma Chat";
  const brandCredit = import.meta.env.VITE_BRAND_CREDIT || "MR mohamed samy";
  const brandWordmarkSrc = "/images/brand-wordmark.svg";
  const fallbackWordmarkSrc = "/images/lamma-wordmark.svg";

  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(() =>
    localStorage.getItem("lamma_custom_logo_url"),
  );
  const [signupNickname, setSignupNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [showExtraOptions, setShowExtraOptions] = useState(false);
  const [pendingProfileUser, setPendingProfileUser] = useState<any | null>(null);
  const [pendingProfileColor, setPendingProfileColor] = useState<string | null>(
    null,
  );
  const [profileNickname, setProfileNickname] = useState("");
  const [showProfileNicknameModal, setShowProfileNicknameModal] =
    useState(false);

  // Sound feedback preferences
  const [soundOn] = useState(true);

  // Suggested guest ID state
  const [guestId, setGuestId] = useState(generateRandomGuestId());

  // Non-blocking in-app toast notification state
  const [toastMsg, setToastMsg] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (
    text: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setToastMsg({ text, type });
    playBeepSound(
      type === "error" ? 300 : type === "success" ? 800 : 600,
      "sine",
    );
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Stateful share/invite modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const appLink = import.meta.env.VITE_APP_URL || window.location.origin;

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "lamma_custom_logo_url") return;
      setBrandLogoUrl(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleRegenerateGuestId = () => {
    setGuestId(generateRandomGuestId());
    playBeepSound(600, "sine");
  };

  const playBeepSound = (freq = 440, type: OscillatorType = "sine") => {
    if (!soundOn) return;
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  };

  const handleCopyGuestId = () => {
    navigator.clipboard.writeText(guestId);
    playBeepSound(800, "square");
    showToast(`تمام، نسخنا المعرف: ${guestId}`, "success");
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === "signup" && !signupNickname.trim()) {
      showToast("اكتب اسم المستخدم الأول. مش هنعرف نناديك إزاي؟", "error");
      return;
    }
    if (!email.trim()) {
      showToast("نسيت البريد الإلكتروني. خانة فاضية بتزعّل.", "error");
      return;
    }
    if (!password.trim()) {
      showToast("والباسورد؟ مش هتدخل بالنية.", "error");
      return;
    }

    if (!supabase) {
      showToast("⚠️ السيرفر مش جاهز دلوقتي. راجع إعدادات Supabase.", "error");
      return;
    }

    const assignedColor =
      NICKNAME_COLORS[Math.floor(Math.random() * NICKNAME_COLORS.length)];

    setAuthLoading(true);
    const doAuth =
      authMode === "signup"
        ? supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                nickname: signupNickname.trim(),
              },
            },
          })
        : supabase.auth.signInWithPassword({ email: email.trim(), password });

    doAuth
      .then(({ data, error }) => {
        if (error) {
          showToast(error.message || "فشل تسجيل الدخول.", "error");
          return;
        }

        if (authMode === "signup") {
          showToast(
            "✅ الحساب جاهز. لو فيه تأكيد إيميل، روح بصّ في بريدك الأول.",
            "success",
          );
          setAuthMode("login");
          setPassword("");
          setSignupNickname("");
          return;
        }

        if (!data?.user) {
          showToast("فشل تسجيل الدخول.", "error");
          return;
        }

        const metaNick = data.user.user_metadata?.nickname || data.user.user_metadata?.name;
        if (!metaNick) {
          setPendingProfileUser(data.user);
          setPendingProfileColor(assignedColor);
          setProfileNickname("");
          setShowProfileNicknameModal(true);
          showToast("اختار اسم مستخدم علشان نكمّل.", "info");
          return;
        }

        playBeepSound(520, "sine");
        if (!rememberMe) {
          localStorage.removeItem("lamma_user_session");
        }
        onLogin(
          metaNick,
          "user",
          assignedColor,
          data.user.id,
          data.user.email,
          "supabase",
        );
      })
      .finally(() => setAuthLoading(false));
  };

  const handleSaveProfileNickname = async () => {
    const nick = profileNickname.trim();
    if (!nick) {
      showToast("اكتب اسم المستخدم الأول.", "error");
      return;
    }
    if (!supabase || !pendingProfileUser || !pendingProfileColor) {
      showToast("⚠️ إعدادات Supabase غير مكتملة حالياً.", "error");
      return;
    }
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { nickname: nick },
      });
      if (error) {
        showToast(error.message, "error");
        return;
      }
      const user = data.user || pendingProfileUser;
      setShowProfileNicknameModal(false);
      setPendingProfileUser(null);
      setPendingProfileColor(null);
      playBeepSound(520, "sine");
      if (!rememberMe) {
        localStorage.removeItem("lamma_user_session");
      }
      onLogin(
        nick,
        "user",
        pendingProfileColor,
        user.id,
        user.email,
        "supabase",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyLink = () => {
    setShowShareModal(true);
    playBeepSound(480, "sine");
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        setCopiedLink(true);
        playBeepSound(800, "sine");
        setTimeout(() => setCopiedLink(false), 3000);
      } else {
        throw new Error("fallback prompt");
      }
    } catch (err) {
      prompt("يرجى نسخ الرابط يدوياً من المربع أدناه:", text);
    }
  };

  const handleSwiftGuestLogin = async () => {
    const assignedColor =
      NICKNAME_COLORS[Math.floor(Math.random() * NICKNAME_COLORS.length)];

    // Instant local-guest bypass
    playBeepSound(440, "sine");
    showToast("🚀 دخلت كضيف. مفيش التزامات، زي ما بتحب.", "success");
    setTimeout(() => {
      onLogin(guestId, "guest", assignedColor, undefined, undefined, "guest");
    }, 200);
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      if (!supabase) {
        showToast("⚠️ إعدادات Supabase غير مكتملة حالياً.", "error");
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        showToast(error.message, "error");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const featureChips = [
    { label: "غرف فورية", note: "أسرع من ردّك على رسايل أمك" },
    { label: "خصوصية", note: "أسرارك آمنة... على الأقل من جوجل" },
    { label: "مشاركة", note: "ابعت اللينك واقعد استنّى" },
  ];

  return (
    <div
      className="h-[100dvh] w-full relative overflow-hidden font-sans bg-[#f3efe6] text-stone-900"
      dir="rtl"
    >
      {/* Geometric grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(28,25,23,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,25,23,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {/* Floating geometric shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute right-[6%] top-[12%] h-24 w-24 border-2 border-stone-900/15 rounded-2xl"
          animate={{ rotate: [0, 12, 0], y: [0, 14, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-[8%] bottom-[16%] h-16 w-16 rounded-full bg-emerald-500/15"
          animate={{ y: [0, -18, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-[18%] top-[10%] h-0 w-0"
          style={{
            borderLeft: "26px solid transparent",
            borderRight: "26px solid transparent",
            borderBottom: "44px solid rgba(245,158,11,0.18)",
          }}
          animate={{ rotate: [0, -18, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 h-full w-full overflow-y-auto">
        <div className="min-h-full w-full flex items-center justify-center px-4 py-6 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-[28px] border-2 border-stone-900 bg-white shadow-[10px_10px_0_0_#1c1917]"
          >
            {/* Left — geometric ink brand panel */}
            <div className="relative order-2 lg:order-1 overflow-hidden bg-stone-900 text-white p-7 sm:p-9 flex flex-col justify-between min-h-[340px]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "36px 36px",
                }}
              />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full border-[14px] border-emerald-500/30" />
              <div className="pointer-events-none absolute top-8 left-8 h-10 w-10 rotate-45 bg-amber-400/30" />

              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-stone-900 font-black text-lg shadow-[3px_3px_0_0_#000]">
                  ل
                </div>
                <img
                  src={brandLogoUrl || brandWordmarkSrc}
                  alt={brandName}
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.src = fallbackWordmarkSrc;
                  }}
                  className="h-7 w-auto invert opacity-90"
                  draggable={false}
                />
              </div>

              <div className="relative z-10 my-8">
                <h1 className="text-[44px] sm:text-[60px] font-black leading-[0.95] tracking-tight">
                  لَمّــة
                  <span className="block text-emerald-400">شات عربي</span>
                </h1>
                <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-stone-300">
                  سجّل دخول، أو ما تسجّلش، إحنا مش هنزعل... كتير. غرف عامة وخاصّة
                  ودخول سريع من غير فلسفة.
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-1 gap-2">
                {featureChips.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                      <span className="text-[12px] font-black">{c.label}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 truncate">
                      {c.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — form */}
            <div className="order-1 lg:order-2 bg-white p-6 sm:p-8 flex flex-col">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[22px] font-black text-stone-900">
                    {authMode === "signup" ? "حساب جديد" : "أهلاً تاني"}
                  </h2>
                  <p className="mt-1 text-[12px] text-stone-500">
                    {authMode === "signup"
                      ? "خطوة واحدة بس وتبقى واحد مننا."
                      : "ادخل بسرعة قبل ما تغيّر رأيك."}
                  </p>
                </div>
                {/* segmented tabs */}
                <div className="flex items-center gap-1 rounded-xl border-2 border-stone-900 p-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      authMode === "login"
                        ? "bg-stone-900 text-white"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    دخول
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      authMode === "signup"
                        ? "bg-stone-900 text-white"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    جديد
                  </button>
                </div>
              </div>

              <form onSubmit={handleFormLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email-field"
                    className="block text-[11px] font-black text-stone-700 text-right"
                  >
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 pointer-events-none">
                      <Mail size={16} />
                    </span>
                    <input
                      id="email-field"
                      name="email"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pr-11 pl-4 py-2.5 rounded-xl text-[13px] text-stone-900 bg-stone-50 border-2 border-stone-200 transition-all text-left placeholder-stone-400 focus:outline-none focus:border-stone-900"
                      placeholder="example@email.com"
                      autoComplete="email"
                      dir="ltr"
                    />
                  </div>
                </div>

                {authMode === "signup" && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="nickname-field"
                      className="block text-[11px] font-black text-stone-700 text-right"
                    >
                      اسم المستخدم
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 pointer-events-none">
                        <Hash size={16} />
                      </span>
                      <input
                        id="nickname-field"
                        name="nickname"
                        type="text"
                        required
                        value={signupNickname}
                        onChange={(e) => setSignupNickname(e.target.value)}
                        className="w-full pr-11 pl-4 py-2.5 rounded-xl text-[13px] text-stone-900 bg-stone-50 border-2 border-stone-200 transition-all text-right placeholder-stone-400 focus:outline-none focus:border-stone-900"
                        placeholder="مثال: لَمّة_محمد"
                        autoComplete="nickname"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="password-field"
                    className="block text-[11px] font-black text-stone-700 text-right"
                  >
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 pointer-events-none">
                      <Lock size={16} />
                    </span>
                    <input
                      id="password-field"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pr-11 pl-12 py-2.5 rounded-xl text-[13px] text-stone-900 bg-stone-50 border-2 border-stone-200 transition-all text-left placeholder-stone-400 focus:outline-none focus:border-stone-900"
                      autoComplete="current-password"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 hover:text-stone-900 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-0.5 select-none">
                  <label
                    htmlFor="rememberMe"
                    className="flex items-center gap-2 cursor-pointer text-stone-600 hover:text-stone-900"
                  >
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 accent-emerald-600 focus:ring-0"
                    />
                    <span className="font-black">افتكرني</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const targetEmail = email.trim();
                      if (!targetEmail) {
                        showToast("اكتب البريد الأول، بعدين ننسى سوا.", "error");
                        return;
                      }
                      if (!supabase) {
                        showToast(
                          "⚠️ إعدادات Supabase غير مكتملة حالياً.",
                          "error",
                        );
                        return;
                      }
                      setAuthLoading(true);
                      supabase.auth
                        .resetPasswordForEmail(targetEmail, {
                          redirectTo: window.location.origin,
                        })
                        .then(({ error }) => {
                          if (error) {
                            showToast(error.message, "error");
                            return;
                          }
                          showToast(
                            "📧 بعتنا رسالة إعادة التعيين. روح بصّ في بريدك.",
                            "success",
                          );
                        })
                        .finally(() => setAuthLoading(false));
                    }}
                    className="font-black text-stone-500 underline decoration-stone-300 underline-offset-4 hover:text-stone-900 transition-colors"
                  >
                    نسيت الباسورد؟ بننسى كمان.
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer bg-emerald-500 text-stone-900 border-2 border-stone-900 shadow-[4px_4px_0_0_#1c1917] hover:shadow-[2px_2px_0_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0_0_#1c1917] disabled:translate-x-0 disabled:translate-y-0"
                >
                  <span>
                    {authLoading
                      ? "ثانية واحدة..."
                      : authMode === "signup"
                        ? "يلا، اعمل الحساب"
                        : "يلا بينا"}
                  </span>
                  <ChevronRight size={16} className="rotate-180" />
                </button>

                <p className="text-[10px] text-stone-400 leading-relaxed text-center">
                  بالضغط هنا أنت موافق على كل حاجة من غير ما تقراها (زي الكل).
                </p>
              </form>

              <div className="flex items-center gap-3 my-3 text-stone-400 text-[10px] font-bold">
                <span className="flex-1 h-[2px] bg-stone-200" />
                <span>أو</span>
                <span className="flex-1 h-[2px] bg-stone-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 rounded-xl text-[12px] font-black flex items-center justify-between px-4 transition-all text-stone-800 bg-white border-2 border-stone-900 shadow-[3px_3px_0_0_#1c1917] hover:shadow-[1px_1px_0_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285f4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34a853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#fbbc05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#ea4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 11.99 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>كمّل بـ Google (للكسلانين)</span>
                </div>
                <ChevronRight size={13} className="rotate-180 opacity-50" />
              </button>

              <button
                type="button"
                onClick={() => setShowExtraOptions(true)}
                className="mt-2 w-full py-2.5 rounded-xl text-[12px] font-black text-stone-600 hover:text-stone-900 transition-all flex items-center justify-between px-4 bg-stone-50 border-2 border-stone-200 hover:border-stone-900"
              >
                <span>خيارات الكسل (دخول كضيف ومشاركة)</span>
                <ChevronRight size={13} className="rotate-180 opacity-50" />
              </button>

              <div className="mt-5 space-y-2 text-center">
                <div className="text-[10px] text-stone-400 font-bold">
                  © {new Date().getFullYear()} {brandName}. كل الحقوق محفوظة
                  (وكمان مش هتقدر).
                </div>
                <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-amber-300 px-3 py-1 text-[9px] font-black text-stone-900">
                  صناعة وتوقيع:
                  <strong>{brandCredit}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key={toastMsg.text}
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-4 left-1/2 z-[100001] w-[min(92vw,420px)]"
          >
            <div
              className={`flex items-center gap-2.5 rounded-xl border-2 border-stone-900 px-4 py-3 text-[12px] font-black shadow-[4px_4px_0_0_#1c1917] ${
                toastMsg.type === "success"
                  ? "bg-emerald-300 text-stone-900"
                  : toastMsg.type === "error"
                    ? "bg-red-300 text-stone-900"
                    : "bg-amber-200 text-stone-900"
              }`}
            >
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : toastMsg.type === "error" ? (
                <AlertTriangle size={16} className="shrink-0" />
              ) : (
                <Info size={16} className="shrink-0" />
              )}
              <span className="flex-1 leading-snug">{toastMsg.text}</span>
              <button
                type="button"
                onClick={() => setToastMsg(null)}
                className="shrink-0 text-stone-700 hover:text-stone-900"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileNicknameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[24px] p-6 text-right relative my-8 bg-white border-2 border-stone-900 shadow-[8px_8px_0_0_#1c1917]"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <h3 className="text-base font-black text-stone-900">
                    اختار اسمك
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowProfileNicknameModal(false);
                    setPendingProfileUser(null);
                    setPendingProfileColor(null);
                    if (supabase) supabase.auth.signOut();
                    showToast("تمام، رجّعناك ورا.", "info");
                  }}
                  className="text-xs text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-lg border-2 border-stone-200 hover:border-stone-900 transition-all cursor-pointer font-black"
                  disabled={authLoading}
                >
                  إلغاء
                </button>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                علشان نناديك باسمك مش بإيميلك، اكتب اسم مستخدم واحد وهنحفظه.
              </p>

              <div className="mt-3 space-y-1.5">
                <label
                  htmlFor="profile-nickname-input"
                  className="block text-[11px] text-stone-700 font-black mb-1"
                >
                  اسم المستخدم:
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 pointer-events-none">
                    <Hash size={16} />
                  </span>
                  <input
                    id="profile-nickname-input"
                    type="text"
                    value={profileNickname}
                    onChange={(e) => setProfileNickname(e.target.value)}
                    className="w-full pr-11 pl-4 py-2.5 rounded-xl text-[13px] text-stone-900 bg-stone-50 border-2 border-stone-200 transition-all text-right focus:outline-none focus:border-stone-900"
                    placeholder="مثال: لَمّة_محمد"
                    autoComplete="nickname"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfileNickname}
                disabled={authLoading}
                className="mt-4 w-full py-3 rounded-xl font-black text-xs transition-all cursor-pointer bg-emerald-500 text-stone-900 border-2 border-stone-900 shadow-[4px_4px_0_0_#1c1917] hover:shadow-[2px_2px_0_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                احفظ وكمّل
              </button>
            </motion.div>
          </motion.div>
        )}

        {showExtraOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99998] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
            onClick={() => setShowExtraOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative my-8 w-full max-w-lg rounded-[24px] p-5 text-right bg-white border-2 border-stone-900 shadow-[8px_8px_0_0_#1c1917] max-h-[min(82vh,760px)] overflow-y-auto"
            >
              <div className="mb-4 flex items-center justify-between pb-4 border-b-2 border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  <h3 className="text-base font-black text-stone-900">
                    خيارات الكسل
                  </h3>
                </div>
                <button
                  onClick={() => setShowExtraOptions(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-stone-500 transition-all cursor-pointer border-2 border-stone-200 hover:border-stone-900 hover:text-stone-900 font-black"
                >
                  إغلاق
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-4 bg-stone-50 border-2 border-stone-200">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border-2 border-stone-900 bg-emerald-300 px-2.5 py-1">
                      <Sparkles size={13} className="text-stone-900" />
                      <span className="text-[11px] font-black text-stone-900">
                        دخول فوري بدون تفكير
                      </span>
                    </div>
                    <span className="rounded-full border-2 border-stone-900 bg-amber-300 px-2 py-0.5 text-[9px] font-black text-stone-900">
                      تلقائي
                    </span>
                  </div>

                  <p className="mb-3 text-right text-[11px] text-stone-600 leading-relaxed">
                    هنجهّزلك اسم زائر وتدخل فورًا. لا تسجيل، لا التزام، لا حتى
                    "إزيك".
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
                    <div className="flex justify-center sm:col-span-3">
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-stone-900 bg-white text-2xl shadow-[3px_3px_0_0_#1c1917]">
                        <span>🤖</span>
                        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-9">
                      <div className="flex items-center gap-1.5">
                        <input
                          id="guest-id-display"
                          name="guestId"
                          type="text"
                          readOnly
                          value={guestId}
                          className="flex-1 rounded-xl px-2.5 py-2 text-center text-[12px] font-mono text-stone-700 bg-white border-2 border-stone-200 focus:outline-none"
                          autoComplete="off"
                        />

                        <button
                          type="button"
                          onClick={handleCopyGuestId}
                          className="rounded-lg p-2 text-stone-500 transition-all border-2 border-stone-200 hover:border-stone-900 hover:text-stone-900"
                          title="نسخ المعرف"
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={handleRegenerateGuestId}
                          className="group rounded-lg p-2 text-stone-500 transition-all border-2 border-stone-200 hover:border-stone-900 hover:text-stone-900"
                          title="توليد معرف جديد"
                        >
                          <RefreshCw
                            size={13}
                            className="transition-transform duration-500 group-hover:rotate-180"
                          />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowExtraOptions(false);
                          handleSwiftGuestLogin();
                        }}
                        className="w-full rounded-xl py-2.5 text-[12px] font-black cursor-pointer transition-all bg-emerald-500 text-stone-900 border-2 border-stone-900 shadow-[3px_3px_0_0_#1c1917] hover:shadow-[1px_1px_0_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px]"
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <Zap size={14} />
                          <span>ادخل بالاسم ده على طول</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  {import.meta.env.DEV && !supabase ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          const assignedColor =
                            NICKNAME_COLORS[
                              Math.floor(Math.random() * NICKNAME_COLORS.length)
                            ];
                          setShowExtraOptions(false);
                          onLogin(
                            guestId,
                            "owner",
                            assignedColor,
                            undefined,
                            undefined,
                            "guest",
                          );
                        }}
                        className="cursor-pointer rounded-xl border-2 border-stone-900 bg-red-200 py-2 text-xs font-black text-stone-900 transition-all hover:bg-red-300"
                      >
                        👑 دخول كمالك (Demo)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const assignedColor =
                            NICKNAME_COLORS[
                              Math.floor(Math.random() * NICKNAME_COLORS.length)
                            ];
                          setShowExtraOptions(false);
                          onLogin(
                            guestId,
                            "admin",
                            assignedColor,
                            undefined,
                            undefined,
                            "guest",
                          );
                        }}
                        className="cursor-pointer rounded-xl border-2 border-stone-900 bg-blue-200 py-2 text-xs font-black text-stone-900 transition-all hover:bg-blue-300"
                      >
                        🛡️ دخول كأدمن (Demo)
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    id="continue-as-guest-btn"
                    name="continueAsGuest"
                    onClick={() => {
                      setShowExtraOptions(false);
                      handleSwiftGuestLogin();
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[12px] font-black text-stone-900 transition-all shadow-[3px_3px_0_0_#1c1917] hover:shadow-[1px_1px_0_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px]"
                  >
                    <span>متابعة كضيف</span>
                    <ChevronRight size={13} className="rotate-180 opacity-50" />
                  </button>

                  <button
                    type="button"
                    id="copy-app-link-btn"
                    name="copyAppLink"
                    onClick={() => {
                      setShowExtraOptions(false);
                      handleCopyLink();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-stone-200 bg-stone-50 px-4 py-2.5 text-[11px] font-black text-stone-600 transition-all hover:border-stone-900 hover:text-stone-900"
                  >
                    <Share2 size={12} />
                    <span>هات اللينك بتاعي</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[24px] p-6 text-right relative my-8 bg-white border-2 border-stone-900 shadow-[8px_8px_0_0_#1c1917]"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <h3 className="text-base font-black text-stone-900">
                    شارك لمة (وخلّي الزحمة تيجي)
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setCopiedLink(false);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-900 border-2 border-stone-200 hover:border-stone-900 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black"
                >
                  إغلاق
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-stone-600 leading-relaxed">
                  💡{" "}
                  <strong className="text-emerald-600 font-black">
                    ليه لمة مش بيظهر في جوجل؟
                  </strong>
                  <br />
                  لأن اللي على جوجل بيتفضح. لمة بيشتغل بخصوصية ومشفّر، ومحركات
                  البحث مش بتأرشف الروابط دي علشان غرفتك تفضل سرّ بينكم.
                </p>

                <div className="p-3 rounded-xl bg-stone-50 border-2 border-stone-200">
                  <label
                    htmlFor="share-app-link-input"
                    className="block text-[10px] text-stone-500 font-black mb-1.5"
                  >
                    رابط الدخول المباشر للغرفة:
                  </label>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => {
                        const u = appLink;
                        try {
                          if (
                            navigator.clipboard &&
                            navigator.clipboard.writeText
                          ) {
                            navigator.clipboard
                              .writeText(u)
                              .then(() => {
                                setCopiedLink(true);
                                playBeepSound(800, "sine");
                                setTimeout(() => setCopiedLink(false), 3000);
                              })
                              .catch(() => fallbackCopy(u));
                          } else {
                            fallbackCopy(u);
                          }
                        } catch (err) {
                          fallbackCopy(u);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-lg font-black text-xs transition-all flex-shrink-0 cursor-pointer border-2 border-stone-900 ${
                        copiedLink
                          ? "bg-emerald-300 text-stone-900"
                          : "bg-emerald-500 text-stone-900 shadow-[3px_3px_0_0_#1c1917] hover:shadow-[1px_1px_0_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px]"
                      }`}
                    >
                      {copiedLink ? "✅ اتنسخ!" : "إسحب الرابط"}
                    </button>
                    <input
                      id="share-app-link-input"
                      type="text"
                      readOnly
                      value={appLink}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                      }}
                      className="w-full rounded-lg p-2 text-center text-xs text-stone-700 font-mono select-all focus:outline-none bg-white border-2 border-stone-200"
                    />
                  </div>
                  <span className="block text-[9px] text-stone-400 mt-1.5">
                    💡 لو الزرار مش راضي ينسخ (المتصفح بيدلّع)، اضغط جوه المربع
                    وحدّد العنوان وانسخه بإيدك.
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-xl text-center bg-stone-50 border-2 border-stone-200">
                  <span className="text-[10px] text-stone-500 font-black mb-2">
                    أو صوّب كاميرا الموبايل ناحية الكود ده وادخل فورًا:
                  </span>
                  <div className="bg-white p-2.5 rounded-2xl inline-block border-2 border-stone-900">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(appLink)}`}
                      alt="QR Code"
                      className="w-[140px] h-[140px]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[9px] text-emerald-600 mt-2 font-black">
                    🟢 اتصال مباشر آمن ومفعّل بالكامل
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
