import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen.tsx';
import ChatScreen from './components/ChatScreen.tsx';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!supabase) return;

    // جلب الجلسة الحقيقية من Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          nickname: session.user.email,
          role: 'user',
          color: 'white',
          uid: session.user.id
        });
      }
    });

    // الاستماع لأي تغييرات في حالة تسجيل الدخول
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          nickname: session.user.email,
          role: 'user',
          color: 'white',
          uid: session.user.id
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="app-container">
      {!user ? <LoginScreen /> : <ChatScreen user={user} />}
    </div>
  );
}
