// Chat types extracted from ChatScreen.tsx — pure refactor, no behavior change.

export interface UserSession {
  nickname: string;
  role:
    | "guest"
    | "user"
    | "vip"
    | "platinum_vip"
    | "mod"
    | "admin"
    | "owner"
    | string;
  color: string;
  uid?: string;
  email?: string | null;
  authProvider?: "supabase" | "guest";
  frame?: string;
  title?: string;
  badge?: string;
  avatar?: string;
  [key: string]: any;
}

export interface ChatScreenProps {
  currentUser: UserSession;
  onLogout: () => void;
  primaryTheme: "dark" | "amoled";
}

export interface Message {
  id: string;
  author: string;
  text: string;
  color: string;
  isOwn: boolean;
  time: string;
  type:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "system"
    | "join"
    | "leave"
    | "gift"
    | "youtube"
    | "shadow_msg";
  mediaUrl?: string;
  giftIcon?: string;
  giftName?: string;
  youtubeId?: string;
  reactions?: Record<string, number>;
}

export interface ChatMember {
  id: string;
  nickname: string;
  role:
    | "guest"
    | "user"
    | "vip"
    | "platinum_vip"
    | "mod"
    | "admin"
    | "owner";
  color: string;
  avatar: string;
  status: "online" | "offline" | "idle";
  email?: string;
  badge?: string;
  fingerprint: string;
  browserSignature: string;
  ip: string;
  localStorageId: string;
}

export interface PMThreadMessage {
  text: string;
  isOwn: boolean;
  time: string;
  mediaUrl?: string;
  type?: "text" | "image" | "video" | "audio";
}

export interface MemberCustomPermissions {
  recordingAllowed: boolean;
  callsAllowed: boolean;
  musicRadioAllowed: boolean;
  roomCreationAllowed: boolean;
}

export interface BanInfo {
  id: string;
  nickname: string;
  email?: string;
  fingerprint: string;
  browserSignature: string;
  ip: string;
  localStorageId: string;
  type: "mute" | "kick" | "ban" | "megaban" | "shadow" | "room";
  roomId?: string; // For room ban
  banner: string; // admin nickname who banned them
  reason: string;
  time: string;
}

export interface ActivityLog {
  id: string;
  time: string;
  type: "login" | "logout" | "ban" | "promote" | "demote";
  userNickname: string;
  operatorNickname: string;
  details: string;
}
