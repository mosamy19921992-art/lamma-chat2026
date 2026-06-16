import React, { useState, useEffect, lazy, Suspense, type ComponentType } from 'react';
import LoginScreen from './components/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { useServiceWorker } from './hooks/useServiceWorker';
import UpdateBanner from './components/pwa/UpdateBanner';
import OnlineStatus from './components/pwa/OnlineStatus';
import { startSilentAutoHeal } from './services/chat/maintenanceBot';
import { supabase, getClientUid } from './lib/supabase';
import type { UserSession } from './lib/chatTypes';
import {
  getResolvedSupabaseColor,
  getResolvedSupabaseNickname,
  hasPlaceholderSupabaseNickname,
  normalizeAuthRole,
} from './lib/authProfile';
import { mergeSessionRole } from './services/auth/userRoleService';

const CHAT_SCREEN_IMPORT = () => import('./components/ChatScreen');

function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  retries = 3,
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await importer();
      } catch (error) {
        lastError = error;
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

// Lazy-load ChatScreen so the login page stays small, but retry failed chunk loads
// (stale deploy cache) and prefetch the bundle as early as possible.
const ChatScreen = lazyWithRetry(CHAT_SCREEN_IMPORT);

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
      uid: parsed.uid || getClientUid(),
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

async function hydrateSupabaseUserSession(
  supaUser: SupabaseUser,
): Promise<UserSession> {
  const base = sessionToUserSession(supaUser);
  const mergedRole = await mergeSessionRole(supaUser.id, base.role as any);
  return mergedRole === base.role ? base : { ...base, role: mergedRole };
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [pendingSupabaseUser, setPendingSupabaseUser] = useState<SupabaseUser | null>(null);
  const [primaryTheme, setPrimaryTheme] = useState<Theme>('dark');

  // PWA: register service worker, expose install/update state.
  const sw = useServiceWorker();

  // Silent background auto-heal: quietly fixes corrupted data / full cache
  // every 5 minutes without touching messages or showing any UI.
  useEffect(() => {
    const stop = startSilentAutoHeal(5 * 60 * 1000);
    return stop;
  }, []);

  // Start downloading the chat bundle immediately so login → chat feels instant.
  useEffect(() => {
    void CHAT_SCREEN_IMPORT();
  }, []);

  useEffect(() => {
    const guestSession = readGuestSession();
    const devSession = readDevSession();

    if (!supabase) {
      if (guestSession) setUser(guestSession);
      else if (devSession) setUser(devSession);
      return;
    }

    // Restore guest/dev sessions immediately so returning visitors don't wait on auth.
    if (guestSession) {
      setUser(guestSession);
    } else if (devSession) {
      setUser(devSession);
    }

    let cancelled = false;

    const finishAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          clearGuestSession();
          if (needsProfileNickname(session.user)) {
            setPendingSupabaseUser(session.user);
            setUser(null);
            return;
          }
          setPendingSupabaseUser(null);
          setUser(await hydrateSupabaseUserSession(session.user));
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
      } catch (error) {
        console.warn('[Auth] getSession failed:', error);
        if (cancelled) return;
        setPendingSupabaseUser(null);
        if (guestSession) {
          setUser(guestSession);
        } else if (devSession) {
          setUser(devSession);
        }
      }
    };

    void finishAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        clearGuestSession();
        if (needsProfileNickname(session.user)) {
          setPendingSupabaseUser(session.user);
          setUser(null);
          return;
        }
        setPendingSupabaseUser(null);
        setUser(await hydrateSupabaseUserSession(session.user));
        return;
      }

      setPendingSupabaseUser(null);
      setUser(readGuestSession() || readDevSession());
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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
      const guestUid = uid || getClientUid();
      writeGuestSession({ ...nextUser, uid: guestUid });
      setUser({ ...nextUser, uid: guestUid });
    } else {
      clearGuestSession();
      setPendingSupabaseUser(null);
    }

    if (authProvider !== 'guest') {
      setUser(nextUser);
    }
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
            <ChatScreen
              currentUser={user}
              onLogout={handleLogout}
              primaryTheme={primaryTheme}
              onUserSessionUpdate={(patch) => {
                setUser((prev) => (prev ? { ...prev, ...patch } : prev));
              }}
            />
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
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

  const handleHardReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((registration) => registration.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center lamma-fallback-shell">
      <div className="flex flex-col items-center gap-3 px-5 py-6 rounded-3xl lamma-fallback-card max-w-sm text-center">
        <div className="w-12 h-12 rounded-full animate-spin lamma-loading-orb" />
        <p className="text-xs text-gray-300 font-bold">جاري تجهيز شات لمة...</p>
        <p className="text-[10px] text-gray-500 font-semibold">ثواني بسيطة ونكمل السهرة</p>
        {timedOut && (
          <>
            <p className="text-[11px] text-amber-200/90 font-semibold leading-relaxed">
              التحميل أخذ وقت أطول من المعتاد. لو الشات مش بيفتح، جرّب تحديث الصفحة.
            </p>
            <button
              type="button"
              onClick={() => void handleHardReload()}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-emerald-200 lamma-toggle-on cursor-pointer"
            >
              تحديث الصفحة
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Deployed 00:38
