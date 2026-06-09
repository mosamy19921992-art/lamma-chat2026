import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import "./login-screen-legacy.css";

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

type ViewMode = "main" | "options";
type EmailTab = "login" | "register";
type MessageType = "success" | "error" | "info";

const NICKNAME_COLORS = [
  "#22c55e",
  "#3fb950",
  "#58a6ff",
  "#a371f7",
  "#ef4444",
  "#f59e0b",
];

function randomGuestId() {
  return `LC-Guest${Math.floor(10000 + Math.random() * 90000)}`;
}

function randomColor() {
  return NICKNAME_COLORS[Math.floor(Math.random() * NICKNAME_COLORS.length)];
}

function deriveNicknameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "";
  const cleaned = localPart
    .replace(/[^a-zA-Z0-9_\u0600-\u06FF.-]/g, "")
    .slice(0, 24);
  return cleaned || `Member${Math.floor(1000 + Math.random() * 9000)}`;
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

function QuickIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 2L3 14H11L9 22L21 9H13L13 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginScreen(props: LoginScreenProps) {
  const { onLogin } = props;
  const brandName = import.meta.env.VITE_BRAND_NAME || "Lamma Chat";
  const brandCredit = import.meta.env.VITE_BRAND_CREDIT || "MR / Mohamed Samy";
  const appLink = import.meta.env.VITE_APP_URL || window.location.origin;

  const [view, setView] = useState<ViewMode>("main");
  const [emailTab, setEmailTab] = useState<EmailTab>("login");
  const [emailOpen, setEmailOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
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

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

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

  const handleQuickLogin = () => {
    onLogin(randomGuestId(), "guest", randomColor(), undefined, undefined, "guest");
  };

  const handleShare = async () => {
    const shareData = { title: brandName, url: appLink };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showFeedback("تم فتح مشاركة الرابط.", "success", true);
        return;
      }
    } catch {
      return;
    }

    try {
      await navigator.clipboard.writeText(appLink);
      showFeedback("اتنسخ الرابط.", "success", true);
    } catch {
      showFeedback(appLink, "info", true);
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
      setEmailTab("login");
      return;
    }

    if (!password) {
      showFeedback("اكتب كلمة المرور أولاً.", "error", true);
      setEmailOpen(true);
      setEmailTab("login");
      return;
    }

    if (!identifier.includes("@")) {
      showFeedback(
        "تسجيل الدخول هنا حالياً يدعم البريد الإلكتروني فقط.",
        "error",
        true,
      );
      setEmailOpen(true);
      setEmailTab("login");
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

      const metaNick =
        data.user.user_metadata?.nickname || data.user.user_metadata?.name;

      if (!metaNick) {
        setPendingProfileUser(data.user);
        setPendingProfileColor(assignedColor);
        setProfileNickname("");
        setShowProfileNicknameModal(true);
        return;
      }

      onLogin(
        metaNick,
        "user",
        assignedColor,
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
      setEmailTab("register");
      return;
    }

    if (!password) {
      showFeedback("اكتب كلمة المرور أولاً.", "error", true);
      setEmailOpen(true);
      setEmailTab("register");
      return;
    }

    if (password.length < 6) {
      showFeedback("كلمة المرور لازم تكون 6 أحرف على الأقل.", "error", true);
      setEmailOpen(true);
      setEmailTab("register");
      return;
    }

    if (password !== password2) {
      showFeedback("تأكيد كلمة المرور غير مطابق.", "error", true);
      setEmailOpen(true);
      setEmailTab("register");
      return;
    }

    if (!supabase) {
      showFeedback("إعدادات السيرفر غير مكتملة حالياً.", "error", true);
      return;
    }

    try {
      setAuthLoading(true);
      const nickname = deriveNicknameFromEmail(email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        showFeedback(error.message || "فشل إنشاء الحساب.", "error", true);
        return;
      }

      if (data.session?.user) {
        onLogin(
          nickname,
          "user",
          randomColor(),
          data.session.user.id,
          data.session.user.email ?? undefined,
          "supabase",
        );
        return;
      }

      setEmailTab("login");
      setLoginIdentifier(email);
      setRegisterPassword("");
      setRegisterPassword2("");
      showFeedback(
        "تم إنشاء الحساب. لو تفعيل البريد مطلوب، راجع بريدك ثم سجل الدخول.",
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

    if (!supabase || !pendingProfileUser || !pendingProfileColor) {
      showFeedback("إعدادات Supabase غير مكتملة حالياً.", "error", true);
      return;
    }

    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        data: { nickname },
      });

      if (error) {
        showFeedback(error.message || "تعذر حفظ اسم المستخدم.", "error", true);
        return;
      }

      const user = data.user || pendingProfileUser;
      setShowProfileNicknameModal(false);
      setPendingProfileUser(null);
      setPendingProfileColor(null);

      onLogin(
        nickname,
        "user",
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
              <img
                className="brandLogo"
                src="/images/lamma-logo-نايس.png"
                alt={brandName}
                loading="eager"
                decoding="async"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.onerror = null;
                  img.src = "/images/lamma-logo.png";
                }}
              />
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
                <div className="idCard">{brandCredit}</div>
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
                  <div className="storyKicker">أهلاً بك يا شريكي في «لمة»</div>
                  <div className="storyTitle">لمة.. قعدتنا الرقمية</div>
                  <p className="storyP">لمة مش مجرد شات، دي قعدتنا الرقمية اللي بتجمعنا.</p>
                  <p className="storyP">
                    المكان اللي بنهرب فيه من ضجيج العالم عشان نلاقي{" "}
                    <span className="storyGold">(ونس)</span>
                    {" "}حقيقي.
                  </p>
                  <p className="storyP">
                    هنا الفاصل الزمني بيختفي، وبتبدأ اللمة، والضحكة، والحكايات اللي بجد.
                  </p>
                  <p className="storyP storyP--end">
                    لمة.. مكانكم اللي هنستناكم فيه دايمًا
                  </p>
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
                <details className="methodDisclosure" open={emailOpen}>
                  <summary
                    className="methodSummary"
                    onClick={(e) => {
                      e.preventDefault();
                      setEmailOpen((current) => !current);
                    }}
                  >
                    <span className="methodLeft">
                      <span className="methodIcon" aria-hidden="true">
                        <EnvelopeIcon />
                      </span>
                      <span className="methodText">البريد الإلكتروني</span>
                    </span>
                    <span className="methodCaret" aria-hidden="true">
                      ▾
                    </span>
                  </summary>

                  <div className="methodPanel emailPanel" data-email-tab={emailTab}>
                    <div className="emailTabs" role="tablist" aria-label="تبديل">
                      <button
                        className="tabBtn"
                        type="button"
                        role="tab"
                        aria-selected={emailTab === "login"}
                        data-email-tab-btn="login"
                        onClick={() => setEmailTab("login")}
                      >
                        دخول
                      </button>
                      <button
                        className="tabBtn"
                        type="button"
                        role="tab"
                        aria-selected={emailTab === "register"}
                        data-email-tab-btn="register"
                        onClick={() => setEmailTab("register")}
                      >
                        حساب جديد
                      </button>
                    </div>

                    <div className="emailPane emailPane--login">
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
                    </div>

                    <div className="emailPane emailPane--register">
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
                              aria-label={showRegisterPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
                              aria-label={showRegisterPassword2 ? "إخفاء تأكيد كلمة المرور" : "إظهار تأكيد كلمة المرور"}
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
                  </div>
                </details>

                <button
                  className="secondaryBtn methodRow"
                  type="button"
                  data-action="google"
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                >
                  <span className="methodLeft">
                    <span className="methodIcon methodIcon--g" aria-hidden="true">
                      G
                    </span>
                    <span className="methodText">Google</span>
                  </span>
                </button>

                <button
                  className="secondaryBtn methodRow"
                  type="button"
                  data-action="quick"
                  onClick={handleQuickLogin}
                  disabled={authLoading}
                >
                  <span className="methodLeft">
                    <span className="methodIcon" aria-hidden="true">
                      <QuickIcon />
                    </span>
                    <span className="methodText">دخول سريع</span>
                  </span>
                </button>

                <button
                  className="secondaryBtn methodRow methodRow--link"
                  type="button"
                  data-action="share"
                  aria-label="شارك رابط تطبيق لمة مع أصحابك"
                  onClick={handleShare}
                >
                  شارك رابط لمة
                </button>

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
                type="text"
                autoComplete="nickname"
                placeholder="مثال: لمة_محمد"
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
                  await supabase?.auth.signOut();
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
    </main>
  );
}

function capitalize(value: MessageType) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
