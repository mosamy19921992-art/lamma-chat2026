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
  AlertCircle,
  Share2,
  MessageCircle,
  Shield,
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
  const amMarkSrc = "/images/lamma-logo.png";

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

  // Simulated live active users list
  const activeMembers = [
    {
      name: "ShadowX",
      role: "Owner",
      roleColor: "text-red-400 bg-red-500/10 border-red-500/20",
      status: "Online",
      avatar: "🧔",
      color: "#ef4444",
    },
    {
      name: "Luna_99",
      role: "Mod",
      roleColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      status: "Online",
      avatar: "👩",
      color: "#a371f7",
    },
    {
      name: "CodeMaster",
      role: "User",
      roleColor: "text-green-400 bg-green-500/10 border-green-500/20",
      status: "Online",
      avatar: "👨",
      color: "#22c55e",
    },
    {
      name: "NightOwl",
      role: "Idle",
      roleColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      status: "Idle",
      avatar: "🦉",
      color: "#f59e0b",
    },
  ];

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
      className="min-h-[100dvh] w-full relative overflow-y-auto overflow-x-hidden font-sans bg-transparent text-[color:var(--text-primary)] lamma-fire-frame lamma-fire-frame-app"
      dir="rtl"
      data-lamma-wall={wallTheme}
    >
      {/* Dynamic Scrollable Wrapper with centering behavior */}
      <div className="min-h-[100dvh] w-full flex items-start 2xl:items-center justify-center p-3 sm:p-4 md:p-6 2xl:py-10">
        {/* Main Grid Wrapper */}
        <div className="w-full max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 items-start md:items-start 2xl:items-center relative z-10">
          {/* COLUMN 1: BRANDING & SYSTEM STATS (LEFT) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden"
          >
            {/* Branding Header */}
            <div className="flex flex-col items-center text-center pb-2">
              <img
                src={brandLogoUrl || "/images/lamma-wordmark.svg"}
                alt="LAMMA CHAT"
                className="w-[180px] max-w-full drop-shadow-xl my-2"
                draggable={false}
              />
              <div className="mt-1 flex items-center justify-center p-2 rounded-full bg-emerald-950/60 border border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse">
                <MessageCircle size={18} />
              </div>
              <p className="mt-2 text-gray-400 text-[11px] font-bold leading-relaxed px-4">
                الغرف الصوتية والنصية الخاصة والعامة مشفرة ومؤمنة بالكامل
              </p>
              <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent mt-3" />
            </div>

            {/* Core Server Stats Blocks */}
            <div className="flex-1 flex flex-col gap-2 mt-1">
              <div className="p-3 rounded-xl bg-black/50 border border-green-500/10 hover:border-green-500/30 transition-all duration-300">
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                  <span>حالة الخوادم</span>
                  <span className="text-green-400">99.9% Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping flex-shrink-0" />
                  <span className="font-black text-white text-xs">
                    Servers Online
                  </span>
                  <div className="mr-auto w-12 h-6 flex items-center opacity-70">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 100 40"
                      fill="none"
                    >
                      <path
                        d="M 10 20 L 30 20 L 35 10 L 40 30 L 45 5 L 50 35 L 55 20 L 60 20 L 65 15 L 70 25 L 75 20 L 95 20"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-green-500/10 hover:border-green-500/30 transition-all duration-300">
                <div className="text-[10px] text-gray-400 font-bold flex justify-between items-center mb-1">
                  <span>المتصلون</span>
                  <span className="text-green-400 animate-pulse">نشط الآن</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-[#a3e635] drop-shadow-[0_0_12px_rgba(163,230,53,0.3)]">
                    12,845+
                  </span>
                  <span className="text-[10px] text-gray-300 font-bold">
                    أونلاين
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-green-500/10 hover:border-green-500/30 transition-all duration-300 space-y-2">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-green-500/10 text-right">
                  <Shield size={12} className="text-blue-400 flex-shrink-0" />
                  <span className="text-[10px] font-black text-white">
                    جودة الاتصال والأمان
                  </span>
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold">
                      زمن الاستجابة (Ping):
                    </span>
                    <span className="text-green-400 font-black">15ms ⚡</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold">
                      نظام التشفير:
                    </span>
                    <span className="text-[#a3e635] font-black">
                      WSS / AES-256
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-green-500/10 hover:border-green-500/30 transition-all duration-300">
                <div className="flex items-center justify-between pb-1.5 border-b border-green-500/10 mb-1.5 text-right">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-white">
                    <Sparkles
                      size={12}
                      className="text-green-400 animate-pulse"
                    />
                    <span>تحديثات المنصة</span>
                  </div>
                  <span className="text-[8px] bg-[#a3e635]/15 text-[#a3e635] px-1.5 py-0.5 rounded-full font-black">
                    V14.2
                  </span>
                </div>
                <div className="space-y-2 text-right mt-2 text-[10px] font-semibold text-gray-300">
                  <div className="flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">⚡</span>
                    <p className="leading-tight">غرف صوتية بجودة HD مجانية</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">⚡</span>
                    <p className="leading-tight">
                      مشاركة آمنة للوسائط بدون ضغط
                    </p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">⚡</span>
                    <p className="leading-tight">
                      نظام رتب وشارات حصرية للأعضاء
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden md:flex md:col-span-4 w-full items-start justify-center"
          >
            <div className="w-full max-w-[420px] flex flex-col gap-3">
              <div className="lamma-column-frame">
                <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                  <div className="space-y-3">
                    {[
                      {
                        name: "مستخدم",
                        quote: "مفيش تجديد… كله كلام فاضي ومكرر طول اليوم.",
                        icon: <MessageCircle size={16} />,
                        tone:
                          "text-red-300 border-red-500/15 bg-red-500/5 shadow-[0_0_24px_rgba(239,68,68,0.08)]",
                      },
                      {
                        name: "عضو قديم",
                        quote: "الناس بتتخانق على الفاضي… ومحدش بيلحق على الكلام.",
                        icon: <AlertCircle size={16} />,
                        tone:
                          "text-yellow-200 border-yellow-500/15 bg-yellow-500/5 shadow-[0_0_24px_rgba(245,158,11,0.08)]",
                      },
                      {
                        name: "صاحب شات",
                        quote: "الموضوع محتاج شكل جديد… يخلّي الدردشة محترمة وممتعة.",
                        icon: <Sparkles size={16} />,
                        tone:
                          "text-sky-200 border-sky-500/15 bg-sky-500/5 shadow-[0_0_24px_rgba(56,189,248,0.08)]",
                      },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: [0, -3, 0] }}
                        transition={{
                          duration: 4.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.18 * idx,
                        }}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${item.tone} shrink-0`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-white truncate">
                              {item.name}
                            </span>
                            <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                              الآن
                            </span>
                          </div>
                          <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                            {item.quote}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lamma-column-frame">
                <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                  <div className="space-y-3">
                    {[
                      {
                        name: "السرعة",
                        quote: "تدخل وتتكلم فورًا… من غير خطوات كتير.",
                        icon: <Zap size={16} />,
                      },
                    ].map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-black/55 border border-white/10 flex items-center justify-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-white truncate">
                              {item.name}
                            </span>
                            <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                              الآن
                            </span>
                          </div>
                          <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                            {item.quote}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-gray-300 font-semibold leading-relaxed">
                    هدفنا إن كل عمود يبقى متوازن… من غير فراغات مزعجة.
                  </div>
                </div>
              </div>

              <div className="lamma-column-frame">
                <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] flex items-center justify-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] shrink-0">
                      <Shield size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-white truncate">
                          ثبات
                        </span>
                        <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                          الآن
                        </span>
                      </div>
                      <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                        شكل ثابت… ومفيش عمود هيطلع أقصر من التاني.
                      </div>
                      <div className="mt-2 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                        دخول سريع + كروت واضحة من غير زحمة.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lamma-column-frame">
                <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] flex items-center justify-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] shrink-0">
                      <Shield size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-white truncate">
                          ثبات
                        </span>
                        <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                          الآن
                        </span>
                      </div>
                      <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                        شكل ثابت… ومفيش عمود هيطلع أقصر من التاني.
                      </div>
                      <div className="mt-2 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                        دخول سريع + كروت واضحة من غير زحمة.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= COLUMN 2 (MIDDLE COLUMN): THE LOGIN CARD ================= */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full md:col-span-4 flex flex-col justify-start items-center h-auto relative z-20"
          >
            {/* Rounded glass container with green neon border shadow */}
            <div
              className={`w-full max-w-[420px] h-auto relative rounded-[32px] p-4 sm:p-5 md:p-6 border overflow-hidden shadow-2xl transition-all duration-300 flex flex-col ${
                primaryTheme === "amoled"
                  ? "bg-neutral-950/90 border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] shadow-[0_0_34px_rgba(0,0,0,0.55)]"
                  : "bg-white/[0.02] border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.18)] backdrop-blur-xl shadow-[0_0_34px_rgba(0,0,0,0.48)]"
              }`}
            >
              {/* Horizontal neon neon ambient line at the top rim of card */}
              <div className="absolute top-0 right-0 left-0 h-[2.5px] bg-gradient-to-r from-transparent via-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.75)] to-transparent animate-pulse" />

              {/* Glowing corner beads */}
              <div className="absolute top-3 left-3 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.95)] animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.65)] animate-pulse" />
              </div>

              {/* Header logo & headings */}
              <div className="text-center mb-3">
                <div className="mx-auto flex justify-center mb-2 mt-0">
                  <img
                    src={brandLogoUrl || "/images/lamma-wordmark.svg"}
                    alt="LAMMA CHAT"
                    className="w-[170px] sm:w-[215px] max-w-full h-auto drop-shadow-2xl"
                    draggable={false}
                  />
                </div>
                <h2 className="text-[18px] md:text-[22px] font-black text-white m-0 mt-1.5">
                  تسجيل الدخول
                </h2>
                <p className="text-[10px] text-gray-400 mt-1">
                  مرحباً بك! الرجاء تسجيل الدخول للمتابعة
                </p>
              </div>

              {/* Input credentials forms */}
              <form onSubmit={handleFormLogin} className="space-y-2.5">
                {/* Email / Username field */}
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-black text-gray-400 mr-1 text-right"
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
                      className="w-full pr-11 pl-4 py-2 bg-black/60 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] focus:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.35)] rounded-2xl text-[11px] focus:ring-1 focus:ring-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] focus:outline-none text-white transition-all text-left"
                      placeholder="example@email.com"
                      autoComplete="email"
                      dir="ltr"
                    />
                  </div>
                </div>

                {authMode === "signup" && (
                  <div className="space-y-1">
                    <label
                      htmlFor="nickname"
                      className="block text-[10px] font-black text-gray-400 mr-1 text-right"
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
                        className="w-full pr-11 pl-4 py-2 bg-black/60 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] focus:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.35)] rounded-2xl text-[11px] focus:ring-1 focus:ring-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] focus:outline-none text-white transition-all text-right"
                        placeholder="مثال: لَمّة_محمد"
                        autoComplete="nickname"
                      />
                    </div>
                  </div>
                )}

                {/* Password field */}
                <div className="space-y-1">
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-black text-gray-400 mr-1 text-right"
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
                      className="w-full pr-11 pl-12 py-2 bg-black/60 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] focus:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.35)] rounded-2xl text-[11px] focus:ring-1 focus:ring-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] focus:outline-none text-white transition-all text-left"
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

                {/* Custom remember state & forgot links */}
                <div className="flex justify-between items-center text-[10px] pt-0.5 select-none">
                  <label
                    htmlFor="rememberMe"
                    className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white"
                  >
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] bg-black/50 text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] accent-[rgb(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b))] focus:ring-0"
                    />
                    <span>تذكرني</span>
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
                        showToast("⚠️ إعدادات Supabase غير مكتملة حالياً.", "error");
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
                  className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] hover:text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.75)] font-extrabold transition-all"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2 bg-black/45 hover:bg-black/35 text-white rounded-xl font-black text-[11px] flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.18)] hover:shadow-[0_0_28px_rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.26)] transition-all cursor-pointer border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.28)] disabled:opacity-60 disabled:cursor-not-allowed"
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

                <button
                  type="button"
                  onClick={() =>
                    setAuthMode((p) => (p === "login" ? "signup" : "login"))
                  }
                  className="w-full text-[11px] text-gray-400 hover:text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.75)] font-black transition-all"
                >
                  {authMode === "login"
                    ? "مش عندك حساب؟ اعمل حساب جديد"
                    : "عندك حساب؟ سجل دخول"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-2.5 text-gray-400 text-[10px] font-bold">
                <span className="flex-1 h-[1px] bg-gradient-to-l from-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] to-transparent" />
                <span>أو</span>
                <span className="flex-1 h-[1px] bg-gradient-to-r from-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] to-transparent" />
              </div>

              {/* Google Authentication row button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 bg-black/40 hover:bg-white/[0.04] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.12)] hover:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.30)] rounded-2xl text-[11px] font-black flex items-center justify-between px-4 transition-all text-gray-300 hover:text-white"
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
                onClick={() => setShowExtraOptions((p) => !p)}
                className="mt-4 w-full py-2.5 rounded-2xl bg-black/30 hover:bg-white/[0.04] border border-white/10 hover:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] text-[11px] font-black text-gray-300 hover:text-white transition-all flex items-center justify-between px-4"
              >
                <span>خيارات إضافية</span>
                <ChevronRight
                  size={13}
                  className={`rotate-180 opacity-60 transition-transform ${showExtraOptions ? "-rotate-90" : ""}`}
                />
              </button>

              {showExtraOptions && (
                <div className="mt-3 p-3 rounded-xl bg-[linear-gradient(135deg,rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.07),rgba(0,0,0,0.08))] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.12)]">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1">
                    <Sparkles
                      size={13}
                      className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] animate-pulse"
                    />
                    <span className="text-[11px] font-black text-white">
                      دخول سريع باستخدام Lamma Chat
                    </span>
                  </div>
                  <span className="text-[9px] text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] px-2 py-0.5 rounded-full font-bold">
                    تلقائي
                  </span>
                </div>

                <p className="text-[10px] text-gray-400 mb-3 text-right">
                  سيتم إنشاء اسم مستخدم ورقم تلقائياً والدخول فوراً
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Robot/User representation */}
                  <div className="sm:col-span-3 flex justify-center">
                    <div className="relative w-12 h-12 rounded-2xl bg-black/60 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] flex items-center justify-center text-2xl shadow-[0_0_12px_rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)]">
                      <span>🤖</span>
                      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] border border-black animate-pulse" />
                    </div>
                  </div>

                  {/* Proposed Guest username with Copy & Regenerate tools */}
                  <div className="sm:col-span-9 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        id="guest-id-display"
                        name="guestId"
                        type="text"
                        readOnly
                        value={guestId}
                        className="flex-1 bg-black/60 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] text-xs px-2.5 py-2 rounded-xl text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] font-mono text-center focus:outline-none"
                        autoComplete="off"
                      />

                      <button
                        type="button"
                        onClick={handleCopyGuestId}
                        className="p-2 rounded-lg bg-black/60 hover:bg-black text-gray-400 hover:text-white border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.12)] hover:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.30)] transition-all"
                        title="نسخ المعرف"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={handleRegenerateGuestId}
                        className="p-2 rounded-lg bg-black/60 hover:bg-black text-gray-400 hover:text-white border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.12)] hover:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.30)] transition-all group"
                        title="توليد معرف جديد"
                      >
                        <RefreshCw
                          size={13}
                          className="group-hover:rotate-180 transition-transform duration-500"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Green swift guest button to sign in directly */}
                <button
                  type="button"
                  onClick={handleSwiftGuestLogin}
                  className="w-full mt-3 py-2.5 bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.06)] hover:bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.20)] hover:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.35)] text-xs font-black rounded-xl text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] hover:text-white transition-all cursor-pointer"
                >
                  🚀 دخول مباشر بالاسم المقترح
                </button>

                {import.meta.env.DEV && !supabase ? (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const assignedColor =
                          NICKNAME_COLORS[
                            Math.floor(Math.random() * NICKNAME_COLORS.length)
                          ];
                        onLogin(
                          guestId,
                          "owner",
                          assignedColor,
                          undefined,
                          undefined,
                          "guest",
                        );
                      }}
                      className="py-2 bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/60 text-xs font-black rounded-xl text-red-300 hover:text-white transition-all cursor-pointer"
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
                        onLogin(
                          guestId,
                          "admin",
                          assignedColor,
                          undefined,
                          undefined,
                          "guest",
                        );
                      }}
                      className="py-2 bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/20 hover:border-blue-500/60 text-xs font-black rounded-xl text-blue-200 hover:text-white transition-all cursor-pointer"
                    >
                      🛡️ دخول كأدمن (Demo)
                    </button>
                  </div>
                ) : null}
                </div>
              )}

              {/* Bottom link as Guest */}
              <div className="mt-4 text-center space-y-3">
                <button
                  type="button"
                  id="continue-as-guest-btn"
                  name="continueAsGuest"
                  onClick={handleSwiftGuestLogin}
                  className="text-xs text-gray-400 hover:text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.75)] flex items-center justify-center gap-1.5 mx-auto font-black transition-all"
                >
                  <span>متابعة كضيف</span>
                  <ChevronRight size={13} className="rotate-180 opacity-60" />
                </button>

                <button
                  type="button"
                  id="copy-app-link-btn"
                  name="copyAppLink"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-[10px] text-gray-300 hover:text-white border border-white/5 transition-all cursor-pointer mx-auto"
                >
                  <Share2 size={12} />
                  <span>هات الرابط بتاعى (Get My App Link)</span>
                </button>
              </div>
            </div>

            {/* Footer Rights */}
            <div className="text-center mt-auto pt-4 text-xs text-gray-400/80 font-bold">
              © 2026 Lamma Chat. جميع الحقوق محفوظة{" "}
              <span className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)]">
                💚
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden md:flex md:col-span-4 w-full items-start justify-center"
          >
            <div className="w-full max-w-[420px]">
              <div className="lamma-column-frame">
                <div className="space-y-3">
                  <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                    <div className="w-full flex items-center justify-center">
                      <div className="w-full rounded-3xl bg-black/55 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] shadow-[0_0_45px_rgba(0,0,0,0.65)] overflow-hidden aspect-square">
                        <img
                          src={amMarkSrc}
                          alt="AM"
                          className="w-full h-full object-cover object-center opacity-95"
                          loading="eager"
                          decoding="async"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                    <div className="space-y-3">
                      {[
                        {
                          name: "الحل",
                          quote: "اللي فاهم بيريّح ومن غير كلام كتير",
                          icon: <Hash size={16} />,
                        },
                        {
                          name: "الحل",
                          quote: "الشات تجربتك لحل أي روتين",
                          icon: <Shield size={16} />,
                        },
                      ].map((item, idx) => (
                        <div key={`${item.quote}-${idx}`} className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] flex items-center justify-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-white truncate">
                                {item.name}
                              </span>
                              <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                                الآن
                              </span>
                            </div>
                            <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                              {item.quote}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-gray-300 font-semibold leading-relaxed">
                      <span className="text-white font-black">لمة شات</span> مش
                      مجرد فكرة… ده مشروع كله{" "}
                      <span className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.95)] font-black">
                        مفاجآت
                      </span>
                      ، وأهمها السهولة وتنقية العين، مع اكتشافات مش هتتخيلها يا
                      مان.
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </motion.div>

          <div className="md:hidden w-full flex flex-col items-center gap-4 mt-4">
            <div className="w-full max-w-[520px] grid gap-4">
              <div className="lamma-column-frame">
                <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                  <div className="space-y-3">
                    {[
                      {
                        name: "مستخدم",
                        quote: "مفيش تجديد… كله كلام فاضي ومكرر طول اليوم.",
                        icon: <MessageCircle size={16} />,
                        tone:
                          "text-red-300 border-red-500/15 bg-red-500/5 shadow-[0_0_24px_rgba(239,68,68,0.08)]",
                      },
                      {
                        name: "عضو قديم",
                        quote: "الناس بتتخانق على الفاضي… ومحدش بيلحق على الكلام.",
                        icon: <AlertCircle size={16} />,
                        tone:
                          "text-yellow-200 border-yellow-500/15 bg-yellow-500/5 shadow-[0_0_24px_rgba(245,158,11,0.08)]",
                      },
                      {
                        name: "صاحب شات",
                        quote: "الموضوع محتاج شكل جديد… يخلّي الدردشة محترمة وممتعة.",
                        icon: <Sparkles size={16} />,
                        tone:
                          "text-sky-200 border-sky-500/15 bg-sky-500/5 shadow-[0_0_24px_rgba(56,189,248,0.08)]",
                      },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: [0, -3, 0] }}
                        transition={{
                          duration: 4.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.18 * idx,
                        }}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${item.tone} shrink-0`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-white truncate">
                              {item.name}
                            </span>
                            <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                              الآن
                            </span>
                          </div>
                          <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                            {item.quote}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lamma-column-frame">
                <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                  <div className="space-y-3">
                    {[
                      {
                        name: "السرعة",
                        quote: "تدخل وتتكلم فورًا… من غير خطوات كتير.",
                        icon: <Zap size={16} />,
                      },
                    ].map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-black/55 border border-white/10 flex items-center justify-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-white truncate">
                              {item.name}
                            </span>
                            <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                              الآن
                            </span>
                          </div>
                          <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                            {item.quote}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lamma-column-frame">
                <div className="space-y-3">
                  <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                    <div className="w-full flex items-center justify-center">
                      <div className="w-full rounded-3xl bg-black/55 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] shadow-[0_0_45px_rgba(0,0,0,0.65)] overflow-hidden aspect-square">
                        <img
                          src={amMarkSrc}
                          alt="AM"
                          className="w-full h-full object-cover object-center opacity-95"
                          loading="eager"
                          decoding="async"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lamma-glass rounded-3xl p-4 overflow-hidden">
                    <div className="space-y-3">
                      {[
                        {
                          name: "الحل",
                          quote: "اللي فاهم بيريّح ومن غير كلام كتير",
                          icon: <Hash size={16} />,
                        },
                        {
                          name: "الحل",
                          quote: "الشات تجربتك لحل أي روتين",
                          icon: <Shield size={16} />,
                        },
                      ].map((item, idx) => (
                        <div key={`${item.quote}-${idx}`} className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.10)] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] flex items-center justify-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)] shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-white truncate">
                                {item.name}
                              </span>
                              <span className="text-[8px] font-mono text-gray-500" dir="ltr">
                                الآن
                              </span>
                            </div>
                            <div className="mt-1 rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[10px] text-gray-200 font-semibold leading-relaxed">
                              {item.quote}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-gray-300 font-semibold leading-relaxed">
                      <span className="text-white font-black">لمة شات</span> مش
                      مجرد فكرة… ده مشروع كله{" "}
                      <span className="text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.95)] font-black">
                        مفاجآت
                      </span>
                      ، وأهمها السهولة وتنقية العين، مع اكتشافات مش هتتخيلها يا
                      مان.
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              className="w-full max-w-md bg-[#050a06] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] rounded-[28px] p-6 text-right relative shadow-[0_0_50px_rgba(0,0,0,0.55)] my-8"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
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
                  className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all cursor-pointer"
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
                <label className="block text-[10px] text-gray-400 font-bold mb-1.5">
                  اسم المستخدم:
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[color:rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)] pointer-events-none">
                    <Hash size={16} />
                  </span>
                  <input
                    type="text"
                    value={profileNickname}
                    onChange={(e) => setProfileNickname(e.target.value)}
                    className="w-full pr-11 pl-4 py-2 bg-black/60 border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.16)] focus:border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.35)] rounded-2xl text-[11px] focus:ring-1 focus:ring-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.22)] focus:outline-none text-white transition-all text-right"
                    placeholder="مثال: لَمّة_محمد"
                    autoComplete="nickname"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfileNickname}
                disabled={authLoading}
                className="mt-4 w-full py-2.5 rounded-lg font-black text-xs transition-all cursor-pointer bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.14)] border border-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.28)] text-white hover:bg-[rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.18)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                حفظ
              </button>
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
              className="w-full max-w-md bg-[#050a06] border border-green-500/20 rounded-[28px] p-6 text-right relative shadow-[0_0_50px_rgba(16,185,129,0.1)] my-8"
            >
              <div className="flex items-center justify-between border-b border-green-500/10 pb-4 mb-4">
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

                <div className="p-3 bg-white/5 border border-green-500/15 rounded-xl">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1.5">
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
                          : "bg-[#a3e635] text-black hover:bg-[#a3e635]/90"
                      }`}
                    >
                      {copiedLink ? "✅ تم النسخ!" : "إسحب الرابط"}
                    </button>
                    <input
                      type="text"
                      readOnly
                      value={appLink}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                      }}
                      className="w-full bg-black/60 border border-green-500/10 rounded-lg p-2 text-center text-xs text-gray-200 font-mono select-all focus:outline-none focus:border-green-500/30"
                    />
                  </div>
                  <span className="block text-[9px] text-gray-500 mt-1.5">
                    💡 تلميح: لو كبس الزرار مش مدعوم في متصفحك بسبب الحماية،
                    اضغط داخل المربع الفوقاني لتحديد العنوان كله ثم انسخه بنفسك
                    يدوياً.
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-green-500/10 rounded-xl text-center">
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
