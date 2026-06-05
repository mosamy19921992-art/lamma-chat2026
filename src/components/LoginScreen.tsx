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

const NICKNAME_ADJECTIVES = [
  "Shadow",
  "Luna",
  "Neon",
  "Void",
  "Solar",
  "Glitch",
  "Alpha",
  "Cyber",
  "Hunter",
];
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
  type WallTheme = "fire" | "ice" | "violet";
  const brandName = import.meta.env.VITE_BRAND_NAME || "Lamma Chat";
  const brandCredit = import.meta.env.VITE_BRAND_CREDIT || "MR mohamed samy";
  const brandMarkSrc = "/images/brand-mark.png";
  const brandWordmarkSrc = "/images/brand-wordmark.svg";
  const fallbackMarkSrc = "/images/lamma-logo.png";
  const fallbackWordmarkSrc = "/images/lamma-wordmark.svg";
  const loginHeroBg =
    import.meta.env.VITE_LOGIN_HERO_BG ||
    "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=bright%20modern%20office%20setting%20with%20a%20diverse%20group%20of%20professionals%20collaborating%20around%20computers%2C%20smiling%20and%20pointing%20at%20screens%2C%20with%20futuristic%20digital%20network%20overlays%20and%20floating%20tech%20nodes%2C%20high%20quality%2C%20realistic%20photography&image_size=landscape_16_9";

  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(() =>
    localStorage.getItem("lamma_custom_logo_url"),
  );
  const [wallTheme, setWallTheme] = useState<WallTheme>(() => {
    const saved = localStorage.getItem("lamma_wall_theme");
    if (saved === "fire" || saved === "ice" || saved === "violet") return saved;
    return "fire";
  });
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
  const [soundOn, setSoundOn] = useState(true);

  // Suggested guest ID state
  const [guestId, setGuestId] = useState(generateRandomGuestId());

  // Show a greeting banner toast at the top right of the screen
  const [showSuccessToast, setShowSuccessToast] = useState(true);

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

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "lamma_wall_theme") return;
      const v = e.newValue;
      if (v === "fire" || v === "ice" || v === "violet") setWallTheme(v);
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
    showToast(`تم نسخ اسم المعرف بنجاح: ${guestId}`, "success");
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === "signup" && !signupNickname.trim()) {
      showToast("اكتب اسم المستخدم الأول.", "error");
      return;
    }
    if (!email.trim()) {
      showToast("اكتب البريد الإلكتروني الأول.", "error");
      return;
    }
    if (!password.trim()) {
      showToast("اكتب كلمة المرور الأول.", "error");
      return;
    }

    if (!supabase) {
      showToast("⚠️ إعدادات السيرفر غير مكتملة حالياً. راجع إعدادات Supabase.", "error");
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
            "✅ تم إنشاء الحساب. لو مشروع Supabase مفعل تأكيد الإيميل، راجع بريدك وبعدين سجل دخول.",
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
          showToast("اختار اسم مستخدم للمتابعة.", "info");
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
    showToast("🚀 تم الدخول السريع بأمان بوضع الزائر المحلي!", "success");
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

  return (
    <div
      className="h-[100dvh] w-full relative overflow-hidden font-sans bg-transparent text-[color:var(--text-primary)] lamma-fire-frame lamma-fire-frame-app"
      dir="rtl"
      data-lamma-wall={wallTheme}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url("${loginHeroBg}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-900/50 to-black/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
        <motion.div
          className="absolute left-1/2 top-[6%] h-[18rem] w-[78rem] -translate-x-1/2 rounded-[50%] blur-3xl opacity-80"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.14) 0%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.06) 38%, transparent 74%)",
          }}
          animate={{ x: [-24, 22, -24], scaleX: [1, 1.05, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-[18%] h-[14rem] w-[64rem] -translate-x-1/2 rounded-[50%] blur-[88px] opacity-75"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.04) 20%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.12) 50%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.04) 80%, transparent 100%)",
          }}
          animate={{ x: [30, -26, 30], y: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[9%] top-[10%] h-40 w-40 rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 131, 61, 0.22) 0%, rgba(255, 131, 61, 0.08) 35%, transparent 72%)",
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.52, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-x-0 bottom-[-10%] h-[20rem] opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 151, 73, 0.08) 0%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.03) 42%, transparent 78%)",
          }}
        />
      </div>

      <div className="relative z-10 h-full w-full overflow-y-auto lg:overflow-hidden">
        <div className="min-h-full w-full flex items-center justify-center px-4 py-6 sm:py-8 lg:py-10">
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] lg:h-[min(86dvh,760px)] gap-4 sm:gap-5 lg:gap-6 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="relative overflow-hidden rounded-[34px] p-5 sm:p-6 md:p-7 lamma-login-art-frame lamma-column-frame h-full min-h-0"
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-32 -right-40 h-[26rem] w-[26rem] rounded-full blur-3xl opacity-60"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.16) 0%, rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.06) 42%, transparent 72%)",
                  }}
                />
                <div className="absolute -bottom-36 -left-44 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-50"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(59, 130, 246, 0.16) 0%, rgba(59, 130, 246, 0.06) 40%, transparent 72%)",
                  }}
                />
              </div>

              <div className="relative z-10">
                <div className="rounded-[34px] border border-white/10 bg-black/25 shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-2xl overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
                  <div className="flex items-center justify-center">
                    <img
                      src={brandMarkSrc}
                      alt={brandName}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = null;
                        img.src = fallbackMarkSrc;
                      }}
                      className="h-[240px] w-[120%] max-w-none object-contain object-center sm:h-[300px] md:h-[340px] scale-[1.12]"
                      draggable={false}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <div className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[10px] font-black border border-white/10 bg-black/25 text-gray-100 backdrop-blur-xl">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          "rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.95)",
                      }}
                    />
                    <span>دخول محترم وواضح من أول مرة</span>
                  </div>

                  <div className="rounded-full px-4 py-2 text-[10px] font-black flex items-center justify-center gap-2 lamma-gold-signature">
                    <span>البطاقة الذهبية</span>
                    <strong>{brandCredit}</strong>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-gray-200">
                      🛡️ خصوصية
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-gray-200">
                      ⚡ غرف فورية
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-gray-200">
                      🔗 مشاركة
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-6 flex flex-col gap-3">
                <h1 className="text-[22px] sm:text-[26px] md:text-[30px] font-black leading-tight text-white">
                  شات عربي سريع وآمن
                </h1>
                <p className="text-[12px] sm:text-[13px] leading-relaxed text-gray-200/90">
                  غرف عامة وخاصّة، ودخول سريع من غير خطوات كتير. نفس ستايل الشات من
                  أول صفحة.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-white">
                        غرف فورية
                      </span>
                      <Zap size={14} className="text-white/80" />
                    </div>
                    <p className="mt-1 text-[9px] leading-relaxed text-gray-300">
                      ادخل أو اعمل حساب… وبعدها شات مباشر.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-white">
                        خصوصية أعلى
                      </span>
                      <Lock size={14} className="text-white/80" />
                    </div>
                    <p className="mt-1 text-[9px] leading-relaxed text-gray-300">
                      تسجيل منظم + Google + ضيف من غير ما يبوّظ الشكل.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="w-full flex flex-col h-full relative"
            >
              <div
                className={`w-full h-auto relative rounded-[34px] p-5 sm:p-6 md:p-7 overflow-hidden transition-all duration-300 flex flex-col shadow-[0_18px_70px_rgba(0,0,0,0.55)] lamma-login-shell lamma-column-frame ${
                  primaryTheme === "amoled" ? "bg-black/40" : ""
                }`}
              >
                <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.7)] to-transparent" />

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-col">
                    <img
                      src={brandLogoUrl || brandWordmarkSrc}
                      alt={brandName}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = null;
                        img.src = fallbackWordmarkSrc;
                      }}
                      className="w-[112px] sm:w-[128px] drop-shadow-xl"
                      draggable={false}
                    />
                    <h2 className="mt-2 m-0 text-[18px] sm:text-[20px] font-black text-white">
                      {authMode === "signup" ? "إنشاء حساب" : "تسجيل الدخول"}
                    </h2>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-gray-300 leading-relaxed">
                      {authMode === "signup"
                        ? "خطوة واحدة وتبدأ معانا."
                        : "دخول سريع ومرتب من غير ما يطول المشهد."}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 rounded-full p-1 border border-white/10 bg-black/25 backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
                        authMode === "login"
                          ? "bg-white/10 text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
                          : "text-gray-300 hover:text-white"
                      }`}
                    >
                      دخول
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
                        authMode === "signup"
                          ? "bg-white/10 text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
                          : "text-gray-300 hover:text-white"
                      }`}
                    >
                      حساب جديد
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-y-auto pr-1">
                  <form onSubmit={handleFormLogin} className="space-y-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="email-field"
                      className="block text-[10px] font-black text-gray-300 mr-1 text-right"
                    >
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] pointer-events-none">
                        <Mail size={16} />
                      </span>
                      <input
                        id="email-field"
                        name="email"
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pr-11 pl-4 py-2.5 rounded-2xl text-[12px] focus:outline-none text-white transition-all text-left placeholder-gray-400 lamma-input-shell"
                        placeholder="example@email.com"
                        autoComplete="email"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {authMode === "signup" && (
                    <div className="space-y-1">
                      <label
                        htmlFor="nickname-field"
                        className="block text-[10px] font-black text-gray-300 mr-1 text-right"
                      >
                        اسم المستخدم
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] pointer-events-none">
                          <Hash size={16} />
                        </span>
                        <input
                          id="nickname-field"
                          name="nickname"
                          type="text"
                          required
                          value={signupNickname}
                          onChange={(e) => setSignupNickname(e.target.value)}
                          className="w-full pr-11 pl-4 py-2.5 rounded-2xl text-[12px] focus:outline-none text-white transition-all text-right placeholder-gray-400 lamma-input-shell"
                          placeholder="مثال: لَمّة_محمد"
                          autoComplete="nickname"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label
                      htmlFor="password-field"
                      className="block text-[10px] font-black text-gray-300 mr-1 text-right"
                    >
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] pointer-events-none">
                        <Lock size={16} />
                      </span>
                      <input
                        id="password-field"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-11 pl-12 py-2.5 rounded-2xl text-[12px] focus:outline-none text-white transition-all text-left placeholder-gray-400 lamma-input-shell"
                        autoComplete="current-password"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 hover:text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-0.5 select-none">
                    <label
                      htmlFor="rememberMe"
                      className="flex items-center gap-2 cursor-pointer text-gray-200 hover:text-white"
                    >
                      <input
                        id="rememberMe"
                        name="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] bg-black/50 text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] accent-[rgb(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b))] focus:ring-0"
                      />
                      <span className="font-black">تذكرني</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        const targetEmail = email.trim();
                        if (!targetEmail) {
                          showToast("اكتب البريد الإلكتروني الأول.", "error");
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
                              "📧 تم إرسال رسالة إعادة تعيين كلمة المرور. راجع بريدك.",
                              "success",
                            );
                          })
                          .finally(() => setAuthLoading(false));
                      }}
                      className="px-3 py-1.5 rounded-full font-black transition-all lamma-login-soft-link"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 text-white rounded-2xl font-black text-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed lamma-primary-btn"
                  >
                    <span>
                      {authLoading
                        ? "جاري التنفيذ..."
                        : authMode === "signup"
                          ? "إنشاء حساب"
                          : "تسجيل الدخول"}
                    </span>
                    <ChevronRight size={16} className="rotate-180" />
                  </button>

                  <p className="text-[9px] text-gray-400 leading-relaxed text-center">
                    بالضغط على المتابعة أنت توافق على سياسة الاستخدام والخصوصية
                    الخاصة بالمشروع.
                  </p>
                  </form>

                <div className="flex items-center gap-2 my-3 text-gray-400 text-[9px] font-bold">
                  <span className="flex-1 h-[1px] bg-gradient-to-l from-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] to-transparent" />
                  <span>أو</span>
                  <span className="flex-1 h-[1px] bg-gradient-to-r from-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] to-transparent" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2 rounded-2xl text-[12px] font-black flex items-center justify-between px-4 transition-all text-gray-200 hover:text-white bg-black/20 hover:bg-black/40 border border-white/10 backdrop-blur-md"
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
                    <span>متابعة باستخدام Google</span>
                  </div>
                  <ChevronRight size={13} className="rotate-180 opacity-60" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowExtraOptions(true)}
                  className="mt-2 w-full py-2 rounded-2xl text-[12px] font-black text-gray-200 hover:text-white transition-all flex items-center justify-between px-4 bg-black/20 hover:bg-black/40 border border-white/10 backdrop-blur-md"
                >
                  <span>خيارات إضافية</span>
                  <ChevronRight size={13} className="rotate-180 opacity-60" />
                </button>
                </div>

              <div className="mt-3 space-y-1 text-center">
                <div className="text-[10px] text-gray-400/80 font-bold">
                  © {new Date().getFullYear()} {brandName}. جميع الحقوق محفوظة
                </div>
                <div className="mx-auto inline-flex max-w-full rounded-full px-3 py-1 text-[8px] font-semibold lamma-footer-credit">
                  توثيق وهوية خاصة:{" "}
                  <strong className="mr-1">{brandCredit}</strong>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showProfileNicknameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[28px] p-6 text-right relative my-8 lamma-modal-shell"
            >
              <div className="flex items-center justify-between pb-4 mb-4 lamma-modal-header">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.95)] animate-pulse" />
                  <h3 className="text-base font-black text-white">
                    اختيار اسم المستخدم
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowProfileNicknameModal(false);
                    setPendingProfileUser(null);
                    setPendingProfileColor(null);
                    if (supabase) supabase.auth.signOut();
                    showToast("تم إلغاء الدخول.", "info");
                  }}
                  className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition-all cursor-pointer lamma-soft-action"
                  disabled={authLoading}
                >
                  إلغاء
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                علشان يظهر اسمك بدل الإيميل، اكتب اسم مستخدم واحد وهنحفظه على
                الحساب.
              </p>

              <div className="mt-3 space-y-1">
                <label
                  htmlFor="profile-nickname-input"
                  className="block text-[10px] text-gray-400 font-bold mb-1.5"
                >
                  اسم المستخدم:
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] pointer-events-none">
                    <Hash size={16} />
                  </span>
                  <input
                    id="profile-nickname-input"
                    type="text"
                    value={profileNickname}
                    onChange={(e) => setProfileNickname(e.target.value)}
                    className="w-full pr-11 pl-4 py-2 rounded-2xl text-[11px] focus:outline-none text-white transition-all text-right lamma-input-shell"
                    placeholder="مثال: لَمّة_محمد"
                    autoComplete="nickname"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfileNickname}
                disabled={authLoading}
                className="mt-4 w-full py-2.5 rounded-lg font-black text-xs transition-all cursor-pointer text-white disabled:opacity-60 disabled:cursor-not-allowed lamma-feature-primary"
              >
                حفظ
              </button>
            </motion.div>
          </motion.div>
        )}

        {showExtraOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setShowExtraOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative my-8 w-full max-w-lg rounded-[28px] p-5 text-right lamma-modal-shell max-h-[min(82vh,760px)] overflow-y-auto"
            >
              <div className="mb-4 flex items-center justify-between pb-4 lamma-modal-header">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.95)]" />
                  <h3 className="text-base font-black text-white">
                    خيارات إضافية
                  </h3>
                </div>
                <button
                  onClick={() => setShowExtraOptions(false)}
                  className="rounded-full px-3 py-1.5 text-xs text-gray-400 transition-all cursor-pointer lamma-soft-action hover:text-white"
                >
                  إغلاق
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-3 lamma-section-card">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full px-2.5 py-1 lamma-login-highlight">
                      <Sparkles
                        size={13}
                        className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] animate-pulse"
                      />
                      <span className="text-[11px] font-black text-white">
                        دخول سريع باستخدام {brandName}
                      </span>
                    </div>
                    <span className="rounded-full bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] px-2 py-0.5 text-[9px] font-bold text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)]">
                      تلقائي
                    </span>
                  </div>

                  <p className="mb-3 text-right text-[10px] lamma-login-subtext">
                    هيتجهز لك اسم زائر تلقائي وتدخل فورًا من غير زحمة أو خطوات كتير.
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
                    <div className="flex justify-center sm:col-span-3">
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-[0_0_12px_rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] lamma-login-orb">
                        <span>🤖</span>
                        <span className="absolute bottom-1 right-1 h-2.5 w-2.5 animate-pulse rounded-full border border-black bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)]" />
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
                          className="flex-1 rounded-xl px-2.5 py-1.5 text-center text-[11px] font-mono text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] focus:outline-none lamma-input-shell"
                          autoComplete="off"
                        />

                        <button
                          type="button"
                          onClick={handleCopyGuestId}
                          className="rounded-lg p-2 text-gray-400 transition-all lamma-muted-btn hover:text-white"
                          title="نسخ المعرف"
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={handleRegenerateGuestId}
                          className="group rounded-lg p-2 text-gray-400 transition-all lamma-muted-btn hover:text-white"
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
                        className="w-full rounded-xl py-2 text-[11px] font-black cursor-pointer transition-all lamma-primary-btn"
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <Zap size={14} />
                          <span>دخول مباشر بالاسم المقترح</span>
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
                        className="cursor-pointer rounded-xl border border-red-500/20 bg-red-500/5 py-2 text-xs font-black text-red-300 transition-all hover:border-red-500/60 hover:bg-red-500/15 hover:text-white"
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
                        className="cursor-pointer rounded-xl border border-blue-500/20 bg-blue-500/5 py-2 text-xs font-black text-blue-200 transition-all hover:border-blue-500/60 hover:bg-blue-500/15 hover:text-white"
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
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-black text-white transition-all backdrop-blur-md hover:bg-black/40"
                  >
                    <span>متابعة كضيف</span>
                    <ChevronRight size={13} className="rotate-180 opacity-60" />
                  </button>

                  <button
                    type="button"
                    id="copy-app-link-btn"
                    name="copyAppLink"
                    onClick={() => {
                      setShowExtraOptions(false);
                      handleCopyLink();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-[10px] text-gray-200 transition-all backdrop-blur-md hover:bg-black/40 hover:text-white"
                  >
                    <Share2 size={12} />
                    <span>هات الرابط بتاعى</span>
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[28px] p-6 text-right relative my-8 lamma-modal-shell"
            >
              <div className="flex items-center justify-between pb-4 mb-4 lamma-modal-header">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="text-base font-black text-white">
                    طريقة الدخول ومشاركة شات لمة 💚
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setCopiedLink(false);
                  }}
                  className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-gray-300 leading-relaxed">
                  💡{" "}
                  <strong className="text-green-400 font-black">
                    ليه شات لمة مش بيظهر بالبحث على جوجل؟
                  </strong>
                  <br />
                  شات لمة بيشتغل بخصوصية تامة ومشفر لتوفير غرف آمنة لك
                  ولأصدقائك. محركات البحث مثل جوجل لا تقوم بأرشفة هذه الروابط
                  لحماية خصوصيتك وسرية غرفتك من الغرباء أو المتسللين.
                </p>

                <div className="p-3 rounded-xl lamma-section-card">
                  <label
                    htmlFor="share-app-link-input"
                    className="block text-[10px] text-gray-400 font-bold mb-1.5"
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
                      className={`px-4 py-2.5 rounded-lg font-black text-xs transition-all flex-shrink-0 cursor-pointer ${
                        copiedLink
                          ? "bg-green-500/20 text-green-300 border border-green-500/30 animate-pulse"
                          : "lamma-feature-primary"
                      }`}
                    >
                      {copiedLink ? "✅ تم النسخ!" : "إسحب الرابط"}
                    </button>
                    <input
                      id="share-app-link-input"
                      type="text"
                      readOnly
                      value={appLink}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                      }}
                      className="w-full rounded-lg p-2 text-center text-xs text-gray-200 font-mono select-all focus:outline-none lamma-input-shell"
                    />
                  </div>
                  <span className="block text-[9px] text-gray-500 mt-1.5">
                    💡 تلميح: لو كبس الزرار مش مدعوم في متصفحك بسبب الحماية،
                    اضغط داخل المربع الفوقاني لتحديد العنوان كله ثم انسخه بنفسك
                    يدوياً.
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-xl text-center lamma-section-card">
                  <span className="text-[10px] text-gray-400 font-bold mb-2">
                    أو وجّه كاميرا موبايلك (أو موبايل صديقك) نحو الكود ده للدخول
                    فوراً:
                  </span>
                  <div className="bg-white p-2.5 rounded-2xl inline-block border-2 border-[#a3e635]/30">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(appLink)}`}
                      alt="QR Code"
                      className="w-[140px] h-[140px]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[9px] text-green-400 mt-2 font-black">
                    🟢 اتصال مباشر آمن ومفعل بالكامل
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
