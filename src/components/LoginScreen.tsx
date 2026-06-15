import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Smartphone, X, Download, Info, Check, Apple, HelpCircle, User, Sparkles } from "lucide-react";
import {
  getResolvedSupabaseColor,
  getResolvedSupabaseNickname,
  hasPlaceholderSupabaseNickname,
  normalizeAuthRole,
} from "../lib/authProfile.ts";

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
  canInstallApp?: boolean;
  isInstalledApp?: boolean;
  onInstallApp?: () => Promise<void>;
  pendingSupabaseUser?: any | null;
}

type ViewMode = "main" | "options";
type MessageType = "success" | "error" | "info";

const NICKNAME_COLORS = [
  "#22c55e",
  "#3fb950",
  "#58a6ff",
  "#a371f7",
  "#ef4444",
  "#f59e0b",
];
const PROFILE_NICKNAME_MIN_LENGTH = 2;
const PROFILE_NICKNAME_MAX_LENGTH = 24;

function getSupabaseRole(user: any): string {
  return normalizeAuthRole(user?.user_metadata?.role);
}

function resolveOwnerGhostMode(role: string, user?: { id?: string; email?: string | null; nickname?: string }) {
  if (role !== "owner") return;

  const shouldEnableGhostMode = window.confirm(
    "هل تريد الدخول بالوضع الخفي كمالك؟\n\nاختر \"موافق\" للدخول مخفياً أو \"إلغاء\" للدخول بشكل عادي.",
  );

  const storageIdentity = String(
    user?.id || user?.email || user?.nickname || "owner",
  )
    .trim()
    .toLowerCase()
    .replace(/[^\w.-]+/g, "_");
  localStorage.setItem(
    `lamma_ghost_mode_supabase_${storageIdentity}`,
    String(shouldEnableGhostMode),
  );
}

function randomGuestId() {
  return `LC-Guest${Math.floor(10000 + Math.random() * 90000)}`;
}

function randomColor() {
  return NICKNAME_COLORS[Math.floor(Math.random() * NICKNAME_COLORS.length)];
}

function EnvelopeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6.5C4 5.67 4.67 5 5.5 5H18.5C19.33 5 20 5.67 20 6.5V17.5C20 18.33 19.33 19 18.5 19H5.5C4.67 19 4 18.33 4 17.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 7L12 12.2L19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginScreen(props: LoginScreenProps) {
  const { onLogin, canInstallApp, onInstallApp, pendingSupabaseUser } = props;
  const brandName = import.meta.env.VITE_BRAND_NAME || "Lamma Chat";
  const brandCredit = import.meta.env.VITE_BRAND_CREDIT || "MR / Mohamed Samy";

  const [view, setView] = useState<ViewMode>("main");
  const [emailOpen, setEmailOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [guestNickname, setGuestNickname] = useState(() => randomGuestId());
  const [message, setMessage] = useState<{
    text: string;
    type: MessageType;
  } | null>(null);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPassword2, setRegisterPassword2] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPassword2, setShowRegisterPassword2] = useState(false);

  const [pendingProfileUser, setPendingProfileUser] = useState<any | null>(null);
  const [pendingProfileColor, setPendingProfileColor] = useState<string | null>(null);
  const [profileNickname, setProfileNickname] = useState("");
  const [showProfileNicknameModal, setShowProfileNicknameModal] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"ios" | "android">("ios");

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!pendingSupabaseUser) return;
    setPendingProfileUser(pendingSupabaseUser);
    setPendingProfileColor((prev) => prev || randomColor());
    setProfileNickname("");
    setShowProfileNicknameModal(true);
    setView("options");
    setEmailOpen(true);
    setRegisterOpen(false);
  }, [pendingSupabaseUser]);

  const showFeedback = (
    text: string,
    type: MessageType = "info",
    forceOptionsView = false,
  ) => {
    setMessage({ text, type });
    if (forceOptionsView) {
      setView("options");
    }
  };

  const handleGoToOptions = () => {
    setView("options");
  };

  const handleGoBack = () => {
    setView("main");
  };

  const regenerateGuestNickname = () => {
    setGuestNickname(randomGuestId());
  };

  const handleGuestLogin = () => {
    const nickname = guestNickname.trim() || randomGuestId();
    onLogin(nickname, "guest", randomColor(), undefined, undefined, "guest");
  };

  const handleInstallApp = async () => {
    if (!canInstallApp || !onInstallApp) return;
    setInstallingApp(true);
    try {
      await onInstallApp();
    } finally {
      setInstallingApp(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      showFeedback("إعدادات السيرفر غير مكتملة حالياً.", "error", true);
      return;
    }

    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        showFeedback(error.message || "تعذر بدء تسجيل الدخول عبر Google.", "error", true);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier) {
      showFeedback("اكتب البريد الإلكتروني أولاً.", "error", true);
      setEmailOpen(true);
      setRegisterOpen(false);
      return;
    }

    if (!password) {
      showFeedback("اكتب كلمة المرور أولاً.", "error", true);
      setEmailOpen(true);
      setRegisterOpen(false);
      return;
    }

    if (!identifier.includes("@")) {
      showFeedback(
        "تسجيل الدخول هنا حالياً يدعم البريد الإلكتروني فقط.",
        "error",
        true,
      );
      setEmailOpen(true);
      setRegisterOpen(false);
      return;
    }

    if (!supabase) {
      showFeedback("إعدادات السيرفر غير مكتملة حالياً.", "error", true);
      return;
    }

    const assignedColor = randomColor();

    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      if (error) {
        showFeedback(error.message || "فشل تسجيل الدخول.", "error", true);
        return;
      }

      if (!data.user) {
        showFeedback("فشل تسجيل الدخول.", "error", true);
        return;
      }

      const authRole = getSupabaseRole(data.user);
      const metaNick = getResolvedSupabaseNickname(data.user);
      const resolvedColor = getResolvedSupabaseColor(data.user);

      if (hasPlaceholderSupabaseNickname(data.user)) {
        setPendingProfileUser(data.user);
        setPendingProfileColor(resolvedColor);
        setProfileNickname("");
        setShowProfileNicknameModal(true);
        return;
      }

      if (!data.user.user_metadata?.color) {
        void supabase.auth.updateUser({
          data: { color: resolvedColor },
        });
      }

      resolveOwnerGhostMode(authRole, {
        id: data.user.id,
        email: data.user.email,
        nickname: metaNick,
      });

      onLogin(
        metaNick,
        authRole,
        resolvedColor,
        data.user.id,
        data.user.email ?? undefined,
        "supabase",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const email = registerEmail.trim();
    const password = registerPassword.trim();
    const password2 = registerPassword2.trim();

    if (!email) {
      showFeedback("اكتب البريد الإلكتروني أولاً.", "error", true);
      setEmailOpen(true);
      setRegisterOpen(true);
      return;
    }

    if (!password) {
      showFeedback("اكتب كلمة المرور أولاً.", "error", true);
      setEmailOpen(true);
      setRegisterOpen(true);
      return;
    }

    if (password.length < 6) {
      showFeedback("كلمة المرور لازم تكون 6 أحرف على الأقل.", "error", true);
      setEmailOpen(true);
      setRegisterOpen(true);
      return;
    }

    if (password !== password2) {
      showFeedback("تأكيد كلمة المرور غير مطابق.", "error", true);
      setEmailOpen(true);
      setRegisterOpen(true);
      return;
    }

    if (!supabase) {
      showFeedback("إعدادات السيرفر غير مكتملة حالياً.", "error", true);
      return;
    }

    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        showFeedback(error.message || "فشل إنشاء الحساب.", "error", true);
        return;
      }

      if (data.session?.user) {
        setPendingProfileUser(data.session.user);
        setPendingProfileColor(randomColor());
        setProfileNickname("");
        setShowProfileNicknameModal(true);
        return;
      }

      setRegisterOpen(false);
      setLoginIdentifier(email);
      setRegisterPassword("");
      setRegisterPassword2("");
      showFeedback(
        "تم إنشاء الحساب. لو تفعيل البريد مطلوب، راجع بريدك ثم سجل الدخول واختَر اسمك بنفسك.",
        "success",
        true,
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfileNickname = async () => {
    const nickname = profileNickname.trim();

    if (!nickname) {
      showFeedback("اكتب اسم المستخدم أولاً.", "error", true);
      return;
    }

    if (nickname.length < PROFILE_NICKNAME_MIN_LENGTH) {
      showFeedback("اسم المستخدم يجب أن يكون حرفين على الأقل.", "error", true);
      return;
    }

    if (nickname.length > PROFILE_NICKNAME_MAX_LENGTH) {
      showFeedback("اسم المستخدم يجب ألا يزيد عن 24 حرفاً.", "error", true);
      return;
    }

    if (!supabase || !pendingProfileUser || !pendingProfileColor) {
      showFeedback("إعدادات Supabase غير مكتملة حالياً.", "error", true);
      return;
    }

    const previewUser = {
      ...pendingProfileUser,
      user_metadata: {
        ...(pendingProfileUser.user_metadata ?? {}),
        nickname,
      },
    };

    if (hasPlaceholderSupabaseNickname(previewUser)) {
      showFeedback(
        "اختر اسماً واضحاً بعيداً عن أسماء الرتب أو الأسماء التجريبية.",
        "error",
        true,
      );
      return;
    }

    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        data: {
          nickname,
          color: pendingProfileColor,
        },
      });

      if (error) {
        showFeedback(error.message || "تعذر حفظ اسم المستخدم.", "error", true);
        return;
      }

      const user = data.user || pendingProfileUser;
      setShowProfileNicknameModal(false);
      setPendingProfileUser(null);
      setPendingProfileColor(null);

      const authRole = getSupabaseRole(user);
      resolveOwnerGhostMode(authRole, {
        id: user.id,
        email: user.email,
        nickname,
      });

      onLogin(
        nickname,
        authRole,
        pendingProfileColor,
        user.id,
        user.email ?? undefined,
        "supabase",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <main className="page legacyLoginRoot" dir="rtl">
      <section className="card" aria-label="تسجيل الدخول">
        <div className="panel" id="panel" data-view={view}>
          <div className="view view--main">
            <header className="brand">
              <span className="brandLogoWrap">
                <img
                  className="brandLogo"
                  src="/images/lamma-logo-nice.png"
                  alt={brandName}
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.src = "/images/lamma-logo.png";
                  }}
                />
              </span>
            </header>

            <div className="afterLogo">
              <div className="tagline" aria-label="وصف">
                المتعه كلها بتستناك
              </div>

              <div className="tagline2" aria-label="وصف إضافي">
                شات بالروح المصرية بيجمع تلاقي مع الأصالة العربية
              </div>

              <div className="badges" aria-label="مميزات">
                <span className="badge">🛡️ خصوصية</span>
                <span className="badge">⚡ أمان</span>
                <span className="badge">رَوْقان</span>
              </div>

              <div className="mainActions">
                <button
                  className="primaryBtn primaryBtn--go"
                  type="button"
                  id="openOptions"
                  aria-label="يالا بينا — انتقل لصفحة تسجيل الدخول"
                  onClick={handleGoToOptions}
                >
                  <span className="goText">يالا بينا</span>
                  <span className="goArrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>

              <footer className="legal" aria-label="حقوق ونظام">
                <div>© 2026 Lamma Chat. جميع الحقوق محفوظة — توثيق وهوية خاصة:</div>
                <div className="idCard">By MR / Mohamed Samy</div>
                <div className="installRow">
                  <button
                    type="button"
                    className="installAppBtn"
                    onClick={() => {
                      if (canInstallApp) {
                        handleInstallApp();
                      } else {
                        setShowInstallGuide(true);
                      }
                    }}
                    disabled={installingApp}
                    aria-label="تحميل تطبيق الموبايل"
                  >
                    <span className="installAppIcon" aria-hidden="true">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 3v10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M8 11l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 21h14"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="installAppText">
                      {installingApp ? "جاري التحميل..." : "تحميل تطبيق الموبايل 📱"}
                    </span>
                  </button>
                </div>
              </footer>

              {message && view === "main" ? (
                <p className={`msg legacyMsg is${capitalize(message.type)}`}>
                  {message.text}
                </p>
              ) : null}
            </div>
          </div>

          <div className="view view--options">
            <section className="optionCard optionCard--empty" aria-label="مساحة فارغة">
              <div className="optionTop">
                <button
                  className="backBtn"
                  type="button"
                  data-action="back"
                  aria-label="رجوع"
                  onClick={handleGoBack}
                >
                  ←
                </button>
              </div>
              <div className="storyWrap">
                <div className="storyCard" aria-label="وصف لمة">
                  <div className="storyKicker">
                    <Sparkles size={11} style={{ display: "inline-block", marginInlineEnd: "4px", verticalAlign: "middle" }} />
                    أهلاً بك يا شريكي في «لمة»
                  </div>
                  <div className="storyTitle">لمة.. قعدتنا الرقمية</div>
                  
                  <div className="storyQuoteContainer">
                    <p className="storyP" style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", fontWeight: "700", textAlign: "center", paddingLeft: "53px", paddingRight: "53px", paddingTop: "12px", paddingBottom: "0px" }}>
                      لمة مش مجرد شات، دي قعدتنا الرقمية اللي بتجمعنا ونهرب فيها من ضجيج العالم لنجد <span className="storyGold">(ونس)</span> حقيقي.
                    </p>
                    <p className="storyP" style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.45", opacity: 0.9, textAlign: "center" }}>
                      هنا يختفي الفاصل الزمني، وبتبدأ اللمة، الضحكة، والحكايات اللي بجد..
                    </p>
                    <p className="storyP" style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.4", color: "#f7e7b4", fontWeight: "900", textAlign: "center" }}>
                      ومكانكم اللي هنستناكم فيه دايمًا.
                    </p>
                  </div>

                  <div className="storyEmailNote">
                    بعد التسجيل بالإيميل هتختار اسمك بنفسك داخل الشات.
                  </div>

                  <div className="guestQuick" aria-label="دخول كضيف">
                    <div className="guestQuickTitle">دخول كزائر</div>
                    <div className="guestQuickSub">
                      اسم مولّد تلقائيًا — تقدر تغيّره قبل الدخول.
                    </div>
                    <div className="guestQuickCard">
                      <div className="field">
                        <label className="label" htmlFor="guestNickname">
                          اسم الزائر
                        </label>
                        <div className="guestInputWrapper">
                          <input
                            className="input"
                            id="guestNickname"
                            name="guestNickname"
                            type="text"
                            autoComplete="off"
                            placeholder="مثال: LC-Guest12345"
                            value={guestNickname}
                            onChange={(e) => setGuestNickname(e.target.value)}
                          />
                          <span className="guestInputIcon">
                            <User size={15} />
                          </span>
                        </div>
                      </div>
                      <div className="guestQuickActions">
                        <button
                          className="primaryBtn"
                          type="button"
                          onClick={handleGuestLogin}
                          disabled={authLoading}
                        >
                          دخول كزائر
                        </button>
                        <button
                          className="secondaryBtn guestQuickSecondary"
                          type="button"
                          onClick={regenerateGuestNickname}
                          disabled={authLoading}
                        >
                          توليد اسم
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="optionCard optionCard--methods" aria-label="طرق التسجيل">
              <div className="optionTop">
                <button
                  className="backBtn"
                  type="button"
                  data-action="back"
                  aria-label="رجوع"
                  onClick={handleGoBack}
                >
                  ←
                </button>
              </div>

              <div className="methodsList">
                <div className="methodsHero" aria-label="اختيار طريقة التسجيل">
                  <h2 className="methodsTitle">اختيارات دخول لمة</h2>
                </div>

                <div className="guestQuick guestQuick--mobile" aria-label="دخول كضيف">
                  <div className="guestQuickTitle">دخول كزائر</div>
                  <div className="guestQuickSub">اسم مولّد تلقائيًا — تقدر تغيّره قبل الدخول.</div>
                  <div className="guestQuickCard">
                    <div className="field">
                      <label className="label" htmlFor="guestNicknameMobile">
                        اسم الزائر
                      </label>
                      <div className="guestInputWrapper">
                        <input
                          className="input"
                          id="guestNicknameMobile"
                          name="guestNicknameMobile"
                          type="text"
                          autoComplete="off"
                          placeholder="مثال: LC-Guest12345"
                          value={guestNickname}
                          onChange={(e) => setGuestNickname(e.target.value)}
                        />
                        <span className="guestInputIcon">
                          <User size={15} />
                        </span>
                      </div>
                    </div>
                    <div className="guestQuickActions">
                      <button
                        className="primaryBtn"
                        type="button"
                        onClick={handleGuestLogin}
                        disabled={authLoading}
                      >
                        دخول كزائر
                      </button>
                      <button
                        className="secondaryBtn guestQuickSecondary"
                        type="button"
                        onClick={regenerateGuestNickname}
                        disabled={authLoading}
                      >
                        توليد اسم
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  className="secondaryBtn methodRow"
                  type="button"
                  data-action="google"
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  style={{ marginBottom: "8px" }}
                >
                  <span className="methodLeft">
                    <span className="methodIcon methodIcon--g" aria-hidden="true">
                      G
                    </span>
                    <span className="methodText">الدخول السريع بـ Google</span>
                  </span>
                </button>

                <div className="emailDirectSection">
                  <div className="authTabs">
                    <button
                      className={`authTabBtn ${!registerOpen ? "active" : ""}`}
                      type="button"
                      onClick={() => setRegisterOpen(false)}
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      className={`authTabBtn ${registerOpen ? "active" : ""}`}
                      type="button"
                      onClick={() => setRegisterOpen(true)}
                    >
                      إنشاء حساب جديد
                    </button>
                  </div>

                  <div className="emailPane" style={{ marginTop: "12px" }}>
                    {!registerOpen ? (
                      <form id="loginForm" className="form" noValidate onSubmit={handleLoginSubmit}>
                        <div className="field">
                          <label className="label" htmlFor="loginIdentifier">
                            البريد الإلكتروني
                          </label>
                          <input
                            className="input"
                            id="loginIdentifier"
                            name="identifier"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="example@email.com"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            required
                          />
                        </div>

                        <div className="field">
                          <label className="label" htmlFor="loginPassword">
                            كلمة المرور
                          </label>
                          <div className="passwordWrap">
                            <input
                              className="input"
                              id="loginPassword"
                              name="password"
                              type={showLoginPassword ? "text" : "password"}
                              autoComplete="current-password"
                              placeholder="••••••••"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              required
                            />
                            <button
                              className="iconBtn"
                              type="button"
                              aria-label={showLoginPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                              onClick={() => setShowLoginPassword((value) => !value)}
                            >
                              {showLoginPassword ? "إخفاء" : "إظهار"}
                            </button>
                          </div>
                        </div>

                        <button
                          className={`primaryBtn${authLoading ? " isLoading" : ""}`}
                          type="submit"
                          disabled={authLoading}
                        >
                          <span className="btnText">
                            {authLoading ? "جارٍ التنفيذ..." : "تسجيل الدخول"}
                          </span>
                          <span className="spinner" aria-hidden="true"></span>
                        </button>
                      </form>
                    ) : (
                      <div className="emailRegisterPanel" style={{ background: "transparent", border: "none", padding: 0 }}>
                        <form
                          id="registerForm"
                          className="form"
                          noValidate
                          onSubmit={handleRegisterSubmit}
                        >
                          <div className="field">
                            <label className="label" htmlFor="registerEmail">
                              البريد الإلكتروني
                            </label>
                            <input
                              className="input"
                              id="registerEmail"
                              name="email"
                              type="email"
                              autoComplete="email"
                              inputMode="email"
                              placeholder="example@email.com"
                              value={registerEmail}
                              onChange={(e) => setRegisterEmail(e.target.value)}
                              required
                            />
                          </div>

                          <div className="field">
                            <label className="label" htmlFor="registerPassword">
                              كلمة المرور
                            </label>
                            <div className="passwordWrap">
                              <input
                                className="input"
                                id="registerPassword"
                                name="password"
                                type={showRegisterPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                required
                              />
                              <button
                                className="iconBtn"
                                type="button"
                                aria-label={
                                  showRegisterPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                                }
                                onClick={() => setShowRegisterPassword((value) => !value)}
                              >
                                {showRegisterPassword ? "إخفاء" : "إظهار"}
                              </button>
                            </div>
                          </div>

                          <div className="field">
                            <label className="label" htmlFor="registerPassword2">
                              تأكيد كلمة المرور
                            </label>
                            <div className="passwordWrap">
                              <input
                                className="input"
                                id="registerPassword2"
                                name="password2"
                                type={showRegisterPassword2 ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={registerPassword2}
                                onChange={(e) => setRegisterPassword2(e.target.value)}
                                required
                              />
                              <button
                                className="iconBtn"
                                type="button"
                                aria-label={
                                  showRegisterPassword2
                                    ? "إخفاء تأكيد كلمة المرور"
                                    : "إظهار تأكيد كلمة المرور"
                                }
                                onClick={() => setShowRegisterPassword2((value) => !value)}
                              >
                                {showRegisterPassword2 ? "إخفاء" : "إظهار"}
                              </button>
                            </div>
                          </div>

                          <button
                            className={`primaryBtn${authLoading ? " isLoading" : ""}`}
                            type="submit"
                            disabled={authLoading}
                          >
                            <span className="btnText">
                              {authLoading ? "جارٍ التنفيذ..." : "إنشاء حساب"}
                            </span>
                            <span className="spinner" aria-hidden="true"></span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                {message ? (
                  <p className={`msg legacyMsg is${capitalize(message.type)}`}>
                    {message.text}
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </section>

      {showProfileNicknameModal ? (
        <div className="legacyProfileOverlay">
          <div className="legacyProfileCard" role="dialog" aria-modal="true">
            <h3 className="legacyProfileTitle">اختيار اسم المستخدم</h3>
            <p className="legacyProfileText">
              علشان يظهر اسمك بدل الإيميل، اكتب اسم مستخدم واحد وهنحفظه على الحساب.
            </p>
            <div className="field">
              <label className="label" htmlFor="profileNickname">
                اسم المستخدم
              </label>
              <input
                className="input"
                id="profileNickname"
                name="profileNickname"
                type="text"
                autoComplete="off"
                placeholder="مثال: لمة_محمد"
                maxLength={PROFILE_NICKNAME_MAX_LENGTH}
                value={profileNickname}
                onChange={(e) => setProfileNickname(e.target.value)}
              />
            </div>
            <div className="legacyProfileActions">
              <button
                className="secondaryBtn"
                type="button"
                onClick={async () => {
                  setShowProfileNicknameModal(false);
                  setPendingProfileUser(null);
                  setPendingProfileColor(null);
                  await supabase?.auth.signOut({ scope: "local" });
                  showFeedback("تم إلغاء الدخول.", "info", true);
                }}
                disabled={authLoading}
              >
                إلغاء
              </button>
              <button
                className={`primaryBtn${authLoading ? " isLoading" : ""}`}
                type="button"
                onClick={handleSaveProfileNickname}
                disabled={authLoading}
              >
                <span className="btnText">
                  {authLoading ? "جارٍ الحفظ..." : "حفظ"}
                </span>
                <span className="spinner" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showInstallGuide ? (
        <div className="legacyProfileOverlay" style={{ zIndex: 1100 }}>
          <div className="legacyProfileCard" style={{ width: "min(440px, 100%)", direction: "rtl", textShadow: "none" }} role="dialog" aria-modal="true">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 className="legacyProfileTitle" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📱</span>
                تثبيت تطبيق لمة بالشات
              </h3>
              <button 
                type="button" 
                onClick={() => setShowInstallGuide(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <p className="legacyProfileText" style={{ fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>
              استمتع بأفضل وأسرع تجربة لشات لمة على موبايلك! يفتح التطبيق في ثانية، ويشتغل بجودة كاملة وسهولة فائقة من الشاشة الرئيسية.
            </p>

            {/* Platform Tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setActiveGuideTab("ios")}
                style={{
                  padding: "10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border: "1px solid " + (activeGuideTab === "ios" ? "rgba(214, 179, 91, 0.6)" : "rgba(255,255,255,0.06)"),
                  background: activeGuideTab === "ios" ? "linear-gradient(135deg, rgba(214, 179, 91, 0.25), rgba(166, 120, 42, 0.1))" : "rgba(255,255,255,0.03)",
                  color: activeGuideTab === "ios" ? "#f7e7b4" : "#ccc"
                }}
              >
                 هواتف الآيفون (iOS)
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab("android")}
                style={{
                  padding: "10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border: "1px solid " + (activeGuideTab === "android" ? "rgba(214, 179, 91, 0.6)" : "rgba(255,255,255,0.06)"),
                  background: activeGuideTab === "android" ? "linear-gradient(135deg, rgba(214, 179, 91, 0.25), rgba(166, 120, 42, 0.1))" : "rgba(255,255,255,0.03)",
                  color: activeGuideTab === "android" ? "#f7e7b4" : "#ccc"
                }}
              >
                🤖 هواتف الأندرويد
              </button>
            </div>

            {/* Dynamic steps based on tab selection */}
            {activeGuideTab === "ios" ? (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "14px", fontSize: "12.5px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ background: "rgba(214,179,91,0.2)", color: "#f7e7b4", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", flexShrink: 0, fontSize: "12px" }}>١</span>
                  <p style={{ margin: 0, color: "rgba(233, 238, 252, 0.9)", lineHeight: "1.5" }}>
                    افتح الموقع في متصفّح <strong>Safari</strong> الرسمي.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ background: "rgba(214,179,91,0.2)", color: "#f7e7b4", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", flexShrink: 0, fontSize: "12px" }}>٢</span>
                  <p style={{ margin: 0, color: "rgba(233, 238, 252, 0.9)", lineHeight: "1.5" }}>
                    اضغط على زر المشاركة <strong style={{ color: "#f7e7b4" }}>المشاركة 📤</strong> بالأسفل/الأعلى.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span style={{ background: "rgba(214,179,91,0.2)", color: "#f7e7b4", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", flexShrink: 0, fontSize: "12px" }}>٣</span>
                  <p style={{ margin: 0, color: "rgba(233, 238, 252, 0.9)", lineHeight: "1.5" }}>
                    اختر <strong style={{ color: "rgba(214, 179, 91, 0.95)" }}>"إضافة إلى الشاشة الرئيسية" ➕</strong> (Add to Home Screen) من الخيارات.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "14px", fontSize: "12.5px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ background: "rgba(214,179,91,0.2)", color: "#f7e7b4", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", flexShrink: 0, fontSize: "12px" }}>١</span>
                  <p style={{ margin: 0, color: "rgba(233, 238, 252, 0.9)", lineHeight: "1.5" }}>
                    افتح الموقع في متصفّح <strong>Google Chrome</strong> على موبايلك.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ background: "rgba(214,179,91,0.2)", color: "#f7e7b4", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", flexShrink: 0, fontSize: "12px" }}>٢</span>
                  <p style={{ margin: 0, color: "rgba(233, 238, 252, 0.9)", lineHeight: "1.5" }}>
                    اضغط على زر الخيارات (الثلاث نقاط) <strong style={{ color: "#f7e7b4" }}>⁝</strong> بأعلى الزاوية.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span style={{ background: "rgba(214,179,91,0.2)", color: "#f7e7b4", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", flexShrink: 0, fontSize: "12px" }}>٣</span>
                  <p style={{ margin: 0, color: "rgba(233, 238, 252, 0.9)", lineHeight: "1.5" }}>
                    اضغط على <strong style={{ color: "rgba(214, 179, 91, 0.95)" }}>"تثبيت التطبيق" 📥</strong> أو "إضافة إلى الشاشة الرئيسية".
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="primaryBtn"
              style={{ width: "100%", marginTop: "18px", padding: "12px", borderRadius: "14px", fontWeight: "bold", cursor: "pointer", background: "linear-gradient(135deg, #f7e7b4 0%, #d6b35b 100%)", color: "#000", border: "none" }}
            >
              فهمت، جاهز للتثبيت 👍
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function capitalize(value: MessageType) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
