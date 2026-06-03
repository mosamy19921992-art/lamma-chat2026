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
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [primaryTheme, setPrimaryTheme] = useState<Theme>('dark');

  useEffect(() => {
    if (!supabase) return;

    // 1) محاولة جلب الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          nickname: session.user.email ?? 'User',
          role: 'user',
          color: 'white',
          uid: session.user.id,
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
              nickname: session.user.email ?? 'User',
              role: 'user',
              color: 'white',
              uid: session.user.id,
            }
          : null
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (nickname: string, role: string, color: string, uid?: string) => {
    setUser({ nickname, role, color, uid });
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
