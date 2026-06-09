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
  const brandMarkSrc = "/images/am-logo.png";
  const brandWordmarkSrc = "/images/lamma-wordmark.svg";
  const fallbackMarkSrc = "/images/lamma-logo.png";
  const fallbackWordmarkSrc = "/images/lamma-wordmark.svg";
  const loginHeroBg =
    import.meta.env.VITE_LOGIN_HERO_BG || "/images/login-hero.jpg";

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

  const setWallThemeSafe = (theme: WallTheme) => {
    setWallTheme(theme);
    localStorage.setItem("lamma_wall_theme", theme);
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
      className="min-h-[100dvh] w-full relative overflow-hidden font-sans bg-[#14080d] text-white"
      dir="rtl"
      data-lamma-wall={wallTheme}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url("${loginHeroBg}")` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(110,48,64,0.18),rgba(15,7,10,0.95))]" />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        <motion.div
          className="absolute left-1/2 top-[7%] h-[18rem] w-[74rem] -translate-x-1/2 rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 34%, transparent 72%)",
          }}
          animate={{ x: [-20, 20, -20] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="w-full max-w-[420px] rounded-[34px] border border-[rgba(212,175,55,0.18)] bg-[linear-gradient(180deg,rgba(12,11,16,0.58),rgba(8,12,18,0.78))] px-6 py-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-[14px] sm:px-8"
        >
          <div className="mx-auto flex max-w-[250px] justify-center">
            <img
              src={brandMarkSrc}
              alt={brandName}
              onError={(e) => {
                const img = e.currentTarget;
                img.onerror = null;
                img.src = fallbackMarkSrc;
              }}
              className="h-[180px] w-auto object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.55)] sm:h-[220px]"
              draggable={false}
            />
          </div>

          <img
            src={brandLogoUrl || brandWordmarkSrc}
            alt={brandName}
            onError={(e) => {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = fallbackWordmarkSrc;
            }}
            className="mx-auto mt-2 w-[118px] drop-shadow-xl"
            draggable={false}
          />

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(17,18,18,0.42)] px-4 py-2 text-[11px] font-black text-[#f3d98a] shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
            <span>المتعه كلها بتستناك</span>
          </div>

          <p className="mx-auto mt-4 max-w-[290px] text-[13px] leading-7 text-white/80">
            شات بالروح المصرية بيجمع تلاقي مع الأصالة العربية
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black text-white/85">
              رَوْقان
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black text-white/85">
              أمان ⚡
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black text-white/85">
              خصوصية 🛡️
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowExtraOptions(true)}
            className="mt-6 inline-flex w-full max-w-[230px] items-center justify-center gap-3 rounded-[18px] border border-[rgba(212,175,55,0.42)] bg-[linear-gradient(180deg,rgba(70,58,34,0.45),rgba(34,29,17,0.45))] px-6 py-3 text-[18px] font-black text-[#f3d98a] shadow-[0_16px_30px_rgba(0,0,0,0.34)] transition-all hover:brightness-110"
          >
            <ChevronRight size={18} className="rotate-180" />
            <span>يالا بينا</span>
          </button>

          <div className="mt-7 text-[12px] leading-6 text-white/58">
            © {new Date().getFullYear()} {brandName}. جميع الحقوق محفوظة - توثيق
            وهوية خاصة:
          </div>

          <div className="mt-3 inline-flex items-center justify-center rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.10)] px-5 py-3 text-[11px] font-black text-[#f5dda0] shadow-[0_12px_26px_rgba(0,0,0,0.24)]">
            {brandCredit}
          </div>

          <button
            type="button"
            onClick={() => showToast("التثبيت من المتصفح أو من قائمة المشاركة.", "info")}
            className="mx-auto mt-4 block rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-black text-white/70 transition-all hover:bg-black/35 hover:text-white"
          >
            تثبيت التطبيق
          </button>
        </motion.section>
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
