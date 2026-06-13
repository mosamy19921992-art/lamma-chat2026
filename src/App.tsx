import React, { useState, useEffect, lazy, Suspense } from 'react';
import LoginScreen from './components/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { useServiceWorker } from './hooks/useServiceWorker';
import UpdateBanner from './components/pwa/UpdateBanner';
import OnlineStatus from './components/pwa/OnlineStatus';
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
      role: 'guest',
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
      role: 'guest',
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

function normalizeAuthRole(rawRole?: string): UserSession['role'] {
  const role = (rawRole || '').trim().toLowerCase();
  if (role === 'owner' || role === 'malek' || role === 'المالك') return 'owner';
  if (role === 'admin' || role === 'أدمن') return 'admin';
  if (
    role === 'guest' ||
    role === 'user' ||
    role === 'vip' ||
    role === 'platinum_vip' ||
    role === 'mod'
  ) {
    return role;
  }
  return 'user';
}

function getStoredNickname(supaUser: SupabaseUser): string {
  const meta = (supaUser.user_metadata ?? {}) as Record<string, string>;
  return (meta.nickname || '').trim();
}

function needsProfileNickname(supaUser: SupabaseUser): boolean {
  return !getStoredNickname(supaUser);
}

function sessionToUserSession(supaUser: SupabaseUser): UserSession {
  const meta = (supaUser.user_metadata ?? {}) as Record<string, string>;
  const role = normalizeAuthRole(meta.role);
  return {
    nickname: getStoredNickname(supaUser) || 'User',
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
  const [pendingSupabaseUser, setPendingSupabaseUser] = useState<SupabaseUser | null>(null);
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
        if (needsProfileNickname(session.user)) {
          setPendingSupabaseUser(session.user);
          setUser(null);
          return;
        }
        setPendingSupabaseUser(null);
        setUser(sessionToUserSession(session.user));
        return;
      }

      setPendingSupabaseUser(null);
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
        if (needsProfileNickname(session.user)) {
          setPendingSupabaseUser(session.user);
          setUser(null);
          return;
        }
        setPendingSupabaseUser(null);
        setUser(sessionToUserSession(session.user));
        return;
      }

      setPendingSupabaseUser(null);
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
      setPendingSupabaseUser(null);
    }

    setUser(nextUser);
  };

  const handleLogout = () => {
    setUser(null);
    clearGuestSession();
    void supabase?.auth.signOut({ scope: 'local' });
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
        <OnlineStatus isOnline={sw.isOnline} />
        {!user ? (
          <LoginScreen
            onLogin={handleLogin}
            primaryTheme={primaryTheme}
            setPrimaryTheme={setPrimaryTheme}
            canInstallApp={!!sw.installPromptEvent && !sw.isInstalled}
            isInstalledApp={sw.isInstalled}
            onInstallApp={sw.promptInstall}
            pendingSupabaseUser={pendingSupabaseUser}
          />
        ) : (
          <Suspense fallback={<ChatLoadingScreen />}>
            <ChatScreen currentUser={user} onLogout={handleLogout} primaryTheme={primaryTheme} />
          </Suspense>
        )}

        {/* PWA banners */}
        <UpdateBanner
          needRefresh={sw.needRefresh}
          onUpdate={sw.update}
        />
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
