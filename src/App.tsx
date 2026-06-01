import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import { supabase } from './lib/supabase';

interface User {
  nickname: string;
  role: 'user';
  color: string;
  uid: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch the current session
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setUser({
            nickname: session.user.email || 'User',
            role: 'user',
            color: 'white',
            uid: session.user.id
          });
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen for auth state changes (login/logout)
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

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="app-container loading">Loading...</div>;
  }

  if (error) {
    return <div className="app-container error">Error: {error}</div>;
  }

  return (
    <div className="app-container">
      {!user ? <LoginScreen /> : <ChatScreen user={user} />}
    </div>
  );
}
