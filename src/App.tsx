import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. محاولة جلب الجلسه الحالية
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

    //2. الاستماع لتغييرات الحالة (تسجيل دخول او خروج)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
     setUser (session?.user ? {
          nickname: session?.user.email,
          role: 'user',
          color: 'white',
          uid: session.user.id
      } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="app-container">
      {!user ? <LoginScreen /> : <ChatScreen user={user} />}
    </div>
  );
}
