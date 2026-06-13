import React, { useState, useEffect, lazy, Suspense } from 'react';
import LoginScreen from './components/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { useServiceWorker } from './hooks/useServiceWorker';
import UpdateBanner from './components/pwa/UpdateBanner';
import OnlineStatus from './components/pwa/OnlineStatus';
import { useTheme } from './hooks/useTheme';
import { supabase } from './lib/supabase';
import type { UserSession } from './lib/chatTypes';
import {
  getResolvedSupabaseColor,
  getResolvedSupabaseNickname,
  hasPlaceholderSupabaseNickname,
  normalizeAuthRole,
} from './lib/authProfile';

// Lazy-load ChatScreen so the LoginScreen (which is the entry surface
// for guests and unauthenticated users) ships in a smaller initial bundle.
const ChatScreen = lazy(() => import('./components/ChatScreen'));

type Theme = 'dark' | 'amoled';
const GUEST_SESSION_KEY = 'lamma_guest_session';
const DEV_SESSION_KEY = 'lamma_dev_session';

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

function readDevSession(): UserSession | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  const parseStoredSession = (raw: string | null): UserSession | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as UserSession;
      if (!parsed?.nickname || !parsed?.role) return null;
      return {
        nickname: parsed.nickname,
        role: normalizeAuthRole(parsed.role),
        color: parsed.color || '#58a6ff',
        uid: parsed.uid,
        email: parsed.email ?? null,
        authProvider: 'supabase',
        badge: parsed.badge,
        avatar: parsed.avatar,
        frame: parsed.frame,
        title: parsed.title,
      };
    } catch {
      return null;
    }
  };

  const params = new URLSearchParams(window.location.search);
  const debugRole = normalizeAuthRole(params.get('dev_role') || '');
  const debugName = (params.get('dev_name') || '').trim();

  if (!debugName) {
    return parseStoredSession(sessionStorage.getItem(DEV_SESSION_KEY));
  }

  const nextSession: UserSession = {
    nickname: debugName,
    role: debugRole,
    color: (params.get('dev_color') || '#58a6ff').trim() || '#58a6ff',
    uid: (params.get('dev_uid') || '').trim() || `dev-${debugRole}-${debugName}`,
    email: (params.get('dev_email') || '').trim() || null,
    authProvider: 'supabase',
    badge: (params.get('dev_badge') || '').trim() || undefined,
    avatar: (params.get('dev_avatar') || '').trim() || undefined,
    title: (params.get('dev_title') || '').trim() || undefined,
  };

  sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(nextSession));
  return nextSession;
}

function clearDevSession() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  sessionStorage.removeItem(DEV_SESSION_KEY);
}

type SupabaseUser = NonNullable<import('@supabase/supabase-js').Session['user']>;

function getStoredNickname(supaUser: SupabaseUser): string {
  return getResolvedSupabaseNickname(supaUser);
}

function needsProfileNickname(supaUser: SupabaseUser): boolean {
  return hasPlaceholderSupabaseNickname(supaUser);
}

function sessionToUserSession(supaUser: SupabaseUser): UserSession {
  const meta = (supaUser.user_metadata ?? {}) as Record<string, string>;
  const role = normalizeAuthRole(meta.role);
  return {
    nickname: getStoredNickname(supaUser) || 'User',
    role,
    color: getResolvedSupabaseColor(supaUser),
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
    const devSession = readDevSession();

    if (!supabase) {
      if (guestSession) setUser(guestSession);
      else if (devSession) setUser(devSession);
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
        return;
      }

      if (devSession) {
        setUser(devSession);
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
      setUser(readGuestSession() || readDevSession());
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
    clearDevSession();
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
