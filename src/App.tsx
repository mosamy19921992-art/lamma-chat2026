import React, { useState, useEffect, lazy, Suspense } from 'react';
import LoginScreen from './components/LoginScreen';
import DesignPreview from './components/DesignPreview';

// مؤقت: عرض معاينة التصميم الجديد قبل تطبيقه على شاشة الدخول الحقيقية.
// بعد موافقة المستخدم نرجّع هذا للـ false ونطبّق التصميم على LoginScreen.
const SHOW_DESIGN_PREVIEW = true;
import ErrorBoundary from './components/ErrorBoundary';
import { useServiceWorker } from './hooks/useServiceWorker';
import InstallPrompt from './components/pwa/InstallPrompt';
import UpdateBanner from './components/pwa/UpdateBanner';
import OnlineStatus from './components/pwa/OnlineStatus';
import ThemeFab from './components/pwa/ThemeFab';
import { useTheme } from './hooks/useTheme';
import { supabase } from './lib/supabase';
import type { UserSession } from './lib/chatTypes';

// Lazy-load ChatScreen so the LoginScreen (which is the entry surface
// for guests and unauthenticated users) ships in a smaller initial bundle.
const ChatScreen = lazy(() => import('./components/ChatScreen'));

type Theme = 'dark' | 'amoled';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [primaryTheme, setPrimaryTheme] = useState<Theme>('dark');

  // PWA: register service worker, expose install/update state.
  const sw = useServiceWorker();
  // Theme: load + persist the active palette.
  // (useTheme runs in the background — it sets CSS variables.)
  useTheme();

  useEffect(() => {
    if (!supabase) return;

    // 1) محاولة جلب الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const nick =
          (session.user.user_metadata as any)?.nickname ||
          (session.user.user_metadata as any)?.name ||
          (session.user.email ?? 'User');
        setUser({
          nickname: nick,
          role: 'user',
          color: 'white',
          uid: session.user.id,
          email: session.user.email ?? null,
          authProvider: 'supabase',
        });
      }
    });

    // 2) الاستماع لتغييرات الحالة (تسجيل دخول أو خروج)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? {
              nickname:
                (session.user.user_metadata as any)?.nickname ||
                (session.user.user_metadata as any)?.name ||
                (session.user.email ?? 'User'),
              role: 'user',
              color: 'white',
              uid: session.user.id,
              email: session.user.email ?? null,
              authProvider: 'supabase',
            }
          : null,
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (
    nickname: string,
    role: string,
    color: string,
    uid?: string,
    email?: string,
    authProvider?: 'supabase' | 'guest',
  ) => {
    setUser({
      nickname,
      role,
      color,
      uid,
      email: email ?? null,
      authProvider,
    });
  };

  const handleLogout = () => {
    setUser(null);
    supabase?.auth.signOut();
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
        {SHOW_DESIGN_PREVIEW ? (
          <DesignPreview />
        ) : (
        <>
        <OnlineStatus isOnline={sw.isOnline} />
        {!user ? (
          <LoginScreen onLogin={handleLogin} primaryTheme={primaryTheme} setPrimaryTheme={setPrimaryTheme} />
        ) : (
          <Suspense fallback={<ChatLoadingScreen />}>
            <ChatScreen currentUser={user} onLogout={handleLogout} primaryTheme={primaryTheme} />
          </Suspense>
        )}

        {/* PWA banners */}
        <UpdateBanner
          needRefresh={sw.needRefresh}
          offlineReady={sw.offlineReady}
          onUpdate={sw.update}
        />
        <InstallPrompt
          installPromptEvent={sw.installPromptEvent}
          isInstalled={sw.isInstalled}
          onInstall={sw.promptInstall}
        />
        <ThemeFab inChat={!!user} />
        </>
        )}
      </div>
    </ErrorBoundary>
  );
}

function ChatLoadingScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center lamma-fallback-shell">
      <div className="flex flex-col items-center gap-3 px-5 py-6 rounded-3xl lamma-fallback-card">
        <div className="w-12 h-12 rounded-full animate-spin lamma-loading-orb" />
        <p className="text-xs text-gray-300 font-bold">جاري تجهيز شات لمة...</p>
        <p className="text-[10px] text-gray-500 font-semibold">ثواني بسيطة ونكمل السهرة</p>
      </div>
    </div>
  );
}

// Deployed 00:38
