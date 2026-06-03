import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import { supabase } from './lib/supabase';

type Theme = 'dark' | 'amoled';

interface UserSession {
  nickname: string;
  role: string;
  color: string;
  uid?: string;
  email?: string | null;
  authProvider?: 'supabase' | 'guest';
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [primaryTheme, setPrimaryTheme] = useState<Theme>('dark');

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
    <div className="app-container">
      {!user ? (
        <LoginScreen onLogin={handleLogin} primaryTheme={primaryTheme} setPrimaryTheme={setPrimaryTheme} />
      ) : (
        <ChatScreen currentUser={user} onLogout={handleLogout} primaryTheme={primaryTheme} />
      )}
    </div>
  );
}
