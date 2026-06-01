import React, { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen.tsx";
import ChatScreen from "./components/ChatScreen.tsx";
import { supabase } from ' ./lib/supabase' ;
interface UserSession {
  nickname: string;
  role: string;
  color: string;
}

export default function App() {
  // Authentication & session state
  const [user, setUser] = useState<UserSession | null>(null);
  
  // Theme state persisted to local storage
  const [primaryTheme, setPrimaryTheme] = useState<"dark" | "amoled">(() => {
    const saved = localStorage.getItem("lamma_chosen_theme");
    return (saved === "dark" || saved === "amoled") ? saved : "dark";
  });

// استبدل كود الـ useEffect الذي أضفته بهذا الكود:
useEffect(() => {
  // التأكد من وجود supabase قبل استخدامه
  if (!supabase) return;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      setUser({
        nickname: session.user.email || 'User',
        role: 'user',
        color: 'white',
        uid: session.user.id
      });
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setUser({
        nickname: session.user.email || 'User',
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

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleSetPrimaryTheme = (theme: "dark" | "amoled") => {
    setPrimaryTheme(theme);
    localStorage.setItem("lamma_chosen_theme", theme);
  };

  return (
    <>
      {!user ? (
        <LoginScreen
          onLogin={handleLogin}
          primaryTheme={primaryTheme}
          setPrimaryTheme={handleSetPrimaryTheme}
        />
      ) : (
        <ChatScreen
          currentUser={user}
          onLogout={handleLogout}
          primaryTheme={primaryTheme}
        />
      )}
    </>
  );
}

