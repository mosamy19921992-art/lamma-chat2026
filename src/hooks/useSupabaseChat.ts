import { useState, useEffect } from 'react';
import { supabase, SupabaseMessage } from '../lib/supabase.ts';

export function useSupabaseChat(roomId: string) {
  const [messages, setMessages] = useState<SupabaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        setError(error.message);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as SupabaseMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  const sendMessage = async (msg: Omit<SupabaseMessage, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('messages').insert([msg]);
    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return { messages, loading, error, sendMessage };
}
