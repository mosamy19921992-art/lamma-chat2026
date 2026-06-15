import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ChatScreenProps } from "../lib/chatTypes";
import {
  Send,
  Image,
  Video,
  Music,
  Mic,
  Smile,
  Radio,
  Key,
  Plus,
  Settings as SettingsIcon,
  LogOut,
  ShieldAlert,
  Award,
  Grid,
  Terminal,
  Users,
  Volume2,
  VolumeX,
  Eye,
  BookOpen,
  User,
  Crown,
  Flame,
  Sparkles,
  Search,
  Heart,
  Star,
  AlertTriangle,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Tv,
  Compass,
  HelpCircle,
  X,
  Download,
  Share2,
  Shield,
  Bell,
  MessageCircle,
  Phone,
  Video as VideoIcon,
  Paperclip,
  PlusCircle,
  Gift,
  Trophy,
  AlertCircle,
  Link as LinkIcon,
  Palette,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AMLogo from "./AMLogo.tsx";
import ThemeSettings from "./pwa/ThemeSettings.tsx";
import BossSigil from "./BossSigil.tsx";
import ShareModal from "./modals/ShareModal.tsx";
import CreateRoomModal from "./modals/CreateRoomModal.tsx";
import UserContextPopup from "./modals/UserContextPopup.tsx";
import UserProfileBioPopup from "./modals/UserProfileBioPopup.tsx";
import { OwnerPanelModal } from "./modals/OwnerPanelModal";
import { AdminPanelModal } from "./modals/AdminPanelModal";
import { GuardPanelModal } from "./modals/GuardPanelModal";
import { StorePanelModal } from "./modals/StorePanelModal";
import { DesignCenterModal } from "./modals/DesignCenterModal";
import { StatsModal } from "./modals/StatsModal";
import { UserProfileModal } from "./modals/UserProfileModal";
import {
  getClientUid,
  supabase,
  type BannedUserRow,
  type NicknameChangeRequestRow,
  SupabaseMessage,
  type OwnerActivityLogRow,
  type OwnerMemberPermissionRow,
  type OwnerSettingsRow,
} from "../lib/supabase.ts";
import {
  ROOMS_DEF,
  ROOM_CATEGORIES,
  GIFT_TYPES,
  EMOTICONS,
} from "../lib/chatConstants.ts";
import {
  type Message,
  type ChatMember,
  type BanInfo,
  type ActivityLog,
  type PMThreadMessage,
  type MemberCustomPermissions,
  type UserSession,
  type WallTheme,
  type DesignAssistantPatch,
  type DesignAssistantProposal,
  type DesignAssistantFinding,
  type DesignAssistantAudit,
  type DesignAssistantSnapshot,
  type DesignPreset,
  type CustomRoomEntry,
  type ChatTheme,
  type PMTargetState,
  type ProductType,
} from "../lib/chatTypes.ts";
import {
  hexToRgba,
  getRoleFromAuthor,
  getFrameFromAuthor,
  getYoutubeId,
  getShortenedNickname,
} from "../lib/chatHelpers.ts";
import { renderTextMessageWithMedia } from "../lib/chatMessageRender.tsx";
import { createPortal } from "react-dom";
import { useChatMessages } from "../hooks/useChatMessages";
import { usePrivateMessages } from "../hooks/usePrivateMessages";
import { useRoomComposer } from "../hooks/useRoomComposer";
import {
  buildDesignAssistantAudit,
  buildDesignAssistantProposal,
} from "../services/design/designAssistantService";
import {
  appendPmThreadMessage,
  createOptimisticPmMessage,
  persistPrivateMessage,
} from "../services/chat/privateMessagesService";

function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  icon,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="md:hidden fixed inset-0 z-[9999]"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 w-full h-full cursor-default"
            onClick={onClose}
            aria-label="إغلاق"
          />
          <motion.div
            initial={{ y: 520 }}
            animate={{ y: 0 }}
            exit={{ y: 520 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] min-h-0 flex-col overflow-hidden rounded-t-3xl lamma-sheet-shell bg-[#0a0a0a]"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-3 lamma-sheet-header border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="font-black text-white text-sm">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer bg-white/5 hover:bg-red-500/20"
                aria-label="إغلاق"
              >
                <X size={14} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

function HeaderIconButton({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [isTipOpen, setIsTipOpen] = useState(false);
  const pressTimerRef = useRef<number | null>(null);

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={title}
        title={title}
        onClick={onClick}
        onMouseEnter={() => setIsTipOpen(true)}
        onMouseLeave={() => setIsTipOpen(false)}
        onFocus={() => setIsTipOpen(true)}
        onBlur={() => setIsTipOpen(false)}
        onPointerDown={() => {
          clearPressTimer();
          pressTimerRef.current = window.setTimeout(() => {
            setIsTipOpen(true);
          }, 420);
        }}
        onPointerUp={() => {
          clearPressTimer();
          window.setTimeout(() => setIsTipOpen(false), 250);
        }}
        onPointerCancel={() => {
          clearPressTimer();
          setIsTipOpen(false);
        }}
        className={className}
      >
        {children}
      </button>
      {isTipOpen && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[200] rounded-xl border border-white/10 bg-black/80 px-2.5 py-1 text-[10px] font-black text-white whitespace-nowrap">
          {title}
        </div>
      )}
    </div>
  );
}

const OWNER_SETTINGS_ROW_ID = "global";
const OWNER_SYNC_DEBOUNCE_MS = 350;
const BANNED_USER_REASON_PREFIX = "lamma-ban-json:";
const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(value?: string | null): value is string {
  return Boolean(value && UUID_LIKE_PATTERN.test(value));
}

function createBanSignature(ban: Partial<BanInfo>): string {
  return [
    (ban.type || "ban").toLowerCase(),
    (ban.roomId || "").toLowerCase(),
    (ban.nickname || "").trim().toLowerCase(),
    (ban.fingerprint || "").trim().toLowerCase(),
    (ban.ip || "").trim().toLowerCase(),
  ].join("|");
}

function mergeBanLists(existing: BanInfo[], incoming: BanInfo[]): BanInfo[] {
  const merged = new Map<string, BanInfo>();
  [...existing, ...incoming].forEach((ban) => {
    merged.set(createBanSignature(ban), ban);
  });
  return Array.from(merged.values());
}

function serializeBanRowReason(ban: BanInfo): string {
  return `${BANNED_USER_REASON_PREFIX}${JSON.stringify({
    nickname: ban.nickname,
    email: ban.email || "",
    fingerprint: ban.fingerprint || "",
    browserSignature: ban.browserSignature || "",
    ip: ban.ip || "",
    localStorageId: ban.localStorageId || "",
    type: ban.type,
    roomId: ban.roomId || "",
    banner: ban.banner,
    reason: ban.reason,
    time: ban.time,
  })}`;
}

function parseBannedUserRow(row: BannedUserRow): BanInfo {
  const fallbackTime = row.created_at
    ? new Date(row.created_at).toLocaleTimeString("ar-EG", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
    : new Date().toLocaleTimeString("ar-EG", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

  if (row.reason.startsWith(BANNED_USER_REASON_PREFIX)) {
    try {
      const parsed = JSON.parse(
        row.reason.slice(BANNED_USER_REASON_PREFIX.length),
      ) as Partial<BanInfo>;
      return {
        id: row.id || `ban-${Date.now()}`,
        nickname: parsed.nickname || row.author,
        email: parsed.email || undefined,
        fingerprint: parsed.fingerprint || row.uid,
        browserSignature: parsed.browserSignature || "",
        ip: parsed.ip || "",
        localStorageId: parsed.localStorageId || "",
        type: (parsed.type as BanInfo["type"]) || "ban",
        roomId: parsed.roomId || undefined,
        banner: parsed.banner || row.banner,
        reason: parsed.reason || row.reason,
        time: parsed.time || fallbackTime,
      };
    } catch {
      // Fall back to the legacy/simple row shape if JSON parsing fails.
    }
  }

  return {
    id: row.id || `ban-${Date.now()}`,
    nickname: row.author,
    email: undefined,
    fingerprint: row.uid,
    browserSignature: "",
    ip: "",
    localStorageId: "",
    type: "ban",
    roomId: undefined,
    banner: row.banner,
    reason: row.reason,
    time: fallbackTime,
  };
}

function sanitizeRoomBgMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, string>
  >((acc, [key, entry]) => {
    if (typeof entry === "string" && entry.trim()) {
      acc[key] = entry.trim();
    }
    return acc;
  }, {});
}

function PostsFeedRoom({
  posts,
  currentSession,
  isCompactView,
  isChatColumnExpanded,
  onOpenProfile,
  canDeletePost,
  onDeletePost,
}: {
  posts: Message[];
  currentSession: UserSession;
  isCompactView: boolean;
  isChatColumnExpanded: boolean;
  onOpenProfile: (nickname: string) => void;
  canDeletePost: (msg: Message) => boolean;
  onDeletePost: (msg: Message) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="lamma-post-feed-shell">
        <div className="lamma-post-hero">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles size={16} />
            <span className="text-sm font-black">مجتمع لمة</span>
          </div>
          <p className="text-[11px] text-gray-200 leading-relaxed mt-2">
            هنا تظهر منشورات الأعضاء المسجلين للجميع بشكل واضح وهادئ، كأنها
            مساحة مجتمع مصغرة داخل الشات.
          </p>
        </div>
        <div className="lamma-post-empty">
          <div className="text-3xl">📰</div>
          <div className="text-sm font-black text-white">
            لا توجد منشورات بعد
          </div>
          <div className="text-[11px] text-gray-300 leading-relaxed">
            ابدأ أول منشور في الغرفة، وسيظهر مباشرة لكل من يدخلها.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lamma-post-feed-shell">
      <div className="lamma-post-hero">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles size={16} />
            <span className="text-sm font-black">روم المنشورات</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {posts.length} POSTS
          </span>
        </div>
        <p className="text-[11px] text-gray-200 leading-relaxed mt-2">
          منشورات عامة مرئية لكل من يدخل الغرفة، سواء كانوا أصدقاء أو لا.
        </p>
      </div>

      {posts.map((msg) => {
        const role = getRoleFromAuthor(msg.author, currentSession);
        const cleanName = msg.author
          .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
          .trim();
        const nameColor =
          msg.author === currentSession.nickname
            ? currentSession.color
            : msg.color;

        return (
          <article key={msg.id} className="lamma-post-card">
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 cursor-pointer"
                onClick={() => onOpenProfile(msg.author)}
              >
                <AMLogo
                  size={isCompactView ? 26 : 34}
                  variant="circular"
                  glow={msg.author === currentSession.nickname}
                  frame={getFrameFromAuthor(msg.author, currentSession)}
                  crownRole={(() => {
                    const r = getRoleFromAuthor(msg.author, currentSession);
                    return (r === "platinum_vip" ? "vip" : r) as any;
                  })()}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="cursor-pointer min-w-0"
                    onClick={() => onOpenProfile(msg.author)}
                  >
                    <div className="lamma-author-line">
                      <span
                        style={{ color: nameColor }}
                        className="font-bold text-[12px] lamma-author-name"
                      >
                        {cleanName}
                      </span>
                      {role === "owner" && (
                        <BossSigil size={13} className="opacity-95" />
                      )}
                      {role === "owner" && (
                        <span className="text-[7px] lamma-role-chip lamma-role-owner">
                          OWNER
                        </span>
                      )}
                      {role === "admin" && (
                        <span className="text-[7px] lamma-role-chip lamma-role-admin">
                          ADMIN
                        </span>
                      )}
                      {role === "vip" && (
                        <span className="text-[7px] lamma-role-chip lamma-role-vip">
                          VIP
                        </span>
                      )}
                      {role === "platinum_vip" && (
                        <span className="text-[7px] lamma-role-chip lamma-role-plat">
                          PLATINUM VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-400">
                      <span>{msg.time}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>منشور عام</span>
                    </div>
                  </div>

                  {canDeletePost(msg) && (
                    <button
                      type="button"
                      onClick={() => onDeletePost(msg)}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded-lg cursor-pointer lamma-soft-action"
                      title="حذف المنشور"
                    >
                      حذف
                    </button>
                  )}
                </div>

                <div
                  className={`lamma-post-body ${
                    isChatColumnExpanded
                      ? "max-w-full"
                      : "max-w-[min(820px,100%)]"
                  }`}
                >
                  {msg.type === "text" && renderTextMessageWithMedia(msg.text)}

                  {msg.type === "image" && msg.mediaUrl && (
                    <div className="mt-3">
                      <img
                        loading="lazy"
                        src={msg.mediaUrl}
                        alt="Post attachment"
                        className="rounded-2xl max-w-[280px] max-h-[220px] object-cover border border-white/10 bg-black/10"
                      />
                    </div>
                  )}

                  {msg.type === "video" && msg.mediaUrl && (
                    <div className="mt-3">
                      {getYoutubeId(msg.mediaUrl) ? (
                        <div className="relative pb-[56.25%] h-0 w-[420px] max-w-full rounded-2xl overflow-hidden border border-red-500/20 shadow-lg">
                          <iframe
                            title="Post YouTube Video Player"
                            src={`https://www.youtube.com/embed/${getYoutubeId(msg.mediaUrl)}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full"
                          />
                        </div>
                      ) : (
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="rounded-2xl max-w-[420px] border border-white/10"
                        />
                      )}
                    </div>
                  )}

                  {msg.type === "audio" && msg.mediaUrl && (
                    <div className="mt-3">
                      <audio
                        src={msg.mediaUrl}
                        controls
                        className="h-9 max-w-[360px] rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function ChatScreen({
  currentUser,
  onLogout,
  primaryTheme,
}: ChatScreenProps) {
  const DEFAULT_AMBIENT_BG: string = "/MAN.png";
  const POSTS_ROOM_ID = "posts-feed";
  const customRoomsStorageKey = `lamma_custom_rooms_${currentUser.uid || currentUser.nickname}`;
  const currentUserRoleLower = String(currentUser.role || "").toLowerCase();
  const isCurrentUserOwner = currentUserRoleLower === "owner";
  const currentUserStorageIdentity = String(
    currentUser.uid || currentUser.email || currentUser.nickname || "anon",
  )
    .trim()
    .toLowerCase()
    .replace(/[^\w.-]+/g, "_");
  const userScopedStorageKey = (base: string) =>
    `${base}_${currentUser.authProvider || "user"}_${currentUserStorageIdentity}`;
  const subscriptionStorageKey = userScopedStorageKey("lamma_user_subscription");
  const friendsListStorageKey = userScopedStorageKey("lamma_friends_list");
  const ignoredUsersStorageKey = userScopedStorageKey("lamma_ignored_users");
  const blockedUsersStorageKey = userScopedStorageKey("lamma_blocked_users");
  const userBioStorageKey = userScopedStorageKey("lamma_user_bio");
  const ghostModeStorageKey = isCurrentUserOwner
    ? userScopedStorageKey("lamma_ghost_mode")
    : null;
  const spyModeStorageKey = isCurrentUserOwner
    ? userScopedStorageKey("lamma_spy_mode")
    : null;

  const readRequestedRoomId = () => {
    if (typeof window === "undefined") return "egypt";
    const requestedRoom = new URLSearchParams(window.location.search)
      .get("room")
      ?.trim()
      .toLowerCase();
    return requestedRoom || "egypt";
  };

  const buildRoomLink = (roomId: string) => {
    const base =
      (import.meta.env.VITE_APP_URL || "").trim() ||
      (typeof window !== "undefined" ? window.location.origin : "/");
    const url = new URL(
      base,
      typeof window !== "undefined" ? window.location.origin : "https://lamma-arabic-chat-room.vercel.app",
    );
    url.searchParams.set("room", roomId || "egypt");
    return url.toString();
  };

  const [ownerBgImage, setOwnerBgImage] = useState<string | null>(() =>
    localStorage.getItem("lamma_owner_bg_image"),
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(() =>
    localStorage.getItem("lamma_custom_logo_url"),
  );
  const [designLogoInput, setDesignLogoInput] = useState<string>(() =>
    localStorage.getItem("lamma_custom_logo_url") || "",
  );
  const [glowColor, setGlowColor] = useState<string>(() => {
    return localStorage.getItem("lamma_glow_color") || "#e4e4e7";
  });
  const [wallTheme, setWallTheme] = useState<WallTheme>(() => {
    const saved = localStorage.getItem("lamma_wall_theme");
    if (saved === "fire" || saved === "ice" || saved === "violet") return saved;
    return "fire";
  });
  const [roomBgMap, setRoomBgMap] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem("lamma_room_bg_map");
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch {
      return {};
    }
  });
  const [designOwnerBgInput, setDesignOwnerBgInput] = useState<string>(() =>
    localStorage.getItem("lamma_owner_bg_image") || "",
  );
  const [inputText, setInputText] = useState("");
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearchPop, setShowSearchPop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Tab toggles for navigation on compact mobile devices
  const [mobileTab, setMobileTab] = useState<
    "sidebar" | "chat" | "private" | "members"
  >("chat");

  const [showFeaturesTray, setShowFeaturesTray] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showRoomsLists, setShowRoomsLists] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"rooms" | "members">(
    "rooms",
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isLeftColumnCollapsed, setIsLeftColumnCollapsed] = useState(false);
  const [isRightColumnCollapsed, setIsRightColumnCollapsed] = useState(false);
  const leftColumnLayoutRef = useRef<HTMLDivElement | null>(null);
  const [leftColumnSectionsPct, setLeftColumnSectionsPct] = useState({
    store: 33.333,
    radio: 33.333,
    music: 33.334,
  });
  const rightColumnLayoutRef = useRef<HTMLDivElement | null>(null);
  const [rightColumnSectionsPct, setRightColumnSectionsPct] = useState({
    rooms: 50,
    members: 50,
  });
  const [isCompactView, setIsCompactView] = useState(false);
  const READING_MODE_STORAGE_KEY = "lamma_reading_mode";

  const CHAT_THEME_STORAGE_KEY = "lamma_chat_theme";
  const CHAT_THEME_CUSTOMIZED_STORAGE_KEY = "lamma_chat_theme_customized";

  const isChatTheme = (value: string | null): value is ChatTheme =>
    value === "classic" ||
    value === "night-paper" ||
    value === "charcoal-calm" ||
    value === "olive-ink" ||
    value === "violet-night";

  const readChatThemeCustomized = () => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CHAT_THEME_CUSTOMIZED_STORAGE_KEY) === "true";
  };

  const readStoredChatTheme = (): ChatTheme => {
    if (typeof window === "undefined") return "classic";
    if (!readChatThemeCustomized()) return "classic";
    const saved = localStorage.getItem(CHAT_THEME_STORAGE_KEY);
    return isChatTheme(saved) ? saved : "classic";
  };

  const [readingMode, setReadingMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const urlFlag = new URLSearchParams(window.location.search).get("reading");
    if (urlFlag === "1") return true;
    if (urlFlag === "0") return false;
    return localStorage.getItem(READING_MODE_STORAGE_KEY) === "true";
  });
  const [hasUserChosenChatTheme, setHasUserChosenChatTheme] = useState<boolean>(
    () => {
      return readChatThemeCustomized();
    },
  );
  const [chatTheme, setChatTheme] = useState<ChatTheme>(() =>
    readStoredChatTheme(),
  );
  const designPresetsStorageKey = userScopedStorageKey("lamma_design_presets");
  const [designPresets, setDesignPresets] = useState<DesignPreset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(designPresetsStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as DesignPreset[]) : [];
    } catch {
      return [];
    }
  });
  const [designPresetName, setDesignPresetName] = useState("");
  const [assistantFindings, setAssistantFindings] = useState<
    DesignAssistantFinding[]
  >([]);
  const [assistantAudit, setAssistantAudit] =
    useState<DesignAssistantAudit | null>(null);
  const [assistantProposal, setAssistantProposal] =
    useState<DesignAssistantProposal | null>(null);
  const [lastAppliedDesignSnapshot, setLastAppliedDesignSnapshot] =
    useState<DesignAssistantSnapshot | null>(null);
  const applyDesignPreset = (preset: DesignPreset) => {
    const snapshot = preset.snapshot;
    setWallTheme(snapshot.wallTheme);
    setBrandLogoUrl(snapshot.brandLogoUrl);
    setDesignLogoInput(snapshot.brandLogoUrl || "");
    setGlowColor(snapshot.glowColor);
    setOwnerBgImage(snapshot.ownerBgImage);
    setDesignOwnerBgInput(snapshot.ownerBgImage || "");
    setRoomBgMap(snapshot.roomBgMap || {});
    setChatTheme(snapshot.chatTheme);
    setHasUserChosenChatTheme(true);
  };
  const buildDesignPreset = (name: string): DesignPreset => {
    return {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 40),
      createdAt: new Date().toISOString(),
      snapshot: {
        wallTheme,
        brandLogoUrl,
        glowColor,
        ownerBgImage,
        roomBgMap: { ...roomBgMap },
        chatTheme,
      },
    };
  };
  const handleSaveDesignPreset = () => {
    const name = designPresetName.trim();
    if (!name) {
      alert("اكتب اسم للستايل الأول.");
      return;
    }
    const preset = buildDesignPreset(name);
    setDesignPresets((prev) => [preset, ...prev].slice(0, 30));
    setDesignPresetName("");
  };
  const handleDeleteDesignPreset = (id: string) => {
    setDesignPresets((prev) => prev.filter((p) => p.id !== id));
  };
  const chatThemeAmbientStyles: Partial<
    Record<ChatTheme, { imageFilter: string; overlay: string }>
  > = {
    "night-paper": {
      imageFilter: "sepia(0.22) saturate(0.88) brightness(0.84)",
      overlay:
        "radial-gradient(900px 540px at 14% 18%, rgba(214, 179, 91, 0.13), transparent 62%), radial-gradient(840px 560px at 84% 76%, rgba(255, 255, 255, 0.03), transparent 64%), linear-gradient(180deg, rgba(10, 11, 12, 0.48) 0%, rgba(8, 9, 10, 0.56) 60%, rgba(6, 7, 8, 0.62) 100%)",
    },
    "charcoal-calm": {
      imageFilter: "grayscale(0.3) saturate(0.72) brightness(0.72)",
      overlay:
        "radial-gradient(820px 540px at 18% 22%, rgba(148, 163, 184, 0.1), transparent 64%), radial-gradient(900px 620px at 86% 78%, rgba(56, 189, 248, 0.06), transparent 66%), linear-gradient(180deg, rgba(8, 10, 14, 0.58) 0%, rgba(6, 8, 12, 0.64) 60%, rgba(5, 6, 10, 0.7) 100%)",
    },
    "olive-ink": {
      imageFilter: "grayscale(1) brightness(0.76)",
      overlay:
        "radial-gradient(860px 560px at 16% 22%, rgba(255, 255, 255, 0.04), transparent 64%), radial-gradient(900px 620px at 84% 78%, rgba(255, 255, 255, 0.03), transparent 66%), linear-gradient(180deg, rgba(10, 11, 12, 0.56) 0%, rgba(8, 9, 10, 0.62) 60%, rgba(6, 7, 8, 0.68) 100%)",
    },
    "violet-night": {
      imageFilter: "hue-rotate(32deg) saturate(1) brightness(0.76)",
      overlay:
        "radial-gradient(900px 560px at 18% 20%, rgba(167, 139, 250, 0.12), transparent 64%), radial-gradient(880px 620px at 86% 78%, rgba(99, 102, 241, 0.08), transparent 66%), linear-gradient(180deg, rgba(10, 8, 16, 0.56) 0%, rgba(8, 7, 14, 0.62) 60%, rgba(6, 6, 12, 0.7) 100%)",
    },
  };
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showPmListDropdown, setShowPmListDropdown] = useState(false);
  const [openRooms, setOpenRooms] = useState([
    { id: "egypt", name: "مصر", flag: "🇪🇬" },
  ]);
  const [customRooms, setCustomRooms] = useState<CustomRoomEntry[]>(() => {
    const saved = localStorage.getItem(customRoomsStorageKey);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [activeRoomId, setActiveRoomId] = useState(() => readRequestedRoomId());
  const appLink = buildRoomLink(activeRoomId);
  const geminiSearchEndpoint =
    import.meta.env.VITE_GEMINI_SEARCH_ENDPOINT || "";
  const senderUid = currentUser.uid || getClientUid();
  const supabaseRestUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(
    /\/rest\/v1\/?$/,
    "",
  );
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  const publicChatSessionStartedAtRef = useRef<string>(
    new Date().toISOString(),
  );
  const publicChatSessionStartedAt = publicChatSessionStartedAtRef.current;
  const publicChatSessionStartedAtMs = new Date(
    publicChatSessionStartedAt,
  ).getTime();
  const roleLower = (currentUser.role || "").toLowerCase();
  const isOwnerRole = roleLower === "owner";
  const isAdminRole = roleLower === "admin";
  const isManagementRole = isOwnerRole || isAdminRole;
  const isPostsRoom = activeRoomId === POSTS_ROOM_ID;
  const isOwnerRoom = activeRoomId === "owner";
  const isAdminRoom = activeRoomId === "admin";
  const canPublishPosts = currentUser.authProvider === "supabase";
  const isRegisteredAccount = currentUser.authProvider === "supabase";
  const tempEntryTopicStorageKey = `lamma_temp_entry_topic_${currentUser.uid || currentUser.nickname}`;
  const availableRooms = [...ROOMS_DEF, ...customRooms];
  useEffect(() => {
    const requestedRoomExists = availableRooms.some((room) => room.id === activeRoomId);
    const isProtectedOwnerRoom = activeRoomId === "owner" && !isOwnerRole;
    const isProtectedAdminRoom = activeRoomId === "admin" && !isAdminRole && !isOwnerRole;

    if (!requestedRoomExists || isProtectedOwnerRoom || isProtectedAdminRoom) {
      setActiveRoomId("egypt");
    }
  }, [activeRoomId, availableRooms, isAdminRole, isOwnerRole]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", activeRoomId || "egypt");
    window.history.replaceState({}, "", url.toString());
  }, [activeRoomId]);
  const visibleRoomCount = availableRooms.filter((room) => {
    if (room.id === "owner" && !isOwnerRole) return false;
    if (room.id === "admin" && !isAdminRole && !isOwnerRole) return false;
    return true;
  }).length;
  const activeRoomBg =
    roomBgMap[activeRoomId] || ownerBgImage || DEFAULT_AMBIENT_BG;
  const [designRoomBgInput, setDesignRoomBgInput] = useState<string>(
    roomBgMap[activeRoomId] || "",
  );
  const isDefaultAmbientBg = activeRoomBg === DEFAULT_AMBIENT_BG;
  const isChatColumnExpanded = isLeftColumnCollapsed || isRightColumnCollapsed;
  const readStoredTempEntryTopic = () => {
    if (typeof window === "undefined") {
      return { text: "", enabled: false };
    }

    try {
      const raw = localStorage.getItem(tempEntryTopicStorageKey);
      if (!raw) return { text: "", enabled: false };
      const parsed = JSON.parse(raw) as {
        text?: string;
        enabled?: boolean;
      };
      const text =
        typeof parsed.text === "string" ? parsed.text.trim().slice(0, 60) : "";
      return {
        text,
        enabled: parsed.enabled === true && Boolean(text),
      };
    } catch {
      return { text: "", enabled: false };
    }
  };
  const persistTempEntryTopic = (text: string, enabled: boolean) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      tempEntryTopicStorageKey,
      JSON.stringify({
        text: text.trim().slice(0, 60),
        enabled: enabled && Boolean(text.trim()),
      }),
    );
  };

  useEffect(() => {
    localStorage.setItem(customRoomsStorageKey, JSON.stringify(customRooms));
  }, [customRooms, customRoomsStorageKey]);

  useEffect(() => {
    setDesignLogoInput(brandLogoUrl || "");
  }, [brandLogoUrl]);

  useEffect(() => {
    setDesignOwnerBgInput(ownerBgImage || "");
  }, [ownerBgImage]);

  useEffect(() => {
    setDesignRoomBgInput(roomBgMap[activeRoomId] || "");
  }, [activeRoomId, roomBgMap]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      READING_MODE_STORAGE_KEY,
      readingMode ? "true" : "false",
    );
  }, [readingMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasUserChosenChatTheme) {
      localStorage.removeItem(CHAT_THEME_STORAGE_KEY);
      localStorage.removeItem(CHAT_THEME_CUSTOMIZED_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CHAT_THEME_STORAGE_KEY, chatTheme);
    localStorage.setItem(CHAT_THEME_CUSTOMIZED_STORAGE_KEY, "true");
  }, [chatTheme, hasUserChosenChatTheme]);

  const getDesignAssistantContext = () => ({
    activeRoomId,
    activeRoomName:
      availableRooms.find((room) => room.id === activeRoomId)?.name || activeRoomId,
    totalRooms: availableRooms.length,
    brandLogoUrl,
    chatTheme,
    glowColor,
    ownerBgImage,
    roomBgMap,
    wallTheme,
    defaultAmbientBg: DEFAULT_AMBIENT_BG,
  });

  const runAssistantAudit = () => {
    const audit = buildDesignAssistantAudit(getDesignAssistantContext());
    setAssistantAudit(audit);
    setAssistantFindings(audit.findings);
    setAssistantProposal(null);
  };

  const queueAssistantProposal = (preset: DesignAssistantProposal["id"]) => {
    const context = getDesignAssistantContext();
    const audit = buildDesignAssistantAudit(context);
    setAssistantAudit(audit);
    setAssistantFindings(audit.findings);
    setAssistantProposal(buildDesignAssistantProposal(preset, context));
  };

  const queueRecommendedAssistantProposal = () => {
    const context = getDesignAssistantContext();
    const audit = buildDesignAssistantAudit(context);
    setAssistantAudit(audit);
    setAssistantFindings(audit.findings);
    setAssistantProposal(
      buildDesignAssistantProposal(audit.recommendedPreset, context),
    );
  };

  const applyAssistantPatch = (patch: DesignAssistantPatch) => {
    setLastAppliedDesignSnapshot({
      wallTheme,
      brandLogoUrl,
      glowColor,
      ownerBgImage,
      roomBgCurrent: roomBgMap[activeRoomId] || null,
      chatTheme,
    });

    if (patch.wallTheme) setWallTheme(patch.wallTheme);
    if (typeof patch.brandLogoUrl !== "undefined") {
      setBrandLogoUrl(patch.brandLogoUrl);
      setDesignLogoInput(patch.brandLogoUrl || "");
    }
    if (patch.glowColor) setGlowColor(patch.glowColor);
    if (typeof patch.ownerBgImage !== "undefined") {
      setOwnerBgImage(patch.ownerBgImage);
      setDesignOwnerBgInput(patch.ownerBgImage || "");
    }
    if (typeof patch.roomBgCurrent !== "undefined") {
      setRoomBgMap((prev) => {
        const updated = { ...prev };
        if (patch.roomBgCurrent?.trim()) updated[activeRoomId] = patch.roomBgCurrent.trim();
        else delete updated[activeRoomId];
        return updated;
      });
      setDesignRoomBgInput(patch.roomBgCurrent || "");
    }
    if (patch.chatTheme) {
      setChatTheme(patch.chatTheme);
      setHasUserChosenChatTheme(true);
    }
  };

  const handleApplyAssistantProposal = () => {
    if (!assistantProposal) return;
    const allowed = window.confirm(
      `سيتم تطبيق المقترح التالي الآن: ${assistantProposal.title}\n\nلن يتم تنفيذ أي تغيير آخر غير المعروض داخل الخطة الحالية.\n\nهل تريد المتابعة؟`,
    );
    if (!allowed) return;

    applyAssistantPatch(assistantProposal.changes);
    addSystemActivityLog(
      "promote",
      currentUser.nickname,
      `المساعد الذكي طبق اقتراح التصميم [${assistantProposal.title}] بعد موافقة المالك.`,
      "🤖 مهندس لمة",
    );
    setAssistantProposal(null);
  };

  const handleRestoreLastDesignSnapshot = () => {
    if (!lastAppliedDesignSnapshot) return;
    const allowed = window.confirm(
      "سيتم استعادة آخر شكل محفوظ قبل تطبيق اقتراح المساعد. هل تريد المتابعة؟",
    );
    if (!allowed) return;

    applyAssistantPatch(lastAppliedDesignSnapshot);
    addSystemActivityLog(
      "demote",
      currentUser.nickname,
      "تمت استعادة آخر شكل محفوظ قبل تعديل المساعد الذكي.",
      "🤖 مهندس لمة",
    );
    setAssistantProposal(null);
  };

  useEffect(() => {
    if (assistantFindings.length === 0 && !assistantAudit) return;
    const nextAudit = buildDesignAssistantAudit(getDesignAssistantContext());
    setAssistantAudit(nextAudit);
    setAssistantFindings(nextAudit.findings);
  }, [
    activeRoomId,
    assistantFindings.length,
    availableRooms,
    brandLogoUrl,
    chatTheme,
    glowColor,
    ownerBgImage,
    roomBgMap,
    wallTheme,
  ]);

  const performSearch = async () => {
    if (!searchQuery) return;
    if (!geminiSearchEndpoint) {
      alert("ميزة البحث بالذكاء الاصطناعي غير متاحة حالياً.");
      return;
    }
    try {
      const response = await fetch(geminiSearchEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: searchQuery }),
      });
      const data = await response.json();
      setInputText((prev) => prev + `\nبحث عن "${searchQuery}": ${data.text}`);
      setSearchQuery("");
    } catch (err) {
      console.error(err);
    }
  };

  // Missing systems active overlay
  const [activeModal, setActiveModal] = useState<
    | "admin"
    | "games"
    | "commands"
    | "guard"
    | "logs_manager"
    | "store"
    | "owner"
    | "leadership"
    | null
  >(null);

  const [leadershipTab, setLeadershipTab] = useState<
    "quick" | "guard" | "store" | "design" | "stats"
  >("quick");

  // --- AUTOMATION AND STORE SYSTEM STATES ---
  const [subscription, setSubscription] = useState<any>(() => {
    const saved = localStorage.getItem(subscriptionStorageKey);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const hasActiveSubscription =
    subscription?.isActive && subscription?.expiresAt > Date.now();
  const subscriptionVisualRole = hasActiveSubscription
    ? subscription.type === "platinum"
      ? "platinum_vip"
      : "vip"
    : null;
  const myVisualRole =
    isOwnerRole || isAdminRole || roleLower === "mod"
      ? roleLower
      : subscriptionVisualRole || roleLower || "user";

  const buildActiveSessionState = (user: UserSession) => {
    const savedSub = localStorage.getItem(subscriptionStorageKey);
    let initialColor = user.color;
    let initialFrame = "";
    let initialTitle = user.title || "";
    let initialBadge = user.badge || "";
    let initialAvatar = user.avatar || "👤";

    if (savedSub) {
      try {
        const sub = JSON.parse(savedSub);
        if (sub.isActive && sub.expiresAt > Date.now()) {
          initialColor = sub.color || initialColor;
          initialFrame = sub.frame || "";
          initialTitle = sub.title || "";
          initialBadge = sub.badge || "";
          initialAvatar = sub.avatar || "👤";
        }
      } catch (e) {
        console.error(e);
      }
    }

    return {
      nickname: user.nickname,
      role: user.role,
      color: initialColor,
      frame: initialFrame,
      title: initialTitle,
      badge: initialBadge,
      avatar: initialAvatar,
    };
  };

  const [myActiveSession, setMyActiveSession] = useState(() =>
    buildActiveSessionState(currentUser),
  );

  useEffect(() => {
    setMyActiveSession((prev) => {
      const next = buildActiveSessionState(currentUser);
      const sameIdentity =
        prev.nickname === currentUser.nickname && prev.role === currentUser.role;

      if (!sameIdentity) {
        return next;
      }

      return {
        ...prev,
        nickname: next.nickname,
        role: next.role,
        color: next.color || prev.color,
        frame: next.frame || prev.frame,
        title: next.title || prev.title,
        badge: next.badge || prev.badge,
        avatar: next.avatar || prev.avatar,
      };
    });
  }, [
    currentUser.avatar,
    currentUser.badge,
    currentUser.color,
    currentUser.nickname,
    currentUser.role,
    currentUser.title,
    currentUser.uid,
  ]);

  const [simulatedDaysLapsed, setSimulatedDaysLapsed] = useState(0);
  const [remindersHistory, setRemindersHistory] = useState<{
    [key: string]: boolean;
  }>({});
  const [violationCount, setViolationCount] = useState<{
    [nick: string]: number;
  }>({});
  {
    /* State for Create Room */
  }
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [userStatus, setUserStatus] = useState("");
  const [isStatusHidden, setIsStatusHidden] = useState(false);

  // Simulated database status for maintenance recovery
  const [isDbConnectionLost, setIsDbConnectionLost] = useState(false);
  const [isReconnectingDb, setIsReconnectingDb] = useState(false);
  const [dbStatusLogs, setDbStatusLogs] = useState<string[]>([]);

  // Custom user suggestions friend request list
  const [friendSuggestions, setFriendSuggestions] = useState([
    {
      id: "sug-1",
      name: "أدهم التونسي 🇹🇳",
      interest: "🎮 Trivia والمسابقات",
      icon: "🎸",
      status: "suggested",
    },
    {
      id: "sug-2",
      name: "رنا النمس 🇪🇬",
      interest: "🎵 سماع وتحليل الموسيقى",
      icon: "👩",
      status: "suggested",
    },
    {
      id: "sug-3",
      name: "شريف الأخرس 🇸🇦",
      interest: "🛡️ الإشراف والحوار الرصين",
      icon: "👳",
      status: "suggested",
    },
  ]);

  // Shop interactive state variables
  const [shopTab, setShopTab] = useState<
    "vip" | "skins" | "badges" | "suggests" | "stats" | "maintenance"
  >("vip");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [payGateway, setPayGateway] = useState<
    "vodafone" | "instapay" | "paymob" | "stripe" | "paypal" | null
  >(null);
  const [paymentAccountInput, setPaymentAccountInput] = useState("");
  const [payStatus, setPayStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [paymentLogs, setPaymentLogs] = useState<string[]>([]);

  // Client simulated parameters for the Mega Ban fingerprinting system
  const [myFingerprint] = useState(() => {
    let fp = localStorage.getItem("lamma_device_fp");
    if (!fp) {
      fp =
        "fp-" +
        Math.floor(Math.random() * 900000 + 100000).toString(16) +
        "-" +
        Math.floor(Math.random() * 9000 + 1000);
      localStorage.setItem("lamma_device_fp", fp);
    }
    return fp;
  });
  const [myBrowserSig] = useState(
    () =>
      navigator.userAgent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0",
  );
  const [myIp] = useState(() => {
    let ip = localStorage.getItem("lamma_device_ip");
    if (!ip) {
      ip = "197.34.82." + Math.floor(Math.random() * 253 + 2);
      localStorage.setItem("lamma_device_ip", ip);
    }
    return ip;
  });

  // Dynamic lists of banned users persisted in local storage
  const [bannedUsersList, setBannedUsersList] = useState<BanInfo[]>(() => {
    const saved = localStorage.getItem("lamma_banned_list");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Current ban tracking state for the active logged-in user
  const [isCurrentlyBanned, setIsCurrentlyBanned] = useState(false);
  const [banDetails, setBanDetails] = useState<BanInfo | null>(null);
  const canSyncModerationToSupabase = Boolean(
    supabase &&
      currentUser.authProvider === "supabase" &&
      currentUser.uid &&
      (currentUser.role === "owner" || currentUser.role === "admin"),
  );

  const addBanEntry = async (
    ban: BanInfo,
    options?: {
      sync?: boolean;
    },
  ) => {
    setBannedUsersList((prev) => mergeBanLists(prev, [ban]));

    if (!options?.sync || !supabase || !canSyncModerationToSupabase) {
      return;
    }

    const payload: BannedUserRow = {
      uid:
        ban.fingerprint ||
        ban.localStorageId ||
        ban.nickname.trim().toLowerCase(),
      author: ban.nickname,
      banner: ban.banner,
      reason: serializeBanRowReason(ban),
    };

    const { data, error } = await supabase
      .from("banned_users")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.warn("Failed to sync ban entry to Supabase", error);
      return;
    }

    if (data) {
      setBannedUsersList((prev) =>
        mergeBanLists(prev, [parseBannedUserRow(data as BannedUserRow)]),
      );
    }
  };

  const removeBanEntries = async (
    matcher: (ban: BanInfo) => boolean,
    options?: {
      sync?: boolean;
    },
  ) => {
    let removedEntries: BanInfo[] = [];
    setBannedUsersList((prev) => {
      removedEntries = prev.filter(matcher);
      return prev.filter((ban) => !matcher(ban));
    });

    if (!options?.sync || !supabase || !canSyncModerationToSupabase) {
      return;
    }

    const remoteIds = removedEntries
      .map((ban) => ban.id)
      .filter((id): id is string => isUuidLike(id));

    if (remoteIds.length === 0) {
      return;
    }

    const { error } = await supabase.from("banned_users").delete().in("id", remoteIds);

    if (error) {
      console.warn("Failed to remove ban entry from Supabase", error);
    }
  };

  // User profiles click state
  const [selectedProfileMember, setSelectedProfileMember] =
    useState<ChatMember | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [nicknameRequests, setNicknameRequests] = useState<
    NicknameChangeRequestRow[]
  >([]);
  const [nicknameRequestInput, setNicknameRequestInput] = useState("");
  const [nicknameRequestLoading, setNicknameRequestLoading] = useState(false);
  const [nicknameRequestStatusText, setNicknameRequestStatusText] = useState<
    string | null
  >(null);
  const [adminTab, setAdminTab] = useState<
    "actions" | "logs" | "bans" | "store_mgmt"
  >("actions");

  // Right-click / interactive context menu for members
  const [showUserContextPop, setShowUserContextPop] = useState(false);
  const [userContextTarget, setUserContextTarget] = useState<ChatMember | null>(
    null,
  );

  // Profile bio pop (information)
  const [showUserProfileBioPop, setShowUserProfileBioPop] = useState(false);
  const [userProfileBioTarget, setUserProfileBioTarget] =
    useState<ChatMember | null>(null);

  // Lists of friends, ignored, and blocked users
  const [friendsList, setFriendsList] = useState<string[]>(() => {
    const saved = localStorage.getItem(friendsListStorageKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [ignoredUsers, setIgnoredUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem(ignoredUsersStorageKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem(blockedUsersStorageKey);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(friendsListStorageKey, JSON.stringify(friendsList));
    localStorage.setItem(ignoredUsersStorageKey, JSON.stringify(ignoredUsers));
    localStorage.setItem(blockedUsersStorageKey, JSON.stringify(blockedUsers));
  }, [
    blockedUsers,
    blockedUsersStorageKey,
    friendsList,
    friendsListStorageKey,
    ignoredUsers,
    ignoredUsersStorageKey,
  ]);

  const [myCustomBio, setMyCustomBio] = useState(() => {
    return (
      localStorage.getItem(userBioStorageKey) ||
      "شخص مميز يشغل حسابه في شات لمة الرائد 💚"
    );
  });

  // Stateful invite/share modal
  const [showShareModalInChat, setShowShareModalInChat] = useState(false);

  const handleCopyLink = () => {
    setShowShareModalInChat(true);
  };

  const [showStatus, setShowStatus] = useState(false);
  const [tempEntryTopicInput, setTempEntryTopicInput] = useState("");
  const [tempEntryTopicEnabled, setTempEntryTopicEnabled] = useState(false);
  const [tempEntryTopicStatusText, setTempEntryTopicStatusText] = useState<
    string | null
  >(null);
  const [visibleTempEntryTopic, setVisibleTempEntryTopic] = useState<
    string | null
  >(null);
  const tempEntryTopicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tempEntryTopicLastTriggerRef = useRef("");
  useEffect(() => {
    localStorage.setItem(userBioStorageKey, myCustomBio);
  }, [myCustomBio, userBioStorageKey]);
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => setShowStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);
  useEffect(() => {
    const stored = readStoredTempEntryTopic();
    setTempEntryTopicInput(stored.text);
    setTempEntryTopicEnabled(stored.enabled);
    setTempEntryTopicStatusText(null);
    tempEntryTopicLastTriggerRef.current = "";

    if (!isRegisteredAccount || !supabase) {
      setVisibleTempEntryTopic(null);
      return;
    }

    let cancelled = false;
    const syncTempEntryTopic = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("Failed to load temp entry topic metadata:", error);
        return;
      }

      if (cancelled) return;

      const metadata = data.user?.user_metadata ?? {};
      const metadataText =
        typeof metadata.temp_entry_topic === "string"
          ? metadata.temp_entry_topic.trim().slice(0, 60)
          : "";
      const metadataEnabled =
        metadata.temp_entry_topic_enabled === true && Boolean(metadataText);

      if (!metadataText && metadata.temp_entry_topic_enabled !== true) {
        return;
      }

      setTempEntryTopicInput(metadataText);
      setTempEntryTopicEnabled(metadataEnabled);
      persistTempEntryTopic(metadataText, metadataEnabled);
    };

    void syncTempEntryTopic();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser.nickname,
    currentUser.uid,
    isRegisteredAccount,
    tempEntryTopicStorageKey,
  ]);
  useEffect(() => {
    if (tempEntryTopicTimerRef.current) {
      clearTimeout(tempEntryTopicTimerRef.current);
      tempEntryTopicTimerRef.current = null;
    }

    if (!isRegisteredAccount) {
      setVisibleTempEntryTopic(null);
      return;
    }

    const nextTopic = tempEntryTopicInput.trim();
    if (!tempEntryTopicEnabled || !nextTopic) {
      setVisibleTempEntryTopic(null);
      return;
    }

    const triggerKey = `${currentUser.uid || currentUser.nickname}:${activeRoomId}`;
    if (tempEntryTopicLastTriggerRef.current === triggerKey) {
      return;
    }

    tempEntryTopicLastTriggerRef.current = triggerKey;
    setVisibleTempEntryTopic(nextTopic);
    tempEntryTopicTimerRef.current = setTimeout(() => {
      setVisibleTempEntryTopic(null);
      tempEntryTopicTimerRef.current = null;
    }, 5000);

    return () => {
      if (tempEntryTopicTimerRef.current) {
        clearTimeout(tempEntryTopicTimerRef.current);
        tempEntryTopicTimerRef.current = null;
      }
    };
  }, [
    activeRoomId,
    currentUser.nickname,
    currentUser.uid,
    isRegisteredAccount,
    tempEntryTopicEnabled,
    tempEntryTopicInput,
  ]);

  const toggleSearchPop = () => {
    setActiveModal(null);
    setShowCommandsDropdown(false);
    setShowGamesDropdown(false);
    setShowSettingsDropdown(false);
    setShowAttachmentDropdown(false);
    setShowNotificationsDropdown(false);
    setIsPmOpen(false);
    setShowUserContextPop(false);
    setShowUserProfileBioPop(false);
    setShowSearchPop((prev) => !prev);
  };

  const addReaction = (roomId: string, messageId: string, emoji: string) => {
    setRoomMessages((prev) => {
      const messagesInRoom = prev[roomId] || [];
      return {
        ...prev,
        [roomId]: messagesInRoom.map((msg) => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || {};
            return {
              ...msg,
              reactions: {
                ...reactions,
                [emoji]: (reactions[emoji] || 0) + 1,
              },
            };
          }
          return msg;
        }),
      };
    });
  };

  const canDeleteMessage = (msg: any): boolean => {
    if (!msg) return false;
    if (msg.type === "system") return false;
    const isOwner = currentUser.role === "owner";
    const isAdmin = currentUser.role === "admin";
    if (isOwner || isAdmin) return true;
    if (supabase && !currentUser.uid) return false;
    const cleanAuthor = msg.author
      .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
      .trim();
    return cleanAuthor === currentUser.nickname;
  };

  const deleteMessage = (msg: any) => {
    if (!msg?.id) return;
    setRoomMessages((prev) => {
      const messagesInRoom = prev[activeRoomId] || [];
      const next = messagesInRoom.filter((m) => m.id !== msg.id);
      return { ...prev, [activeRoomId]: next };
    });
    if (supabase) {
      supabase
        .from("messages")
        .delete()
        .eq("id", msg.id)
        .then(({ error }) => {
          if (error)
            console.error("Error deleting message from Supabase:", error);
        });
    }
  };

  // Dynamic products list stored inside the owner's reactive system
  const [storeProducts, setStoreProducts] = useState<any[]>(() => {
    const saved = localStorage.getItem("lamma_store_products");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }

    return [
      // VIP Bundles
      {
        id: "prod-vip-bronze",
        tab: "vip",
        name: "💎 باقة كبار الشخصيات البرونزية",
        description:
          "شارة VIP خضراء ملفتة، تمكين ألوان الاسم، رخصة مكالمات صوتية بلا قيود، والحصول على شارات التميز الأساسية لاسمك.",
        price: "50 EGP",
        type: "bronze",
        badge: "VIP",
        color: "#10b981",
        ext: "vip",
      },
      {
        id: "prod-vip-platinum",
        tab: "vip",
        name: "👑 باقة كبار الشخصيات البلاتينية",
        description:
          "شارة متدرجة متوهجة، اسم متدرج الألوان، إطار ذهبي لافت، تمكين هدايا مروحية وصاروخية طائرة تلقائياً، وأولوية رعاية من البوت.",
        price: "150 EGP",
        type: "platinum",
        badge: "PLATINUM",
        color: "gradient",
        ext: "platinum_vip",
      },
      // Skins & Cosmetics
      {
        id: "prod-skin-fire",
        tab: "skins",
        name: "🔥 إطار اللهب المتوهج",
        description:
          "يمنح صورتك الشخصية والرسائل والملف هالة نارية مشتعلة تدور بجمال لافت.",
        price: "25 EGP",
        type: "frame",
        frame: "from-red-500 via-orange-500 to-yellow-500",
      },
      {
        id: "prod-skin-ice",
        tab: "skins",
        name: "❄️ إطار الجليد الكوني",
        description:
          "إطار متحلزن بارد من أطياف الضوء الطبيعي ينير تواجدك في الدردشة.",
        price: "25 EGP",
        type: "frame",
        frame: "from-cyan-500 via-indigo-500 to-purple-500",
      },
      {
        id: "prod-skin-rainbow",
        tab: "skins",
        name: "🌈 إطار قوس قزح السحري",
        description:
          "تداول فوري لسبعة ألوان طيفية حول صورتك بشكل متحرك يلفت كل الأنظار.",
        price: "30 EGP",
        type: "frame",
        frame: "from-pink-500 via-purple-500 to-cyan-500",
      },
      // Badges & Titles
      {
        id: "prod-badge-peace",
        tab: "badges",
        name: "🛡️ لقب حامي السلام (Peacekeeper)",
        description:
          "يضيف بجوار اسمك لقب 🛡️ حام الفضيلة وتخصيص لقب الشات إلى [زعيم السلام] بخلفية شفافة أنيقة.",
        price: "15 EGP",
        type: "title",
        title: "زعيم السلام",
        badge: "🛡️ حام الفضيلة",
      },
      {
        id: "prod-badge-emperor",
        tab: "badges",
        name: "⚡ لقب الإمبراطور (Emperor Authority)",
        description:
          "يمنحك لقب ⚡ القيصر وتعيين اللقب المطبوع [الإمبراطور العظيم] المضيء بجوار لقبك بالدردشة والفعاليات.",
        price: "35 EGP",
        type: "title",
        title: "الإمبراطور العظيم",
        badge: "⚡ القيصر",
      },
    ];
  });

  // Sync products list to dynamic localStorage
  useEffect(() => {
    localStorage.setItem("lamma_store_products", JSON.stringify(storeProducts));
  }, [storeProducts]);

  // Global Automatic Bot Subscription Monitor
  useEffect(() => {
    if (!subscription || !subscription.isActive || !subscription.expiresAt)
      return;

    const botCheckSub = () => {
      const now = Date.now();
      const remainingMs = subscription.expiresAt - now;
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

      const savedRemindersStr =
        localStorage.getItem("lamma_bot_reminders") || "{}";
      const savedReminders = JSON.parse(savedRemindersStr);

      if (remainingDays <= 0) {
        // EXPIRED! BOT REMOVES VIP AUTOMATICALLY
        const expiredSub = { ...subscription, isActive: false };
        localStorage.setItem(subscriptionStorageKey, JSON.stringify(expiredSub));
        setSubscription(expiredSub);

        setMyActiveSession((prev) => ({
          ...prev,
          role: currentUser.role,
          color: currentUser.color,
          frame: "",
          title: "",
          badge: "",
        }));

        addLammaBotMessage(
          activeRoomId || "room1",
          `🤖 إشعار الاشتراك: انتهت صلاحية باقة VIP الخاصة بالعضو [${currentUser.nickname}] وتم تحديث المزايا تلقائياً.`,
        );
        addSystemActivityLog(
          "demote",
          currentUser.nickname,
          "انقضاء فترة اشتراك VIP تلقائياً وسحب الصلاحيات من نظام الأتمتة.",
          "🤖 LAMMA AUTO-BOT",
        );
      } else if (remainingDays === 1 && !savedReminders["1"]) {
        savedReminders["1"] = true;
        localStorage.setItem(
          "lamma_bot_reminders",
          JSON.stringify(savedReminders),
        );
        addLammaBotMessage(
          activeRoomId || "room1",
          `🤖 إشعار الاشتراك: يتبقى 24 ساعة على انتهاء باقة VIP الخاصة بالعضو [${currentUser.nickname}].`,
        );
      } else if (remainingDays <= 3 && !savedReminders["3"]) {
        savedReminders["3"] = true;
        localStorage.setItem(
          "lamma_bot_reminders",
          JSON.stringify(savedReminders),
        );
        addLammaBotMessage(
          activeRoomId || "room1",
          `🤖 إشعار الاشتراك: يتبقى 3 أيام على انتهاء باقة VIP الخاصة بالعضو [${currentUser.nickname}].`,
        );
      } else if (remainingDays <= 7 && !savedReminders["7"]) {
        savedReminders["7"] = true;
        localStorage.setItem(
          "lamma_bot_reminders",
          JSON.stringify(savedReminders),
        );
        addLammaBotMessage(
          activeRoomId || "room1",
          `🤖 إشعار الاشتراك: باقة VIP الخاصة بالعضو [${currentUser.nickname}] ستنتهي خلال 7 أيام.`,
        );
      }
    };

    botCheckSub();
    const interval = setInterval(botCheckSub, 60000); // Smart Presence Optimization: Update every 60 seconds instead of 5
    return () => clearInterval(interval);
  }, [subscription, currentUser, activeRoomId]);

  // Product addition and modification variables
  const [newProdName, setNewProdName] = useState("");
  const [newProdTab, setNewProdTab] = useState<"vip" | "skins" | "badges">(
    "vip",
  );
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdType, setNewProdType] = useState<ProductType>("title");
  const [newProdBadge, setNewProdBadge] = useState("");
  const [newProdColor, setNewProdColor] = useState("#10b981");
  const [newProdFrame, setNewProdFrame] = useState(
    "from-purple-600 to-pink-600",
  );
  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdExt, setNewProdExt] = useState("");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Dynamic online chat members state
  const [isGhostMode, setIsGhostMode] = useState<boolean>(() => {
    if (!ghostModeStorageKey) return false;
    return localStorage.getItem(ghostModeStorageKey) === "true";
  });

  useEffect(() => {
    if (!ghostModeStorageKey) {
      setIsGhostMode(false);
      return;
    }
    localStorage.setItem(ghostModeStorageKey, String(isGhostMode));
  }, [ghostModeStorageKey, isGhostMode]);

  const [isSpyMode, setIsSpyMode] = useState<boolean>(() => {
    if (!spyModeStorageKey) return false;
    return localStorage.getItem(spyModeStorageKey) === "true";
  });

  useEffect(() => {
    if (!spyModeStorageKey) {
      setIsSpyMode(false);
      return;
    }
    localStorage.setItem(spyModeStorageKey, String(isSpyMode));
  }, [isSpyMode, spyModeStorageKey]);

  const normalizeChatMemberRole = (
    role: string | undefined,
  ): ChatMember["role"] => {
    switch (role) {
      case "guest":
      case "user":
      case "vip":
      case "platinum_vip":
      case "mod":
      case "admin":
      case "owner":
        return role;
      default:
        return currentUser.authProvider === "guest" ? "guest" : "user";
    }
  };

  const currentDisplayNickname = myActiveSession.nickname || currentUser.nickname;
  const currentDisplayColor = myActiveSession.color || currentUser.color || "#10b981";
  const currentDisplayAvatar = myActiveSession.avatar || currentUser.avatar || "👤";
  const currentDisplayBadge = myActiveSession.badge || currentUser.badge;
  const currentDisplayTitle = myActiveSession.title || currentUser.title;
  const activeTempEntryTopic = visibleTempEntryTopic?.trim() || "";

  const buildCurrentChatMember = (): ChatMember => ({
    id: currentUser.uid || `member-${currentDisplayNickname}`,
    nickname: currentDisplayNickname,
    role: normalizeChatMemberRole(
      typeof currentUser.role === "string" ? currentUser.role : undefined,
    ),
    color: currentDisplayColor,
    avatar: currentDisplayAvatar,
    status: "online",
    email: currentUser.email || undefined,
    badge: currentDisplayBadge,
    title: currentDisplayTitle,
    fingerprint: myFingerprint,
    browserSignature: myBrowserSig,
    ip: myIp,
    localStorageId: `local-${currentUser.uid || currentDisplayNickname}`,
  });

  const [rawChatMembers, setChatMembers] = useState<ChatMember[]>(() => [
    buildCurrentChatMember(),
  ]);

  useEffect(() => {
    const currentMember = buildCurrentChatMember();
    setChatMembers((prev) => {
      const others = prev.filter(
        (member) =>
          member.id !== currentMember.id &&
          member.nickname.toLowerCase() !== currentMember.nickname.toLowerCase(),
      );
      return [currentMember, ...others];
    });
  }, [
    currentUser.authProvider,
    currentUser.avatar,
    currentUser.badge,
    currentUser.color,
    currentUser.email,
    currentUser.nickname,
    currentUser.role,
    currentUser.title,
    currentUser.uid,
    myActiveSession.avatar,
    myActiveSession.badge,
    myActiveSession.color,
    myActiveSession.nickname,
    myActiveSession.title,
    myBrowserSig,
    myFingerprint,
    myIp,
  ]);

  // Derived chatMembers: hide current user if Ghost Mode is active
  const chatMembers = isGhostMode
    ? rawChatMembers.filter((m) => m.nickname !== currentDisplayNickname)
    : rawChatMembers;
  const memberRoleSortPriority: Record<string, number> = {
    owner: 0,
    admin: 1,
    mod: 2,
    platinum_vip: 3,
    vip: 4,
    user: 5,
    guest: 6,
  };
  const orderedChatMembers = [...chatMembers].sort((a, b) => {
    const roleA = getRoleFromAuthor(a.nickname, myActiveSession, chatMembers);
    const roleB = getRoleFromAuthor(b.nickname, myActiveSession, chatMembers);
    const priorityA = memberRoleSortPriority[roleA] ?? 99;
    const priorityB = memberRoleSortPriority[roleB] ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.nickname.localeCompare(b.nickname, "ar");
  });

  // System Logs & Event Tracker state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem("lamma_activity_logs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [];
  });

  // Lamma AI Guard Bot Settings & States
  const [isBotEnabled, setIsBotEnabled] = useState<boolean>(() => {
    return localStorage.getItem("lamma_bot_enabled") !== "false";
  });
  const [botRuleAntiSpam, setBotRuleAntiSpam] = useState<boolean>(() => {
    return localStorage.getItem("lamma_bot_rule_spam") !== "false";
  });
  const [botRuleAntiLinks, setBotRuleAntiLinks] = useState<boolean>(() => {
    return localStorage.getItem("lamma_bot_rule_links") !== "false";
  });
  const [botRuleSwearFilter, setBotRuleSwearFilter] = useState<boolean>(() => {
    return localStorage.getItem("lamma_bot_rule_swear") !== "false";
  });
  const [botRuleAutoMod, setBotRuleAutoMod] = useState<boolean>(() => {
    return localStorage.getItem("lamma_bot_rule_automod") !== "false";
  });

  useEffect(() => {
    localStorage.setItem("lamma_bot_enabled", String(isBotEnabled));
  }, [isBotEnabled]);
  useEffect(() => {
    localStorage.setItem("lamma_bot_rule_spam", String(botRuleAntiSpam));
  }, [botRuleAntiSpam]);
  useEffect(() => {
    localStorage.setItem("lamma_bot_rule_links", String(botRuleAntiLinks));
  }, [botRuleAntiLinks]);
  useEffect(() => {
    localStorage.setItem("lamma_bot_rule_swear", String(botRuleSwearFilter));
  }, [botRuleSwearFilter]);
  useEffect(() => {
    localStorage.setItem("lamma_bot_rule_automod", String(botRuleAutoMod));
  }, [botRuleAutoMod]);

  // Global Owner Control Center states
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem("lamma_maintenance_mode") === "true";
  });
  const [isGlobalMute, setIsGlobalMute] = useState<boolean>(() => {
    return localStorage.getItem("lamma_global_mute") === "true";
  });
  const [isGlobalMicMute, setIsGlobalMicMute] = useState<boolean>(() => {
    return localStorage.getItem("lamma_global_mic_mute") === "true";
  });
  const [isOnlyVIPCanSendImages, setIsOnlyVIPCanSendImages] = useState<boolean>(
    () => {
      return localStorage.getItem("lamma_vip_only_images") === "true";
    },
  );
  const [isBotSilent, setIsBotSilent] = useState<boolean>(() => {
    return localStorage.getItem("lamma_bot_silent") === "true";
  });
  const [isAdsEnabled, setIsAdsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("lamma_ads_enabled") !== "false";
  });
  const [isWelcomeToastEnabled, setIsWelcomeToastEnabled] = useState<boolean>(
    () => {
      return localStorage.getItem("lamma_greetings_enabled") !== "false";
    },
  );
  const [showThemeSettingsModal, setShowThemeSettingsModal] = useState<boolean>(false);

  // Persistent state synchronization loops
  useEffect(() => {
    localStorage.setItem("lamma_maintenance_mode", String(isMaintenanceMode));
  }, [isMaintenanceMode]);

  useEffect(() => {
    localStorage.setItem("lamma_global_mute", String(isGlobalMute));
  }, [isGlobalMute]);

  useEffect(() => {
    localStorage.setItem("lamma_global_mic_mute", String(isGlobalMicMute));
  }, [isGlobalMicMute]);

  useEffect(() => {
    localStorage.setItem(
      "lamma_vip_only_images",
      String(isOnlyVIPCanSendImages),
    );
  }, [isOnlyVIPCanSendImages]);

  useEffect(() => {
    localStorage.setItem("lamma_bot_silent", String(isBotSilent));
  }, [isBotSilent]);

  useEffect(() => {
    localStorage.setItem("lamma_ads_enabled", String(isAdsEnabled));
  }, [isAdsEnabled]);

  useEffect(() => {
    localStorage.setItem(
      "lamma_greetings_enabled",
      String(isWelcomeToastEnabled),
    );
  }, [isWelcomeToastEnabled]);

  const [bannedWords, setBannedWords] = useState<string[]>(() => {
    const saved = localStorage.getItem("lamma_banned_words");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      "شتيمة",
      "هبل",
      "غبي",
      "احمق",
      "روابط",
      "spam",
      "scam",
      "حيوان",
      "كلب",
      "حمار",
    ];
  });

  useEffect(() => {
    localStorage.setItem("lamma_banned_words", JSON.stringify(bannedWords));
  }, [bannedWords]);
  const [newBannedWordInput, setNewBannedWordInput] = useState("");

  // User rapid promotion panel states
  const [promoTargetNick, setPromoTargetNick] = useState("");
  const [promoTargetRole, setPromoTargetRole] = useState<string>("vip");
  const [promoTargetColor, setPromoTargetColor] = useState("#10b981");
  const [promoTargetBadge, setPromoTargetBadge] = useState("");

  const [botLogs, setBotLogs] = useState<
    {
      id: string;
      time: string;
      text: string;
      severity: "info" | "warn" | "danger";
    }[]
  >([
    {
      id: "1",
      time: "10:30 PM",
      text: "تم تفعيل بوت الحماية المتقدم Lamma Guard v2.0 بنجاح.",
      severity: "info",
    },
    {
      id: "2",
      time: "10:35 PM",
      text: "فحص جدار الحماية: الشات محمي ومستقر بنسبة 100%.",
      severity: "info",
    },
    {
      id: "3",
      time: "10:42 PM",
      text: "تم حظر محاولة إرسال رابط ملفات مشبوهة من زائر مؤقت.",
      severity: "danger",
    },
    {
      id: "4",
      time: "10:50 PM",
      text: "تنبيه تلقائي: تم كتم عضو مؤقتاً بسبب تكرار الرسائل السريع.",
      severity: "warn",
    },
  ]);

  // High Availability WebRTC Calling System (Automated Fallback)
  const webRTCServers = [
    {
      name: "خادم جوجل الأساسي (Google STUN - سرعة عالية)",
      url: "stun:stun.l.google.com:19302",
    },
    {
      name: "خادم كلاود فلير الاحتياطي (Cloudflare STUN - موثوقية)",
      url: "stun:stun.cloudflare.com:3478",
    },
  ];

  const [activeCall, setActiveCall] = useState<{
    target: string;
    type: "video" | "audio";
    status: "connecting" | "ringing" | "connected" | "failed" | "ended";
    serverIndex: number;
    callDuration: number;
    isFallback?: boolean;
  } | null>(null);

  // Call connection simulation with automatic fallback between the top 2 free STUN servers
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (activeCall?.status === "connecting") {
      // Simulate connection attempt on current server
      timeout = setTimeout(() => {
        // Randomly simulate server failure on the first server to demonstrate the automatic fallback
        const shouldFail = Math.random() < 0.35 && activeCall.serverIndex === 0;

        if (shouldFail) {
          // Switch to secondary server seamlessly
          setActiveCall((prev) =>
            prev ? { ...prev, serverIndex: 1, isFallback: true } : null,
          );
        } else {
          setActiveCall((prev) =>
            prev ? { ...prev, status: "ringing" } : null,
          );
        }
      }, 600); // Super fast 600ms latency simulation
    } else if (activeCall?.status === "ringing") {
      timeout = setTimeout(() => {
        setActiveCall((prev) =>
          prev ? { ...prev, status: "connected" } : null,
        );
      }, 1500);
    }
    return () => clearTimeout(timeout);
  }, [activeCall?.status, activeCall?.serverIndex]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall?.status === "connected") {
      interval = setInterval(() => {
        setActiveCall((prev) =>
          prev ? { ...prev, callDuration: prev.callDuration + 1 } : null,
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  const initiateCall = (target: string, type: "video" | "audio") => {
    setActiveCall({
      target,
      type,
      status: "connecting",
      serverIndex: 0,
      callDuration: 0,
    });
  };

  const endCall = () => {
    if (activeCall) {
      setActiveCall((prev) => (prev ? { ...prev, status: "ended" } : null));
      setTimeout(() => {
        setActiveCall(null);
      }, 1500);
    }
  };

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Custom user permissions managed exclusively by the owner
  const [memberCustomPermissions, setMemberCustomPermissions] = useState<
    Record<string, MemberCustomPermissions>
  >(() => {
    const saved = localStorage.getItem("lamma_custom_user_perms");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(
      "lamma_custom_user_perms",
      JSON.stringify(memberCustomPermissions),
    );
  }, [memberCustomPermissions]);

  const ownerSettingsSyncReadyRef = useRef(false);
  const ownerPermissionsSyncReadyRef = useRef(false);
  const ownerSettingsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ownerPermissionsSyncTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const canPersistOwnerSettings = currentUser.role === "owner";

  useEffect(() => {
    if (!supabase) return;
    const subscription = supabase
      .channel('owner_settings_sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'owner_settings', filter: 'id=eq.global' },
        (payload) => {
          const settings = payload.new;
          if (settings.ghost_mode !== undefined) setIsGhostMode(!!settings.ghost_mode);
          if (settings.spy_mode !== undefined) setIsSpyMode(!!settings.spy_mode);
          if (settings.maintenance_mode !== undefined) setIsMaintenanceMode(!!settings.maintenance_mode);
          if (settings.global_mute !== undefined) setIsGlobalMute(!!settings.global_mute);
          if (settings.global_mic_mute !== undefined) setIsGlobalMicMute(!!settings.global_mic_mute);
          if (settings.vip_only_images !== undefined) setIsOnlyVIPCanSendImages(!!settings.vip_only_images);
          if (settings.bot_silent !== undefined) setIsBotSilent(!!settings.bot_silent);
          if (settings.ads_enabled !== undefined) setIsAdsEnabled(!!settings.ads_enabled);
          if (settings.greetings_enabled !== undefined) setIsWelcomeToastEnabled(!!settings.greetings_enabled);
          if (settings.banned_words) setBannedWords(settings.banned_words);
          if (settings.owner_bg_image !== undefined) setOwnerBgImage(settings.owner_bg_image);
          if (settings.custom_logo_url !== undefined) {
            setBrandLogoUrl(settings.custom_logo_url);
            setDesignLogoInput(settings.custom_logo_url || '');
          }
          if (settings.glow_color !== undefined) setGlowColor(settings.glow_color || '#e4e4e7');
          if (settings.wall_theme !== undefined) setWallTheme(settings.wall_theme as any || 'fire');
          if (settings.room_bg_map !== undefined) setRoomBgMap(settings.room_bg_map || {});
          if (settings.chat_theme !== undefined) setChatTheme(settings.chat_theme as any || 'classic');
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const subscription = supabase
      .channel('owner_permissions_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'owner_member_permissions' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new;
            setMemberCustomPermissions(prev => ({
              ...prev,
              [p.nickname]: {
                recordingAllowed: !!p.recording_allowed,
                callsAllowed: !!p.calls_allowed,
                musicRadioAllowed: !!p.music_radio_allowed,
                roomCreationAllowed: !!p.room_creation_allowed,
              }
            }));
          } else if (payload.eventType === 'DELETE') {
            const p = payload.old;
            if (p && p.nickname) {
              setMemberCustomPermissions(prev => {
                const next = { ...prev };
                delete next[p.nickname];
                return next;
              });
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOwnerData = async () => {
      ownerSettingsSyncReadyRef.current = false;
      ownerPermissionsSyncReadyRef.current = false;

      if (!supabase) {
        ownerSettingsSyncReadyRef.current = true;
        ownerPermissionsSyncReadyRef.current = true;
        return;
      }

      try {
        const settingsRequest = supabase
          .from("owner_settings")
          .select("*")
          .eq("id", OWNER_SETTINGS_ROW_ID)
          .maybeSingle<OwnerSettingsRow>();
        const permissionsRequest = supabase
          .from("owner_member_permissions")
          .select("*");
        const logsRequest =
          currentUser.role === "owner" || currentUser.role === "admin"
            ? supabase
                .from("owner_activity_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100)
            : Promise.resolve({ data: null, error: null });

        const [settingsResult, permissionsResult, logsResult] =
          await Promise.all([
            settingsRequest,
            permissionsRequest,
            logsRequest,
          ]);

        if (cancelled) return;

        if (settingsResult.data) {
          const settings = settingsResult.data;
          setIsGhostMode(Boolean(settings.ghost_mode));
          setIsSpyMode(Boolean(settings.spy_mode));
          setIsMaintenanceMode(Boolean(settings.maintenance_mode));
          setIsGlobalMute(Boolean(settings.global_mute));
          setIsGlobalMicMute(Boolean(settings.global_mic_mute));
          setIsOnlyVIPCanSendImages(Boolean(settings.vip_only_images));
          setIsBotSilent(Boolean(settings.bot_silent));
          setIsAdsEnabled(settings.ads_enabled !== false);
          setIsWelcomeToastEnabled(settings.greetings_enabled !== false);
          setBannedWords(
            Array.isArray(settings.banned_words)
              ? settings.banned_words.filter(
                  (word): word is string =>
                    typeof word === "string" && word.trim().length > 0,
                )
              : [],
          );
          setOwnerBgImage(settings.owner_bg_image?.trim() || null);
          setBrandLogoUrl(settings.custom_logo_url?.trim() || null);
          setGlowColor(settings.glow_color?.trim() || "#e4e4e7");
          if (
            settings.wall_theme === "fire" ||
            settings.wall_theme === "ice" ||
            settings.wall_theme === "violet"
          ) {
            setWallTheme(settings.wall_theme);
          }
          setRoomBgMap(sanitizeRoomBgMap(settings.room_bg_map));
          if (Array.isArray((settings as any).design_presets)) {
            setDesignPresets((settings as any).design_presets as DesignPreset[]);
          }
        }

        if (Array.isArray(permissionsResult.data)) {
          const nextPermissions = (
            permissionsResult.data as OwnerMemberPermissionRow[]
          ).reduce<Record<string, MemberCustomPermissions>>((acc, row) => {
            if (!row.nickname?.trim()) return acc;
            acc[row.nickname] = {
              recordingAllowed: Boolean(row.recording_allowed),
              callsAllowed: Boolean(row.calls_allowed),
              musicRadioAllowed: Boolean(row.music_radio_allowed),
              roomCreationAllowed: Boolean(row.room_creation_allowed),
            };
            return acc;
          }, {});

          setMemberCustomPermissions(nextPermissions);
        }

        if (Array.isArray(logsResult.data)) {
          const nextLogs = (logsResult.data as OwnerActivityLogRow[]).map(
            (row) => ({
              id: row.id || `syslog-${row.time}-${row.user_nickname}`,
              time: row.time,
              type: row.type,
              userNickname: row.user_nickname,
              operatorNickname: row.operator_nickname,
              details: row.details,
            }),
          );
          setActivityLogs(nextLogs);
          localStorage.setItem("lamma_activity_logs", JSON.stringify(nextLogs));
        }
      } catch (error) {
        console.warn("Owner state fallback to localStorage", error);
      } finally {
        if (!cancelled) {
          ownerSettingsSyncReadyRef.current = true;
          ownerPermissionsSyncReadyRef.current = true;
        }
      }
    };

    loadOwnerData();

    return () => {
      cancelled = true;
    };
  }, [currentUser.authProvider, currentUser.role, currentUser.uid]);

  const fetchNicknameRequests = async () => {
    if (
      !supabase ||
      currentUser.authProvider !== "supabase" ||
      !currentUser.uid
    ) {
      setNicknameRequests([]);
      return;
    }

    let query = supabase
      .from("nickname_change_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(isOwnerRole ? 100 : 10);

    if (!isOwnerRole) {
      query = query.eq("user_id", currentUser.uid);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Failed to fetch nickname change requests:", error);
      return;
    }

    setNicknameRequests((data as NicknameChangeRequestRow[]) || []);
  };

  useEffect(() => {
    void fetchNicknameRequests();
  }, [currentUser.authProvider, currentUser.uid, isOwnerRole]);

  useEffect(() => {
    if (
      !supabase ||
      currentUser.authProvider !== "supabase" ||
      !currentUser.uid
    ) {
      return;
    }

    const approvedRequest = nicknameRequests.find(
      (request) =>
        request.user_id === currentUser.uid && request.status === "approved",
    );

    if (!approvedRequest?.id) return;

    const appliedKey = `lamma_nickname_request_applied_${currentUser.uid}_${approvedRequest.id}`;
    if (sessionStorage.getItem(appliedKey)) return;

    const requestedNickname = approvedRequest.requested_nickname.trim();
    if (!requestedNickname) return;

    const applyApprovedNickname = async () => {
      if (
        requestedNickname.toLowerCase() ===
        (myActiveSession.nickname || currentUser.nickname).toLowerCase()
      ) {
        sessionStorage.setItem(appliedKey, "1");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { nickname: requestedNickname },
      });

      if (error) {
        console.warn("Failed to apply approved nickname request:", error);
        return;
      }

      sessionStorage.setItem(appliedKey, "1");
      setMyActiveSession((prev) => ({
        ...prev,
        nickname: requestedNickname,
      }));
      setNicknameRequestStatusText(
        `تم اعتماد طلب تغيير الاسم إلى ${requestedNickname} بنجاح.`,
      );
    };

    void applyApprovedNickname();
  }, [
    currentUser.authProvider,
    currentUser.nickname,
    currentUser.uid,
    myActiveSession.nickname,
    nicknameRequests,
  ]);

  useEffect(() => {
    if (ownerBgImage?.trim()) {
      localStorage.setItem("lamma_owner_bg_image", ownerBgImage.trim());
    } else {
      localStorage.removeItem("lamma_owner_bg_image");
    }
  }, [ownerBgImage]);

  useEffect(() => {
    if (brandLogoUrl?.trim()) {
      localStorage.setItem("lamma_custom_logo_url", brandLogoUrl.trim());
    } else {
      localStorage.removeItem("lamma_custom_logo_url");
    }
  }, [brandLogoUrl]);

  useEffect(() => {
    localStorage.setItem("lamma_glow_color", glowColor);
  }, [glowColor]);

  useEffect(() => {
    localStorage.setItem("lamma_wall_theme", wallTheme);
  }, [wallTheme]);

  useEffect(() => {
    localStorage.setItem("lamma_room_bg_map", JSON.stringify(roomBgMap));
  }, [roomBgMap]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        designPresetsStorageKey,
        JSON.stringify(designPresets),
      );
    } catch (e) {
      // ignore
    }
  }, [designPresets, designPresetsStorageKey]);

  useEffect(() => {
    if (
      !ownerSettingsSyncReadyRef.current ||
      !supabase ||
      !canPersistOwnerSettings
    ) {
      return;
    }

    if (ownerSettingsSyncTimeoutRef.current) {
      clearTimeout(ownerSettingsSyncTimeoutRef.current);
    }

    ownerSettingsSyncTimeoutRef.current = setTimeout(async () => {
      const payload: OwnerSettingsRow = {
        id: OWNER_SETTINGS_ROW_ID,
        ghost_mode: isGhostMode,
        spy_mode: isSpyMode,
        maintenance_mode: isMaintenanceMode,
        global_mute: isGlobalMute,
        global_mic_mute: isGlobalMicMute,
        vip_only_images: isOnlyVIPCanSendImages,
        bot_silent: isBotSilent,
        ads_enabled: isAdsEnabled,
        greetings_enabled: isWelcomeToastEnabled,
        banned_words: bannedWords,
        owner_bg_image: ownerBgImage,
        custom_logo_url: brandLogoUrl,
        glow_color: glowColor,
          wall_theme: wallTheme,
          chat_theme: chatTheme,
          room_bg_map: roomBgMap,
        design_presets: designPresets,
      };

      const { error } = await supabase
        .from("owner_settings")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.warn("Failed to sync owner settings", error);
        // Alert the owner that settings failed to save due to RLS or auth issues
        if (error.code === "42501") {
          console.error("Supabase RLS Error: You do not have the owner role in your auth.users metadata.");
        }
      }
    }, OWNER_SYNC_DEBOUNCE_MS);

    return () => {
      if (ownerSettingsSyncTimeoutRef.current) {
        clearTimeout(ownerSettingsSyncTimeoutRef.current);
      }
    };
  }, [
    bannedWords,
    brandLogoUrl,
    canPersistOwnerSettings,
    designPresets,
    glowColor,
    isAdsEnabled,
    isBotSilent,
    isGhostMode,
    isGlobalMicMute,
    isGlobalMute,
    isMaintenanceMode,
    isOnlyVIPCanSendImages,
    isSpyMode,
    isWelcomeToastEnabled,
      ownerBgImage,
      roomBgMap,
      wallTheme,
      chatTheme,
    ]);

  useEffect(() => {
    if (
      !ownerPermissionsSyncReadyRef.current ||
      !supabase ||
      !canPersistOwnerSettings
    ) {
      return;
    }

    if (ownerPermissionsSyncTimeoutRef.current) {
      clearTimeout(ownerPermissionsSyncTimeoutRef.current);
    }

    ownerPermissionsSyncTimeoutRef.current = setTimeout(async () => {
      const rows: OwnerMemberPermissionRow[] = Object.entries(
        memberCustomPermissions,
      ).map(([nickname, permissions]) => ({
        nickname,
        updated_by: currentUser.nickname,
        recording_allowed: permissions.recordingAllowed,
        calls_allowed: permissions.callsAllowed,
        music_radio_allowed: permissions.musicRadioAllowed,
        room_creation_allowed: permissions.roomCreationAllowed,
      }));

      if (rows.length === 0) return;

      const { error } = await supabase
        .from("owner_member_permissions")
        .upsert(rows, { onConflict: "nickname" });

      if (error) {
        console.warn("Failed to sync owner member permissions", error);
      }
    }, OWNER_SYNC_DEBOUNCE_MS);

    return () => {
      if (ownerPermissionsSyncTimeoutRef.current) {
        clearTimeout(ownerPermissionsSyncTimeoutRef.current);
      }
    };
  }, [canPersistOwnerSettings, currentUser.nickname, memberCustomPermissions]);

  // Audio refs and states for separate Radio & Music players
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  const radioStations = [
    {
      id: "quran-cairo",
      name: "إذاعة القرآن الكريم من القاهرة 🕋",
      frequency: "98.2 FM",
      url: "https://live.mp3quran.net:9702/",
    },
    {
      id: "quran-saudi",
      name: "إذاعة القرآن الكريم من الرياض 🕋",
      frequency: "100.0 FM",
      url: "https://live.mp3quran.net:9718/",
    },
    {
      id: "songs2",
      name: "إذاعة أغاني لمة FM المباشرة 📻",
      frequency: "100.6 FM",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    },
    {
      id: "fairouz",
      name: "راديو فيروز والزمن الجميل ☕",
      frequency: "91.2 FM",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    },
  ];

  const musicTracks = [
    {
      id: "track1",
      title: "موسيقى ترحيبية كلاسيكية 🌸",
      desc: "Classic ambient track",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      id: "track2",
      title: "موسيقى لمة الحماسية 🔥",
      desc: "Energy rhythm",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      id: "track3",
      title: "طيف التفاؤل والراحة ✨",
      desc: "Soft relaxation",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
    {
      id: "track4",
      title: "عزف عود شرقي أصيل 🌙",
      desc: "Traditional Oud melody",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    },
  ];

  const [currentRadioStation, setCurrentRadioStation] = useState(
    radioStations[0],
  );
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);

  const [currentMusicTrack, setCurrentMusicTrack] = useState(musicTracks[0]);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const toggleRadioPlay = () => {
    if (!radioAudioRef.current) return;
    if (isRadioPlaying) {
      radioAudioRef.current.pause();
      setIsRadioPlaying(false);
    } else {
      if (isMusicPlaying && musicAudioRef.current) {
        musicAudioRef.current.pause();
        setIsMusicPlaying(false);
      }
      radioAudioRef.current
        .play()
        .catch((err) => console.log("Audio play error", err));
      setIsRadioPlaying(true);
    }
  };

  const handleSelectRadioStation = (station: (typeof radioStations)[0]) => {
    setCurrentRadioStation(station);
    setIsRadioPlaying(false);
    if (radioAudioRef.current) {
      radioAudioRef.current.src = station.url;
      radioAudioRef.current.load();
      setTimeout(() => {
        if (isMusicPlaying && musicAudioRef.current) {
          musicAudioRef.current.pause();
          setIsMusicPlaying(false);
        }
        radioAudioRef.current
          ?.play()
          .then(() => setIsRadioPlaying(true))
          .catch((err) => console.log(err));
      }, 200);
    }
  };

  const nextRadioStation = () => {
    const idx = radioStations.findIndex((s) => s.id === currentRadioStation.id);
    const nextIdx = (idx + 1) % radioStations.length;
    handleSelectRadioStation(radioStations[nextIdx]);
  };

  const prevRadioStation = () => {
    const idx = radioStations.findIndex((s) => s.id === currentRadioStation.id);
    const prevIdx = (idx - 1 + radioStations.length) % radioStations.length;
    handleSelectRadioStation(radioStations[prevIdx]);
  };

  const toggleMusicPlay = () => {
    if (!musicAudioRef.current) return;
    if (isMusicPlaying) {
      musicAudioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      if (isRadioPlaying && radioAudioRef.current) {
        radioAudioRef.current.pause();
        setIsRadioPlaying(false);
      }
      musicAudioRef.current.play().catch((err) => console.log(err));
      setIsMusicPlaying(true);
    }
  };

  const handleSelectMusicTrack = (track: (typeof musicTracks)[0]) => {
    setCurrentMusicTrack(track);
    setIsMusicPlaying(false);
    if (musicAudioRef.current) {
      musicAudioRef.current.src = track.url;
      musicAudioRef.current.load();
      setTimeout(() => {
        if (isRadioPlaying && radioAudioRef.current) {
          radioAudioRef.current.pause();
          setIsRadioPlaying(false);
        }
        musicAudioRef.current
          ?.play()
          .then(() => setIsMusicPlaying(true))
          .catch((err) => console.log(err));
      }, 200);
    }
  };

  const nextMusicTrack = () => {
    const idx = musicTracks.findIndex((t) => t.id === currentMusicTrack.id);
    const nextIdx = (idx + 1) % musicTracks.length;
    handleSelectMusicTrack(musicTracks[nextIdx]);
  };

  const prevMusicTrack = () => {
    const idx = musicTracks.findIndex((t) => t.id === currentMusicTrack.id);
    const prevIdx = (idx - 1 + musicTracks.length) % musicTracks.length;
    handleSelectMusicTrack(musicTracks[prevIdx]);
  };

  // Custom dropdowns
  const [showNotificationsDropdown, setShowNotificationsDropdown] =
    useState(false);
  const [showGamesDropdown, setShowGamesDropdown] = useState(false);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [showMusicDropdown, setShowMusicDropdown] = useState(false);
  const [showRadioDropdown, setShowRadioDropdown] = useState(false);
  const [showCommandsDropdown, setShowCommandsDropdown] = useState(false);
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pmImageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Rate limit: max 3 media uploads per 60s per user (rooms + pm combined)
  const mediaRateStateRef = useRef<{ times: number[] }>({ times: [] });
  // Notifications: incoming PMs and mentions
  const [notifications, setNotifications] = useState<
    {
      id: string;
      kind: "pm" | "mention" | "system";
      title: string;
      body: string;
      at: number;
      read: boolean;
    }[]
  >(() => {
    try {
      const raw = localStorage.getItem("lamma_notifications");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return [];
  });
  // In-app sound for new incoming messages
  const messageAudioCtxRef = useRef<AudioContext | null>(null);
  const playMessageSound = () => {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!messageAudioCtxRef.current) messageAudioCtxRef.current = new Ctx();
      const ctx = messageAudioCtxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.27);
    } catch (e) {
      // ignore
    }
  };
  const handleIncomingRoomMessage = useCallback(
    (sMsg: SupabaseMessage, roomId: string) => {
      const mentionMatch =
        typeof sMsg.text === "string" &&
        sMsg.text.includes(`@${currentUser.nickname}`);
      const newNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: mentionMatch ? ("mention" as const) : ("system" as const),
        title: mentionMatch
          ? `${sMsg.author} ذكرك في ${roomId}`
          : `رسالة جديدة من ${sMsg.author}`,
        body: (sMsg.text || sMsg.media_url || "[مرفق]").slice(0, 120),
        at: Date.now(),
        read: false,
      };
      setNotifications((prevN) => {
        const next = [newNotif, ...prevN].slice(0, 30);
        try {
          localStorage.setItem("lamma_notifications", JSON.stringify(next));
        } catch (e) {
          // ignore
        }
        return next;
      });
      if (document.hidden) playMessageSound();
    },
    [currentUser.nickname],
  );
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const closeFloatingUi = () => {
    setShowRoomsLists(false);
    setShowMembersList(false);
    setShowFeaturesTray(false);
    setShowHeaderMenu(false);
    setShowPmListDropdown(false);
    setShowAttachmentDropdown(false);
    setShowGamesDropdown(false);
    setShowMusicDropdown(false);
    setShowRadioDropdown(false);
    setShowEmojiPicker(false);
    setShowNotificationsDropdown(false);
    setShowCommandsDropdown(false);
    setShowPrivacyDropdown(false);
    setShowSettingsDropdown(false);
    setIsSidebarOpen(false);
  };
  const hasFloatingDropdownOpen =
    showRoomsLists ||
    showMembersList ||
    showFeaturesTray ||
    showHeaderMenu ||
    showPmListDropdown ||
    showAttachmentDropdown ||
    showGamesDropdown ||
    showMusicDropdown ||
    showRadioDropdown ||
    showEmojiPicker ||
    showNotificationsDropdown ||
    showCommandsDropdown ||
    showPrivacyDropdown ||
    showSettingsDropdown;

  const toggleDropdown = (
    dropdown:
      | "attachment"
      | "games"
      | "music"
      | "radio"
      | "emoji"
      | "notifications"
      | "commands"
      | "privacy"
      | "settings"
      | "headerMenu"
      | "pmList"
      | "features",
  ) => {
    const shouldOpen =
      (dropdown === "features" && !showFeaturesTray) ||
      (dropdown === "headerMenu" && !showHeaderMenu) ||
      (dropdown === "pmList" && !showPmListDropdown) ||
      (dropdown === "attachment" && !showAttachmentDropdown) ||
      (dropdown === "games" && !showGamesDropdown) ||
      (dropdown === "music" && !showMusicDropdown) ||
      (dropdown === "radio" && !showRadioDropdown) ||
      (dropdown === "emoji" && !showEmojiPicker) ||
      (dropdown === "notifications" && !showNotificationsDropdown) ||
      (dropdown === "commands" && !showCommandsDropdown) ||
      (dropdown === "privacy" && !showPrivacyDropdown) ||
      (dropdown === "settings" && !showSettingsDropdown);

    setActiveModal(null);
    setIsPmOpen(false);
    setShowSearchPop(false);
    setShowUserContextPop(false);
    setShowUserProfileBioPop(false);
    setShowProfileModal(false);
    closeFloatingUi();

    if (!shouldOpen) return;
    if (dropdown === "commands" && !isManagementRole) return;

    switch (dropdown) {
      case "features":
        setShowFeaturesTray(true);
        break;
      case "headerMenu":
        setShowHeaderMenu(true);
        break;
      case "pmList":
        setShowPmListDropdown(true);
        break;
      case "attachment":
        setShowAttachmentDropdown(true);
        break;
      case "games":
        setShowGamesDropdown(true);
        break;
      case "music":
        setShowMusicDropdown(true);
        break;
      case "radio":
        setShowRadioDropdown(true);
        break;
      case "emoji":
        setShowEmojiPicker(true);
        break;
      case "notifications":
        setShowNotificationsDropdown(true);
        break;
      case "commands":
        setShowCommandsDropdown(true);
        break;
      case "privacy":
        setShowPrivacyDropdown(true);
        break;
      case "settings":
        setShowSettingsDropdown(true);
        break;
    }
  };

  const openModal = (
    modal:
      | "admin"
      | "games"
      | "commands"
      | "guard"
      | "logs_manager"
      | "store"
      | "owner"
      | "leadership"
      | null,
  ) => {
    if (modal === "leadership" && !isOwnerRole) return;
    if (modal === "owner" && !isOwnerRole) return;
    if (modal === "guard" && !isOwnerRole) return;
    if (modal === "admin" && !isManagementRole) return;
    setShowAttachmentDropdown(false);
    setShowGamesDropdown(false);
    setShowMusicDropdown(false);
    setShowRadioDropdown(false);
    setShowEmojiPicker(false);
    setShowNotificationsDropdown(false);
    setShowCommandsDropdown(false);
    setShowPrivacyDropdown(false);
    setShowSettingsDropdown(false);
    setIsPmOpen(false);
    setShowSearchPop(false);
    setShowUserContextPop(false);
    setShowUserProfileBioPop(false);
    setShowProfileModal(false);
    closeFloatingUi();
    setActiveModal(modal);
  };

  useEffect(() => {
    setShowMembersList(isSidebarOpen && activeSidebarTab === "members");
  }, [activeSidebarTab, isSidebarOpen]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".dropdown-container") &&
        !target.closest(".sidebar-toggle-btn") &&
        !target.closest(".sidebar-container") &&
        !target.closest(".lamma-sheet-shell") &&
        !target.closest(".lamma-popover-shell") &&
        !target.closest(".lamma-feature-shell") &&
        !target.closest(".lamma-modal-shell") &&
        !target.closest(".lamma-list-panel")
      ) {
        setShowNotificationsDropdown(false);
        setShowGamesDropdown(false);
        setShowAttachmentDropdown(false);
        setShowMusicDropdown(false);
        setShowEmojiPicker(false);
        setShowFeaturesTray(false);
        setShowCommandsDropdown(false);
        setShowPrivacyDropdown(false);
        setShowSettingsDropdown(false);
        setShowHeaderMenu(false);
        setShowPmListDropdown(false);
        setShowRoomsLists(false);
        setShowMembersList(false);
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setActiveModal(null);
      setIsPmOpen(false);
      setShowSearchPop(false);
      setShowUserContextPop(false);
      setShowUserProfileBioPop(false);
      setShowProfileModal(false);
      setShowNotificationsDropdown(false);
      setShowGamesDropdown(false);
      setShowAttachmentDropdown(false);
      setShowMusicDropdown(false);
      setShowRadioDropdown(false);
      setShowEmojiPicker(false);
      setShowFeaturesTray(false);
      setShowCommandsDropdown(false);
      setShowPrivacyDropdown(false);
      setShowSettingsDropdown(false);
      setShowHeaderMenu(false);
      setShowPmListDropdown(false);
      closeFloatingUi();
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  // Sync banned list to localStorage
  useEffect(() => {
    localStorage.setItem("lamma_banned_list", JSON.stringify(bannedUsersList));
  }, [bannedUsersList]);

  useEffect(() => {
    if (!supabase) return;

    let isCancelled = false;

    const fetchSyncedBans = async () => {
      const { data, error } = await supabase
        .from("banned_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Failed to load banned users from Supabase", error);
        return;
      }

      if (!data || isCancelled) return;

      setBannedUsersList((prev) =>
        mergeBanLists(
          prev,
          (data as BannedUserRow[]).map((row) => parseBannedUserRow(row)),
        ),
      );
    };

    void fetchSyncedBans();

    const subscription = supabase
      .channel("banned_users_sync")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "banned_users",
        },
        (payload) => {
          if (isCancelled) return;
          setBannedUsersList((prev) =>
            mergeBanLists(prev, [
              parseBannedUserRow(payload.new as BannedUserRow),
            ]),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "banned_users",
        },
        (payload) => {
          if (isCancelled) return;
          const deletedId = (payload.old as { id?: string } | null)?.id;
          if (!deletedId) return;
          setBannedUsersList((prev) =>
            prev.filter((ban) => ban.id !== deletedId),
          );
        },
      )
      .subscribe();

    return () => {
      isCancelled = true;
      void supabase.removeChannel(subscription);
    };
  }, []);

  // System Event Logging handler
  const addSystemActivityLog = (
    type: "login" | "logout" | "ban" | "promote" | "demote",
    userNickname: string,
    details: string,
    operatorNickname = currentUser.nickname,
  ) => {
    const timeStr = new Date().toLocaleTimeString("ar-EG", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const newLog: ActivityLog = {
      id: `syslog-${Date.now()}-${Math.random()}`,
      time: timeStr,
      type,
      userNickname,
      operatorNickname,
      details,
    };

    setActivityLogs((prev) => {
      const updated = [newLog, ...prev];
      localStorage.setItem("lamma_activity_logs", JSON.stringify(updated));
      return updated;
    });

    if (
      supabase &&
      (currentUser.role === "owner" || currentUser.role === "admin") &&
      currentUser.authProvider === "supabase"
    ) {
      const payload: OwnerActivityLogRow = {
        time: timeStr,
        type,
        user_nickname: userNickname,
        operator_nickname: operatorNickname,
        details,
      };

      void supabase.from("owner_activity_logs").insert(payload).then(({ error }) => {
        if (error) {
          console.warn("Failed to sync owner activity log", error);
        }
      });
    }
  };

  // Open user profile popover/modal dynamically with full network metadata fingerprinting details
  const openMemberProfile = (nickname: string) => {
    if (!nickname) return;
    if (
      nickname.includes("🛡️") ||
      nickname.includes("الحماية") ||
      nickname.includes("نظام") ||
      nickname.includes("تقرير") ||
      nickname.includes("حارس")
    )
      return;

    const cleanName = nickname
      .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
      .trim();

    let member = rawChatMembers.find(
      (m) => m.nickname.toLowerCase() === cleanName.toLowerCase(),
    );
    if (!member) {
      const isGuest =
        cleanName.startsWith("LammaGuest") ||
        cleanName.startsWith("LC-Guest") ||
        cleanName.startsWith("LC_Guest") ||
        cleanName.includes("زائر") ||
        cleanName.includes("Guest");
      const derivedRole =
        cleanName.includes("أدمن") || cleanName.includes("علي")
          ? "admin"
          : cleanName.includes("أحمد")
            ? "owner"
            : cleanName.includes("VIP") ||
                cleanName.includes("سارة") ||
                cleanName.includes("محمد")
              ? "vip"
              : isGuest
                ? "guest"
                : "user";

      member = {
        id: `umock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nickname: cleanName,
        role: derivedRole as any,
        color: "#10b981",
        avatar: isGuest ? "👤" : "👨",
        status: "online",
        email: undefined,
        fingerprint: `fp-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        browserSignature: navigator.userAgent,
        ip: `197.34.82.${Math.floor(Math.random() * 253 + 2)}`,
        localStorageId: `local-session-mock-${cleanName}`,
      };

      setChatMembers((prev) => [...prev, member!]);
    }

    // Clear all other active overlays
    setActiveModal(null);
    setShowCommandsDropdown(false);
    setShowGamesDropdown(false);
    setShowSettingsDropdown(false);
    setShowAttachmentDropdown(false);
    setShowNotificationsDropdown(false);
    setShowSearchPop(false);
    setIsPmOpen(false);

    setSelectedProfileMember(member);
    setUserContextTarget(member);
    setShowUserContextPop(true);
  };

  const handleInlineMemberTap = (nickname: string) => {
    // On small touch screens, opening profile cards from every message tap is
    // easy to trigger by accident and feels like the messages "disappear".
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    openMemberProfile(nickname);
  };

  // Interactive full-index check for block enforcement (IP, Fingerprint, LocalStorage, Emails, Session, Browser Sig)
  useEffect(() => {
    const isGuest =
      currentUser.nickname.startsWith("LammaGuest") ||
      currentUser.nickname.startsWith("LC-Guest") ||
      currentUser.nickname.startsWith("LC_Guest") ||
      currentUser.nickname.includes("زائر") ||
      currentUser.nickname.includes("Guest");
    const activeEmail = isGuest ? undefined : currentUser.email || undefined;

    const matchedBan = bannedUsersList.find((b) => {
      if (b.type === "megaban") {
        return (
          b.nickname.toLowerCase() === currentUser.nickname.toLowerCase() ||
          (activeEmail &&
            b.email &&
            b.email.toLowerCase() === activeEmail.toLowerCase()) ||
          b.fingerprint === myFingerprint ||
          b.browserSignature === myBrowserSig ||
          b.ip === myIp
        );
      }
      if (b.type === "ban") {
        return b.nickname.toLowerCase() === currentUser.nickname.toLowerCase();
      }
      return false;
    });

    if (matchedBan) {
      setIsCurrentlyBanned(true);
      setBanDetails(matchedBan);
    } else {
      setIsCurrentlyBanned(false);
      setBanDetails(null);
    }
  }, [bannedUsersList, currentUser, myFingerprint, myBrowserSig, myIp]);

  // Log automated session entry events
  useEffect(() => {
    const loggedInKey = `lamma_logged_${currentUser.nickname}`;
    if (!sessionStorage.getItem(loggedInKey)) {
      addSystemActivityLog(
        "login",
        currentUser.nickname,
        `تسجيل دخول ناجح للعضو ${currentUser.nickname} برتبة [${currentUser.role}] بنظام الدخول الآمن.`,
        currentUser.nickname,
      );
      sessionStorage.setItem(loggedInKey, "true");
    }
  }, []);

  // System Action Trigger Logout with audit logs
  const handleInitiateLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    closeFloatingUi();
    setActiveModal(null);
    setIsSidebarOpen(false);
    setShowMembersList(false);
    setIsPmOpen(false);
    cleanupPublicChatSession(true);
    addSystemActivityLog(
      "logout",
      currentUser.nickname,
      `تسجيل خروج ناجح للعضو ${currentUser.nickname} من الخادم وتدمير الجلسة المؤقتة.`,
      currentUser.nickname,
    );
    window.setTimeout(() => {
      onLogout();
    }, 0);
  };

  // Safe Room switching with block validation
  const handleSwitchRoom = (roomId: string) => {
    const isBanned = bannedUsersList.some(
      (b) =>
        b.nickname.toLowerCase() === currentUser.nickname.toLowerCase() &&
        b.type === "room" &&
        b.roomId === roomId,
    );
    if (isBanned) {
      alert(
        `🚫 تنبيه الغرف: عذراً! أنت محظور من دخول هذه الغرفة بقرار إداري من قبل المشرفين.`,
      );
      return;
    }

    const roleLower = (currentUser?.role || "").toLowerCase();
    const isOwner = roleLower === "owner";
    const isAdmin = roleLower === "admin" || isOwner;

    if (roomId === "owner" && !isOwner) {
      alert(
        `⚠️ الغرفة محمية بالكامل: نأسف، هذه هي غرفة المالك الذكية المحصنة بـ 'جدار حماية ناري أمني' لمنع التسلل والتحكم بقوانين الشات. الدخول مسموح فقط لمالك السيرفر الأساسي 👑.`,
      );
      return;
    }

    if (roomId === "admin" && !isAdmin) {
      alert(
        `⚠️ الغرفة مغلقة أمنياً: عذراً، غرفة الإدارة العليا محمية ببروتوكولات الأمان. الدخول مخصص فقط للمشرفين وأعضاء الطاقم الإداري والمالك 🛡️.`,
      );
      return;
    }

    setActiveRoomId(roomId);
    setShowRoomsLists(false);

    // Show bio/status
    if (myCustomBio) {
      // Bio displayed via UI
    }
  };

  const handleSubmitNicknameChangeRequest = async () => {
    const requestedNickname = nicknameRequestInput.trim();

    if (!requestedNickname) {
      alert("اكتب الاسم الجديد المطلوب أولاً.");
      return;
    }

    if (
      requestedNickname.toLowerCase() ===
      (myActiveSession.nickname || currentUser.nickname).toLowerCase()
    ) {
      alert("الاسم الجديد هو نفسه الاسم الحالي.");
      return;
    }

    if (!supabase || currentUser.authProvider !== "supabase" || !currentUser.uid) {
      alert("هذه الميزة متاحة للحسابات المسجلة فقط.");
      return;
    }

    const hasPendingRequest = nicknameRequests.some(
      (request) =>
        request.user_id === currentUser.uid && request.status === "pending",
    );

    if (hasPendingRequest) {
      alert("لديك طلب تغيير اسم قيد المراجعة بالفعل.");
      return;
    }

    setNicknameRequestLoading(true);
    setNicknameRequestStatusText(null);

    const { error } = await supabase.from("nickname_change_requests").insert({
      user_id: currentUser.uid,
      user_email: currentUser.email ?? null,
      current_nickname: myActiveSession.nickname || currentUser.nickname,
      requested_nickname: requestedNickname,
      status: "pending",
    });

    setNicknameRequestLoading(false);

    if (error) {
      alert("تعذر إرسال طلب تغيير الاسم حالياً.");
      console.warn("Failed to submit nickname request:", error);
      return;
    }

    setNicknameRequestInput("");
    setNicknameRequestStatusText(
      "تم إرسال طلب تغيير الاسم للمالك وسيظهر له للمراجعة.",
    );
    await fetchNicknameRequests();
  };

  const handleSaveTempEntryTopic = async () => {
    const rawTopic = tempEntryTopicInput.trim();
    if (rawTopic.length > 60) {
      alert("اجعل التوبيك المؤقت 60 حرفاً أو أقل.");
      return;
    }

    if (!supabase || !isRegisteredAccount || !currentUser.uid) {
      alert("هذه الميزة متاحة للحسابات المسجلة فقط.");
      return;
    }

    const sanitizedTopic = rawTopic.slice(0, 60);
    const nextEnabled = tempEntryTopicEnabled && Boolean(sanitizedTopic);
    setTempEntryTopicStatusText(null);

    const { error } = await supabase.auth.updateUser({
      data: {
        temp_entry_topic: sanitizedTopic,
        temp_entry_topic_enabled: nextEnabled,
      },
    });

    if (error) {
      alert("تعذر حفظ التوبيك المؤقت حالياً.");
      console.warn("Failed to save temp entry topic:", error);
      return;
    }

    setTempEntryTopicInput(sanitizedTopic);
    setTempEntryTopicEnabled(nextEnabled);
    persistTempEntryTopic(sanitizedTopic, nextEnabled);
    tempEntryTopicLastTriggerRef.current = "";

    if (tempEntryTopicTimerRef.current) {
      clearTimeout(tempEntryTopicTimerRef.current);
      tempEntryTopicTimerRef.current = null;
    }

    if (nextEnabled && sanitizedTopic) {
      setVisibleTempEntryTopic(sanitizedTopic);
      tempEntryTopicTimerRef.current = setTimeout(() => {
        setVisibleTempEntryTopic(null);
        tempEntryTopicTimerRef.current = null;
      }, 5000);
    } else {
      setVisibleTempEntryTopic(null);
    }

    setTempEntryTopicStatusText(
      sanitizedTopic
        ? nextEnabled
          ? "تم حفظ التوبيك المؤقت وسيظهر جنب اسمك لحظات وقت الدخول."
          : "تم حفظ النص، لكن ظهوره معطل حالياً حتى تفعله."
        : "تم مسح التوبيك المؤقت من حسابك.",
    );
  };

  const handleProcessNicknameRequest = async (
    requestId: string,
    status: "approved" | "rejected",
  ) => {
    if (!supabase || !isOwnerRole) return;

    setNicknameRequestLoading(true);
    const { error } = await supabase
      .from("nickname_change_requests")
      .update({
        status,
        processed_at: new Date().toISOString(),
        processed_by: currentUser.nickname,
      })
      .eq("id", requestId);

    setNicknameRequestLoading(false);

    if (error) {
      alert("تعذر تحديث حالة الطلب حالياً.");
      console.warn("Failed to process nickname request:", error);
      return;
    }

    await fetchNicknameRequests();
  };

  // States to keep interface simple and un-cluttered
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPmOpen, setIsPmOpen] = useState(false);
  const [showPmAttachment, setShowPmAttachment] = useState(false);
  const [showPmEmojiPicker, setShowPmEmojiPicker] = useState(false);

  // Available system rooms
  const systemRooms = [
    { id: "egypt", name: "مصر", flag: "🇪🇬" },
    { id: "arab", name: "كل العرب", flag: "🌍" },
    { id: "romance", name: "رومانسية", flag: "💖" },
    { id: "youth", name: "لمة شباب وبنات", flag: "👫" },
    { id: "fun", name: "فرفشة", flag: "🥳" },
    { id: "palestine", name: "فلسطين", flag: "🇵🇸" },
    { id: "games", name: "ألعاب", flag: "🎮" },
    { id: "admin", name: "الإدارة", flag: "🛡️" },
    { id: "owner", name: "المالك", flag: "👑" },
  ];
  const normalizePmRole = (role?: string) => {
    const normalized = (role || "member").toLowerCase();
    if (normalized === "platinum_vip") return "platinum_vip";
    if (normalized === "vip") return "vip";
    if (normalized === "owner") return "owner";
    if (normalized === "admin") return "admin";
    if (normalized === "mod") return "mod";
    return "member";
  };



  const {
    pmTarget,
    setPmTarget,
    pmThreads,
    setPmThreads,
    activePmNickname,
    pmMessages,
    pmInputText,
    setPmInputText,
    isPmTyping,
  } = usePrivateMessages({
    currentUser,
    isSpyMode,
    isPmOpen,
    playMessageSound,
  });
  const pmInputRef = useRef<HTMLInputElement>(null);

  // Chat Header Welcome Message editability for owner
  const [welcomeMessage, setWelcomeMessage] = useState(
    "شات لمة يرحب بكم — يرجى احترام الجميع 💚",
  );
  const [isEditingWelcome, setIsEditingWelcome] = useState(false);

  const {
    roomMessages,
    setRoomMessages,
    allMessages,
    cleanupPublicChatSession,
  } = useChatMessages({
    activeRoomId,
    currentUserNickname: currentUser.nickname,
    ignoredUsers,
    blockedUsers,
    publicChatSessionStartedAt,
    publicChatSessionStartedAtMs,
    senderUid,
    supabaseRestUrl,
    supabaseAnonKey,
    onIncomingMessage: handleIncomingRoomMessage,
  });

  // Room mapped topics
  const [roomTopics, setRoomTopics] = useState<Record<string, string>>({
    egypt: "أهلاً وسهلاً بكم في غرفة مصر 💚",
    arab: "مرحباً بكم في ملتقى كل العرب 🌍",
    "posts-feed":
      "انشر أفكارك ومنشوراتك العامة هنا، وستظهر لكل من يدخل الروم 📰",
    admin: "لوحة رقابة المشرفين، يرجى الحفاظ على النظام 🛡️",
    owner: "جدار المالك السري 👑، يمكنك هنا تعديل وتخصيص كل شيء بضغطة زر!",
  });
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicInputText, setTopicInputText] = useState("");

  const [authError, setAuthError] = useState<string | null>(null);

  const [messageShowCount, setMessageShowCount] = useState<number>(50);

  // Reset message count when changing room
  useEffect(() => {
    setMessageShowCount(50);
  }, [activeRoomId]);

  const messages = allMessages.slice(
    Math.max(0, allMessages.length - messageShowCount),
  );
  const postsFeedMessages = [...messages]
    .filter((msg) => ["text", "image", "video", "audio"].includes(msg.type))
    .reverse();

  // Audio elements: background broadcast and call simulations
  const [isMuted, setIsMuted] = useState(false);
  const [isCalling, setIsCalling] = useState(true); // default calling simulated
  const [callingSeconds, setCallingSeconds] = useState(12);

  // Audio visualizer wave simulation
  const [waveHeights, setWaveHeights] = useState([
    12, 28, 45, 12, 34, 18, 50, 14, 38, 22, 10,
  ]);

  // Flying entities vectors
  const [flyingElements, setFlyingElements] = useState<
    { id: string; char: string; left: number }[]
  >([]);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const feedViewportRef = useRef<HTMLDivElement>(null);
  const pmEndRef = useRef<HTMLDivElement>(null);
  const rateLimitRef = useRef<number[]>([]);

  const updateComposerText = (
    transform: (
      text: string,
      selectionStart: number,
      selectionEnd: number,
    ) => {
      nextText: string;
      selectionStart: number;
      selectionEnd: number;
    },
  ) => {
    const textarea = messageInputRef.current;
    const rawText = inputText;
    const selectionStart = textarea?.selectionStart ?? rawText.length;
    const selectionEnd = textarea?.selectionEnd ?? rawText.length;
    const nextState = transform(rawText, selectionStart, selectionEnd);

    setInputText(nextState.nextText);
    requestAnimationFrame(() => {
      const liveTextarea = messageInputRef.current;
      if (!liveTextarea) return;
      liveTextarea.focus();
      liveTextarea.setSelectionRange(
        nextState.selectionStart,
        nextState.selectionEnd,
      );
    });
  };

  const wrapComposerSelection = (
    prefix: string,
    suffix: string,
    placeholder: string,
  ) => {
    updateComposerText((text, selectionStart, selectionEnd) => {
      const selectedText = text.slice(selectionStart, selectionEnd);
      const innerText = selectedText || placeholder;
      const inserted = `${prefix}${innerText}${suffix}`;
      const nextText =
        text.slice(0, selectionStart) + inserted + text.slice(selectionEnd);
      const highlightStart = selectionStart + prefix.length;
      const highlightEnd = highlightStart + innerText.length;

      return {
        nextText,
        selectionStart: highlightStart,
        selectionEnd: highlightEnd,
      };
    });
    setShowSettingsDropdown(false);
  };

  const applyComposerColor = () => {
    const suggestedColor =
      currentUser.color && /^#[0-9a-f]{3,8}$/i.test(currentUser.color)
        ? currentUser.color
        : "#10b981";
    const pickedColor = window
      .prompt("اكتب لون HEX مثل #10b981 أو #0ea5e9", suggestedColor)
      ?.trim();

    if (!pickedColor) return;
    if (!/^#[0-9a-f]{3,8}$/i.test(pickedColor)) {
      alert("صيغة اللون غير صحيحة. استخدم مثال مثل #10b981");
      return;
    }

    wrapComposerSelection(
      `[color=${pickedColor}]`,
      "[/color]",
      "نص ملون",
    );
  };

  const updatePmComposerText = (
    transform: (
      text: string,
      selectionStart: number,
      selectionEnd: number,
    ) => {
      nextText: string;
      selectionStart: number;
      selectionEnd: number;
    },
  ) => {
    const input = pmInputRef.current;
    const rawText = pmInputText;
    const selectionStart = input?.selectionStart ?? rawText.length;
    const selectionEnd = input?.selectionEnd ?? rawText.length;
    const nextState = transform(rawText, selectionStart, selectionEnd);

    setPmInputText(nextState.nextText);
    requestAnimationFrame(() => {
      const liveInput = pmInputRef.current;
      if (!liveInput) return;
      liveInput.focus();
      liveInput.setSelectionRange(
        nextState.selectionStart,
        nextState.selectionEnd,
      );
    });
  };

  const wrapPmComposerSelection = (
    prefix: string,
    suffix: string,
    placeholder: string,
  ) => {
    updatePmComposerText((text, selectionStart, selectionEnd) => {
      const selectedText = text.slice(selectionStart, selectionEnd);
      const innerText = selectedText || placeholder;
      const inserted = `${prefix}${innerText}${suffix}`;
      const nextText =
        text.slice(0, selectionStart) + inserted + text.slice(selectionEnd);
      const highlightStart = selectionStart + prefix.length;
      const highlightEnd = highlightStart + innerText.length;

      return {
        nextText,
        selectionStart: highlightStart,
        selectionEnd: highlightEnd,
      };
    });
  };

  const applyPmComposerColor = () => {
    const suggestedColor =
      currentUser.color && /^#[0-9a-f]{3,8}$/i.test(currentUser.color)
        ? currentUser.color
        : "#10b981";
    const pickedColor = window
      .prompt("اكتب لون HEX مثل #10b981 أو #0ea5e9", suggestedColor)
      ?.trim();

    if (!pickedColor) return;
    if (!/^#[0-9a-f]{3,8}$/i.test(pickedColor)) {
      alert("صيغة اللون غير صحيحة. استخدم مثال مثل #10b981");
      return;
    }

    wrapPmComposerSelection(
      `[color=${pickedColor}]`,
      "[/color]",
      "نص ملون",
    );
  };

  // Scroll logic
  useEffect(() => {
    if (isPostsRoom) {
      feedViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isPostsRoom, messages]);

  useEffect(() => {
    pmEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pmMessages]);

  // Call timer simulation
  useEffect(() => {
    let callTimer: any;
    if (isCalling) {
      callTimer = setInterval(() => {
        setCallingSeconds((prev) => prev + 1);
        // Randomize call visual waves
        setWaveHeights((prev) =>
          prev.map(() => Math.floor(Math.random() * 38) + 12),
        );
      }, 1000);
    }
    return () => clearInterval(callTimer);
  }, [isCalling]);

  // Simulated bot chat reactions
  const addBotSystemWarning = (roomId: string, text: string) => {
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const botWarningMsg: Message = {
      id: `guard-${Date.now()}`,
      author: "🛡️ بوت الحماية الذكي",
      text,
      color: "#a3e635",
      isOwn: false,
      time: timeStr,
      type: "system",
    };

    setRoomMessages((prev) => {
      const currentMsgs = prev[roomId] || [];
      return {
        ...prev,
        [roomId]: [...currentMsgs, botWarningMsg],
      };
    });
  };

  const addLammaBotMessage = (roomId: string, text: string) => {
    if (isBotSilent) return;
    const timeStr = new Date().toLocaleTimeString("ar-EG", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const botMsg: Message = {
      id: `lamma-bot-${Date.now()}-${Math.random()}`,
      author: "🤖 LAMMA SYSTEM",
      text,
      color: "#10b981",
      isOwn: false,
      time: timeStr,
      type: "system",
    };

    setRoomMessages((prev) => {
      const currentMsgs = prev[roomId] || [];
      return {
        ...prev,
        [roomId]: [...currentMsgs, botMsg],
      };
    });
  };

  const handleAccelerateDays = (days: number) => {
    const savedSub = localStorage.getItem(subscriptionStorageKey);
    if (!savedSub) {
      alert(
        "❌ لا يوجد اشتراك VIP نشط حالياً لتسريع عجلة الزمن عليه! يرجى شراء باقة VIP أولاً من واجهة المتجر.",
      );
      return;
    }

    try {
      const sub = JSON.parse(savedSub);
      if (!sub.isActive) {
        alert("❌ الاشتراك الحالي معطل أو منتهي بالفعل!");
        return;
      }

      // Physically advance time by making expiresAt closer (subtract days)
      const adjustedSub = {
        ...sub,
        expiresAt: sub.expiresAt - days * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(subscriptionStorageKey, JSON.stringify(adjustedSub));
      setSubscription(adjustedSub);

      addLammaBotMessage(
        activeRoomId || "room1",
        `⏳ تم تقديم الوقت بمقدار ${days} أيام على نظام متابعة الاشتراك لأغراض المراجعة.`,
      );
    } catch (e) {
      console.error(e);
    }
  };

  const { handleSendMessage } = useRoomComposer({
    activeRoomId,
    activeRoomName: systemRooms.find((r) => r.id === activeRoomId)?.name || activeRoomId,
    currentUser,
    inputText,
    isPostsRoom,
    canPublishPosts,
    isBotEnabled,
    botRuleAntiLinks,
    botRuleAntiSpam,
    botRuleSwearFilter,
    bannedWords,
    bannedUsersList,
    isMaintenanceMode,
    isGlobalMute,
    roomMessages,
    violationCount,
    myFingerprint,
    myBrowserSig,
    myIp,
    senderUid,
    ownerSettingsRowId: OWNER_SETTINGS_ROW_ID,
    rateLimitRef,
    setInputText,
    setShowEmojiPicker,
    setRoomMessages,
    setIsZenMode,
    setIsSidebarOpen,
    setIsCompactView,
    setBotLogs,
    setViolationCount,
    setBannedUsersList,
    addBotSystemWarning,
    addLammaBotMessage,
    addSystemActivityLog,
  });

  const handleSendPM = async () => {
    if (!pmTarget || !pmInputText.trim()) return;

    // Rate limiting: max 3 messages per second
    const now = Date.now();
    rateLimitRef.current = rateLimitRef.current.filter((t) => now - t < 1000);
    if (rateLimitRef.current.length >= 3) {
      alert(
        "⚠️ الرجاء الانتظار، لا يمكنك إرسال أكثر من 3 رسائل في الثانية الواحدة لحماية الشات من الإزعاج!",
      );
      return;
    }
    rateLimitRef.current.push(now);

    const targetNickname = pmTarget.nickname;
    const textToSend = pmInputText;
    const optimisticMessage = createOptimisticPmMessage(textToSend);

    // Optimistically update local UI state (will be merged with realtime database value)
    setPmThreads((prev) => ({
      ...prev,
      [targetNickname]: appendPmThreadMessage(
        prev[targetNickname] || [],
        optimisticMessage,
      ),
    }));
    setPmInputText("");

    try {
      await persistPrivateMessage({
        currentUser,
        targetNickname,
        text: textToSend,
        members: rawChatMembers,
      });
    } catch (error) {
      console.error("PM insert error:", error);
    }
  };

  const triggerGiftFlying = (icon: string) => {
    const normalizedRole = currentUser.role.toLowerCase();
    if (normalizedRole === "guest" || normalizedRole === "زائر") {
      alert(
        "👤 تنبيه العضوية: رتبة زائر غير مصرح لها بإرسال الهدايا المتقدمة والمكالمات الصوتية! يرجى التسجيل مجاناً (عبر البريد أو غوغل) للاستمتاع بالمزايا اللامحدودة! 💚",
      );
      return;
    }
    // Append message about gift inside room
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const newUuid = crypto.randomUUID();
    const newMessage: Message = {
      id: newUuid,
      author: currentUser.nickname,
      text: `أرسل هدية ${icon} في الغرفة 🎁`,
      color: currentUser.color,
      isOwn: true,
      time: timeStr,
      type: "gift",
      giftIcon: icon,
      giftName: "هدية تفاعلية",
    };

    setRoomMessages((prev) => {
      const currentMsgs = prev[activeRoomId] || [];
      return {
        ...prev,
        [activeRoomId]: [...currentMsgs, newMessage],
      };
    });

    if (supabase) {
      supabase
        .from("messages")
        .insert([
          {
            id: newUuid,
            room_id: activeRoomId,
            author: currentUser.nickname,
            text: `أرسل هدية ${icon} في الغرفة 🎁`,
            color: currentUser.color || "#10b981",
            type: "gift",
            gift_icon: icon,
            gift_name: "هدية تفاعلية",
            sender_uid: senderUid,
          },
        ])
        .then(({ error }) => {
          if (error) console.error("Error sending gift to Supabase:", error);
        });
    }

    // Animate multiple particles
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        setFlyingElements((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${i}`,
            char: icon,
            left: Math.random() * 80 + 10,
          },
        ]);
      }, i * 150);
    }
  };

  const sendMediaMessage = (
    type: "image" | "imageUrl" | "video" | "audio",
    mediaUrl: string,
  ) => {
    const finalType: "image" | "video" | "audio" =
      type === "imageUrl" ? "image" : type;
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    if (false) {
      const localMsg: Message = {
        id: "local-media-" + Date.now(),
        author: currentUser.nickname,
        text: "",
        color: currentUser.color || "#10b981",
        isOwn: true,
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
        type: finalType,
        mediaUrl: mediaUrl,
      };

      setRoomMessages((prev) => {
        const currentMsgs = prev[activeRoomId] || [];
        return {
          ...prev,
          [activeRoomId]: [...currentMsgs, localMsg],
        };
      });
      return;
    }

    const newUuid = crypto.randomUUID();
    const newMessage: Message = {
      id: newUuid,
      author: currentUser.nickname,
      text: "",
      color: currentUser.color,
      isOwn: true,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }),
      type: finalType,
      mediaUrl: mediaUrl,
    };
    const updatedMessages = [...(roomMessages[activeRoomId] || []), newMessage];
    setRoomMessages((prev) => ({
      ...prev,
      [activeRoomId]: updatedMessages,
    }));

    if (supabase) {
      supabase
        .from("messages")
        .insert([
          {
            id: newUuid,
            room_id: activeRoomId,
            author: currentUser.nickname,
            text: "",
            color: currentUser.color || "#10b981",
            type: finalType,
            media_url: mediaUrl,
            sender_uid: senderUid,
          },
        ])
        .then(({ error }) => {
          if (error) console.error("Error sending media to Supabase:", error);
        });
    }

    setShowAttachmentDropdown(false);
  };

  const uploadAndSendImage = async (file: File) => {
    if (!supabase) {
      alert("⚠️ Supabase غير متصل حالياً. راجع إعدادات المشروع.");
      return;
    }

    if (currentUser.authProvider !== "supabase") {
      alert("📸 رفع الصور متاح للحسابات المسجلة فقط. سجل دخول الأول.");
      return;
    }

    if (!canSendMediaByRate()) {
      alert("⏳ بعت وسائط كتير بسرعة. استنى دقيقة وجرب تاني.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("⚠️ الملف اللي اخترته مش صورة.");
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("⚠️ حجم الصورة كبير. الحد الأقصى 5MB.");
      return;
    }

    try {
      setIsUploadingImage(true);
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
      const objectPath = `rooms/${activeRoomId}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        alert(`❌ فشل رفع الصورة: ${uploadError.message}`);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(objectPath);

      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        alert("❌ حصل خطأ في توليد رابط الصورة بعد الرفع.");
        return;
      }

      sendMediaMessage("image", publicUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadAndSendImage(file);
  };

  const canSendMediaByRate = () => {
    const now = Date.now();
    const windowMs = 60_000;
    const max = 3;
    const arr = mediaRateStateRef.current.times.filter(
      (t) => now - t < windowMs,
    );
    if (arr.length >= max) return false;
    arr.push(now);
    mediaRateStateRef.current.times = arr;
    return true;
  };

  const designOwnerBgUploadRef = useRef<HTMLInputElement | null>(null);
  const designRoomBgUploadRef = useRef<HTMLInputElement | null>(null);
  const designLogoUploadRef = useRef<HTMLInputElement | null>(null);

  const uploadDesignAsset = async (file: File, folder: string) => {
    if (!supabase) {
      alert("⚠️ Supabase غير متصل حالياً. راجع إعدادات المشروع.");
      return null;
    }
    if (!isOwnerRole || currentUser.authProvider !== "supabase") {
      alert("⚠️ رفع ملفات التصميم متاح للمالك بحساب مسجل فقط.");
      return null;
    }
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const objectPath = `${folder}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("design-assets")
      .upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      alert(`❌ فشل رفع الملف: ${uploadError.message}`);
      return null;
    }
    const { data: publicData } = supabase.storage
      .from("design-assets")
      .getPublicUrl(objectPath);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      alert("❌ حصل خطأ في توليد رابط الملف بعد الرفع.");
      return null;
    }
    return publicUrl;
  };

  const handleDesignOwnerBgUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("⚠️ الملف اللي اخترته مش صورة.");
      return;
    }
    const url = await uploadDesignAsset(file, "backgrounds/global");
    if (!url) return;
    setOwnerBgImage(url);
  };

  const handleDesignRoomBgUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("⚠️ الملف اللي اخترته مش صورة.");
      return;
    }
    const url = await uploadDesignAsset(file, `backgrounds/rooms/${activeRoomId}`);
    if (!url) return;
    setRoomBgMap((prev) => ({ ...prev, [activeRoomId]: url }));
  };

  const handleDesignLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("⚠️ الملف اللي اخترته مش صورة.");
      return;
    }
    const url = await uploadDesignAsset(file, "logos");
    if (!url) return;
    setBrandLogoUrl(url);
  };

  const handlePmImageUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!canSendMediaByRate()) {
      alert("⏳ بعت وسائط كتير بسرعة. استنى دقيقة وجرب تاني.");
      return;
    }
    if (currentUser.authProvider !== "supabase") {
      alert("📸 رفع الصور متاح للحسابات المسجلة فقط. سجل دخول الأول.");
      return;
    }
    if (!supabase) {
      alert("⚠️ Supabase غير متصل حالياً. راجع إعدادات المشروع.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("⚠️ الملف اللي اخترته مش صورة.");
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("⚠️ حجم الصورة كبير. الحد الأقصى 5MB.");
      return;
    }
    try {
      setIsUploadingImage(true);
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
      const target =
        pmTarget?.nickname?.replace(/[^\w.\-]+/g, "_") || "unknown";
      const objectPath = `pm/${target}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        alert(`❌ فشل رفع الصورة: ${uploadError.message}`);
        return;
      }
      const { data: publicData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(objectPath);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        alert("❌ حصل خطأ في توليد رابط الصورة بعد الرفع.");
        return;
      }
      const timeStr = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
      if (!pmTarget) {
        alert("⚠️ اختر محادثة خاصة أولاً.");
        return;
      }
      const targetNickname = pmTarget.nickname;
      setPmThreads((prev) => ({
        ...prev,
        [targetNickname]: [
          ...(prev[targetNickname] || []),
          {
            text: "",
            isOwn: true,
            time: timeStr,
            mediaUrl: publicUrl,
            type: "image",
            status: "delivered",
          },
        ],
      }));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSendAttachment = (
    type: "image" | "imageUrl" | "video" | "audio",
  ) => {
    const isOwnerOrAdmin =
      currentUser.role === "owner" || currentUser.role === "admin";
    const isVIP =
      currentUser.role === "vip" ||
      currentUser.role === "platinum_vip" ||
      currentUser.role === "mod";

    if (type === "audio") {
      const isOwner = currentUser.role === "owner";
      const perm =
        memberCustomPermissions[currentUser.nickname]?.recordingAllowed;
      if (!isOwner && !perm) {
        alert(
          "⚠️ عذراً: ميزة تسجيل وإرسال الرسائل الصوتية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 🎙️",
        );
        return;
      }
    }

    if (type === "audio" && isGlobalMicMute && !isOwnerOrAdmin) {
      alert(
        "🎙️ الميكروفونات مقفلة: لقد قامت الإدارة بإغلاق الميكروفونات العامة، والحديث الفوري متاح للمدراء والملاك فقط.",
      );
      return;
    }

    if (isOnlyVIPCanSendImages && !isOwnerOrAdmin && !isVIP) {
      alert(
        "📸 عذراً: لقد قامت الإدارة بتفعيل وضع حصر الوسائط، بحيث لا يمكن إلا للأعضاء أصحاب رتبة VIP أو الإداريين مشاركة الصور والوسائط مجرياً.",
      );
      setShowAttachmentDropdown(false);
      return;
    }

    let mediaUrl = "";
    if (type === "image") {
      if (isUploadingImage) return;
      if (currentUser.authProvider !== "supabase") {
        alert("📸 رفع الصور متاح للحسابات المسجلة فقط. سجل دخول الأول.");
        setShowAttachmentDropdown(false);
        return;
      }
      if (!supabase) {
        alert("⚠️ Supabase غير متصل حالياً. راجع إعدادات المشروع.");
        setShowAttachmentDropdown(false);
        return;
      }
      setShowAttachmentDropdown(false);
      imageUploadInputRef.current?.click();
      return;
    }
    if (type === "imageUrl") {
      const inputUrl = prompt(
        "🔗 أدخل رابط صورة (jpg/png/webp/gif) لمشاركتها في الغرفة:",
      );
      if (inputUrl === null) {
        setShowAttachmentDropdown(false);
        return;
      }
      const trimmed = inputUrl.trim();
      if (!trimmed) {
        setShowAttachmentDropdown(false);
        return;
      }
      mediaUrl = trimmed;
      setShowAttachmentDropdown(false);
    }
    if (type === "video") {
      const inputUrl = prompt(
        "🎥 أدخل رابط مقطع يوتيوب أو فيديو مباشر (MP4, WEBM) لمشاركته:\n(اضغط موافق فارغاً لعرض فيديو افتراضي رائع)",
      );
      if (inputUrl === null) {
        setShowAttachmentDropdown(false);
        return;
      }
      mediaUrl =
        inputUrl.trim() !== ""
          ? inputUrl.trim()
          : "https://assets.mixkit.co/videos/preview/mixkit-matrix-style-code-screen-background-simulation-33306-large.mp4";
    }
    if (type === "audio") {
      const inputUrl = prompt(
        "🎙️ أدخل رابط ملف الصوت المباشر (MP3) لمشاركته:\n(اضغط موافق فارغاً لعرض ملف صوت كلاسيكي تجريبي)",
      );
      if (inputUrl === null) {
        setShowAttachmentDropdown(false);
        return;
      }
      mediaUrl =
        inputUrl.trim() !== ""
          ? inputUrl.trim()
          : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }
    sendMediaMessage(type, mediaUrl);
  };

  const formatSecs = (total: number) => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (isCurrentlyBanned) {
    return (
      <div className="fixed inset-0 bg-[#060a08] flex flex-col items-center justify-center p-6 text-center select-none z-[9999]">
        <div className="w-full max-w-lg p-8 bg-black/80 border border-red-500/20 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.2)] space-y-6">
          <div className="flex justify-center animate-pulse">
            <div className="w-20 h-20 bg-red-500/15 hover:bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 text-5xl">
              🛑
            </div>
          </div>
          <div className="space-y-2 text-right" dir="rtl">
            <h1 className="text-[18px] font-black text-white font-sans text-right">
              جدار الحظر الكلي والكامل • MEGA BAN INSTANT LOCKOUT
            </h1>
            <p className="text-xs text-red-400 font-sans leading-relaxed text-right">
              عذراً! لقد تم إقفال صلاحية وصولك وتجميد رخصتكم من خادم شات لمة
              بالكامل لمخالفة المعايير العامة للتطبيق وتكرار التعديات والسبام
              الهجومي.
            </p>
          </div>

          <div
            className="p-4 bg-black/50 rounded-2xl border border-white/5 text-[11px] space-y-2 text-right"
            dir="rtl"
          >
            <div>
              <span className="text-gray-400 font-bold">اسم المستخدم:</span>{" "}
              <span className="text-white font-mono">
                {banDetails?.nickname}
              </span>
            </div>
            {banDetails?.email && (
              <div>
                <span className="text-gray-400 font-bold">
                  البريد الإلكتروني:
                </span>{" "}
                <span className="text-white font-mono">
                  {banDetails?.email}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-400 font-bold">
                بصمة الجهاز الفنية:
              </span>{" "}
              <span className="text-red-400 font-mono text-[9px]">
                {banDetails?.fingerprint}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">
                عنوان الـ IP المميز:
              </span>{" "}
              <span className="text-red-400 font-mono">{banDetails?.ip}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">تاريخ ونوع الحظر:</span>{" "}
              <span className="text-yellow-500 font-bold">
                {banDetails?.type === "megaban"
                  ? "🛑 حظر غرامات كبرى (Mega Ban)"
                  : "🚫 حظر معايير"}{" "}
                ({banDetails?.time})
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">المشرف المسؤول:</span>{" "}
              <span className="text-green-400 font-bold">
                {banDetails?.banner}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">
                سبب الإيقاف القانوني:
              </span>{" "}
              <span className="text-gray-200">{banDetails?.reason}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                localStorage.removeItem("lamma_banned_list");
                location.reload();
              }}
              className="flex-1 py-3 text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              🔄 إعادة التحقق الأمني
            </button>
            <button
              onClick={() => onLogout()}
              className="flex-1 py-3 text-[10px] font-black bg-red-600/15 hover:bg-red-600/25 text-red-400 rounded-xl border border-red-500/25 transition-all cursor-pointer"
            >
              🚪 تسجيل خروج وحذف الجلسة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      // Keep the current shipped chat skin stable. The neutral glass layer
      // is the authoritative visual wrapper for the production chat design.
      className="fixed inset-0 h-screen w-full flex flex-col overflow-hidden font-sans text-[color:var(--text-primary)] lamma-fire-frame lamma-fire-frame-app lamma-neutral-glass"
      dir="rtl"
      data-lamma-wall={wallTheme}
      data-clear-bg={isDefaultAmbientBg ? "true" : "false"}
      data-reading-mode={readingMode ? "true" : "false"}
      data-chat-theme={chatTheme}
    >
      {activeRoomBg ? (
        <>
          <div
            className="absolute inset-0 z-0 pointer-events-none lamma-active-wallpaper"
            style={{
              backgroundImage: `url(${activeRoomBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              transform: "scale(1)",
              filter:
                activeRoomBg === "/bg.jpg" || activeRoomBg === "/MAN.png"
                  ? "none"
                  : chatThemeAmbientStyles[chatTheme]?.imageFilter || "none",
            }}
          />
          {isDefaultAmbientBg ? (
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                backgroundImage: `url(${activeRoomBg})`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
                opacity: 0,
                filter: "none",
                transform: "scale(1)",
              }}
            />
          ) : null}
          {isDefaultAmbientBg ? (
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                background:
                  activeRoomBg === "/bg.jpg" || activeRoomBg === "/MAN.png"
                    ? "transparent"
                    : chatThemeAmbientStyles[chatTheme]?.overlay ||
                      "transparent",
              }}
            />
          ) : null}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background: isDefaultAmbientBg
                ? "none"
                : "radial-gradient(ellipse at center top, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.012) 34%, transparent 68%), radial-gradient(ellipse at center bottom, rgba(255, 151, 73, 0.035) 0%, rgba(255, 255, 255, 0.012) 34%, transparent 76%), linear-gradient(180deg, rgba(3, 8, 10, 0.06) 0%, rgba(3, 8, 10, 0.01) 24%, rgba(3, 7, 9, 0.08) 100%)",
            }}
          />
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background: isDefaultAmbientBg
                ? "none"
                : "radial-gradient(circle at 60% 20%, rgba(255, 255, 255, 0.01), transparent 18%), radial-gradient(circle at 52% 82%, rgba(148, 163, 184, 0.006), transparent 24%)",
            }}
          />
          {!isDefaultAmbientBg && activeRoomBg !== "/bg.jpg" && activeRoomBg !== "/MAN.png" ? (
            <div className="absolute inset-0 bg-[rgba(4,8,10,0.035)] z-0 pointer-events-none" />
          ) : null}
        </>
      ) : null}
      {/* Background radial soft light particles */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: isDefaultAmbientBg
            ? "none"
            : `radial-gradient(circle at center, ${hexToRgba(glowColor, 0.008)}, transparent 76%)`,
        }}
      />

      {/* Floating particles animations block */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[9999]">
        <AnimatePresence>
          {flyingElements.map((item) => (
            <motion.div
              key={item.id}
              initial={{ y: "110vh", opacity: 1, scale: 0.8 }}
              animate={{ y: "-10vh", opacity: 0, scale: 1.5, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 4, ease: "easeOut" }}
              onAnimationComplete={() => {
                setFlyingElements((prev) =>
                  prev.filter((f) => f.id !== item.id),
                );
              }}
              className="absolute text-5xl select-none"
              style={{ left: `${item.left}%` }}
            >
              {item.char}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ================= HEADER BAR ================= */}
      {!isZenMode && (
        <header className="lamma-header px-2 sm:px-4 md:px-6 flex items-center justify-between relative z-20 shrink-0">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <img
              src={brandLogoUrl || "/images/lamma-wordmark.svg"}
              alt="LAMMA CHAT"
              className="h-4 sm:h-5 opacity-55 object-contain"
            />
          </div>
          {/* Right side controls (User account & actions - Now in the visual start "اول الصفحة" due to RTL) */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* User badge */}
            <div
              className={`flex items-center gap-2 select-none max-w-[58vw] sm:max-w-none lamma-header-rail lamma-header-user-rail ${
                isOwnerRole ? "cursor-pointer" : ""
              }`}
              onClick={() => {
                if (!isOwnerRole) return;
                setLeadershipTab("quick");
                openModal("leadership");
              }}
            >
              <div className="relative shrink-0">
                <div
                  className={`p-[2px] rounded-full ${
                    myActiveSession.frame
                      ? `bg-gradient-to-r ${myActiveSession.frame}`
                      : "bg-gradient-to-r from-yellow-500/50 via-orange-500/35 to-yellow-500/50"
                  }`}
                  style={{
                    boxShadow:
                      "0 0 18px rgba(var(--lamma-wall-r), var(--lamma-wall-g), var(--lamma-wall-b), 0.20)",
                  }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] overflow-hidden lamma-admin-card">
                    {myActiveSession.avatar || "👤"}
                  </div>
                </div>
                {(myVisualRole === "owner" ||
                  myVisualRole === "admin" ||
                  myVisualRole === "vip" ||
                  myVisualRole === "platinum_vip") && (
                  <div
                    className={`absolute -top-0.5 left-1/2 -translate-x-1/2 lamma-prestige-seal ${
                      myVisualRole === "admin"
                        ? "lamma-prestige-admin"
                        : myVisualRole === "vip"
                          ? "lamma-prestige-vip"
                          : myVisualRole === "platinum_vip"
                            ? "lamma-prestige-plat"
                            : "lamma-prestige-owner"
                    }`}
                    aria-hidden="true"
                  >
                    <Crown size={8} strokeWidth={2.2} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span
                  className={`text-[11px] font-black flex items-center gap-1 truncate max-w-[45vw] sm:max-w-none ${myVisualRole === "platinum_vip" ? "animate-[pulse_1.5s_infinite] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 font-extrabold" : ""}`}
                  style={{
                    color:
                      myVisualRole === "platinum_vip"
                        ? undefined
                        : myActiveSession.color,
                  }}
                >
                  {myActiveSession.nickname}
                  {myVisualRole === "owner" && (
                    <BossSigil size={13} className="opacity-95" />
                  )}
                  {activeTempEntryTopic && (
                    <span className="max-w-[120px] truncate rounded-full border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-[7px] text-cyan-200">
                      {activeTempEntryTopic}
                    </span>
                  )}
                  {myActiveSession.badge && (
                    <span className="text-[7px] lamma-badge-chip">
                      {myActiveSession.badge}
                    </span>
                  )}
                </span>
                <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1">
                    {myVisualRole === "platinum_vip" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-plat">
                        PLATINUM VIP
                      </span>
                    ) : myVisualRole === "vip" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-vip">
                        VIP
                      </span>
                    ) : myVisualRole === "owner" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-owner">
                        OWNER
                      </span>
                    ) : myVisualRole === "admin" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-admin">
                        ADMIN
                      </span>
                    ) : null}
                    {myActiveSession.title && (
                      <span className="text-[8px] lamma-title-chip">
                        [{myActiveSession.title}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Icons bar under the name and role */}
                <div
                  className="flex items-center gap-1 mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Rooms selector button */}
                  <div className="relative dropdown-container flex items-center xl:hidden">
                    <HeaderIconButton
                      title="كل الغرف"
                      onClick={() => {
                        toggleDropdown("rooms" as any);
                        if (isSidebarOpen && activeSidebarTab === "rooms") {
                          setIsSidebarOpen(false);
                        } else {
                          setIsSidebarOpen(true);
                          setActiveSidebarTab("rooms");
                        }
                      }}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${isSidebarOpen && activeSidebarTab === "rooms" ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                    >
                      <Compass size={10} strokeWidth={2.2} />
                    </HeaderIconButton>
                  </div>

                  {/* Members selector button */}
                  <div className="relative dropdown-container flex items-center xl:hidden">
                    <HeaderIconButton
                      title="المتصلون"
                      onClick={() => {
                        toggleDropdown("members" as any);
                        if (isSidebarOpen && activeSidebarTab === "members") {
                          setIsSidebarOpen(false);
                        } else {
                          setIsSidebarOpen(true);
                          setActiveSidebarTab("members");
                        }
                      }}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${isSidebarOpen && activeSidebarTab === "members" ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                    >
                      <Users size={10} />
                      <span className="absolute -top-0.5 -right-0.5 lamma-icon-dot"></span>
                    </HeaderIconButton>
                  </div>

                  {isOwnerRole && (
                    <div className="relative dropdown-container flex items-center">
                      <HeaderIconButton
                        title="غرفة القيادة"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeadershipTab("quick");
                          openModal("leadership");
                        }}
                        className="flex items-center justify-center transition-colors relative cursor-pointer text-yellow-400 lamma-toolbar-btn lamma-header-mini-btn"
                      >
                        <Crown size={10} />
                      </HeaderIconButton>
                    </div>
                  )}

                  {/* Master Settings Dropdown container inline */}
                  <div className="relative dropdown-container flex items-center">
                    <HeaderIconButton
                      title="القائمة والإعدادات"
                      onClick={() => toggleDropdown("headerMenu")}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${showHeaderMenu ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                    >
                      <SettingsIcon size={10} />
                    </HeaderIconButton>
                    <AnimatePresence>
                      {showHeaderMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="hidden md:flex fixed top-20 right-4 md:right-10 w-[240px] rounded-2xl z-[99] flex-col pb-1 lamma-popover-shell"
                        >
                          <div className="flex items-center justify-between p-2.5 lamma-feature-header cursor-grab active:cursor-grabbing">
                            <div className="flex items-center gap-2 pointer-events-none">
                              <SettingsIcon
                                size={14}
                                className="text-gray-400"
                              />
                              <h3 className="font-black text-white text-xs">
                                القائمة الرئيسية
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeFloatingUi();
                              }}
                              className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer relative z-50 lamma-feature-action"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <div className="flex-col flex pt-1 w-full relative z-40">
                            <button
                              onClick={() => {
                                setIsCompactView(!isCompactView);
                                setShowHeaderMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                            >
                              <Grid
                                size={16}
                                className={
                                  isCompactView ? "text-green-400" : ""
                                }
                              />
                              <span>
                                {isCompactView
                                  ? "إلغاء العرض المدمج"
                                  : "العرض المدمج للرسائل"}
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setIsZenMode(true);
                                setIsSidebarOpen(false);
                                setIsPmOpen(false);
                                setShowHeaderMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                            >
                              <Sparkles size={16} className="text-violet-300" />
                              <span>وضع التركيز (Zen)</span>
                            </button>
                            <button
                              onClick={() => {
                                handleCopyLink();
                                setShowHeaderMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                            >
                              <Share2 size={16} />
                              <span>دعوة الأصدقاء</span>
                            </button>
                            <div className="h-[1px] bg-white/5 my-1" />
                            <button
                              onClick={() => {
                                handleInitiateLogout();
                                setShowHeaderMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all text-sm w-full text-right font-bold cursor-pointer"
                            >
                              <LogOut size={16} />
                              <span>تسجيل الخروج</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <MobileBottomSheet
                    isOpen={showHeaderMenu}
                    onClose={closeFloatingUi}
                    title="القائمة الرئيسية"
                    icon={<SettingsIcon size={14} className="text-gray-400" />}
                  >
                    <div className="flex-col flex pt-1 w-full">
                      <button
                        onClick={() => {
                          setIsCompactView(!isCompactView);
                          setShowHeaderMenu(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                      >
                        <Grid
                          size={16}
                          className={isCompactView ? "text-green-400" : ""}
                        />
                        <span>
                          {isCompactView
                            ? "إلغاء العرض المدمج"
                            : "العرض المدمج للرسائل"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setIsZenMode(true);
                          setIsSidebarOpen(false);
                          setIsPmOpen(false);
                          setShowHeaderMenu(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                      >
                        <Sparkles size={16} className="text-violet-300" />
                        <span>وضع التركيز (Zen)</span>
                      </button>
                      <button
                        onClick={() => {
                          handleCopyLink();
                          setShowHeaderMenu(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                      >
                        <Share2 size={16} />
                        <span>دعوة الأصدقاء</span>
                      </button>
                      <div className="h-[1px] bg-white/5 my-1" />
                      <button
                        onClick={() => {
                          handleInitiateLogout();
                          setShowHeaderMenu(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all text-sm w-full text-right font-bold cursor-pointer rounded-xl"
                      >
                        <LogOut size={16} />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </MobileBottomSheet>

                  {/* Inline PM Dropdown Container */}
                  <div className="relative dropdown-container flex items-center">
                    <HeaderIconButton
                      title="الرسائل الخاصة"
                      onClick={() => toggleDropdown("pmList")}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${showPmListDropdown ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                    >
                      <MessageCircle size={11} strokeWidth={2.2} />
                      {Object.keys(pmThreads).length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black/60 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.14)]"></span>
                      )}
                    </HeaderIconButton>

                    <AnimatePresence>
                      {showPmListDropdown && (
                        <motion.div
                          drag
                          dragConstraints={{
                            left: -300,
                            right: 300,
                            top: -50,
                            bottom: 500,
                          }}
                          dragMomentum={false}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="hidden md:flex fixed top-20 left-4 md:left-auto md:right-1/4 w-[280px] rounded-2xl z-[99] flex-col lamma-popover-shell"
                          style={{
                            resize: "both",
                            overflow: "hidden",
                            minWidth: "250px",
                            minHeight: "250px",
                            maxWidth: "90vw",
                            maxHeight: "80vh",
                          }}
                        >
                          <div className="flex items-center justify-between p-3 lamma-feature-header cursor-grab active:cursor-grabbing">
                            <div className="flex items-center gap-2 pointer-events-none">
                              <MessageCircle
                                size={16}
                                className="text-[rgb(148,163,184)]"
                              />
                              <h3 className="font-black text-white text-sm">
                                المحادثات الخاصة
                              </h3>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPmListDropdown(false);
                              }}
                              className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer z-50 relative lamma-feature-action"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="p-3 bg-transparent text-right space-y-2 flex-1 overflow-y-auto w-full h-full">
                            {Object.keys(pmThreads).length === 0 ? (
                              <p className="text-[11px] text-gray-400 font-bold text-center py-4">
                                لا توجد محادثات الخاصة بعد.
                              </p>
                            ) : (
                              Object.keys(pmThreads).map((nickname) => {
                                const lastMsg =
                                  pmThreads[nickname]?.[
                                    pmThreads[nickname].length - 1
                                  ];
                                const targetUser = chatMembers.find(
                                  (m) => m.nickname === nickname,
                                ) || { nickname, color: "#a3e635" };
                                return (
                                  <div
                                    key={nickname}
                                    onClick={() => {
                                      setPmTarget({
                                        nickname: targetUser.nickname,
                                        role: normalizePmRole(
                                          (targetUser as any).role,
                                        ),
                                        avatar:
                                          (targetUser as any).avatar || "👤",
                                      });
                                      if (window.innerWidth < 1280)
                                        setMobileTab("private");
                                      else setIsPmOpen(true);
                                      setShowPmListDropdown(false);
                                    }}
                                    className="p-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer relative z-40 lamma-list-item"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xl overflow-hidden shadow-inner relative pointer-events-none">
                                      <User
                                        size={16}
                                        className="text-gray-400"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0 pointer-events-none">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4
                                            className="text-[12px] font-black"
                                            style={{
                                              color: targetUser.color || "#fff",
                                            }}
                                          >
                                            {nickname}
                                          </h4>
                                          {(targetUser as any).role ===
                                            "platinum_vip" && (
                                            <span className="text-[6px] lamma-role-chip lamma-role-plat">
                                              PLATINUM VIP
                                            </span>
                                          )}
                                          {(targetUser as any).role ===
                                            "vip" && (
                                            <span className="text-[6px] lamma-role-chip lamma-role-vip">
                                              VIP
                                            </span>
                                          )}
                                          {(targetUser as any).role ===
                                            "admin" && (
                                            <span className="text-[6px] lamma-role-chip lamma-role-admin">
                                              ADMIN
                                            </span>
                                          )}
                                          {(targetUser as any).role ===
                                            "owner" && (
                                            <span className="text-[6px] lamma-role-chip lamma-role-owner">
                                              OWNER
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[9px] text-gray-500">
                                          {lastMsg?.time || ""}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                        {lastMsg?.isOwn
                                          ? `أنت: ${lastMsg.text}`
                                          : lastMsg?.text}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <MobileBottomSheet
                    isOpen={showPmListDropdown}
                    onClose={() => setShowPmListDropdown(false)}
                    title="المحادثات الخاصة"
                    icon={
                      <MessageCircle
                        size={16}
                        className="text-[rgb(148,163,184)]"
                      />
                    }
                  >
                    <div className="bg-transparent text-right space-y-2">
                      {Object.keys(pmThreads).length === 0 ? (
                        <p className="text-[11px] text-gray-400 font-bold text-center py-4">
                          لا توجد محادثات الخاصة بعد.
                        </p>
                      ) : (
                        Object.keys(pmThreads).map((nickname) => {
                          const lastMsg =
                            pmThreads[nickname]?.[
                              pmThreads[nickname].length - 1
                            ];
                          const targetUser = chatMembers.find(
                            (m) => m.nickname === nickname,
                          ) || { nickname, color: "#a3e635" };
                          return (
                            <div
                              key={nickname}
                              onClick={() => {
                                setPmTarget({
                                  nickname: targetUser.nickname,
                                  role: normalizePmRole(
                                    (targetUser as any).role,
                                  ),
                                  avatar: (targetUser as any).avatar || "👤",
                                });
                                if (window.innerWidth < 1280)
                                  setMobileTab("private");
                                else setIsPmOpen(true);
                                setShowPmListDropdown(false);
                              }}
                              className="p-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer lamma-list-item"
                            >
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xl overflow-hidden shadow-inner relative pointer-events-none">
                                <User size={16} className="text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0 pointer-events-none">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4
                                      className="text-[12px] font-black"
                                      style={{
                                        color: targetUser.color || "#fff",
                                      }}
                                    >
                                      {nickname}
                                    </h4>
                                    {(targetUser as any).role ===
                                      "platinum_vip" && (
                                      <span className="text-[6px] lamma-role-chip lamma-role-plat">
                                        PLATINUM VIP
                                      </span>
                                    )}
                                    {(targetUser as any).role === "vip" && (
                                      <span className="text-[6px] lamma-role-chip lamma-role-vip">
                                        VIP
                                      </span>
                                    )}
                                    {(targetUser as any).role === "admin" && (
                                      <span className="text-[6px] lamma-role-chip lamma-role-admin">
                                        ADMIN
                                      </span>
                                    )}
                                    {(targetUser as any).role === "owner" && (
                                      <span className="text-[6px] lamma-role-chip lamma-role-owner">
                                        OWNER
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-gray-500">
                                    {lastMsg?.time || ""}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                  {lastMsg?.isOwn
                                    ? `أنت: ${lastMsg.text}`
                                    : lastMsg?.text}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </MobileBottomSheet>

                  {/* Inline Notifications Dropdown Container */}
                  <div className="relative dropdown-container flex items-center">
                    <HeaderIconButton
                      title="الإشعارات"
                      onClick={() => toggleDropdown("notifications")}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer ml-1 sm:ml-2 lamma-header-mini-btn ${showNotificationsDropdown ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                    >
                      <Bell size={11} strokeWidth={2.2} />
                      {unreadNotificationsCount > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 text-[8px] font-mono lamma-notify-pill">
                          {unreadNotificationsCount > 9
                            ? "9+"
                            : unreadNotificationsCount}
                        </span>
                      ) : (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black/60 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.14)]"></span>
                      )}
                    </HeaderIconButton>

                    <AnimatePresence>
                      {showNotificationsDropdown && (
                        <motion.div
                          drag
                          dragConstraints={{
                            left: -300,
                            right: 300,
                            top: -50,
                            bottom: 500,
                          }}
                          dragMomentum={false}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="hidden md:flex fixed top-20 left-4 md:left-auto md:right-1/3 w-[280px] sm:w-[320px] rounded-2xl z-[99] flex-col lamma-popover-shell"
                          style={{
                            resize: "both",
                            overflow: "hidden",
                            minWidth: "250px",
                            minHeight: "250px",
                            maxWidth: "90vw",
                            maxHeight: "80vh",
                          }}
                        >
                          <div className="flex items-center justify-between p-3 lamma-feature-header cursor-grab active:cursor-grabbing">
                            <div className="flex items-center gap-2 pointer-events-none">
                              <Bell
                                size={16}
                                className="text-[rgb(148,163,184)]"
                              />
                              <h3 className="font-black text-white text-sm">
                                مركز الإشعارات
                              </h3>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowNotificationsDropdown(false);
                              }}
                              className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer z-50 relative lamma-feature-action"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="p-3 bg-transparent text-right space-y-2 flex-1 overflow-y-auto w-full h-full">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <p className="text-[11px] text-gray-400 font-bold">
                                أحدث الإشعارات والرسائل.
                              </p>
                              <div className="flex items-center gap-1.5">
                                {unreadNotificationsCount > 0 && (
                                  <span className="text-[8px] px-1.5 py-0.5 font-mono lamma-notify-pill">
                                    {unreadNotificationsCount} جديد
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotifications((prevN) => {
                                      const next = prevN.map((n) => ({
                                        ...n,
                                        read: true,
                                      }));
                                      try {
                                        localStorage.setItem(
                                          "lamma_notifications",
                                          JSON.stringify(next),
                                        );
                                      } catch (err) {
                                        // ignore
                                      }
                                      return next;
                                    });
                                  }}
                                  className="text-[9px] text-gray-300 hover:text-white px-2 py-0.5 rounded cursor-pointer relative z-50 lamma-soft-action"
                                >
                                  تحديد الكل كمقروء
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotifications([]);
                                    try {
                                      localStorage.removeItem(
                                        "lamma_notifications",
                                      );
                                    } catch (err) {
                                      // ignore
                                    }
                                  }}
                                  className="text-[9px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded cursor-pointer relative z-50 lamma-soft-action"
                                >
                                  مسح الكل
                                </button>
                              </div>
                            </div>

                            {notifications.length === 0 ? (
                              <div className="p-6 text-center text-[11px] text-gray-500">
                                مفيش إشعارات لسه 💤
                              </div>
                            ) : (
                              <div className="grid gap-2">
                                {notifications.map((n) => (
                                  <div
                                    key={n.id}
                                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 relative z-40 cursor-pointer lamma-notification-card ${
                                      n.read
                                        ? "opacity-75"
                                        : "lamma-notification-card-unread"
                                    }`}
                                    onClick={() => {
                                      setNotifications((prevN) => {
                                        const next = prevN.map((x) =>
                                          x.id === n.id
                                            ? { ...x, read: true }
                                            : x,
                                        );
                                        try {
                                          localStorage.setItem(
                                            "lamma_notifications",
                                            JSON.stringify(next),
                                          );
                                        } catch (err) {
                                          // ignore
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        n.kind === "mention"
                                          ? "bg-yellow-500/20 text-yellow-400"
                                          : n.kind === "pm"
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "bg-green-500/20 text-green-400"
                                      }`}
                                    >
                                      <Bell size={12} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-[11px] font-black text-white truncate">
                                        {n.title}
                                      </h4>
                                      <p className="text-[9px] text-gray-400 mt-0.5 break-words">
                                        {n.body}
                                      </p>
                                      <span className="text-[8px] text-gray-500 font-mono mt-1 block">
                                        {new Date(n.at).toLocaleString(
                                          "ar-EG",
                                          {
                                            hour: "numeric",
                                            minute: "numeric",
                                            day: "2-digit",
                                            month: "2-digit",
                                          },
                                        )}
                                      </span>
                                    </div>
                                    {!n.read && (
                                      <span className="w-2 h-2 rounded-full bg-red-500/90 mt-1.5 flex-shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <MobileBottomSheet
                    isOpen={showNotificationsDropdown}
                    onClose={() => setShowNotificationsDropdown(false)}
                    title="مركز الإشعارات"
                    icon={
                      <Bell size={16} className="text-[rgb(148,163,184)]" />
                    }
                  >
                    <div className="bg-transparent text-right space-y-2">
                      <p className="text-[11px] text-gray-400 font-bold border-b border-white/5 pb-2">
                        أحدث التنبيهات والأحداث الخاصة بك في البرنامج.
                      </p>

                      <div className="grid gap-2">
                        {/* Fake notifications removed to avoid confusion */}
                      </div>
                    </div>
                  </MobileBottomSheet>
                </div>
              </div>
            </div>
          </div>

          {/* Center welcome moved into header wordmark container */}

          {/* Left indicators (Branding and Home button - Now visually on the left side) */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center h-full lamma-header-rail lamma-header-brand-rail">
              <div className="text-[13px] sm:text-[14px] font-black text-white leading-none mb-0.5 w-full text-center pl-1 translate-y-1 lamma-header-wordmark">
                LAMMA CHAT
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-[11px] sm:text-[12px] font-extrabold text-green-400 mb-0.5">
                    اللمة تحلى
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">
                    بالصحبة الأحلى
                  </span>
                </div>
                <button
                  className="transition-transform hover:scale-105 active:scale-95 cursor-pointer object-contain flex items-center justify-center lamma-brand-mark"
                  title="الرئيسية"
                  onClick={() => window.location.reload()}
                >
                  <AMLogo
                    size={44}
                    variant="circular"
                    glow={true}
                    crown={true}
                  />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Mobile panel toggler header bar (Visible only on compact screens) */}
      {!isZenMode && (
        <div className="md:hidden grid grid-cols-3 text-[10px] font-black text-center select-none z-10 relative shrink-0 tracking-wider overflow-hidden lamma-mobile-tabs">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#040605] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#040605] to-transparent pointer-events-none" />
          <button
            onClick={() => {
              setMobileTab("chat");
              setIsSidebarOpen(false);
            }}
            className={`py-2.5 flex items-center justify-center gap-1.5 transition-all lamma-mobile-tab-btn ${mobileTab === "chat" ? "lamma-mobile-tab-btn-active" : "text-gray-400"}`}
          >
            <Flame size={13} strokeWidth={2.2} /> العام
          </button>
          <button
            onClick={() => {
              setMobileTab("members");
              setActiveSidebarTab("members");
              setIsSidebarOpen(true);
            }}
            className={`py-2.5 flex items-center justify-center gap-1.5 transition-all lamma-mobile-tab-btn ${mobileTab === "members" ? "lamma-mobile-tab-btn-active" : "text-gray-400"}`}
          >
            <Users size={13} strokeWidth={2.2} /> المتصلين
          </button>
          <button
            onClick={() => {
              setMobileTab("private");
              setIsSidebarOpen(false);
            }}
            className={`py-2.5 relative flex items-center justify-center gap-1.5 transition-all lamma-mobile-tab-btn ${mobileTab === "private" ? "lamma-mobile-tab-btn-active" : "text-gray-400"}`}
          >
            <MessageCircle size={13} strokeWidth={2.2} /> الخاص
            {Object.keys(pmThreads).length > 0 && (
              <span className="absolute top-[8px] right-[25%] w-2.5 h-2.5 rounded-full bg-red-500/90 border border-black" />
            )}
          </button>
        </div>
      )}

      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:scale-110 transition-all lamma-soft-action"
          title="إنهاء وضع التركيز"
        >
          <X size={18} />
        </button>
      )}

      {/* ================= FOUR-PANEL BODY ================= */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {!isZenMode && (
          <button
            type="button"
            onClick={() => setIsLeftColumnCollapsed((v) => !v)}
            className="hidden xl:flex absolute left-0 top-1/2 -translate-y-1/2 z-40 h-16 w-7 items-center justify-center rounded-r-xl bg-black/35 border border-green-500/10 text-gray-300 hover:text-white hover:bg-black/55 transition-all cursor-pointer lamma-fire-border"
            title={isLeftColumnCollapsed ? "إظهار العمود" : "إخفاء العمود"}
          >
            {isLeftColumnCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        )}

        {!isZenMode && (
          <button
            type="button"
            onClick={() => setIsRightColumnCollapsed((v) => !v)}
            className="hidden xl:flex absolute right-0 top-1/2 -translate-y-1/2 z-40 h-16 w-7 items-center justify-center rounded-l-xl bg-black/35 border border-green-500/10 text-gray-300 hover:text-white hover:bg-black/55 transition-all cursor-pointer lamma-fire-border"
            title={isRightColumnCollapsed ? "إظهار العمود" : "إخفاء العمود"}
          >
            {isRightColumnCollapsed ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        )}

        <aside
          className={`hidden xl:flex xl:order-3 flex-col overflow-hidden backdrop-blur-xl transition-all duration-300 ${
            isLeftColumnCollapsed
              ? "w-0 p-0 opacity-0 pointer-events-none border-none"
              : "w-[300px] 2xl:w-[340px] px-1 pt-0 pb-0 opacity-100 border-r border-white/8 lamma-column-frame lamma-column-shell lamma-side-column"
          }`}
        >
          <div
            ref={leftColumnLayoutRef}
            className="flex-1 min-h-0 grid gap-0"
            style={{
              gridTemplateRows: `${leftColumnSectionsPct.store}fr 12px ${leftColumnSectionsPct.radio}fr 12px ${leftColumnSectionsPct.music}fr`,
            }}
          >
            <div className="min-h-0">
              <div className="lamma-glass rounded-3xl p-4 lamma-soft-glow overflow-hidden h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-[12px] font-black text-[color:var(--accent-secondary)]">
                      VIP GOLD
                    </div>
                    <div className="text-[10px] text-[color:var(--text-secondary)] font-bold mt-1">
                      خصم محدود على الباقات
                    </div>
                  </div>
                  <div className="text-3xl">👑</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openModal("store")}
                    className="flex-1 py-2 rounded-xl bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.25)] text-[color:var(--accent-primary)] text-[11px] font-black hover:bg-[rgba(16,185,129,0.18)] transition-all cursor-pointer"
                  >
                    احصل عليه الآن
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal("store")}
                    className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                    title="المتجر"
                  >
                    <Gift
                      size={16}
                      className="text-[color:var(--accent-secondary)]"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="lamma-fire-divider"
              onPointerDown={(e) => {
                if (!leftColumnLayoutRef.current) return;
                e.preventDefault();
                const rect =
                  leftColumnLayoutRef.current.getBoundingClientRect();
                const startY = e.clientY;
                const start = { ...leftColumnSectionsPct };
                const minPct = 18;
                const onMove = (ev: PointerEvent) => {
                  const dy = ev.clientY - startY;
                  const deltaPct = (dy / rect.height) * 100;
                  let store = start.store + deltaPct;
                  let radio = start.radio - deltaPct;
                  const music = start.music;
                  if (store < minPct) {
                    radio -= minPct - store;
                    store = minPct;
                  }
                  if (radio < minPct) {
                    store -= minPct - radio;
                    radio = minPct;
                  }
                  const total = store + radio + music;
                  const scale = 100 / total;
                  setLeftColumnSectionsPct({
                    store: store * scale,
                    radio: radio * scale,
                    music: music * scale,
                  });
                };
                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            />

            <div className="min-h-0">
              <div className="lamma-glass rounded-3xl p-4 overflow-hidden flex flex-col min-h-0 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
                    <Radio
                      size={16}
                      className="text-[color:var(--accent-secondary)]"
                    />
                    <span className="text-[12px] font-black">راديو لمة</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("radio" as any)}
                    className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                    title="فتح الراديو"
                  >
                    <Play
                      size={16}
                      className="text-[color:var(--accent-primary)]"
                    />
                  </button>
                </div>
                <div className="mt-3 flex-1 min-h-0 overflow-hidden">
                  <div className="rounded-2xl p-3 h-full flex flex-col justify-between lamma-section-card">
                    <div className="text-right">
                      <div className="text-[10px] font-black text-[color:var(--accent-secondary)]">
                        الآن على الهواء
                      </div>
                      <div className="text-[12px] text-white font-extrabold mt-1 truncate">
                        أغاني وطرب
                      </div>
                      <div className="text-[10px] text-[color:var(--text-secondary)] font-bold mt-1 truncate">
                        راديو لمة • جودة HD
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleDropdown("radio" as any)}
                        className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                        title="تشغيل/إيقاف"
                      >
                        <Pause
                          size={16}
                          className="text-[color:var(--accent-primary)]"
                        />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDropdown("radio" as any)}
                          className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                          title="السابق"
                        >
                          <ChevronRight size={16} className="text-gray-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDropdown("radio" as any)}
                          className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                          title="التالي"
                        >
                          <ChevronLeft size={16} className="text-gray-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="lamma-fire-divider"
              onPointerDown={(e) => {
                if (!leftColumnLayoutRef.current) return;
                e.preventDefault();
                const rect =
                  leftColumnLayoutRef.current.getBoundingClientRect();
                const startY = e.clientY;
                const start = { ...leftColumnSectionsPct };
                const minPct = 18;
                const onMove = (ev: PointerEvent) => {
                  const dy = ev.clientY - startY;
                  const deltaPct = (dy / rect.height) * 100;
                  const store = start.store;
                  let radio = start.radio + deltaPct;
                  let music = start.music - deltaPct;
                  if (radio < minPct) {
                    music -= minPct - radio;
                    radio = minPct;
                  }
                  if (music < minPct) {
                    radio -= minPct - music;
                    music = minPct;
                  }
                  const total = store + radio + music;
                  const scale = 100 / total;
                  setLeftColumnSectionsPct({
                    store: store * scale,
                    radio: radio * scale,
                    music: music * scale,
                  });
                };
                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            />

            <div className="min-h-0">
              <div className="lamma-glass rounded-3xl p-4 overflow-hidden h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
                    <Music
                      size={16}
                      className="text-[color:var(--accent-secondary)]"
                    />
                    <span className="text-[12px] font-black">موسيقى وغناء</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("music" as any)}
                    className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                    title="فتح الموسيقى"
                  >
                    <Play
                      size={16}
                      className="text-[color:var(--accent-primary)]"
                    />
                  </button>
                </div>
                <div className="mt-3 flex-1 min-h-0">
                  <div className="rounded-2xl p-3 h-full flex items-center justify-between lamma-section-card">
                    <div className="text-right">
                      <div className="text-[10px] font-black text-[color:var(--accent-secondary)]">
                        مكتبة لمة
                      </div>
                      <div className="text-[10px] text-[color:var(--text-secondary)] font-bold mt-1 truncate">
                        اختر تراك وشغّل فورًا
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDropdown("music" as any)}
                      className="px-3 py-2 rounded-xl text-[color:var(--accent-primary)] text-[10px] font-black transition-all cursor-pointer lamma-toggle-on"
                    >
                      فتح
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div
          className={`xl:hidden absolute inset-0 bg-black/70 z-30 transition-opacity ${
            isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />
        {/* ----------------- OVERLAY SIDEBAR PANEL (ROOMS & MEMBERS TABBED) ----------------- */}
        <aside
          className={`xl:hidden sidebar-container w-full sm:w-[420px] border-l border-green-500/10 flex flex-col justify-between flex-shrink-0 z-40 absolute inset-y-0 right-0 h-full shadow-[0_0_25px_rgba(0,0,0,0.85)] max-w-[92vw] lamma-mobile-sidebar-shell ${
            isSidebarOpen ? "flex animate-fade-in" : "hidden"
          }`}
        >
          {/* Header switchers inside the sidebar */}
          <div className="p-3 border-b border-green-500/10 flex flex-col gap-2 shrink-0 lamma-mobile-sidebar-header">
            {/* Mobile Close option */}
            <div className="flex lg:hidden items-center justify-between pb-1.5 border-b border-green-500/10 mb-1">
              <span className="text-white font-black text-xs">
                🗂️ القوائم والاتصال
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileTab("chat");
                  setIsSidebarOpen(false);
                }}
                className="p-1 px-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="bg-black/60 p-2 rounded-xl border border-green-500/10 flex items-center justify-center gap-2 text-[11px] font-black text-green-400">
              {activeSidebarTab === "rooms" ? (
                <>
                  <span>🏠</span>
                  <span>الغرف المتاحة</span>
                </>
              ) : (
                <>
                  <span>👥</span>
                  <span>المتصلين</span>
                </>
              )}
            </div>
          </div>

          {/* Tab lists content */}
          <div className="flex-1 overflow-y-auto py-3 pr-3 pl-5 space-y-4 lamma-fire-scroll">
            {activeSidebarTab === "rooms" && (
              <div className="space-y-3">
                {/* Feature: Create room button */}
                {(isOwnerRole ||
                  memberCustomPermissions[currentUser.nickname]
                    ?.roomCreationAllowed) && (
                  <button
                    type="button"
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="w-full p-2.5 rounded-xl flex items-center justify-center gap-2 text-green-300 font-extrabold text-[11px] transition-all cursor-pointer lamma-primary-btn"
                  >
                    <Plus size={14} />
                    <span>إنشاء غرفة خاصة جديدة</span>
                  </button>
                )}

                {(() => {
                  const visibleRooms = ROOMS_DEF.filter((room) => {
                    if (room.id === "owner" && !isOwnerRole) {
                      return false;
                    }
                    if (room.id === "admin" && !isAdminRole && !isOwnerRole) {
                      return false;
                    }
                    return true;
                  });
                  const mergedVisibleRooms = [...visibleRooms, ...customRooms];

                  return ROOM_CATEGORIES.map((category) => {
                    const rooms = mergedVisibleRooms.filter(
                      (r: any) => r.category === category.id,
                    );
                    if (rooms.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-2">
                        <div className="text-[10px] text-green-400 font-extrabold tracking-widest uppercase pb-1 border-b border-green-500/5 flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </div>

                        <div className="space-y-1.5">
                          {rooms.map((room: any) => (
                            <div
                              key={room.id}
                              onClick={() => {
                                if (!openRooms.find((r) => r.id === room.id)) {
                                  setOpenRooms((prev) => [
                                    ...prev,
                                    {
                                      id: room.id,
                                      name: room.name,
                                      flag: room.icon,
                                    },
                                  ]);
                                }
                                handleSwitchRoom(room.id);
                                if (window.innerWidth < 768) {
                                  setMobileTab("chat");
                                }
                                setIsSidebarOpen(false);
                              }}
                              className={`p-2.5 rounded-xl border transition-all text-xs font-black cursor-pointer flex items-center justify-between lamma-list-item ${
                                room.id === activeRoomId
                                  ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(16,185,129,0.08)]"
                                  : "bg-black/12 border-white/5 text-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{room.icon}</span>
                                <span>{room.name}</span>
                              </div>
                              <span className="bg-black/60 px-2 py-0.5 rounded-full border border-green-500/10 text-[9px] text-[#a3e635] font-black font-mono">
                                {room.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {activeSidebarTab === "members" && (
              <div className="space-y-4 font-semibold text-xs text-right">
                <div className="text-[10px] text-gray-400 font-extrabold flex items-center justify-between mb-1.5 font-sans">
                  <span className="flex items-center gap-1 font-sans uppercase tracking-widest text-[9px]">
                    👥 Connected
                  </span>
                  <span className="text-[9px] font-mono text-gray-500">
                    {orderedChatMembers.length} Active
                  </span>
                </div>
                <div className="pl-1 space-y-1 font-sans rounded-2xl overflow-hidden bg-white/[0.02] lamma-list-panel p-1.5">
                  {orderedChatMembers.map((m, idx, arr) => {
                    const cleanName = getShortenedNickname(m.nickname);
                    const isCurrentUser = m.nickname === myActiveSession.nickname;
                    const actualRole = getRoleFromAuthor(
                      m.nickname,
                      myActiveSession,
                      chatMembers,
                    );
                    const isBasicMember =
                      m.role === "user" || m.role === "guest";
                    const isPlatinumVip =
                      actualRole === "platinum_vip" ||
                      (isCurrentUser && myVisualRole === "platinum_vip");

                    return (
                      <div
                        key={m.id}
                        onClick={() => openMemberProfile(m.nickname)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          openMemberProfile(m.nickname);
                        }}
                        className={`p-1.5 px-2 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-all lamma-list-item ${idx !== arr.length - 1 ? "mb-1" : ""}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 text-right">
                          <div className="flex-shrink-0 flex items-center justify-center">
                            {isBasicMember ? (
                              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/5 rounded-full border border-white/10 text-[24px]">
                                {m.avatar}
                              </div>
                            ) : (
                              <AMLogo
                                size={24}
                                variant="circular"
                                glow={isCurrentUser}
                                crownRole={
                                  (actualRole === "platinum_vip"
                                    ? "vip"
                                    : actualRole) as any
                                }
                                frame={getFrameFromAuthor(
                                  m.nickname,
                                  myActiveSession,
                                  chatMembers,
                                )}
                              />
                            )}
                          </div>
                          <div className="flex flex-col truncate">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span
                                style={{ color: m.color }}
                                className={`font-bold text-[11px] truncate leading-tight ${isPlatinumVip ? "animate-[pulse_1.5s_infinite] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400" : ""}`}
                              >
                                {cleanName}
                              </span>
                              {isCurrentUser && activeTempEntryTopic && (
                                <span className="max-w-[110px] truncate rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5 text-[7px] text-cyan-200">
                                  {activeTempEntryTopic}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="lamma-icon-dot shrink-0 ml-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer with Copy Link */}
          <div className="p-3 border-t border-green-500/10 shrink-0 lamma-mobile-sidebar-footer">
            <button
              onClick={handleCopyLink}
              className="w-full py-2 rounded-xl flex items-center justify-center gap-2 text-green-300 font-black text-[10px] transition-all cursor-pointer lamma-muted-btn"
            >
              <Share2 size={12} />
              <span>نسخ رابط الشات للمشاركة</span>
            </button>
          </div>
        </aside>

        {/* ----------------- PANEL 3: MAIN ACTIVE MESSAGE LOG (3rd column / Center) ----------------- */}
        <div
          className={`flex-1 flex flex-col min-w-0 backdrop-blur-xl xl:order-2 lamma-column-frame lamma-chat-core-shell ${
            mobileTab === "chat" ? "flex" : "hidden md:flex"
          } ${isLeftColumnCollapsed ? "xl:border-l xl:border-white/10" : ""} ${isRightColumnCollapsed ? "xl:border-r xl:border-white/10" : ""} lamma-column-frame`}
        >
          {/* Room Top Bar: Topic & System Actions */}
          <div className="flex items-stretch justify-between min-h-[32px] shrink-0 lamma-fire-underline lamma-room-header">
            {/* Topic Side (Right) */}
            <div
              className="flex-1 flex flex-col justify-center px-2.5 border-l border-white/10 group/topic cursor-pointer relative lamma-topic-shell"
              onClick={() => {
                if (!isEditingTopic && (isAdminRole || isOwnerRole)) {
                  setTopicInputText(roomTopics[activeRoomId] || "");
                  setIsEditingTopic(true);
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="flex items-center justify-center text-[10px] text-white/90 lamma-quiet-power-btn lamma-topic-pin">
                  📌
                </span>
                {isEditingTopic ? (
                  <input
                    type="text"
                    id="room-topic-input"
                    name="room-topic"
                    autoComplete="off"
                    value={topicInputText}
                    onChange={(e) => setTopicInputText(e.target.value)}
                    onBlur={() => {
                      setRoomTopics((prev) => ({
                        ...prev,
                        [activeRoomId]: topicInputText,
                      }));
                      setIsEditingTopic(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setRoomTopics((prev) => ({
                          ...prev,
                          [activeRoomId]: topicInputText,
                        }));
                        setIsEditingTopic(false);
                      }
                    }}
                    className="flex-1 bg-black/45 rounded px-2 py-1 text-sm text-white focus:outline-none lamma-input-shell"
                    autoFocus
                  />
                ) : (
                  <p className="text-[10.5px] font-black text-teal-50 truncate flex-1 leading-normal py-0 mt-0">
                    {roomTopics[activeRoomId] ||
                      "مرحباً بكم في الغرفة الذكية ✨"}
                  </p>
                )}
              </div>
            </div>

            {/* System Actions Side (Left) */}
            <div className="w-[116px] sm:w-[148px] md:w-[188px] flex items-center justify-center px-2 py-0 relative overflow-hidden bg-white/[0.015] border-r border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-sm flex-shrink-0">📡</span>
                <div className="flex flex-col text-left mr-1 justify-center">
                  <span
                    className="text-[10px] font-bold text-gray-200 truncate max-w-[100px] sm:max-w-[130px] leading-normal"
                    dir="rtl"
                  >
                    جلسة مباشرة
                  </span>
                  <span
                    className="text-[8px] font-black uppercase leading-normal text-emerald-300"
                    dir="ltr"
                  >
                    Live session
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Header section replicating the top of chat log / Room Tabs - matching Ad Banner size & width */}
          <div
            className="w-full px-2 flex items-center justify-between shrink-0 z-10 h-[30px] lamma-fire-underline lamma-room-header"
            dir="rtl"
          >
            {/* Tabs Container */}
            <div className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar flex-1 h-full items-end pb-0">
              {openRooms
                .filter((room) => {
                  if (room.id === "owner" && !isOwnerRole) return false;
                  if (room.id === "admin" && !isAdminRole && !isOwnerRole)
                    return false;
                  return true;
                })
                .map((room) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    key={room.id}
                    onClick={() => handleSwitchRoom(room.id)}
                    className={`flex items-center justify-between gap-1 px-2 pb-1.5 pt-1.5 rounded-t-lg cursor-pointer min-w-[70px] transition-all relative group lamma-room-tab ${
                      activeRoomId === room.id
                        ? "lamma-room-tab-active text-white font-black"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {activeRoomId === room.id && (
                      <motion.div
                        layoutId="activeRoomBg"
                        className="absolute inset-0 bg-white/10 rounded-t-lg border-t border-x border-white/10"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <div className="flex items-center gap-1 min-w-0 relative z-10">
                      <span className={`text-[11px] transition-all ${activeRoomId === room.id ? "scale-110 drop-shadow-[0_0_4px_rgba(255,215,0,0.65)]" : ""}`}>{room.flag}</span>
                      <span className={`text-[9.5px] truncate whitespace-nowrap pt-0.5 transition-all ${
                        activeRoomId === room.id 
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 font-extrabold" 
                          : ""
                      }`}>
                        {room.name}
                      </span>
                      {activeRoomId === room.id && (
                        <span className="w-[4px] h-[4px] rounded-full bg-amber-400 shadow-[0_0_6px_#ffd700] animate-[ping_1.5s_infinite] ml-1 shrink-0" />
                      )}
                    </div>
                    {room.id !== "egypt" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenRooms((prev) =>
                            prev.filter((r) => r.id !== room.id),
                          );
                          if (activeRoomId === room.id)
                            handleSwitchRoom("egypt");
                        }}
                        className="text-gray-500 hover:text-red-400/90 p-0.5 rounded-md hover:bg-red-500/20 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1 relative z-10 -my-0.5"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </motion.div>
                ))}
            </div>

            {/* Left aligned utility action icons inside room header */}
            <div className="flex items-center gap-1.5 shrink-0 ml-1 relative">
              <button
                onClick={toggleSearchPop}
                className={`transition-all lamma-room-strip-action ${
                  showSearchPop
                    ? "text-green-300 lamma-quiet-power-btn-active"
                    : "text-gray-400 hover:text-white border border-transparent lamma-toolbar-btn"
                }`}
                title="البحث عن رسائل وأعضاء"
              >
                <Search size={14} />
              </button>

              {/* Features Tray Toggle */}
              <div
                className={`relative dropdown-container ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    toggleDropdown("features");
                  }}
                  className={`flex items-center justify-center transition-all flex-shrink-0 lamma-room-strip-action ${
                    showFeaturesTray
                      ? "text-green-300 lamma-quiet-power-btn-active"
                      : "text-gray-400 hover:text-white lamma-toolbar-btn"
                  }`}
                  title="الميزات الإضافية"
                >
                  <Plus
                    size={14}
                    className={`transition-transform duration-300 ${showFeaturesTray ? "rotate-45" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {showFeaturesTray && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="hidden md:flex absolute top-full left-0 mt-2 w-[280px] rounded-2xl z-50 overflow-hidden flex flex-col lamma-feature-shell"
                    >
                      <div className="flex flex-col gap-3 p-3 select-none">
                        {/* Block 1: Gift panel */}
                        <div className="p-2.5 rounded-xl text-right lamma-list-item">
                          <div className="text-[10px] font-black text-green-300 mb-2">
                            إرسال الهدايا السريعة
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {GIFT_TYPES.map((gift) => (
                              <button
                                key={gift.name}
                                onClick={() => triggerGiftFlying(gift.icon)}
                                className="p-1 px-1.5 rounded-lg text-sm hover:scale-110 active:scale-95 transition-all text-center flex items-center justify-center lamma-soft-action"
                                title={gift.name}
                              >
                                {gift.icon}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Block 2: Achievements and statistics summary */}
                        <div className="p-2.5 rounded-xl flex flex-col justify-between text-right lamma-list-item">
                          <div className="text-[10px] font-black text-green-300 mb-1.5">
                            أوسمة الإنجازات
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400 text-lg">🏆</span>
                            <div className="text-right flex-1 leading-tight">
                              <div className="text-[10px] text-gray-200 font-bold">
                                بطل الأسبوع المتفاعل
                              </div>
                              <span className="text-[8px] text-gray-500">
                                تم كسب الوسام بفضل 2,8k دردشة
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs">⭐</span>
                              <span className="text-xs">⚔️</span>
                            </div>
                          </div>
                        </div>

                        {/* Block 3: Live calling indicator/player perfectly matching bottom block in screenshot 1 */}
                        <div className="p-2.5 rounded-xl flex flex-col justify-between relative overflow-hidden text-right lamma-admin-card">
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-300">
                            <span>المكالمات الصوتية</span>
                            <span className="text-green-400 font-mono text-[9px] font-black tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                              <span>{formatSecs(callingSeconds)}</span>
                            </span>
                          </div>

                          {/* Dynamic waveform simulation vectors */}
                          <div className="flex items-end justify-center gap-1 h-8 my-1.5">
                            {waveHeights.map((h, i) => (
                              <span
                                key={i}
                                className="w-[3.5px] bg-[#a3e635] rounded-full transition-all duration-300"
                                style={{ height: `${h}%` }}
                              />
                            ))}
                          </div>

                          {/* MIC mute / Red decline keys */}
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => setIsMuted(!isMuted)}
                              className={`p-1.5 rounded-full border transition-all ${
                                isMuted
                                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                                  : "bg-green-500/20 border-green-500/40 text-green-400"
                              }`}
                              title="كتم الصوت"
                            >
                              <Mic size={11} />
                            </button>
                            <button
                              onClick={() => {
                                const isOwner = currentUser.role === "owner";
                                const perm =
                                  memberCustomPermissions[currentUser.nickname]
                                    ?.callsAllowed;
                                if (!isOwner && !perm) {
                                  alert(
                                    "⚠️ عذراً: ميزة المكالمات الصوتية والمرئية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 📞",
                                  );
                                  return;
                                }
                                const normalizedRole =
                                  currentUser.role.toLowerCase();
                                if (
                                  normalizedRole === "guest" ||
                                  normalizedRole === "زائر"
                                ) {
                                  alert(
                                    "👤 تنبيه العضوية: رتبة زائر غير مصرح لها بإجراء المكالمات الصوتية والمرئية! يرجى غلق الجلسة والتسجيل كعضو للاستفادة بكافة الخدمات الفائقة 📞.",
                                  );
                                  return;
                                }
                                setIsCalling(!isCalling);
                              }}
                              className="p-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all border border-red-500/30"
                              title="إنهاء المكالمة"
                            >
                              <Phone size={11} className="rotate-[135deg]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <MobileBottomSheet
                  isOpen={showFeaturesTray}
                  onClose={() => setShowFeaturesTray(false)}
                  title="الميزات الإضافية"
                  icon={<Plus size={16} className="text-green-400" />}
                >
                  <div className="flex flex-col gap-3 p-1 select-none text-right">
                    {/* Block 1: Gift panel */}
                    <div className="p-3 rounded-xl text-right lamma-list-item bg-black/20">
                      <div className="text-[11px] font-black text-green-300 mb-2.5">
                        إرسال الهدايا السريعة
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 justify-end">
                        {GIFT_TYPES.map((gift) => (
                          <button
                            key={gift.name}
                            type="button"
                            onClick={() => {
                              triggerGiftFlying(gift.icon);
                              setShowFeaturesTray(false);
                            }}
                            className="p-2 px-3 rounded-lg text-lg hover:scale-110 active:scale-95 transition-all text-center flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10"
                            title={gift.name}
                          >
                            {gift.icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Block 2: Achievements and statistics summary */}
                    <div className="p-3 rounded-xl flex items-center justify-between text-right lamma-list-item bg-black/20">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <span className="text-yellow-400 text-lg">🏆</span>
                        <div className="text-right flex-1 leading-tight mr-1">
                          <div className="text-[11px] text-gray-200 font-bold">
                            بطل الأسبوع المتفاعل
                          </div>
                          <span className="text-[9px] text-gray-500">
                            تم كسب الوسام بفضل 2,8k دردشة
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-xs">⭐</span>
                        <span className="text-xs">⚔️</span>
                      </div>
                    </div>

                    {/* Block 3: Live calling indicator/player */}
                    <div className="p-3 rounded-xl flex flex-col justify-between relative overflow-hidden text-right lamma-admin-card bg-black/25">
                      <div className="flex justify-between items-center text-[11px] font-bold text-gray-300 mb-1">
                        <span>المكالمات الصوتية</span>
                        <span className="text-green-400 font-mono text-[10px] font-black tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                          <span>{formatSecs(callingSeconds)}</span>
                        </span>
                      </div>

                      {/* Dynamic waveform simulation vectors */}
                      <div className="flex items-end justify-center gap-1 h-8 my-2">
                        {waveHeights.map((h, i) => (
                          <span
                            key={i}
                            className="w-[3.5px] bg-[#a3e635] rounded-full transition-all duration-300"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>

                      {/* MIC mute / Red decline keys */}
                      <div className="flex items-center justify-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => setIsMuted(!isMuted)}
                          className={`p-2 rounded-full border transition-all ${
                            isMuted
                              ? "bg-red-500/20 border-red-500/40 text-red-400"
                              : "bg-green-500/20 border-green-500/40 text-green-400"
                          }`}
                          title="كتم الصوت"
                        >
                          <Mic size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const isOwner = currentUser.role === "owner";
                            const perm =
                              memberCustomPermissions[currentUser.nickname]
                                ?.callsAllowed;
                            if (!isOwner && !perm) {
                              alert(
                                "⚠️ عذراً: ميزة المكالمات الصوتية والمرئية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 📞",
                              );
                              return;
                            }
                            const normalizedRole =
                              currentUser.role.toLowerCase();
                            if (
                              normalizedRole === "guest" ||
                              normalizedRole === "زائر"
                            ) {
                              alert(
                                "👤 تنبيه العضوية: رتبة زائر غير مصرح لها بإجراء المكالمات الصوتية والمرئية! يرجى غلق الجلسة والتسجيل كعضو للاستفادة بكافة الخدمات الفائقة 📞.",
                              );
                              return;
                            }
                            setIsCalling(!isCalling);
                          }}
                          className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all border border-red-500/30"
                          title="إنهاء المكالمة"
                        >
                          <Phone size={14} className="rotate-[135deg]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </MobileBottomSheet>
              </div>

              <div
                className={`relative dropdown-container ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  onClick={() => toggleDropdown("privacy")}
                  className={`p-1 px-1.5 rounded-md hover:bg-white/5 transition-all flex ${showPrivacyDropdown ? "bg-red-500/10 text-[#f43f5e]" : "text-[#f43f5e] hover:text-red-400"}`}
                  title="خصوصية وأمان"
                >
                  <Shield size={14} />
                </button>

                <AnimatePresence>
                  {showPrivacyDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed top-24 left-1/2 -translate-x-1/2 sm:left-auto sm:right-32 w-[280px] rounded-2xl z-[100] overflow-hidden flex flex-col cursor-move lamma-modal-shell"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between p-3 lamma-modal-header">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-rose-300" />
                          <h3 className="font-black text-white text-xs">
                            خصوصية وأمان
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeFloatingUi();
                          }}
                          className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer lamma-danger-btn"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div
                        className="p-3 text-right space-y-4 max-h-[300px] overflow-y-auto cursor-default"
                        onPointerDownCapture={(e) => e.stopPropagation()}
                      >
                        <p className="text-[10px] text-gray-400 font-bold border-b border-white/5 pb-2">
                          نحن نهتم بخصوصيتك. يمكنك التحكم في إعدادات الأمان
                          الخاصة بك هنا.
                        </p>
                        <div className="grid gap-3 select-none">
                          <div className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all lamma-admin-card">
                            <div className="flex flex-col gap-1">
                              <span className="text-white text-xs font-black">
                                حظر الرسائل الخاصة
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold">
                                منع أي شخص غير الأصدقاء من مراسلتك على الخاص
                              </span>
                            </div>
                            <div className="w-10 h-5 rounded-full relative lamma-toggle-on">
                              <div className="w-4 h-4 bg-green-300 rounded-full absolute top-0.5 right-0.5"></div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (currentUser.role === "owner") {
                                setIsGhostMode(!isGhostMode);
                              } else {
                                alert("هذه الميزة متاحة للمالك فقط 👑");
                              }
                            }}
                            aria-pressed={isGhostMode}
                            className="w-full p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all text-right lamma-admin-card"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-white text-xs font-black flex items-center gap-1.5">
                                إخفاء التواجد (وضع التخفي)
                                <span aria-hidden="true">
                                  {isGhostMode ? "🟢" : "⚫"}
                                </span>
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold">
                                إخفاء حالتك "متصل الآن" (ميزة VIP)
                              </span>
                            </div>
                            <div
                              className={`w-10 h-5 rounded-full relative transition-all ${
                                isGhostMode ? "lamma-toggle-on" : "lamma-tab-soft"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${
                                  isGhostMode
                                    ? "bg-green-300 right-0.5"
                                    : "bg-gray-400 left-0.5"
                                }`}
                              ></div>
                            </div>
                          </button>
                          <div className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all lamma-soft-danger">
                            <div className="flex flex-col gap-1">
                              <span className="text-red-400 text-xs font-black">
                                قائمة المحظورين
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold">
                                عرض الأشخاص الذين قمت بحظرهم وفك الحظر عنهم
                              </span>
                            </div>
                            <button className="px-3 py-1 rounded-lg text-[10px] font-black lamma-danger-btn">
                              إدارة
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => {
                  const shouldCloseMembers =
                    isSidebarOpen && activeSidebarTab === "members";

                  setShowRoomsLists(false);
                  setShowFeaturesTray(false);
                  setShowNotificationsDropdown(false);
                  setShowGamesDropdown(false);
                  setShowAttachmentDropdown(false);
                  setShowMusicDropdown(false);
                  setShowRadioDropdown(false);
                  setShowEmojiPicker(false);
                  setShowCommandsDropdown(false);
                  setShowPrivacyDropdown(false);
                  setShowSettingsDropdown(false);
                  setShowSearchPop(false);
                  setShowUserContextPop(false);
                  setShowUserProfileBioPop(false);
                  setShowProfileModal(false);
                  setIsPmOpen(false);

                  if (shouldCloseMembers) {
                    setMobileTab("chat");
                    setShowMembersList(false);
                    setIsSidebarOpen(false);
                    return;
                  }

                  setMobileTab("members");
                  setActiveSidebarTab("members");
                  setShowMembersList(true);
                  setIsSidebarOpen(true);
                }}
                className={`p-1 px-1.5 rounded-md transition-all flex md:hidden ${showMembersList ? "lamma-quiet-power-btn-active text-green-300" : "text-gray-400 hover:text-white lamma-toolbar-btn"}`}
                title="تثبيت قائمة الأعضاء"
              >
                <Users size={14} />
              </button>

              {isManagementRole && (
                <div className="relative dropdown-container">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => toggleDropdown("commands")}
                    className={`transition-all lamma-room-strip-action flex items-center justify-center ${
                      showCommandsDropdown
                        ? "text-green-300 lamma-quiet-power-btn-active"
                        : "text-green-400 hover:text-green-300 lamma-toolbar-btn"
                    }`}
                    title="نظام الأوامر السريعة"
                  >
                    <Terminal size={14} />
                  </button>

                  <AnimatePresence>
                    {showCommandsDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="hidden md:flex absolute top-full left-0 mt-2 w-[240px] rounded-2xl z-50 flex flex-col pb-1.5 lamma-popover-shell"
                      >
                        <div className="flex items-center justify-between p-2.5 lamma-feature-header">
                          <div className="flex items-center gap-1.5 pointer-events-none">
                            <Terminal size={14} className="text-green-400" />
                            <h3 className="font-sans font-black text-white text-xs">نظام الأوامر السريعة</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCommandsDropdown(false)}
                            className="p-1 rounded-lg text-red-400 hover:text-white transition-all cursor-pointer lamma-feature-action"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="flex flex-col p-2 gap-1.5 text-right font-sans">
                          <p className="text-[9.5px] text-gray-400 font-bold mb-1 px-1 leading-relaxed">
                            انقر على أي أمر لتطبيقه مباشرة على صندوق النص أو للتنفيذ التلقائي لخدمات الشات الملكي:
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setInputText("/ping");
                              setShowCommandsDropdown(false);
                            }}
                            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                          >
                            <span className="font-mono font-black text-green-400">/ping</span>
                            <span className="text-[9.5px] text-gray-500">قياس سرعة استجابة السيرفر</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRoomMessages((prev) => ({
                                ...prev,
                                [activeRoomId]: [],
                              }));
                              setShowCommandsDropdown(false);
                            }}
                            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                          >
                            <span className="font-mono font-black text-yellow-400">/clear</span>
                            <span className="text-[9.5px] text-gray-500">مسح الشاشة تجميلياً</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsZenMode(true);
                              setIsSidebarOpen(false);
                              setShowCommandsDropdown(false);
                            }}
                            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                          >
                            <span className="font-mono font-black text-violet-400">/zen</span>
                            <span className="text-[9.5px] text-gray-500">تفعيل وضع التركيز التام (Zen)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCompactView(!isCompactView);
                              setShowCommandsDropdown(false);
                            }}
                            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                          >
                            <span className="font-mono font-black text-cyan-400">/compact</span>
                            <span className="text-[9.5px] text-gray-500">تبديل وضع العرض المدمج</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInputText("/help");
                              setShowCommandsDropdown(false);
                            }}
                            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                          >
                            <span className="font-mono font-black text-rose-400">/help</span>
                            <span className="text-[9.5px] text-gray-500">عرض المساعدة والتعليمات</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <MobileBottomSheet
                    isOpen={showCommandsDropdown}
                    onClose={() => setShowCommandsDropdown(false)}
                    title="نظام الأوامر السريعة"
                    icon={<Terminal size={16} className="text-green-400" />}
                  >
                    <div className="flex flex-col p-1 gap-2.5 text-right font-sans">
                      <p className="text-[11px] text-gray-400 font-bold mb-1.5 leading-relaxed">
                        انقر على أي أمر لتطبيقه مباشرة على صندوق النص أو للتنفيذ التلقائي لخدمات الشات الملكي:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setInputText("/ping");
                          setShowCommandsDropdown(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer bg-white/5 hover:bg-white/10"
                      >
                        <span className="font-mono font-black text-green-400 text-sm">/ping</span>
                        <span className="text-[10px] text-gray-400">قياس سرعة استجابة السيرفر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRoomMessages((prev) => ({
                            ...prev,
                            [activeRoomId]: [],
                          }));
                          setShowCommandsDropdown(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer bg-white/5 hover:bg-white/10"
                      >
                        <span className="font-mono font-black text-yellow-400 text-sm">/clear</span>
                        <span className="text-[10px] text-gray-400">مسح الشاشة تجميلياً</span>
                      </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsZenMode(true);
                        setIsSidebarOpen(false);
                        setShowCommandsDropdown(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer bg-white/5 hover:bg-white/10"
                    >
                      <span className="font-mono font-black text-violet-400 text-sm">/zen</span>
                      <span className="text-[10px] text-gray-400">تفعيل وضع التركيز التام (Zen)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompactView(!isCompactView);
                        setShowCommandsDropdown(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer bg-white/5 hover:bg-white/10"
                    >
                      <span className="font-mono font-black text-cyan-400 text-sm">/compact</span>
                      <span className="text-[10px] text-gray-400">تبديل وضع العرض المدمج</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputText("/help");
                        setShowCommandsDropdown(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer bg-white/5 hover:bg-white/10"
                    >
                      <span className="font-mono font-black text-rose-400 text-sm">/help</span>
                      <span className="text-[10px] text-gray-400">عرض المساعدة والتعليمات</span>
                    </button>
                  </div>
                </MobileBottomSheet>
                </div>
              )}
            </div>
          </div>

          {/* Messages Feed Viewport */}
          <div
            ref={feedViewportRef}
            className="flex-1 overflow-y-auto lamma-fire-scroll pr-3 pl-4 pt-1 pb-0"
            dir="rtl"
          >
            <div className="flex flex-col gap-2.5">
              {/* Owner Control Alerts Block */}
              {isMaintenanceMode && (
                <div
                  className="p-3 text-yellow-300 rounded-2xl flex items-center justify-between gap-3 text-right select-none lamma-soft-warn"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2">
                    <SettingsIcon size={15} className="text-yellow-300" />
                    <div>
                      <h5 className="text-[10px] font-black font-sans text-white">
                        وضع صيانة شات لمة النشط حالياً
                      </h5>
                      <p className="text-[8.5px] text-gray-300 mt-0.5 leading-normal">
                        يقوم المالك أو المدراء بضبط وتحديث قنوات شات لمة للحفاظ
                        على جرس الكفاءة.
                      </p>
                    </div>
                  </div>
                  {(currentUser.role === "owner" ||
                    currentUser.role === "admin") && (
                    <button
                      onClick={() => setIsMaintenanceMode(false)}
                      className="px-2 py-0.5 text-[8.5px] rounded-lg text-yellow-300 font-bold transition-all shrink-0 cursor-pointer lamma-soft-warn"
                    >
                      إيقاف
                    </button>
                  )}
                </div>
              )}

              {isGlobalMute && (
                <div
                  className="p-3 text-red-300 rounded-2xl flex items-center justify-between gap-3 text-right select-none lamma-soft-danger"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2">
                    <VolumeX size={15} className="text-red-300" />
                    <div>
                      <h5 className="text-[10px] font-black font-sans text-white">
                        كتم الروم العام للدردشة مفعل
                      </h5>
                      <p className="text-[8.5px] text-gray-300 mt-0.5 leading-normal font-sans">
                        تم إغلاق الروم تفادياً للفوضوية ومراجعة آداب الخطاب.
                        الكتابة للمدراء فقط.
                      </p>
                    </div>
                  </div>
                  {(currentUser.role === "owner" ||
                    currentUser.role === "admin") && (
                    <button
                      onClick={() => setIsGlobalMute(false)}
                      className="px-2 py-0.5 text-[8.5px] rounded-lg text-red-300 font-bold transition-all shrink-0 cursor-pointer lamma-danger-btn"
                    >
                      إلغاء الكتم
                    </button>
                  )}
                </div>
              )}

              {/* Live mapped message items list */}
              {authError && (
                <div
                  className="mx-2 mb-3 p-3 rounded-2xl flex flex-col gap-2 text-right lamma-soft-danger"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="shrink-0 text-red-400" />
                    <div className="flex-1">
                      <h5 className="text-[11px] font-black text-white">
                        تنبيه المزامنة والسيرفر
                      </h5>
                      <p className="text-[9px] text-gray-300 mt-0.5 leading-normal">
                        {authError}
                      </p>
                    </div>
                  </div>
                  {false && (
                    <button
                      onClick={async () => {
                        console.log("Login not available");
                      }}
                      className="mt-1 w-full py-1.5 rounded-xl text-[9px] font-black text-white transition-all flex items-center justify-center gap-2 lamma-soft-action"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path
                          fill="#4285f4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34a853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#fbbc05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#ea4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 11.99 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      دخول سريع بـ Google للمزامنة
                    </button>
                  )}
                </div>
              )}

              {allMessages.length > messageShowCount && (
                <div className="flex justify-center mb-2">
                  <button
                    onClick={() => setMessageShowCount((prev) => prev + 50)}
                    className="px-3 py-1 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 hover:text-white rounded-xl text-[10px] font-bold border border-[#10b981]/20 transition-all shadow-sm"
                  >
                    {isPostsRoom
                      ? "تحميل منشورات أقدم ⬆️"
                      : "تحميل الرسائل السابقة ⬆️"}
                  </button>
                </div>
              )}

              {isOwnerRoom && (
                <div
                  className="mx-2 mb-3 rounded-[26px] border border-amber-400/15 bg-[linear-gradient(135deg,rgba(28,22,10,0.92),rgba(11,10,9,0.9))] p-4 text-right shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
                  dir="rtl"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                      <Crown size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-white">
                        غرفة المالك
                      </h4>
                      <p className="mt-1 text-[11px] leading-5 text-gray-300">
                        مركز الشات الكامل: من هنا تراجع الحماية، التصميم،
                        الإحصائيات، وسجل النشاط بدل ما تكون الغرفة فاضية.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">الحالة العامة</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {isMaintenanceMode ? "وضع الصيانة مفعل" : "الشات يعمل طبيعي"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">سجل الأنشطة</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {activityLogs.length} حدث إداري
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">الكلمات المحظورة</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {bannedWords.length} كلمة
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">المطرودون</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {bannedUsersList.length} عضو
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => {
                        setLeadershipTab("quick");
                        openModal("leadership");
                      }}
                      className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-[11px] font-black text-white transition-all hover:bg-white/10"
                    >
                      التحكم السريع
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeadershipTab("guard");
                        openModal("leadership");
                      }}
                      className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-[11px] font-black text-white transition-all hover:bg-white/10"
                    >
                      الحماية
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeadershipTab("design");
                        openModal("leadership");
                      }}
                      className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-[11px] font-black text-white transition-all hover:bg-white/10"
                    >
                      التصميم
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeadershipTab("stats");
                        openModal("leadership");
                      }}
                      className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-[11px] font-black text-white transition-all hover:bg-white/10"
                    >
                      الإحصائيات
                    </button>
                  </div>
                </div>
              )}

              {isAdminRoom && (
                <div
                  className="mx-2 mb-3 rounded-[26px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(7,18,28,0.92),rgba(8,11,16,0.9))] p-4 text-right shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
                  dir="rtl"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                      <Shield size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-white">
                        غرفة الإدارة
                      </h4>
                      <p className="mt-1 text-[11px] leading-5 text-gray-300">
                        غلاف إداري واضح للمشرفين: متابعة الكتم العام، المايك،
                        حالة الوسائط، وسجل التصرفات بدل الفراغ الحالي.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">الكتابة العامة</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {isGlobalMute ? "مقفولة حاليًا" : "مفتوحة"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">الميكروفونات</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {isGlobalMicMute ? "محظورة" : "مسموح بها"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">وسائط الشات</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {isOnlyVIPCanSendImages ? "VIP فقط" : "متاحة للجميع"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[10px] text-gray-400">آخر السجلات</div>
                      <div className="mt-1 text-xs font-black text-white">
                        {activityLogs.length} إجراء
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => openModal("admin")}
                      className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-black text-cyan-100 transition-all hover:bg-cyan-500/20"
                    >
                      فتح غلاف ولوحة الإدارة
                    </button>
                  </div>
                </div>
              )}

              {isPostsRoom ? (
                <PostsFeedRoom
                  posts={postsFeedMessages}
                  currentSession={myActiveSession}
                  isCompactView={isCompactView}
                  isChatColumnExpanded={isChatColumnExpanded}
                  onOpenProfile={openMemberProfile}
                  canDeletePost={canDeleteMessage}
                  onDeletePost={deleteMessage}
                />
              ) : (
                messages.map((msg, index) => {
                  const isSystem = msg.type === "system";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start ${isCompactView ? "gap-1 py-0 px-1" : "gap-2 py-0 px-2"} max-w-full rounded transition-colors ${
                        isSystem ? "my-1" : "hover:bg-white/5"
                      }`}
                    >
                      {/* Author Avatar */}
                      <div
                        className="flex-shrink-0 cursor-pointer mt-1 group/author animate-fadeIn"
                        onClick={() => handleInlineMemberTap(msg.author)}
                      >
                        <AMLogo
                          size={isCompactView ? 16 : 22}
                          variant="circular"
                          glow={msg.author === myActiveSession.nickname}
                          frame={getFrameFromAuthor(
                            msg.author,
                            myActiveSession,
                          )}
                          crownRole={(() => {
                            const r = isSystem
                              ? "admin"
                              : getRoleFromAuthor(msg.author, myActiveSession);
                            return (r === "platinum_vip" ? "vip" : r) as any;
                          })()}
                        />
                      </div>

                      {/* Author Name and Time Column */}
                      <div
                        className="flex flex-col items-start cursor-pointer group/author shrink-0 pt-0"
                        onClick={() => handleInlineMemberTap(msg.author)}
                      >
                        {(() => {
                          const role = isSystem
                            ? "admin"
                            : getRoleFromAuthor(msg.author, myActiveSession);
                          const cleanName = getShortenedNickname(msg.author);
                          const nameColor = isSystem
                            ? "#a3e635"
                            : msg.author === myActiveSession.nickname
                              ? myActiveSession.color
                              : msg.color;
                          return (
                            <div className="lamma-author-line">
                              <span
                                style={{ color: nameColor }}
                                className={`font-bold text-[11px] group-hover/author:underline lamma-author-name ${myActiveSession.nickname === msg.author && myVisualRole === "platinum_vip" ? "animate-[pulse_1.5s_infinite] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400" : ""}`}
                              >
                                {cleanName}
                              </span>
                              {msg.author === myActiveSession.nickname &&
                                activeTempEntryTopic && (
                                  <span className="max-w-[110px] truncate rounded-full border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-[7px] text-cyan-200">
                                    {activeTempEntryTopic}
                                  </span>
                                )}
                              {role === "owner" && (
                                <BossSigil size={12} className="opacity-95" />
                              )}

                              {/* Dynamically Render Custom Badge and Title */}
                              {msg.author === myActiveSession.nickname &&
                                myActiveSession.badge && (
                                  <span className="text-[7.5px] lamma-badge-chip">
                                    {myActiveSession.badge}
                                  </span>
                                )}
                              {msg.author === myActiveSession.nickname &&
                                myActiveSession.title && (
                                  <span className="text-[7.5px] lamma-title-chip">
                                    [{myActiveSession.title}]
                                  </span>
                                )}

                              {role === "platinum_vip" && (
                                <span className="text-[7px] lamma-role-chip lamma-role-plat">
                                  PLATINUM VIP
                                </span>
                              )}
                              {role === "vip" && (
                                <span className="text-[7px] lamma-role-chip lamma-role-vip">
                                  VIP
                                </span>
                              )}
                              {role === "admin" && (
                                <span className="text-[7px] lamma-role-chip lamma-role-admin">
                                  ADMIN
                                </span>
                              )}
                              {role === "owner" && (
                                <span className="text-[7px] lamma-role-chip lamma-role-owner">
                                  OWNER
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="lamma-author-meta group/msgactions">
                          <span
                            className="text-[8px] font-mono lamma-msg-meta"
                            dir="ltr"
                          >
                            {msg.time}
                          </span>

                          {msg.type === "text" && (
                            <button className="text-gray-500 text-[10px] font-mono font-black opacity-100 hover:text-green-300 transition-opacity flex items-center justify-center p-0.5 rounded cursor-pointer group-hover/author:text-green-300 lamma-toolbar-btn">
                              +
                            </button>
                          )}

                          {/* Interaction popover */}
                          <div className="absolute top-full mt-0.5 -right-2 hidden group-hover/msgactions:flex p-1.5 rounded-lg flex-row gap-2 z-50 w-max items-center lamma-popover-shell">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addReaction(activeRoomId, msg.id, "❤️");
                              }}
                              className="text-[11px] md:text-[13px] hover:scale-125 transition-transform cursor-pointer"
                            >
                              ❤️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addReaction(activeRoomId, msg.id, "😂");
                              }}
                              className="text-[11px] md:text-[13px] hover:scale-125 transition-transform cursor-pointer"
                            >
                              😂
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addReaction(activeRoomId, msg.id, "👍");
                              }}
                              className="text-[11px] md:text-[13px] hover:scale-125 transition-transform cursor-pointer"
                            >
                              👍
                            </button>
                            <div className="w-[1px] h-3 bg-white/20 mx-0.5"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const translations = [
                                  "Hello everyone!",
                                  "How are you?",
                                  "Welcome to the group",
                                  "Good morning!",
                                ];
                                const randomTranslation =
                                  translations[
                                    Math.floor(
                                      Math.random() * translations.length,
                                    )
                                  ];
                                alert(
                                  `الترجمة التقريبية:\n\n${randomTranslation}`,
                                );
                              }}
                              className="text-[9px] text-[#10b981] hover:text-green-300 font-bold px-1 cursor-pointer"
                            >
                              ترجمة
                            </button>
                            {canDeleteMessage(msg) && (
                              <>
                                <div className="w-[1px] h-3 bg-white/20 mx-0.5"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      confirm(
                                        "🗑️ حذف الرسالة؟\n\nلو الرسالة مرفوعة على Supabase هتتمسح هناك كمان.",
                                      )
                                    ) {
                                      deleteMessage(msg);
                                    }
                                  }}
                                  className="text-[10px] text-red-400 hover:text-red-300 font-bold px-1 cursor-pointer"
                                  title="حذف الرسالة"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0 pt-0">
                        <div
                          className={`lamma-message ${isCompactView ? "text-[10px] px-3 py-2" : "text-[11px]"} leading-relaxed text-gray-100 break-words ${
                            isChatColumnExpanded
                              ? "max-w-full"
                              : "max-w-[min(820px,100%)]"
                          } ${
                            isSystem
                              ? "lamma-msg-bubble-system"
                              : msg.author === myActiveSession.nickname
                                ? "lamma-msg-bubble-own"
                                : ""
                          }`}
                        >
                          {msg.type === "text" &&
                            renderTextMessageWithMedia(msg.text)}

                          {/* Reaction Bar (only if there are reactions) */}
                          {msg.reactions &&
                            Object.keys(msg.reactions).length > 0 && (
                              <div className="flex gap-1 mt-2 items-center">
                                {Object.entries(msg.reactions).map(
                                  ([emoji, count]) => (
                                    <span
                                      key={emoji}
                                      className="text-[9px] bg-white/10 rounded px-1 select-none flex items-center gap-0.5"
                                    >
                                      {emoji} {count}
                                    </span>
                                  ),
                                )}
                              </div>
                            )}

                          {isSystem && (
                            <div className="text-right leading-relaxed font-semibold text-[10px] text-gray-200 mt-0.5 select-none font-mono lamma-system-note">
                              <span className="lamma-system-label flex items-center gap-1 mb-0.5 text-[10px]">
                                🛡️{" "}
                                {msg.author === "🛡️ بوت الحماية الذكي"
                                  ? "إشعار حماية تلقائي:"
                                  : "إشعار نظام:"}
                              </span>
                              <div className="whitespace-pre-line text-[10.5px] font-sans text-gray-300 leading-relaxed">
                                {msg.text}
                              </div>
                            </div>
                          )}

                          {msg.type === "gift" && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg animate-bounce">
                                {msg.giftIcon}
                              </span>
                              <span className="font-bold text-white text-[9px]">
                                {msg.text}
                              </span>
                            </div>
                          )}

                          {msg.type === "image" && (
                            <div className="mt-2">
                              <img
                                loading="lazy"
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="rounded-xl max-w-[180px] max-h-[120px] object-cover border border-white/10 bg-black/10"
                              />
                            </div>
                          )}

                          {msg.type === "video" && (
                            <div className="mt-2">
                              {getYoutubeId(msg.mediaUrl) ? (
                                <div className="relative pb-[56.25%] h-0 w-[360px] max-w-full rounded-2xl overflow-hidden border border-red-500/20 shadow-lg">
                                  <iframe
                                    title="Attached YouTube Video Player"
                                    src={`https://www.youtube.com/embed/${getYoutubeId(msg.mediaUrl)}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  />
                                </div>
                              ) : (
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  className="rounded-2xl max-w-[360px] border border-white/10"
                                />
                              )}
                            </div>
                          )}

                          {msg.type === "audio" && (
                            <div className="mt-2">
                              <audio
                                src={msg.mediaUrl}
                                controls
                                className="h-8 max-w-[320px] rounded-xl"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {!isPostsRoom && <div ref={messageEndRef} />}
            </div>
          </div>

          {/* Scrolling Commercial ad banner */}
          {isAdsEnabled && (
            <div
              className="w-full px-3 py-0.5 flex items-center justify-between text-[rgba(210,220,226,0.84)] text-[10px] font-bold z-[40] relative lamma-fire-overline lamma-banner-shell"
              dir="rtl"
            >
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <span className="shrink-0 text-[rgba(190,220,160,0.9)] flex items-center gap-1">
                  <Sparkles
                    size={12}
                    className="text-[rgba(190,220,160,0.9)]"
                  />{" "}
                  <span className="hidden sm:inline">إعلانات المتجر:</span>
                </span>
                <div className="flex-1 overflow-hidden relative h-5 flex items-center">
                  <div className="absolute whitespace-nowrap animate-marquee flex items-center gap-10 lamma-banner-marquee">
                    <span>
                      🔥 عروض المتجر التأسيسي: احصل على رتبة VIP بلاتينية الآن
                      بخصم 45%!
                    </span>
                    <span>
                      ✨ ميزة تبخير الاسم وتلوين اللقب مفعلة مجاناً لـ VIP 👑.
                    </span>
                    <span>
                      🎁 ميزة إرسال الملصقات متوفرة بالمتجر، كود: LAMMA_GOLD.
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdsEnabled(false)}
                className="shrink-0 mr-3 text-yellow-500 rounded p-1 cursor-pointer flex items-center justify-center transition-colors lamma-soft-action"
                title="إخفاء الشريط"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Restore ad banner pill if dismissed */}
          {/* Styled Room Chat Bottom Input panel matching exact screenshot 1 center bar */}
          <div
            className={
              isZenMode
                ? "p-1.5 sm:p-2 absolute bottom-2 left-2 right-2 max-w-4xl mx-auto z-40 bg-transparent shrink-0 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.8)] rounded-full"
                : "-mt-px px-0 sm:px-0 pb-0 pt-0 bg-transparent relative z-10 shrink-0"
            }
          >
            <div
              className={`flex flex-wrap md:flex-nowrap items-center gap-1 sm:gap-1.5 rounded-t-[22px] rounded-b-none md:rounded-t-[24px] md:rounded-b-none px-2 sm:px-3 py-1.5 sm:py-2 md:py-1 ${
                isZenMode
                  ? "bg-[#0b100c]/88 border border-green-500/24 shadow-2xl backdrop-blur-xl lamma-chat-input-shell"
                  : "bg-[rgba(7,10,12,0.22)] border border-white/6 shadow-none lamma-chat-input-shell"
              }`}
              style={
                isZenMode
                  ? undefined
                  : {
                      marginBottom: "-1px",
                    }
              }
            >
              {/* Attachment Dropdown Container */}
              <div className="relative dropdown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("attachment")}
                  className={`flex items-center justify-center transition-all lamma-composer-tool ${showAttachmentDropdown ? "bg-green-500/20 text-green-400" : "text-gray-400 hover:text-white lamma-toolbar-btn"}`}
                  title="إرفاق ملف"
                >
                  <Plus
                    size={16}
                    className={`transition-transform duration-300 ${showAttachmentDropdown ? "rotate-45" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {showAttachmentDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full right-0 mb-4 rounded-2xl p-2 grid grid-cols-1 gap-1 w-40 z-50 lamma-popover-shell"
                    >
                      <button
                        className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                        onClick={() => handleSendAttachment("image")}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Image size={14} />
                        </div>
                        <span>رفع صورة</span>
                      </button>
                      <button
                        className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                        onClick={() => handleSendAttachment("imageUrl")}
                      >
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                          <LinkIcon size={14} />
                        </div>
                        <span>رابط صورة</span>
                      </button>
                      <button
                        className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right cursor-pointer lamma-list-item"
                        onClick={() => handleSendAttachment("video")}
                      >
                        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                          <Tv size={14} />
                        </div>
                        <span>مقطع يوتيوب</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <input
                ref={imageUploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUploadChange}
              />

              {/* Games Dropdown Container */}
              <div className="relative dropdown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("games")}
                  className={`flex items-center justify-center transition-all lamma-composer-tool ${showGamesDropdown ? "bg-green-500/10 text-white" : "text-gray-400 hover:text-white lamma-toolbar-btn"}`}
                  title="الألعاب"
                >
                  <Trophy size={14} strokeWidth={2.1} />
                </button>

                <AnimatePresence>
                  {showGamesDropdown && (
                    <motion.div
                      drag
                      dragConstraints={{
                        left: -300,
                        right: 300,
                        top: -400,
                        bottom: 200,
                      }}
                      dragMomentum={false}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed bottom-20 left-4 md:left-auto md:right-1/4 w-[280px] sm:w-[320px] rounded-2xl z-[100] flex flex-col lamma-popover-shell"
                      style={{
                        resize: "both",
                        overflow: "hidden",
                        minWidth: "250px",
                        minHeight: "250px",
                        maxWidth: "90vw",
                        maxHeight: "80vh",
                      }}
                    >
                      <div className="flex items-center justify-between p-3 lamma-feature-header cursor-grab active:cursor-grabbing">
                        <div className="flex items-center gap-2 pointer-events-none">
                          <Trophy size={16} className="text-amber-300" />
                          <h3 className="font-black text-white text-sm">
                            الألعاب والتحديات
                          </h3>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowGamesDropdown(false);
                          }}
                          className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer relative z-50 lamma-danger-btn"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="p-3 text-right space-y-3">
                        <p className="text-[11px] text-gray-400 font-bold">
                          تحدى الأصدقاء واكسب نقاط XP لرفع المستوى.
                        </p>

                        <div className="grid gap-2.5">
                          <div className="p-2.5 rounded-xl hover:border-green-400 transition-all cursor-pointer flex items-center gap-2.5 lamma-list-item">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-xl">
                              🧠
                            </div>
                            <div className="flex-1">
                              <h4 className="text-[11px] font-black text-white">
                                متعة المسابقات (Trivia)
                              </h4>
                              <p className="text-[9px] text-gray-400 mt-0.5">
                                أجب على الأسئلة أسرع من الجميع
                              </p>
                            </div>
                            <button className="px-2.5 py-1.5 text-black text-[9px] font-black rounded-lg lamma-feature-primary">
                              العب الآن
                            </button>
                          </div>

                          <div className="p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 opacity-60 lamma-list-item">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-xl">
                              🧩
                            </div>
                            <div className="flex-1">
                              <h4 className="text-[11px] font-black text-white">
                                ألغاز الكلمات
                              </h4>
                              <p className="text-[9px] text-gray-400 mt-0.5">
                                اكتشف الكلمة المخفية في الشات (قريباً)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center shrink-0 lamma-composer-cluster">
                <button
                  type="button"
                  onClick={() => {
                    setShopTab("vip");
                    openModal("store");
                  }}
                  className="flex items-center justify-center text-emerald-300 transition-all relative select-none cursor-pointer xl:hidden lamma-quiet-power-btn lamma-composer-tool"
                  title="المتجر والاشتراكات التلقائية"
                >
                  <Gift size={14} strokeWidth={2.1} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-black"></span>
                </button>

                {(isOwnerRole || isAdminRole) && (
                  <div className="flex items-center shrink-0 lamma-composer-cluster">
                    {isAdminRole && !isOwnerRole && (
                      <button
                        type="button"
                        onClick={() => openModal("admin")}
                        className="flex items-center justify-center text-red-400 transition-all cursor-pointer lamma-quiet-power-btn lamma-composer-tool"
                        title="لوحة الإدارة"
                      >
                        <Shield size={14} strokeWidth={2.1} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Radio Dropdown Container */}
              <div
                className={`relative dropdown-container xl:hidden ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const isOwner = currentUser.role === "owner";
                    const perm =
                      memberCustomPermissions[currentUser.nickname]
                        ?.musicRadioAllowed;
                    if (!isOwner && !perm) {
                      alert(
                        "⚠️ عذراً: ميزة راديو لمة غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 📻",
                      );
                      return;
                    }
                    toggleDropdown("radio");
                  }}
                  className={`flex items-center justify-center transition-all lamma-composer-tool ${showRadioDropdown ? "lamma-quiet-power-btn-active text-green-300" : "text-gray-400 hover:text-white lamma-quiet-power-btn"}`}
                  title="راديو لمة"
                >
                  <Radio size={14} />
                </button>

                <AnimatePresence>
                  {showRadioDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full right-0 mb-4 w-[280px] rounded-2xl z-50 overflow-hidden flex flex-col lamma-feature-shell"
                    >
                      <div className="flex items-center justify-between p-3 lamma-feature-header">
                        <div className="flex items-center gap-2">
                          <Radio
                            size={14}
                            strokeWidth={2.1}
                            className="text-green-300"
                          />
                          <h3 className="font-black text-white text-xs">
                            بث راديو لمة المباشر
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowRadioDropdown(false)}
                          className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer lamma-feature-action"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="p-4 text-center flex flex-col items-center space-y-3">
                        <div
                          className={`w-14 h-14 rounded-full bg-gradient-to-tr from-green-600 to-yellow-400 p-0.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] ${isRadioPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`}
                        >
                          <div className="w-full h-full rounded-full bg-[#0a0f0c] border-[2px] border-black flex items-center justify-center text-lg">
                            <Radio size={18} className="text-green-300" />
                          </div>
                        </div>

                        {/* Radio Players/Stream selectors */}
                        <div className="w-full space-y-1 text-right">
                          {radioStations.map((station) => (
                            <button
                              key={station.id}
                              type="button"
                              onClick={() => handleSelectRadioStation(station)}
                              className={`w-full p-1.5 rounded-xl text-xs font-black flex items-center justify-between border transition-all cursor-pointer lamma-list-item ${
                                currentRadioStation.id === station.id
                                  ? "bg-green-500/10 border-green-500/20 text-green-300"
                                  : "bg-white/5 border-transparent text-gray-300"
                              }`}
                            >
                              <span>{station.name}</span>
                              <span className="text-[9px] text-gray-500">
                                {station.frequency}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 text-green-300 w-full pt-1">
                          <button
                            type="button"
                            onClick={prevRadioStation}
                            className="p-1.5 rounded-full transition-all cursor-pointer lamma-feature-action"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={toggleRadioPlay}
                            className="p-2.5 rounded-full hover:scale-105 transition-all flex items-center justify-center cursor-pointer lamma-feature-primary"
                          >
                            {isRadioPlaying ? (
                              <Pause size={18} />
                            ) : (
                              <Play size={18} className="ml-0.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={nextRadioStation}
                            className="p-1.5 rounded-full transition-all cursor-pointer lamma-feature-action"
                          >
                            <ChevronLeft size={18} />
                          </button>
                        </div>

                        {/* Playing Status label */}
                        <div className="text-[9.5px] font-bold lamma-soft-status">
                          {isRadioPlaying
                            ? `جاري تشغيل: ${currentRadioStation.name} 🔊`
                            : "الراديو متوقف مؤقتاً"}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Music Dropdown Container */}
              <div
                className={`relative dropdown-container xl:hidden ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const isOwner = currentUser.role === "owner";
                    const perm =
                      memberCustomPermissions[currentUser.nickname]
                        ?.musicRadioAllowed;
                    if (!isOwner && !perm) {
                      alert(
                        "⚠️ عذراً: ميزة غناء وموسيقى لمة غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 🎵",
                      );
                      return;
                    }
                    toggleDropdown("music");
                  }}
                  className={`flex items-center justify-center transition-all lamma-composer-tool ${showMusicDropdown ? "lamma-quiet-power-btn-active text-cyan-300" : "text-gray-400 hover:text-white lamma-quiet-power-btn"}`}
                  title="موسيقى وغناء"
                >
                  <Music size={14} />
                </button>

                <AnimatePresence>
                  {showMusicDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full right-0 mb-4 w-[280px] rounded-2xl z-50 overflow-hidden flex flex-col lamma-feature-shell"
                    >
                      <div className="flex items-center justify-between p-3 lamma-feature-header">
                        <div className="flex items-center gap-2">
                          <Music
                            size={14}
                            strokeWidth={2.1}
                            className="text-cyan-300"
                          />
                          <h3 className="font-sans font-black text-white text-xs">
                            مكتبة أغاني وموسيقى لمة
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowMusicDropdown(false)}
                          className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer lamma-feature-action"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="p-4 text-center flex flex-col items-center space-y-3">
                        <div
                          className={`w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.2)] ${isMusicPlaying ? "animate-[spin_6s_linear_infinite]" : ""}`}
                        >
                          <div className="w-full h-full rounded-full bg-[#0a0f0c] border-[2px] border-black flex items-center justify-center text-lg">
                            <Music size={18} className="text-cyan-300" />
                          </div>
                        </div>

                        {/* Track selector list */}
                        <div className="w-full space-y-1 text-right">
                          {musicTracks.map((track) => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => handleSelectMusicTrack(track)}
                              className={`w-full p-1.5 rounded-xl text-xs font-black flex items-center justify-between border transition-all cursor-pointer lamma-list-item ${
                                currentMusicTrack.id === track.id
                                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                                  : "bg-white/5 border-transparent text-gray-300"
                              }`}
                            >
                              <span>{track.title}</span>
                              <span className="text-[9px] text-gray-500">
                                {track.desc}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 text-cyan-300 w-full pt-1">
                          <button
                            type="button"
                            onClick={prevMusicTrack}
                            className="p-1.5 rounded-full transition-all cursor-pointer lamma-feature-action"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={toggleMusicPlay}
                            className="p-2.5 rounded-full hover:scale-105 transition-all flex items-center justify-center cursor-pointer lamma-feature-primary"
                          >
                            {isMusicPlaying ? (
                              <Pause size={18} />
                            ) : (
                              <Play size={18} className="ml-0.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={nextMusicTrack}
                            className="p-1.5 rounded-full transition-all cursor-pointer lamma-feature-action"
                          >
                            <ChevronLeft size={18} />
                          </button>
                        </div>

                        {/* Playing status */}
                        <div className="text-[9.5px] font-bold lamma-soft-status">
                          {isMusicPlaying
                            ? `جاري الاستماع: ${currentMusicTrack.title} 🔊`
                            : "المشغل متوقف مؤقتاً"}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => handleSendAttachment("audio")}
                className={`items-center justify-center text-gray-400 hover:text-white transition-all lamma-toolbar-btn lamma-composer-tool ${isPostsRoom ? "hidden" : "flex"}`}
                title="تسجيل صوتي"
              >
                <Mic size={14} />
              </button>

              <div
                className={`relative dropdown-container ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDropdown("emoji")}
                  className="flex items-center justify-center text-[#b7d96d] transition-all lamma-toolbar-btn lamma-composer-tool"
                  title="إيموجي"
                >
                  <Smile size={14} />
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full right-0 mb-4 rounded-2xl p-3 w-64 z-50 max-h-[300px] flex flex-col lamma-popover-shell"
                    >
                      <div className="text-[10px] text-gray-400 font-bold mb-2 flex-shrink-0">
                        الرموز التعبيرية
                      </div>
                      <div className="grid grid-cols-6 gap-2 overflow-y-auto">
                        {EMOTICONS.map((e) => (
                          <button
                            key={e}
                            onClick={() => {
                              setInputText((prev) => prev + e);
                              setShowEmojiPicker(false);
                            }}
                            className="p-1 hover:bg-white/10 rounded-lg text-xl transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isPostsRoom && (
                <div className="lamma-post-composer-note">
                  {canPublishPosts
                    ? "📰 اكتب منشورك هنا. استخدم Enter لسطر جديد و Ctrl+Enter للنشر."
                    : "👀 يمكن للجميع مشاهدة المنشورات، لكن النشر متاح للأعضاء المسجلين فقط."}
                </div>
              )}

              <textarea
                ref={messageInputRef}
                id="messageInput"
                name="messageInput"
                autoComplete="off"
                rows={isPostsRoom ? 3 : 1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (!isPostsRoom && e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                  if (
                    isPostsRoom &&
                    e.key === "Enter" &&
                    (e.ctrlKey || e.metaKey)
                  ) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isPostsRoom && !canPublishPosts}
                placeholder={
                  isPostsRoom
                    ? canPublishPosts
                      ? "اكتب منشورك العام هنا..."
                      : "المشاهدة متاحة للجميع، والنشر للمسجلين فقط"
                    : "اكتب رسالة..."
                }
                className={`flex-1 min-w-[120px] bg-transparent border-0 focus:ring-0 text-xs focus:outline-none px-2 text-right lamma-composer-field ${isPostsRoom ? "min-h-[76px] resize-none py-2" : "h-9 resize-none py-2 leading-5"}`}
              />

              <div className="relative dropdown-container flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleDropdown("settings" as any)}
                  className={`transition-all cursor-pointer mx-0.5 sm:mx-1 flex items-center justify-center lamma-composer-tool ${showSettingsDropdown ? "bg-white/10 text-white" : "text-gray-400 hover:text-white lamma-toolbar-btn"}`}
                  title="الإعدادات"
                >
                  <SettingsIcon size={16} />
                </button>

                <AnimatePresence>
                  {showSettingsDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed bottom-24 right-4 md:right-10 w-48 max-h-[70vh] rounded-2xl z-[99] flex flex-col overflow-hidden pb-1 lamma-popover-shell"
                    >
                      <div className="flex items-center justify-between p-2.5 border-b border-green-500/20 bg-black/40 cursor-grab active:cursor-grabbing">
                        <div className="text-[10px] text-gray-400 font-bold pointer-events-none">
                          إعدادات الدردشة
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeFloatingUi();
                          }}
                          className="p-1 rounded text-gray-400 hover:text-white transition-all cursor-pointer relative z-50 float-left lamma-feature-action"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">
                        <button
                          type="button"
                          title="اختيار لون للنص المحدد"
                          className="text-right p-1.5 rounded-lg text-xs text-gray-200 transition-all cursor-pointer lamma-list-item hover:bg-white/10"
                          onClick={applyComposerColor}
                        >
                          تغيير لون الخط
                        </button>
                        <button
                          type="button"
                          title="تطبيق الخط المائل على النص المحدد"
                          className="text-right p-1.5 rounded-lg text-xs text-gray-200 transition-all cursor-pointer lamma-list-item hover:bg-white/10"
                          onClick={() =>
                            wrapComposerSelection("*", "*", "نص مائل")
                          }
                        >
                          الخط المائل
                        </button>
                        <button
                          type="button"
                          title="تطبيق الخط العريض على النص المحدد"
                          className="text-right p-1.5 rounded-lg text-xs text-gray-200 transition-all cursor-pointer lamma-list-item hover:bg-white/10"
                          onClick={() =>
                            wrapComposerSelection("**", "**", "نص عريض")
                          }
                        >
                          الخط العريض
                        </button>
                        <button
                          className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                            readingMode
                              ? "bg-white/10 text-emerald-200 border border-white/10"
                              : "hover:bg-white/10 text-gray-200"
                          }`}
                          onClick={() => setReadingMode((prev) => !prev)}
                        >
                          <span>وضع الكتابة المريحة</span>
                          <span className="text-[9px] font-mono">
                            {readingMode ? "ON" : "OFF"}
                          </span>
                        </button>
                        <button
                          className="text-right p-1.5 hover:bg-white/10 rounded-lg text-xs text-white transition-all cursor-pointer flex items-center justify-between lamma-list-item"
                          onClick={() => {
                            setShowThemeSettingsModal(true);
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span className="flex items-center gap-1.5">
                            <Palette size={13} className="text-pink-400" />
                            <span>تخصيص ثيم التطبيق 🎨</span>
                          </span>
                        </button>
                        <button
                          className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                            isAdsEnabled
                              ? "bg-white/10 text-yellow-200 border border-white/10"
                              : "hover:bg-white/10 text-gray-200"
                          }`}
                          onClick={() => {
                            setIsAdsEnabled(!isAdsEnabled);
                          }}
                        >
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-yellow-400" />
                            <span>شريط الإعلانات 📢</span>
                          </span>
                          <span className="text-[9px] font-mono">
                            {isAdsEnabled ? "ON" : "OFF"}
                          </span>
                        </button>
                        <div className="h-px bg-white/5 my-0.5" />
                        <div className="px-1 text-[10px] text-gray-400 font-bold">
                          ثيم الشات
                        </div>
                        <button
                          className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                            chatTheme === "classic"
                              ? "bg-white/10 text-amber-100 border border-white/10"
                              : "hover:bg-white/10 text-gray-200"
                          }`}
                          onClick={() => {
                            setChatTheme("classic");
                            setHasUserChosenChatTheme(true);
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>Classic</span>
                          <span className="text-[9px] font-mono">
                            {chatTheme === "classic" ? "ON" : ""}
                          </span>
                        </button>
                        <button
                          className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                            chatTheme === "night-paper"
                              ? "bg-white/10 text-amber-200 border border-white/10"
                              : "hover:bg-white/10 text-gray-200"
                          }`}
                          onClick={() => {
                            setChatTheme("night-paper");
                            setHasUserChosenChatTheme(true);
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>Night Paper</span>
                          <span className="text-[9px] font-mono">
                            {chatTheme === "night-paper" ? "ON" : ""}
                          </span>
                        </button>
                        <button
                          className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                            chatTheme === "charcoal-calm"
                              ? "bg-white/10 text-slate-200 border border-white/10"
                              : "hover:bg-white/10 text-gray-200"
                          }`}
                          onClick={() => {
                            setChatTheme("charcoal-calm");
                            setHasUserChosenChatTheme(true);
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>Charcoal Calm</span>
                          <span className="text-[9px] font-mono">
                            {chatTheme === "charcoal-calm" ? "ON" : ""}
                          </span>
                        </button>
                        <button
                          className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                            chatTheme === "olive-ink"
                              ? "bg-white/10 text-emerald-200 border border-white/10"
                              : "hover:bg-white/10 text-gray-200"
                          }`}
                          onClick={() => {
                            setChatTheme("olive-ink");
                            setHasUserChosenChatTheme(true);
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>Olive Ink</span>
                          <span className="text-[9px] font-mono">
                            {chatTheme === "olive-ink" ? "ON" : ""}
                          </span>
                        </button>
                        <button
                          className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                            chatTheme === "violet-night"
                              ? "bg-white/10 text-violet-200 border border-white/10"
                              : "hover:bg-white/10 text-gray-200"
                          }`}
                          onClick={() => {
                            setChatTheme("violet-night");
                            setHasUserChosenChatTheme(true);
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>Violet Night</span>
                          <span className="text-[9px] font-mono">
                            {chatTheme === "violet-night" ? "ON" : ""}
                          </span>
                        </button>
                        <div className="h-px bg-white/5 my-0.5" />
                        <button
                          className="text-right p-1.5 hover:bg-white/10 rounded-lg text-xs text-green-300 transition-all cursor-pointer flex items-center justify-between lamma-list-item"
                          onClick={() => {
                            handleCopyLink();
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>رابط الدعوة (Invite Link)</span>
                          <Share2 size={12} />
                        </button>
                        <div className="h-px bg-white/5 my-0.5" />
                        <button
                          className="text-right p-1.5 hover:bg-red-500/20 rounded-lg text-xs text-red-400 transition-all cursor-pointer flex items-center justify-between font-bold lamma-list-item"
                          onClick={() => {
                            setRoomMessages((prev) => ({
                              ...prev,
                              [activeRoomId]: [],
                            }));
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>مسح الشات</span>
                          <X size={12} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isPostsRoom && !canPublishPosts}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all flex-shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed lamma-send-orb"
                title={isPostsRoom ? "نشر" : "إرسال"}
              >
                <Send size={15} className="rotate-180" />
              </button>
            </div>
          </div>

          {/* End of content */}
        </div>

        <aside
          className={`hidden xl:flex xl:order-1 flex-col gap-3 overflow-hidden backdrop-blur-xl transition-all duration-300 ${
            isRightColumnCollapsed
              ? "w-0 p-0 opacity-0 pointer-events-none border-none"
              : "w-[320px] 2xl:w-[340px] px-1 pt-0 pb-0 opacity-100 border-l border-white/8 lamma-column-frame lamma-column-shell lamma-side-column"
          }`}
        >
          <div
            ref={rightColumnLayoutRef}
            className="flex-1 min-h-0 grid gap-0"
            style={{
              gridTemplateRows: `${rightColumnSectionsPct.rooms}fr 12px ${rightColumnSectionsPct.members}fr`,
            }}
          >
            <div className="min-h-0">
              <div className="lamma-glass rounded-3xl p-3 overflow-hidden flex flex-col min-h-0 h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[color:var(--accent-secondary)]">
                    <BookOpen
                      size={15}
                      className="text-[color:var(--accent-secondary)]"
                    />
                    <span className="text-[12px] font-black">الغرف</span>
                  </div>
                  <span className="text-[10px] text-[color:var(--text-secondary)] font-mono">
                    {visibleRoomCount}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 pl-2 space-y-3 lamma-fire-scroll">
                  {(isOwnerRole ||
                    memberCustomPermissions[currentUser.nickname]
                      ?.roomCreationAllowed) && (
                    <button
                      type="button"
                      onClick={() => setIsCreateRoomModalOpen(true)}
                      className="w-full p-2.5 bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.25)] rounded-2xl flex items-center justify-center gap-2 text-[color:var(--accent-primary)] font-extrabold text-[11px] hover:bg-[rgba(16,185,129,0.18)] transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>إنشاء غرفة</span>
                    </button>
                  )}

                  {(() => {
                    const visibleRooms = availableRooms.filter((room) => {
                      if (room.id === "owner" && !isOwnerRole) {
                        return false;
                      }
                      if (room.id === "admin" && !isAdminRole && !isOwnerRole) {
                        return false;
                      }
                      return true;
                    });

                    return ROOM_CATEGORIES.map((category) => {
                      const rooms = visibleRooms.filter(
                        (r: any) => r.category === category.id,
                      );
                      if (rooms.length === 0) return null;

                      return (
                        <div key={category.id} className="space-y-2">
                          <div className="text-[10px] text-[color:var(--accent-secondary)] font-extrabold tracking-widest uppercase pb-1 border-b border-white/5 flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </div>
                          <div className="space-y-1.5">
                            {rooms.map((room: any) => (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() => {
                                  if (
                                    !openRooms.find((r) => r.id === room.id)
                                  ) {
                                    setOpenRooms((prev) => [
                                      ...prev,
                                      {
                                        id: room.id,
                                        name: room.name,
                                        flag: room.icon,
                                      },
                                    ]);
                                  }
                                  handleSwitchRoom(room.id);
                                }}
                                className={`w-full p-2.5 rounded-2xl transition-all text-xs font-black cursor-pointer flex items-center justify-between ${
                                  room.id === activeRoomId
                                    ? "bg-[rgba(16,185,129,0.10)] border border-[rgba(16,185,129,0.35)] text-[color:var(--accent-primary)] lamma-soft-glow lamma-room-list-card"
                                    : "text-gray-200 lamma-room-list-card"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{room.icon}</span>
                                  <span>{room.name}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9px] text-[color:var(--accent-secondary)] font-black font-mono lamma-room-count-pill">
                                  {room.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div
              className="lamma-fire-divider"
              onPointerDown={(e) => {
                if (!rightColumnLayoutRef.current) return;
                e.preventDefault();
                const rect =
                  rightColumnLayoutRef.current.getBoundingClientRect();
                const startY = e.clientY;
                const start = { ...rightColumnSectionsPct };
                const minPct = 22;
                const onMove = (ev: PointerEvent) => {
                  const dy = ev.clientY - startY;
                  const deltaPct = (dy / rect.height) * 100;
                  let rooms = start.rooms + deltaPct;
                  let members = start.members - deltaPct;
                  if (rooms < minPct) {
                    members -= minPct - rooms;
                    rooms = minPct;
                  }
                  if (members < minPct) {
                    rooms -= minPct - members;
                    members = minPct;
                  }
                  const total = rooms + members;
                  const scale = 100 / total;
                  setRightColumnSectionsPct({
                    rooms: rooms * scale,
                    members: members * scale,
                  });
                };
                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            />

            <div className="min-h-0">
              <div className="lamma-glass rounded-3xl p-3 overflow-hidden flex flex-col min-h-0 h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[color:var(--accent-secondary)]">
                    <Users
                      size={15}
                      className="text-[color:var(--accent-secondary)]"
                    />
                    <span className="text-[12px] font-black">المتصلون</span>
                  </div>
                  <span className="text-[10px] text-[color:var(--text-secondary)] font-mono">
                    {chatMembers.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 pl-2 space-y-4 lamma-fire-scroll">
                  <div className="text-[10px] font-black flex items-center justify-between uppercase tracking-widest text-gray-300">
                    <span>👥 Connected</span>
                    <span className="text-[9px] font-mono text-[color:var(--text-secondary)]">
                      {orderedChatMembers.length}
                    </span>
                  </div>
                  <div className="space-y-0 rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
                    {orderedChatMembers.slice(0, 24).map((m, idx) => {
                      const cleanName = getShortenedNickname(m.nickname);
                      const isCurrentUser =
                        m.nickname === myActiveSession.nickname;
                      const actualRole = getRoleFromAuthor(
                        m.nickname,
                        myActiveSession,
                        chatMembers,
                      );
                      const isBasicMember =
                        m.role === "user" || m.role === "guest";
                      const isPlatinumVip =
                        actualRole === "platinum_vip" ||
                        (isCurrentUser && myVisualRole === "platinum_vip");

                      return (
                        <div
                          key={m.id}
                          onClick={() => openMemberProfile(m.nickname)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openMemberProfile(m.nickname);
                          }}
                          className={`p-2 px-2.5 hover:bg-white/5 flex items-center justify-between cursor-pointer transition-all ${idx !== Math.min(orderedChatMembers.length, 24) - 1 ? "border-b border-white/5" : ""}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            {isBasicMember ? (
                              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/5 rounded-full border border-white/10 text-[20px]">
                                {m.avatar}
                              </div>
                            ) : (
                              <div className="flex-shrink-0 flex items-center justify-center">
                                <AMLogo
                                  size={24}
                                  variant="circular"
                                  glow={isCurrentUser}
                                  crownRole={
                                    (actualRole === "platinum_vip"
                                      ? "vip"
                                      : actualRole) as any
                                  }
                                  frame={getFrameFromAuthor(
                                    m.nickname,
                                    myActiveSession,
                                    chatMembers,
                                  )}
                                />
                              </div>
                            )}
                            <div className="flex flex-col truncate flex-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span
                                  style={{ color: m.color }}
                                  className={`font-bold text-[12px] truncate leading-tight ${isPlatinumVip ? "animate-[pulse_1.5s_infinite] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400" : ""}`}
                                >
                                  {cleanName}
                                </span>
                                {isCurrentUser && activeTempEntryTopic && (
                                  <span className="max-w-[110px] truncate rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5 text-[7px] text-cyan-200">
                                    {activeTempEntryTopic}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="lamma-icon-dot shrink-0 ml-1.5" />
                        </div>
                      );
                    })}
                    {orderedChatMembers.length > 24 ? (
                      <div className="p-2 text-[10px] text-[color:var(--text-secondary)] font-bold text-center lamma-section-card">
                        +{orderedChatMembers.length - 24} المزيد
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ----------------- PANEL 5: FLOATING PRIVATE CONVERSATION WINDOW ----------------- */}
        <motion.aside
          drag={mobileTab !== "private"}
          dragMomentum={false}
          className={`flex-col justify-between flex-shrink-0 z-50 ${
            mobileTab === "private"
              ? "absolute inset-0 w-full flex lamma-panel-shell"
              : isPmOpen
                ? "hidden md:flex fixed bottom-6 left-6 w-80 h-[450px] rounded-2xl lamma-modal-shell"
                : "hidden"
          }`}
          style={
            mobileTab !== "private" && isPmOpen
              ? {
                  resize: "both",
                  overflow: "hidden",
                  minWidth: "250px",
                  minHeight: "300px",
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                }
              : undefined
          }
        >
          {pmTarget ? (
            <>
              {/* Header of private messaging panel matching exactly standard visual style */}
              <div className="p-3.5 flex items-center justify-between cursor-move touching-none lamma-modal-header">
                <div className="flex items-center gap-2.5 text-right">
                  <span className="lamma-icon-dot" />
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                      <span>{pmTarget.nickname}</span>
                      {pmTarget.role === "platinum_vip" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-plat">
                          PLATINUM VIP
                        </span>
                      ) : pmTarget.role === "vip" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-vip">
                          VIP
                        </span>
                      ) : pmTarget.role === "owner" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-owner">
                          OWNER
                        </span>
                      ) : pmTarget.role === "admin" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-admin">
                          ADMIN
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[9px] text-gray-400 font-bold">
                      متصل الآن
                    </div>
                  </div>
                </div>

                {/* Calling trigger buttons on right of header */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const isOwner = currentUser.role === "owner";
                      const perm =
                        memberCustomPermissions[currentUser.nickname]?.callsAllowed;
                      if (!isOwner && !perm) {
                        alert(
                          "⚠️ عذراً: ميزة المكالمات الصوتية والمرئية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 📞",
                        );
                        return;
                      }
                      const normalizedRole = currentUser.role.toLowerCase();
                      if (
                        normalizedRole === "guest" ||
                        normalizedRole === "زائر"
                      ) {
                        alert(
                          "👤 تنبيه العضوية: رتبة زائر غير مصرح لها بإجراء المكالمات الصوتية والمرئية! يرجى غلق الجلسة والتسجيل كعضو للاستفادة بكافة الخدمات الفائقة 📞.",
                        );
                        return;
                      }
                      initiateCall(pmTarget.nickname, "audio");
                    }}
                    className="w-7 h-7 rounded-lg text-green-300 flex items-center justify-center lamma-quiet-power-btn"
                    title="الاتصال الهاتفي"
                  >
                    <Phone size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const isOwner = currentUser.role === "owner";
                      const perm =
                        memberCustomPermissions[currentUser.nickname]?.callsAllowed;
                      if (!isOwner && !perm) {
                        alert(
                          "⚠️ عذراً: ميزة المكالمات الصوتية والمرئية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 📞",
                        );
                        return;
                      }
                      const normalizedRole = currentUser.role.toLowerCase();
                      if (
                        normalizedRole === "guest" ||
                        normalizedRole === "زائر"
                      ) {
                        alert(
                          "👤 تنبيه العضوية: رتبة زائر غير مصرح لها بإجراء المكالمات الصوتية والمرئية! يرجى غلق الجلسة والتسجيل كعضو للاستفادة بكافة الخدمات الفائقة 📞.",
                        );
                        return;
                      }
                      initiateCall(pmTarget.nickname, "video");
                    }}
                    className="w-7 h-7 rounded-lg text-[#c1d86a] flex items-center justify-center lamma-quiet-power-btn"
                    title="مكالمة الفيديو"
                  >
                    <VideoIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert("🖥️ جاري بدء مشاركة الشاشة... (محاكاة)");
                      setPmThreads((prev) => ({
                        ...prev,
                        [pmTarget.nickname]: [
                          ...(prev[pmTarget.nickname] || []),
                          {
                            text: "🖥️ يشارك شاشته معك...",
                            isOwn: true,
                            time: new Date().toLocaleTimeString("ar-EG", {
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            }),
                            status: "sent",
                          },
                        ],
                      }));
                    }}
                    className="w-7 h-7 rounded-lg text-teal-300 flex items-center justify-center lamma-quiet-power-btn"
                    title="مشاركة الشاشة"
                  >
                    <Tv size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (mobileTab === "private") setMobileTab("chat");
                      else setIsPmOpen(false);
                    }}
                    className="w-7 h-7 ml-1 rounded-lg text-gray-400 flex items-center justify-center lamma-soft-action"
                    title="إغلاق"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* PM conversation log viewport */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {pmMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${msg.isOwn ? "mr-auto items-start" : "ml-auto items-end"}`}
                  >
                    <div
                      className={`p-2.5 rounded-2xl text-xs leading-normal ${
                        msg.isOwn
                          ? "bg-white/12 border border-white/10 text-white font-extrabold rounded-tr-none"
                          : "bg-black/40 border border-white/8 text-gray-100 rounded-tl-none"
                      }`}
                    >
                      {msg.mediaUrl ? (
                        <img
                          src={msg.mediaUrl}
                          alt="مرفق"
                          className="max-w-[220px] max-h-[220px] rounded-xl mb-1.5 object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      {msg.text ? (
                        <div className="m-0 text-right">
                          {renderTextMessageWithMedia(msg.text)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] text-gray-500 font-mono">
                        {msg.time}
                      </span>
                      {msg.isOwn && (
                        <span
                          className={`text-[10px] ${
                            msg.status === "read"
                              ? "text-blue-400"
                              : msg.status === "delivered"
                                ? "text-gray-300"
                                : "text-gray-500"
                          }`}
                        >
                          {msg.status === "read"
                            ? "✓✓"
                            : msg.status === "delivered"
                              ? "✓✓"
                              : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <AnimatePresence>
                  {isPmTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="flex items-center gap-2 mb-2 w-fit"
                    >
                      <div className="bg-white/5 px-3 py-1.5 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></span>
                        <span
                          className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></span>
                        <span
                          className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></span>
                        <span className="text-[9px] text-gray-400 mr-2">
                          {pmTarget.nickname} يكتب الان...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={pmEndRef} />
              </div>

              {/* PM input toolbar container */}
              <div className="p-3.5 border-t border-green-500/10 bg-black/40 relative">
                {/* Emoji Picker Popup for PM */}
                <AnimatePresence>
                  {showPmEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute bottom-16 right-3 bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-xl rounded-2xl p-2 grid grid-cols-4 gap-1 z-50 w-52 overflow-y-auto max-h-40 lamma-popover-shell"
                    >
                      {EMOTICONS.map((e) => (
                        <button
                          key={e}
                          onClick={() => setPmInputText((prev) => prev + e)}
                          className="p-1 hover:bg-green-500/10 rounded-lg text-lg flex items-center justify-center transition-all"
                        >
                          {e}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attachment Popup */}
                <AnimatePresence>
                  {showPmAttachment && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-16 right-10 bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-xl rounded-2xl p-2 grid grid-cols-1 gap-1 z-50 w-40 lamma-popover-shell"
                    >
                      <button
                        className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right"
                        onClick={() => {
                          setShowPmAttachment(false);
                          if (isUploadingImage) return;
                          if (currentUser.authProvider !== "supabase") {
                            alert(
                              "📸 رفع الصور متاح للحسابات المسجلة فقط. سجل دخول الأول.",
                            );
                            return;
                          }
                          pmImageUploadInputRef.current?.click();
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Image size={14} />
                        </div>
                        <span>صورة</span>
                      </button>
                      <button
                        className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right"
                        onClick={() => setShowPmAttachment(false)}
                      >
                        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                          <Tv size={14} />
                        </div>
                        <span>يوتيوب</span>
                      </button>
                      <button
                        className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right"
                        onClick={() => setShowPmAttachment(false)}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                          <VideoIcon size={14} />
                        </div>
                        <span>فيديو</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center lamma-composer-cluster bg-black/60 rounded-xl px-2.5 py-1.5 border border-green-500/10">
                  <button
                    type="button"
                    onClick={() => setShowPmEmojiPicker(!showPmEmojiPicker)}
                    className={`flex items-center justify-center transition-all lamma-composer-tool ${
                      showPmEmojiPicker
                        ? "bg-green-500/20 text-[#a3e635]"
                        : "text-gray-500 hover:bg-white/10 hover:text-[#a3e635]"
                    }`}
                    title="إيموجي"
                  >
                    <Smile size={16} />
                  </button>
                  <button
                    type="button"
                    className={`flex items-center justify-center transition-all lamma-composer-tool ${
                      showPmAttachment
                        ? "bg-green-500/20 text-green-400"
                        : "text-gray-500 hover:bg-white/10 hover:text-green-400"
                    }`}
                    title="إلحاق ملف"
                    onClick={() => setShowPmAttachment(!showPmAttachment)}
                  >
                    <Plus
                      size={16}
                      className={`transition-transform duration-300 ${showPmAttachment ? "rotate-45" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={applyPmComposerColor}
                    className="flex items-center justify-center transition-all lamma-composer-tool text-gray-500 hover:bg-white/10 hover:text-fuchsia-300"
                    title="تغيير لون الخط"
                  >
                    <Palette size={16} />
                  </button>

                  <input
                    ref={pmInputRef}
                    id="pmInputText"
                    name="pmInputText"
                    type="text"
                    autoComplete="off"
                    value={pmInputText}
                    onChange={(e) => setPmInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendPM();
                    }}
                    placeholder="اكتب على راحتك..."
                    className="flex-1 bg-transparent border-none text-right font-semibold text-[11px] text-white focus:ring-0 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleSendPM}
                    className="w-6 h-6 rounded-lg flex items-center justify-center lamma-send-orb"
                  >
                    <Send size={11} className="rotate-180" />
                  </button>
                </div>
                <input
                  ref={pmImageUploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePmImageUploadChange}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-[var(--theme-primary)]">
                <MessageCircle size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white">
                  لا توجد محادثة محددة
                </h3>
                <p className="text-[11px] leading-6 text-gray-400 max-w-xs">
                  افتح محادثة من قائمة الرسائل الخاصة أو من ملف أي عضو بدل
                  فتح الخاص تلقائيًا على اسم افتراضي.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPmListDropdown(true)}
                  className="px-3 py-2 rounded-xl text-[11px] font-black text-white lamma-soft-action"
                >
                  المحادثات الخاصة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileTab("members");
                    setActiveSidebarTab("members");
                    setIsSidebarOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl text-[11px] font-black text-gray-300 lamma-soft-action"
                >
                  المتصلون
                </button>
              </div>
            </div>
          )}
        </motion.aside>
      </div>

      {/* ================= MODALS OVERLAYS ================= */}
      <AnimatePresence>
        {activeModal && !hasFloatingDropdownOpen && (
          <motion.div
            drag
            dragConstraints={{ left: -400, right: 400, top: -200, bottom: 200 }}
            dragMomentum={false}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed top-12 left-[5%] sm:left-[10%] md:left-[20%] w-[90vw] sm:w-[80vw] md:w-[60vw] max-w-[800px] z-[120] bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.06)] flex flex-col backdrop-blur-xl lamma-modal-shell"
            style={{
              resize: "both",
              overflow: "hidden",
              minWidth: "300px",
              minHeight: "400px",
              maxHeight: "85vh",
            }}
          >
            <div className="flex flex-col w-full h-full min-h-0">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.04] cursor-grab active:cursor-grabbing shrink-0 lamma-modal-header">
                <div className="flex items-center gap-2 pointer-events-none">
                  <span className="text-lg flex items-center justify-center">
                    {(activeModal === "leadership" ||
                      activeModal === "owner") && (
                      <Crown size={18} className="text-yellow-300" />
                    )}
                    {activeModal === "admin" && (
                      <Shield size={18} className="text-sky-300" />
                    )}
                    {activeModal === "guard" && (
                      <ShieldAlert size={18} className="text-lime-300" />
                    )}
                    {activeModal === "store" && (
                      <Gift size={18} className="text-emerald-300" />
                    )}
                  </span>
                  <h3 className="font-sans font-black text-white text-sm">
                    {activeModal === "leadership" &&
                      "غرفة القيادة • مركز عمليات المالك"}
                    {activeModal === "owner" &&
                      "لوحة تحكم سيادة المالك (Owner's Dashboard)"}
                    {activeModal === "admin" &&
                      "لوحة الإدارة الشاملة (Admin Dashboard)"}
                    {activeModal === "guard" &&
                      "حماة لمة الغالية • Lamma Guard Center"}
                    {activeModal === "store" &&
                      "المركز الذكي للأتمتة والمتجر التلقائي"}
                  </h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModal(null);
                  }}
                  className="p-1.5 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer relative z-50"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body scrollable area */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 text-right space-y-4">
                {activeModal === "leadership" && (
                  <div className="space-y-4 select-none" dir="rtl">
                    <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h5 className="text-xs font-black text-cyan-300">
                            طلبات تغيير الاسم
                          </h5>
                          <p className="text-[10px] text-gray-400 mt-1">
                            هنا تظهر طلبات الأعضاء لتغيير الاسم بعد التسجيل، وتحتاج
                            موافقة المالك.
                          </p>
                        </div>
                        <div className="text-[10px] font-black text-cyan-300 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                          {
                            nicknameRequests.filter(
                              (request) => request.status === "pending",
                            ).length
                          }{" "}
                          طلب
                        </div>
                      </div>

                      <div className="space-y-2">
                        {nicknameRequests.length === 0 ? (
                          <div className="text-[10px] text-gray-500 font-bold text-center py-3">
                            لا توجد طلبات تغيير اسم حالياً.
                          </div>
                        ) : (
                          nicknameRequests.slice(0, 6).map((request) => (
                            <div
                              key={request.id}
                              className="p-3 rounded-2xl border border-white/5 bg-black/30 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[11px] font-black text-white">
                                  {request.current_nickname} →{" "}
                                  <span className="text-cyan-300">
                                    {request.requested_nickname}
                                  </span>
                                </div>
                                <div
                                  className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                                    request.status === "approved"
                                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                      : request.status === "rejected"
                                        ? "bg-red-500/10 text-red-300 border border-red-500/20"
                                        : "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                                  }`}
                                >
                                  {request.status === "approved"
                                    ? "تمت الموافقة"
                                    : request.status === "rejected"
                                      ? "مرفوض"
                                      : "قيد المراجعة"}
                                </div>
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono break-all">
                                {request.user_email || "بدون بريد ظاهر"}
                              </div>
                              {request.status === "pending" && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={nicknameRequestLoading}
                                    onClick={() =>
                                      request.id &&
                                      handleProcessNicknameRequest(
                                        request.id,
                                        "approved",
                                      )
                                    }
                                    className="flex-1 py-2 rounded-xl text-[10px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                  >
                                    موافقة
                                  </button>
                                  <button
                                    type="button"
                                    disabled={nicknameRequestLoading}
                                    onClick={() =>
                                      request.id &&
                                      handleProcessNicknameRequest(
                                        request.id,
                                        "rejected",
                                      )
                                    }
                                    className="flex-1 py-2 rounded-xl text-[10px] font-black bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                                  >
                                    رفض
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 lamma-soft-warn">
                      <div className="space-y-1">
                        <div className="text-white text-sm font-black">
                          <span className="inline-flex items-center gap-1.5">
                            <Crown size={14} className="text-yellow-300" />
                            غرفة القيادة
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold">
                          مركز عمليات المالك الكامل: التحكم، الحماية، المتجر،
                          التصميم، والإحصائيات.
                        </div>
                      </div>
                      <div className="text-[9px] text-yellow-300 font-black px-3 py-1.5 rounded-xl lamma-soft-action">
                        صلاحية: Owner فقط
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 overflow-x-auto scroller-hidden">
                      <button
                        type="button"
                        onClick={() => setLeadershipTab("quick")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "quick"
                            ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles size={12} />
                          التحكم السريع
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadershipTab("guard")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "guard"
                            ? "bg-lime-500/15 text-lime-400 border border-lime-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Shield size={12} />
                          الحماية
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadershipTab("store")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "store"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Gift size={12} />
                          المتجر
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadershipTab("design")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "design"
                            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles size={12} />
                          مركز التصميم
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadershipTab("stats")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "stats"
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Trophy size={12} />
                          الإحصائيات
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* OWNER MODAL CONTENT */}
                {(activeModal === "owner" ||
                  (activeModal === "leadership" &&
                    leadershipTab === "quick")) && (
                  <OwnerPanelModal
                    isSpyMode={isSpyMode}
                    setIsSpyMode={setIsSpyMode}
                    isMaintenanceMode={isMaintenanceMode}
                    setIsMaintenanceMode={setIsMaintenanceMode}
                    isGlobalMute={isGlobalMute}
                    setIsGlobalMute={setIsGlobalMute}
                    isGlobalMicMute={isGlobalMicMute}
                    setIsGlobalMicMute={setIsGlobalMicMute}
                    isOnlyVIPCanSendImages={isOnlyVIPCanSendImages}
                    setIsOnlyVIPCanSendImages={setIsOnlyVIPCanSendImages}
                    bannedWords={bannedWords}
                    setBannedWords={setBannedWords}
                    addSystemActivityLog={addSystemActivityLog}
                    currentUserNickname={currentUser.nickname}
                    setBrandLogoUrl={setBrandLogoUrl}
                    setOwnerBgImage={setOwnerBgImage}
                  />
                )}

                {/* ADMIN MODAL CONTENT */}
                {activeModal === "admin" && (
                  <AdminPanelModal
                    adminTab={adminTab}
                    setAdminTab={setAdminTab}
                    activityLogs={activityLogs}
                    bannedUsersList={bannedUsersList}
                    storeProducts={storeProducts}
                    chatMembers={chatMembers}
                    isMaintenanceMode={isMaintenanceMode}
                    setIsMaintenanceMode={setIsMaintenanceMode}
                    isGlobalMute={isGlobalMute}
                    setIsGlobalMute={setIsGlobalMute}
                    isGlobalMicMute={isGlobalMicMute}
                    setIsGlobalMicMute={setIsGlobalMicMute}
                    isAdsEnabled={isAdsEnabled}
                    setIsAdsEnabled={setIsAdsEnabled}
                    addSystemActivityLog={addSystemActivityLog}
                    addLammaBotMessage={addLammaBotMessage}
                    currentUser={currentUser}
                    setRoomMessages={setRoomMessages}
                    activeRoomId={activeRoomId}
                    myFingerprint={myFingerprint}
                    myBrowserSig={myBrowserSig}
                    myIp={myIp}
                    setBannedUsersList={setBannedUsersList}
                    newProdName={newProdName}
                    setNewProdName={setNewProdName}
                    newProdTab={newProdTab}
                    setNewProdTab={setNewProdTab}
                    newProdPrice={newProdPrice}
                    setNewProdPrice={setNewProdPrice}
                    newProdDesc={newProdDesc}
                    setNewProdDesc={setNewProdDesc}
                    newProdType={newProdType}
                    setNewProdType={setNewProdType}
                    newProdBadge={newProdBadge}
                    setNewProdBadge={setNewProdBadge}
                    newProdColor={newProdColor}
                    setNewProdColor={setNewProdColor}
                    newProdFrame={newProdFrame}
                    setNewProdFrame={setNewProdFrame}
                    newProdTitle={newProdTitle}
                    setNewProdTitle={setNewProdTitle}
                    newProdExt={newProdExt}
                    setNewProdExt={setNewProdExt}
                    setStoreProducts={setStoreProducts}
                    editingProduct={editingProduct}
                    setEditingProduct={setEditingProduct}
                  />
                )}

                {(activeModal === "guard" ||
                  (activeModal === "leadership" &&
                    leadershipTab === "guard")) && (
                  <GuardPanelModal
                    isBotEnabled={isBotEnabled}
                    setIsBotEnabled={setIsBotEnabled}
                    botRuleSwearFilter={botRuleSwearFilter}
                    setBotRuleSwearFilter={setBotRuleSwearFilter}
                    botRuleAntiSpam={botRuleAntiSpam}
                    setBotRuleAntiSpam={setBotRuleAntiSpam}
                    botRuleAntiLinks={botRuleAntiLinks}
                    setBotRuleAntiLinks={setBotRuleAntiLinks}
                    bannedWords={bannedWords}
                    botLogs={botLogs}
                    setBotLogs={setBotLogs}
                    activeRoomId={activeRoomId}
                    addBotSystemWarning={addBotSystemWarning}
                    setActiveModal={setActiveModal}
                  />
                )}

                {/* LAMMA AUTO-STORE AND AUTOMATION MODAL */}
                {(activeModal === "store" ||
                  (activeModal === "leadership" &&
                    leadershipTab === "store")) && (
                  <StorePanelModal
                    shopTab={shopTab}
                    setShopTab={setShopTab}
                    payStatus={payStatus}
                    setPayStatus={setPayStatus}
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                    storeProducts={storeProducts}
                    payGateway={payGateway}
                    setPayGateway={setPayGateway}
                    paymentAccountInput={paymentAccountInput}
                    setPaymentAccountInput={setPaymentAccountInput}
                    paymentLogs={paymentLogs}
                    setPaymentLogs={setPaymentLogs}
                    subscription={subscription}
                    setSubscription={setSubscription}
                    setMyActiveSession={setMyActiveSession}
                    currentUser={currentUser}
                    activeRoomId={activeRoomId}
                    addLammaBotMessage={addLammaBotMessage}
                    addSystemActivityLog={addSystemActivityLog}
                    myVisualRole={myVisualRole}
                    friendSuggestions={friendSuggestions}
                    setFriendSuggestions={setFriendSuggestions}
                    setBotLogs={setBotLogs}
                    isDbConnectionLost={isDbConnectionLost}
                    setIsDbConnectionLost={setIsDbConnectionLost}
                    setIsReconnectingDb={setIsReconnectingDb}
                    dbStatusLogs={dbStatusLogs}
                    setDbStatusLogs={setDbStatusLogs}
                    handleAccelerateDays={handleAccelerateDays}
                  />
                )}
                {activeModal === 'leadership' && leadershipTab === 'design' && (
                  <DesignCenterModal
                    isOwnerRole={isOwnerRole}
                    runAssistantAudit={runAssistantAudit}
                    queueAssistantProposal={queueAssistantProposal}
                    queueRecommendedAssistantProposal={queueRecommendedAssistantProposal}
                    assistantAudit={assistantAudit}
                    assistantFindings={assistantFindings}
                    assistantProposal={assistantProposal}
                    handleApplyAssistantProposal={handleApplyAssistantProposal}
                    setAssistantProposal={setAssistantProposal}
                    lastAppliedDesignSnapshot={lastAppliedDesignSnapshot}
                    handleRestoreLastDesignSnapshot={handleRestoreLastDesignSnapshot}
                    setWallTheme={setWallTheme}
                    wallTheme={wallTheme}
                    designPresetName={designPresetName}
                    setDesignPresetName={setDesignPresetName}
                    handleSaveDesignPreset={handleSaveDesignPreset}
                    designPresets={designPresets}
                    applyDesignPreset={applyDesignPreset}
                    handleDeleteDesignPreset={handleDeleteDesignPreset}
                    brandLogoUrl={brandLogoUrl}
                    designLogoUploadRef={designLogoUploadRef}
                    handleDesignLogoUpload={handleDesignLogoUpload}
                    designLogoInput={designLogoInput}
                    setDesignLogoInput={setDesignLogoInput}
                    setBrandLogoUrl={setBrandLogoUrl}
                    chatTheme={chatTheme}
                    setChatTheme={setChatTheme}
                    glowColor={glowColor}
                    setGlowColor={setGlowColor}
                    activeRoomId={activeRoomId}
                    openRooms={openRooms}
                    designRoomBgUploadRef={designRoomBgUploadRef}
                    handleDesignRoomBgUpload={handleDesignRoomBgUpload}
                    designRoomBgInput={designRoomBgInput}
                    setDesignRoomBgInput={setDesignRoomBgInput}
                    roomBgMap={roomBgMap}
                    setRoomBgMap={setRoomBgMap}
                    designOwnerBgUploadRef={designOwnerBgUploadRef}
                    handleDesignOwnerBgUpload={handleDesignOwnerBgUpload}
                    designOwnerBgInput={designOwnerBgInput}
                    setDesignOwnerBgInput={setDesignOwnerBgInput}
                    setOwnerBgImage={setOwnerBgImage}
                  />
                )}
                {activeModal === 'leadership' && leadershipTab === 'stats' && (
                  <StatsModal
                    chatMembers={chatMembers}
                    roomMessages={roomMessages}
                    activeRoomId={activeRoomId}
                    openRooms={openRooms}
                    bannedUsersList={bannedUsersList}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      <UserProfileModal
        showProfileModal={showProfileModal}
        selectedProfileMember={selectedProfileMember}
        setShowProfileModal={setShowProfileModal}
        setSelectedProfileMember={setSelectedProfileMember}
        myActiveSession={myActiveSession}
        currentUser={currentUser}
        isOwnerRole={isOwnerRole}
        tempEntryTopicInput={tempEntryTopicInput}
        setTempEntryTopicInput={setTempEntryTopicInput}
        setTempEntryTopicStatusText={setTempEntryTopicStatusText}
        tempEntryTopicEnabled={tempEntryTopicEnabled}
        setTempEntryTopicEnabled={setTempEntryTopicEnabled}
        handleSaveTempEntryTopic={handleSaveTempEntryTopic}
        tempEntryTopicStatusText={tempEntryTopicStatusText}
        nicknameRequestInput={nicknameRequestInput}
        setNicknameRequestInput={setNicknameRequestInput}
        nicknameRequestLoading={nicknameRequestLoading}
        handleSubmitNicknameChangeRequest={handleSubmitNicknameChangeRequest}
        nicknameRequestStatusText={nicknameRequestStatusText}
        nicknameRequests={nicknameRequests}
        setRoomMessages={setRoomMessages}
        activeRoomId={activeRoomId}
        addSystemActivityLog={addSystemActivityLog}
        bannedUsersList={bannedUsersList}
        removeBanEntries={removeBanEntries}
        addBanEntry={addBanEntry}
        chatMembers={chatMembers}
        setChatMembers={setChatMembers}
        memberCustomPermissions={memberCustomPermissions}
        setMemberCustomPermissions={setMemberCustomPermissions}
        />
      </AnimatePresence>

      {/* Modal for Creating Room */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onCreate={(details) => {
          const roomName = details.name.trim();
          if (!roomName) {
            alert("اكتب اسم الغرفة أولاً.");
            return;
          }
          const roomIdBase = roomName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\u0600-\u06FF_-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          const roomId = roomIdBase || `room-${Date.now()}`;
          const roomExists = availableRooms.some(
            (room) =>
              room.id === roomId ||
              room.name.trim().toLowerCase() === roomName.toLowerCase(),
          );
          if (roomExists) {
            alert("الغرفة موجودة بالفعل، اختر اسمًا مختلفًا.");
            return;
          }
          const newRoom: CustomRoomEntry = {
            id: roomId,
            name: roomName,
            icon: details.password.trim() ? "🔒" : "✨",
            count: 0,
            category: "private",
            createdBy: currentUser.nickname,
            password: details.password.trim() || undefined,
          };
          setCustomRooms((prev) => [...prev, newRoom]);
          setOpenRooms((prev) =>
            prev.some((room) => room.id === newRoom.id)
              ? prev
              : [
                  ...prev,
                  { id: newRoom.id, name: newRoom.name, flag: newRoom.icon },
                ],
          );
          setRoomTopics((prev) => ({
            ...prev,
            [newRoom.id]: `غرفة خاصة: ${newRoom.name} ${newRoom.password ? "🔒" : "✨"}`,
          }));
          setActiveRoomId(newRoom.id);
          setIsCreateRoomModalOpen(false);
          alert(`تم إنشاء الغرفة: ${roomName}`);
        }}
      />

      {/* --- Newly Installed Client-Side Fast Search Pop-up --- */}
      {showSearchPop && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed top-24 left-4 md:left-auto md:right-1/4 w-[320px] rounded-3xl overflow-hidden flex flex-col z-[9999] cursor-move text-right lamma-modal-shell"
          style={{
            resize: "both",
            overflow: "hidden",
            minWidth: "280px",
            minHeight: "350px",
            maxWidth: "90vw",
            maxHeight: "90vh",
          }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 select-none lamma-modal-header">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-green-500" />
              <h3 className="font-sans font-black text-white text-xs">
                البحث السريع والتصفية (Search)
              </h3>
            </div>
            <button
              onClick={() => setShowSearchPop(false)}
              className="p-1.5 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer lamma-danger-btn"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div
            className="p-4 flex-1 flex flex-col gap-3 overflow-hidden text-right"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              id="search-input"
              name="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن رسالة، عضو، أو رمز..."
              className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none text-right font-semibold lamma-input-shell"
            />
            <div className="flex-1 overflow-y-auto space-y-3 scroller-soft text-right">
              {searchQuery.trim() === "" ? (
                <div className="text-center py-8 text-gray-500 text-[10px] font-bold">
                  اكتب كلمة للبحث في رسائل الغرفة الحالية والأعضاء النشطين 🔍
                </div>
              ) : (
                <>
                  {/* Members section */}
                  <div>
                    <div className="text-[9px] text-green-400 font-black mb-1">
                      أعضاء مطابقين:
                    </div>
                    {chatMembers.filter((m) =>
                      m.nickname
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                    ).length === 0 ? (
                      <div className="text-[10px] text-gray-500 py-1 text-center">
                        لا يوجد أعضاء مطابقين
                      </div>
                    ) : (
                      <div className="grid gap-1">
                        {chatMembers
                          .filter((m) =>
                            m.nickname
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                          )
                          .map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                openMemberProfile(m.nickname);
                              }}
                              className="flex items-center justify-between p-1.5 rounded-lg text-right text-[10px] transition-all cursor-pointer w-full lamma-list-item"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{m.avatar}</span>
                                <span className="text-white font-bold">
                                  {m.nickname}
                                </span>
                              </div>
                              <span className="text-gray-500 text-[8px]">
                                {m.role}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Messages section */}
                  <div>
                    <div className="text-[9px] text-[#a3e635] font-black mb-1">
                      رسائل مطابقة:
                    </div>
                    {messages.filter(
                      (m) =>
                        m.text &&
                        m.text
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                    ).length === 0 ? (
                      <div className="text-[10px] text-gray-500 py-1 text-center">
                        لا توجد رسائل مطابقة
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages
                          .filter(
                            (m) =>
                              m.text &&
                              m.text
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()),
                          )
                          .map((m, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl space-y-1 text-right lamma-search-result"
                            >
                              <div className="flex items-center justify-between text-[8.5px]">
                                <button
                                  type="button"
                                  onClick={() => openMemberProfile(m.author)}
                                  className="text-green-400 font-bold hover:underline"
                                >
                                  {m.author}
                                </button>
                                <span className="text-gray-500 font-mono">
                                  {m.time}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-300 break-words text-right">
                                {m.text}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* --- User Options Custom Context/Dropdown Menu --- */}
      <UserContextPopup
        isOpen={showUserContextPop}
        target={userContextTarget}
        currentUser={currentUser}
        friendsList={friendsList}
        ignoredUsers={ignoredUsers}
        blockedUsers={blockedUsers}
        handlers={{
          onSendPM: (target) => {
            setPmTarget({
              nickname: target.nickname,
              role: normalizePmRole(target.role),
              avatar: target.avatar || "👤",
            });
            if (window.innerWidth < 1280) {
              setMobileTab("private");
            } else {
              setShowRoomsLists(false);
              setShowMembersList(false);
              setShowFeaturesTray(false);
              setShowNotificationsDropdown(false);
              setShowGamesDropdown(false);
              setShowAttachmentDropdown(false);
              setShowMusicDropdown(false);
              setShowEmojiPicker(false);
              setShowCommandsDropdown(false);
              setShowPrivacyDropdown(false);
              setShowSettingsDropdown(false);
              setShowSearchPop(false);
              setIsPmOpen(true);
            }
            setShowUserContextPop(false);
          },
          onViewProfile: (target) => {
            setUserProfileBioTarget(target);
            setShowUserProfileBioPop(true);
            setShowUserContextPop(false);
          },
          onToggleFriend: (target) => {
            if (friendsList.includes(target.nickname)) {
              setFriendsList((prev) =>
                prev.filter((u) => u !== target.nickname),
              );
              alert(`💔 تم إزالة [${target.nickname}] من قائمة أصدقائك.`);
            } else {
              setFriendsList((prev) => [...prev, target.nickname]);
              triggerGiftFlying("💚");
              alert(
                `🎉 تم إضافة [${target.nickname}] إلى قائمة الأصدقاء المفضلة لديك بنجاح!`,
              );
            }
            setShowUserContextPop(false);
          },
          onToggleIgnore: (target) => {
            if (ignoredUsers.includes(target.nickname)) {
              setIgnoredUsers((prev) =>
                prev.filter((u) => u !== target.nickname),
              );
              alert(`🔊 تم إلغاء كتم/تجاهل العضو [${target.nickname}].`);
            } else {
              setIgnoredUsers((prev) => [...prev, target.nickname]);
              setFriendsList((prev) =>
                prev.filter((u) => u !== target.nickname),
              );
              alert(
                `🔕 تم تجاهل [${target.nickname}] وتصفية رسائله وغرفته تلقائياً!`,
              );
            }
            setShowUserContextPop(false);
          },
          onToggleBlock: (target) => {
            if (blockedUsers.includes(target.nickname)) {
              setBlockedUsers((prev) =>
                prev.filter((u) => u !== target.nickname),
              );
              alert(`🔓 تم إلغاء حظر العضو [${target.nickname}].`);
            } else {
              setBlockedUsers((prev) => [...prev, target.nickname]);
              setFriendsList((prev) =>
                prev.filter((u) => u !== target.nickname),
              );
              alert(
                `🚫 تم حظر [${target.nickname}] في هذه الجلسة وإخفاء رسائله من واجهتك الحالية.`,
              );
            }
            setShowUserContextPop(false);
          },
          onOpenAdminPanel: (target) => {
            setSelectedProfileMember(target);
            setShowProfileModal(true);
            setShowUserContextPop(false);
          },
          onClose: () => {
            setShowUserContextPop(false);
            setUserContextTarget(null);
          },
        }}
      />

      {/* --- User Profile Info/Bio Popup --- */}
      <UserProfileBioPopup
        isOpen={showUserProfileBioPop}
        target={userProfileBioTarget}
        currentUserNickname={currentUser.nickname}
        myCustomBio={myCustomBio}
        friendsList={friendsList}
        handlers={{
          onSendPM: (target) => {
            setPmTarget({
              nickname: target.nickname,
              role: normalizePmRole(target.role),
              avatar: target.avatar || "👤",
            });
            if (!pmThreads[target.nickname]) {
              setPmThreads((prev) => ({
                ...prev,
                [target.nickname]: [
                  {
                    text: `مرحباً بك! أنا ${target.nickname} 😇`,
                    isOwn: false,
                    time: new Date().toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }),
                  },
                ],
              }));
            }
            if (window.innerWidth < 1280) {
              setMobileTab("private");
            } else {
              setShowRoomsLists(false);
              setShowMembersList(false);
              setShowFeaturesTray(false);
              setShowNotificationsDropdown(false);
              setShowGamesDropdown(false);
              setShowAttachmentDropdown(false);
              setShowMusicDropdown(false);
              setShowEmojiPicker(false);
              setShowCommandsDropdown(false);
              setShowPrivacyDropdown(false);
              setShowSettingsDropdown(false);
              setShowSearchPop(false);
              setIsPmOpen(true);
            }
            setShowUserProfileBioPop(false);
            setUserProfileBioTarget(null);
          },
          onBackToContext: (target) => {
            setUserContextTarget(target);
            setShowUserContextPop(true);
            setShowUserProfileBioPop(false);
          },
          onClose: () => {
            setShowUserProfileBioPop(false);
            setUserProfileBioTarget(null);
          },
          onBioChange: (newBio) => setMyCustomBio(newBio),
        }}
      />

      {/* HA WebRTC Calling UI */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="rounded-3xl p-6 w-full max-w-sm flex flex-col items-center justify-center space-y-6 lamma-call-shell">
              {/* Target Avatar / Icon */}
              <div className="relative">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-xl ${
                    activeCall.status === "connecting" ||
                    activeCall.status === "ringing"
                      ? "bg-black border-[3px] border-green-500/50 animate-pulse"
                      : activeCall.status === "connected"
                        ? "bg-green-500/20 border-[3px] border-green-500 text-green-400"
                        : activeCall.status === "ended"
                          ? "bg-red-500/20 border-[3px] border-red-500 text-red-500"
                          : "bg-gray-800 border-[3px] border-gray-600"
                  }`}
                >
                  {activeCall.type === "video" ? "📹" : "📞"}
                </div>
                {/* Fallback ringing ripples */}
                {(activeCall.status === "connecting" ||
                  activeCall.status === "ringing") && (
                  <div className="absolute inset-0 rounded-full animate-ping border border-green-400 opacity-50" />
                )}
              </div>

              {/* Target Identity */}
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black text-white">
                  {activeCall.target}
                </h3>
                <p className="text-sm font-bold text-gray-400">
                  {activeCall.type === "video"
                    ? "مكالمة فيديو مشفرة"
                    : "مكالمة صوتية مشفرة"}
                </p>
              </div>

              {/* Status & Fallback Servers Tracker */}
              <div className="w-full text-center space-y-3 rounded-xl p-4 lamma-call-status">
                {activeCall.status === "connecting" && (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-sm font-bold text-yellow-500 animate-pulse">
                      جاري تكوين وتشفير الاتصال...
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      محاولة الاتصال عبر:{" "}
                      {webRTCServers[activeCall.serverIndex].name}
                    </span>
                    {activeCall.isFallback && (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1">
                        تم التحويل التلقائي للخادم الاحتياطي لتفادي التقطيع 🔄
                      </span>
                    )}
                  </div>
                )}
                {activeCall.status === "ringing" && (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-sm font-bold text-green-400 animate-pulse">
                      جاري الرنين...
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      قناة مؤمنة بنجاح عبر:{" "}
                      {webRTCServers[activeCall.serverIndex].name}
                    </span>
                    {activeCall.isFallback && (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1">
                        تعمل الآن على الخادم الاحتياطي تلقائياً للسرعة 🚀
                      </span>
                    )}
                  </div>
                )}
                {activeCall.status === "connected" && (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-xl font-mono font-black text-[#a3e635]">
                      {formatCallDuration(activeCall.callDuration)}
                    </span>
                    <span className="text-[10px] text-green-400/80 bg-green-500/10 px-2 py-1 rounded-md">
                      الاتصال مستقر وعالي الجودة ⚡
                    </span>
                    {activeCall.isFallback && (
                      <span className="text-[9px] font-mono text-emerald-400 rounded-full mt-1">
                        متصل عبر خادم النسخ الاحتياطي (لا تشتت) 🛡️
                      </span>
                    )}
                  </div>
                )}
                {activeCall.status === "ended" && (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-sm font-bold text-red-500">
                      انتهت المكالمة
                    </span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 pt-2">
                {activeCall.status !== "ended" && (
                  <>
                    <button className="w-12 h-12 rounded-full cursor-pointer flex items-center justify-center text-white transition-all text-xl lamma-soft-action">
                      🎙️
                    </button>
                    {activeCall.type === "video" && (
                      <button className="w-12 h-12 rounded-full cursor-pointer flex items-center justify-center text-white transition-all text-xl lamma-soft-action">
                        📹
                      </button>
                    )}
                    <button
                      onClick={endCall}
                      className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 cursor-pointer flex items-center justify-center text-white transition-all text-xl ml-2 shadow-[0_4px_15px_rgba(220,38,38,0.5)]"
                    >
                      <Phone size={24} className="rotate-[135deg]" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal
        isOpen={showShareModalInChat}
        onClose={() => setShowShareModalInChat(false)}
        appLink={appLink}
      />

      {showThemeSettingsModal && (
        <ThemeSettings
          isOpen={showThemeSettingsModal}
          onClose={() => setShowThemeSettingsModal(false)}
        />
      )}

      {/* Real audio elements for Radio and Music streaming/playback */}
      <audio ref={radioAudioRef} src={currentRadioStation.url} preload="none" />
      <audio ref={musicAudioRef} src={currentMusicTrack.url} preload="none" />
    </div>
  );
}
