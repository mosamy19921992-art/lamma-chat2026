import React, { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen.tsx";
import ChatScreen from "./components/ChatScreen.tsx";

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

  // Track session on initial mount
  useEffect(() => {
    const savedUser = localStorage.getItem("lamma_user_session");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        console.warn("Corrupted session data discarded");
      }
    }
  }, []);

  const handleLogin = (nickname: string, role: string, color: string, uid?: string) => {
    const newSession = { nickname, role, color };
    setUser(newSession);
    localStorage.setItem("lamma_user_session", JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("lamma_user_session");
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

