// Chat types extracted from ChatScreen.tsx — pure refactor, no behavior change.

// MemberRole — type alias مشترك بين UserSession وChatMember بدل تكرار الـ union
export type MemberRole =
  | "guest"
  | "user"
  | "vip"
  | "platinum_vip"
  | "mod"
  | "admin"
  | "owner";

// ProductTab — للمتجر
export type ProductTab = "vip" | "skins" | "badges";

// ProductType — نوع الاشتراك/المنتج
export type ProductType =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "frame"
  | "title";

export interface UserSession {
  nickname: string;
  // | string ضروري للـ backward compat مع guest sessions القديمة في localStorage
  role: MemberRole | string;
  color: string;
  uid?: string;
  email?: string | null;
  authProvider?: "supabase" | "guest";
  frame?: string;
  title?: string;
  badge?: string;
  avatar?: string;
}

export interface ChatScreenProps {
  currentUser: UserSession;
  onLogout: () => void;
  primaryTheme: "dark" | "amoled";
  onUserSessionUpdate?: (patch: Partial<UserSession>) => void;
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
  role: MemberRole;
  color: string;
  avatar: string;
  status: "online" | "offline" | "idle";
  email?: string;
  badge?: string;
  title?: string;
  fingerprint: string;
  browserSignature: string;
  ip?: string;
  localStorageId: string;
  bio?: string;
}

export interface PMThreadMessage {
  text: string;
  isOwn: boolean;
  time: string;
  mediaUrl?: string;
  type?: "text" | "image" | "video" | "audio";
  status?: "sent" | "delivered" | "read";
  dbId?: string;
}

export interface MemberCustomPermissions {
  /** رسائل صوتية في الغرف (مثل واتساب) */
  recordingAllowed: boolean;
  /** مكالمات صوتية من الخاص */
  callsAllowed: boolean;
  /** مكالمات فيdeo / الكاميرا من الخاص */
  videoCallsAllowed: boolean;
  /** تشغيل الراديو ومكتبة الموسيقى */
  musicRadioAllowed: boolean;
  /** إنشاء غرف مخصصة */
  roomCreationAllowed: boolean;
  /** رفع الصور ومشاركة روابط الصور */
  imagesAllowed: boolean;
  /** مشاركة يوتيوب / فيديو في الرسائل */
  youtubeAllowed: boolean;
}

/** مظهر/تميز يمنحه المالك بدون اشتراك متجر */
export type CosmeticVipTier = "vip" | "platinum";

export interface MemberCosmeticGrant {
  vipTier?: CosmeticVipTier | null;
  frame?: string | null;
}

export const COSMETIC_FRAME_PRESETS = {
  fire: "from-red-500 via-orange-500 to-yellow-500",
  ice: "from-cyan-500 via-indigo-500 to-purple-500",
  rainbow: "from-pink-500 via-purple-500 to-cyan-500",
} as const;

/** بث المالك للغرفة — يسمعها كل المتصلين في نفس الغرفة */
export interface RoomDjState {
  mode: "music" | "radio";
  trackId: string;
  title: string;
  url: string;
  isPlaying: boolean;
  startedAtMs: number;
  updatedBy: string;
  updatedAtMs: number;
}

/** أغنية رفعها المالك من جهازه */
export interface OwnerMusicTrack {
  id: string;
  title: string;
  url: string;
  fileName?: string;
  uploadedAt: string;
}

export type CosmeticFramePreset = keyof typeof COSMETIC_FRAME_PRESETS;

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

export type WallTheme = "fire" | "ice" | "violet";
export type ChatTheme =
  | "classic"
  | "night-paper"
  | "charcoal-calm"
  | "olive-ink"
  | "violet-night";

export type DesignAssistantPatch = {
  brandLogoUrl?: string | null;
  ownerBgImage?: string | null;
  roomBgCurrent?: string | null;
};

export type DesignAssistantProposalId =
  | "premium"
  | "calm"
  | "night"
  | "room-focus"
  | "identity-refresh"
  | "immersive";

export type DesignAssistantProposal = {
  id: DesignAssistantProposalId;
  title: string;
  summary: string;
  changes: DesignAssistantPatch;
  reasoning: string[];
  focusArea: string;
  impact: "خفيف" | "متوسط" | "قوي";
  confidence: number;
  expectedScore: number;
  warnings: string[];
  beforeState: string;
  afterState: string;
  implementationSteps: string[];
};

export type DesignAssistantFinding = {
  tone: "good" | "warn" | "critical";
  title: string;
  text: string;
};

export type DesignAssistantAudit = {
  score: number;
  verdict: string;
  roomLabel: string;
  highlights: string[];
  findings: DesignAssistantFinding[];
  identityScore: number;
  readabilityScore: number;
  roomScore: number;
  polishScore: number;
  nextAction: string;
  recommendedPreset: DesignAssistantProposalId;
  quickWins: string[];
};

export type DesignAssistantSnapshot = {
  brandLogoUrl: string | null;
  ownerBgImage: string | null;
  roomBgCurrent: string | null;
};

export type DesignPreset = {
  id: string;
  name: string;
  createdAt: string;
  snapshot: {
    brandLogoUrl: string | null;
    ownerBgImage: string | null;
    roomBgMap: Record<string, string>;
  };
};

export type CustomRoomEntry = {
  id: string;
  name: string;
  icon: string;
  count: number;
  category: "private";
  createdBy: string;
  password?: string;
};

export type PMTargetState = {
  nickname: string;
  role: string;
  avatar: string;
};
