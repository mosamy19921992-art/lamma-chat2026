import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseMessage {
  id?: string;
  created_at?: string;
  room_id: string;
  author: string;
  text: string;
  color: string;
  sender_uid?: string;
  type: string;
  media_url?: string;
  gift_icon?: string;
  gift_name?: string;
  youtube_id?: string;
  reactions?: Record<string, number>;
}

