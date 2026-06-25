import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ChatScreenProps, OwnerMusicTrack, RoomDjState } from "../lib/chatTypes";
import { restoreUiverseScopedOnLoad } from "../services/design/uiverseScopedImportService";
import { setDesignPreviewActive } from "../services/design/designPreviewDom";
import { loadUniversalStyleLocal, persistAndApplyUniversalStyle } from "../services/design/universalStyleStorage";
import type { UniversalStyleConfig } from "../services/design/universalStyleTypes";
import { StyleSandboxCard } from "./design/StyleSandboxCard";
import { DesignInspectOverlay } from "./design/DesignInspectOverlay";
import { UniversalStyleVideoLayer } from "./design/UniversalStyleVideoLayer";
import type { ChatDesignRegion, RegionAction } from "../services/design/chatDesignVocabulary";
import {
  buildRegionActionPrompt,
  resolveDesignRegionElement,
  resolveDesignRegionFromElement,
} from "../services/design/designInspectService";
import {
  buildDesignInspectSuggestions,
  formatSuggestionOneLiner,
  type DesignInspectSuggestion,
} from "../services/design/designInspectSuggestions";
import { checkOwnerWriteAccessWithClaim } from "../services/auth/ownerWriteAccessService";
import {
  buildStyleSandboxMessage,
  MAX_STYLE_SANDBOX_SESSIONS,
  useUniversalStyleEngine,
} from "../hooks/useUniversalStyleEngine";
import type { StyleSandboxSession } from "../services/design/universalStyleTypes";
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
  LogIn,
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
  Upload,
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
  ZoomIn,
  ZoomOut,
  Trash2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import AMLogo from "./AMLogo.tsx";
import BossSigil from "./BossSigil.tsx";
import { OwnerAvatarAura } from "./OwnerPrestige.tsx";
import { OWNER_ID_CARD_IMAGE, isOwnerChatRole, resolveOwnerDisplayAvatar, OWNER_DISPLAY_BADGE } from "../lib/ownerIdentity";
import ShareModal from "./modals/ShareModal.tsx";
import CreateRoomModal from "./modals/CreateRoomModal.tsx";
import RoomPasswordModal from "./modals/RoomPasswordModal.tsx";
import UserContextPopup from "./modals/UserContextPopup.tsx";
import UserProfileBioPopup from "./modals/UserProfileBioPopup.tsx";
import {
  LazyOwnerPanelModal,
  LazyOwnerRoleManagementPanel,
  LazyAdminPanelModal,
  LazyGuardPanelModal,
  LazyStorePanelModal,
  LazyOwnerStorePanelModal,
  LazyDesignCenterModal,
  LazyStatsModal,
  LazyUserProfileModal,
  ModalSuspense,
} from "./chat/lazyModals";
import { MobileBottomSheet } from "./chat/MobileBottomSheet";
import { HeaderIconButton } from "./chat/HeaderIconButton";
import { ChatMessageVirtualList } from "./chat/ChatMessageVirtualList";
import { ChatMessageRow } from "./chat/ChatMessageRow";
import { PmMessageRow } from "./chat/PmMessageRow";
import {
  fetchActivePlans,
  fetchMySubscription,
  subscribeToMySubscription,
  subscribeToNewOrders,
  type SubscriptionPlan,
} from "../services/store/subscriptionService";
import { MemberAvatar } from "./MemberAvatar";
import { isAvatarImageUrl } from "../lib/avatarDisplay";
import { requireAuthenticatedUid } from "../services/auth/guestAuthService";
import {
  persistProfileAvatarToMetadata,
  uploadProfileAvatarFile,
} from "../services/profile/profileAvatarService";
import {
  supabase,
  type BannedUserRow,
  type NicknameChangeRequestRow,
  SupabaseMessage,
  type OwnerActivityLogRow,
  type OwnerMemberPermissionRow,
  type OwnerMemberCosmeticsRow,
  type OwnerSettingsRow,
} from "../lib/supabase.ts";
import type { PublicChatSettingsPayload } from "../services/chat/ownerSettingsService";
import { userStoragePath } from "../services/storage/storagePaths";
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
  type MemberCosmeticGrant,
  type UserSession,
  type DesignAssistantPatch,
  type DesignAssistantProposal,
  type DesignAssistantFinding,
  type DesignAssistantAudit,
  type DesignAssistantSnapshot,
  type DesignPreset,
  type CustomRoomEntry,
  type PMTargetState,
  type ProductType,
} from "../lib/chatTypes.ts";
import { MemberPrestigeBadges } from "./MemberPrestigeBadges";
import {
  hexToRgba,
  getRoleFromAuthor,
  getFrameFromAuthor,
  getPrestigeNameClass,
  getCrownRoleForDisplay,
  getStoreVipChip,
  isOwnerAuthor,
  hasStorePlatinumDisplay,
  hasStoreVipDisplay,
  hasOwnerGrantedCosmetics,
  getYoutubeId,
  getShortenedNickname,
  isSafeHttpUrl,
  canSendImages,
  canShareYoutube,
  canControlMusicRadio,
  getRoomCreationQuotaRemaining,
  filterSafeMediaUrl,
  isPrivateStorageRef,
  isBrowserOnline,
  OFFLINE_SEND_HINT,
  type StoreCosmeticsSnapshot,
} from "../lib/chatHelpers.ts";
import { compressImageForChat } from "../lib/imageCompression";
import { ResolvedPrivateMedia } from "./chat/ResolvedPrivateMedia";
import { attachWindowPointerDrag } from "../lib/pointerDrag";
import { renderTextMessageWithMedia } from "../lib/chatMessageRender.tsx";
import { createPortal } from "react-dom";
import { useChatMessages } from "../hooks/useChatMessages";
import { usePrivateMessages, hasPmMessageWithDbId } from "../hooks/usePrivateMessages";
import { useSocialFeed } from "../hooks/useSocialFeed";
import { useWebRTCCalls } from "../hooks/useWebRTCCalls";
import { useOnlinePresence, type PresenceUpdateEvent } from "../hooks/useOnlinePresence";
import { resolveEffectiveMemberRole, resolveGranterEffectiveRole } from "../lib/memberRoleResolution";
import {
  fetchRoomMemberRoles,
  promoteMemberRole,
  isPersistableMemberId,
} from "../services/auth/memberRoleService";
import {
  fetchRoleGrantsPolicy,
  fetchRoomTempGrants,
  revokeMyTempGrants,
} from "../services/auth/rolePolicyService";
import { getOrCreateChatSessionId } from "../lib/chatSessionId";
import { canUseStaffTools, canGrantRole, type RoleGrantsPolicy } from "../lib/rolePolicy";
import { getDefaultRolePolicy } from "../lib/memberRoleResolution";
import { fetchServerUserRole } from "../services/auth/userRoleService";
import type { MemberRole } from "../lib/chatTypes";
import { useIsMobileViewport } from "../hooks/useIsMobileViewport";
import { useVisualViewportLayout } from "../hooks/useVisualViewportOffset";
import { useDeepLinkParams } from "../hooks/useDeepLinkParams";
import { useVoiceMessageRecorder } from "../hooks/useVoiceMessageRecorder";
import { VoiceNoteBubble, VoiceRecorderBar } from "../components/VoiceNoteBubble";
import { FloatingDropdownPortal } from "../components/FloatingDropdownPortal";
import { uploadVoiceNoteBlob } from "../services/chat/voiceMessageService";
import {
  createPrivateChatRoom,
  fetchPrivateChatRooms,
  isRoomUnlockedLocally,
  markRoomUnlocked,
  privateRoomToEntry,
  verifyPrivateRoomPassword,
} from "../services/chat/privateRoomService";
import {
  applyModerationAction,
  banActionForType,
  fetchMyActiveSanctions,
  mapBannedUserRowToBanInfo,
} from "../services/chat/moderationService";
import {
  getCachedChatReports,
  submitChatReport,
  subscribeToChatReports,
  syncChatReportsForStaff,
  updateChatReportStatus,
  type ChatReport,
  type ChatReportStatus,
} from "../services/chat/chatReportsService";
import { deleteRoomMessagesByMember } from "../services/chat/roomMessagesModerationService";
import { formatSupabaseUserError, isRlsDenied } from "../lib/supabaseErrors";
import { estimateMessageRowHeight } from "../lib/messageLayoutUtils";
import {
  parseDjLibrary,
  persistDjLibrary,
  uploadOwnerMusicFile,
} from "../services/chat/ownerMusicService";
import {
  RADIO_STATIONS,
  readDjListenPreference,
  writeDjListenPreference,
  getRadioStreamUrls,
  type RadioStation,
} from "../lib/djConstants";
import { playStreamWithFallbacks } from "../lib/radioPlayer";
import { appendInviteParam } from "../lib/inviteAccess";
import { bumpUserStat } from "../lib/achievements";
import { buildFriendSuggestions } from "../lib/friendSuggestions";
import { AchievementsBlock } from "./AchievementsBlock";
import {
  applyRoomDjToAudio,
  computeDjStartedAtMs,
  parseRoomDjMap,
  persistRoomDjState,
} from "../services/chat/roomDjService";
import {
  bindMessageAlertPriming,
  primeMessageAlerts,
  playMessageAlertSound,
  showBrowserMessageNotification,
} from "../services/chat/messageAlertService";
import { describeMediaError, describeCallFailure, playRemoteMedia } from "../services/calls/callMediaUtils";
import { OwnerMemberFeaturesPanel } from "./modals/OwnerMemberFeaturesPanel";
import { OwnerMemberCosmeticsPanel } from "./modals/OwnerMemberCosmeticsPanel";
import { useRoomComposer } from "../hooks/useRoomComposer";
import {
  buildDesignAssistantAudit,
  buildDesignAssistantProposal,
} from "../services/design/designAssistantService";
import {
  loadChatLayoutPrefs,
  saveChatLayoutPrefs,
  type ChatLayoutPrefs,
} from "../lib/chatLayoutPrefs";
import {
  applyFace,
  FACE_PRESETS,
  loadFace,
  saveFace,
  type CustomFace,
} from "../lib/customFace";
import {
  appendPmThreadMessage,
  clearPrivateConversation,
  createOptimisticPmMessage,
  persistPrivateMessage,
  uploadPrivateMediaFile,
} from "../services/chat/privateMessagesService";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";
import { persistMessageReaction } from "../services/chat/messagesService";
import RealtimeStatus from "./pwa/RealtimeStatus";
import { upsertCurrentUserProfile, fetchUserProfileByNickname } from "../services/social/userProfileService";
import { deleteSocialPost } from "../services/social/socialPostsService";
import { SocialFeedPanel } from "./social/SocialFeedPanel";
import { UserProfilePageModal } from "./modals/UserProfilePageModal";
import {
  MobileBottomNav,
  type MobileNavId,
} from "./pwa/MobileBottomNav";
import type { SocialPost } from "../lib/socialTypes";

const OWNER_SETTINGS_ROW_ID = "global";

const PM_TEXT_SCALE_MIN = 0.85;
const PM_TEXT_SCALE_MAX = 1.45;
const PM_TEXT_SCALE_STEP = 0.1;
const PM_PANEL_SIZES = [
  { w: 320, h: 450 },
  { w: 400, h: 560 },
  { w: 480, h: 680 },
] as const;

function readPmTextScale(): number {
  try {
    const raw = localStorage.getItem("lamma_pm_text_scale");
    const value = raw ? parseFloat(raw) : 1;
    if (!Number.isFinite(value)) return 1;
    return Math.min(PM_TEXT_SCALE_MAX, Math.max(PM_TEXT_SCALE_MIN, value));
  } catch {
    return 1;
  }
}

function readPmPanelTier(): number {
  try {
    const tier = parseInt(localStorage.getItem("lamma_pm_panel_tier") || "0", 10);
    if (!Number.isFinite(tier)) return 0;
    return Math.min(PM_PANEL_SIZES.length - 1, Math.max(0, tier));
  } catch {
    return 0;
  }
}
const USE_ROOM_VIRTUAL_THRESHOLD = 30;

function hydrateUniversalStyleFromSettings(
  raw: unknown,
): void {
  const config = raw as UniversalStyleConfig | null | undefined;
  if (!config || config.version !== 1) return;
  persistAndApplyUniversalStyle(config);
}
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
  return mapBannedUserRowToBanInfo(row);
}

function resolveBanTargetUserId(ban: BanInfo): string | null {
  if (isUuidLike(ban.localStorageId)) return ban.localStorageId;
  if (isUuidLike(ban.fingerprint)) return ban.fingerprint;
  return null;
}

function sanitizeRoomBgMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, string>
  >((acc, [key, entry]) => {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed && isSafeHttpUrl(trimmed)) {
        acc[key] = trimmed;
      }
    }
    return acc;
  }, {});
}

function getSafeStorage(
  storage: "localStorage" | "sessionStorage",
): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[storage];
  } catch {
    return null;
  }
}

function readStorageValue(
  key: string,
  storage: "localStorage" | "sessionStorage" = "localStorage",
): string | null {
  try {
    return getSafeStorage(storage)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorageValue(
  key: string,
  value: string,
  storage: "localStorage" | "sessionStorage" = "localStorage",
) {
  try {
    getSafeStorage(storage)?.setItem(key, value);
  } catch {
    // Ignore storage write failures in restricted environments.
  }
}

function readJsonStorage<T>(
  key: string,
  fallback: T,
  storage: "localStorage" | "sessionStorage" = "localStorage",
): T {
  const raw = readStorageValue(key, storage);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getNameGlassCardClass(options: {
  isSelf?: boolean;
  isBoss?: boolean;
  compact?: boolean;
}) {
  return [
    "lamma-name-glass-card",
    options.isSelf && "lamma-name-glass-card-own",
    options.isBoss && "lamma-name-glass-card-boss",
    options.compact && "lamma-name-glass-card-compact",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function ChatScreen({
  currentUser,
  onLogout,
  primaryTheme,
  setPrimaryTheme,
  onUserSessionUpdate,
  inviteOnlyMode: inviteOnlyModeProp = false,
  hasInviteAccess = false,
}: ChatScreenProps) {
  const DEFAULT_AMBIENT_BG: string = "/MAN.png";
  const POSTS_ROOM_ID = "posts-feed";
  const customRoomsStorageKey = `lamma_custom_rooms_${currentUser.uid || currentUser.nickname}`;
  const [isInviteOnlyMode, setIsInviteOnlyMode] = useState<boolean>(
    () => inviteOnlyModeProp,
  );

  useEffect(() => {
    setIsInviteOnlyMode(inviteOnlyModeProp);
  }, [inviteOnlyModeProp]);
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
  const chatLayoutStorageKey = userScopedStorageKey("lamma_chat_layout_prefs");
  const initialChatLayoutPrefs = loadChatLayoutPrefs(chatLayoutStorageKey);

  const readStoredCustomRoomIds = (): string[] => {
    try {
      const saved = localStorage.getItem(customRoomsStorageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((room: { id?: string }) => room?.id?.trim().toLowerCase())
        .filter(Boolean) as string[];
    } catch {
      return [];
    }
  };

  const readRequestedRoomId = () => {
    if (typeof window === "undefined") return "egypt";
    const requestedRoom = new URLSearchParams(window.location.search)
      .get("room")
      ?.trim()
      .toLowerCase();
    const roomId = requestedRoom || "egypt";
    const exists =
      ROOMS_DEF.some((room) => room.id === roomId) ||
      readStoredCustomRoomIds().includes(roomId);
    return exists ? roomId : "egypt";
  };

  const buildInitialOpenRooms = (roomId: string) => {
    const defaultTab = { id: "egypt", name: "مصر", flag: "🇪🇬" };
    if (roomId === "egypt") {
      return [defaultTab];
    }

    const requested = ROOMS_DEF.find((room) => room.id === roomId);
    if (!requested) {
      return [defaultTab];
    }

    return [
      defaultTab,
      { id: requested.id, name: requested.name, flag: requested.icon },
    ];
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
    const link = url.toString();
    const inviteOnly = inviteOnlyModeProp || isInviteOnlyMode;
    return inviteOnly ? appendInviteParam(link) : link;
  };

  const [ownerBgImage, setOwnerBgImage] = useState<string | null>(() =>
    filterSafeMediaUrl(localStorage.getItem("lamma_owner_bg_image")),
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(() =>
    filterSafeMediaUrl(localStorage.getItem("lamma_custom_logo_url")),
  );
  const [designLogoInput, setDesignLogoInput] = useState<string>(() =>
    localStorage.getItem("lamma_custom_logo_url") || "",
  );
  const [roomBgMap, setRoomBgMap] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem("lamma_room_bg_map");
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return sanitizeRoomBgMap(parsed);
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
  const [openReactionMsgId, setOpenReactionMsgId] = useState<string | null>(null);

  // Luxury Mobile UI - DM Components
  const [showDmList, setShowDmList] = useState(false);
  const [showDmChat, setShowDmChat] = useState(false);
  const [selectedDmContact, setSelectedDmContact] = useState<any>(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<any>(null);

  // DM Call Handlers
  const handleDmAudioCall = (contactId: string) => {
    initiateCall(contactId, "audio");
    setShowDmChat(false);
  };

  const handleDmVideoCall = (contactId: string) => {
    initiateCall(contactId, "video");
    setShowDmChat(false);
  };

  const handleOpenDmList = () => {
    setShowDmList(true);
  };

  const handleCloseDmList = () => {
    setShowDmList(false);
  };

  const handleOpenDmChat = (contact: any) => {
    setSelectedDmContact(contact);
    setShowDmChat(true);
    setShowDmList(false);
  };

  const handleCloseDmChat = () => {
    setShowDmChat(false);
    setSelectedDmContact(null);
  };

  // Admin Message Handler
  const handleSendAdminMessage = async (targetNickname: string, message: string) => {
    if (!supabase) return;
    
    try {
      const senderUid = await requireAuthenticatedUid();
      
      // Send as admin message (from "admin" to target user)
      const { error } = await supabase.from("pm_messages").insert([{
        sender_uid: "admin",
        sender_nickname: "الأدمن",
        receiver_uid: targetNickname,
        receiver_nickname: targetNickname,
        text: message,
        type: "text",
        is_read: false,
      }]);

      if (error) throw error;

      addSystemActivityLog(
        "promote",
        currentUser.nickname,
        `قام المالك بإرسال رسالة من الأدمن إلى: ${targetNickname}`,
        currentUser.nickname
      );
    } catch (error) {
      console.error("Error sending admin message:", error);
      alert("حدث خطأ أثناء إرسال الرسالة");
    }
  };

  // Sample DM Contacts (would be fetched from Supabase in production)
  const sampleDmContacts = [
    {
      id: "1",
      name: "أحمد محمد",
      avatar: "أ",
      lastMessage: "مرحباً! كيف حالك؟",
      time: "10:30",
      online: true,
    },
    {
      id: "2",
      name: "سارة علي",
      avatar: "س",
      lastMessage: "شكراً لك",
      time: "09:45",
      online: false,
    },
  ];

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
  const [leftColumnSectionsPct, setLeftColumnSectionsPct] = useState(
    initialChatLayoutPrefs.left,
  );
  const rightColumnLayoutRef = useRef<HTMLDivElement | null>(null);
  const [rightColumnSectionsPct, setRightColumnSectionsPct] = useState(
    initialChatLayoutPrefs.right,
  );
  const [isCompactView, setIsCompactView] = useState(false);
  const READING_MODE_STORAGE_KEY = "lamma_reading_mode";

  const [readingMode, setReadingMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const urlFlag = new URLSearchParams(window.location.search).get("reading");
    if (urlFlag === "1") return true;
    if (urlFlag === "0") return false;
    return localStorage.getItem(READING_MODE_STORAGE_KEY) === "true";
  });
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
  const lastAppliedFaceRef = useRef<CustomFace | null>(null);
  const designPreviewSnapshotRef = useRef<{
    brandLogoUrl: string | null;
    ownerBgImage: string | null;
    roomBgMap: Record<string, string>;
    activeRoomId: string;
    leftColumnSectionsPct: ChatLayoutPrefs["left"];
    rightColumnSectionsPct: ChatLayoutPrefs["right"];
    face: CustomFace;
  } | null>(null);
  const applyDesignPreset = (preset: DesignPreset) => {
    const snapshot = preset.snapshot;
    setBrandLogoUrl(snapshot.brandLogoUrl);
    setDesignLogoInput(snapshot.brandLogoUrl || "");
    setOwnerBgImage(snapshot.ownerBgImage);
    setDesignOwnerBgInput(snapshot.ownerBgImage || "");
    setRoomBgMap(snapshot.roomBgMap || {});
  };
  const buildDesignPreset = (name: string): DesignPreset => {
    return {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 40),
      createdAt: new Date().toISOString(),
      snapshot: {
        brandLogoUrl,
        ownerBgImage,
        roomBgMap: { ...roomBgMap },
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
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showPmListDropdown, setShowPmListDropdown] = useState(false);
  const [openRooms, setOpenRooms] = useState(() =>
    buildInitialOpenRooms(readRequestedRoomId()),
  );
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
  const senderUid = currentUser.uid || "";
  const [publicChatSessionStartedAt] = useState(() => new Date().toISOString());
  const publicChatSessionStartedAtMs = new Date(
    publicChatSessionStartedAt,
  ).getTime();
  const roleLower = (currentUser.role || "").toLowerCase();
  const isOwnerRole = roleLower === "owner";
  const isAdminRole = roleLower === "admin" || roleLower === "أدمن";
  const isManagementRole = isOwnerRole || isAdminRole;
  const isPostsRoom = activeRoomId === POSTS_ROOM_ID;
  const isAdminRoom = activeRoomId === "admin";
  const isHelpRoom = activeRoomId === "help";
  const isGamesRoom = activeRoomId === "games";
  const canPublishPosts = currentUser.authProvider === "supabase";
  const isRegisteredAccount = currentUser.authProvider === "supabase";
  const tempEntryTopicStorageKey = `lamma_temp_entry_topic_${currentUser.uid || currentUser.nickname}`;
  const availableRooms = useMemo(
    () => [...ROOMS_DEF, ...customRooms],
    [customRooms],
  );

  const refreshPrivateRooms = useCallback(async () => {
    const rows = await fetchPrivateChatRooms();
    const entries = rows.map(privateRoomToEntry);
    setCustomRooms(entries);
    if (currentUser.uid) {
      setMyPrivateRoomCount(
        rows.filter((row) => row.owner_uid === currentUser.uid).length,
      );
    }
  }, [currentUser.uid]);
  useEffect(() => {
    const requestedRoomExists = availableRooms.some((room) => room.id === activeRoomId);
    if (!requestedRoomExists) {
      setActiveRoomId("egypt");
    }
  }, [activeRoomId, availableRooms, isAdminRole, isOwnerRole]);

  useEffect(() => {
    const roomDef = ROOMS_DEF.find((room) => room.id === activeRoomId);
    if (!roomDef) return;

    setOpenRooms((prev) => {
      if (prev.some((room) => room.id === activeRoomId)) {
        return prev;
      }

      return [
        ...prev,
        { id: roomDef.id, name: roomDef.name, flag: roomDef.icon },
      ];
    });
  }, [activeRoomId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", activeRoomId || "egypt");
    window.history.replaceState({}, "", url.toString());
  }, [activeRoomId]);
  const visibleRoomCount = availableRooms.filter((room) => {
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
    if (!supabase) return;
    void refreshPrivateRooms();
  }, [refreshPrivateRooms]);

  useEffect(() => {
    if (!supabase) return;
    let isCancelled = false;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("private_chat_rooms_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "private_chat_rooms" },
          () => {
            if (!isCancelled) void refreshPrivateRooms();
          },
        ),
    );
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [refreshPrivateRooms]);

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
    const timer = window.setTimeout(() => {
      saveChatLayoutPrefs(chatLayoutStorageKey, {
        left: leftColumnSectionsPct,
        right: rightColumnSectionsPct,
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [
    chatLayoutStorageKey,
    leftColumnSectionsPct,
    rightColumnSectionsPct,
  ]);

  const getDesignAssistantContext = () => {
    const loadedFace = loadFace();
    return {
      activeRoomId,
      activeRoomName:
        availableRooms.find((room) => room.id === activeRoomId)?.name || activeRoomId,
      totalRooms: availableRooms.length,
      brandLogoUrl,
      ownerBgImage,
      roomBgMap,
      defaultAmbientBg: DEFAULT_AMBIENT_BG,
      layoutPrefs: {
        left: leftColumnSectionsPct,
        right: rightColumnSectionsPct,
      } satisfies ChatLayoutPrefs,
      customFaceEnabled: loadedFace.enabled,
      customFaceBubbleRadius: loadedFace.bubbleRadius,
    };
  };

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

  const captureDesignSnapshot = () => {
    lastAppliedFaceRef.current = loadFace();
    setLastAppliedDesignSnapshot({
      brandLogoUrl,
      ownerBgImage,
      roomBgCurrent: roomBgMap[activeRoomId] || null,
      layoutSections: {
        left: leftColumnSectionsPct,
        right: rightColumnSectionsPct,
      },
    });
  };

  const applyAssistantPatch = (
    patch: DesignAssistantPatch,
    options?: { persistFace?: boolean; persistLayout?: boolean },
  ) => {
    const persistFace = options?.persistFace !== false;
    const persistLayout = options?.persistLayout !== false;

    if (typeof patch.brandLogoUrl !== "undefined") {
      setBrandLogoUrl(patch.brandLogoUrl);
      setDesignLogoInput(patch.brandLogoUrl || "");
    }
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
    if (patch.layoutSections) {
      setLeftColumnSectionsPct(patch.layoutSections.left);
      setRightColumnSectionsPct(patch.layoutSections.right);
      if (persistLayout) {
        saveChatLayoutPrefs(chatLayoutStorageKey, {
          left: patch.layoutSections.left,
          right: patch.layoutSections.right,
        });
      }
    }
    if (patch.customFacePresetId) {
      const preset = FACE_PRESETS.find((item) => item.id === patch.customFacePresetId);
      if (preset) {
        const nextFace = { ...preset.face, enabled: true };
        if (persistFace) saveFace(nextFace);
        applyFace(nextFace);
      }
    }
  };

  const previewAssistantPreset = (preset: DesignAssistantProposal["id"]) => {
    if (!designPreviewSnapshotRef.current) {
      designPreviewSnapshotRef.current = {
        brandLogoUrl,
        ownerBgImage,
        roomBgMap: { ...roomBgMap },
        activeRoomId,
        leftColumnSectionsPct,
        rightColumnSectionsPct,
        face: loadFace(),
      };
      setDesignPreviewActive(true);
    }
    const context = getDesignAssistantContext();
    const proposal = buildDesignAssistantProposal(preset, context);
    applyAssistantPatch(proposal.changes, {
      persistFace: false,
      persistLayout: false,
    });
    return {
      id: preset,
      title: proposal.title,
      summary: proposal.summary,
    };
  };

  const previewRecommendedAssistantTemplate = () => {
    const context = getDesignAssistantContext();
    const audit = buildDesignAssistantAudit(context);
    setAssistantAudit(audit);
    setAssistantFindings(audit.findings);
    return previewAssistantPreset(audit.recommendedPreset);
  };

  const commitAssistantPreset = (preset: DesignAssistantProposal["id"]) => {
    const context = getDesignAssistantContext();
    const proposal = buildDesignAssistantProposal(preset, context);
    captureDesignSnapshot();
    applyAssistantPatch(proposal.changes);
    designPreviewSnapshotRef.current = null;
    setDesignPreviewActive(false);
    setAssistantAudit(buildDesignAssistantAudit(getDesignAssistantContext()));
    setAssistantFindings(
      buildDesignAssistantAudit(getDesignAssistantContext()).findings,
    );
    setAssistantProposal(null);
    addSystemActivityLog(
      "promote",
      currentUser.nickname,
      `طبق المالك اقتراح التصميم [${proposal.title}] بعد المعاينة.`,
      "🤖 مهندس لمة",
    );
    return proposal.title;
  };

  const cancelAssistantPreview = () => {
    const snap = designPreviewSnapshotRef.current;
    if (!snap) {
      setDesignPreviewActive(false);
      return;
    }
    setBrandLogoUrl(snap.brandLogoUrl);
    setDesignLogoInput(snap.brandLogoUrl || "");
    setOwnerBgImage(snap.ownerBgImage);
    setDesignOwnerBgInput(snap.ownerBgImage || "");
    setRoomBgMap(snap.roomBgMap);
    setDesignRoomBgInput(snap.roomBgMap[snap.activeRoomId] || "");
    setLeftColumnSectionsPct(snap.leftColumnSectionsPct);
    setRightColumnSectionsPct(snap.rightColumnSectionsPct);
    saveChatLayoutPrefs(chatLayoutStorageKey, {
      left: snap.leftColumnSectionsPct,
      right: snap.rightColumnSectionsPct,
    });
    saveFace(snap.face);
    applyFace(snap.face);
    designPreviewSnapshotRef.current = null;
    setDesignPreviewActive(false);
  };

  const handleApplyAssistantProposal = () => {
    if (!assistantProposal) return;
    const allowed = window.confirm(
      `سيتم تطبيق المقترح التالي الآن: ${assistantProposal.title}\n\nلن يتم تنفيذ أي تغيير آخر غير المعروض داخل الخطة الحالية.\n\nهل تريد المتابعة؟`,
    );
    if (!allowed) return;

    captureDesignSnapshot();
    applyAssistantPatch(assistantProposal.changes);
    addSystemActivityLog(
      "promote",
      currentUser.nickname,
      `المساعد الذكي طبق اقتراح التصميم [${assistantProposal.title}] بعد موافقة المالك.`,
      "🤖 مهندس لمة",
    );
    setAssistantProposal(null);
    alert(`✅ تم تطبيق «${assistantProposal.title}». أغلق النافذة لترى الألوان والخلفيات على الشات.`);
  };

  const handleRestoreLastDesignSnapshot = () => {
    if (!lastAppliedDesignSnapshot) return;
    const allowed = window.confirm(
      "سيتم استعادة آخر شكل محفوظ قبل تطبيق اقتراح المساعد. هل تريد المتابعة؟",
    );
    if (!allowed) return;

    applyAssistantPatch(lastAppliedDesignSnapshot);
    if (lastAppliedFaceRef.current) {
      saveFace(lastAppliedFaceRef.current);
      applyFace(lastAppliedFaceRef.current);
    }
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
    leftColumnSectionsPct,
    ownerBgImage,
    rightColumnSectionsPct,
    roomBgMap,
  ]);

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setShowSearchPop(true);
      return;
    }
    setShowSearchPop(true);
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
    "quick" | "features" | "cosmetics" | "guard" | "store" | "design" | "stats" | "owner_store" | "roles"
  >("quick");
  const [designInspectActive, setDesignInspectActive] = useState(false);
  const [inspectSelectedRegion, setInspectSelectedRegion] =
    useState<ChatDesignRegion | null>(null);
  const [inspectHighlightRect, setInspectHighlightRect] = useState<DOMRect | null>(
    null,
  );
  const [inspectTargetEl, setInspectTargetEl] = useState<HTMLElement | null>(null);
  const [inspectLastSummary, setInspectLastSummary] = useState("");
  const [inspectApplying, setInspectApplying] = useState(false);
  const [inspectPreviewConfig, setInspectPreviewConfig] =
    useState<UniversalStyleConfig | null>(null);
  const modalDragControls = useDragControls();

  // --- AUTOMATION AND STORE SYSTEM STATES ---
  const [subscription, setSubscription] = useState<any>(() =>
    readJsonStorage(subscriptionStorageKey, null),
  );
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [subscriptionNowMs, setSubscriptionNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setSubscriptionNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const hasActiveSubscription =
    subscription?.isActive && (subscription?.expiresAt ?? 0) > subscriptionNowMs;
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
    const savedSub = readJsonStorage<any>(subscriptionStorageKey, null);
    let initialColor = user.color;
    let initialFrame = "";
    let initialTitle = user.title || "";
    let initialBadge = user.badge || "";
    let initialAvatar = user.avatar || "👤";

    if (savedSub?.isActive && savedSub.expiresAt > Date.now()) {
      initialColor = savedSub.color || initialColor;
      initialFrame = savedSub.frame || "";
      initialTitle = savedSub.title || "";
      initialBadge = savedSub.badge || "";
      if (!isAvatarImageUrl(user.avatar) && savedSub.avatar) {
        initialAvatar = savedSub.avatar;
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
  }>(() => {
    try {
      const stored = localStorage.getItem("lamma_violation_counts");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  {
    /* State for Create Room */
  }
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRoomPasswordModalOpen, setIsRoomPasswordModalOpen] = useState(false);
  const [pendingRoomSwitchId, setPendingRoomSwitchId] = useState<string | null>(
    null,
  );
  const [myPrivateRoomCount, setMyPrivateRoomCount] = useState(0);
  const [userStatus, setUserStatus] = useState("");
  const [isStatusHidden, setIsStatusHidden] = useState(false);

  // Simulated database status for maintenance recovery
  const [isDbConnectionLost, setIsDbConnectionLost] = useState(false);
  const [isReconnectingDb, setIsReconnectingDb] = useState(false);
  const [dbStatusLogs, setDbStatusLogs] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isDbConnectionLost) {
      setAuthError(
        "انقطع الاتصال بقاعدة البيانات. تحقق من الشبكة أو حاول إعادة تحميل الصفحة.",
      );
    } else if (supabase) {
      setAuthError(null);
    }
  }, [isDbConnectionLost]);

  // Custom user suggestions friend request list
  const [friendSuggestions, setFriendSuggestions] = useState<any[]>([]);

  // Shop interactive state variables
  const [shopTab, setShopTab] = useState<
    "vip" | "skins" | "badges" | "suggests" | "stats" | "maintenance" | "offers"
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
  const myIp = "غير متاح";

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
  const [banRecheckLoading, setBanRecheckLoading] = useState(false);
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
  ): Promise<{ ok: boolean; error?: string }> => {
    if (options?.sync && supabase && currentUser.authProvider === "supabase") {
      const serverAction = banActionForType(ban.type, false);
      if (
        serverAction === "mute" ||
        serverAction === "room_ban" ||
        serverAction === "megaban" ||
        serverAction === "kick" ||
        serverAction === "shadow"
      ) {
        const result = await applyModerationAction({
          action: serverAction,
          targetUserId: resolveBanTargetUserId(ban),
          targetNickname: ban.nickname,
          roomId: ban.roomId || activeRoomId,
          reason: ban.reason,
        });
        if (!result.ok) {
          return {
            ok: false,
            error: result.error || "تعذر تنفيذ الإجراء على السيرفر.",
          };
        }
        setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
        return { ok: true };
      }
    }

    if (!options?.sync) {
      setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
      return { ok: true };
    }

    if (!supabase || !canSyncModerationToSupabase) {
      setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
      return { ok: true };
    }

    const payload: BannedUserRow = {
      uid:
        ban.fingerprint ||
        ban.localStorageId ||
        ban.nickname.trim().toLowerCase(),
      author: ban.nickname,
      banner: ban.banner,
      reason: serializeBanRowReason(ban),
      ban_type: ban.type,
      room_id: ban.roomId || null,
      target_user_id: resolveBanTargetUserId(ban),
    };

    const { data, error } = await supabase
      .from("banned_users")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.warn("Failed to sync ban entry to Supabase", error);
      return {
        ok: false,
        error: formatSupabaseUserError(error, "تعذر مزامنة الحظر مع السيرفر."),
      };
    }

    if (data) {
      setBannedUsersList((prev) =>
        mergeBanLists(prev, [parseBannedUserRow(data as BannedUserRow)]),
      );
    } else {
      setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
    }
    return { ok: true };
  };

  const removeBanEntries = async (
    matcher: (ban: BanInfo) => boolean,
    options?: {
      sync?: boolean;
    },
  ): Promise<{ ok: boolean; error?: string }> => {
    let removedEntries: BanInfo[] = [];
    setBannedUsersList((prev) => {
      removedEntries = prev.filter(matcher);
      return options?.sync ? prev : prev.filter((ban) => !matcher(ban));
    });

    if (!options?.sync || !supabase) {
      if (!options?.sync) {
        return { ok: true };
      }
      setBannedUsersList((prev) => prev.filter((ban) => !matcher(ban)));
      return { ok: true };
    }

    for (const ban of removedEntries) {
      const serverAction = banActionForType(ban.type, true);
      if (
        serverAction === "unmute" ||
        serverAction === "unroom_ban" ||
        serverAction === "unmegaban" ||
        serverAction === "unkick" ||
        serverAction === "unshadow"
      ) {
        const result = await applyModerationAction({
          action: serverAction,
          targetUserId: resolveBanTargetUserId(ban),
          targetNickname: ban.nickname,
          roomId: ban.roomId || activeRoomId,
          reason: ban.reason,
        });
        if (!result.ok) {
          return {
            ok: false,
            error: result.error || "تعذر إلغاء الإجراء على السيرفر.",
          };
        }
        continue;
      }
    }

    if (canSyncModerationToSupabase) {
      const remoteIds = removedEntries
        .map((ban) => ban.id)
        .filter((id): id is string => isUuidLike(id));

      if (remoteIds.length > 0) {
        const { error } = await supabase
          .from("banned_users")
          .delete()
          .in("id", remoteIds);

        if (error) {
          return {
            ok: false,
            error: formatSupabaseUserError(error, "تعذر إزالة الحظر من السيرفر."),
          };
        }
      }
    }

    setBannedUsersList((prev) => prev.filter((ban) => !matcher(ban)));
    return { ok: true };
  };

  const deleteMemberMessagesInRoom = useCallback(
    async (member: ChatMember): Promise<{ ok: boolean; error?: string }> => {
      const roomId = activeRoomId;
      let previousMessages: Message[] = [];
      setRoomMessages((prev) => {
        previousMessages = prev[roomId] || [];
        const filtered = previousMessages.filter((m) => {
          const cleanAuthor = m.author
            .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
            .trim()
            .toLowerCase();
          return cleanAuthor !== member.nickname.toLowerCase();
        });
        return { ...prev, [roomId]: filtered };
      });

      const result = await deleteRoomMessagesByMember(
        roomId,
        member.id,
        member.nickname,
      );

      if (!result.ok) {
        setRoomMessages((prev) => ({ ...prev, [roomId]: previousMessages }));
        return {
          ok: false,
          error: result.error || "تعذر حذف رسائل العضو.",
        };
      }

      return { ok: true };
    },
    [activeRoomId],
  );

  // User profiles click state
  const [selectedProfileMember, setSelectedProfileMember] =
    useState<ChatMember | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileAvatarSaving, setProfileAvatarSaving] = useState(false);
  const [profileAvatarStatus, setProfileAvatarStatus] = useState<string | null>(
    null,
  );
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const [nicknameRequests, setNicknameRequests] = useState<
    NicknameChangeRequestRow[]
  >([]);
  const [nicknameRequestInput, setNicknameRequestInput] = useState("");
  const [nicknameRequestLoading, setNicknameRequestLoading] = useState(false);
  const [nicknameRequestStatusText, setNicknameRequestStatusText] = useState<
    string | null
  >(null);
  const [adminTab, setAdminTab] = useState<
    "actions" | "logs" | "bans" | "reports" | "store_mgmt"
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
  const [showProfilePageModal, setShowProfilePageModal] = useState(false);
  const [profilePageMember, setProfilePageMember] = useState<ChatMember | null>(
    null,
  );

  // Lists of friends, ignored, and blocked users
  const [friendsList, setFriendsList] = useState<string[]>(() =>
    readJsonStorage<string[]>(friendsListStorageKey, []),
  );
  const [ignoredUsers, setIgnoredUsers] = useState<string[]>(() =>
    readJsonStorage<string[]>(ignoredUsersStorageKey, []),
  );
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() =>
    readJsonStorage<string[]>(blockedUsersStorageKey, []),
  );

  useEffect(() => {
    writeStorageValue(friendsListStorageKey, JSON.stringify(friendsList));
    writeStorageValue(ignoredUsersStorageKey, JSON.stringify(ignoredUsers));
    writeStorageValue(blockedUsersStorageKey, JSON.stringify(blockedUsers));
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

  const addReaction = useCallback((roomId: string, messageId: string, emoji: string) => {
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

    const isPersistableId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        messageId,
      );
    if (!isPersistableId) return;

    void persistMessageReaction(messageId, emoji).catch((error) => {
      console.warn("Failed to persist reaction:", error);
      setRoomMessages((prev) => {
        const messagesInRoom = prev[roomId] || [];
        return {
          ...prev,
          [roomId]: messagesInRoom.map((msg) => {
            if (msg.id !== messageId) return msg;
            const reactions = { ...(msg.reactions || {}) };
            const nextCount = (reactions[emoji] || 1) - 1;
            if (nextCount <= 0) {
              delete reactions[emoji];
            } else {
              reactions[emoji] = nextCount;
            }
            return { ...msg, reactions };
          }),
        };
      });
    });
  }, []);

  const canDeleteMessage = useCallback(
    (msg: Message): boolean => {
      if (!msg) return false;
      if (msg.type === "system") return false;
      if (isOwnerRole || isAdminRole) return true;
      if (currentUser.authProvider === "guest" || !currentUser.uid) return false;
      const cleanAuthor = msg.author
        .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
        .trim();
      return cleanAuthor === currentUser.nickname;
    },
    [
      currentUser.authProvider,
      currentUser.nickname,
      currentUser.uid,
      isAdminRole,
      isOwnerRole,
    ],
  );

  const deleteMessage = useCallback(
    (msg: Message) => {
      if (!msg?.id) return;
      const roomId = activeRoomId;
      let previousMessages: Message[] = [];
      setRoomMessages((prev) => {
        previousMessages = prev[roomId] || [];
        const next = previousMessages.filter((m) => m.id !== msg.id);
        return { ...prev, [roomId]: next };
      });
      if (supabase) {
        supabase
          .from("messages")
          .delete()
          .eq("id", msg.id)
          .then(({ error }) => {
            if (error) {
              console.error("Error deleting message from Supabase:", error);
              setRoomMessages((prev) => ({
                ...prev,
                [roomId]: previousMessages,
              }));
              alert("❌ تعذر حذف الرسالة. حاول مرة أخرى.");
            }
          });
      }
    },
    [activeRoomId],
  );

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

      const savedReminders = readJsonStorage<Record<string, boolean>>(
        "lamma_bot_reminders",
        {},
      );

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

  const normalizeChatMemberRole = useCallback(
    (role: string | undefined): ChatMember["role"] => {
      switch (role) {
        case "guest":
        case "user":
        case "vip":
        case "platinum_vip":
        case "host":
        case "mod":
        case "admin":
        case "owner":
          return role;
        default:
          return currentUser.authProvider === "guest" ? "guest" : "user";
      }
    },
    [currentUser.authProvider],
  );

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
  const [roomMemberRolesByUserId, setRoomMemberRolesByUserId] = useState<
    Record<string, MemberRole>
  >({});
  const [globalRoleOverridesByUserId, setGlobalRoleOverridesByUserId] =
    useState<Record<string, MemberRole>>({});
  const [roomTempGrantsByUserId, setRoomTempGrantsByUserId] = useState<
    Record<string, MemberRole>
  >({});
  const [roleGrantsPolicy, setRoleGrantsPolicy] = useState<RoleGrantsPolicy>(
    getDefaultRolePolicy(),
  );

  useEffect(() => {
    void fetchRoleGrantsPolicy().then(setRoleGrantsPolicy);
  }, []);

  useEffect(() => {
    if (!activeRoomId) {
      setRoomTempGrantsByUserId({});
      return;
    }
    let cancelled = false;
    void fetchRoomTempGrants(activeRoomId).then((map) => {
      if (!cancelled) setRoomTempGrantsByUserId(map);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (!supabase || !activeRoomId) return;
    let cancelled = false;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel(`room_temp_grants_${activeRoomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_temp_grants",
            filter: `room_id=eq.${activeRoomId}`,
          },
          (payload) => {
            if (cancelled) return;
            if (payload.eventType === "DELETE") {
              const row = payload.old as { user_id?: string };
              if (!row?.user_id) return;
              setRoomTempGrantsByUserId((prev) => {
                const next = { ...prev };
                delete next[row.user_id as string];
                return next;
              });
              return;
            }
            const row = payload.new as {
              user_id?: string;
              role?: MemberRole;
              expires_at?: string | null;
            };
            if (!row?.user_id || !row?.role) return;
            if (row.expires_at && row.expires_at < new Date().toISOString()) {
              return;
            }
            setRoomTempGrantsByUserId((prev) => ({
              ...prev,
              [row.user_id as string]: row.role as MemberRole,
            }));
          },
        ),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (!supabase) return;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("role_grants_policy_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "role_grants_policy" },
          () => {
            void fetchRoleGrantsPolicy().then(setRoleGrantsPolicy);
          },
        ),
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getOrCreateChatSessionId();
    const onLeave = () => {
      void revokeMyTempGrants();
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pagehide", onLeave);
      void revokeMyTempGrants();
    };
  }, []);

  useEffect(() => {
    if (!activeRoomId) {
      setRoomMemberRolesByUserId({});
      return;
    }
    let cancelled = false;
    void fetchRoomMemberRoles(activeRoomId).then((map) => {
      if (!cancelled) setRoomMemberRolesByUserId(map);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (!supabase || !activeRoomId) return;
    let cancelled = false;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel(`room_member_roles_${activeRoomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_member_roles",
            filter: `room_id=eq.${activeRoomId}`,
          },
          (payload) => {
            if (cancelled) return;
            if (payload.eventType === "DELETE") {
              const row = payload.old as { user_id?: string };
              if (!row?.user_id) return;
              setRoomMemberRolesByUserId((prev) => {
                const next = { ...prev };
                delete next[row.user_id as string];
                return next;
              });
              return;
            }
            const row = payload.new as {
              user_id?: string;
              role?: MemberRole;
            };
            if (!row?.user_id || !row?.role) return;
            setRoomMemberRolesByUserId((prev) => ({
              ...prev,
              [row.user_id as string]: row.role as MemberRole,
            }));
          },
        ),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (
      !supabase ||
      !currentUser.uid ||
      currentUser.authProvider === "guest"
    ) {
      return;
    }
    const uid = currentUser.uid;
    let cancelled = false;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel(`my_global_role_${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_roles",
            filter: `user_id=eq.${uid}`,
          },
          async () => {
            if (cancelled) return;
            const serverRole = await fetchServerUserRole(uid);
            if (serverRole) {
              onUserSessionUpdate?.({ role: serverRole });
            }
          },
        ),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser.authProvider, currentUser.uid, onUserSessionUpdate]);

  const myPresenceRole = useMemo(
    () =>
      resolveEffectiveMemberRole(
        globalRoleOverridesByUserId[currentUser.uid || ""] ||
          (typeof currentUser.role === "string" ? currentUser.role : undefined),
        currentUser.uid ? roomMemberRolesByUserId[currentUser.uid] : null,
        currentUser.uid ? roomTempGrantsByUserId[currentUser.uid] : null,
        currentUser.authProvider === "guest" ? "guest" : "user",
      ),
    [
      currentUser.authProvider,
      currentUser.role,
      currentUser.uid,
      globalRoleOverridesByUserId,
      roomMemberRolesByUserId,
      roomTempGrantsByUserId,
    ],
  );

  const myGranterRole = useMemo(
    () =>
      resolveGranterEffectiveRole(
        typeof currentUser.role === "string" ? currentUser.role : undefined,
        currentUser.uid ? roomMemberRolesByUserId[currentUser.uid] : null,
        currentUser.uid ? roomTempGrantsByUserId[currentUser.uid] : null,
      ),
    [
      currentUser.role,
      currentUser.uid,
      roomMemberRolesByUserId,
      roomTempGrantsByUserId,
    ],
  );

  const handlePromoteMemberRole = useCallback(
    async (input: {
      targetUserId: string;
      targetNickname: string;
      newRole: MemberRole;
      previousRole: MemberRole;
      temporary?: boolean;
      durationMinutes?: number | null;
    }) => {
      if (!canGrantRole(myGranterRole, input.newRole, roleGrantsPolicy)) {
        throw new Error("not_authorized");
      }
      if (!isPersistableMemberId(input.targetUserId)) {
        throw new Error("invalid_target_id");
      }
      const result = await promoteMemberRole({
        roomId: activeRoomId,
        targetUserId: input.targetUserId,
        targetNickname: input.targetNickname,
        newRole: input.newRole,
        operatorNickname: currentDisplayNickname,
        temporary: input.temporary,
        durationMinutes: input.durationMinutes,
      });
      if (!result.ok) {
        throw new Error(result.error || "promote_failed");
      }

      if (result.scope === "global" && input.targetUserId) {
        setGlobalRoleOverridesByUserId((prev) => ({
          ...prev,
          [input.targetUserId]: input.newRole,
        }));
        if (input.targetUserId === currentUser.uid) {
          onUserSessionUpdate?.({ role: input.newRole });
        }
      } else if (result.scope === "temp" && result.role && input.targetUserId) {
        setRoomTempGrantsByUserId((prev) => ({
          ...prev,
          [input.targetUserId]: result.role as MemberRole,
        }));
        if (input.targetUserId === currentUser.uid) {
          onUserSessionUpdate?.({ role: result.role as MemberRole });
        }
      } else if (
        result.scope === "room" &&
        result.role &&
        input.targetUserId
      ) {
        setRoomMemberRolesByUserId((prev) => ({
          ...prev,
          [input.targetUserId]: result.role as MemberRole,
        }));
        setRoomTempGrantsByUserId((prev) => {
          const next = { ...prev };
          delete next[input.targetUserId];
          return next;
        });
      } else if (result.scope === "room_clear") {
        setRoomMemberRolesByUserId((prev) => {
          const next = { ...prev };
          delete next[input.targetUserId];
          return next;
        });
        setRoomTempGrantsByUserId((prev) => {
          const next = { ...prev };
          delete next[input.targetUserId];
          return next;
        });
        setGlobalRoleOverridesByUserId((prev) => {
          const next = { ...prev };
          delete next[input.targetUserId];
          return next;
        });
        if (input.targetUserId === currentUser.uid) {
          onUserSessionUpdate?.({ role: input.newRole });
        }
      }

      return result;
    },
    [
      activeRoomId,
      currentDisplayNickname,
      currentUser.uid,
      myGranterRole,
      onUserSessionUpdate,
      roleGrantsPolicy,
    ],
  );
  type RoomEntryTicker = {
    kind: "join" | "leave" | "standby";
    nickname?: string;
    onlineCount: number;
  };
  const [roomEntryTicker, setRoomEntryTicker] = useState<RoomEntryTicker>({
    kind: "standby",
    onlineCount: 1,
  });
  const isMobileAppShell = useIsMobileViewport();
  const vvLayout = useVisualViewportLayout(isMobileAppShell);
  const roomEntryTickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const showRoomEntryStandby = useCallback((onlineCount: number) => {
    setRoomEntryTicker({
      kind: "standby",
      onlineCount: Math.max(onlineCount, 1),
    });
  }, []);

  const flashRoomEntryEvent = useCallback(
    (
      kind: "join" | "leave",
      nickname: string,
      onlineCount: number,
    ) => {
      if (localStorage.getItem("lamma_greetings_enabled") === "false") {
        showRoomEntryStandby(onlineCount);
        return;
      }
      if (roomEntryTickerTimerRef.current) {
        clearTimeout(roomEntryTickerTimerRef.current);
      }
      setRoomEntryTicker({
        kind,
        nickname,
        onlineCount: Math.max(onlineCount, 1),
      });
      roomEntryTickerTimerRef.current = setTimeout(() => {
        setRoomEntryTicker({
          kind: "standby",
          onlineCount: Math.max(onlineCount, 1),
        });
        roomEntryTickerTimerRef.current = null;
      }, 6000);
    },
    [showRoomEntryStandby],
  );

  const handlePresenceUpdate = useCallback(
    (event: PresenceUpdateEvent) => {
      if (event.type === "join" && event.nickname) {
        flashRoomEntryEvent("join", event.nickname, event.onlineCount);
        return;
      }
      if (event.type === "leave" && event.nickname) {
        flashRoomEntryEvent("leave", event.nickname, event.onlineCount);
        return;
      }
      if (event.type === "sync") {
        setRoomEntryTicker((prev) => {
          if (prev.kind === "join" || prev.kind === "leave") {
            return {
              ...prev,
              onlineCount: Math.max(event.onlineCount, 1),
            };
          }
          return {
            kind: "standby",
            onlineCount: Math.max(event.onlineCount, 1),
          };
        });
      }
    },
    [flashRoomEntryEvent],
  );

  useEffect(() => {
    return () => {
      if (roomEntryTickerTimerRef.current) {
        clearTimeout(roomEntryTickerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (roomEntryTicker.kind !== "standby") return;
    setRoomEntryTicker((prev) => ({
      ...prev,
      onlineCount: Math.max(rawChatMembers.length, 1),
    }));
  }, [rawChatMembers.length, roomEntryTicker.kind]);

  useEffect(() => {
    if (supabase && currentUser.uid && !isGhostMode) {
      return;
    }
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
    isGhostMode,
    myActiveSession.avatar,
    myActiveSession.badge,
    myActiveSession.color,
    myActiveSession.nickname,
    myActiveSession.title,
    myBrowserSig,
    myFingerprint,
    myIp,
  ]);

  useOnlinePresence({
    roomId: activeRoomId,
    currentUser,
    presenceRole: myPresenceRole,
    displayNickname: currentDisplayNickname,
    displayAvatar: currentDisplayAvatar,
    displayColor: currentDisplayColor,
    isGhostMode,
    myFingerprint,
    myBrowserSig,
    setChatMembers,
    normalizeRole: normalizeChatMemberRole,
    onPresenceUpdate: handlePresenceUpdate,
  });

  // Derived chatMembers: hide current user if Ghost Mode is active + merge room roles
  const chatMembers = useMemo(() => {
    const visible = isGhostMode
      ? rawChatMembers.filter((m) => m.nickname !== currentDisplayNickname)
      : rawChatMembers;
    return visible.map((member) => ({
      ...member,
      role: resolveEffectiveMemberRole(
        globalRoleOverridesByUserId[member.id] || member.role,
        roomMemberRolesByUserId[member.id],
        roomTempGrantsByUserId[member.id],
        member.role === "guest" ? "guest" : "user",
      ),
    }));
  }, [
    currentDisplayNickname,
    globalRoleOverridesByUserId,
    isGhostMode,
    rawChatMembers,
    roomMemberRolesByUserId,
    roomTempGrantsByUserId,
  ]);
  const memberRoleSortPriority: Record<string, number> = {
    owner: 0,
    admin: 1,
    mod: 2,
    host: 3,
    platinum_vip: 4,
    vip: 5,
    user: 6,
    guest: 7,
  };
  const orderedChatMembers = useMemo(() => {
    return [...chatMembers].sort((a, b) => {
      const roleA = getRoleFromAuthor(a.nickname, myActiveSession, chatMembers);
      const roleB = getRoleFromAuthor(b.nickname, myActiveSession, chatMembers);
      const priorityA = memberRoleSortPriority[roleA] ?? 99;
      const priorityB = memberRoleSortPriority[roleB] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.nickname.localeCompare(b.nickname, "ar");
    });
  }, [chatMembers, myActiveSession]);

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

  const [chatReports, setChatReports] = useState<ChatReport[]>(() =>
    getCachedChatReports(),
  );
  const openChatReportsCount = useMemo(
    () => chatReports.filter((r) => r.status === "open").length,
    [chatReports],
  );

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

  // Global Owner Control Center states
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isGlobalMute, setIsGlobalMute] = useState(false);
  const [isGlobalMicMute, setIsGlobalMicMute] = useState(false);
  const [isOnlyVIPCanSendImages, setIsOnlyVIPCanSendImages] = useState(false);
  const [isBotSilent, setIsBotSilent] = useState(false);
  const [isAdsEnabled, setIsAdsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("lamma_ads_enabled") !== "false";
  });
  const [isWelcomeToastEnabled, setIsWelcomeToastEnabled] = useState<boolean>(
    () => {
      return localStorage.getItem("lamma_greetings_enabled") !== "false";
    },
  );
  const [djLibrary, setDjLibrary] = useState<OwnerMusicTrack[]>([]);
  const [roomDjMap, setRoomDjMap] = useState<Record<string, RoomDjState>>({});
  const roomDjMapRef = useRef<Record<string, RoomDjState>>({});
  useEffect(() => {
    roomDjMapRef.current = roomDjMap;
  }, [roomDjMap]);
  // Global flags are authoritative from Supabase only — no localStorage cache

  // Overlay styles are applied via designThemeBoot (main + prefetch) — not stale localStorage keys.
  useEffect(() => {
    restoreUiverseScopedOnLoad();
  }, []);

  useEffect(() => {
    localStorage.setItem("lamma_ads_enabled", String(isAdsEnabled));
  }, [isAdsEnabled]);

  useEffect(() => {
    localStorage.setItem(
      "lamma_greetings_enabled",
      String(isWelcomeToastEnabled),
    );
  }, [isWelcomeToastEnabled]);

  useEffect(() => {
    localStorage.setItem("lamma_invite_only_mode", String(isInviteOnlyMode));
  }, [isInviteOnlyMode]);

  const [bannedWords, setBannedWords] = useState<string[]>(() => {
    const saved = localStorage.getItem("lamma_banned_words");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore corrupt local banned-words cache */
      }
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
  >([]);

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

  const canUserControlMusicRadio = useMemo(
    () => canControlMusicRadio(currentUser, memberCustomPermissions),
    [currentUser, memberCustomPermissions],
  );

  const roomCreationQuotaInfo = useMemo(
    () =>
      getRoomCreationQuotaRemaining(
        currentUser,
        memberCustomPermissions,
        myPrivateRoomCount,
      ),
    [currentUser, memberCustomPermissions, myPrivateRoomCount],
  );
  const canShowCreateRoomButton =
    isRegisteredAccount &&
    (isManagementRole || roomCreationQuotaInfo.allowed);
  const pendingPasswordRoom = pendingRoomSwitchId
    ? customRooms.find((room) => room.id === pendingRoomSwitchId)
    : null;

  const [memberCosmeticGrants, setMemberCosmeticGrants] = useState<
    Record<string, MemberCosmeticGrant>
  >(() => {
    const saved = localStorage.getItem("lamma_member_cosmetic_grants");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(
      "lamma_member_cosmetic_grants",
      JSON.stringify(memberCosmeticGrants),
    );
  }, [memberCosmeticGrants]);

  // WebRTC calls — real peer connection with dual-server auto-failover
  const pmTargetNicknameRef = useRef<string | null>(null);
  const pmTargetUidRef = useRef<string | null>(null);

  const resolveMemberUid = useCallback(
    async (nickname: string): Promise<string | null> => {
      const normalized = nickname.trim().toLowerCase();
      const uuidPattern = /^[0-9a-f-]{36}$/i;

      if (pmTargetNicknameRef.current?.trim().toLowerCase() === normalized) {
        const uid = pmTargetUidRef.current;
        if (uid && uuidPattern.test(uid)) {
          return uid;
        }
      }

      for (const list of [rawChatMembers, chatMembers]) {
        const member = list.find(
          (m) => m.nickname.trim().toLowerCase() === normalized,
        );
        if (member?.id && uuidPattern.test(member.id)) {
          return member.id;
        }
      }

      const profile = await fetchUserProfileByNickname(nickname.trim());
      return profile?.userUid ?? null;
    },
    [chatMembers, rawChatMembers],
  );

  const canMakeCall = useCallback(
    (type: "audio" | "video") => {
      if (currentUser.authProvider !== "supabase" || !currentUser.uid) {
        return false;
      }
      const role = (currentUser.role || "").toLowerCase();
      if (role === "guest" || role === "زائر") {
        return false;
      }
      if (
        role === "owner" ||
        role === "admin" ||
        role === "المالك" ||
        role === "أدمن"
      ) {
        return true;
      }
      const perms = memberCustomPermissions[currentUser.nickname];
      // No owner row → default allow (matches Supabase can_place_call)
      if (!perms) {
        return true;
      }
      if (type === "video") return !!perms.videoCallsAllowed;
      return !!perms.callsAllowed;
    },
    [
      currentUser.authProvider,
      currentUser.nickname,
      currentUser.role,
      currentUser.uid,
      memberCustomPermissions,
    ],
  );

  const registeredMemberNames = useMemo(() => {
    const names = new Set<string>();
    for (const member of rawChatMembers) {
      if (member.role !== "guest" && member.nickname?.trim()) {
        names.add(member.nickname.trim());
      }
    }
    for (const nickname of Object.keys(memberCustomPermissions)) {
      names.add(nickname);
    }
    for (const nickname of Object.keys(memberCosmeticGrants)) {
      names.add(nickname);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ar"));
  }, [memberCosmeticGrants, memberCustomPermissions, rawChatMembers]);

  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    initiateCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
  } = useWebRTCCalls({
    currentUser,
    resolveUid: resolveMemberUid,
    canMakeCall,
  });

  const {
    isRecording: isVoiceRecording,
    durationSec: voiceRecordingSec,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    cancelRecording: cancelVoiceRecording,
  } = useVoiceMessageRecorder();
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const voiceRecordingScopeRef = useRef<"room" | "pm">("room");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const bindLocalVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      localVideoRef.current = node;
      if (!node) return;
      node.muted = true;
      node.playsInline = true;
      node.srcObject = localStream ?? null;
      if (localStream?.getVideoTracks().length) {
        void node.play().catch(() => {});
      }
    },
    [localStream],
  );

  const bindRemoteVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteVideoRef.current = node;
      if (!node || !remoteStream) return;
      void playRemoteMedia(node, remoteStream);
    },
    [remoteStream],
  );

  useEffect(() => {
    const node = localVideoRef.current;
    if (!node || activeCall?.type !== "video") return;
    node.srcObject = localStream ?? null;
    if (localStream?.getVideoTracks().length) {
      void node.play().catch(() => {});
    }
  }, [activeCall?.type, localStream]);

  useEffect(() => {
    if (activeCall?.type === "video" && remoteVideoRef.current && remoteStream) {
      void playRemoteMedia(remoteVideoRef.current, remoteStream);
    }
    if (remoteAudioRef.current && remoteStream) {
      void playRemoteMedia(remoteAudioRef.current, remoteStream);
    }
  }, [activeCall?.type, remoteStream]);

  const showVideoCallPanel =
    activeCall?.type === "video" &&
    activeCall.status !== "ended" &&
    activeCall.status !== "failed";
  const hasLocalVideo = Boolean(localStream?.getVideoTracks().some((t) => t.enabled));

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const ownerSettingsSyncReadyRef = useRef(false);
  const ownerPermissionsSyncReadyRef = useRef(false);
  const ownerCosmeticsSyncReadyRef = useRef(false);
  const ownerPermissionsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ownerCosmeticsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ownerSettingsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ownerRlsAlertShownRef = useRef(false);
  const ownerMemberPermissionsAlertShownRef = useRef(false);
  const lastSyncedMemberPermissionsRef = useRef("");
  const lastSyncedMemberCosmeticsRef = useRef("");
  const [ownerWriteAccessOk, setOwnerWriteAccessOk] = useState<boolean | null>(
    null,
  );
  const [applyingStyleSandboxId, setApplyingStyleSandboxId] = useState<
    string | null
  >(null);

  const canPersistOwnerSettings = isOwnerRole && ownerWriteAccessOk === true;

  const syncPublicOwnerSettings = useCallback(
    (settings: PublicChatSettingsPayload) => {
      if (settings.maintenance_mode !== undefined) {
        setIsMaintenanceMode(Boolean(settings.maintenance_mode));
      }
      if (settings.global_mute !== undefined) {
        setIsGlobalMute(Boolean(settings.global_mute));
      }
      if (settings.global_mic_mute !== undefined) {
        setIsGlobalMicMute(Boolean(settings.global_mic_mute));
      }
      if (settings.vip_only_images !== undefined) {
        setIsOnlyVIPCanSendImages(Boolean(settings.vip_only_images));
      }
      if (settings.bot_silent !== undefined) {
        setIsBotSilent(Boolean(settings.bot_silent));
      }
      if (settings.ads_enabled !== undefined) {
        setIsAdsEnabled(settings.ads_enabled !== false);
      }
      if (settings.greetings_enabled !== undefined) {
        setIsWelcomeToastEnabled(settings.greetings_enabled !== false);
      }
      if (settings.invite_only_mode !== undefined) {
        setIsInviteOnlyMode(Boolean(settings.invite_only_mode));
      }
      if (settings.owner_bg_image !== undefined) {
        setOwnerBgImage((prev) => filterSafeMediaUrl(settings.owner_bg_image) || prev);
      }
      if (settings.custom_logo_url !== undefined) {
        const nextLogo = filterSafeMediaUrl(settings.custom_logo_url);
        setBrandLogoUrl((prev) => nextLogo || prev);
        setDesignLogoInput((prev) => nextLogo || prev);
      }
      if (settings.room_bg_map !== undefined) {
        setRoomBgMap((prev) => {
          const fromServer = sanitizeRoomBgMap(settings.room_bg_map);
          return Object.keys(fromServer).length > 0 ? { ...prev, ...fromServer } : prev;
        });
      }
      if (settings.room_dj_map !== undefined) {
        const parsed = parseRoomDjMap(settings.room_dj_map);
        roomDjMapRef.current = parsed;
        setRoomDjMap(parsed);
      }
      if (Array.isArray(settings.design_presets)) {
        setDesignPresets(settings.design_presets as DesignPreset[]);
      }
      if (
        Array.isArray(settings.store_products) &&
        settings.store_products.length > 0
      ) {
        setStoreProducts(
          settings.store_products.filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object" && "id" in item,
          ) as typeof storeProducts,
        );
      }
      if (settings.universal_style_config !== undefined) {
        hydrateUniversalStyleFromSettings(settings.universal_style_config);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOwnerRole) {
      setOwnerWriteAccessOk(null);
      return;
    }
    let cancelled = false;
    void checkOwnerWriteAccessWithClaim().then((result) => {
      if (!cancelled) setOwnerWriteAccessOk(result.ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isOwnerRole, currentUser.uid, currentUser.authProvider]);

  useEffect(() => {
    if (!supabase) return;
    let isCancelled = false;

    if (isManagementRole) {
      const unsubscribe = subscribeChannelWithRetry(() =>
        supabase
          .channel("owner_settings_sync")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "owner_settings",
              filter: "id=eq.global",
            },
            (payload) => {
              if (isCancelled) return;
              const settings = payload.new as OwnerSettingsRow;
              if (settings.ghost_mode !== undefined && isCurrentUserOwner) {
                setIsGhostMode(!!settings.ghost_mode);
              }
              if (settings.spy_mode !== undefined && isCurrentUserOwner) {
                setIsSpyMode(!!settings.spy_mode);
              }
              syncPublicOwnerSettings(settings);
              if (settings.banned_words) {
                setBannedWords(
                  Array.isArray(settings.banned_words)
                    ? settings.banned_words.filter(
                        (word): word is string =>
                          typeof word === "string" && word.trim().length > 0,
                      )
                    : [],
                );
              }
              if (settings.dj_library !== undefined) {
                setDjLibrary(parseDjLibrary(settings.dj_library));
              }
              if (settings.bot_enabled !== undefined) {
                setIsBotEnabled(!!settings.bot_enabled);
              }
              if (settings.bot_rule_anti_links !== undefined) {
                setBotRuleAntiLinks(!!settings.bot_rule_anti_links);
              }
              if (settings.bot_rule_anti_spam !== undefined) {
                setBotRuleAntiSpam(!!settings.bot_rule_anti_spam);
              }
              if (settings.bot_rule_swear_filter !== undefined) {
                setBotRuleSwearFilter(!!settings.bot_rule_swear_filter);
              }
            },
          ),
      );
      return () => {
        isCancelled = true;
        unsubscribe();
      };
    }

    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("public_chat_settings_sync")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "public_chat_settings",
            filter: "id=eq.global",
          },
          (payload) => {
            if (isCancelled) return;
            const row = payload.new as { payload?: PublicChatSettingsPayload };
            if (row.payload) syncPublicOwnerSettings(row.payload);
          },
        ),
    );
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isCurrentUserOwner, isManagementRole, syncPublicOwnerSettings]);

  useEffect(() => {
    if (!supabase || !isManagementRole) return;
    let isCancelled = false;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel('owner_permissions_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'owner_member_permissions' },
          (payload) => {
            if (isCancelled) return;
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const p = payload.new;
              setMemberCustomPermissions(prev => {
                const next = {
                  ...prev,
                  [p.nickname]: {
                    recordingAllowed: !!p.recording_allowed,
                    callsAllowed: !!p.calls_allowed,
                    videoCallsAllowed: !!p.video_calls_allowed,
                    musicRadioAllowed: !!p.music_radio_allowed,
                    roomCreationAllowed: !!p.room_creation_allowed,
                    roomCreationQuota: Number(p.room_creation_quota) || 0,
                    imagesAllowed: !!p.images_allowed,
                    youtubeAllowed: !!p.youtube_allowed,
                  },
                };
                lastSyncedMemberPermissionsRef.current = JSON.stringify(next);
                return next;
              });
            } else if (payload.eventType === 'DELETE') {
              const p = payload.old;
              if (p && p.nickname) {
                setMemberCustomPermissions(prev => {
                  const next = { ...prev };
                  delete next[p.nickname];
                  lastSyncedMemberPermissionsRef.current = JSON.stringify(next);
                  return next;
                });
              }
            }
          },
        ),
    );
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isManagementRole]);

  useEffect(() => {
    if (!supabase || !isManagementRole) return;
    let isCancelled = false;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("owner_cosmetics_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "owner_member_cosmetics" },
          (payload) => {
            if (isCancelled) return;
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const p = payload.new as OwnerMemberCosmeticsRow;
              if (!p.nickname?.trim()) return;
              if (!p.vip_tier && !p.frame) {
                setMemberCosmeticGrants((prev) => {
                  const next = { ...prev };
                  delete next[p.nickname];
                  return next;
                });
                return;
              }
              setMemberCosmeticGrants((prev) => {
                const next = {
                  ...prev,
                  [p.nickname]: {
                    vipTier: p.vip_tier || null,
                    frame: p.frame || null,
                  },
                };
                lastSyncedMemberCosmeticsRef.current = JSON.stringify(next);
                return next;
              });
            } else if (payload.eventType === "DELETE") {
              const p = payload.old as OwnerMemberCosmeticsRow;
              if (p?.nickname) {
                setMemberCosmeticGrants((prev) => {
                  const next = { ...prev };
                  delete next[p.nickname];
                  lastSyncedMemberCosmeticsRef.current = JSON.stringify(next);
                  return next;
                });
              }
            }
          },
        ),
    );
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isManagementRole]);

  useEffect(() => {
    let cancelled = false;

    const loadOwnerData = async () => {
      ownerSettingsSyncReadyRef.current = false;
      ownerPermissionsSyncReadyRef.current = false;
      ownerCosmeticsSyncReadyRef.current = false;

      if (!supabase) {
        ownerSettingsSyncReadyRef.current = true;
        ownerPermissionsSyncReadyRef.current = true;
        ownerCosmeticsSyncReadyRef.current = true;
        return;
      }

      try {
        const settingsRequest = isManagementRole
          ? supabase
              .from("owner_settings")
              .select("*")
              .eq("id", OWNER_SETTINGS_ROW_ID)
              .maybeSingle<OwnerSettingsRow>()
          : supabase
              .from("public_chat_settings")
              .select("payload")
              .eq("id", OWNER_SETTINGS_ROW_ID)
              .maybeSingle<{ payload: PublicChatSettingsPayload }>();
        const permissionsRequest = supabase
          .from("owner_member_permissions")
          .select("*");
        const cosmeticsRequest = supabase
          .from("owner_member_cosmetics")
          .select("*");
        const logsRequest =
          currentUser.role === "owner" || currentUser.role === "admin"
            ? supabase
                .from("owner_activity_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100)
            : Promise.resolve({ data: null, error: null });

        const [settingsResult, permissionsResult, cosmeticsResult, logsResult] =
          await Promise.all([
            settingsRequest,
            permissionsRequest,
            cosmeticsRequest,
            logsRequest,
          ]);

        if (cancelled) return;

        if (settingsResult.data) {
          if (isManagementRole) {
            const settings = settingsResult.data as OwnerSettingsRow;
            if (isCurrentUserOwner) {
              setIsGhostMode(Boolean(settings.ghost_mode));
              setIsSpyMode(Boolean(settings.spy_mode));
            }
            syncPublicOwnerSettings(settings);
            setBannedWords(
              Array.isArray(settings.banned_words)
                ? settings.banned_words.filter(
                    (word): word is string =>
                      typeof word === "string" && word.trim().length > 0,
                  )
                : [],
            );
            if (settings.room_dj_map !== undefined) {
              const parsed = parseRoomDjMap(settings.room_dj_map);
              roomDjMapRef.current = parsed;
              setRoomDjMap(parsed);
            }
            if (settings.dj_library !== undefined) {
              setDjLibrary(parseDjLibrary(settings.dj_library));
            }
            if (settings.bot_enabled !== undefined) {
              setIsBotEnabled(Boolean(settings.bot_enabled));
            }
            if (settings.bot_rule_anti_links !== undefined) {
              setBotRuleAntiLinks(Boolean(settings.bot_rule_anti_links));
            }
            if (settings.bot_rule_anti_spam !== undefined) {
              setBotRuleAntiSpam(Boolean(settings.bot_rule_anti_spam));
            }
            if (settings.bot_rule_swear_filter !== undefined) {
              setBotRuleSwearFilter(Boolean(settings.bot_rule_swear_filter));
            }
            if (
              Array.isArray(settings.store_products) &&
              settings.store_products.length > 0
            ) {
              setStoreProducts(
                settings.store_products.filter(
                  (item): item is Record<string, unknown> =>
                    Boolean(item) && typeof item === "object" && "id" in item,
                ) as typeof storeProducts,
              );
            }
          } else {
            const settings = (settingsResult.data as { payload: PublicChatSettingsPayload })
              .payload;
            if (settings) syncPublicOwnerSettings(settings);
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
              videoCallsAllowed: Boolean(row.video_calls_allowed),
              musicRadioAllowed: Boolean(row.music_radio_allowed),
              roomCreationAllowed: Boolean(row.room_creation_allowed),
              roomCreationQuota: Number(row.room_creation_quota) || 0,
              imagesAllowed: Boolean(row.images_allowed),
              youtubeAllowed: Boolean(row.youtube_allowed),
            };
            return acc;
          }, {});

          lastSyncedMemberPermissionsRef.current = JSON.stringify(nextPermissions);
          setMemberCustomPermissions(nextPermissions);
        }

        if (Array.isArray(cosmeticsResult.data)) {
          const nextCosmetics = (
            cosmeticsResult.data as OwnerMemberCosmeticsRow[]
          ).reduce<Record<string, MemberCosmeticGrant>>((acc, row) => {
            if (!row.nickname?.trim()) return acc;
            if (!row.vip_tier && !row.frame) return acc;
            acc[row.nickname] = {
              vipTier: row.vip_tier || null,
              frame: row.frame || null,
            };
            return acc;
          }, {});
          lastSyncedMemberCosmeticsRef.current = JSON.stringify(nextCosmetics);
          setMemberCosmeticGrants(nextCosmetics);
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
          ownerCosmeticsSyncReadyRef.current = true;
        }
      }
    };

    loadOwnerData();

    return () => {
      cancelled = true;
    };
  }, [currentUser.authProvider, currentUser.role, currentUser.uid, isManagementRole, isCurrentUserOwner, syncPublicOwnerSettings]);

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
        invite_only_mode: isInviteOnlyMode,
        banned_words: bannedWords,
        owner_bg_image: ownerBgImage,
        custom_logo_url: brandLogoUrl,
        room_bg_map: roomBgMap,
        design_presets: designPresets,
        store_products: storeProducts,
        dj_library: djLibrary,
        bot_enabled: isBotEnabled,
        bot_rule_anti_links: botRuleAntiLinks,
        bot_rule_anti_spam: botRuleAntiSpam,
        bot_rule_swear_filter: botRuleSwearFilter,
      };

      const { error } = await supabase
        .from("owner_settings")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.warn("Failed to sync owner settings", error);
        if (error.code === "42501" && !ownerRlsAlertShownRef.current) {
          ownerRlsAlertShownRef.current = true;
          alert(
            "⚠️ تنبيه: التعديلات لم تُحفظ على السيرفر!\n\n" +
            "السبب: حساب المالك لا يملك صلاحية الكتابة في قاعدة البيانات (Supabase RLS).\n\n" +
            "لإصلاح هذا:\n" +
            "1. تأكد أن metadata الحساب يحتوي على role: \"owner\"\n" +
            "2. تأكد من صلاحيات جدول owner_settings في Supabase Dashboard\n\n" +
            "التغييرات ستعمل على جهازك فقط حتى يتم الإصلاح."
          );
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
    isAdsEnabled,
    isBotEnabled,
    isBotSilent,
    isGhostMode,
    isGlobalMicMute,
    isGlobalMute,
    isMaintenanceMode,
    isOnlyVIPCanSendImages,
    isSpyMode,
    isWelcomeToastEnabled,
    isInviteOnlyMode,
    ownerBgImage,
    roomBgMap,
    djLibrary,
    storeProducts,
    botRuleAntiLinks,
    botRuleAntiSpam,
    botRuleSwearFilter,
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
      const snapshot = JSON.stringify(memberCustomPermissions);
      if (snapshot === lastSyncedMemberPermissionsRef.current) {
        return;
      }

      const rows: OwnerMemberPermissionRow[] = Object.entries(
        memberCustomPermissions,
      ).map(([nickname, permissions]) => ({
        nickname,
        updated_by: currentUser.nickname,
        recording_allowed: permissions.recordingAllowed,
        calls_allowed: permissions.callsAllowed,
        video_calls_allowed: permissions.videoCallsAllowed,
        music_radio_allowed: permissions.musicRadioAllowed,
        room_creation_allowed: permissions.roomCreationAllowed,
        room_creation_quota: permissions.roomCreationQuota,
        images_allowed: permissions.imagesAllowed,
        youtube_allowed: permissions.youtubeAllowed,
      }));

      if (rows.length === 0) return;

      const { error } = await supabase
        .from("owner_member_permissions")
        .upsert(rows, { onConflict: "nickname" });

      if (error) {
        console.warn("Failed to sync owner member permissions", error);
        if (
          isOwnerRole &&
          !ownerMemberPermissionsAlertShownRef.current
        ) {
          ownerMemberPermissionsAlertShownRef.current = true;
          alert(
            `⚠️ تعذر حفظ صلاحيات الأعضاء على السيرفر: ${error.message}\n` +
              "تحقق من user_roles (role=owner) وسياسات RLS على owner_member_permissions.",
          );
        }
      } else {
        lastSyncedMemberPermissionsRef.current = snapshot;
      }
    }, OWNER_SYNC_DEBOUNCE_MS);

    return () => {
      if (ownerPermissionsSyncTimeoutRef.current) {
        clearTimeout(ownerPermissionsSyncTimeoutRef.current);
      }
    };
  }, [canPersistOwnerSettings, currentUser.nickname, isOwnerRole, memberCustomPermissions]);

  useEffect(() => {
    if (
      !ownerCosmeticsSyncReadyRef.current ||
      !supabase ||
      !canPersistOwnerSettings
    ) {
      return;
    }

    if (ownerCosmeticsSyncTimeoutRef.current) {
      clearTimeout(ownerCosmeticsSyncTimeoutRef.current);
    }

    ownerCosmeticsSyncTimeoutRef.current = setTimeout(async () => {
      const snapshot = JSON.stringify(memberCosmeticGrants);
      if (snapshot === lastSyncedMemberCosmeticsRef.current) {
        return;
      }

      const rows: OwnerMemberCosmeticsRow[] = Object.entries(
        memberCosmeticGrants,
      ).map(([nickname, grant]) => ({
        nickname,
        updated_by: currentUser.nickname,
        vip_tier: grant.vipTier || null,
        frame: grant.frame || null,
      }));

      const existing = await supabase
        .from("owner_member_cosmetics")
        .select("nickname");
      const keep = new Set(rows.map((r) => r.nickname));
      const toDelete =
        existing.data?.filter((r) => r.nickname && !keep.has(r.nickname)) || [];

      for (const row of toDelete) {
        if (row.nickname) {
          const { error: delErr } = await supabase
            .from("owner_member_cosmetics")
            .delete()
            .eq("nickname", row.nickname);
          if (delErr) {
            console.warn("Failed to delete cosmetic row:", row.nickname, delErr.message);
          }
        }
      }

      if (rows.length === 0) return;

      const { error } = await supabase
        .from("owner_member_cosmetics")
        .upsert(rows, { onConflict: "nickname" });

      if (error) {
        console.warn("Failed to sync owner member cosmetics", error);
      } else {
        lastSyncedMemberCosmeticsRef.current = snapshot;
      }
    }, OWNER_SYNC_DEBOUNCE_MS);

    return () => {
      if (ownerCosmeticsSyncTimeoutRef.current) {
        clearTimeout(ownerCosmeticsSyncTimeoutRef.current);
      }
    };
  }, [canPersistOwnerSettings, currentUser.nickname, memberCosmeticGrants]);

  // Audio refs and states for separate Radio & Music players
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const djBroadcastAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);

  type MusicTrackItem = {
    id: string;
    title: string;
    desc: string;
    url: string;
    isUploaded?: boolean;
  };

  const EMPTY_DJ_TRACK: MusicTrackItem = {
    id: "empty",
    title: "لا توجد أغاني بعد",
    desc: "ارفع أغاني للقائمة",
    url: "",
  };

  const radioStations = RADIO_STATIONS;

  const djPlaylist = useMemo((): MusicTrackItem[] => {
    return djLibrary.map((track) => ({
      id: track.id,
      title: track.title,
      desc: "في قائمة DJ",
      url: track.url,
      isUploaded: true,
    }));
  }, [djLibrary]);

  const [currentRadioStation, setCurrentRadioStation] = useState<RadioStation>(
    RADIO_STATIONS[0],
  );
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);

  const [currentMusicTrack, setCurrentMusicTrack] =
    useState<MusicTrackItem>(EMPTY_DJ_TRACK);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isDjListening, setIsDjListening] = useState(() =>
    readDjListenPreference(),
  );

  useEffect(() => {
    if (djPlaylist.length === 0) {
      setCurrentMusicTrack(EMPTY_DJ_TRACK);
      return;
    }
    setCurrentMusicTrack((prev) => {
      const stillExists = djPlaylist.some((track) => track.id === prev.id);
      return stillExists ? prev : djPlaylist[0];
    });
  }, [djPlaylist]);

  const toggleDjListening = useCallback(() => {
    setIsDjListening((prev) => {
      const next = !prev;
      writeDjListenPreference(next);
      if (!next) {
        djBroadcastAudioRef.current?.pause();
      }
      return next;
    });
  }, []);

  const activeRoomDj = roomDjMap[activeRoomId];

  const syncOwnerRoomDj = useCallback(
    async (
      track: MusicTrackItem | null,
      playing: boolean,
      positionSec = 0,
    ) => {
      if (!canUserControlMusicRadio || !supabase) return;
      const nowMs = Date.now();
      const next = { ...roomDjMapRef.current };
      if (playing && track) {
        next[activeRoomId] = {
          mode: "music",
          trackId: track.id,
          title: track.title,
          url: track.url,
          isPlaying: true,
          startedAtMs: computeDjStartedAtMs(positionSec, nowMs),
          updatedBy: currentUser.nickname,
          updatedAtMs: nowMs,
        };
      } else {
        delete next[activeRoomId];
      }
      roomDjMapRef.current = next;
      setRoomDjMap(next);
      const { map: savedMap, error: djError } = await persistRoomDjState(
        OWNER_SETTINGS_ROW_ID,
        activeRoomId,
        playing && track
          ? next[activeRoomId]!
          : null,
        next,
      );
      if (djError) {
        roomDjMapRef.current = savedMap;
        setRoomDjMap(savedMap);
        console.warn("[DJ] فشل حفظ إعدادات DJ:", djError);
      }
    },
    [activeRoomId, canUserControlMusicRadio, currentUser.nickname],
  );

  useEffect(() => {
    if (canUserControlMusicRadio && isMusicPlaying) return;
    const audio = djBroadcastAudioRef.current;
    if (!audio) return;
    return applyRoomDjToAudio(audio, activeRoomDj, {
      listenEnabled: isDjListening,
    });
  }, [activeRoomDj, activeRoomId, isDjListening, canUserControlMusicRadio, isMusicPlaying]);

  useEffect(() => {
    const stopAllAudio = () => {
      radioAudioRef.current?.pause();
      musicAudioRef.current?.pause();
      djBroadcastAudioRef.current?.pause();
      setIsRadioPlaying(false);
      setIsMusicPlaying(false);
      if (canUserControlMusicRadio) {
        void syncOwnerRoomDj(null, false);
      }
    };

    window.addEventListener("pagehide", stopAllAudio);
    window.addEventListener("beforeunload", stopAllAudio);
    return () => {
      window.removeEventListener("pagehide", stopAllAudio);
      window.removeEventListener("beforeunload", stopAllAudio);
    };
  }, [canUserControlMusicRadio, syncOwnerRoomDj]);

  useEffect(() => {
    return () => {
      [radioAudioRef, musicAudioRef, djBroadcastAudioRef].forEach((ref) => {
        const el = ref.current;
        if (!el) return;
        el.pause();
        el.removeAttribute("src");
        el.load();
      });
    };
  }, []);

  const ensureImagesAccess = () => {
    if (canSendImages(currentUser, memberCustomPermissions, isOnlyVIPCanSendImages))
      return true;
    alert(
      "📸 ميزة رفع الصور غير مفعّلة لحسابك. يمكن للمالك منحها من غرفة القيادة → صلاحيات الأعضاء.",
    );
    return false;
  };

  const ensureYoutubeAccess = () => {
    if (canShareYoutube(currentUser, memberCustomPermissions)) return true;
    alert(
      "🎥 مشاركة يوتيوب/فيديو غير مفعّلة لحسابك. يمكن للمالك منحها من غرفة القيادة → صلاحيات الأعضاء.",
    );
    return false;
  };

  const ensureMusicRadioControl = () => {
    if (canUserControlMusicRadio) return true;
    alert(
      "🎵 التحكم بالموسيقى والراديو للمالك فقط — يمكنه منحك الصلاحية من غرفة القيادة → صلاحيات الأعضاء.",
    );
    return false;
  };

  const startRadioPlayback = async (station: RadioStation = currentRadioStation) => {
    if (!ensureMusicRadioControl()) return;
    const audio = radioAudioRef.current;
    if (!audio) return;
    if (isMusicPlaying && musicAudioRef.current) {
      musicAudioRef.current.pause();
      setIsMusicPlaying(false);
    }
    try {
      await playStreamWithFallbacks(audio, getRadioStreamUrls(station));
      setIsRadioPlaying(true);
    } catch {
      setIsRadioPlaying(false);
      alert("⚠️ تعذر تشغيل محطة الراديو حالياً. جرّب محطة أخرى.");
    }
  };

  const toggleRadioPlay = () => {
    if (!radioAudioRef.current) return;
    if (isRadioPlaying) {
      radioAudioRef.current.pause();
      setIsRadioPlaying(false);
      return;
    }
    if (!ensureMusicRadioControl()) return;
    void startRadioPlayback();
  };

  const handleSelectRadioStation = (station: RadioStation) => {
    if (!ensureMusicRadioControl()) return;
    setCurrentRadioStation(station);
    setIsRadioPlaying(false);
    if (radioAudioRef.current) {
      radioAudioRef.current.pause();
      radioAudioRef.current.removeAttribute("src");
      void startRadioPlayback(station);
    }
  };

  const nextRadioStation = () => {
    if (!ensureMusicRadioControl()) return;
    const idx = radioStations.findIndex((s) => s.id === currentRadioStation.id);
    const nextIdx = (idx + 1) % radioStations.length;
    handleSelectRadioStation(radioStations[nextIdx]);
  };

  const prevRadioStation = () => {
    if (!ensureMusicRadioControl()) return;
    const idx = radioStations.findIndex((s) => s.id === currentRadioStation.id);
    const prevIdx = (idx - 1 + radioStations.length) % radioStations.length;
    handleSelectRadioStation(radioStations[prevIdx]);
  };

  const toggleMusicPlay = () => {
    if (!canUserControlMusicRadio) return;
    if (!musicAudioRef.current) return;
    if (!currentMusicTrack.url) {
      alert("ارفع أغنية للقائمة أولاً ثم اخترها.");
      return;
    }
    if (isMusicPlaying) {
      musicAudioRef.current.pause();
      musicAudioRef.current.removeAttribute("src");
      musicAudioRef.current.load();
      setIsMusicPlaying(false);
      void syncOwnerRoomDj(null, false);
    } else {
      if (isRadioPlaying && radioAudioRef.current) {
        radioAudioRef.current.pause();
        setIsRadioPlaying(false);
      }
      musicAudioRef.current
        .play()
        .then(() => {
          setIsMusicPlaying(true);
          const pos = musicAudioRef.current?.currentTime ?? 0;
          void syncOwnerRoomDj(currentMusicTrack, true, pos);
        })
        .catch(() => {});
    }
  };

  const handleSelectMusicTrack = (
    track: MusicTrackItem,
    broadcastForOwner = false,
  ) => {
    if (!canUserControlMusicRadio && !broadcastForOwner) return;
    if (!track.url) return;
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
          .then(() => {
            setIsMusicPlaying(true);
            if (canUserControlMusicRadio || broadcastForOwner) {
              const pos = musicAudioRef.current?.currentTime ?? 0;
              void syncOwnerRoomDj(track, true, pos);
            }
          })
          .catch(() => {});
      }, 200);
    }
  };

  const handleOwnerMusicUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0 || !canUserControlMusicRadio) return;
    if (currentUser.authProvider !== "supabase") {
      alert("📤 رفع الأغاني يحتاج حساب مسجل دخول Supabase.");
      return;
    }

    try {
      setIsUploadingMusic(true);
      const uploaded: typeof djLibrary = [];
      for (const file of files) {
        const { track, error } = await uploadOwnerMusicFile(file);
        if (error) {
          alert(`❌ ${error}`);
          continue;
        }
        if (track) uploaded.push(track);
      }

      if (uploaded.length === 0) return;

      const nextLibrary = [...uploaded, ...djLibrary];
      setDjLibrary(nextLibrary);
      const { error: persistError } = await persistDjLibrary(
        OWNER_SETTINGS_ROW_ID,
        nextLibrary,
      );
      if (persistError) {
        alert(`❌ ${persistError}`);
        return;
      }

      const firstUploaded = uploaded[0];
      handleSelectMusicTrack(
        {
          id: firstUploaded.id,
          title: firstUploaded.title,
          desc: "في قائمة DJ",
          url: firstUploaded.url,
          isUploaded: true,
        },
        true,
      );
    } finally {
      setIsUploadingMusic(false);
    }
  };

  const nextMusicTrack = () => {
    if (!canUserControlMusicRadio || djPlaylist.length === 0) return;
    const idx = djPlaylist.findIndex((t) => t.id === currentMusicTrack.id);
    const nextIdx = (idx + 1) % djPlaylist.length;
    handleSelectMusicTrack(djPlaylist[nextIdx], true);
  };

  const prevMusicTrack = () => {
    if (!canUserControlMusicRadio || djPlaylist.length === 0) return;
    const idx = djPlaylist.findIndex((t) => t.id === currentMusicTrack.id);
    const prevIdx = (idx - 1 + djPlaylist.length) % djPlaylist.length;
    handleSelectMusicTrack(djPlaylist[prevIdx], true);
  };

  // Custom dropdowns
  const [showNotificationsDropdown, setShowNotificationsDropdown] =
    useState(false);
  const [showGamesDropdown, setShowGamesDropdown] = useState(false);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [showMusicDropdown, setShowMusicDropdown] = useState(false);
  const [showRadioDropdown, setShowRadioDropdown] = useState(false);
  const openRadioFromDeepLink = useCallback(() => setShowRadioDropdown(true), []);
  const applySharedTextFromDeepLink = useCallback((text: string) => {
    setInputText(text);
  }, []);
  useDeepLinkParams({
    onOpenRadio: openRadioFromDeepLink,
    onSharedText: applySharedTextFromDeepLink,
  });
  const [showCommandsDropdown, setShowCommandsDropdown] = useState(false);
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showComposerMoreDropdown, setShowComposerMoreDropdown] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pmImageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pmVideoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Rate limit: max 3 media uploads per 60s per user (rooms + pm combined)
  const mediaRateStateRef = useRef<{ times: number[] }>({ times: [] });
  // Notifications: incoming PMs and mentions
  const [notifications, setNotifications] = useState<
    {
      id: string;
      kind: "pm" | "mention" | "room" | "system";
      title: string;
      body: string;
      at: number;
      read: boolean;
    }[]
  >(() => {
    return readJsonStorage("lamma_notifications", []);
  });
  const [messageToasts, setMessageToasts] = useState<
    { id: string; title: string; body: string }[]
  >([]);
  const toastTimersRef = useRef<Set<number>>(new Set());
  const isPmOpenRef = useRef(false);
  const mobileTabRef = useRef(mobileTab);

  useEffect(() => {
    mobileTabRef.current = mobileTab;
  }, [mobileTab]);

  useEffect(() => bindMessageAlertPriming(), []);

  const pushAppNotification = useCallback(
    (entry: {
      kind: "pm" | "mention" | "room" | "system";
      title: string;
      body: string;
    }) => {
      const newNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: entry.kind,
        title: entry.title,
        body: entry.body.slice(0, 120),
        at: Date.now(),
        read: false,
      };
      setNotifications((prevN) => {
        const next = [newNotif, ...prevN].slice(0, 30);
        try {
          localStorage.setItem("lamma_notifications", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [],
  );

  const showMessageToast = useCallback((title: string, body: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessageToasts((prev) => [...prev, { id, title, body }].slice(-3));
    const timer = window.setTimeout(() => {
      setMessageToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimersRef.current.delete(timer);
    }, 4500);
    toastTimersRef.current.add(timer);
  }, []);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((t) => clearTimeout(t));
      toastTimersRef.current.clear();
    };
  }, []);

  const alertIncomingMessage = useCallback(
    (entry: {
      kind: "pm" | "mention" | "room";
      title: string;
      body: string;
    }) => {
      pushAppNotification(entry);
      showMessageToast(entry.title, entry.body);
      void playMessageAlertSound(entry.kind === "pm" ? "pm" : "default");
      showBrowserMessageNotification(entry.title, entry.body);
    },
    [pushAppNotification, showMessageToast],
  );

  const playMessageSound = useCallback(() => {
    void playMessageAlertSound();
  }, []);

  const handleIncomingRoomMessage = useCallback(
    (sMsg: SupabaseMessage, roomId: string) => {
      const mentionMatch =
        typeof sMsg.text === "string" &&
        sMsg.text.includes(`@${currentUser.nickname}`);

      const viewingPublicChat =
        roomId === activeRoomId &&
        !isPmOpenRef.current &&
        (mobileTabRef.current === "chat" || !isMobileAppShell);

      if (viewingPublicChat && !mentionMatch) return;

      const roomLabel =
        ROOMS_DEF.find((room) => room.id === roomId)?.name || roomId;
      const preview = (sMsg.text || sMsg.media_url || "[مرفق]").slice(0, 120);

      alertIncomingMessage({
        kind: mentionMatch ? "mention" : "room",
        title: mentionMatch
          ? `${sMsg.author} ذكرك في ${roomLabel}`
          : `رسالة جديدة في ${roomLabel}`,
        body: `${sMsg.author}: ${preview}`,
      });
    },
    [activeRoomId, alertIncomingMessage, currentUser.nickname, isMobileAppShell],
  );
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const featuresTrayBtnRef = useRef<HTMLButtonElement>(null);
  const commandsBtnRef = useRef<HTMLButtonElement>(null);
  const attachmentBtnRef = useRef<HTMLButtonElement>(null);
  const composerMoreBtnRef = useRef<HTMLButtonElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  const closeAllDropdowns = useCallback(() => {
    setShowAttachmentDropdown(false);
    setShowGamesDropdown(false);
    setShowMusicDropdown(false);
    setShowRadioDropdown(false);
    setShowEmojiPicker(false);
    setShowNotificationsDropdown(false);
    setShowCommandsDropdown(false);
    setShowPrivacyDropdown(false);
    setShowSettingsDropdown(false);
    setShowComposerMoreDropdown(false);
    setShowFeaturesTray(false);
    setShowHeaderMenu(false);
    setShowPmListDropdown(false);
  }, []);

  const closeFloatingUi = () => {
    setShowRoomsLists(false);
    setShowMembersList(false);
    closeAllDropdowns();
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
    showSettingsDropdown ||
    showComposerMoreDropdown;

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
      | "composerMore"
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
      (dropdown === "settings" && !showSettingsDropdown) ||
      (dropdown === "composerMore" && !showComposerMoreDropdown);

    setActiveModal(null);
    setIsPmOpen(false);
    setShowSearchPop(false);
    setShowUserContextPop(false);
    setShowUserProfileBioPop(false);
    setShowProfileModal(false);
    closeAllDropdowns();

    if (!shouldOpen) return;
    if (dropdown === "commands" && !isOwnerRole && !isAdminRole) return;
    if (dropdown === "privacy" && !isManagementRole) return;

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
      case "composerMore":
        setShowComposerMoreDropdown(true);
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
    if (modal === "store" && !isOwnerRole) {
      setShopTab("vip");
    }
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

  const closeMobileChrome = useCallback(() => {
    if (!isMobileAppShell) return;
    setIsSidebarOpen(false);
    setShowMembersList(false);
    setShowRoomsLists(false);
    closeAllDropdowns();
  }, [closeAllDropdowns, isMobileAppShell]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".lamma-user-overlay")) return;

      const inProtectedPanel =
        target.closest(".dropdown-container") ||
        target.closest(".sidebar-toggle-btn") ||
        target.closest(".sidebar-container") ||
        target.closest(".lamma-sheet-shell") ||
        target.closest(".lamma-popover-shell") ||
        target.closest(".lamma-feature-shell") ||
        target.closest(".lamma-floating-dropdown") ||
        target.closest(".lamma-modal-shell") ||
        target.closest(".lamma-list-panel");

      if (!inProtectedPanel) {
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
        setShowRoomsLists(false);
        setShowMembersList(false);
        if (
          !showProfilePageModal &&
          !showProfileModal &&
          !showUserProfileBioPop &&
          !showUserContextPop
        ) {
          setIsSidebarOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [
    showProfileModal,
    showProfilePageModal,
    showUserContextPop,
    showUserProfileBioPop,
  ]);

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
    if (!supabase || !currentUser.uid || currentUser.authProvider !== "supabase") {
      return;
    }
    let cancelled = false;
    void fetchMyActiveSanctions().then((sanctions) => {
      if (cancelled || sanctions.length === 0) return;
      setBannedUsersList((prev) => mergeBanLists(prev, sanctions));
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser.uid, currentUser.authProvider]);

  useEffect(() => {
    const nick = currentUser.nickname.toLowerCase();
    const uid = currentUser.uid;
    const kickedFromActiveRoom = bannedUsersList.some(
      (ban) =>
        (ban.type === "kick" || ban.type === "room") &&
        ban.roomId === activeRoomId &&
        (ban.nickname.toLowerCase() === nick ||
          ban.fingerprint === uid ||
          ban.localStorageId === uid),
    );
    if (!kickedFromActiveRoom || activeRoomId === "egypt") return;
    endCall();
    setActiveRoomId("egypt");
    alert(
      "🚪 تم طردك من هذه الغرفة لمدة 30 دقيقة. تم نقلك للغرفة الرئيسية.",
    );
  }, [
    activeRoomId,
    bannedUsersList,
    currentUser.nickname,
    currentUser.uid,
    endCall,
  ]);

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

    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
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
            event: "UPDATE",
            schema: "public",
            table: "banned_users",
          },
          (payload) => {
            if (isCancelled) return;
            const updated = parseBannedUserRow(payload.new as BannedUserRow);
            setBannedUsersList((prev) =>
              mergeBanLists(
                prev.filter((ban) => ban.id !== updated.id),
                [updated],
              ),
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
        ),
    );

    return () => {
      isCancelled = true;
      unsubscribe();
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
  const resolveChatMemberByNickname = (nickname: string): ChatMember | null => {
    if (!nickname) return null;
    if (
      nickname.includes("🛡️") ||
      nickname.includes("الحماية") ||
      nickname.includes("نظام") ||
      nickname.includes("تقرير") ||
      nickname.includes("حارس")
    ) {
      return null;
    }

    const cleanName = nickname
      .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
      .trim();

    let member = rawChatMembers.find(
      (m) => m.nickname.toLowerCase() === cleanName.toLowerCase(),
    );

    if (member && isOwnerAuthor(member.nickname, myActiveSession, rawChatMembers)) {
      member = {
        ...member,
        role: "owner",
        avatar: resolveOwnerDisplayAvatar(member.avatar),
        status: member.status === "offline" ? "online" : member.status,
      };
    }

    if (!member) {
      const isGuest =
        cleanName.startsWith("LammaGuest") ||
        cleanName.startsWith("LC-Guest") ||
        cleanName.startsWith("LC_Guest") ||
        cleanName.includes("زائر") ||
        cleanName.includes("Guest");
      const isOwner =
        isOwnerAuthor(cleanName, myActiveSession, rawChatMembers) ||
        rawChatMembers.some(
          (m) =>
            m.role === "owner" &&
            m.nickname.toLowerCase() === cleanName.toLowerCase(),
        );
      const roleFromAuthor = getRoleFromAuthor(
        cleanName,
        myActiveSession,
        rawChatMembers,
      );
      let derivedRole: ChatMember["role"] = isGuest ? "guest" : "user";
      if (isOwner || roleFromAuthor === "owner") derivedRole = "owner";
      else if (roleFromAuthor === "admin") derivedRole = "admin";
      else if (roleFromAuthor === "platinum_vip") derivedRole = "platinum_vip";
      else if (roleFromAuthor === "vip") derivedRole = "vip";
      else {
        const modMember = rawChatMembers.find(
          (m) =>
            m.nickname.toLowerCase() === cleanName.toLowerCase() &&
            m.role === "mod",
        );
        if (modMember) derivedRole = "mod";
      }

      member = {
        id: `offline-${cleanName.toLowerCase().replace(/\s+/g, "-")}`,
        nickname: cleanName,
        role: derivedRole,
        color: derivedRole === "owner" ? "#f59e0b" : "#10b981",
        avatar:
          derivedRole === "owner"
            ? resolveOwnerDisplayAvatar(null)
            : isGuest
              ? "👤"
              : "👨",
        status: "offline",
        email: undefined,
        fingerprint: "",
        browserSignature: "",
        ip: "",
        localStorageId: `offline-${cleanName}`,
      };
    }

    return member;
  };

  const closeProfileOverlays = () => {
    setActiveModal(null);
    setShowCommandsDropdown(false);
    setShowGamesDropdown(false);
    setShowSettingsDropdown(false);
    setShowAttachmentDropdown(false);
    setShowNotificationsDropdown(false);
    setShowSearchPop(false);
    setShowUserContextPop(false);
    setShowUserProfileBioPop(false);
    setIsPmOpen(false);
  };

  const openOwnProfileCard = () => {
    const nickname = myActiveSession.nickname || currentUser.nickname;
    const base = resolveChatMemberByNickname(nickname);
    if (!base) return;

    const member: ChatMember = {
      ...base,
      id: currentUser.uid || base.id,
      nickname: myActiveSession.nickname || base.nickname,
      avatar: myActiveSession.avatar || base.avatar || "👤",
      role: (currentUser.role as ChatMember["role"]) || base.role,
      color: myActiveSession.color || base.color,
      email: currentUser.email || base.email,
      fingerprint: myFingerprint || base.fingerprint,
      browserSignature: myBrowserSig || base.browserSignature,
      ip: myIp || base.ip,
      status: "online",
    };

    closeProfileOverlays();
    setProfileAvatarStatus(null);
    setSelectedProfileMember(member);
    setShowProfileModal(true);
  };

  const applyProfileAvatar = async (avatar: string) => {
    if (!isRegisteredAccount || !currentUser.uid) {
      alert("تخصيص صورة البطاقة متاح للحسابات المسجلة فقط.");
      return;
    }

    setProfileAvatarSaving(true);
    setProfileAvatarStatus(null);

    try {
      const { error } = await persistProfileAvatarToMetadata(avatar);
      if (error) {
        setProfileAvatarStatus(`❌ ${error}`);
        return;
      }

      setMyActiveSession((prev) => ({ ...prev, avatar }));
      onUserSessionUpdate?.({ avatar });
      setSelectedProfileMember((prev) => (prev ? { ...prev, avatar } : prev));
      setChatMembers((prev) =>
        prev.map((member) =>
          member.id === currentUser.uid ||
          member.nickname === (myActiveSession.nickname || currentUser.nickname)
            ? { ...member, avatar }
            : member,
        ),
      );

      try {
        localStorage.setItem(`lamma_profile_avatar_${currentUser.uid}`, avatar);
      } catch {
        // ignore storage quota issues
      }

      setProfileAvatarStatus("✅ تم حفظ صورة البطاقة");
    } finally {
      setProfileAvatarSaving(false);
    }
  };

  const handleSelectProfileEmoji = async (emoji: string) => {
    await applyProfileAvatar(emoji);
  };

  const handleProfileAvatarUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!isRegisteredAccount || !currentUser.uid) {
      alert("تخصيص صورة البطاقة متاح للحسابات المسجلة فقط.");
      return;
    }

    setProfileAvatarSaving(true);
    setProfileAvatarStatus(null);

    try {
      const { url, error } = await uploadProfileAvatarFile(
        file,
        currentUser.uid,
      );
      if (error || !url) {
        setProfileAvatarStatus(`❌ ${error || "تعذر رفع الصورة."}`);
        return;
      }

      await applyProfileAvatar(url);
    } finally {
      setProfileAvatarSaving(false);
    }
  };

  const openMemberProfile = (nickname: string, options?: { direct?: boolean }) => {
    const member = resolveChatMemberByNickname(nickname);
    if (!member) return;

    closeMobileChrome();

    const selfNickname = myActiveSession.nickname || currentUser.nickname;
    const isSelf =
      member.nickname.toLowerCase() === selfNickname.toLowerCase() ||
      nickname.toLowerCase() === selfNickname.toLowerCase();

    if (isSelf && isRegisteredAccount) {
      closeProfileOverlays();
      setProfilePageMember({
        ...member,
        nickname: selfNickname,
        id: currentUser.uid || member.id,
      });
      setShowProfilePageModal(true);
      return;
    }

    if (isSelf) {
      openOwnProfileCard();
      return;
    }

    if (!options?.direct) {
      setUserContextTarget(member);
      setShowUserContextPop(true);
      return;
    }

    closeProfileOverlays();

    if (isManagementRole && !isSelf) {
      setSelectedProfileMember(member);
      setShowProfileModal(true);
      return;
    }

    if (isOwnerChatRole(member.role)) {
      setSelectedProfileMember(member);
      setShowProfileModal(true);
      return;
    }

    const isRegisteredMember =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        member.id,
      ) && member.role !== "guest";

    if (isRegisteredMember) {
      setProfilePageMember(member);
      setShowProfilePageModal(true);
      return;
    }

    setUserProfileBioTarget(member);
    setShowUserProfileBioPop(true);
  };

  const startPrivateChatWithMember = (nickname: string) => {
    const member = resolveChatMemberByNickname(nickname);
    if (!member) return;
    closeMobileChrome();
    setPmTarget({
      nickname: member.nickname,
      role: normalizePmRole(member.role),
      avatar: member.avatar || "👤",
      uid: member.id,
    });
    setMobileTab("private");
    setIsPmOpen(true);
    setActiveModal(null);
    setShowUserContextPop(false);
    setShowUserProfileBioPop(false);
    setShowProfilePageModal(false);
    setProfilePageMember(null);
  };

  const openOwnProfilePage = () => {
    const selfNickname = myActiveSession.nickname || currentUser.nickname;
    const member = resolveChatMemberByNickname(selfNickname) || {
      id: currentUser.uid || `local-${selfNickname}`,
      nickname: selfNickname,
      role: (currentUser.role as ChatMember["role"]) || "user",
      color: currentUser.color || "#10b981",
      avatar: currentUser.avatar || "👤",
      status: "online" as const,
      fingerprint: myFingerprint,
      browserSignature: myBrowserSig,
      localStorageId: `local-${currentUser.uid || selfNickname}`,
    };
    closeMobileChrome();
    setProfilePageMember(member);
    setShowProfilePageModal(true);
  };

  const handleMobileNav = (tab: MobileNavId) => {
    primeMessageAlerts();
    setMobileTab(tab);
    switch (tab) {
      case "chat":
        setIsSidebarOpen(false);
        break;
      case "members":
        setActiveSidebarTab("members");
        setIsSidebarOpen(true);
        break;
      case "private":
        setIsSidebarOpen(false);
        if (!pmTarget) {
          const firstThread = Object.keys(pmThreads)[0];
          if (firstThread) {
            const member = resolveChatMemberByNickname(firstThread);
            setPmTarget({
              nickname: firstThread,
              role: normalizePmRole(member?.role || "user"),
              avatar: member?.avatar || "👤",
              uid: member?.id,
            });
          }
        }
        setIsPmOpen(true);
        break;
      default:
        break;
    }
  };

  const handleInlineMemberTap = useCallback(
    (nickname: string) => {
      if (typeof window !== "undefined" && window.innerWidth < 768) return;
      openMemberProfile(nickname, { direct: true });
    },
    [openMemberProfile],
  );

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
    cleanupPublicChatSession("logout");
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
        (b.type === "room" || b.type === "kick") &&
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

    if (roomId === "admin" && !isAdmin) {
      alert("🛡️ غرفة الإدارة متاحة للمشرفين والمالك فقط. للشكاوى: ادخل غرفة «مساعدة وشكاوى» 📋");
      return;
    }

    if (roomId === "owner" && !isOwner) {
      alert("🎨 غرفة بوت التصميم متاحة للمالك فقط.");
      return;
    }

    const privateRoom = customRooms.find((room) => room.id === roomId);
    if (privateRoom?.isLocked) {
      const isRoomOwner = privateRoom.ownerUid === currentUser.uid;
      const isPrivileged = isOwner || isAdmin || isRoomOwner;
      if (!isPrivileged && !isRoomUnlockedLocally(roomId)) {
        setPendingRoomSwitchId(roomId);
        setIsRoomPasswordModalOpen(true);
        return;
      }
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
  const [pmTextScale, setPmTextScale] = useState(readPmTextScale);
  const [pmPanelTier, setPmPanelTier] = useState(readPmPanelTier);

  // Available system rooms
  const systemRooms = [
    { id: "egypt", name: "مصر", flag: "🇪🇬" },
    { id: "arab", name: "كل العرب", flag: "🌍" },
    { id: "romance", name: "رومانسية", flag: "💖" },
    { id: "youth", name: "لمة شباب وبنات", flag: "👫" },
    { id: "fun", name: "فرفشة", flag: "🥳" },
    { id: "palestine", name: "فلسطين", flag: "🇵🇸" },
    { id: "games", name: "ألعاب", flag: "🎮" },
    { id: "help", name: "مساعدة وشكاوى", flag: "📋" },
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



  const handleIncomingPm = useCallback(
    (payload: {
      senderNickname: string;
      preview: string;
      messageId?: string;
    }) => {
      const viewingPm =
        isPmOpenRef.current &&
        pmTargetNicknameRef.current === payload.senderNickname &&
        (mobileTabRef.current === "private" || !isMobileAppShell);

      if (viewingPm) return;

      alertIncomingMessage({
        kind: "pm",
        title: `رسالة خاصة من ${payload.senderNickname}`,
        body: payload.preview,
      });
    },
    [alertIncomingMessage, isMobileAppShell],
  );

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
    onIncomingPm: handleIncomingPm,
  });

  useEffect(() => {
    localStorage.setItem("lamma_pm_text_scale", String(pmTextScale));
  }, [pmTextScale]);

  useEffect(() => {
    localStorage.setItem("lamma_pm_panel_tier", String(pmPanelTier));
  }, [pmPanelTier]);

  const adjustPmTextScale = useCallback((delta: number) => {
    setPmTextScale((prev) => {
      const next = Math.min(
        PM_TEXT_SCALE_MAX,
        Math.max(PM_TEXT_SCALE_MIN, prev + delta * PM_TEXT_SCALE_STEP),
      );
      return Math.round(next * 100) / 100;
    });
  }, []);

  const handleClearPmConversation = useCallback(async () => {
    if (!pmTarget || pmTarget.nickname.startsWith("🕵️")) return;
    if (
      !window.confirm(
        `مسح كل رسائل المحادثة مع «${pmTarget.nickname}»؟\n\nسيتم الحذف من جهازك والسيرفر ولا يمكن التراجع.`,
      )
    ) {
      return;
    }

    const nickname = pmTarget.nickname;
    try {
      if (currentUser.uid) {
        await clearPrivateConversation({
          currentUserUid: currentUser.uid,
          targetNickname: nickname,
          targetUid: pmTarget.uid,
        });
      }
      setPmThreads((prev) => {
        const next = { ...prev };
        delete next[nickname];
        return next;
      });
    } catch (error) {
      console.warn("clearPrivateConversation failed:", error);
      alert("⚠️ تعذر مسح المحادثة. حاول مرة أخرى.");
    }
  }, [currentUser.uid, pmTarget, setPmThreads]);

  useEffect(() => {
    isPmOpenRef.current = isPmOpen;
  }, [isPmOpen]);

  useEffect(() => {
    pmTargetNicknameRef.current = pmTarget?.nickname ?? null;
    pmTargetUidRef.current = pmTarget?.uid ?? null;
  }, [pmTarget?.nickname, pmTarget?.uid]);

  const {
    posts: socialPosts,
    publishPost,
    likePost,
    commentOnPost,
    reload: reloadSocialFeed,
  } = useSocialFeed({
    currentUser,
    enabled: isPostsRoom || showProfilePageModal,
  });

  useEffect(() => {
    void upsertCurrentUserProfile(currentUser);
  }, [currentUser]);

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
    realtimeConnected,
  } = useChatMessages({
    activeRoomId,
    currentUserNickname: currentDisplayNickname,
    ignoredUsers,
    blockedUsers,
    publicChatSessionStartedAt,
    publicChatSessionStartedAtMs,
    senderUid,
    authProvider: currentUser.authProvider,
    onIncomingMessage: handleIncomingRoomMessage,
  });

  // Room mapped topics
  const [roomTopics, setRoomTopics] = useState<Record<string, string>>({
    egypt: "أهلاً وسهلاً بكم في غرفة مصر 💚",
    arab: "مرحباً بكم في ملتقى كل العرب 🌍",
    "posts-feed":
      "انشر أفكارك ومنشوراتك العامة هنا، وستظهر لكل من يدخل الروم 📰",
    admin: "لوحة رقابة المشرفين، يرجى الحفاظ على النظام 🛡️",
    help: "مساعدة وشكاوى — اكتب مشكلتك أو استفسارك وسيراجعها فريق الإدارة 📋",
    owner: "جدار المالك السري 👑، يمكنك هنا تعديل وتخصيص كل شيء بضغطة زر!",
  });
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicInputText, setTopicInputText] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthError(
        "Supabase غير متصل — أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في البيئة.",
      );
    }
  }, []);

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

  const combinedFeedPosts = useMemo((): SocialPost[] => {
    const legacyPosts: SocialPost[] = postsFeedMessages.map((msg) => ({
      id: msg.id,
      createdAt: msg.time,
      authorUid: "",
      authorNickname: msg.author,
      text: msg.text,
      type: (msg.type as SocialPost["type"]) || "text",
      mediaUrl: msg.mediaUrl,
      color: msg.color,
      likeCount: 0,
      likedByMe: false,
      comments: [],
      isLegacy: true,
    }));
    return [...socialPosts, ...legacyPosts];
  }, [postsFeedMessages, socialPosts]);

  // Audio elements for the in-extras call widget (decorative, not wired to WebRTC)
  const [isMuted, setIsMuted] = useState(false);

  const toggleCallMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStream?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, [localStream]);

  useEffect(() => {
    if (!activeCall) setIsMuted(false);
  }, [activeCall]);
  const showSidebarCall =
    Boolean(activeCall) &&
    activeCall!.status !== "ended" &&
    activeCall!.status !== "failed";
  const sidebarCallSeconds = activeCall?.callDuration ?? 0;

  // Audio visualizer wave heights
  const [waveHeights, setWaveHeights] = useState([
    12, 28, 45, 12, 34, 18, 50, 14, 38, 22, 10,
  ]);

  // Flying entities vectors
  const [flyingElements, setFlyingElements] = useState<
    { id: string; char: string; left: number }[]
  >([]);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const feedViewportRef = useRef<HTMLDivElement>(null);
  const pointerDragCleanupRef = useRef<(() => void) | null>(null);
  const pmViewportRef = useRef<HTMLDivElement>(null);
  const pmEndRef = useRef<HTMLDivElement>(null);
  const chatStickToBottomRef = useRef(true);
  const roomRateLimitRef = useRef<number[]>([]);
  const pmRateLimitRef = useRef<number[]>([]);

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

  // Scroll logic — only auto-scroll when user is already near the bottom
  const handleChatFeedScroll = useCallback(() => {
    const el = feedViewportRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    chatStickToBottomRef.current = distanceFromBottom < 160;
  }, []);

  const scrollChatToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = feedViewportRef.current;
      if (!el) return;
      chatStickToBottomRef.current = true;
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    },
    [],
  );

  useEffect(() => {
    if (!isMobileAppShell || !vvLayout.keyboardOpen) return;
    const t1 = window.setTimeout(() => scrollChatToBottom("auto"), 40);
    const t2 = window.setTimeout(() => scrollChatToBottom("smooth"), 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [
    isMobileAppShell,
    vvLayout.keyboardOpen,
    scrollChatToBottom,
    messages.length,
  ]);

  useEffect(() => {
    if (!isMobileAppShell) return;
    const cls = "lamma-keyboard-open";
    if (vvLayout.keyboardOpen) {
      document.documentElement.classList.add(cls);
      document.body.classList.add(cls);
      window.scrollTo(0, 0);
    } else {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    }
    return () => {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    };
  }, [isMobileAppShell, vvLayout.keyboardOpen]);

  useEffect(() => {
    if (!isMobileAppShell) return;
    const cls = "lamma-modal-open";
    const open = Boolean(activeModal) || hasFloatingDropdownOpen;
    if (open) {
      document.documentElement.classList.add(cls);
      document.body.classList.add(cls);
    } else {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    }
    return () => {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    };
  }, [isMobileAppShell, activeModal, hasFloatingDropdownOpen]);

  useEffect(() => {
    if (isPostsRoom) {
      feedViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const roomMsgs = messages;
    const lastMsg = roomMsgs[roomMsgs.length - 1];
    if (lastMsg?.isOwn) {
      chatStickToBottomRef.current = true;
    }
    if (!chatStickToBottomRef.current) return;
    const t = window.setTimeout(() => scrollChatToBottom("auto"), 16);
    return () => window.clearTimeout(t);
  }, [isPostsRoom, messages.length, scrollChatToBottom]);

  useEffect(() => {
    pmEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pmMessages]);

  useEffect(() => {
    if (
      activeCall?.status !== "connected" &&
      activeCall?.status !== "reconnecting"
    ) {
      return;
    }
    const waveTimer = setInterval(() => {
      setWaveHeights((prev) =>
        prev.map(() => Math.floor(Math.random() * 38) + 12),
      );
    }, 1000);
    return () => clearInterval(waveTimer);
  }, [activeCall?.status]);

  useEffect(() => {
    return () => {
      pointerDragCleanupRef.current?.();
      pointerDragCleanupRef.current = null;
    };
  }, []);

  // Simulated bot chat reactions
  const addBotSystemWarning = (roomId: string, text: string) => {
    if (isBotSilent) return;
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const botWarningMsg: Message = {
      id: `guard-${Date.now()}`,
      author: "🔥 LC-Fire",
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
        [roomId]: [...currentMsgs, botWarningMsg],
      };
    });
  };

  const addLammaBotMessage = useCallback((roomId: string, text: string) => {
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
  }, [isBotSilent, setRoomMessages]);

  const refreshChatReports = useCallback(async () => {
    if (isManagementRole) {
      const merged = await syncChatReportsForStaff();
      setChatReports(merged);
      return;
    }
    setChatReports(getCachedChatReports());
  }, [isManagementRole]);

  useEffect(() => {
    if (!isManagementRole) return;
    void refreshChatReports();
    return subscribeToChatReports(() => {
      void refreshChatReports();
    });
  }, [isManagementRole, refreshChatReports]);

  const handleReportMessage = useCallback(
    async (msg: Message) => {
      if (msg.type === "system" || msg.author === currentUser.nickname) return;

      const reason = window.prompt(
        `🚩 بلاغ عن ${msg.author}\n\nاكتب سبباً مختصراً (اختياري):`,
        "",
      );
      if (reason === null) return;

      const roomName =
        ROOMS_DEF.find((r) => r.id === activeRoomId)?.name || activeRoomId;
      const excerpt =
        msg.text?.trim() ||
        (msg.type === "image"
          ? "[صورة]"
          : msg.type === "video"
            ? "[فيديو]"
            : "[رسالة]");

      const result = await submitChatReport({
        reporterUid: currentUser.uid,
        reporterNickname: currentUser.nickname,
        reporterColor: currentUser.color,
        reportedNickname: msg.author,
        roomId: activeRoomId,
        roomName,
        messageId: msg.id,
        messageExcerpt: excerpt,
        reason: reason.trim() || undefined,
      });

      if (!result.ok) {
        alert(
          result.error === "already_reported"
            ? "⚠️ بلّغت عن هذه الرسالة من قبل."
            : "⚠️ تعذر إرسال البلاغ. حاول مجدداً أو اكتب في غرفة المساعدة.",
        );
        return;
      }

      await refreshChatReports();
      alert("✅ تم إرسال البلاغ. شكراً — فريق الإدارة سيراجعه.");
    },
    [
      activeRoomId,
      currentUser.color,
      currentUser.nickname,
      currentUser.uid,
      refreshChatReports,
    ],
  );

  const submitHelpRoomTicket = useCallback(
    async (complaintText: string) => {
      const excerpt = complaintText.trim();
      if (!excerpt || excerpt.startsWith("/")) return;

      const result = await submitChatReport({
        reporterUid: currentUser.uid,
        reporterNickname: currentUser.nickname,
        reporterColor: currentUser.color,
        reportedNickname: "—",
        roomId: "help",
        roomName: "مساعدة وشكاوى",
        messageExcerpt: excerpt,
        reason: "طلب مساعدة من غرفة المساعدة",
      });

      if (result.ok) {
        await refreshChatReports();
        addLammaBotMessage(
          "help",
          "✅ تم استلام شكواك — فريق الإدارة سيراجعها من لوحة البلاغات. شكراً 🙏",
        );
      }
    },
    [
      addLammaBotMessage,
      currentUser.color,
      currentUser.nickname,
      currentUser.uid,
      refreshChatReports,
    ],
  );

  useEffect(() => {
    if (activeRoomId === "admin" && !isManagementRole) {
      alert(
        "🛡️ غرفة الإدارة متاحة للمشرفين والمالك فقط. للشكاوى: ادخل غرفة «مساعدة وشكاوى» 📋",
      );
      setActiveRoomId("help");
      return;
    }
    if (activeRoomId === "owner" && !isOwnerRole) {
      alert("🎨 غرفة بوت التصميم متاحة للمالك فقط.");
      setActiveRoomId("egypt");
    }
  }, [activeRoomId, isManagementRole, isOwnerRole]);

  const canReportMessage = useCallback(
    (msg: Message) => {
      if (msg.type === "system") return false;
      if (msg.author === currentUser.nickname) return false;
      if (/LAMMA|LC-Fire|نظام|🤖|🔥/.test(msg.author)) return false;
      return true;
    },
    [currentUser.nickname],
  );

  const handleResolveReport = useCallback(
    async (reportId: string, status: ChatReportStatus) => {
      const ok = await updateChatReportStatus(
        reportId,
        status,
        currentUser.nickname,
      );
      if (ok) {
        addSystemActivityLog(
          "demote",
          reportId,
          `تحديث حالة بلاغ إلى: ${status}`,
          currentUser.nickname,
        );
        await refreshChatReports();
      }
    },
    [addSystemActivityLog, currentUser.nickname, refreshChatReports],
  );

  useEffect(() => {
    if (activeRoomId !== "help") return;
    const key = "lamma_help_welcome_v1";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    addLammaBotMessage(
      "help",
      `📋 أهلاً في غرفة المساعدة والشكاوى!

• اكتب مشكلتك أو شكواك هنا — فريق الإدارة يراجع الرسائل
• أو استخدم 🚩 على أي رسالة مخالفة في الغرف الأخرى
• للأوامر: /complaint أو /شكوى

⏳ يرجى احترام الآداب وعدم نشر بيانات شخصية.`,
    );
  }, [activeRoomId, addLammaBotMessage]);

  useEffect(() => {
    if (sessionStorage.getItem("lamma_rules_tip_v1")) return;
    if (activeRoomId === "owner" || activeRoomId === "admin") return;
    sessionStorage.setItem("lamma_rules_tip_v1", "1");
    addLammaBotMessage(
      activeRoomId,
      `🤖 LAMMA SYSTEM: أهلاً في شات لمة! احترم الآداب — للشكاوى: غرفة «مساعدة وشكاوى» 📋 أو زر 🚩 على الرسالة.`,
    );
  }, [activeRoomId, addLammaBotMessage]);

  const [styleSandboxes, setStyleSandboxes] = useState<
    Record<string, StyleSandboxSession>
  >({});

  const appendStyleSandboxMessage = useCallback(
    (roomId: string, session: StyleSandboxSession, botReply: string) => {
      setStyleSandboxes((prev) => {
        const next = { ...prev, [session.id]: session };
        const ids = Object.keys(next);
        if (ids.length <= MAX_STYLE_SANDBOX_SESSIONS) return next;
        const keep = ids
          .sort(
            (a, b) =>
              (next[b]?.createdAt || 0) - (next[a]?.createdAt || 0),
          )
          .slice(0, MAX_STYLE_SANDBOX_SESSIONS);
        return Object.fromEntries(keep.map((id) => [id, next[id]]));
      });
      setRoomMessages((prev) => ({
        ...prev,
        [roomId]: [
          ...(prev[roomId] || []),
          ...buildStyleSandboxMessage(
            session,
            botReply,
            currentDisplayNickname,
          ),
        ].slice(-200),
      }));
    },
    [currentDisplayNickname, setRoomMessages],
  );

  const {
    committedConfig,
    getEditableDesignConfig,
    tryHandleOwnerStylePrompt,
    applyStyleGlobally,
    cancelStyleSandbox,
    resetChatBackgroundToDefault,
    previewDesignPrompt,
    previewDesignPromptAi,
    previewDesignConfig,
    commitPendingDesignPreview,
    cancelPendingDesignPreview,
    flushAllDesignPersistence,
    verifyDesignPreviewDom,
    hasPendingDesignPreview,
    isApplyingStyle,
  } = useUniversalStyleEngine({
    activeRoomId,
    isOwner: isOwnerRole,
    ownerSettingsRowId: OWNER_SETTINGS_ROW_ID,
    setOwnerBgImage,
    addLammaBotMessage,
    appendStyleSandboxMessage,
  });

  const handleResetDefaultChatBackground = useCallback(async () => {
    const ok = await resetChatBackgroundToDefault();
    setDesignOwnerBgInput("");
    if (ok) {
      alert("✅ رجّعت خلفية الشات للافتراضي (/MAN.png).");
    } else {
      alert("⚠️ تم التراجع محلياً — تأكد من صلاحيات المالك على Supabase.");
    }
  }, [resetChatBackgroundToDefault]);

  const [isFlushingDesignSave, setIsFlushingDesignSave] = useState(false);

  const handleCloseActiveModal = useCallback(async () => {
    const isDesignOpen =
      activeModal === "leadership" && leadershipTab === "design" && isOwnerRole;
    if (isDesignOpen) {
      setIsFlushingDesignSave(true);
      try {
        const result = await flushAllDesignPersistence();
        if (!result.ok) {
          alert(
            result.localOnly
              ? `⚠️ ${result.message}\n\n(اتحفظ على جهازك — السيرفر رفض.)`
              : `⚠️ ${result.message}`,
          );
        }
      } finally {
        setIsFlushingDesignSave(false);
      }
    }
    setActiveModal(null);
  }, [
    activeModal,
    flushAllDesignPersistence,
    isOwnerRole,
    leadershipTab,
  ]);

  const handleStartDesignInspect = useCallback(async () => {
    if (!isOwnerRole) return;
    setIsFlushingDesignSave(true);
    try {
      await flushAllDesignPersistence();
    } finally {
      setIsFlushingDesignSave(false);
    }
    setActiveModal(null);
    setDesignInspectActive(true);
    setInspectSelectedRegion(null);
    setInspectHighlightRect(null);
    setInspectTargetEl(null);
    setInspectLastSummary("");
    setInspectPreviewConfig(null);
  }, [flushAllDesignPersistence, isOwnerRole]);

  const handleExitDesignInspect = useCallback(() => {
    if (hasPendingDesignPreview) cancelPendingDesignPreview();
    setDesignInspectActive(false);
    setInspectSelectedRegion(null);
    setInspectHighlightRect(null);
    setInspectTargetEl(null);
    setInspectLastSummary("");
    setInspectPreviewConfig(null);
  }, [cancelPendingDesignPreview, hasPendingDesignPreview]);

  const handleInspectRegionAction = useCallback(
    (region: ChatDesignRegion, action: RegionAction) => {
      const prompt = buildRegionActionPrompt(region, action);
      const result = previewDesignPrompt(prompt);
      if (result) {
        setInspectLastSummary(result.summary);
        setInspectPreviewConfig(result.config);
      }
    },
    [previewDesignPrompt],
  );

  const handleInspectCustomPrompt = useCallback(
    async (region: ChatDesignRegion, prompt: string) => {
      const regionTerms: Partial<Record<ChatDesignRegion, string>> = {
        "top-header": "الشريط العلوي",
        "room-header-strip": "الشريط تحت الهيدر",
        "topic-bar": "شريط موضوع الغرفة",
        "chat-feed": "منطقة الرسائل",
        "chat-wallpaper": "خلفية الشات",
        composer: "شريط الكتابة",
        "side-columns": "الأعمدة الجانبية",
        "column-cards": "بطاقات الأعمدة",
        "message-bubbles": "فقاعات الرسائل",
      };
      const regionHint = regionTerms[region] || "";
      const fullPrompt = prompt.includes(regionHint)
        ? prompt
        : `${prompt} ${regionHint}`.trim();

      // Gemini أولاً — يفهم أي طلب حر على العنصر المحدّد، ويرجع للمحرّك القاعدي تلقائياً لو فشل.
      setInspectLastSummary("✨ Gemini بيفكّر…");
      try {
        const aiResult = await previewDesignPromptAi(fullPrompt);
        if (aiResult) {
          setInspectLastSummary(
            aiResult.fromAi ? `✨ Gemini: ${aiResult.summary}` : aiResult.summary,
          );
          setInspectPreviewConfig(aiResult.config);
          return;
        }
      } catch {
        // fall through to rule-based
      }

      const result = previewDesignPrompt(fullPrompt);
      if (result) {
        setInspectLastSummary(result.summary);
        setInspectPreviewConfig(result.config);
      } else {
        setInspectLastSummary("⚠️ لم أفهم الطلب — جرّب صياغة أوضح (مثلاً: «اعمل اللون أزرق»).");
      }
    },
    [previewDesignPromptAi, previewDesignPrompt],
  );

  const handleApplyInspectSuggestion = useCallback(
    (suggestion: DesignInspectSuggestion) => {
      const result = previewDesignPrompt(suggestion.prompt);
      if (result) {
        setInspectLastSummary(
          `💡 ${formatSuggestionOneLiner(suggestion)}\n\n${result.summary}`,
        );
        setInspectPreviewConfig(result.config);
      }
    },
    [previewDesignPrompt],
  );

  const handleInspectCommit = useCallback(async () => {
    setInspectApplying(true);
    try {
      const result = await commitPendingDesignPreview();
      if (result.ok) {
        setInspectLastSummary("✅ تم حفظ التصميم للجميع.");
        alert("✅ تم تطبيق التصميم على كل المستخدمين.");
      } else {
        alert(result.localOnly
          ? `⚠️ ${result.message}\n\n(اتحفظ محلياً على جهازك بس.)`
          : `⚠️ ${result.message}`);
      }
    } finally {
      setInspectApplying(false);
    }
  }, [commitPendingDesignPreview]);

  const handleInspectCancel = useCallback(() => {
    cancelPendingDesignPreview();
    setInspectPreviewConfig(null);
    setInspectLastSummary("↩️ تم إلغاء المعاينة.");
  }, [cancelPendingDesignPreview]);

  useEffect(() => {
    if (!designInspectActive) return;

    const onCaptureClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-design-inspect-panel]")) return;

      const region = resolveDesignRegionFromElement(target);
      const regionEl = resolveDesignRegionElement(target);
      if (!region || !regionEl) return;

      event.preventDefault();
      event.stopPropagation();

      setInspectSelectedRegion(region);
      setInspectTargetEl(regionEl);
      setInspectHighlightRect(regionEl.getBoundingClientRect());
    };

    document.addEventListener("click", onCaptureClick, true);
    return () => document.removeEventListener("click", onCaptureClick, true);
  }, [designInspectActive]);

  useEffect(() => {
    if (!designInspectActive || !inspectTargetEl) return;

    const updateRect = () => {
      setInspectHighlightRect(inspectTargetEl.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [designInspectActive, inspectTargetEl]);

  const activeUniversalStyle = useMemo(
    () => committedConfig || loadUniversalStyleLocal(),
    [committedConfig],
  );

  const inspectStyleConfig = inspectPreviewConfig || activeUniversalStyle;

  const inspectSuggestions = useMemo(
    () =>
      designInspectActive
        ? buildDesignInspectSuggestions(inspectStyleConfig, inspectSelectedRegion, 4)
        : [],
    [designInspectActive, inspectSelectedRegion, inspectStyleConfig],
  );

  const universalGlobalMedia =
    activeUniversalStyle?.backgrounds.global.kind !== "color";
  const shellClearBg =
    universalGlobalMedia || !isDefaultAmbientBg ? "false" : "true";

  const handleApplyStyleSandbox = useCallback(
    async (session: StyleSandboxSession) => {
      setApplyingStyleSandboxId(session.id);
      try {
        const result = await applyStyleGlobally(session);
        if (result.ok) {
          setStyleSandboxes((prev) => ({
            ...prev,
            [session.id]: { ...session, applied: true },
          }));
          setRoomMessages((prev) => {
            const roomMsgs = prev[activeRoomId] || [];
            return {
              ...prev,
              [activeRoomId]: roomMsgs.map((m) =>
                m.styleSandboxId === session.id
                  ? { ...m, styleSandboxApplied: true }
                  : m,
              ),
            };
          });
        }
      } finally {
        setApplyingStyleSandboxId(null);
      }
    },
    [activeRoomId, applyStyleGlobally, setRoomMessages],
  );

  const resolveStyleSandboxSession = useCallback(
    (msg: Message): StyleSandboxSession | null => {
      if (!msg.styleSandboxId) return null;
      const fromState = styleSandboxes[msg.styleSandboxId];
      if (fromState) return fromState;
      if (msg.styleSandboxConfig) {
        return {
          id: msg.styleSandboxId,
          createdAt: Date.now(),
          prompt: msg.text,
          summary: msg.styleSandboxSummary || "",
          config: msg.styleSandboxConfig,
          applied: Boolean(msg.styleSandboxApplied),
        };
      }
      return null;
    },
    [styleSandboxes],
  );

  useEffect(() => {
    setOpenReactionMsgId(null);
  }, [activeRoomId]);

  const handleToggleReaction = useCallback((messageId: string) => {
    setOpenReactionMsgId((prev) => (prev === messageId ? null : messageId));
  }, []);

  const renderRoomMessage = useCallback(
    (msg: Message) => (
      <ChatMessageRow
        msg={msg}
        isCompactView={isCompactView}
        isChatColumnExpanded={isChatColumnExpanded}
        myActiveSession={myActiveSession}
        chatMembers={chatMembers}
        subscription={subscription}
        memberCosmeticGrants={memberCosmeticGrants}
        activeTempEntryTopic={activeTempEntryTopic}
        openReactionMsgId={openReactionMsgId}
        applyingStyleSandboxId={applyingStyleSandboxId}
        activeRoomId={activeRoomId}
        onMemberTap={handleInlineMemberTap}
        onToggleReaction={handleToggleReaction}
        onAddReaction={addReaction}
        onDeleteMessage={deleteMessage}
        canDeleteMessage={canDeleteMessage}
        onReportMessage={(m) => void handleReportMessage(m)}
        canReportMessage={canReportMessage}
        resolveStyleSandboxSession={resolveStyleSandboxSession}
        onApplyStyleSandbox={handleApplyStyleSandbox}
        onCancelStyleSandbox={cancelStyleSandbox}
      />
    ),
    [
      activeRoomId,
      activeTempEntryTopic,
      addReaction,
      applyingStyleSandboxId,
      cancelStyleSandbox,
      canDeleteMessage,
      chatMembers,
      deleteMessage,
      handleApplyStyleSandbox,
      handleInlineMemberTap,
      handleToggleReaction,
      isChatColumnExpanded,
      isCompactView,
      memberCosmeticGrants,
      myActiveSession,
      openReactionMsgId,
      handleReportMessage,
      canReportMessage,
      resolveStyleSandboxSession,
      subscription,
    ],
  );

  const renderPmMessage = useCallback(
    (msg: PMThreadMessage) => {
      if (!pmTarget) return null;
      const spyParts = pmTarget.nickname.startsWith("🕵️")
        ? pmTarget.nickname.replace("🕵️ ", "").split(" -> ")
        : null;
      const spySenderLabel = spyParts
        ? msg.isOwn
          ? spyParts[0]
          : spyParts[1]
        : null;
      return (
        <PmMessageRow
          msg={msg}
          targetNickname={pmTarget.nickname}
          spySenderLabel={spySenderLabel}
          fontScale={pmTextScale}
        />
      );
    },
    [pmTarget, pmTextScale],
  );

  const activeRoomIdRef = useRef(activeRoomId);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  // ── Load real subscription plans from DB ────────────────────────────────
  useEffect(() => {
    fetchActivePlans()
      .then(setSubscriptionPlans)
      .catch((err) => console.warn("fetchActivePlans failed:", err));
  }, []);

  // ── Load user's DB subscription on mount ────────────────────────────────
  useEffect(() => {
    const uid = currentUser.uid;
    if (!uid) return;
    fetchMySubscription(uid)
      .then((dbSub) => {
        if (dbSub && dbSub.isActive) {
          setSubscription((prev: any) => {
            if (prev?.isActive && prev.expiresAt >= dbSub.expiresAt) return prev;
            return { isActive: true, expiresAt: dbSub.expiresAt, badge: dbSub.badge, type: "vip" };
          });
        }
      })
      .catch((err) => console.warn("fetchMySubscription failed:", err));
    const unsub = subscribeToMySubscription(uid, (activated) => {
      setSubscription({ isActive: true, expiresAt: activated.expiresAt, badge: activated.badge, type: "vip" });
      addLammaBotMessage(activeRoomIdRef.current, `🎉 تم تفعيل اشتراكك في ${activated.planName} بنجاح! استمتع بمميزاتك 💎`);
    });
    return () => { if (unsub && supabase) supabase.removeChannel(unsub as any); };
  }, [currentUser.uid, addLammaBotMessage]);

  // ── Owner: listen for new pending orders (badge notification) ───────────
  useEffect(() => {
    if (!isOwnerRole) return;
    const unsub = subscribeToNewOrders(() => {
      setPendingOrdersCount((c) => c + 1);
    });
    return () => { if (unsub && supabase) supabase.removeChannel(unsub as any); };
  }, [isOwnerRole]);

  const handleAccelerateDays = (days: number) => {
    const sub = readJsonStorage<any>(subscriptionStorageKey, null);
    if (!sub) {
      alert(
        "❌ لا يوجد اشتراك VIP نشط حالياً لتسريع عجلة الزمن عليه! يرجى شراء باقة VIP أولاً من واجهة المتجر.",
      );
      return;
    }

    if (!sub.isActive) {
      alert("❌ الاشتراك الحالي معطل أو منتهي بالفعل!");
      return;
    }

    // Physically advance time by making expiresAt closer (subtract days)
    const adjustedSub = {
      ...sub,
      expiresAt: sub.expiresAt - days * 24 * 60 * 60 * 1000,
    };
    writeStorageValue(subscriptionStorageKey, JSON.stringify(adjustedSub));
    setSubscription(adjustedSub);

    addLammaBotMessage(
      activeRoomId || "room1",
      `⏳ تم تقديم الوقت بمقدار ${days} أيام على نظام متابعة الاشتراك لأغراض المراجعة.`,
    );
  };

  const { handleSendMessage: sendRoomMessage } = useRoomComposer({
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
    rateLimitRef: roomRateLimitRef,
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
    onOwnerStylePrompt: tryHandleOwnerStylePrompt,
    canShareYoutubeInMessage: () =>
      canShareYoutube(currentUser, memberCustomPermissions),
  });

  const handleSendMessage = useCallback(async () => {
    const trimmed = inputText.trim();

    if (isPostsRoom) {
      if (!trimmed) return;
      if (!canPublishPosts) {
        alert(
          "📰 النشر في روم المنشورات متاح للأعضاء المسجلين فقط.",
        );
        return;
      }
      try {
        await publishPost({ text: trimmed, type: "text" });
        setInputText("");
        bumpUserStat("messagesSent");
      } catch (error) {
        alert(
          error instanceof Error
            ? `❌ تعذر نشر المنشور: ${error.message}`
            : "❌ تعذر نشر المنشور.",
        );
      }
      return;
    }

    const isHelpComplaint =
      activeRoomId === "help" &&
      Boolean(trimmed) &&
      !trimmed.startsWith("/") &&
      !isManagementRole;

    if (trimmed) {
      bumpUserStat("messagesSent");
    }
    chatStickToBottomRef.current = true;
    try {
      await sendRoomMessage();
      if (isHelpComplaint) {
        void submitHelpRoomTicket(trimmed);
      }
    } catch (error) {
      console.error("sendRoomMessage failed:", error);
      alert(
        "❌ تعذر إرسال الرسالة. حاول مرة أخرى.",
      );
    }
    if (isMobileAppShell) {
      window.setTimeout(() => scrollChatToBottom("smooth"), 120);
      window.setTimeout(() => scrollChatToBottom("smooth"), 420);
    }
  }, [
    activeRoomId,
    canPublishPosts,
    inputText,
    isManagementRole,
    isMobileAppShell,
    isPostsRoom,
    publishPost,
    scrollChatToBottom,
    sendRoomMessage,
    setInputText,
    submitHelpRoomTicket,
  ]);

  useEffect(() => {
    bumpUserStat("sessionCount");
  }, []);

  useEffect(() => {
    setFriendSuggestions(
      buildFriendSuggestions(rawChatMembers, currentUser.nickname),
    );
  }, [rawChatMembers, currentUser.nickname]);

  const handleSendPM = async () => {
    if (!pmTarget || !pmInputText.trim()) return;

    if (!isBrowserOnline()) {
      alert(OFFLINE_SEND_HINT);
      return;
    }

    // Rate limiting: max 3 PM messages per second (separate from room chat)
    const now = Date.now();
    pmRateLimitRef.current = pmRateLimitRef.current.filter((t) => now - t < 1000);
    if (pmRateLimitRef.current.length >= 3) {
      alert(
        "⚠️ الرجاء الانتظار، لا يمكنك إرسال أكثر من 3 رسائل في الثانية الواحدة لحماية الشات من الإزعاج!",
      );
      return;
    }
    pmRateLimitRef.current.push(now);

    const targetNickname = pmTarget.nickname;
    const textToSend = pmInputText.trim();
    const clientId = `opt-pm-${crypto.randomUUID()}`;
    setPmInputText("");

    setPmThreads((prev) => ({
      ...prev,
      [targetNickname]: appendPmThreadMessage(
        prev[targetNickname] || [],
        createOptimisticPmMessage(textToSend, { clientId, pending: true }),
      ),
    }));

    try {
      const persistedMessage = await persistPrivateMessage({
        currentUser,
        targetNickname,
        text: textToSend,
        members: rawChatMembers,
      });

      setPmThreads((prev) => {
        const thread = prev[targetNickname] || [];
        if (hasPmMessageWithDbId(thread, persistedMessage.id)) {
          return {
            ...prev,
            [targetNickname]: thread.filter((m) => m.clientId !== clientId),
          };
        }
        return {
          ...prev,
          [targetNickname]: thread.map((m) =>
            m.clientId === clientId
              ? {
                  ...m,
                  pending: false,
                  status: "delivered" as const,
                  dbId: persistedMessage.id,
                  time: persistedMessage.created_at
                    ? new Date(persistedMessage.created_at).toLocaleTimeString(
                        "ar-EG",
                        {
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        },
                      )
                    : m.time,
                }
              : m,
          ),
        };
      });
    } catch (error) {
      console.error("PM insert error:", error);
      setPmThreads((prev) => ({
        ...prev,
        [targetNickname]: (prev[targetNickname] || []).filter(
          (m) => m.clientId !== clientId,
        ),
      }));
      setPmInputText(textToSend);
      alert(
        isRlsDenied(error)
          ? "🛡️ السيرفر رفض الرسالة الخاصة — تحقق من صلاحياتك أو حالة الحظر."
          : formatSupabaseUserError(
              error,
              "❌ تعذر إرسال الرسالة الخاصة حاليًا. حاول مرة أخرى.",
            ),
      );
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
    if (!isBrowserOnline()) {
      alert(OFFLINE_SEND_HINT);
      return;
    }
    bumpUserStat("giftsSent");
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

    const giftRoomId = activeRoomId;
    setRoomMessages((prev) => {
      const currentMsgs = prev[giftRoomId] || [];
      return {
        ...prev,
        [giftRoomId]: [...currentMsgs, newMessage],
      };
    });

    if (supabase) {
      supabase
        .from("messages")
        .insert([
          {
            id: newUuid,
            room_id: giftRoomId,
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
          if (error) {
            console.error("Error sending gift to Supabase:", error);
            setRoomMessages((prev) => ({
              ...prev,
              [giftRoomId]: (prev[giftRoomId] || []).filter(
                (m) => m.id !== newUuid,
              ),
            }));
            alert(
              isRlsDenied(error)
                ? "🛡️ السيرفر رفض إرسال الهدية — تحقق من صلاحياتك أو حالة الحظر."
                : formatSupabaseUserError(error, "❌ تعذر إرسال الهدية. حاول مرة أخرى."),
            );
          }
        })
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

  const sendMediaMessage = async (
    type: "image" | "imageUrl" | "video" | "audio",
    mediaUrl: string,
  ) => {
    if (!isBrowserOnline()) {
      alert(OFFLINE_SEND_HINT);
      return;
    }

    const safeMedia = filterSafeMediaUrl(mediaUrl);
    if (!safeMedia) {
      alert("⚠️ الرابط غير مسموح — استخدم http أو https فقط.");
      return;
    }

    const finalType: "image" | "video" | "audio" =
      type === "imageUrl" ? "image" : type;

    if (isPostsRoom && canPublishPosts) {
      try {
        await publishPost({
          text: "",
          type: finalType,
          mediaUrl: safeMedia,
        });
        setShowAttachmentDropdown(false);
      } catch (error) {
        alert(
          error instanceof Error
            ? `❌ تعذر نشر الوسائط: ${error.message}`
            : "❌ تعذر نشر الوسائط.",
        );
      }
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
      mediaUrl: safeMedia,
    };

    setRoomMessages((prev) => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] || []), newMessage],
    }));
    setShowAttachmentDropdown(false);

    if (!supabase) {
      setRoomMessages((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).filter((m) => m.id !== newUuid),
      }));
      alert("❌ تعذر إرسال الملف — اتصال Supabase غير متاح.");
      return;
    }

    try {
      const { error } = await supabase.from("messages").insert([
        {
          id: newUuid,
          room_id: activeRoomId,
          author: currentUser.nickname,
          text: "",
          color: currentUser.color || "#10b981",
          type: finalType,
          media_url: safeMedia,
          youtube_id: getYoutubeId(safeMedia),
          sender_uid: senderUid,
        },
      ]);
      if (error) throw error;
    } catch (error) {
      console.error("Error sending media to Supabase:", error);
      setRoomMessages((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).filter((m) => m.id !== newUuid),
      }));
      alert(
        isRlsDenied(error)
          ? "🛡️ السيرفر رفض إرسال الملف — تحقق من الصلاحيات أو نوع/حجم الملف."
          : formatSupabaseUserError(
              error,
              "❌ تعذر إرسال الملف حاليًا. لم يتم حفظه على السيرفر — جرّب مرة أخرى.",
            ),
      );
    }
  };

  const uploadAndSendImage = async (file: File) => {
    if (!ensureImagesAccess()) return;

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
      const compressed = await compressImageForChat(file);
      const safeName = compressed.name.replace(/[^\w.-]+/g, "_").slice(0, 80);
      const objectPath = userStoragePath(
        currentUser.uid || senderUid,
        "rooms",
        activeRoomId,
        `${Date.now()}_${crypto.randomUUID()}_${safeName}`,
      );

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(objectPath, compressed, {
          cacheControl: "3600",
          contentType: compressed.type || file.type,
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
    const extMatch = file.name.match(/(\.[a-z0-9]+)$/i);
    const ext = extMatch?.[1]?.toLowerCase() || ".bin";
    const base =
      file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]+/gi, "")
        .slice(0, 32) || `asset_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const safeName = `${base}${ext}`;
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
    setDesignOwnerBgInput(url);
    alert("✅ تم رفع الخلفية العامة وتطبيقها. أغلق النافذة لترى النتيجة.");
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
    setDesignRoomBgInput(url);
    alert("✅ تم رفع خلفية الغرفة وتطبيقها. أغلق النافذة لترى النتيجة.");
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
    setDesignLogoInput(url);
  };

  const sendPrivateMediaMessage = async (
    type: "image" | "video" | "audio",
    mediaUrl: string,
    text = "",
  ) => {
    if (!pmTarget) {
      alert("⚠️ اختر محادثة خاصة أولاً.");
      return;
    }

    const targetNickname = pmTarget.nickname;
    const clientId = `opt-pm-${crypto.randomUUID()}`;

    setPmThreads((prev) => ({
      ...prev,
      [targetNickname]: appendPmThreadMessage(
        prev[targetNickname] || [],
        createOptimisticPmMessage(text, {
          type,
          mediaUrl,
          clientId,
          pending: true,
        }),
      ),
    }));

    try {
      const persisted = await persistPrivateMessage({
        currentUser,
        targetNickname,
        text,
        type,
        mediaUrl,
        members: rawChatMembers,
      });

      setPmThreads((prev) => {
        const thread = prev[targetNickname] || [];
        if (hasPmMessageWithDbId(thread, persisted.id)) {
          return {
            ...prev,
            [targetNickname]: thread.filter((m) => m.clientId !== clientId),
          };
        }
        return {
          ...prev,
          [targetNickname]: thread.map((m) =>
            m.clientId === clientId
              ? {
                  ...m,
                  pending: false,
                  status: "delivered" as const,
                  dbId: persisted.id,
                  time: persisted.created_at
                    ? new Date(persisted.created_at).toLocaleTimeString("ar-EG", {
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      })
                    : m.time,
                }
              : m,
          ),
        };
      });
    } catch (error) {
      setPmThreads((prev) => ({
        ...prev,
        [targetNickname]: (prev[targetNickname] || []).filter(
          (m) => m.clientId !== clientId,
        ),
      }));
      throw error;
    }
  };

  const handlePmImageUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ensureImagesAccess()) return;
    if (!canSendMediaByRate()) {
      alert("⏳ بعت وسائط كتير بسرعة. استنى دقيقة وجرب تاني.");
      return;
    }
    if (currentUser.authProvider !== "supabase") {
      alert("📸 رفع الصور متاح للحسابات المسجلة فقط. سجل دخول الأول.");
      return;
    }
    if (!pmTarget) {
      alert("⚠️ اختر محادثة خاصة أولاً.");
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
      const compressed = await compressImageForChat(file);
      const publicUrl = await uploadPrivateMediaFile(
        compressed,
        pmTarget.nickname,
        pmTarget.uid,
      );
      await sendPrivateMediaMessage("image", publicUrl);
    } catch (error) {
      alert(
        error instanceof Error
          ? `❌ فشل إرسال الصورة: ${error.message}`
          : "❌ فشل إرسال الصورة.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePmVideoUploadChange = async (
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
      alert("🎬 رفع الفيديو متاح للحسابات المسجلة فقط. سجل دخول الأول.");
      return;
    }
    if (!pmTarget) {
      alert("⚠️ اختر محادثة خاصة أولاً.");
      return;
    }
    if (!file.type.startsWith("video/")) {
      alert("⚠️ الملف اللي اخترته مش فيديو.");
      return;
    }
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("⚠️ حجم الفيديو كبير. الحد الأقصى 25MB.");
      return;
    }
    try {
      setIsUploadingImage(true);
      const publicUrl = await uploadPrivateMediaFile(
        file,
        pmTarget.nickname,
        pmTarget.uid,
      );
      await sendPrivateMediaMessage("video", publicUrl);
    } catch (error) {
      alert(
        error instanceof Error
          ? `❌ فشل إرسال الفيديو: ${error.message}`
          : "❌ فشل إرسال الفيديو.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSendAttachment = (
    type: "image" | "imageUrl" | "video" | "audio",
  ) => {
    const isOwnerOrAdmin =
      currentUser.role === "owner" || currentUser.role === "admin";

    if (type === "audio") {
      const isOwner = currentUser.role === "owner";
      const perm =
        memberCustomPermissions[currentUser.nickname]?.recordingAllowed;
      if (!isOwner && !perm) {
        alert(
          "⚠️ ميزة الرسائل الصوتية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل 🎙️",
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

    if (
      (type === "image" || type === "imageUrl") &&
      !canSendImages(currentUser, memberCustomPermissions, isOnlyVIPCanSendImages)
    ) {
      alert(
        "📸 ميزة الصور غير مفعّلة لحسابك. يمكن للمالك منحها من غرفة القيادة → صلاحيات الأعضاء.",
      );
      setShowAttachmentDropdown(false);
      return;
    }

    if (type === "video" && !canShareYoutube(currentUser, memberCustomPermissions)) {
      alert(
        "🎥 مشاركة يوتيوب/فيديو غير مفعّلة لحسابك. يمكن للمالك منحها من غرفة القيادة → صلاحيات الأعضاء.",
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
        "🎥 أدخل رابط يوتيوب أو فيdeo مباشر (MP4, WEBM):",
      );
      if (inputUrl === null) {
        setShowAttachmentDropdown(false);
        return;
      }
      const trimmed = inputUrl.trim();
      if (!trimmed) {
        alert("⚠️ يجب إدخال رابط يوتيوب أو فيdeo حقيقي.");
        setShowAttachmentDropdown(false);
        return;
      }
      mediaUrl = trimmed;
      setShowAttachmentDropdown(false);
    }
    if (type === "audio") {
      void beginVoiceMessageRecording();
      setShowAttachmentDropdown(false);
      return;
    }
    sendMediaMessage(type, mediaUrl);
  };

  const canSendVoiceMessages = () => {
    const role = (currentUser.role || "").toLowerCase();
    if (role === "owner" || role === "admin" || role === "المالك" || role === "أدمن") {
      return true;
    }
    return !!memberCustomPermissions[currentUser.nickname]?.recordingAllowed;
  };

  const beginVoiceMessageRecording = async (scope: "room" | "pm" = "room") => {
    if (!canSendVoiceMessages()) {
      alert(
        "⚠️ ميزة الرسائل الصوتية غير مفعلة لحسابك. اطلب التفعيل من المالك 🎙️",
      );
      return;
    }
    if (currentUser.authProvider !== "supabase" || !currentUser.uid) {
      alert("🎙️ الرسائل الصوتية متاحة للحسابات المسجلة فقط.");
      return;
    }
    if (scope === "pm" && !pmTarget) {
      alert("⚠️ اختر محادثة خاصة أولاً.");
      return;
    }
    const isOwnerOrAdmin =
      currentUser.role === "owner" || currentUser.role === "admin";
    if (isGlobalMicMute && !isOwnerOrAdmin) {
      alert("🎙️ الميكروفونات مقفلة من قبل المالك حالياً.");
      return;
    }
    if (isVoiceRecording) return;
    voiceRecordingScopeRef.current = scope;
    try {
      await startVoiceRecording();
    } catch (err) {
      alert(describeMediaError(err, "audio"));
    }
  };

  const sendRecordedVoiceMessage = async () => {
    if (voiceRecordingSec < 1) {
      alert("⚠️ سجّل رسالة أطول من ثانية واحدة.");
      return;
    }
    if (!canSendMediaByRate()) {
      alert("⏳ بعت وسائط كتير بسرعة. استنى دقيقة وجرب تاني.");
      return;
    }
    setIsUploadingVoice(true);
    try {
      const blob = await stopVoiceRecording();
      if (!blob || !currentUser.uid) return;

      if (voiceRecordingScopeRef.current === "pm") {
        if (!pmTarget) {
          alert("⚠️ اختر محادثة خاصة أولاً.");
          return;
        }
        const ext = blob.type.includes("webm")
          ? "webm"
          : blob.type.includes("mp4") || blob.type.includes("aac")
            ? "m4a"
            : blob.type.includes("ogg")
              ? "ogg"
              : "webm";
        const file = new File([blob], `voice.${ext}`, {
          type: blob.type || "audio/webm",
        });
        const mediaRef = await uploadPrivateMediaFile(
          file,
          pmTarget.nickname,
          pmTarget.uid,
        );
        await sendPrivateMediaMessage("audio", mediaRef);
        return;
      }

      const { url, error } = await uploadVoiceNoteBlob(
        blob,
        activeRoomId,
        currentUser.uid,
      );
      if (error || !url) {
        alert(`❌ فشل رفع الرسالة الصوتية: ${error || "خطأ غير معروف"}`);
        return;
      }
      await sendMediaMessage("audio", url);
    } catch (error) {
      alert(
        error instanceof Error
          ? `❌ فشل إرسال الرسالة الصوتية: ${error.message}`
          : "❌ فشل إرسال الرسالة الصوتية.",
      );
    } finally {
      setIsUploadingVoice(false);
      voiceRecordingScopeRef.current = "room";
    }
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
              type="button"
              disabled={banRecheckLoading || !supabase}
              onClick={async () => {
                if (!supabase) return;
                setBanRecheckLoading(true);
                try {
                  const { data, error } = await supabase
                    .from("banned_users")
                    .select("*")
                    .order("created_at", { ascending: false });
                  if (error) {
                    console.warn("Ban recheck failed", error);
                    alert("⚠️ تعذر التحقق من السيرفر — تحقق من الاتصال.");
                    return;
                  }
                  const serverBans = (data as BannedUserRow[]).map((row) =>
                    parseBannedUserRow(row),
                  );
                  setBannedUsersList(serverBans);
                  localStorage.setItem(
                    "lamma_banned_list",
                    JSON.stringify(serverBans),
                  );
                } finally {
                  setBanRecheckLoading(false);
                }
              }}
              className="flex-1 py-3 text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {banRecheckLoading ? "جاري التحقق…" : "🔄 إعادة التحقق الأمني"}
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
      className={`fixed inset-0 w-full flex flex-col overflow-hidden font-sans text-[color:var(--text-primary)] lamma-fire-frame lamma-fire-frame-app lamma-neutral-glass${
        isMobileAppShell
          ? " lamma-pwa-app-shell"
          : " h-[100dvh] min-h-[100dvh]"
      }${vvLayout.keyboardOpen ? " lamma-keyboard-open" : ""}${
        activeModal || hasFloatingDropdownOpen ? " lamma-modal-open" : ""
      }${designInspectActive ? " lamma-design-inspect-active" : ""}`}
      style={
        isMobileAppShell && vvLayout.keyboardOpen && vvLayout.shellHeight
          ? {
              height: `${vvLayout.shellHeight}px`,
              maxHeight: `${vvLayout.shellHeight}px`,
              top: `${vvLayout.shellTop}px`,
              bottom: "auto",
            }
          : undefined
      }
      dir="rtl"
      data-app-theme={primaryTheme}
      data-clear-bg={shellClearBg}
      data-reading-mode={readingMode ? "true" : "false"}
    >
      <UniversalStyleVideoLayer />
      <RealtimeStatus realtimeConnected={realtimeConnected} />
      {messageToasts.length > 0 ? (
        <div
          className="fixed top-14 left-1/2 -translate-x-1/2 z-[250] flex flex-col gap-2 pointer-events-none w-[min(92vw,360px)]"
          aria-live="polite"
        >
          {messageToasts.map((toast) => (
            <div
              key={toast.id}
              className="lamma-room-welcome-toast shadow-lg pointer-events-auto flex items-start gap-2"
            >
              <Bell size={12} className="shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 text-right">
                <div className="font-black truncate text-[11px]">{toast.title}</div>
                <div className="text-[10px] opacity-90 truncate">{toast.body}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {activeRoomBg || universalGlobalMedia ? (
        <>
          <div
            className="absolute inset-0 z-0 pointer-events-none lamma-active-wallpaper"
            data-design-region="chat-wallpaper"
            style={
              universalGlobalMedia
                ? undefined
                : {
                    backgroundImage: `url(${activeRoomBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center center",
                    transform: "scale(1)",
                    filter: "none",
                  }
            }
          />
          {isDefaultAmbientBg && !universalGlobalMedia ? (
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
                    : "transparent",
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
            : "none",
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
        <header
          className="lamma-header px-2 sm:px-4 md:px-6 flex items-center justify-between gap-2 relative z-30 shrink-0"
          data-design-region="top-header"
        >
          <div
            className="lamma-header-aurora pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <div className="lamma-header-start-cluster">
          {/* Right side controls (User account & actions - Now in the visual start "اول الصفحة" due to RTL) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* User badge — tap to open personal profile card */}
            <button
              type="button"
              onClick={openOwnProfileCard}
              className="flex items-center gap-1.5 select-none min-w-0 flex-1 sm:flex-none sm:max-w-[200px] lamma-header-rail lamma-header-user-rail cursor-pointer rounded-2xl hover:bg-white/5 transition-colors text-right"
              title="بطاقتي الشخصية والإعدادات"
            >
              <div className="relative shrink-0">
                {!isOwnerRole && (
                <OwnerAvatarAura active={false}>
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
                  <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden lamma-admin-card">
                    <MemberAvatar
                      avatar={myActiveSession.avatar}
                      size="sm"
                      className="w-full h-full"
                      imageClassName="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
                </OwnerAvatarAura>
                )}
                {isOwnerRole && (
                  <div
                    className="p-[2px] rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"
                    style={{ boxShadow: "0 0 22px rgba(249, 115, 22, 0.45)" }}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden lamma-admin-card">
                      <img
                        src={OWNER_ID_CARD_IMAGE}
                        alt={myActiveSession.nickname}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
                {!isOwnerRole &&
                (isAdminRole ||
                  hasStoreVipDisplay(
                    myActiveSession.nickname,
                    myActiveSession,
                    subscription,
                    memberCosmeticGrants,
                  )) && (
                  <div
                    className={`absolute -top-0.5 left-1/2 -translate-x-1/2 lamma-prestige-seal ${
                      isAdminRole
                        ? "lamma-prestige-admin"
                        : hasStorePlatinumDisplay(
                              myActiveSession.nickname,
                              myActiveSession,
                              subscription,
                              memberCosmeticGrants,
                            )
                          ? "lamma-prestige-plat"
                          : "lamma-prestige-vip"
                    }`}
                    aria-hidden="true"
                  >
                    <Crown size={8} strokeWidth={2.2} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span
                  className={`lamma-header-name ${getNameGlassCardClass({
                    isSelf: true,
                    isBoss: isOwnerRole,
                    compact: true,
                  })} text-[11px] font-black flex items-center gap-1 min-w-0 ${getPrestigeNameClass(myActiveSession.nickname, myActiveSession, chatMembers, subscription, memberCosmeticGrants)}`}
                  style={{
                    color:
                      isOwnerRole ||
                      hasStorePlatinumDisplay(
                        myActiveSession.nickname,
                        myActiveSession,
                        subscription,
                        memberCosmeticGrants,
                      )
                        ? undefined
                        : myActiveSession.color,
                  }}
                >
                  {myActiveSession.nickname}
                  {isOwnerRole && (
                    <BossSigil size={14} className="opacity-95 shrink-0" />
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
                <div className="lamma-header-user-meta flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {hasStorePlatinumDisplay(
                      myActiveSession.nickname,
                      myActiveSession,
                      subscription,
                      memberCosmeticGrants,
                    ) ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-plat">
                        بلاتيني
                      </span>
                    ) : hasStoreVipDisplay(
                        myActiveSession.nickname,
                        myActiveSession,
                        subscription,
                        memberCosmeticGrants,
                      ) &&
                      !isOwnerRole &&
                      !isAdminRole ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-vip">
                        VIP
                      </span>
                    ) : myVisualRole === "admin" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-admin">
                        مشرف
                      </span>
                    ) : null}
                    {myActiveSession.title && (
                      <span className="text-[8px] lamma-title-chip">
                        [{myActiveSession.title}]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            <div className="lamma-header-actions shrink-0" aria-label="اختصارات الهيدر">
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
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${isSidebarOpen && activeSidebarTab === "rooms" ? "lamma-accent-text-soft lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
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
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${isSidebarOpen && activeSidebarTab === "members" ? "lamma-accent-text-soft lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
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
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${showHeaderMenu ? "lamma-accent-text-soft lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
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
                          className="hidden md:flex fixed top-[4.75rem] right-4 md:right-10 w-[240px] rounded-2xl z-[99] flex-col pb-1 lamma-popover-shell"
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
                                openOwnProfileCard();
                                setShowHeaderMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-cyan-200 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                            >
                              <span className="text-base">👤</span>
                              <span>بطاقتي الشخصية</span>
                            </button>
                            <div className="h-[1px] bg-white/5 my-1" />
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
                                  isCompactView ? "lamma-accent-text" : ""
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
                          openOwnProfileCard();
                          setShowHeaderMenu(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-cyan-200 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                      >
                        <span className="text-base">👤</span>
                        <span>بطاقتي الشخصية</span>
                      </button>
                      <div className="h-[1px] bg-white/5 my-1" />
                      <button
                        onClick={() => {
                          setIsCompactView(!isCompactView);
                          setShowHeaderMenu(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white transition-all text-sm w-full text-right cursor-pointer rounded-xl lamma-list-item"
                      >
                        <Grid
                          size={16}
                          className={isCompactView ? "lamma-accent-text" : ""}
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
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${showPmListDropdown ? "lamma-accent-text-soft lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
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
                          className="hidden md:flex fixed top-[4.75rem] left-4 md:left-auto md:right-1/4 w-[280px] rounded-2xl z-[99] flex-col lamma-popover-shell"
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
                                const isSpyThread = nickname.startsWith("🕵️");
                                const targetUser = chatMembers.find(
                                  (m) => m.nickname === nickname,
                                ) || { nickname, color: isSpyThread ? "#a78bfa" : "#10b981" };
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
                                        uid: (targetUser as any).id,
                                      });
                                      if (window.innerWidth < 1280)
                                        setMobileTab("private");
                                      else setIsPmOpen(true);
                                      setShowPmListDropdown(false);
                                    }}
                                    className={`p-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer relative z-40 lamma-list-item ${isSpyThread ? "border border-purple-500/15 bg-purple-500/5" : ""}`}
                                  >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xl overflow-hidden shadow-inner relative pointer-events-none ${isSpyThread ? "bg-purple-500/15" : "bg-white/5"}`}>
                                      {isSpyThread ? (
                                        <span className="text-[16px]">🕵️</span>
                                      ) : (
                                        <User size={16} className="text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 pointer-events-none">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4
                                            className="text-[12px] font-black"
                                            style={{
                                              color: isSpyThread ? "#a78bfa" : (targetUser.color || "#fff"),
                                            }}
                                          >
                                            {isSpyThread ? nickname.replace("🕵️ ", "") : nickname}
                                          </h4>
                                          {isSpyThread && (
                                            <span className="text-[6px] bg-purple-500/20 text-purple-300 px-1 rounded">مراقبة</span>
                                          )}
                                          {(targetUser as any).role ===
                                            "platinum_vip" && (
                                            <span className="text-[6px] lamma-role-chip lamma-role-plat">
                                              بلاتيني
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
                                              مشرف
                                            </span>
                                          )}
                                          {(targetUser as any).role ===
                                            "owner" && (
                                            <span className="text-[6px] lamma-role-chip lamma-role-owner lamma-boss-badge">
                                              {OWNER_DISPLAY_BADGE}
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
                          ) || { nickname, color: "#10b981" };
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
                                        بلاتيني
                                      </span>
                                    )}
                                    {(targetUser as any).role === "vip" && (
                                      <span className="text-[6px] lamma-role-chip lamma-role-vip">
                                        VIP
                                      </span>
                                    )}
                                    {(targetUser as any).role === "admin" && (
                                      <span className="text-[6px] lamma-role-chip lamma-role-admin">
                                        مشرف
                                      </span>
                                    )}
                                    {(targetUser as any).role === "owner" && (
                                      <span className="text-[6px] lamma-role-chip lamma-role-owner lamma-boss-badge">
                                        {OWNER_DISPLAY_BADGE}
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
                      className={`flex items-center justify-center transition-colors relative cursor-pointer ml-1 sm:ml-2 lamma-header-mini-btn ${showNotificationsDropdown ? "lamma-accent-text-soft lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
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
                          className="hidden md:flex fixed top-[4.75rem] left-4 md:left-auto md:right-1/3 w-[280px] sm:w-[320px] rounded-2xl z-[99] flex-col lamma-popover-shell"
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
                    icon={<Bell size={16} className="text-[rgb(148,163,184)]" />}
                  >
                    <div className="bg-transparent text-right space-y-2">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <p className="text-[11px] text-gray-400 font-bold">أحدث الإشعارات.</p>
                        <div className="flex items-center gap-1.5">
                          {unreadNotificationsCount > 0 && (
                            <span className="text-[8px] px-1.5 py-0.5 font-mono lamma-notify-pill">{unreadNotificationsCount} جديد</span>
                          )}
                          <button onClick={() => setNotifications((prev) => { const next = prev.map((n) => ({ ...n, read: true })); try { localStorage.setItem("lamma_notifications", JSON.stringify(next)); } catch { /* quota */ } return next; })}
                            className="text-[9px] text-gray-300 px-2 py-0.5 rounded cursor-pointer lamma-soft-action">تحديد الكل كمقروء</button>
                          <button onClick={() => { setNotifications([]); try { localStorage.removeItem("lamma_notifications"); } catch { /* quota */ } }}
                            className="text-[9px] text-red-400 px-2 py-0.5 rounded cursor-pointer lamma-soft-action">مسح الكل</button>
                        </div>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-[11px] text-gray-500">مفيش إشعارات لسه 💤</div>
                      ) : (
                        <div className="grid gap-2">
                          {notifications.slice(0, 20).map((n) => (
                            <div key={n.id}
                              className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer lamma-notification-card ${n.read ? "opacity-75" : "lamma-notification-card-unread"}`}
                              onClick={() => setNotifications((prev) => { const next = prev.map((x) => x.id === n.id ? { ...x, read: true } : x); try { localStorage.setItem("lamma_notifications", JSON.stringify(next)); } catch { /* quota */ } return next; })}
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${n.kind === "mention" ? "bg-yellow-500/20 text-yellow-400" : n.kind === "pm" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>
                                <Bell size={12} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-black text-white truncate">{n.title}</h4>
                                <p className="text-[9px] text-gray-400 mt-0.5 break-words">{n.body}</p>
                                <span className="text-[8px] text-gray-500 font-mono mt-1 block">{new Date(n.at).toLocaleString("ar-EG", { hour: "numeric", minute: "numeric", day: "2-digit", month: "short" })}</span>
                              </div>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 mt-1" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </MobileBottomSheet>
                </div>
            </div>
          </div>

          {/* Brand — logo + slogan (no duplicate center watermark) */}
          <div className="flex items-center shrink-0 z-[1]">
            <div className="lamma-header-rail lamma-header-brand-rail flex items-center gap-2 sm:gap-2.5">
                <button
                  className="transition-transform hover:scale-105 active:scale-95 cursor-pointer object-contain flex items-center justify-center lamma-brand-mark shrink-0"
                  title="الرئيسية"
                  onClick={() => window.location.reload()}
                >
                  <AMLogo
                    size={40}
                    variant="circular"
                    glow={true}
                    crown={true}
                  />
                </button>
                <div className="hidden sm:flex flex-col items-end leading-tight min-w-0">
                  <span className="text-[10px] font-black text-white tracking-[0.18em] lamma-header-wordmark leading-none">
                    LAMMA CHAT
                  </span>
                  <span className="text-[10px] font-extrabold text-green-400 mt-0.5">
                    اللمة تحلى
                  </span>
                  <span className="text-[8.5px] font-bold text-gray-400">
                    بالصحبة الأحلى
                  </span>
                </div>
            </div>
          </div>
        </header>
      )}

      {/* Legacy top tabs — hidden on mobile; bottom nav replaces them */}
      {!isZenMode && (
        <div className="md:hidden hidden lamma-mobile-tabs-legacy lamma-mobile-tabs lamma-frost-glass">
          <button
            onClick={() => {
              setMobileTab("chat");
              setIsSidebarOpen(false);
            }}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 transition-all lamma-mobile-tab-btn ${mobileTab === "chat" ? "lamma-mobile-tab-btn-active" : "text-gray-400"}`}
          >
            <span className="lamma-ios-tab-icon"><Flame size={15} strokeWidth={2.2} /></span>
            <span className="text-[9px]">العام</span>
          </button>
          <button
            onClick={() => {
              setMobileTab("members");
              setActiveSidebarTab("members");
              setIsSidebarOpen(true);
            }}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 transition-all lamma-mobile-tab-btn ${mobileTab === "members" ? "lamma-mobile-tab-btn-active" : "text-gray-400"}`}
          >
            <span className="lamma-ios-tab-icon"><Users size={15} strokeWidth={2.2} /></span>
            <span className="text-[9px]">المتصلين</span>
          </button>
          <button
            onClick={() => {
              setMobileTab("private");
              setIsSidebarOpen(false);
            }}
            className={`py-2.5 relative flex flex-col items-center justify-center gap-1 transition-all lamma-mobile-tab-btn ${mobileTab === "private" ? "lamma-mobile-tab-btn-active" : "text-gray-400"}`}
          >
            <span className="lamma-ios-tab-icon relative">
              <MessageCircle size={15} strokeWidth={2.2} />
              {Object.keys(pmThreads).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-black/80" />
              )}
            </span>
            <span className="text-[9px]">الخاص</span>
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
      <div
        className={`flex-1 flex overflow-hidden relative min-h-0 lamma-chat-body-stage${
          isMobileAppShell ? " lamma-pwa-main-stage" : ""
        }`}
      >
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
          data-col="left"
          data-design-region="side-columns"
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
            <div className="min-h-0 lamma-store-panel">
              <div
                className="lamma-glass rounded-3xl p-4 lamma-soft-glow overflow-hidden h-full flex flex-col justify-between lamma-widget-card"
                data-design-region="column-cards"
              >
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
              className="lamma-fire-divider lamma-column-divider"
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
                pointerDragCleanupRef.current?.();
                const dragCleanup = attachWindowPointerDrag(onMove, () => {
                  if (pointerDragCleanupRef.current === dragCleanup) {
                    pointerDragCleanupRef.current = null;
                  }
                });
                pointerDragCleanupRef.current = dragCleanup;
              }}
            />

            <div className="min-h-0 lamma-radio-panel">
              <div
                className="lamma-glass rounded-3xl p-4 overflow-hidden flex flex-col min-h-0 h-full lamma-widget-card"
                data-design-region="column-cards"
              >
                <div className="lamma-widget-header flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Radio
                      size={16}
                      className="text-[color:var(--accent-secondary)]"
                    />
                    <span className="text-[12px] font-black">راديو لمة</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleRadioPlay}
                    disabled={!canUserControlMusicRadio && !isRadioPlaying}
                    className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action disabled:opacity-40"
                    title={canUserControlMusicRadio ? "تشغيل/إيقاف" : "التحكم للمالك فقط"}
                  >
                    {isRadioPlaying ? (
                      <Pause
                        size={16}
                        className="text-[color:var(--accent-primary)]"
                      />
                    ) : (
                      <Play
                        size={16}
                        className="text-[color:var(--accent-primary)]"
                      />
                    )}
                  </button>
                </div>
                <div className="lamma-widget-body mt-3 flex-1 min-h-0 flex flex-col gap-2">
                  <div className="lamma-widget-now-playing text-right shrink-0">
                    <div className="text-[10px] font-black text-[color:var(--accent-secondary)]">
                      {isRadioPlaying ? "🔊 على الهواء" : "⏸ متوقف"}
                    </div>
                    <div className="text-[12px] font-extrabold mt-1 truncate lamma-widget-title">
                      {currentRadioStation.name}
                    </div>
                    <div className="text-[10px] font-bold mt-1 truncate opacity-70">
                      {currentRadioStation.frequency}
                    </div>
                  </div>
                  {!canUserControlMusicRadio && (
                    <div className="lamma-widget-optional rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-[9px] font-bold text-center opacity-80">
                      🔊 الاستماع للبث متاح — التحكم بالراديو للمالك أو من يمنحه الصلاحية
                    </div>
                  )}
                  <div className="lamma-widget-scroll space-y-1">
                    {radioStations.map((station) => (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => handleSelectRadioStation(station)}
                        disabled={!canUserControlMusicRadio}
                        className={`lamma-widget-list-item w-full p-1.5 rounded-xl text-[10px] font-black flex items-center justify-between border transition-all cursor-pointer lamma-list-item disabled:opacity-50 disabled:cursor-not-allowed ${
                          currentRadioStation.id === station.id
                            ? "bg-green-500/10 border-green-500/20 text-green-300"
                            : "bg-white/5 border-transparent hover:bg-white/10"
                        }`}
                      >
                        <span>{station.name}</span>
                        <span className="text-[8px] opacity-50">
                          {station.frequency}
                        </span>
                      </button>
                    ))}
                  </div>
                  {canUserControlMusicRadio ? (
                    <div className="lamma-widget-controls mt-auto flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={prevRadioStation}
                        className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                        title="السابق"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={toggleRadioPlay}
                        className="p-2.5 rounded-full transition-all cursor-pointer lamma-feature-primary"
                        title="تشغيل/إيقاف"
                      >
                        {isRadioPlaying ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} className="ml-0.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={nextRadioStation}
                        className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action"
                        title="التالي"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className="lamma-fire-divider lamma-column-divider"
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
                pointerDragCleanupRef.current?.();
                const dragCleanup = attachWindowPointerDrag(onMove, () => {
                  if (pointerDragCleanupRef.current === dragCleanup) {
                    pointerDragCleanupRef.current = null;
                  }
                });
                pointerDragCleanupRef.current = dragCleanup;
              }}
            />

            <div className="min-h-0 lamma-music-panel">
              <div
                className="lamma-glass rounded-3xl p-4 overflow-hidden h-full flex flex-col min-h-0 lamma-widget-card"
                data-design-region="column-cards"
              >
                <div className="lamma-widget-header flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Music
                      size={16}
                      className="text-[color:var(--accent-secondary)]"
                    />
                    <span className="text-[12px] font-black">DJ الغرفة</span>
                  </div>
                  {canUserControlMusicRadio ? (
                    <button
                      type="button"
                      onClick={toggleMusicPlay}
                      disabled={!currentMusicTrack.url}
                      className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action disabled:opacity-40"
                      title="تشغيل/إيقاف للغرفة"
                    >
                      {isMusicPlaying ? (
                        <Pause
                          size={16}
                          className="text-[color:var(--accent-primary)]"
                        />
                      ) : (
                        <Play
                          size={16}
                          className="text-[color:var(--accent-primary)]"
                        />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleDjListening}
                      className={`p-2 rounded-xl transition-all cursor-pointer lamma-soft-action ${
                        isDjListening ? "text-cyan-300" : "opacity-60"
                      }`}
                      title={isDjListening ? "كتم DJ" : "استمع لـ DJ"}
                    >
                      {isDjListening ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                  )}
                </div>
                <div className="lamma-widget-body mt-3 flex-1 min-h-0 flex flex-col gap-2">
                  {canUserControlMusicRadio && (
                    <button
                      type="button"
                      disabled={isUploadingMusic}
                      onClick={() => musicUploadInputRef.current?.click()}
                      className="lamma-widget-optional w-full py-2 rounded-xl text-[10px] font-black bg-cyan-500/10 text-cyan-200 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      <Upload size={12} />
                      {isUploadingMusic ? "جاري الرفع…" : "رفع أغاني للقائمة"}
                    </button>
                  )}
                  {!canUserControlMusicRadio && (
                    <button
                      type="button"
                      onClick={toggleDjListening}
                      className={`lamma-widget-optional w-full py-2 rounded-xl text-[10px] font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                        isDjListening
                          ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {isDjListening ? (
                        <>
                          <Volume2 size={12} /> 🔊 أستمع للـ DJ
                        </>
                      ) : (
                        <>
                          <VolumeX size={12} /> 🔇 مكتوم — اضغط للاستماع
                        </>
                      )}
                    </button>
                  )}
                  {!canUserControlMusicRadio && activeRoomDj?.isPlaying && (
                    <div className="lamma-widget-optional rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-2 py-1.5 text-[9px] text-cyan-200 font-bold truncate shrink-0">
                      🎧 {activeRoomDj.updatedBy || "المالك"} يشغّل: {activeRoomDj.title}
                    </div>
                  )}
                  {!canUserControlMusicRadio && !activeRoomDj?.isPlaying && (
                    <div className="lamma-widget-optional rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-[9px] font-bold text-center opacity-70 shrink-0">
                      لا يوجد بث DJ حالياً
                    </div>
                  )}
                  <div className="lamma-widget-now-playing text-right shrink-0">
                    <div className="text-[10px] font-black text-[color:var(--accent-secondary)]">
                      {canUserControlMusicRadio
                        ? isMusicPlaying
                          ? "🔊 بث للغرفة"
                          : "⏸ متوقف"
                        : isDjListening
                          ? activeRoomDj?.isPlaying
                            ? "🔊 تستمع الآن"
                            : "🔊 جاهز للاستماع"
                          : "🔇 DJ مكتوم"}
                    </div>
                    <div className="text-[12px] font-extrabold mt-1 truncate lamma-widget-title">
                      {canUserControlMusicRadio
                        ? currentMusicTrack.title
                        : activeRoomDj?.title || "—"}
                    </div>
                    <div className="text-[10px] font-bold mt-1 truncate opacity-70">
                      {canUserControlMusicRadio
                        ? currentMusicTrack.desc
                        : isDjListening
                          ? "اختيارك: استماع"
                          : "اختيارك: كتم"}
                    </div>
                  </div>
                  {canUserControlMusicRadio && (
                    <>
                      <div className="lamma-widget-scroll space-y-1">
                        {djPlaylist.length === 0 ? (
                          <p className="text-[9px] opacity-50 text-center py-2">
                            ارفع أغاني لتبدأ البث للغرفة
                          </p>
                        ) : (
                          djPlaylist.map((track) => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => handleSelectMusicTrack(track, true)}
                              className={`lamma-widget-list-item w-full p-1.5 rounded-xl text-[10px] font-black flex items-center justify-between border transition-all cursor-pointer lamma-list-item ${
                                currentMusicTrack.id === track.id
                                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                                  : "bg-purple-500/10 border-purple-500/20 text-purple-200"
                              }`}
                            >
                              <span className="truncate">{track.title}</span>
                              <span className="text-[8px] opacity-50 shrink-0 mr-1">
                                {track.desc}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="lamma-widget-controls mt-auto flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={prevMusicTrack}
                          disabled={djPlaylist.length === 0}
                          className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action disabled:opacity-40"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={toggleMusicPlay}
                          disabled={!currentMusicTrack.url}
                          className="p-2.5 rounded-full transition-all cursor-pointer lamma-feature-primary disabled:opacity-40"
                        >
                          {isMusicPlaying ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} className="ml-0.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={nextMusicTrack}
                          disabled={djPlaylist.length === 0}
                          className="p-2 rounded-xl transition-all cursor-pointer lamma-soft-action disabled:opacity-40"
                        >
                          <ChevronLeft size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div
          className={`xl:hidden absolute inset-0 bg-black/70 z-30 transition-opacity lamma-mobile-sidebar-backdrop ${
            isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />
        {/* ----------------- OVERLAY SIDEBAR PANEL (ROOMS & MEMBERS TABBED) ----------------- */}
        <aside
          className={`xl:hidden sidebar-container w-full sm:w-[420px] border-l border-green-500/10 flex flex-col justify-between flex-shrink-0 z-40 absolute inset-y-0 right-0 h-full shadow-[0_0_25px_rgba(0,0,0,0.85)] max-w-[92vw] lamma-mobile-sidebar-shell ${
            isSidebarOpen
              ? "flex lamma-mobile-sidebar-open"
              : "hidden pointer-events-none"
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
                {canShowCreateRoomButton && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !isManagementRole &&
                        roomCreationQuotaInfo.remaining <= 0
                      ) {
                        alert(
                          `استنفدت حصة إنشاء الغرف (${roomCreationQuotaInfo.used}/${roomCreationQuotaInfo.quota}).`,
                        );
                        return;
                      }
                      setIsCreateRoomModalOpen(true);
                    }}
                    className="w-full p-2.5 rounded-xl flex items-center justify-center gap-2 lamma-accent-text-soft font-extrabold text-[11px] transition-all cursor-pointer lamma-primary-btn"
                  >
                    <Plus size={14} />
                    <span>إنشاء غرفة خاصة جديدة</span>
                  </button>
                )}

                {(() => {
                  const visibleRooms = ROOMS_DEF.filter((room) => {
                    if ((room as { staffOnly?: boolean }).staffOnly && !isManagementRole) {
                      return false;
                    }
                    if ((room as { ownerOnly?: boolean }).ownerOnly && !isOwnerRole) {
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
                              <span className="bg-black/60 px-2 py-0.5 rounded-full border lamma-accent-border-soft text-[9px] lamma-accent-text-soft font-black font-mono">
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
                  {orderedChatMembers.slice(0, 48).map((m, idx, arr) => {
                    const cleanName = getShortenedNickname(m.nickname);
                    const isCurrentUser = m.nickname === myActiveSession.nickname;
                    const isBasicMember =
                      m.role === "user" || m.role === "guest";
                    const isOwnerMember = isOwnerAuthor(
                      m.nickname,
                      myActiveSession,
                      chatMembers,
                    );
                    const hasStoreCosmetics =
                      isCurrentUser &&
                      (hasActiveSubscription || !!myActiveSession.frame);
                    const hasGrantCosmetics = hasOwnerGrantedCosmetics(
                      m.nickname,
                      memberCosmeticGrants,
                    );
                    const showStyledAvatar =
                      !isBasicMember ||
                      isOwnerMember ||
                      hasStoreCosmetics ||
                      hasGrantCosmetics;
                    const storeForMember = isCurrentUser ? subscription : null;
                    const prestigeClass = getPrestigeNameClass(
                      m.nickname,
                      myActiveSession,
                      chatMembers,
                      storeForMember,
                      memberCosmeticGrants,
                    );

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
                            {!showStyledAvatar ? (
                              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/5 rounded-full border border-white/10 overflow-hidden">
                                <MemberAvatar
                                  avatar={m.avatar}
                                  size="md"
                                  className="w-full h-full"
                                  imageClassName="w-full h-full rounded-full"
                                />
                              </div>
                            ) : (
                              <OwnerAvatarAura active={isOwnerMember}>
                              <AMLogo
                                size={24}
                                variant="circular"
                                glow={isCurrentUser || isOwnerMember}
                                crownRole={getCrownRoleForDisplay(
                                  m.nickname,
                                  myActiveSession,
                                  chatMembers,
                                  storeForMember,
                                  memberCosmeticGrants,
                                )}
                                frame={getFrameFromAuthor(
                                  m.nickname,
                                  myActiveSession,
                                  chatMembers,
                                  memberCosmeticGrants,
                                )}
                              />
                              </OwnerAvatarAura>
                            )}
                          </div>
                          <div className="flex flex-col truncate">
                            <div
                              className={`flex items-center gap-1 flex-wrap ${getNameGlassCardClass({
                                isSelf: isCurrentUser,
                                isBoss: isOwnerMember,
                                compact: true,
                              })}`}
                            >
                              <span
                                style={{ color: m.color }}
                                className={`font-bold text-[11px] truncate leading-tight lamma-author-name ${prestigeClass}`}
                              >
                                {cleanName}
                              </span>
                              {isOwnerMember && (
                                <BossSigil size={12} className="opacity-95 shrink-0" />
                              )}
                              {isCurrentUser && activeTempEntryTopic && (
                                <span className="max-w-[110px] truncate rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5 text-[7px] text-cyan-200">
                                  {activeTempEntryTopic}
                                </span>
                              )}
                            </div>
                            <MemberPrestigeBadges
                              member={m}
                              currentUser={myActiveSession}
                              chatMembers={chatMembers}
                              subscription={subscription}
                              memberCosmeticGrants={memberCosmeticGrants}
                              highlightYou
                            />
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
              className="w-full py-2 rounded-xl flex items-center justify-center gap-2 lamma-accent-text-soft font-black text-[10px] transition-all cursor-pointer lamma-muted-btn"
            >
              <Share2 size={12} />
              <span>نسخ رابط الشات للمشاركة</span>
            </button>
          </div>
        </aside>

        {/* ----------------- PANEL 3: MAIN ACTIVE MESSAGE LOG (3rd column / Center) ----------------- */}
        <div
          data-col="center"
          data-design-region="chat-feed"
          className={`flex-1 flex flex-col min-w-0 min-h-0 backdrop-blur-xl xl:order-2 lamma-column-frame lamma-chat-core-shell ${
            isMobileAppShell || mobileTab === "chat" ? "flex" : "hidden md:flex"
          } ${isLeftColumnCollapsed ? "xl:border-l xl:border-white/10" : ""} ${isRightColumnCollapsed ? "xl:border-r xl:border-white/10" : ""}`}
        >
          <div
            className="lamma-chat-subheader shrink-0 flex flex-col"
            data-design-region="room-header-strip"
          >
          {/* Room Top Bar: Topic & System Actions */}
          <div className="flex items-stretch justify-between min-h-[28px] md:min-h-[34px] shrink-0 lamma-fire-underline lamma-room-header">
            {/* Topic Side (Right) */}
            <div
              className="flex-1 flex flex-col justify-center px-2.5 border-l border-white/10 group/topic cursor-pointer relative lamma-topic-shell"
              data-design-region="topic-bar"
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

            {/* System Actions Side (Left) — join/leave ticker */}
            <div className="w-[96px] sm:w-[148px] md:w-[188px] flex items-center justify-center px-1.5 py-0 relative overflow-hidden lamma-frost-ticker border-r border-white/10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${roomEntryTicker.kind}-${roomEntryTicker.nickname || "standby"}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 w-full min-w-0"
                >
                  {roomEntryTicker.kind === "join" ? (
                    <>
                      <span className="lamma-room-ticker-icon flex h-7 w-7 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-400/25">
                        <LogIn
                          size={14}
                          className="text-emerald-300"
                          strokeWidth={2.4}
                        />
                      </span>
                      <div className="flex flex-col text-left mr-1 justify-center min-w-0">
                        <span
                          className="text-[10px] font-black text-emerald-200 truncate max-w-[100px] sm:max-w-[130px] leading-normal"
                          dir="rtl"
                        >
                          {roomEntryTicker.nickname}
                        </span>
                        <span
                          className="text-[8px] font-bold leading-normal text-emerald-300/90"
                          dir="ltr"
                        >
                          joined the room
                        </span>
                      </div>
                    </>
                  ) : roomEntryTicker.kind === "leave" ? (
                    <>
                      <span className="lamma-room-ticker-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-500/10 border border-gray-400/20">
                        <LogIn
                          size={14}
                          className="text-gray-400 rotate-180"
                          strokeWidth={2.4}
                        />
                      </span>
                      <div className="flex flex-col text-left mr-1 justify-center min-w-0">
                        <span
                          className="text-[10px] font-black text-gray-300 truncate max-w-[100px] sm:max-w-[130px] leading-normal"
                          dir="rtl"
                        >
                          {roomEntryTicker.nickname}
                        </span>
                        <span
                          className="text-[8px] font-bold leading-normal text-gray-400/90"
                          dir="ltr"
                        >
                          left the room
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="lamma-room-ticker-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-400/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </span>
                      <div className="flex flex-col text-left mr-1 justify-center min-w-0">
                        <span
                          className="text-[10px] font-black text-emerald-200 truncate max-w-[100px] sm:max-w-[130px] leading-normal"
                          dir="rtl"
                        >
                          {roomEntryTicker.onlineCount > 1
                            ? `${roomEntryTicker.onlineCount} متصل`
                            : "متصل واحد"}
                        </span>
                        <span
                          className="text-[8px] font-bold leading-normal text-gray-400"
                          dir="rtl"
                        >
                          في الغرفة الآن
                        </span>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Header section replicating the top of chat log / Room Tabs - matching Ad Banner size & width */}
          <div
            className="w-full px-2 flex items-center justify-between shrink-0 z-10 h-[24px] md:h-[30px] lamma-fire-underline lamma-room-header"
            dir="rtl"
          >
            {/* Tabs Container */}
            <div className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar flex-1 h-full items-end pb-0">
              {openRooms
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
            <div className="flex items-center gap-1 shrink-0 ml-1 relative">
              <button
                onClick={toggleSearchPop}
                className={`transition-all lamma-room-strip-action ${
                  showSearchPop
                    ? "lamma-accent-text-soft lamma-quiet-power-btn-active"
                    : "text-gray-400 hover:text-white border border-transparent lamma-toolbar-btn"
                }`}
                title="البحث عن رسائل وأعضاء"
              >
                <Search size={12} />
              </button>

              {/* Features Tray Toggle */}
              <div
                className={`relative dropdown-container ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  ref={featuresTrayBtnRef}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    toggleDropdown("features");
                  }}
                  className={`flex items-center justify-center transition-all flex-shrink-0 lamma-room-strip-action ${
                    showFeaturesTray
                      ? "lamma-accent-text-soft lamma-quiet-power-btn-active"
                      : "text-gray-400 hover:text-white lamma-toolbar-btn"
                  }`}
                  title="الميزات الإضافية"
                >
                  <Plus
                    size={12}
                    className={`transition-transform duration-300 ${showFeaturesTray ? "rotate-45" : ""}`}
                  />
                </button>

                <FloatingDropdownPortal
                  open={showFeaturesTray}
                  anchorRef={featuresTrayBtnRef}
                  className="w-[280px] rounded-2xl overflow-hidden flex flex-col lamma-feature-shell"
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

                        {/* Block 2: Achievements */}
                        <AchievementsBlock role={currentUser.role} compact />

                        {/* Block 3: Active call indicator — only show when a call is running */}
                        {showSidebarCall && (
                        <div className="p-2.5 rounded-xl flex flex-col justify-between relative overflow-hidden text-right lamma-admin-card">
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-300">
                            <span>مكالمة نشطة</span>
                            <span className="text-green-400 font-mono text-[9px] font-black tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                              <span>{formatSecs(sidebarCallSeconds)}</span>
                            </span>
                          </div>
                          <div className="flex items-end justify-center gap-1 h-8 my-1.5">
                            {waveHeights.map((h, i) => (
                              <span
                                key={i}
                                className="w-[3.5px] lamma-accent-bg-solid rounded-full transition-all duration-300"
                                style={{ height: `${h}%` }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => toggleCallMute()}
                              className={`p-1.5 rounded-full border transition-all ${isMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-green-500/20 border-green-500/40 text-green-400"}`}
                              title="كتم الصوت"
                            >
                              <Mic size={11} />
                            </button>
                            <button
                              onClick={() => endCall()}
                              className="p-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all border border-red-500/30"
                              title="إنهاء المكالمة"
                            >
                              <Phone size={11} className="rotate-[135deg]" />
                            </button>
                          </div>
                        </div>
                        )}
                  </div>
                </FloatingDropdownPortal>

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

                    {/* Block 2: Achievements */}
                    <AchievementsBlock role={currentUser.role} />

                    {/* Block 3: Active call indicator — only when a call is running */}
                    {showSidebarCall && (
                    <div className="p-3 rounded-xl flex flex-col justify-between relative overflow-hidden text-right lamma-admin-card bg-black/25">
                      <div className="flex justify-between items-center text-[11px] font-bold text-gray-300 mb-1">
                        <span>مكالمة نشطة</span>
                        <span className="text-green-400 font-mono text-[10px] font-black tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                          <span>{formatSecs(sidebarCallSeconds)}</span>
                        </span>
                      </div>
                      <div className="flex items-end justify-center gap-1 h-8 my-2">
                        {waveHeights.map((h, i) => (
                          <span key={i} className="w-[3.5px] lamma-accent-bg-solid rounded-full transition-all duration-300" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-3 mt-1">
                        <button type="button" onClick={() => toggleCallMute()}
                          className={`p-2 rounded-full border transition-all ${isMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-green-500/20 border-green-500/40 text-green-400"}`}
                          title="كتم الصوت"><Mic size={14} /></button>
                        <button type="button" onClick={() => endCall()}
                          className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all border border-red-500/30"
                          title="إنهاء المكالمة"><Phone size={14} className="rotate-[135deg]" /></button>
                      </div>
                    </div>
                    )}
                  </div>
                </MobileBottomSheet>
              </div>

              {isManagementRole && (
              <div
                className={`relative dropdown-container flex items-center ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDropdown("privacy")}
                  className={`flex items-center justify-center transition-all lamma-room-strip-action lamma-toolbar-btn ${
                    showPrivacyDropdown
                      ? "lamma-quiet-power-btn-active bg-red-500/10 text-[#f43f5e]"
                      : "text-[#f43f5e] hover:text-red-400"
                  }`}
                  title="الرقابة والأمان (إدارة)"
                >
                  <Shield size={12} />
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
                            الرقابة والأمان
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
                          لوحة إدارية — التحكم في الأمان والخصوصية متاح للمالك
                          والإدارة فقط.
                        </p>
                        <div className="grid gap-3 select-none">
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
                                إخفاء حالتك "متصل الآن" (للمالك فقط)
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
                          <div className="p-3 rounded-xl flex items-center justify-between lamma-soft-danger">
                            <div className="flex flex-col gap-1">
                              <span className="text-red-400 text-xs font-black">
                                المحظورون ({blockedUsers.length})
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold">
                                الأشخاص المحظورون من إرسال رسائل لك على الخاص
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}
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
                className={`flex items-center justify-center transition-all lamma-room-strip-action lamma-toolbar-btn md:hidden ${
                  showMembersList
                    ? "lamma-quiet-power-btn-active lamma-accent-text-soft"
                    : "text-gray-400 hover:text-white"
                }`}
                title="تثبيت قائمة الأعضاء"
              >
                <Users size={12} />
              </button>

              {(isOwnerRole || isAdminRole) && (
                <div className="relative dropdown-container z-20">
                  <button
                    ref={commandsBtnRef}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => toggleDropdown("commands")}
                    className={`transition-all lamma-room-strip-action flex items-center justify-center ${
                      showCommandsDropdown
                        ? "lamma-accent-text-soft lamma-quiet-power-btn-active"
                        : "lamma-accent-text hover-accent-soft lamma-toolbar-btn"
                    }`}
                    title="نظام الأوامر السريعة"
                  >
                    <Terminal size={12} />
                  </button>

                  <FloatingDropdownPortal
                    open={showCommandsDropdown}
                    anchorRef={commandsBtnRef}
                    className="w-[240px] rounded-2xl flex flex-col pb-1.5 lamma-popover-shell"
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
                  </FloatingDropdownPortal>

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
          </div>

          {/* Messages Feed Viewport */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden lamma-pwa-chat-scroll-region">
          <div
            ref={feedViewportRef}
            className="flex-1 min-h-0 overflow-y-auto lamma-fire-scroll lamma-chat-feed-viewport pr-3 pl-4 pt-1 pb-0"
            dir="rtl"
            onScroll={handleChatFeedScroll}
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

              {isAdminRoom && (
                <div className="mx-2 mb-3 text-right" dir="rtl">
                  {/* فريق الإدارة — يظهر للجميع */}
                  {(() => {
                    const adminTeam = chatMembers.filter((m: any) =>
                      ["owner", "admin", "mod"].includes(m.role)
                    );
                    if (adminTeam.length === 0) return null;
                    const roleLabel: Record<string, string> = {
                      owner: "👑",
                      admin: "🛡️",
                      mod: "🔰",
                    };
                    return (
                      <div className="rounded-[20px] border border-cyan-500/15 bg-black/30 p-3 mb-3">
                        <div className="flex items-center gap-1.5 mb-2 justify-end">
                          <span className="text-[10px] font-black text-cyan-300">فريق الإدارة المتاح</span>
                          <Shield size={13} className="text-cyan-400 shrink-0" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {adminTeam.map((m: any) => (
                            <div
                              key={m.nickname}
                              className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-full px-2 py-0.5"
                            >
                              <span className="text-[9px] font-bold text-white">{m.nickname}</span>
                              <span className="text-[10px]">{roleLabel[m.role] || "🛡️"}</span>
                              {m.status === "online" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* لوحة الأدمن — تظهر للأدمن والمالك فقط */}
                  {(isAdminRole || isOwnerRole) && (
                    <div className="rounded-[26px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(7,18,28,0.92),rgba(8,11,16,0.9))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] mb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={16} className="text-cyan-300 shrink-0" />
                        <span className="text-xs font-black text-white">لوحة الإدارة السريعة</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/6 bg-white/5 p-2.5">
                          <div className="text-[9px] text-gray-400">الكتابة العامة</div>
                          <div className="mt-0.5 text-[10px] font-black text-white">
                            {isGlobalMute ? "مقفولة" : "مفتوحة"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/6 bg-white/5 p-2.5">
                          <div className="text-[9px] text-gray-400">الميكروفونات</div>
                          <div className="mt-0.5 text-[10px] font-black text-white">
                            {isGlobalMicMute ? "محظورة" : "مسموح"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/6 bg-white/5 p-2.5">
                          <div className="text-[9px] text-gray-400">وسائط الشات</div>
                          <div className="mt-0.5 text-[10px] font-black text-white">
                            {isOnlyVIPCanSendImages ? "VIP فقط" : "للجميع"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/6 bg-white/5 p-2.5">
                          <div className="text-[9px] text-gray-400">الشكاوى المفتوحة</div>
                          <div className="mt-0.5 text-[10px] font-black text-white">
                            {openChatReportsCount} بلاغ
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminTab("reports");
                          openModal("admin");
                        }}
                        className="w-full mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[10px] font-black text-amber-100 transition-all hover:bg-amber-500/20"
                      >
                        🚩 مراجعة بلاغات الأعضاء ({openChatReportsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal("admin")}
                        className="w-full mt-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black text-cyan-100 transition-all hover:bg-cyan-500/20"
                      >
                        فتح لوحة الإدارة الكاملة
                      </button>
                    </div>
                  )}

                </div>
              )}

              {isHelpRoom && (
                <div className="mx-2 mb-3 text-right" dir="rtl">
                  <div className="rounded-[20px] border border-amber-400/20 bg-gradient-to-br from-black/60 to-amber-900/10 p-4">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      <span className="text-sm font-black text-amber-200">مساعدة وشكاوى 📋</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                      اكتب مشكلتك أو شكواك هنا — فريق الإدارة يراجع الرسائل. يمكنك أيضاً الضغط على 🚩
                      على أي رسالة مخالفة في الغرف الأخرى.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                      <div className="bg-white/5 rounded-xl px-2 py-1.5 text-gray-300">
                        <span className="text-amber-300 font-bold">/complaint</span> — دليل البلاغ
                      </div>
                      <div className="bg-white/5 rounded-xl px-2 py-1.5 text-gray-300">
                        <span className="text-amber-300 font-bold">🚩</span> — بلاغ على رسالة
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Games Room Banner */}
              {isGamesRoom && (
                <div className="mx-2 mb-3 text-right" dir="rtl">
                  <div className="rounded-[20px] border border-amber-400/20 bg-gradient-to-br from-black/60 to-amber-900/10 p-4">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      <span className="text-sm font-black text-amber-300">🎮 Games Bot — مرحباً بك!</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                      هنا غرفة الألعاب والمسابقات — تنافس مع الجميع في أسئلة المعلومات العامة والألعاب!
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                      <div className="bg-white/5 rounded-xl px-2 py-1.5 text-gray-300"><span className="text-amber-300 font-bold">/سؤال</span> — سؤال معلومات عامة</div>
                      <div className="bg-white/5 rounded-xl px-2 py-1.5 text-gray-300"><span className="text-amber-300 font-bold">/كلمة</span> — لعبة الكلمة المقلوبة</div>
                      <div className="bg-white/5 rounded-xl px-2 py-1.5 text-gray-300"><span className="text-amber-300 font-bold">/تلميح</span> — تلميح للسؤال</div>
                      <div className="bg-white/5 rounded-xl px-2 py-1.5 text-gray-300"><span className="text-amber-300 font-bold">/نقاط</span> — لوحة الشرف</div>
                    </div>
                  </div>
                </div>
              )}

              {isPostsRoom ? (
                <SocialFeedPanel
                  posts={combinedFeedPosts}
                  scrollParentRef={feedViewportRef}
                  currentSession={myActiveSession}
                  chatMembers={chatMembers}
                  storeSnapshot={subscription}
                  cosmeticGrants={memberCosmeticGrants}
                  isCompactView={isCompactView}
                  isChatColumnExpanded={isChatColumnExpanded}
                  canInteract={canPublishPosts}
                  onOpenProfile={openMemberProfile}
                  onLike={likePost}
                  onComment={commentOnPost}
                  canDeletePost={(post) =>
                    post.isLegacy
                      ? canDeleteMessage({
                          id: post.id,
                          author: post.authorNickname,
                          text: post.text,
                          type: post.type,
                          color: post.color || "#10b981",
                          isOwn: post.authorNickname === currentUser.nickname,
                          time: post.createdAt,
                        })
                      : post.authorUid === currentUser.uid || isManagementRole
                  }
                  onDeletePost={async (post) => {
                    if (post.isLegacy) {
                      deleteMessage({
                        id: post.id,
                        author: post.authorNickname,
                        text: post.text,
                        type: post.type,
                        color: post.color || "#10b981",
                        isOwn: post.authorNickname === currentUser.nickname,
                        time: post.createdAt,
                      });
                      return;
                    }
                    try {
                      await deleteSocialPost(post.id);
                      void reloadSocialFeed();
                    } catch (error) {
                      alert(
                        error instanceof Error
                          ? `❌ تعذر حذف المنشور: ${error.message}`
                          : "❌ تعذر حذف المنشور.",
                      );
                    }
                  }}
                />
              ) : (
                <>
                  {activeRoomDj?.isPlaying && (
                    <div className="mx-2 mb-2 rounded-2xl px-4 py-2.5 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/25 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-cyan-200 text-[11px] font-black min-w-0">
                        <Music size={14} className="shrink-0" />
                        <span className="truncate">
                          {isOwnerRole ? "أنت تشغّل للغرفة:" : "🎧 المالك يشغّل:"}{" "}
                          {activeRoomDj.title}
                        </span>
                      </div>
                      {!isOwnerRole ? (
                        <button
                          type="button"
                          onClick={toggleDjListening}
                          className={`shrink-0 px-2.5 py-1 rounded-xl text-[9px] font-black border transition-all ${
                            isDjListening
                              ? "bg-cyan-500/20 text-cyan-100 border-cyan-400/30"
                              : "bg-white/5 text-gray-300 border-white/10"
                          }`}
                        >
                          {isDjListening ? "🔊 استمع" : "🔇 كتم"}
                        </button>
                      ) : (
                        <span className="text-[9px] text-gray-400 shrink-0">بث مباشر</span>
                      )}
                    </div>
                  )}
                  <ChatMessageVirtualList
                    messages={messages}
                    parentRef={feedViewportRef}
                    minVirtualCount={USE_ROOM_VIRTUAL_THRESHOLD}
                    getItemKey={(msg) => msg.id}
                    getEstimateSize={(msg) => estimateMessageRowHeight(msg)}
                    renderMessage={renderRoomMessage}
                  />
                </>
              )}

              {!isPostsRoom && <div ref={messageEndRef} />}
            </div>
          </div>
          </div>

          <div className="lamma-pwa-composer-stack shrink-0">
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
              className={`lamma-composer-layout flex flex-col gap-1 md:flex-row md:flex-nowrap items-stretch md:items-center md:gap-1.5 rounded-t-[22px] rounded-b-none md:rounded-t-[24px] md:rounded-b-none px-2 sm:px-3 py-1.5 sm:py-2 md:py-1 ${
                isZenMode
                  ? "bg-[#0b100c]/88 border border-green-500/24 shadow-2xl backdrop-blur-xl lamma-chat-input-shell"
                  : "bg-[rgba(7,10,12,0.22)] border border-white/6 shadow-none lamma-chat-input-shell"
              }`}
              data-design-region="composer"
              style={
                isZenMode
                  ? undefined
                  : {
                      marginBottom: "-1px",
                    }
              }
            >
              {/* Attachment Dropdown Container */}
              <div className="relative dropdown-container z-20 lamma-composer-slot-attach shrink-0">
                <button
                  ref={attachmentBtnRef}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => toggleDropdown("attachment")}
                  className={`flex items-center justify-center transition-all lamma-composer-tool ${showAttachmentDropdown ? "lamma-accent-bg-medium lamma-accent-text-soft" : "text-gray-400 hover:text-white lamma-toolbar-btn"}`}
                  title="إرفاق ملف"
                >
                  <Plus
                    size={16}
                    className={`transition-transform duration-300 ${showAttachmentDropdown ? "rotate-45" : ""}`}
                  />
                </button>

                <FloatingDropdownPortal
                  open={showAttachmentDropdown}
                  anchorRef={attachmentBtnRef}
                  align="end"
                  placement="above"
                  className="rounded-2xl p-2 grid grid-cols-1 gap-1 w-40 lamma-popover-shell"
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
                </FloatingDropdownPortal>
              </div>
              <input
                ref={imageUploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUploadChange}
              />

              {/* Games button removed — games live in the Games room */}

              <div className="hidden items-center shrink-0 lamma-composer-cluster lamma-composer-desktop-only">
                <button
                  type="button"
                  onClick={() => {
                    setShopTab("vip");
                    openModal("store");
                  }}
                  className="flex items-center justify-center text-emerald-300 transition-all relative select-none cursor-pointer lamma-quiet-power-btn lamma-composer-tool"
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

              {/* Radio Dropdown Container — trigger hidden on mobile (see ⋯ menu) */}
              <div
                className={`relative dropdown-container lamma-composer-radio-host ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDropdown("radio")}
                  className="hidden"
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

                        {!canUserControlMusicRadio && (
                          <p className="text-[9px] text-gray-500 leading-relaxed w-full">
                            🔊 الاستماع للبث متاح — التحكم بالراديو للمالك أو من يمنحه الصلاحية
                          </p>
                        )}

                        {/* Radio Players/Stream selectors */}
                        <div className="w-full space-y-1 text-right">
                          {radioStations.map((station) => (
                            <button
                              key={station.id}
                              type="button"
                              onClick={() => handleSelectRadioStation(station)}
                              disabled={!canUserControlMusicRadio}
                              className={`w-full p-1.5 rounded-xl text-xs font-black flex items-center justify-between border transition-all cursor-pointer lamma-list-item disabled:opacity-50 disabled:cursor-not-allowed ${
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

                        {canUserControlMusicRadio ? (
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
                        ) : null}

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

              {/* Music Dropdown Container — trigger hidden on mobile (see ⋯ menu) */}
              <div
                className={`relative dropdown-container lamma-composer-music-host ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDropdown("music")}
                  className="hidden"
                  title="DJ الغرفة"
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
                            DJ الغرفة
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
                        {canUserControlMusicRadio && (
                          <>
                            <button
                              type="button"
                              disabled={isUploadingMusic}
                              onClick={() => musicUploadInputRef.current?.click()}
                              className="w-full py-2.5 rounded-xl text-[11px] font-black bg-gradient-to-r from-cyan-600/30 to-purple-600/30 text-cyan-200 border border-cyan-500/30 hover:border-cyan-400/50 transition-all flex items-center justify-center gap-2"
                            >
                              <Upload size={14} />
                              {isUploadingMusic
                                ? "جاري رفع الأغاني…"
                                : "📤 رفع أغاني للقائمة"}
                            </button>
                            <p className="text-[9px] text-gray-500 leading-relaxed">
                              عند التشغيل، من يريد يسمع يفعّل الاستماع — الباقي مكتوم
                            </p>
                          </>
                        )}

                        {!canUserControlMusicRadio && (
                          <button
                            type="button"
                            onClick={toggleDjListening}
                            className={`w-full py-2.5 rounded-xl text-[11px] font-black border transition-all flex items-center justify-center gap-2 ${
                              isDjListening
                                ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"
                                : "bg-white/5 text-gray-300 border-white/10"
                            }`}
                          >
                            {isDjListening ? (
                              <>
                                <Volume2 size={14} /> 🔊 أستمع للـ DJ
                              </>
                            ) : (
                              <>
                                <VolumeX size={14} /> 🔇 مكتوم — اضغط للاستماع
                              </>
                            )}
                          </button>
                        )}

                        {!canUserControlMusicRadio && activeRoomDj?.isPlaying && (
                          <div className="w-full rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-[10px] text-cyan-200 font-bold truncate">
                            🎧 {activeRoomDj.updatedBy || "المالك"} يشغّل: {activeRoomDj.title}
                          </div>
                        )}

                        {!canUserControlMusicRadio && !activeRoomDj?.isPlaying && (
                          <div className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[10px] text-gray-400 font-bold">
                            لا يوجد بث DJ حالياً
                          </div>
                        )}

                        <div
                          className={`w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.2)] ${(canUserControlMusicRadio ? isMusicPlaying : isDjListening && activeRoomDj?.isPlaying) ? "animate-[spin_6s_linear_infinite]" : ""}`}
                        >
                          <div className="w-full h-full rounded-full bg-[#0a0f0c] border-[2px] border-black flex items-center justify-center text-lg">
                            <Music size={18} className="text-cyan-300" />
                          </div>
                        </div>

                        {canUserControlMusicRadio && (
                          <>
                            <div className="w-full space-y-1 text-right max-h-36 overflow-y-auto">
                              {djPlaylist.length === 0 ? (
                                <p className="text-[9px] text-gray-500 text-center py-2">
                                  ارفع أغاني لتبدأ البث للغرفة
                                </p>
                              ) : (
                                djPlaylist.map((track) => (
                                  <button
                                    key={track.id}
                                    type="button"
                                    onClick={() => handleSelectMusicTrack(track, true)}
                                    className={`w-full p-1.5 rounded-xl text-xs font-black flex items-center justify-between border transition-all cursor-pointer lamma-list-item ${
                                      currentMusicTrack.id === track.id
                                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                                        : "bg-purple-500/10 border-purple-500/20 text-purple-200"
                                    }`}
                                  >
                                    <span className="truncate">{track.title}</span>
                                    <span className="text-[9px] text-gray-500 shrink-0 mr-1">
                                      {track.desc}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>

                            <div className="flex items-center justify-center gap-4 text-cyan-300 w-full pt-1">
                              <button
                                type="button"
                                onClick={prevMusicTrack}
                                disabled={djPlaylist.length === 0}
                                className="p-1.5 rounded-full transition-all cursor-pointer lamma-feature-action disabled:opacity-40"
                              >
                                <ChevronRight size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={toggleMusicPlay}
                                disabled={!currentMusicTrack.url}
                                className="p-2.5 rounded-full hover:scale-105 transition-all flex items-center justify-center cursor-pointer lamma-feature-primary disabled:opacity-40"
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
                                disabled={djPlaylist.length === 0}
                                className="p-1.5 rounded-full transition-all cursor-pointer lamma-feature-action disabled:opacity-40"
                              >
                                <ChevronLeft size={18} />
                              </button>
                            </div>
                          </>
                        )}

                        <div className="text-[9.5px] font-bold lamma-soft-status">
                          {isOwnerRole
                            ? isMusicPlaying
                              ? `بث للغرفة: ${currentMusicTrack.title} 🔊`
                              : "البث متوقف"
                            : isDjListening
                              ? activeRoomDj?.isPlaying
                                ? `تستمع: ${activeRoomDj.title} 🔊`
                                : "جاهز للاستماع عند بدء البث"
                              : "DJ مكتوم — اضغط للاستماع"}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isPostsRoom && (
                <div className="lamma-post-composer-note md:order-none w-full md:w-auto">
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
                onFocus={() => {
                  chatStickToBottomRef.current = true;
                  if (isMobileAppShell) {
                    window.setTimeout(() => scrollChatToBottom("auto"), 80);
                    window.setTimeout(() => scrollChatToBottom("smooth"), 360);
                  }
                }}
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
                disabled={(isPostsRoom && !canPublishPosts) || (isMaintenanceMode && !isManagementRole)}
                placeholder={
                  isMaintenanceMode && !isManagementRole
                    ? "⚙️ الشات في وضع الصيانة — الكتابة متوقفة مؤقتاً"
                    : isPostsRoom
                    ? canPublishPosts
                      ? "اكتب منشورك العام هنا..."
                      : "المشاهدة متاحة للجميع، والنشر للمسجلين فقط"
                    : "اكتب رسالة..."
                }
                className={`flex-1 min-w-0 w-full bg-transparent border-0 focus:ring-0 text-xs focus:outline-none px-2 text-right lamma-composer-field lamma-composer-slot-input ${isPostsRoom ? "min-h-[76px] resize-none py-2" : "h-8 md:h-9 resize-none py-1.5 md:py-2 leading-5"}`}
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isPostsRoom && !canPublishPosts}
                className="md:hidden w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center active:scale-95 transition-all flex-shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed lamma-send-orb lamma-composer-slot-send"
                title={isPostsRoom ? "نشر" : "إرسال"}
              >
                <Send size={15} className="rotate-180" />
              </button>

              <div className="lamma-composer-tools-wrapper flex items-center gap-0.5 w-full min-w-0 md:contents shrink-0">
              <div className="relative lamma-composer-slot-tool shrink-0">
                {isVoiceRecording && voiceRecordingScopeRef.current === "room" && (
                  <VoiceRecorderBar
                    durationSec={voiceRecordingSec}
                    maxDurationSec={120}
                    onCancel={() => cancelVoiceRecording()}
                    onSend={() => void sendRecordedVoiceMessage()}
                    isUploading={isUploadingVoice}
                  />
                )}
                <button
                  type="button"
                  onClick={() => void beginVoiceMessageRecording()}
                  className={`items-center justify-center transition-all lamma-toolbar-btn lamma-composer-tool ${isPostsRoom ? "hidden" : "flex"} ${
                    isVoiceRecording
                      ? "text-red-400 animate-pulse"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="رسالة صوتية (مثل واتساب)"
                >
                  <Mic size={14} />
                </button>
              </div>

              <div
                className={`relative dropdown-container lamma-composer-slot-tool shrink-0 ${isPostsRoom ? "hidden" : ""}`}
              >
                <button
                  ref={emojiBtnRef}
                  type="button"
                  onClick={() => toggleDropdown("emoji")}
                  className="flex items-center justify-center text-[#b7d96d] transition-all lamma-toolbar-btn lamma-composer-tool"
                  title="إيموجي"
                >
                  <Smile size={14} />
                </button>
                <FloatingDropdownPortal
                  open={showEmojiPicker}
                  anchorRef={emojiBtnRef}
                  align="end"
                  placement="above"
                  className="rounded-2xl p-3 w-64 max-h-[300px] flex flex-col lamma-popover-shell"
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
                </FloatingDropdownPortal>
              </div>

              <div className="relative dropdown-container flex-shrink-0 lamma-composer-slot-tool">
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
                          title="فتح بطاقتك الشخصية وتعديل الإعدادات"
                          className="text-right p-1.5 rounded-lg text-xs text-cyan-200 transition-all cursor-pointer flex items-center justify-between lamma-list-item hover:bg-cyan-500/10 border border-cyan-500/15"
                          onClick={() => {
                            openOwnProfileCard();
                            setShowSettingsDropdown(false);
                          }}
                        >
                          <span>بطاقتي الشخصية</span>
                          <span className="text-sm">👤</span>
                        </button>
                        <div className="h-px bg-white/5 my-0.5" />
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
                        {setPrimaryTheme ? (
                          <button
                            type="button"
                            className={`text-right p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between lamma-list-item ${
                              primaryTheme === "amoled"
                                ? "bg-white/10 text-slate-100 border border-white/10"
                                : "hover:bg-white/10 text-gray-200"
                            }`}
                            onClick={() =>
                              setPrimaryTheme(
                                primaryTheme === "amoled" ? "dark" : "amoled",
                              )
                            }
                          >
                            <span>وضع AMOLED (أسود نقي)</span>
                            <span className="text-[9px] font-mono">
                              {primaryTheme === "amoled" ? "ON" : "OFF"}
                            </span>
                          </button>
                        ) : null}
                        {/* Ads toggle — owner/admin only */}
                        {(isOwnerRole || isAdminRole) && (
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
                        )}
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
                        {/* Clear chat — owner/admin only */}
                        {(isOwnerRole || isAdminRole) && (
                          <>
                            <div className="h-px bg-white/5 my-0.5" />
                            <button
                              className="text-right p-1.5 hover:bg-red-500/20 rounded-lg text-xs text-red-400 transition-all cursor-pointer flex items-center justify-between font-bold lamma-list-item"
                              onClick={() => {
                                if (!confirm("مسح جميع رسائل الغرفة الحالية؟")) return;
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
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative dropdown-container flex-shrink-0 lamma-composer-slot-tool md:hidden">
                <button
                  ref={composerMoreBtnRef}
                  type="button"
                  onClick={() => toggleDropdown("composerMore")}
                  className={`flex items-center justify-center transition-all lamma-composer-tool ${showComposerMoreDropdown ? "bg-white/10 text-white" : "text-gray-400 hover:text-white lamma-toolbar-btn"}`}
                  title="المزيد"
                >
                  <MoreHorizontal size={16} />
                </button>
                <FloatingDropdownPortal
                  open={showComposerMoreDropdown}
                  anchorRef={composerMoreBtnRef}
                  align="end"
                  placement="above"
                  className="rounded-2xl p-2 grid grid-cols-1 gap-1 w-44 lamma-popover-shell"
                >
                  {!isPostsRoom && (
                    <>
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer lamma-list-item hover:bg-white/5"
                        onClick={() => {
                          setShopTab("vip");
                          openModal("store");
                          setShowComposerMoreDropdown(false);
                        }}
                      >
                        <Gift size={14} className="text-emerald-300 shrink-0" />
                        <span>المتجر</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer lamma-list-item hover:bg-white/5"
                        onClick={() => {
                          toggleDropdown("radio");
                        }}
                      >
                        <Radio size={14} className="text-green-300 shrink-0" />
                        <span>راديو لمة</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2 rounded-xl text-xs text-gray-200 w-full text-right cursor-pointer lamma-list-item hover:bg-white/5"
                        onClick={() => {
                          toggleDropdown("music");
                        }}
                      >
                        <Music size={14} className="text-cyan-300 shrink-0" />
                        <span>DJ الغرفة</span>
                      </button>
                    </>
                  )}
                  {isAdminRole && !isOwnerRole && (
                    <button
                      type="button"
                      className="flex items-center gap-2 p-2 rounded-xl text-xs text-red-300 w-full text-right cursor-pointer lamma-list-item hover:bg-white/5"
                      onClick={() => {
                        openModal("admin");
                        setShowComposerMoreDropdown(false);
                      }}
                    >
                      <Shield size={14} className="shrink-0" />
                      <span>لوحة الإدارة</span>
                    </button>
                  )}
                  {isOwnerRole && (
                    <button
                      type="button"
                      className="flex items-center gap-2 p-2 rounded-xl text-xs text-yellow-200 w-full text-right cursor-pointer lamma-list-item hover:bg-white/5"
                      onClick={() => {
                        setLeadershipTab("quick");
                        openModal("leadership");
                        setShowComposerMoreDropdown(false);
                      }}
                    >
                      <Crown size={14} className="shrink-0" />
                      <span>غرفة القيادة</span>
                    </button>
                  )}
                </FloatingDropdownPortal>
              </div>
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isPostsRoom && !canPublishPosts}
                className="hidden md:flex w-9 h-9 rounded-full items-center justify-center active:scale-95 transition-all flex-shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed lamma-send-orb lamma-composer-slot-send"
                title={isPostsRoom ? "نشر" : "إرسال"}
              >
                <Send size={15} className="rotate-180" />
              </button>
            </div>
          </div>
          </div>

          {/* End of content */}
        </div>

        <aside
          data-col="right"
          data-design-region="side-columns"
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
            <div className="min-h-0 lamma-rooms-panel">
              <div
                className="lamma-glass rounded-3xl p-3 overflow-hidden flex flex-col min-h-0 h-full"
                data-design-region="column-cards"
              >
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
                  {canShowCreateRoomButton && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !isManagementRole &&
                          roomCreationQuotaInfo.remaining <= 0
                        ) {
                          alert(
                            `استنفدت حصة إنشاء الغرف (${roomCreationQuotaInfo.used}/${roomCreationQuotaInfo.quota}).`,
                          );
                          return;
                        }
                        setIsCreateRoomModalOpen(true);
                      }}
                      className="w-full p-2.5 bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.25)] rounded-2xl flex items-center justify-center gap-2 text-[color:var(--accent-primary)] font-extrabold text-[11px] hover:bg-[rgba(16,185,129,0.18)] transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>إنشاء غرفة</span>
                    </button>
                  )}

                  {(() => {
                    const visibleRooms = availableRooms.filter((room: any) => {
                      if (room.staffOnly && !isManagementRole) return false;
                      if (room.ownerOnly && !isOwnerRole) return false;
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
              className="lamma-fire-divider lamma-column-divider"
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
                pointerDragCleanupRef.current?.();
                const dragCleanup = attachWindowPointerDrag(onMove, () => {
                  if (pointerDragCleanupRef.current === dragCleanup) {
                    pointerDragCleanupRef.current = null;
                  }
                });
                pointerDragCleanupRef.current = dragCleanup;
              }}
            />

            <div className="min-h-0 lamma-members-panel">
              <div
                className="lamma-glass rounded-3xl p-3 overflow-hidden flex flex-col min-h-0 h-full"
                data-design-region="column-cards"
              >
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
                      const isBasicMember =
                        m.role === "user" || m.role === "guest";
                      const isOwnerMember = isOwnerAuthor(
                        m.nickname,
                        myActiveSession,
                        chatMembers,
                      );
                      const hasStoreCosmetics =
                        isCurrentUser &&
                        (hasActiveSubscription || !!myActiveSession.frame);
                      const hasGrantCosmetics = hasOwnerGrantedCosmetics(
                        m.nickname,
                        memberCosmeticGrants,
                      );
                      const showStyledAvatar =
                        !isBasicMember ||
                        isOwnerMember ||
                        hasStoreCosmetics ||
                        hasGrantCosmetics;
                      const storeForMember = isCurrentUser ? subscription : null;
                      const prestigeClass = getPrestigeNameClass(
                        m.nickname,
                        myActiveSession,
                        chatMembers,
                        storeForMember,
                        memberCosmeticGrants,
                      );

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
                            {!showStyledAvatar ? (
                              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/5 rounded-full border border-white/10 overflow-hidden">
                                <MemberAvatar
                                  avatar={m.avatar}
                                  size="sm"
                                  className="w-full h-full"
                                  imageClassName="w-full h-full rounded-full"
                                />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 flex items-center justify-center">
                                <OwnerAvatarAura active={isOwnerMember}>
                                <AMLogo
                                  size={24}
                                  variant="circular"
                                  glow={isCurrentUser || isOwnerMember}
                                  crownRole={getCrownRoleForDisplay(
                                    m.nickname,
                                    myActiveSession,
                                    chatMembers,
                                    storeForMember,
                                    memberCosmeticGrants,
                                  )}
                                  frame={getFrameFromAuthor(
                                    m.nickname,
                                    myActiveSession,
                                    chatMembers,
                                    memberCosmeticGrants,
                                  )}
                                />
                                </OwnerAvatarAura>
                              </div>
                            )}
                            <div className="flex flex-col truncate flex-1">
                              <div
                                className={`flex items-center gap-1 flex-wrap ${getNameGlassCardClass({
                                  isSelf: isCurrentUser,
                                  isBoss: isOwnerMember,
                                  compact: true,
                                })}`}
                              >
                                <span
                                  style={{ color: m.color }}
                                  className={`font-bold text-[12px] truncate leading-tight lamma-author-name ${prestigeClass}`}
                                >
                                  {cleanName}
                                </span>
                                {isOwnerMember && (
                                  <BossSigil size={12} className="opacity-95 shrink-0" />
                                )}
                                {isCurrentUser && activeTempEntryTopic && (
                                  <span className="max-w-[110px] truncate rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5 text-[7px] text-cyan-200">
                                    {activeTempEntryTopic}
                                  </span>
                                )}
                              </div>
                              <MemberPrestigeBadges
                                member={m}
                                currentUser={myActiveSession}
                                chatMembers={chatMembers}
                                subscription={subscription}
                                memberCosmeticGrants={memberCosmeticGrants}
                                size="sm"
                                highlightYou
                              />
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
          className={`flex-col justify-between flex-shrink-0 z-[9990] ${
            mobileTab === "private"
              ? "absolute inset-x-0 top-0 bottom-0 w-full flex lamma-panel-shell lamma-mobile-pm-fullscreen"
              : isPmOpen
                ? "hidden md:flex fixed bottom-6 left-6 rounded-2xl lamma-modal-shell"
                : "hidden"
          }`}
          style={
            mobileTab !== "private" && isPmOpen
              ? {
                  width: PM_PANEL_SIZES[pmPanelTier].w,
                  height: PM_PANEL_SIZES[pmPanelTier].h,
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
                  <span className={pmTarget.nickname.startsWith("🕵️") ? "w-2 h-2 rounded-full bg-purple-400 shrink-0" : "lamma-icon-dot"} />
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                      <span>{pmTarget.nickname.startsWith("🕵️") ? pmTarget.nickname.replace("🕵️ ", "") : pmTarget.nickname}</span>
                      {pmTarget.nickname.startsWith("🕵️") && (
                        <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-bold">مراقَبة</span>
                      )}
                      {pmTarget.role === "platinum_vip" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-plat">
                          بلاتيني
                        </span>
                      ) : pmTarget.role === "vip" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-vip">
                          VIP
                        </span>
                      ) : pmTarget.role === "owner" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-owner lamma-boss-badge">
                          👑 {OWNER_DISPLAY_BADGE}
                        </span>
                      ) : pmTarget.role === "admin" ? (
                        <span className="text-[8px] lamma-role-chip lamma-role-admin">
                          مشرف
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[9px] font-bold" style={{ color: pmTarget.nickname.startsWith("🕵️") ? "#a78bfa" : "#9ca3af" }}>
                      {pmTarget.nickname.startsWith("🕵️") ? "🔍 محادثة مراقَبة — للمالك فقط" : "محادثة خاصة"}
                    </div>
                  </div>
                </div>

                {/* PM tools — zoom text, resize window (desktop), clear chat */}
                <div
                  className="flex items-center gap-1"
                  style={{ display: pmTarget.nickname.startsWith("🕵️") ? "none" : undefined }}
                >
                  <button
                    type="button"
                    onClick={() => adjustPmTextScale(-1)}
                    disabled={pmTextScale <= PM_TEXT_SCALE_MIN}
                    className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center lamma-soft-action disabled:opacity-35"
                    title="تصغير النص"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustPmTextScale(1)}
                    disabled={pmTextScale >= PM_TEXT_SCALE_MAX}
                    className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center lamma-soft-action disabled:opacity-35"
                    title="تكبير النص"
                  >
                    <ZoomIn size={12} />
                  </button>
                  {mobileTab !== "private" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setPmPanelTier((tier) => Math.max(0, tier - 1))
                        }
                        disabled={pmPanelTier <= 0}
                        className="hidden md:flex w-7 h-7 rounded-lg text-gray-400 items-center justify-center lamma-soft-action disabled:opacity-35"
                        title="تصغير النافذة"
                      >
                        <Minimize2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPmPanelTier((tier) =>
                            Math.min(PM_PANEL_SIZES.length - 1, tier + 1),
                          )
                        }
                        disabled={pmPanelTier >= PM_PANEL_SIZES.length - 1}
                        className="hidden md:flex w-7 h-7 rounded-lg text-gray-400 items-center justify-center lamma-soft-action disabled:opacity-35"
                        title="تكبير النافذة"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleClearPmConversation()}
                    className="w-7 h-7 rounded-lg text-red-400/90 flex items-center justify-center lamma-soft-action hover:text-red-300"
                    title="مسح المحادثة"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Calling trigger buttons on right of header — hidden for spy threads */}
                <div className="flex items-center gap-2" style={{ display: pmTarget.nickname.startsWith("🕵️") ? "none" : undefined }}>
                  <button
                    type="button"
                    onClick={() => {
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
                      void initiateCall(pmTarget.nickname, "audio");
                    }}
                    className="w-7 h-7 rounded-lg text-green-300 flex items-center justify-center lamma-quiet-power-btn"
                    title="الاتصال الهاتفي"
                  >
                    <Phone size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
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
                      void initiateCall(pmTarget.nickname, "video");
                    }}
                    className="w-7 h-7 rounded-lg text-[#c1d86a] flex items-center justify-center lamma-quiet-power-btn"
                    title="مكالمة الفيديو"
                  >
                    <VideoIcon size={12} />
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
              <div ref={pmViewportRef} className="flex-1 overflow-y-auto p-3.5">
                {/* Spy mode banner */}
                {pmTarget.nickname.startsWith("🕵️") && (
                  <div className="text-center py-2 px-3 mb-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[9px] text-purple-300 font-bold">
                    🕵️ أنت تشاهد محادثة خاصة بين مستخدمين — وضع المراقبة السرية
                  </div>
                )}
                <ChatMessageVirtualList
                  messages={pmMessages}
                  parentRef={pmViewportRef}
                  estimateSize={88}
                  renderMessage={renderPmMessage}
                  getItemKey={(msg) => msg.dbId || msg.clientId || `${msg.time}-${msg.text}`}
                />
                {/* Typing indicator — hidden for spy threads */}
                {!pmTarget.nickname.startsWith("🕵️") && (
                  <AnimatePresence>
                    {isPmTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center gap-2 mb-2 w-fit lamma-typing-indicator"
                      >
                        <div className="bg-white/5 px-3 py-1.5 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full lamma-typing-dot"></span>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full lamma-typing-dot"></span>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full lamma-typing-dot"></span>
                          <span className="text-[9px] text-gray-400 mr-2">
                            {pmTarget.nickname} يكتب الان...
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                <div ref={pmEndRef} />
              </div>

              {/* PM input toolbar container — replaced by read-only notice for spy threads */}
              {pmTarget.nickname.startsWith("🕵️") ? (
                <div className="p-3.5 border-t border-purple-500/15 bg-purple-500/5 text-center">
                  <p className="text-[10px] text-purple-400 font-bold">
                    🕵️ وضع المشاهدة فقط — لا يمكن إرسال رسائل في محادثة مراقَبة
                  </p>
                </div>
              ) : (
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
                          if (!ensureImagesAccess()) return;
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
                        onClick={() => {
                          setShowPmAttachment(false);
                          if (!ensureYoutubeAccess()) return;
                          const inputUrl = prompt(
                            "🎥 أدخل رابط يوتيوب أو فيdeo:",
                          );
                          if (!inputUrl?.trim() || !pmTarget) return;
                          void sendPrivateMediaMessage(
                            "video",
                            inputUrl.trim(),
                          ).catch((error) => {
                            alert(
                              error instanceof Error
                                ? `❌ تعذر إرسال الرابط: ${error.message}`
                                : "❌ تعذر إرسال الرابط.",
                            );
                          });
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                          <Tv size={14} />
                        </div>
                        <span>يوتيوب</span>
                      </button>
                      <button
                        className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right"
                        onClick={() => {
                          setShowPmAttachment(false);
                          if (isUploadingImage) return;
                          if (currentUser.authProvider !== "supabase") {
                            alert(
                              "🎬 رفع الفيديو متاح للحسابات المسجلة فقط. سجل دخول الأول.",
                            );
                            return;
                          }
                          pmVideoUploadInputRef.current?.click();
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                          <VideoIcon size={14} />
                        </div>
                        <span>فيديو</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isVoiceRecording && voiceRecordingScopeRef.current === "pm" && (
                  <VoiceRecorderBar
                    durationSec={voiceRecordingSec}
                    maxDurationSec={120}
                    onCancel={() => {
                      cancelVoiceRecording();
                      voiceRecordingScopeRef.current = "room";
                    }}
                    onSend={() => void sendRecordedVoiceMessage()}
                    isUploading={isUploadingVoice}
                  />
                )}

                <div className="flex items-center lamma-composer-cluster bg-black/60 rounded-xl px-2.5 py-1.5 border lamma-accent-border-soft">
                  <button
                    type="button"
                    onClick={() => setShowPmEmojiPicker(!showPmEmojiPicker)}
                    className={`flex items-center justify-center transition-all lamma-composer-tool ${
                      showPmEmojiPicker
                        ? "lamma-accent-bg-medium lamma-accent-text-soft"
                        : "text-gray-500 hover:bg-white/10 hover-accent-soft"
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
                    onClick={() => void beginVoiceMessageRecording("pm")}
                    className={`flex items-center justify-center transition-all lamma-composer-tool ${
                      isVoiceRecording && voiceRecordingScopeRef.current === "pm"
                        ? "text-red-400 animate-pulse"
                        : "text-gray-500 hover:bg-white/10 hover-accent-soft"
                    }`}
                    title="رسالة صوتية"
                  >
                    <Mic size={16} />
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
                    className="flex-1 bg-transparent border-none text-right font-semibold text-[11px] focus:ring-0 focus:outline-none text-white"
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
                <input
                  ref={pmVideoUploadInputRef}
                  type="file"
                  accept="video/*,.mp4,.webm,.mov"
                  className="hidden"
                  onChange={handlePmVideoUploadChange}
                />
              </div>
              )} {/* end spy thread conditional */}
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

      {!isZenMode && isMobileAppShell ? (
        <MobileBottomNav
          active={
            mobileTab === "private"
              ? "private"
              : mobileTab === "members" || mobileTab === "sidebar"
                ? "members"
                : "chat"
          }
          onNavigate={handleMobileNav}
          hasPmActivity={Object.keys(pmThreads).length > 0}
        />
      ) : null}

      {/* ================= MODALS OVERLAYS ================= */}
      <AnimatePresence>
        {activeModal && !hasFloatingDropdownOpen && (
          <motion.div
            drag
            dragControls={modalDragControls}
            dragListener={false}
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
              {/* Modal Header — drag handle only (clicks in body stay clickable) */}
              <div
                className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.04] cursor-grab active:cursor-grabbing shrink-0 lamma-modal-header touch-none"
                onPointerDown={(event) => modalDragControls.start(event)}
              >
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
                      "مركز الحماية • LC-Fire 🔥"}
                    {activeModal === "store" &&
                      (isOwnerRole
                        ? "مركز المتجر والأتمتة (للمالك)"
                        : "متجر لمة")}
                  </h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleCloseActiveModal();
                  }}
                  disabled={isFlushingDesignSave}
                  className="p-1.5 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer relative z-50 disabled:opacity-40"
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

                    <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 space-y-3">
                      <div className="text-[11px] font-black text-emerald-300">
                        🎨 Universal Visual AI Style Engine
                      </div>
                      <p className="text-[10px] text-gray-300 leading-relaxed">
                        بوت التصميم يشتغل من <strong>غرفة الشات</strong> مش من
                        هنا. افتح غرفة «بوت التصميم AI» واكتب طلبك في شريط
                        الكتابة السفلي — مثلاً:{" "}
                        <span className="text-white/90">make the site cyberpunk neon</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (!openRooms.find((r) => r.id === "owner")) {
                            setOpenRooms((prev) => [
                              ...prev,
                              { id: "owner", name: "بوت التصميم AI", flag: "🎨" },
                            ]);
                          }
                          void (async () => {
                            if (
                              activeModal === "leadership" &&
                              leadershipTab === "design" &&
                              isOwnerRole
                            ) {
                              await flushAllDesignPersistence();
                            }
                            handleSwitchRoom("owner");
                            setActiveModal(null);
                            setIsSidebarOpen(false);
                            setMobileTab("chat");
                          })();
                        }}
                        className="w-full py-2.5 rounded-xl text-[10px] font-black bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
                      >
                        افتح غرفة بوت التصميم AI ←
                      </button>
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
                        onClick={() => setLeadershipTab("features")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "features"
                            ? "bg-sky-500/15 text-sky-300 border border-sky-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Mic size={12} />
                          صلاحيات الأعضاء
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadershipTab("cosmetics")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "cosmetics"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Crown size={12} />
                          منح المظهر
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
                          🔥 LC-Fire
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
                        onClick={() => { setLeadershipTab("owner_store"); setPendingOrdersCount(0); }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all relative ${
                          leadershipTab === "owner_store"
                            ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          🏪 إدارة المتجر
                        </span>
                        {pendingOrdersCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                            {pendingOrdersCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadershipTab("roles")}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          leadershipTab === "roles"
                            ? "bg-teal-500/15 text-teal-300 border border-teal-500/25"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Shield size={12} />
                          نظام الرتب
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

                {activeModal === "leadership" && leadershipTab === "features" && (
                  <OwnerMemberFeaturesPanel
                    registeredMemberNames={registeredMemberNames}
                    memberCustomPermissions={memberCustomPermissions}
                    setMemberCustomPermissions={setMemberCustomPermissions}
                    addSystemActivityLog={addSystemActivityLog}
                    currentUserNickname={currentUser.nickname}
                  />
                )}

                {activeModal === "leadership" && leadershipTab === "cosmetics" && (
                  <OwnerMemberCosmeticsPanel
                    registeredMemberNames={registeredMemberNames}
                    memberCosmeticGrants={memberCosmeticGrants}
                    setMemberCosmeticGrants={setMemberCosmeticGrants}
                    addSystemActivityLog={addSystemActivityLog}
                    currentUserNickname={currentUser.nickname}
                  />
                )}

                {activeModal === "leadership" && leadershipTab === "roles" && isOwnerRole && (
                  <ModalSuspense>
                    <LazyOwnerRoleManagementPanel
                      activeRoomId={activeRoomId}
                      currentUserNickname={currentUser.nickname}
                      chatMembers={chatMembers}
                      addSystemActivityLog={addSystemActivityLog}
                    />
                  </ModalSuspense>
                )}

                <ModalSuspense>
                {/* OWNER MODAL CONTENT */}
                {(activeModal === "owner" ||
                  (activeModal === "leadership" &&
                    leadershipTab === "quick")) && (
                  <LazyOwnerPanelModal
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
                    isAdsEnabled={isAdsEnabled}
                    setIsAdsEnabled={setIsAdsEnabled}
                    isGhostMode={isGhostMode}
                    setIsGhostMode={setIsGhostMode}
                    isBotSilent={isBotSilent}
                    setIsBotSilent={setIsBotSilent}
                    bannedWords={bannedWords}
                    setBannedWords={setBannedWords}
                    addSystemActivityLog={addSystemActivityLog}
                    currentUserNickname={currentUser.nickname}
                    setBrandLogoUrl={setBrandLogoUrl}
                    setOwnerBgImage={setOwnerBgImage}
                    onSendAdminMessage={handleSendAdminMessage}
                  />
                )}

                {/* ADMIN MODAL CONTENT */}
                {activeModal === "admin" && (
                  <LazyAdminPanelModal
                    adminTab={adminTab}
                    setAdminTab={setAdminTab}
                    activityLogs={activityLogs}
                    chatReports={chatReports}
                    onRefreshReports={() => void refreshChatReports()}
                    onResolveReport={(id, status) => void handleResolveReport(id, status)}
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
                    isBotEnabled={isBotEnabled}
                    setIsBotEnabled={setIsBotEnabled}
                    isWelcomeToastEnabled={isWelcomeToastEnabled}
                    setIsWelcomeToastEnabled={setIsWelcomeToastEnabled}
                    isInviteOnlyMode={isInviteOnlyMode}
                    setIsInviteOnlyMode={setIsInviteOnlyMode}
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
                  <LazyGuardPanelModal
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
                  <LazyStorePanelModal
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
                    addBotSystemWarning={addBotSystemWarning}
                    setStoreProducts={setStoreProducts}
                    isDbConnectionLost={isDbConnectionLost}
                    setIsDbConnectionLost={setIsDbConnectionLost}
                    setIsReconnectingDb={setIsReconnectingDb}
                    dbStatusLogs={dbStatusLogs}
                    setDbStatusLogs={setDbStatusLogs}
                    handleAccelerateDays={handleAccelerateDays}
                    subscriptionPlans={subscriptionPlans}
                    chatMembers={chatMembers}
                    bannedUsersList={bannedUsersList}
                    openRooms={openRooms}
                    roomMessages={roomMessages}
                    onOpenMemberProfile={openMemberProfile}
                    onStartPrivateChat={startPrivateChatWithMember}
                  />
                )}
                {activeModal === 'leadership' && leadershipTab === 'design' && (
                  <LazyDesignCenterModal
                    isOwnerRole={isOwnerRole}
                    runAssistantAudit={runAssistantAudit}
                    queueAssistantProposal={queueAssistantProposal}
                    previewAssistantPreset={previewAssistantPreset}
                    commitAssistantPreset={commitAssistantPreset}
                    cancelAssistantPreview={cancelAssistantPreview}
                    previewRecommendedAssistantTemplate={previewRecommendedAssistantTemplate}
                    assistantAudit={assistantAudit}
                    assistantFindings={assistantFindings}
                    assistantProposal={assistantProposal}
                    handleApplyAssistantProposal={handleApplyAssistantProposal}
                    setAssistantProposal={setAssistantProposal}
                    lastAppliedDesignSnapshot={lastAppliedDesignSnapshot}
                    handleRestoreLastDesignSnapshot={handleRestoreLastDesignSnapshot}
                    brandLogoUrl={brandLogoUrl}
                    designLogoUploadRef={designLogoUploadRef}
                    handleDesignLogoUpload={handleDesignLogoUpload}
                    designLogoInput={designLogoInput}
                    setDesignLogoInput={setDesignLogoInput}
                    setBrandLogoUrl={setBrandLogoUrl}
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
                    onResetDefaultChatBackground={handleResetDefaultChatBackground}
                    designPresets={designPresets}
                    designPresetName={designPresetName}
                    setDesignPresetName={setDesignPresetName}
                    handleSaveDesignPreset={handleSaveDesignPreset}
                    applyDesignPreset={applyDesignPreset}
                    handleDeleteDesignPreset={handleDeleteDesignPreset}
                    uploadDesignImage={uploadDesignAsset}
                    onStartInspectMode={handleStartDesignInspect}
                    previewDesignPrompt={previewDesignPrompt}
                    previewDesignPromptAi={previewDesignPromptAi}
                    previewDesignConfig={previewDesignConfig}
                    committedConfig={committedConfig}
                    getEditableDesignConfig={getEditableDesignConfig}
                    flushAllDesignPersistence={flushAllDesignPersistence}
                    commitPendingDesignPreview={commitPendingDesignPreview}
                    verifyDesignPreviewDom={verifyDesignPreviewDom}
                    hasPendingDesignPreview={hasPendingDesignPreview}
                    isApplyingStyle={isApplyingStyle}
                    cancelPendingDesignPreview={cancelPendingDesignPreview}
                    ownerWriteAccessOk={ownerWriteAccessOk}
                  />
                )}
                {activeModal === 'leadership' && leadershipTab === 'stats' && (
                  <LazyStatsModal
                    chatMembers={chatMembers}
                    roomMessages={roomMessages}
                    activeRoomId={activeRoomId}
                    openRooms={openRooms}
                    bannedUsersList={bannedUsersList}
                  />
                )}
                {activeModal === 'leadership' && leadershipTab === 'owner_store' && isOwnerRole && (
                  <LazyOwnerStorePanelModal
                    ownerNickname={currentUser.nickname}
                    addLammaBotMessage={addLammaBotMessage}
                    activeRoomId={activeRoomId}
                  />
                )}
                </ModalSuspense>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && (
        <ModalSuspense>
          <LazyUserProfileModal
        showProfileModal={showProfileModal}
        selectedProfileMember={selectedProfileMember}
        setShowProfileModal={setShowProfileModal}
        setSelectedProfileMember={setSelectedProfileMember}
        myActiveSession={myActiveSession}
        currentUser={currentUser}
        isOwnerRole={isOwnerRole}
        isRegisteredAccount={isRegisteredAccount}
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
        addLammaBotMessage={addLammaBotMessage}
        bannedUsersList={bannedUsersList}
        removeBanEntries={removeBanEntries}
        addBanEntry={addBanEntry}
        onDeleteMemberMessages={deleteMemberMessagesInRoom}
        chatMembers={chatMembers}
        setChatMembers={setChatMembers}
        memberCustomPermissions={memberCustomPermissions}
        setMemberCustomPermissions={setMemberCustomPermissions}
        myCustomBio={myCustomBio}
        setMyCustomBio={setMyCustomBio}
        handleSelectProfileEmoji={handleSelectProfileEmoji}
        handleProfileAvatarUploadChange={handleProfileAvatarUploadChange}
        profileAvatarInputRef={profileAvatarInputRef}
        profileAvatarSaving={profileAvatarSaving}
        profileAvatarStatus={profileAvatarStatus}
        onSendPrivateMessage={(member: ChatMember) => {
          startPrivateChatWithMember(member.nickname);
          setShowProfileModal(false);
          setSelectedProfileMember(null);
        }}
        onPromoteMemberRole={handlePromoteMemberRole}
        roomLabel={activeRoomId}
        myEffectiveRole={myGranterRole}
        roleGrantsPolicy={roleGrantsPolicy}
        roomTempGrantsByUserId={roomTempGrantsByUserId}
          />
        </ModalSuspense>
        )}
      </AnimatePresence>

      {/* Modal for Creating Room */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        passwordRequired={!isManagementRole}
        isUnlimited={isManagementRole}
        quotaRemaining={roomCreationQuotaInfo.remaining}
        quotaTotal={roomCreationQuotaInfo.quota}
        creating={isCreatingRoom}
        onCreate={async (details) => {
          const roomName = details.name.trim();
          if (!roomName) {
            alert("اكتب اسم الغرفة أولاً.");
            return;
          }

          if (
            !isManagementRole &&
            roomCreationQuotaInfo.remaining <= 0
          ) {
            alert(
              `استنفدت حصة إنشاء الغرف (${roomCreationQuotaInfo.used}/${roomCreationQuotaInfo.quota}).`,
            );
            return;
          }

          const password = details.password.trim();
          if (!isManagementRole && password.length < 4) {
            alert("يجب وضع كلمة مرور (4 أحرف على الأقل) للغرفة الخاصة.");
            return;
          }

          const roomIdBase = roomName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\u0600-\u06FF_-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          const roomId = roomIdBase || `pr-${Date.now()}`;

          setIsCreatingRoom(true);
          try {
            const result = await createPrivateChatRoom({
              name: roomName,
              password,
              operatorNickname: currentUser.nickname,
              roomId,
            });

            if (!result.ok) {
              const errorMessages: Record<string, string> = {
                not_authenticated: "يجب تسجيل الدخول أولاً.",
                name_too_short: "اسم الغرفة قصير جداً.",
                room_creation_not_granted:
                  "ليس لديك صلاحية إنشاء غرف. اطلبها من المالك.",
                quota_exceeded: `استنفدت حصتك (${result.used ?? "?"}/${result.quota ?? "?"} غرف).`,
                password_required:
                  "يجب وضع كلمة مرور (4 أحرف على الأقل) للغرفة.",
                room_exists: "الغرفة موجودة بالفعل، اختر اسماً مختلفاً.",
              };
              alert(
                errorMessages[result.error || ""] ||
                  `تعذر إنشاء الغرفة: ${result.error || "خطأ غير معروف"}`,
              );
              return;
            }

            await refreshPrivateRooms();

            const createdId = result.roomId || roomId;
            if (result.isLocked) {
              markRoomUnlocked(createdId);
            }

            setOpenRooms((prev) =>
              prev.some((room) => room.id === createdId)
                ? prev
                : [
                    ...prev,
                    {
                      id: createdId,
                      name: result.name || roomName,
                      flag: result.isLocked ? "🔒" : "✨",
                    },
                  ],
            );
            setRoomTopics((prev) => ({
              ...prev,
              [createdId]: `غرفة خاصة: ${result.name || roomName} ${result.isLocked ? "🔒" : "✨"}`,
            }));
            setActiveRoomId(createdId);
            setIsCreateRoomModalOpen(false);
            addSystemActivityLog(
              "promote",
              currentUser.nickname,
              `إنشاء غرفة خاصة [${createdId}] ${result.isLocked ? "🔒" : "✨"}`,
            );
            alert(`تم إنشاء الغرفة: ${result.name || roomName}`);
          } finally {
            setIsCreatingRoom(false);
          }
        }}
      />

      <RoomPasswordModal
        isOpen={isRoomPasswordModalOpen}
        roomName={pendingPasswordRoom?.name || pendingRoomSwitchId || ""}
        onClose={() => {
          setIsRoomPasswordModalOpen(false);
          setPendingRoomSwitchId(null);
        }}
        onSubmit={async (password) => {
          if (!pendingRoomSwitchId) return false;
          const verified = await verifyPrivateRoomPassword(
            pendingRoomSwitchId,
            password,
          );
          if (!verified.ok) return false;
          markRoomUnlocked(pendingRoomSwitchId);
          setActiveRoomId(pendingRoomSwitchId);
          setShowRoomsLists(false);
          setIsRoomPasswordModalOpen(false);
          setPendingRoomSwitchId(null);
          return true;
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
                                <span className="w-5 h-5 flex items-center justify-center overflow-hidden rounded-full shrink-0">
                                  <MemberAvatar
                                    avatar={m.avatar}
                                    size="xs"
                                    className="w-full h-full"
                                    imageClassName="w-full h-full rounded-full"
                                  />
                                </span>
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
                    <div className="text-[9px] lamma-accent-text-soft font-black mb-1">
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
        isMobile={isMobileAppShell}
        target={userContextTarget}
        currentUser={currentUser}
        friendsList={friendsList}
        ignoredUsers={ignoredUsers}
        blockedUsers={blockedUsers}
        handlers={{
          onSendPM: (target) => {
            startPrivateChatWithMember(target.nickname);
          },
          onViewProfile: (target) => {
            setShowUserContextPop(false);
            openMemberProfile(target.nickname, { direct: true });
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

      <UserProfileBioPopup
        isOpen={showUserProfileBioPop}
        isMobile={isMobileAppShell}
        target={userProfileBioTarget}
        currentUserNickname={currentUser.nickname}
        myCustomBio={myCustomBio}
        friendsList={friendsList}
        handlers={{
          onSendPM: (target) => {
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
            startPrivateChatWithMember(target.nickname);
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

      <UserProfilePageModal
        isOpen={showProfilePageModal}
        member={profilePageMember}
        currentUser={currentUser}
        storeSnapshot={subscription}
        cosmeticGrants={memberCosmeticGrants}
        chatMembers={chatMembers}
        onClose={() => {
          setShowProfilePageModal(false);
          setProfilePageMember(null);
        }}
        onSendPM={(target) => {
          setShowProfilePageModal(false);
          setProfilePageMember(null);
          startPrivateChatWithMember(target.nickname);
        }}
        onLike={likePost}
        onComment={commentOnPost}
      />

      {/* WebRTC Calling UI + incoming call */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] w-[90vw] max-w-sm rounded-2xl p-4 lamma-call-shell border lamma-accent-border shadow-2xl"
          >
            <div className="text-center space-y-3" dir="rtl">
              <div className="text-3xl animate-pulse">
                {incomingCall.type === "video" ? "📹" : "📞"}
              </div>
              <h3 className="text-sm font-black text-white">
                مكالمة {incomingCall.type === "video" ? "فيديو" : "صوت"} واردة
              </h3>
              <p className="text-xs text-gray-400">
                من: <span className="lamma-accent-text-soft font-bold">{incomingCall.fromNickname}</span>
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void acceptIncoming()}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-black"
                >
                  ✅ قبول
                </button>
                <button
                  type="button"
                  onClick={() => void rejectIncoming()}
                  className="flex-1 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-xs font-black"
                >
                  ❌ رفض
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[9999] ${
              showVideoCallPanel
                ? "bg-black"
                : "bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            }`}
          >
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {showVideoCallPanel ? (
              <div className="relative w-full h-full min-h-[100dvh] overflow-hidden">
                {remoteStream?.getVideoTracks().some((t) => t.enabled) ? (
                  <video
                    ref={bindRemoteVideo}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover bg-black"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-gray-400">
                    <span className="text-4xl">📹</span>
                    <span className="text-sm font-bold">في انتظار كاميرا الطرف الآخر…</span>
                  </div>
                )}

                <video
                  ref={bindLocalVideo}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute top-4 right-4 z-10 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl object-cover border-2 shadow-2xl ${
                    hasLocalVideo
                      ? "border-emerald-400/70"
                      : "border-red-400/50 bg-gray-900"
                  }`}
                  style={{ transform: "scaleX(-1)" }}
                />
                {!hasLocalVideo && (
                  <span className="absolute top-[9.5rem] right-4 sm:top-[13rem] z-10 text-[9px] font-black text-red-200 bg-black/75 px-2 py-1 rounded-lg">
                    الكاميرا مغلقة
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black text-white drop-shadow-lg">
                      {activeCall.target}
                    </h3>
                    <p className="text-[11px] font-bold text-gray-300">
                      مكالمة فيديو WebRTC
                    </p>
                  </div>

                  <div className="w-full max-w-sm text-center space-y-2 rounded-xl px-3 py-2 bg-black/40 backdrop-blur-sm border border-white/10">
                    {(activeCall.status === "connecting" ||
                      activeCall.status === "ringing") && (
                      <span className="text-sm font-bold text-yellow-400 animate-pulse">
                        {activeCall.status === "ringing"
                          ? "جاري الرنين..."
                          : "جاري الاتصال..."}
                      </span>
                    )}
                    {activeCall.status === "reconnecting" && (
                      <span className="text-sm font-bold text-yellow-400 animate-pulse">
                        جاري التبديل للسيرفر الاحتياطي...
                      </span>
                    )}
                    {activeCall.status === "connected" && (
                      <span className="text-2xl font-mono font-black lamma-accent-text">
                        {formatCallDuration(activeCall.callDuration)}
                      </span>
                    )}
                    {activeCall.status === "failed" && (
                      <span className="text-sm font-bold text-red-400">
                        {describeCallFailure(activeCall.failureReason)}
                      </span>
                    )}
                    {activeCall.status === "ended" && (
                      <span className="text-sm font-bold text-red-500">انتهت المكالمة</span>
                    )}
                  </div>

                  {activeCall.status !== "ended" && activeCall.status !== "failed" && (
                    <button
                      type="button"
                      onClick={endCall}
                      className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 cursor-pointer flex items-center justify-center text-white transition-all shadow-[0_4px_20px_rgba(220,38,38,0.55)]"
                    >
                      <Phone size={28} className="rotate-[135deg]" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <div className="rounded-3xl p-6 w-full max-w-md flex flex-col items-center justify-center space-y-4 lamma-call-shell">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl ${
                    activeCall.status === "connecting" ||
                    activeCall.status === "ringing"
                      ? "bg-black border-[3px] border-green-500/50 animate-pulse"
                      : activeCall.status === "connected"
                        ? "bg-green-500/20 border-[3px] border-green-500 text-green-400"
                        : activeCall.status === "reconnecting"
                          ? "bg-yellow-500/20 border-[3px] border-yellow-500 text-yellow-400 animate-pulse"
                          : activeCall.status === "failed" ||
                              activeCall.status === "ended"
                            ? "bg-red-500/20 border-[3px] border-red-500 text-red-500"
                            : "bg-gray-800 border-[3px] border-gray-600"
                  }`}
                >
                  📞
                </div>
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white">{activeCall.target}</h3>
                <p className="text-xs font-bold text-gray-400">مكالمة صوتية WebRTC</p>
              </div>

              <div className="w-full text-center space-y-2 rounded-xl p-3 lamma-call-status">
                {(activeCall.status === "connecting" ||
                  activeCall.status === "ringing") && (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-bold text-yellow-500 animate-pulse">
                      {activeCall.status === "ringing"
                        ? "جاري الرنين..."
                        : "جاري الاتصال..."}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      السيرفر: {activeCall.serverName}
                    </span>
                  </div>
                )}
                {activeCall.status === "reconnecting" && (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-bold text-yellow-400 animate-pulse">
                      جاري التبديل للسيرفر الاحتياطي...
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      🔄 {activeCall.serverName}
                    </span>
                  </div>
                )}
                {activeCall.status === "connected" && (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-xl font-mono font-black lamma-accent-text">
                      {formatCallDuration(activeCall.callDuration)}
                    </span>
                    <span className="text-[10px] text-green-400/80">
                      متصل عبر {activeCall.serverName}
                    </span>
                  </div>
                )}
                {activeCall.status === "failed" && (
                  <span className="text-sm font-bold text-red-400 leading-relaxed">
                    {describeCallFailure(activeCall.failureReason)}
                  </span>
                )}
                {activeCall.status === "ended" && (
                  <span className="text-sm font-bold text-red-500">انتهت المكالمة</span>
                )}
                {activeCall.isFallback && activeCall.status !== "ended" && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    يعمل على السيرفر الاحتياطي 🛡️
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 pt-1">
                {activeCall.status !== "ended" && activeCall.status !== "failed" && (
                  <button
                    type="button"
                    onClick={endCall}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 cursor-pointer flex items-center justify-center text-white transition-all shadow-[0_4px_15px_rgba(220,38,38,0.5)]"
                  >
                    <Phone size={24} className="rotate-[135deg]" />
                  </button>
                )}
              </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal
        isOpen={showShareModalInChat}
        onClose={() => setShowShareModalInChat(false)}
        appLink={appLink}
      />

      {isOwnerRole && designInspectActive ? (
        <DesignInspectOverlay
          active={designInspectActive}
          selectedRegion={inspectSelectedRegion}
          highlightRect={inspectHighlightRect}
          lastSummary={inspectLastSummary}
          suggestions={inspectSuggestions}
          hasPendingPreview={hasPendingDesignPreview}
          isApplying={inspectApplying}
          onAction={handleInspectRegionAction}
          onCustomPrompt={handleInspectCustomPrompt}
          onApplySuggestion={handleApplyInspectSuggestion}
          onCommit={handleInspectCommit}
          onCancel={handleInspectCancel}
          onExit={handleExitDesignInspect}
        />
      ) : null}

      {/* Real audio elements for Radio and Music streaming/playback */}
      <audio ref={radioAudioRef} preload="none" playsInline />
      <audio ref={musicAudioRef} src={currentMusicTrack.url || undefined} preload="none" playsInline />
      <audio ref={djBroadcastAudioRef} preload="auto" playsInline className="hidden" />
      <input
        ref={musicUploadInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.flac"
        multiple
        className="hidden"
        onChange={handleOwnerMusicUpload}
      />
    </div>
  );
}
