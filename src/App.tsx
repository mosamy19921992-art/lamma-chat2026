import React, { useState, useEffect, lazy, Suspense } from 'react';
import LoginScreen from './components/LoginScreen';
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
const GUEST_SESSION_KEY = 'lamma_guest_session';

function readGuestSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.nickname || parsed?.authProvider !== 'guest') return null;
    return {
      nickname: parsed.nickname,
      role: parsed.role || 'guest',
      color: parsed.color || 'white',
      uid: parsed.uid,
      email: parsed.email ?? null,
      authProvider: 'guest',
    };
  } catch {
    return null;
  }
}

function writeGuestSession(user: UserSession) {
  localStorage.setItem(
    GUEST_SESSION_KEY,
    JSON.stringify({
      nickname: user.nickname,
      role: user.role || 'guest',
      color: user.color || 'white',
      uid: user.uid,
      email: user.email ?? null,
      authProvider: 'guest',
    }),
  );
}

function clearGuestSession() {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

// استخراج بيانات المستخدم من Supabase session
// role: يُقرأ من user_metadata.role لو موجود (يُعيَّن من Admin SDK أو trigger)
// fallback: 'user' للمستخدمين العاديين
type SupabaseUser = NonNullable<import('@supabase/supabase-js').Session['user']>;
function sessionToUserSession(supaUser: SupabaseUser): UserSession {
  const meta = (supaUser.user_metadata ?? {}) as Record<string, string>;
  const validRoles = new Set(['guest', 'user', 'vip', 'platinum_vip', 'mod', 'admin', 'owner']);
  const role = validRoles.has(meta.role) ? meta.role : 'user';
  return {
    nickname: meta.nickname || meta.name || supaUser.email || 'User',
    role,
    color: meta.color || 'white',
    uid: supaUser.id,
    email: supaUser.email ?? null,
    authProvider: 'supabase',
    badge: meta.badge,
    avatar: meta.avatar,
    frame: meta.frame,
  };
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [primaryTheme, setPrimaryTheme] = useState<Theme>('dark');

  // PWA: register service worker, expose install/update state.
  const sw = useServiceWorker();
  // Theme: load + persist the active palette.
  // (useTheme runs in the background — it sets CSS variables.)
  useTheme();

  useEffect(() => {
    const guestSession = readGuestSession();

    if (!supabase) {
      if (guestSession) setUser(guestSession);
      return;
    }

    // 1) محاولة جلب الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        clearGuestSession();
        setUser(sessionToUserSession(session.user));
        return;
      }

      if (guestSession) {
        setUser(guestSession);
      }
    });

    // 2) الاستماع لتغييرات الحالة (تسجيل دخول أو خروج)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        clearGuestSession();
        setUser(sessionToUserSession(session.user));
        return;
      }

      setUser(readGuestSession());
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
    const nextUser = {
      nickname,
      role,
      color,
      uid,
      email: email ?? null,
      authProvider,
    };

    if (authProvider === 'guest') {
      writeGuestSession(nextUser);
    } else {
      clearGuestSession();
    }

    setUser(nextUser);
  };

  const handleLogout = () => {
    setUser(null);
    clearGuestSession();
    supabase?.auth.signOut();
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
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
