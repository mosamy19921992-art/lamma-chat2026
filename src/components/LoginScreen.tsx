import React, { useState, useEffect } from "react";
import {
  Mail, Lock, Eye, EyeOff, RefreshCw, Copy, Sparkles,
  Share2, Zap, Hash, MessageCircle, ArrowLeft, Check, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase.ts";

interface LoginScreenProps {
  onLogin: (username: string, role: string, color: string, uid?: string, email?: string, authProvider?: "supabase" | "guest") => void;
  primaryTheme: "dark" | "amoled";
  setPrimaryTheme: (theme: "dark" | "amoled") => void;
}

function generateRandomGuestId() {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `LC_Guest_${num}`;
}

const NICKNAME_COLORS = ["#22c55e", "#3fb950", "#58a6ff", "#a371f7", "#ef4444", "#f59e0b"];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  type WallTheme = "fire" | "ice" | "violet";
  const brandName = import.meta.env.VITE_BRAND_NAME || "Lamma Chat";
  const brandCredit = import.meta.env.VITE_BRAND_CREDIT || "MR mohamed samy";

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
  const [pendingProfileColor, setPendingProfileColor] = useState<string | null>(null);
  const [profileNickname, setProfileNickname] = useState("");
  const [showProfileNicknameModal, setShowProfileNicknameModal] = useState(false);
  const [soundOn] = useState(true);
  const [guestId, setGuestId] = useState(generateRandomGuestId());
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const appLink = import.meta.env.VITE_APP_URL || window.location.origin;

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "lamma_wall_theme") return;
      const v = e.newValue;
      if (v === "fire" || v === "ice" || v === "violet") setWallTheme(v);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMsg({ text, type });
    playBeepSound(type === "error" ? 300 : type === "success" ? 800 : 600, "sine");
    setTimeout(() => setToastMsg((prev) => (prev?.text === text ? null : prev)), 5000);
  };

  const playBeepSound = (freq = 440, type: OscillatorType = "sine") => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  };

  const handleRegenerateGuestId = () => { setGuestId(generateRandomGuestId()); playBeepSound(600, "sine"); };
  const handleCopyGuestId = () => { navigator.clipboard.writeText(guestId); playBeepSound(800, "square"); showToast(`تم نسخ المعرف: ${guestId}`, "success"); };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "signup" && !signupNickname.trim()) { showToast("اكتب اسم المستخدم الأول.", "error"); return; }
    if (!email.trim()) { showToast("اكتب البريد الإلكتروني الأول.", "error"); return; }
    if (!password.trim()) { showToast("اكتب كلمة المرور الأول.", "error"); return; }
    if (!supabase) { showToast("⚠️ إعدادات السيرفر غير مكتملة حالياً.", "error"); return; }
    const assignedColor = NICKNAME_COLORS[Math.floor(Math.random() * NICKNAME_COLORS.length)];
    setAuthLoading(true);
    const doAuth = authMode === "signup"
      ? supabase.auth.signUp({ email: email.trim(), password, options: { data: { nickname: signupNickname.trim() } } })
      : supabase.auth.signInWithPassword({ email: email.trim(), password });
    doAuth.then(({ data, error }) => {
      if (error) { showToast(error.message || "فشل تسجيل الدخول.", "error"); return; }
      if (authMode === "signup") { showToast("✅ تم إنشاء الحساب. راجع بريدك لو مفعّل التأكيد.", "success"); setAuthMode("login"); setPassword(""); setSignupNickname(""); return; }
      if (!data?.user) { showToast("فشل تسجيل الدخول.", "error"); return; }
      const metaNick = data.user.user_metadata?.nickname || data.user.user_metadata?.name;
      if (!metaNick) { setPendingProfileUser(data.user); setPendingProfileColor(assignedColor); setProfileNickname(""); setShowProfileNicknameModal(true); showToast("اختار اسم مستخدم للمتابعة.", "info"); return; }
      playBeepSound(520, "sine");
      if (!rememberMe) localStorage.removeItem("lamma_user_session");
      onLogin(metaNick, "user", assignedColor, data.user.id, data.user.email, "supabase");
    }).finally(() => setAuthLoading(false));
  };

  const handleSaveProfileNickname = async () => {
    const nick = profileNickname.trim();
    if (!nick) { showToast("اكتب اسم المستخدم الأول.", "error"); return; }
    if (!supabase || !pendingProfileUser || !pendingProfileColor) { showToast("⚠️ إعدادات Supabase غير مكتملة.", "error"); return; }
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { nickname: nick } });
      if (error) { showToast(error.message, "error"); return; }
      const user = data.user || pendingProfileUser;
      setShowProfileNicknameModal(false); setPendingProfileUser(null); setPendingProfileColor(null);
      playBeepSound(520, "sine");
      if (!rememberMe) localStorage.removeItem("lamma_user_session");
      onLogin(nick, "user", pendingProfileColor, user.id, user.email, "supabase");
    } finally { setAuthLoading(false); }
  };

  const handleSwiftGuestLogin = () => {
    const assignedColor = NICKNAME_COLORS[Math.floor(Math.random() * NICKNAME_COLORS.length)];
    playBeepSound(440, "sine");
    showToast("🚀 تم الدخول السريع بوضع الزائر!", "success");
    setTimeout(() => onLogin(guestId, "guest", assignedColor, undefined, undefined, "guest"), 200);
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      if (!supabase) { showToast("⚠️ إعدادات Supabase غير مكتملة.", "error"); return; }
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) showToast(error.message, "error");
    } finally { setAuthLoading(false); }
  };

  const handleForgotPassword = () => {
    const targetEmail = email.trim();
    if (!targetEmail) { showToast("اكتب البريد الإلكتروني الأول.", "error"); return; }
    if (!supabase) { showToast("⚠️ إعدادات Supabase غير مكتملة.", "error"); return; }
    setAuthLoading(true);
    supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo: window.location.origin })
      .then(({ error }) => { if (error) { showToast(error.message, "error"); return; } showToast("📧 تم إرسال رسالة إعادة التعيين. راجع بريدك.", "success"); })
      .finally(() => setAuthLoading(false));
  };

  const fallbackCopy = (text: string) => {
    try {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand("copy"); document.body.removeChild(ta);
      if (ok) { setCopiedLink(true); playBeepSound(800, "sine"); setTimeout(() => setCopiedLink(false), 3000); } else throw new Error("fallback");
    } catch { prompt("انسخ الرابط يدوياً:", text); }
  };

  // ── Shared styles ──
  const inputStyle = { background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)" };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; e.currentTarget.style.background = "rgba(212,175,55,0.07)"; };
  const inputBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.15)"; e.currentTarget.style.background = "rgba(212,175,55,0.04)"; };
  const wallSubmit  = { background: "linear-gradient(135deg,rgba(212,175,55,0.85),rgba(180,140,30,0.7))", border:"1px solid rgba(212,175,55,0.5)", boxShadow:"0 8px 28px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,240,150,0.15)", color:"#0a0800" };
  const wallToggleOn = { background:"rgba(212,175,55,0.18)", color:"#ffd700", border:"1px solid rgba(212,175,55,0.35)" };
  const modalStyle  = { background:"linear-gradient(160deg,rgba(12,16,24,0.99),rgba(8,11,18,1))", border:"1px solid rgba(56,139,253,0.25)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" };

  const toastColors = { success: "bg-emerald-500/90 border-emerald-400/40", error: "bg-red-500/90 border-red-400/40", info: "bg-blue-500/90 border-blue-400/40" };

  // Gold gradient text style
  const goldText: React.CSSProperties = {
    background: "linear-gradient(135deg,#fef08a 0%,#ffd700 35%,#d4af37 65%,#b8860b 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  };

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden font-sans"
      dir="rtl"
      data-lamma-wall={wallTheme}
      style={{
        backgroundImage: 'url("/images/login-hero-1.jpg.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* ── Toast ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity:0,y:-20,scale:0.95 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:-20,scale:0.95 }} transition={{ duration:0.25 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999999] max-w-sm w-full px-4 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl border backdrop-blur-xl flex items-center gap-2 ${toastColors[toastMsg.type]}`}>
            {toastMsg.type==="success"&&<Check size={14} className="shrink-0"/>}
            {toastMsg.type==="error"&&<X size={14} className="shrink-0"/>}
            {toastMsg.type==="info"&&<MessageCircle size={14} className="shrink-0"/>}
            <span className="flex-1">{toastMsg.text}</span>
            <button onClick={()=>setToastMsg(null)} className="shrink-0 opacity-70 hover:opacity-100"><X size={12}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          OUTER FRAME — حدود سماوية ثابتة
      ══════════════════════════════════════════ */}
      <div className="h-full w-full flex items-center justify-center p-3 sm:p-5 relative">
        {/* Glow يسار — سماوي */}
        <div className="absolute left-0 top-0 bottom-0 w-[12%] pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(56,139,253,0.18) 0%, rgba(56,139,253,0.06) 60%, transparent 100%)" }} />
        {/* Glow يمين — برتقالي/ذهبي */}
        <div className="absolute right-0 top-0 bottom-0 w-[12%] pointer-events-none"
          style={{ background: "linear-gradient(to left, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 60%, transparent 100%)" }} />
        {/* Glow أعلى — سماوي فاتح */}
        <div className="absolute top-0 left-0 right-0 h-[15%] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(56,139,253,0.12) 0%, transparent 100%)" }} />
        {/* Glow أسفل — ذهبي */}
        <div className="absolute bottom-0 left-0 right-0 h-[12%] pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(212,175,55,0.1) 0%, transparent 100%)" }} />
        <motion.div
          initial={{ opacity:0, scale:0.97 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
          className="w-full max-w-[980px] h-full max-h-[660px] rounded-[22px] overflow-hidden"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "row",
          }}
        >

          {/* ══ RIGHT SIDE: فورم التسجيل ══ */}
          <div className="flex-1 flex flex-col overflow-y-auto relative order-1"
            style={{
              background: "transparent",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}>

            {/* خط علوي ذهبي */}
            <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
              style={{ background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.7),rgba(255,220,80,0.9),rgba(212,175,55,0.7),transparent)" }} />

            <div className="flex flex-col gap-4 p-6 sm:p-7 h-full">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-black text-white">{authMode==="signup" ? "إنشاء حساب" : "أهلاً بيك 👋"}</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">{authMode==="signup" ? "خطوة واحدة وتبدأ معانا" : "سجّل دخولك وادخل على الشات"}</p>
                </div>
                <div className="flex items-center p-1 rounded-2xl gap-0.5"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <button type="button" onClick={()=>setAuthMode("login")}
                    className="px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200"
                    style={authMode==="login" ? wallToggleOn : {color:"#6b7280",border:"1px solid transparent"}}>دخول</button>
                  <button type="button" onClick={()=>setAuthMode("signup")}
                    className="px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200"
                    style={authMode==="signup" ? wallToggleOn : {color:"#6b7280",border:"1px solid transparent"}}>تسجيل</button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleFormLogin} className="flex flex-col gap-3 flex-1">
                <AnimatePresence mode="wait">
                  {authMode==="signup" && (
                    <motion.div key="nick" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} transition={{duration:0.2}} className="overflow-hidden">
                      <label className="block text-[11px] font-black text-gray-400 text-right mb-1.5">اسم المستخدم</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none" style={{color:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.7)`}}><Hash size={15}/></span>
                        <input type="text" value={signupNickname} onChange={(e)=>setSignupNickname(e.target.value)}
                          className="w-full pr-11 pl-4 py-3 rounded-2xl text-[13px] text-white placeholder-gray-600 focus:outline-none transition-all"
                          style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} placeholder="مثال: Mohamed_99" autoComplete="nickname"/>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-[11px] font-black text-gray-400 text-right mb-1.5">البريد الإلكتروني</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none" style={{color:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.7)`}}><Mail size={15}/></span>
                    <input type="text" value={email} onChange={(e)=>setEmail(e.target.value)}
                      className="w-full pr-11 pl-4 py-3 rounded-2xl text-[13px] text-white placeholder-gray-600 focus:outline-none transition-all text-left"
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} placeholder="example@email.com" autoComplete="email" dir="ltr"/>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <button type="button" onClick={handleForgotPassword} className="text-[10px] font-bold transition-colors"
                      style={{color:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.8)`}}>نسيت كلمة المرور؟</button>
                    <label className="text-[11px] font-black text-gray-400">كلمة المرور</label>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none" style={{color:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.7)`}}><Lock size={15}/></span>
                    <input type={showPassword?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)}
                      className="w-full pr-11 pl-12 py-3 rounded-2xl text-[13px] text-white placeholder-gray-600 focus:outline-none transition-all text-left"
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                      autoComplete={authMode==="signup"?"new-password":"current-password"} dir="ltr"/>
                    <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-600 hover:text-gray-300 transition-colors">
                      {showPassword ? <Eye size={15}/> : <EyeOff size={15}/>}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={()=>setRememberMe(!rememberMe)}>
                  <div className="w-4 h-4 rounded-md flex items-center justify-center transition-all shrink-0"
                    style={{ background:rememberMe?`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.8)`:"rgba(255,255,255,0.06)", border:`1px solid ${rememberMe?`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.9)`:"rgba(255,255,255,0.12)"}` }}>
                    {rememberMe && <Check size={10} className="text-white" strokeWidth={3}/>}
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">تذكرني</span>
                </div>

                <motion.button type="submit" disabled={authLoading}
                  whileHover={{scale:authLoading?1:1.01}} whileTap={{scale:authLoading?1:0.98}}
                  className="w-full py-3.5 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  style={wallSubmit}>
                  <div className="absolute inset-0 pointer-events-none" style={{background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.07) 50%,transparent 60%)"}}/>
                  {authLoading
                    ? <div className="flex items-center gap-2"><motion.div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}/><span>جاري التنفيذ...</span></div>
                    : <><span>{authMode==="signup"?"إنشاء الحساب":"تسجيل الدخول"}</span><ArrowLeft size={15}/></>
                  }
                </motion.button>

                <p className="text-[9px] text-gray-600 text-center">بالمتابعة أنت توافق على سياسة الاستخدام والخصوصية</p>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[1px]" style={{background:"rgba(255,255,255,0.06)"}}/>
                  <span className="text-[10px] text-gray-600 font-bold">أو</span>
                  <div className="flex-1 h-[1px]" style={{background:"rgba(255,255,255,0.06)"}}/>
                </div>

                <motion.button type="button" onClick={handleGoogleLogin} disabled={authLoading}
                  whileHover={{scale:1.01}} whileTap={{scale:0.98}}
                  className="w-full py-2.5 rounded-2xl text-[12px] font-black flex items-center justify-center gap-3 transition-all text-white disabled:opacity-50"
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)"}}
                  onMouseEnter={(e)=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";}}>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 11.99 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>متابعة بـ Google</span>
                </motion.button>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button type="button" onClick={handleSwiftGuestLogin} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    className="py-2.5 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 transition-all"
                    style={{background:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.08)`,border:`1px solid rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.2)`,color:`rgb(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b))`}}>
                    <Zap size={13}/><span>دخول كضيف</span>
                  </motion.button>
                  <motion.button type="button" onClick={()=>setShowExtraOptions(true)} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    className="py-2.5 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 transition-all text-gray-400 hover:text-gray-200"
                    style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                    <Sparkles size={13}/><span>خيارات أكثر</span>
                  </motion.button>
                </div>

                <div className="text-center mt-auto pt-1">
                  <span className="text-[9px] text-gray-700">© {new Date().getFullYear()} {brandName} · {brandCredit}</span>
                </div>
              </form>
            </div>

            {/* Theme dots */}
            <div className="absolute bottom-3 left-4 flex items-center gap-1.5 z-10">
              {(["fire","ice","violet"] as WallTheme[]).map((t)=>{
                const c={fire:"#f59e0b",ice:"#3b82f6",violet:"#8b5cf6"};
                return <button key={t} onClick={()=>{setWallTheme(t);localStorage.setItem("lamma_wall_theme",t);}} className="w-3.5 h-3.5 rounded-full transition-all" style={{background:c[t],outline:wallTheme===t?`2px solid ${c[t]}`:"none",outlineOffset:"2px"}}/>;
              })}
            </div>
          </div>

          {/* ══ LEFT SIDE: الزجاجي — بطاقة التعريف ══ */}
          <div className="hidden lg:flex relative w-[48%] shrink-0 order-3 overflow-hidden flex-col items-center justify-center"
            style={{
              background: "transparent",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}>

            {/* ── الكارت الذهبي الزجاجي ── */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[78%] max-w-[230px]">
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-[18px] overflow-hidden"
                style={{
                  background: "rgba(6,4,0,0.6)",
                  border: "1px solid rgba(212,175,55,0.45)",
                  boxShadow: "0 0 40px rgba(212,175,55,0.18), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,100,0.1)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="absolute top-0 left-4 right-4 h-[1.5px]"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(255,220,80,0.9),transparent)" }} />
                {[[true,true],[true,false],[false,true],[false,false]].map(([t,r],i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full animate-pulse"
                    style={{ top:t?"7px":"auto", bottom:!t?"7px":"auto", right:r?"9px":"auto", left:!r?"9px":"auto", background:"#ffd700", boxShadow:"0 0 5px #ffd700", animationDelay:`${i*0.4}s` }} />
                ))}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full blur-lg opacity-50"
                      style={{ background: "radial-gradient(circle,#ffd700 0%,transparent 70%)" }} />
                    <img src="/images/am-logo.png.png" alt="AM"
                      className="relative w-11 h-11 object-contain"
                      style={{ filter: "drop-shadow(0 0 10px rgba(255,215,0,0.6))" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-black leading-none" style={goldText}>لمة</p>
                    <p className="text-[7px] font-black tracking-[0.3em] mt-0.5" style={{ color: "rgba(212,175,55,0.65)" }}>LAMMA CHAT</p>
                  </div>
                </div>
              </motion.div>

              {/* اسم المالك — شفاف تحت الكارت */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-1.5 text-[9px] font-black tracking-[0.18em]"
                style={{ color: "rgba(212,175,55,0.5)", textShadow: "0 0 10px rgba(212,175,55,0.25)" }}
              >
                {brandCredit}
              </motion.p>
            </div>

            {/* ── وصف الشات أسفل الصورة ── */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h2 className="text-[20px] font-black text-white leading-tight mb-1"
                  style={{ textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
                  تعال اتكلم، شات<br />
                  <span style={goldText}>عربي احترافي 🔥</span>
                </h2>
                <p className="text-[10px] text-gray-200/75 leading-relaxed mb-2.5"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                  غرف عامة وخاصة بخصوصية تامة. دخول فوري بدون تعقيد.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["🛡️ مشفر","⚡ فوري","👥 غرف","🌐 عربي"].map((f,i) => (
                    <span key={i} className="text-[9px] font-black px-2 py-0.5 rounded-full"
                      style={{ background:"rgba(0,0,0,0.55)", border:"1px solid rgba(212,175,55,0.2)", color:"rgba(212,175,55,0.8)", backdropFilter:"blur(8px)" }}>
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* خط فاصل أيمن سماوي */}
            <div className="absolute top-0 bottom-0 right-0 w-[1.5px]"
              style={{ background: "linear-gradient(to bottom,transparent,rgba(56,139,253,0.55) 15%,rgba(56,139,253,0.55) 85%,transparent)" }} />
          </div>

        </motion.div>
      </div>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {showProfileNicknameModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
            <motion.div initial={{scale:0.92,y:24}} animate={{scale:1,y:0}} exit={{scale:0.92,y:24}} className="w-full max-w-sm rounded-[24px] p-6 relative" style={modalStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-white">اختيار اسم المستخدم</h3>
                <button onClick={()=>{setShowProfileNicknameModal(false);setPendingProfileUser(null);setPendingProfileColor(null);if(supabase)supabase.auth.signOut();}} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white" style={{background:"rgba(255,255,255,0.06)"}}><X size={13}/></button>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-4">اكتب اسم مستخدم يظهر بدل الإيميل في الشات.</p>
              <div className="relative mb-4">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none" style={{color:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.7)`}}><Hash size={15}/></span>
                <input type="text" value={profileNickname} onChange={(e)=>setProfileNickname(e.target.value)} className="w-full pr-11 pl-4 py-3 rounded-2xl text-[13px] text-white placeholder-gray-600 focus:outline-none transition-all" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} placeholder="مثال: Mohamed_99" onKeyDown={(e)=>e.key==="Enter"&&handleSaveProfileNickname()}/>
              </div>
              <button onClick={handleSaveProfileNickname} disabled={authLoading} className="w-full py-3 rounded-2xl text-[13px] font-black text-white transition-all disabled:opacity-50" style={wallSubmit}>{authLoading?"جاري الحفظ...":"حفظ والمتابعة"}</button>
            </motion.div>
          </motion.div>
        )}

        {showExtraOptions && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={()=>setShowExtraOptions(false)}>
            <motion.div initial={{scale:0.92,y:24}} animate={{scale:1,y:0}} exit={{scale:0.92,y:24}} onClick={(e)=>e.stopPropagation()} className="relative w-full max-w-md rounded-[28px] p-5 max-h-[85vh] overflow-y-auto" style={modalStyle}>
              <div className="absolute top-0 left-8 right-8 h-[1px]" style={{background:"linear-gradient(90deg,transparent,rgba(56,139,253,0.5),transparent)"}}/>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-white">خيارات إضافية</h3>
                <button onClick={()=>setShowExtraOptions(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white" style={{background:"rgba(255,255,255,0.06)"}}><X size={13}/></button>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl p-4" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-lg" style={{background:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.12)`}}>🤖</div>
                    <div><p className="text-[12px] font-black text-white">دخول سريع كضيف</p><p className="text-[10px] text-gray-500">بدون تسجيل، فوري وآمن</p></div>
                    <span className="mr-auto text-[9px] font-bold px-2 py-0.5 rounded-full" style={{background:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.1)`,color:`rgb(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b))`,border:`1px solid rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.2)`}}>تلقائي</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="text" readOnly value={guestId} className="flex-1 px-3 py-2 rounded-xl text-[11px] font-mono text-center focus:outline-none" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:`rgb(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b))`}}/>
                    <button onClick={handleCopyGuestId} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}><Copy size={13}/></button>
                    <button onClick={handleRegenerateGuestId} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white group" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}><RefreshCw size={13} className="transition-transform duration-500 group-hover:rotate-180"/></button>
                  </div>
                  <button onClick={()=>{setShowExtraOptions(false);handleSwiftGuestLogin();}} className="w-full py-2.5 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all text-white" style={wallSubmit}><Zap size={14}/><span>دخول بالاسم المقترح</span></button>
                </div>
                <button onClick={()=>{setShowExtraOptions(false);setShowShareModal(true);}} className="w-full py-3 rounded-2xl text-[12px] font-black flex items-center justify-center gap-2 transition-all text-gray-300 hover:text-white" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}><Share2 size={14}/><span>شارك رابط التطبيق</span></button>
                {import.meta.env.DEV && !supabase && (
                  <div className="grid grid-cols-2 gap-2">
                    {[{role:"owner",label:"👑 مالك",color:"rgba(245,158,11,"},{role:"admin",label:"🛡️ أدمن",color:"rgba(59,130,246,"}].map((item)=>(
                      <button key={item.role} onClick={()=>{const c=NICKNAME_COLORS[Math.floor(Math.random()*NICKNAME_COLORS.length)];setShowExtraOptions(false);onLogin(guestId,item.role,c,undefined,undefined,"guest");}} className="py-2.5 rounded-xl text-[11px] font-black transition-all" style={{background:`${item.color}0.07)`,border:`1px solid ${item.color}0.2)`,color:`${item.color}0.9)`}}>{item.label} (Dev)</button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showShareModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div initial={{scale:0.92,y:24}} animate={{scale:1,y:0}} exit={{scale:0.92,y:24}} className="w-full max-w-md rounded-[28px] p-6" style={modalStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-white">مشاركة التطبيق 💚</h3>
                <button onClick={()=>{setShowShareModal(false);setCopiedLink(false);}} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white" style={{background:"rgba(255,255,255,0.06)"}}><X size={13}/></button>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-4">شات لمة بيشتغل بخصوصية تامة — المحادثات مشفرة ومحمية.</p>
              <div className="rounded-2xl p-3.5 mb-4" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <p className="text-[10px] text-gray-500 mb-2">رابط الدخول المباشر:</p>
                <div className="flex gap-2">
                  <input readOnly value={appLink} onClick={(e)=>(e.target as HTMLInputElement).select()} className="flex-1 px-3 py-2.5 rounded-xl text-[11px] font-mono text-gray-300 focus:outline-none" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}/>
                  <button onClick={()=>{if(navigator.clipboard?.writeText){navigator.clipboard.writeText(appLink).then(()=>{setCopiedLink(true);playBeepSound(800,"sine");setTimeout(()=>setCopiedLink(false),3000);}).catch(()=>fallbackCopy(appLink));}else fallbackCopy(appLink);}} className="px-4 py-2.5 rounded-xl text-[11px] font-black transition-all shrink-0" style={copiedLink?{background:"rgba(34,197,94,0.15)",color:"#4ade80",border:"1px solid rgba(34,197,94,0.3)"}:{background:`rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.85)`,color:"white",border:`1px solid rgba(var(--lamma-wall-r),var(--lamma-wall-g),var(--lamma-wall-b),0.4)`}}>
                    {copiedLink?<span className="flex items-center gap-1.5"><Check size={12}/>تم</span>:"نسخ"}
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-center rounded-2xl p-4" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <p className="text-[10px] text-gray-500 mb-3">أو وجّه الكاميرا نحو الكود:</p>
                <div className="p-3 rounded-2xl bg-white inline-block">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(appLink)}`} alt="QR Code" className="w-[130px] h-[130px]" referrerPolicy="no-referrer"/>
                </div>
                <span className="text-[9px] text-emerald-500 mt-2 font-bold">🟢 اتصال مباشر آمن</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
