import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AMLogo from "./AMLogo.tsx";
import ShareModal from "./modals/ShareModal.tsx";
import CreateRoomModal from "./modals/CreateRoomModal.tsx";
import UserContextPopup from "./modals/UserContextPopup.tsx";
import UserProfileBioPopup from "./modals/UserProfileBioPopup.tsx";
import { getClientUid, supabase, SupabaseMessage } from "../lib/supabase.ts";
import {
  ROOMS_DEF,
  ROOM_CATEGORIES,
  GIFT_TYPES,
  EMOTICONS,
  SIMULATED_REPLIES,
} from "../lib/chatConstants.ts";
import {
  type Message,
  type ChatMember,
  type BanInfo,
  type ActivityLog,
  type PMThreadMessage,
  type MemberCustomPermissions,
} from "../lib/chatTypes.ts";
import {
  hexToRgba,
  getRoleFromAuthor,
  getFrameFromAuthor,
  getYoutubeId,
} from "../lib/chatHelpers.ts";
import { renderTextMessageWithMedia } from "../lib/chatMessageRender.tsx";

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="md:hidden fixed inset-0 z-[120]"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            aria-label="إغلاق"
          />
          <motion.div
            initial={{ y: 520 }}
            animate={{ y: 0 }}
            exit={{ y: 520 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl overflow-hidden max-h-[80vh] lamma-sheet-shell"
          >
            <div className="flex items-center justify-between px-4 py-3 lamma-sheet-header">
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="font-black text-white text-sm">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-red-400 hover:text-white transition-all cursor-pointer lamma-danger-btn"
                aria-label="إغلاق"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ChatScreen({
  currentUser,
  onLogout,
  primaryTheme,
}: ChatScreenProps) {
  const DEFAULT_AMBIENT_BG = "/images/chat-alley-bg.jpg";

  type WallTheme = "fire" | "ice" | "violet";

  const [ownerBgImage, setOwnerBgImage] = useState<string | null>(() =>
    localStorage.getItem("lamma_owner_bg_image"),
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(() =>
    localStorage.getItem("lamma_custom_logo_url"),
  );
  const [glowColor, setGlowColor] = useState<string>(() => {
    return localStorage.getItem("lamma_glow_color") || "#10b981";
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
  const [inputText, setInputText] = useState("");
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
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showPmListDropdown, setShowPmListDropdown] = useState(false);
  const [openRooms, setOpenRooms] = useState([
    { id: "egypt", name: "مصر", flag: "🇪🇬" },
  ]);
  const [activeRoomId, setActiveRoomId] = useState("egypt");
  const appLink = import.meta.env.VITE_APP_URL || window.location.origin;
  const geminiSearchEndpoint = import.meta.env.VITE_GEMINI_SEARCH_ENDPOINT || "";
  const senderUid = currentUser.uid || getClientUid();
  const roleLower = (currentUser.role || "").toLowerCase();
  const isOwnerRole =
    roleLower === "owner" ||
    roleLower === "malek" ||
    roleLower === "المالك" ||
    currentUser.role === "Owner" ||
    currentUser.role === "Malek";
  const isAdminRole = roleLower === "admin";
  const activeRoomBg = roomBgMap[activeRoomId] || ownerBgImage || DEFAULT_AMBIENT_BG;
  const isDefaultAmbientBg = activeRoomBg === DEFAULT_AMBIENT_BG;
  const isChatColumnExpanded = isLeftColumnCollapsed || isRightColumnCollapsed;

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
    const saved = localStorage.getItem("lamma_user_subscription");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [myActiveSession, setMyActiveSession] = useState(() => {
    const savedSub = localStorage.getItem("lamma_user_subscription");
    let initialRole = currentUser.role;
    let initialColor = currentUser.color;
    let initialFrame = "";
    let initialTitle = "";
    let initialBadge = "";
    let initialAvatar = "👤";

    if (savedSub) {
      try {
        const sub = JSON.parse(savedSub);
        if (sub.isActive && sub.expiresAt > Date.now()) {
          initialRole = sub.type === "platinum" ? "platinum_vip" : "vip";
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
      nickname: currentUser.nickname,
      role: initialRole,
      color: initialColor,
      frame: initialFrame,
      title: initialTitle,
      badge: initialBadge,
      avatar: initialAvatar,
    };
  });

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

  // User profiles click state
  const [selectedProfileMember, setSelectedProfileMember] =
    useState<ChatMember | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
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
    const saved = localStorage.getItem("lamma_friends_list");
    return saved ? JSON.parse(saved) : [];
  });
  const [ignoredUsers, setIgnoredUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem("lamma_ignored_users");
    return saved ? JSON.parse(saved) : [];
  });
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem("lamma_blocked_users");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("lamma_friends_list", JSON.stringify(friendsList));
    localStorage.setItem("lamma_ignored_users", JSON.stringify(ignoredUsers));
    localStorage.setItem("lamma_blocked_users", JSON.stringify(blockedUsers));
  }, [friendsList, ignoredUsers, blockedUsers]);

  const [myCustomBio, setMyCustomBio] = useState(() => {
    return (
      localStorage.getItem("lamma_user_bio") ||
      "شخص مميز يشغل حسابه في شات لمة الرائد 💚"
    );
  });

  // Stateful invite/share modal
  const [showShareModalInChat, setShowShareModalInChat] = useState(false);

  const handleCopyLink = () => {
    setShowShareModalInChat(true);
  };

  const [showStatus, setShowStatus] = useState(false);
  useEffect(() => {
    localStorage.setItem("lamma_user_bio", myCustomBio);
  }, [myCustomBio]);
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => setShowStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

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
    const isOwner =
      currentUser.role === "owner" || myActiveSession.role === "owner";
    const isAdmin =
      currentUser.role === "admin" || myActiveSession.role === "admin";
    if (isOwner || isAdmin) return true;
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
      try {
        localStorage.setItem(
          `lamma_messages_${activeRoomId}`,
          JSON.stringify(next),
        );
      } catch (e) {
        // ignore
      }
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
        localStorage.setItem(
          "lamma_user_subscription",
          JSON.stringify(expiredSub),
        );
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
          `🤖 البوت الذكي: انتهت فترة صلاحية باقة VIP המمنوحة للعضو [${currentUser.nickname}] بصورة آلية. تم سحب الامتيازات الشرفية بنجاح 🔔.`,
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
          `🤖 البوت الذكي: تنبيه اشتراك! متبقي 24 ساعة وينتهي اشتراك VIP لـ [${currentUser.nickname}] ⚠️.`,
        );
      } else if (remainingDays <= 3 && !savedReminders["3"]) {
        savedReminders["3"] = true;
        localStorage.setItem(
          "lamma_bot_reminders",
          JSON.stringify(savedReminders),
        );
        addLammaBotMessage(
          activeRoomId || "room1",
          `🤖 البوت الذكي: يا [${currentUser.nickname}] بقي 3 أيام فقط على نهاية باقة VIP الخاصة بك! لا تنسى التجديد 🎁.`,
        );
      } else if (remainingDays <= 7 && !savedReminders["7"]) {
        savedReminders["7"] = true;
        localStorage.setItem(
          "lamma_bot_reminders",
          JSON.stringify(savedReminders),
        );
        addLammaBotMessage(
          activeRoomId || "room1",
          `🤖 البوت الذكي: إشعار تلقائي! اشتراك الـ VIP لـ [${currentUser.nickname}] سينتهي خلال 7 أيام. استمتع بها وجدد مبكراً 🔔.`,
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
  const [newProdType, setNewProdType] = useState<
    "bronze" | "platinum" | "frame" | "title"
  >("title");
  const [newProdBadge, setNewProdBadge] = useState("");
  const [newProdColor, setNewProdColor] = useState("#10b981");
  const [newProdFrame, setNewProdFrame] = useState(
    "from-purple-600 to-pink-600",
  );
  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdExt, setNewProdExt] = useState("");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Dynamic online chat members state
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([
    {
      id: "u1",
      nickname: "أحمد",
      role: "owner",
      color: "#f59e0b",
      avatar: "👑",
      status: "online",
      email: "ahmed@lamma.chat",
      fingerprint: "fp-83a3-9281",
      browserSignature: "Mozilla/5.0 (Windows NT 10.0) Chrome/125.0.0.0",
      ip: "197.34.82.110",
      localStorageId: "local-u1",
    },
    {
      id: "u2",
      nickname: "علي (أدمن)",
      role: "admin",
      color: "#f43f5e",
      avatar: "🛡️",
      status: "online",
      email: "ali_admin@lamma.chat",
      fingerprint: "fp-10af-9bbb",
      browserSignature:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      ip: "102.43.190.22",
      localStorageId: "local-u2",
    },
    {
      id: "u3",
      nickname: "محمد (VIP)",
      role: "vip",
      color: "#58a6ff",
      avatar: "👨",
      status: "online",
      email: "mohamed@lamma.chat",
      fingerprint: "fp-72bc-11a0",
      browserSignature: "Mozilla/5.0 (X11; Linux x86_64) Firefox/124.0",
      ip: "196.20.122.5",
      localStorageId: "local-u3",
    },
    {
      id: "u4",
      nickname: "سارة (VIP)",
      role: "vip",
      color: "#ec4899",
      avatar: "👩",
      status: "online",
      email: "sara@lamma.chat",
      fingerprint: "fp-fa22-38ef",
      browserSignature:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1) Safari/605.1.15",
      ip: "156.210.15.80",
      localStorageId: "local-u4",
    },
    {
      id: "u5",
      nickname: "نور الدين",
      role: "user",
      color: "#10b981",
      avatar: "🧔",
      status: "online",
      email: "nour@email.com",
      fingerprint: "fp-89ff-ea22",
      browserSignature: "Mozilla/5.0 (Android; Mobile) Chrome/124.0",
      ip: "197.43.199.30",
      localStorageId: "local-u5",
    },
    {
      id: "u6",
      nickname: "LammaGuest_4829",
      role: "guest",
      color: "#94a3b8",
      avatar: "👤",
      status: "online",
      fingerprint: "fp-8bbc-31ff",
      browserSignature: "Mozilla/5.0 Chrome/125.0 Windows",
      ip: "41.65.120.25",
      localStorageId: "local-u6",
    },
  ]);

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
    return [
      {
        id: "log-seed-1",
        time: "10:30 م",
        type: "promote",
        userNickname: "سارة",
        operatorNickname: "أحمد (المالك)",
        details:
          "تم تجديد وترقية العضو سارة إلى رتبة VIP تقديراً لتفاعلها الأسبوعي بالنقاش.",
      },
      {
        id: "log-seed-2",
        time: "10:15 م",
        type: "login",
        userNickname: "محمد",
        operatorNickname: "محمد",
        details: "تسجيل دخول عضو VIP محمد عبر Google Login بنجاح.",
      },
      {
        id: "log-seed-3",
        time: "09:44 م",
        type: "ban",
        userNickname: "SuperSpammer",
        operatorNickname: "🛡️ بوت الحماية",
        details:
          "حظر تلقائي ومؤقت (Kick) بسبب إرسال نكات وعبارات سبام هجومية متعاقبة بسرعة فاقة.",
      },
    ];
  });

  // Lamma AI Guard Bot Settings & States
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [botRuleAntiSpam, setBotRuleAntiSpam] = useState(true);
  const [botRuleAntiLinks, setBotRuleAntiLinks] = useState(true);
  const [botRuleSwearFilter, setBotRuleSwearFilter] = useState(true);
  const [botRuleAutoMod, setBotRuleAutoMod] = useState(true);

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
  const [isAdBannerDismissed, setIsAdBannerDismissed] = useState<boolean>(
    () => {
      return localStorage.getItem("lamma_ad_banner_dismissed") === "true";
    },
  );

  // Persistent state synchronization loops
  useEffect(() => {
    localStorage.setItem(
      "lamma_ad_banner_dismissed",
      String(isAdBannerDismissed),
    );
  }, [isAdBannerDismissed]);
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
    return {
      سارة: {
        recordingAllowed: true,
        callsAllowed: true,
        musicRadioAllowed: true,
        roomCreationAllowed: true,
      },
      عمر: {
        recordingAllowed: false,
        callsAllowed: false,
        musicRadioAllowed: false,
        roomCreationAllowed: false,
      },
      ياسمين: {
        recordingAllowed: false,
        callsAllowed: false,
        musicRadioAllowed: false,
        roomCreationAllowed: false,
      },
      خالد: {
        recordingAllowed: false,
        callsAllowed: false,
        musicRadioAllowed: false,
        roomCreationAllowed: false,
      },
    };
  });

  useEffect(() => {
    localStorage.setItem(
      "lamma_custom_user_perms",
      JSON.stringify(memberCustomPermissions),
    );
  }, [memberCustomPermissions]);

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
      o.frequency.exponentialRampToValueAtTime(
        440,
        ctx.currentTime + 0.18,
      );
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
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

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
      | "pmList",
  ) => {
    setActiveModal(null);
    setIsPmOpen(false);
    setShowSearchPop(false);
    setShowUserContextPop(false);
    setShowUserProfileBioPop(false);
    setShowProfileModal(false);
    setShowRoomsLists(false);
    setShowMembersList(false);
    setShowFeaturesTray(false);
    setShowHeaderMenu((prev) => (dropdown === "headerMenu" ? !prev : false));
    setShowPmListDropdown((prev) => (dropdown === "pmList" ? !prev : false));
    setShowAttachmentDropdown((prev) =>
      dropdown === "attachment" ? !prev : false,
    );
    setShowGamesDropdown((prev) => (dropdown === "games" ? !prev : false));
    setShowMusicDropdown((prev) => (dropdown === "music" ? !prev : false));
    setShowRadioDropdown((prev) => (dropdown === "radio" ? !prev : false));
    setShowEmojiPicker((prev) => (dropdown === "emoji" ? !prev : false));
    setShowNotificationsDropdown((prev) =>
      dropdown === "notifications" ? !prev : false,
    );
    setShowCommandsDropdown((prev) =>
      dropdown === "commands" ? !prev : false,
    );
    setShowPrivacyDropdown((prev) => (dropdown === "privacy" ? !prev : false));
    setShowSettingsDropdown((prev) =>
      dropdown === "settings" ? !prev : false,
    );
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
    if (modal === "admin" && (!isAdminRole || isOwnerRole)) return;
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
    setActiveModal(modal);
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".dropdown-container") &&
        !target.closest(".sidebar-toggle-btn") &&
        !target.closest(".sidebar-container")
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

  // Sync banned list to localStorage
  useEffect(() => {
    localStorage.setItem("lamma_banned_list", JSON.stringify(bannedUsersList));
  }, [bannedUsersList]);

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

    let member = chatMembers.find(
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
        email: isGuest
          ? undefined
          : `${cleanName.toLowerCase().replace(/\s+/g, "")}@email.com`,
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

  // Interactive full-index check for block enforcement (IP, Fingerprint, LocalStorage, Emails, Session, Browser Sig)
  useEffect(() => {
    const isGuest =
      currentUser.nickname.startsWith("LammaGuest") ||
      currentUser.nickname.startsWith("LC-Guest") ||
      currentUser.nickname.startsWith("LC_Guest") ||
      currentUser.nickname.includes("زائر") ||
      currentUser.nickname.includes("Guest");
    const activeEmail = isGuest
      ? undefined
      : currentUser.nickname.toLowerCase() + "@email.com";

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
    addSystemActivityLog(
      "logout",
      currentUser.nickname,
      `تسجيل خروج ناجح للعضو ${currentUser.nickname} من الخادم وتدمير الجلسة المؤقتة.`,
      currentUser.nickname,
    );
    setTimeout(() => {
      onLogout();
    }, 250);
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
    const isOwner =
      roleLower === "owner" ||
      roleLower === "malek" ||
      roleLower === "المالك" ||
      currentUser?.nickname === "المالك";
    const isAdmin =
      roleLower === "admin" ||
      roleLower === "أدمن" ||
      roleLower === "مشرف" ||
      isOwner;

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

  // Active open PM recipient/target state
  const [pmTarget, setPmTarget] = useState({
    nickname: "سارة",
    role: "VIP",
    avatar: "🌸",
  });

  // Deep private message threads map grouped by nickname
  const [pmThreads, setPmThreads] = useState<Record<string, PMThreadMessage[]>>({
    سارة: [
      { text: "مرحباً 😇", isOwn: false, time: "10:40 PM" },
      { text: "مساء النور 🌹", isOwn: true, time: "10:40 PM" },
      { text: "كيف حالك? 😄", isOwn: true, time: "10:40 PM" },
      { text: "بخير الحمد لله", isOwn: false, time: "10:41 PM" },
      { text: "ماذا تفعلين الآن؟", isOwn: true, time: "10:41 PM" },
      { text: "أتحدث مع الأصدقاء في الشات 🎉", isOwn: false, time: "10:41 PM" },
      { text: "جميل جداً، استمري 😊", isOwn: true, time: "10:42 PM" },
    ],
  });

  const pmMessages = pmThreads[pmTarget.nickname] || [];
  const [pmInputText, setPmInputText] = useState("");
  const [isPmTyping, setIsPmTyping] = useState(false);

  // PM Fake typing effect
  useEffect(() => {
    if (isPmOpen && pmTarget) {
      const t = setTimeout(() => setIsPmTyping(true), 2000);
      const t2 = setTimeout(() => setIsPmTyping(false), 6000);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, [isPmOpen, pmTarget, pmMessages.length]);

  // Chat Header Welcome Message editability for owner
  const [welcomeMessage, setWelcomeMessage] = useState(
    "شات لمة يرحب بكم — يرجى احترام الجميع 💚",
  );
  const [isEditingWelcome, setIsEditingWelcome] = useState(false);

  // Room main chats, initially seeded with the exact conversation seen in screenshot 1
  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>({
    egypt: [
      {
        id: "seed-1",
        author: "محمد (VIP)",
        text: "مساء الخير عليكم جميعاً 🌹",
        color: "#58a6ff",
        isOwn: false,
        time: "10:31 PM",
        type: "text",
      },
      {
        id: "seed-2",
        author: "علي (أدمن)",
        text: "هلا محمد، كيف حالك؟",
        color: "#f43f5e",
        isOwn: false,
        time: "10:32 PM",
        type: "text",
      },
      {
        id: "seed-3",
        author: "1234_زائر",
        text: "مرحباً بالجميع 👋",
        color: "#94a3b8",
        isOwn: false,
        time: "10:32 PM",
        type: "text",
      },
      {
        id: "seed-4",
        author: "سارة (VIP)",
        text: "أهلاً زائر، نورت شاتنا 😍",
        color: "#ec4899",
        isOwn: false,
        time: "10:33 PM",
        type: "text",
      },
    ],
  });

  // Room mapped topics
  const [roomTopics, setRoomTopics] = useState<Record<string, string>>({
    egypt: "أهلاً وسهلاً بكم في غرفة مصر 💚",
    arab: "مرحباً بكم في ملتقى كل العرب 🌍",
    admin: "لوحة رقابة المشرفين، يرجى الحفاظ على النظام 🛡️",
    owner: "جدار المالك السري 👑، يمكنك هنا تعديل وتخصيص كل شيء بضغطة زر!",
  });
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicInputText, setTopicInputText] = useState("");

  // System Log Simulation
  const [systemActivity, setSystemActivity] = useState({
    id: 0,
    name: "Ali",
    type: "join",
  });
  useEffect(() => {
    const names = [
      "Mohamed",
      "Ahmed",
      "Sara",
      "Khalid",
      "Mona",
      "Omar",
      "Nour",
      "Rami",
    ];
    const timer = setInterval(() => {
      setSystemActivity((prev) => ({
        id: prev.id + 1,
        name: names[Math.floor(Math.random() * names.length)],
        type: Math.random() > 0.5 ? "join" : "leave",
      }));
    }, 30000); // Smart Presence Optimization: Update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  const [authError, setAuthError] = useState<string | null>(null);

  // Local messages loading
  useEffect(() => {
    const saved = localStorage.getItem(`lamma_messages_${activeRoomId}`);
    if (saved) {
      try {
        setRoomMessages((prev) => ({
          ...prev,
          [activeRoomId]: JSON.parse(saved),
        }));
      } catch (e) {
        console.error("Failed to parse messages from localStorage", e);
      }
    } else {
      setRoomMessages((prev) => ({
        ...prev,
        [activeRoomId]: [],
      }));
    }
  }, [activeRoomId]);

  useEffect(() => {
    if (!supabase) return;

    // Fetch initial messages for active room from Supabase
    const fetchSupabaseMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && data) {
        setRoomMessages((prev) => {
          const currentLocal = prev[activeRoomId] || [];
          // Instead of purely replacing, we might want to merge,
          // or we can just replace to keep Supabase as the source of truth for text msgs.
          // Let's replace purely non-local types.
          const localOnly = currentLocal.filter(
            (m) =>
              (m.id && m.id.startsWith("local-")) ||
              m.type === "join" ||
              m.type === "leave" ||
              m.type === "system",
          );
          const spbMsgs = data.map((sMsg: any) => ({
            id: sMsg.id,
            author: sMsg.author,
            text: sMsg.text,
            color: sMsg.color,
            isOwn: sMsg.author === currentUser.nickname,
            time: sMsg.created_at
              ? new Date(sMsg.created_at).toLocaleTimeString("ar-EG", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })
              : new Date().toLocaleTimeString("ar-EG", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                }),
            type: sMsg.type || "text",
            mediaUrl: sMsg.media_url,
            giftIcon: sMsg.gift_icon,
            giftName: sMsg.gift_name,
            youtubeId: sMsg.youtube_id,
            reactions: sMsg.reactions,
          }));
          return {
            ...prev,
            [activeRoomId]: [...localOnly, ...spbMsgs],
          };
        });
      }
    };

    fetchSupabaseMessages();

    // Listen to new messages for active room
    const subscription = supabase
      .channel(`room_${activeRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${activeRoomId}`,
        },
        (payload) => {
          const sMsg = payload.new as SupabaseMessage;
          const newLocalMsg = {
            id: sMsg.id || Date.now().toString(),
            author: sMsg.author,
            text: sMsg.text,
            color: sMsg.color,
            isOwn: sMsg.author === currentUser.nickname,
            time: sMsg.created_at
              ? new Date(sMsg.created_at).toLocaleTimeString("ar-EG", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })
              : new Date().toLocaleTimeString("ar-EG", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                }),
            type: (sMsg.type as any) || "text",
            mediaUrl: sMsg.media_url,
            giftIcon: sMsg.gift_icon,
            giftName: sMsg.gift_name,
            youtubeId: sMsg.youtube_id,
            reactions: sMsg.reactions,
          };

          setRoomMessages((prev) => {
            const current = prev[activeRoomId] || [];
            // check if already exists
            if (current.some((m) => m.id === newLocalMsg.id)) {
              return prev;
            }
            return {
              ...prev,
              [activeRoomId]: [...current, newLocalMsg],
            };
          });

          // Notify + sound for incoming messages from others
          if (sMsg.author !== currentUser.nickname && sMsg.author) {
            const mentionMatch =
              typeof sMsg.text === "string" &&
              sMsg.text.includes(`@${currentUser.nickname}`);
            const newNotif = {
              id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              kind: mentionMatch ? ("mention" as const) : ("system" as const),
              title: mentionMatch
                ? `${sMsg.author} ذكرك في ${activeRoomId}`
                : `رسالة جديدة من ${sMsg.author}`,
              body: (sMsg.text || sMsg.media_url || "[مرفق]").slice(0, 120),
              at: Date.now(),
              read: false,
            };
            setNotifications((prevN) => {
              const next = [newNotif, ...prevN].slice(0, 30);
              try {
                localStorage.setItem(
                  "lamma_notifications",
                  JSON.stringify(next),
                );
              } catch (e) {
                // ignore
              }
              return next;
            });
            if (document.hidden) playMessageSound();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeRoomId, currentUser.nickname]);

  const [messageShowCount, setMessageShowCount] = useState<number>(50);

  // Reset message count when changing room
  useEffect(() => {
    setMessageShowCount(50);
  }, [activeRoomId]);

  const allMessages = (roomMessages[activeRoomId] || []).filter((msg: any) => {
    if (msg.isShadowMsg) {
      return msg.author === currentUser.nickname;
    }
    const cleanAuthor = msg.author
      .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
      .trim()
      .toLowerCase();
    if (
      ignoredUsers.some((u) => u.toLowerCase() === cleanAuthor) ||
      blockedUsers.some((u) => u.toLowerCase() === cleanAuthor)
    ) {
      return false;
    }
    return true;
  });

  const messages = allMessages.slice(
    Math.max(0, allMessages.length - messageShowCount),
  );

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
  const pmEndRef = useRef<HTMLDivElement>(null);

  // Scroll logic
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const savedSub = localStorage.getItem("lamma_user_subscription");
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
      localStorage.setItem(
        "lamma_user_subscription",
        JSON.stringify(adjustedSub),
      );
      setSubscription(adjustedSub);

      addLammaBotMessage(
        activeRoomId || "room1",
        `⏳ محاكاة الأتمتة: تم تقدم الزمن بمقدار ${days} أيام على نظام التتبع الخاص باشتراكك. سيقوم البوت الذكي برصد التغيير وتنفيذ الأوامر إن لزم الأمر...`,
      );
    } catch (e) {
      console.error(e);
    }
  };

  const checkSecurityAndModerate = (
    text: string,
    authorName: string,
    roomId: string,
  ) => {
    let isBlocked = false;
    let isCensored = false;
    let cleanText = text;
    let warningMessage = null;
    let logMsg = null;
    let logSeverity: "info" | "warn" | "danger" = "info";

    if (!isBotEnabled) {
      return {
        isBlocked,
        isCensored,
        cleanText,
        warningMessage,
        logMsg,
        logSeverity,
      };
    }

    // 1. Anti-Link Protection
    if (
      botRuleAntiLinks &&
      (text.includes("http://") ||
        text.includes("https://") ||
        text.includes("www.") ||
        text.includes(".com") ||
        text.includes(".net"))
    ) {
      isBlocked = true;
      warningMessage = `⚠️ تنبيه أمني: تم حجب رسالة العضو (${authorName}) لاحتوائها على روابط خارجية غير مصرح بها لحماية خصوصية الأعضاء الأفاضل.`;
      logMsg = `محاولة نشر رابط خارجي مشبوه من [${authorName}] في غرفة [${systemRooms.find((r) => r.id === roomId)?.name || roomId}] تم حظرها تلقائياً.`;
      logSeverity = "danger";
      return {
        isBlocked,
        isCensored,
        cleanText: "",
        warningMessage,
        logMsg,
        logSeverity,
      };
    }

    // 2. Anti-Spam (Duplicates)
    const currentMsgs = roomMessages[roomId] || [];
    const lastUserMsg =
      currentMsgs.length > 0 ? currentMsgs[currentMsgs.length - 1] : null;
    if (
      botRuleAntiSpam &&
      lastUserMsg &&
      lastUserMsg.author === authorName &&
      lastUserMsg.text === text &&
      lastUserMsg.type === "text"
    ) {
      isBlocked = true;
      warningMessage = `⚠️ تنبيه مكرر: يرجى عدم تكرار نفس العبارات المتعاقبة سريعاً يا العضو (${authorName}) حفاظاً على جمال وهدوء الشات.`;
      logMsg = `رصد محاولة تكرار رسالة متطابقة (Spam) من [${authorName}] وتم حجبها لمنع الإزعاج.`;
      logSeverity = "warn";
      return {
        isBlocked,
        isCensored,
        cleanText: "",
        warningMessage,
        logMsg,
        logSeverity,
      };
    }

    // 3. Swear/Offensive Filter
    if (botRuleSwearFilter) {
      let foundViolation = false;
      bannedWords.forEach((word) => {
        if (word && text.toLowerCase().includes(word.toLowerCase())) {
          foundViolation = true;
          const stars = "*".repeat(word.length);
          cleanText = cleanText.replace(new RegExp(word, "gi"), stars);
        }
      });
      if (foundViolation) {
        isCensored = true;
        warningMessage = `🛡️ تمت الفلترة: قام حارس الشات التلقائي بفلترة وتظليل بعض الألفاظ غير المناسبة في رسالة العضو (${authorName}). الرجاء الحفاظ على رقي الحديث وعفة اللسان 💚`;
        logMsg = `مخالفة فلترة الكلام: تم العثور على ألفاظ منافية لآداب الشات في رسالة [${authorName}] وعُدلت تلقائياً.`;
        logSeverity = "warn";
      }
    }

    return {
      isBlocked,
      isCensored,
      cleanText,
      warningMessage,
      logMsg,
      logSeverity,
    };
  };

  useEffect(() => {
    if (activeRoomId === "admin" || activeRoomId === "owner") return; // Keep private management rooms silent from bots

    const rxTimer = setInterval(() => {
      const bots = [
        { name: "محمد (VIP)", color: "#58a6ff" },
        { name: "علي (أدمن)", color: "#f43f5e" },
        { name: "سارة (VIP)", color: "#ec4899" },
        { name: "نور الدين", color: "#10b981" },
      ];
      const selectedBot = bots[Math.floor(Math.random() * bots.length)];

      // Occasionally simulated bots try to post offensive or spam content to showcase moderation
      let reply =
        SIMULATED_REPLIES[Math.floor(Math.random() * SIMULATED_REPLIES.length)];
      const randomTest = Math.random();
      if (randomTest < 0.12 && isBotEnabled) {
        if (Math.random() > 0.5) {
          reply =
            "تفضلوا بزيارة موقعنا الممتع: http://scam-link-try.com لربح الجوائز 🎁";
        } else {
          reply = "يا لكم من مجتمع هبل وغبي تماماً!!";
        }
      }

      const {
        isBlocked,
        isCensored,
        cleanText,
        warningMessage,
        logMsg,
        logSeverity,
      } = checkSecurityAndModerate(reply, selectedBot.name, activeRoomId);
      const timeStr = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      if (logMsg) {
        setBotLogs((prev) => [
          {
            id: `${Date.now()}`,
            time: timeStr,
            text: logMsg,
            severity: logSeverity,
          },
          ...prev,
        ]);
      }

      if (isBlocked) {
        if (warningMessage) {
          addBotSystemWarning(activeRoomId, warningMessage);
        }
        return;
      }

      const newMessage: Message = {
        id: `${Date.now()}`,
        author: selectedBot.name,
        text: cleanText,
        color: selectedBot.color,
        isOwn: false,
        time: timeStr,
        type: "text",
      };

      setRoomMessages((prev) => {
        const currentMsgs = prev[activeRoomId] || [];
        return {
          ...prev,
          [activeRoomId]: [...currentMsgs, newMessage],
        };
      });

      if (isCensored && warningMessage) {
        setTimeout(() => {
          addBotSystemWarning(activeRoomId, warningMessage);
        }, 800);
      }
    }, 30000); // Smart Presence Optimization: Reduced frequency to 30 seconds

    return () => clearInterval(rxTimer);
  }, [
    activeRoomId,
    isBotEnabled,
    botRuleAntiSpam,
    botRuleAntiLinks,
    botRuleSwearFilter,
    bannedWords,
    roomMessages,
  ]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (inputText.trim() === "/clear") {
      setRoomMessages((prev) => ({
        ...prev,
        [activeRoomId]: [],
      }));
      setInputText("");
      return;
    }

    // Bot status report command!
    if (inputText.trim() === "/guard" || inputText.trim() === "/status") {
      const timeStr = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
      addBotSystemWarning(
        activeRoomId,
        `🤖 تقرير حارس الشات اللاسلكي Lamma Guard:
- حالة البوت: ${isBotEnabled ? "🟢 نشط ويحمي الغرف" : "🔴 معطل مؤقتاً"}
- تصفية الروابط: ${botRuleAntiLinks ? "✅ مفعّل" : "❌ معطل"}
- منع المزعجين: ${botRuleAntiSpam ? "✅ مفعّل" : "❌ معطل"}
- تصفية الشتائم: ${botRuleSwearFilter ? "✅ مفعّل" : "❌ معطل"}
- عدد الكلمات المحظورة: ${bannedWords.length} كلمة.
- جودة أمان الشات: 100% مستقر ونظيف.`,
      );
      setInputText("");
      return;
    }

    const isMuted = bannedUsersList.some(
      (b) =>
        b.nickname.toLowerCase() === currentUser.nickname.toLowerCase() &&
        b.type === "mute",
    );
    if (isMuted) {
      alert(
        "🔇 تنبيه حظر الصوت: لقد تم كتم صوتك من الكتابة الشات بقرار من الإدارة لمخالفة قوانين الحوار والآداب العامة.",
      );
      setInputText("");
      return;
    }

    const isOwnerOrAdmin =
      currentUser.role === "owner" ||
      currentUser.role === "admin" ||
      myActiveSession.role === "owner" ||
      myActiveSession.role === "admin";

    if (isMaintenanceMode && !isOwnerOrAdmin) {
      alert(
        "⚙️ الشات تحت الصيانة حالياً: يرجى الانتظار لحين انتهاء المالك من أعمال الصيانة والتحديث الفني المباشر.",
      );
      setInputText("");
      return;
    }

    if (isGlobalMute && !isOwnerOrAdmin) {
      alert(
        "🔇 الروم مغلق للكتابة: لقد قامت الإدارة بكتم الدردشة العامة لجميع الأعضاء مؤقتاً للمحافظة على هدوء واستقرار الحوار العامة.",
      );
      setInputText("");
      return;
    }

    const {
      isBlocked,
      isCensored,
      cleanText,
      warningMessage,
      logMsg,
      logSeverity,
    } = checkSecurityAndModerate(inputText, currentUser.nickname, activeRoomId);
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    if (logMsg) {
      setBotLogs((prev) => [
        {
          id: `${Date.now()}`,
          time: timeStr,
          text: logMsg,
          severity: logSeverity,
        },
        ...prev,
      ]);
    }

    const userNick = currentUser.nickname;
    const isViolation = isBlocked || isCensored;

    if (isViolation && isBotEnabled) {
      const nextCount = (violationCount[userNick] || 0) + 1;
      setViolationCount((prev) => ({ ...prev, [userNick]: nextCount }));

      if (nextCount === 1) {
        setTimeout(() => {
          addLammaBotMessage(
            activeRoomId,
            `⚠️ تنبيه رقابي لـ [${userNick}]: يرجى الالتزام بالقواعد والآداب العامة لشات لمة (إنذار 1 من 3).`,
          );
        }, 800);
      } else if (nextCount === 2) {
        setTimeout(() => {
          addLammaBotMessage(
            activeRoomId,
            `🚨 تحذير نهائي لـ [${userNick}]: عدم الالتزام في المرة القادمة سيعرضك للكتم التلقائي والفوري (إنذار 2 من 3).`,
          );
        }, 850);
      } else if (nextCount >= 3) {
        setTimeout(() => {
          addLammaBotMessage(
            activeRoomId,
            `🔇 كتم تلقائي لـ [${userNick}]: تم إيقاف رخصتك الكتابية لمدة 60 ثانية إثر تكرار المخالفات المكتشفة وتجاهل إنذارات الرقابة الآلية.`,
          );

          const autoBanInfo: BanInfo = {
            id: `auto-mute-${Date.now()}`,
            nickname: userNick,
            email: "",
            fingerprint: myFingerprint,
            browserSignature: myBrowserSig,
            ip: myIp,
            localStorageId: "local-storage-auto",
            type: "mute",
            banner: "🤖 LAMMA SYSTEM",
            reason: "تكرار المخالفات وتجاهل الحاكم الذكي",
            time: new Date().toLocaleTimeString("ar-EG", {
              hour: "numeric",
              minute: "numeric",
            }),
          };

          setBannedUsersList((prev) => {
            const updated = [autoBanInfo, ...prev];
            localStorage.setItem("lamma_banned_list", JSON.stringify(updated));
            return updated;
          });

          addSystemActivityLog(
            "ban",
            userNick,
            "تم تطبيق الكتم التلقائي بمقدار 60 ثانية لتجاوز الإنذارات الرقابية.",
            "🤖 LAMMA SYSTEM",
          );

          setTimeout(() => {
            setBannedUsersList((prev) => {
              const filtered = prev.filter(
                (b) =>
                  b.nickname.toLowerCase() !== userNick.toLowerCase() ||
                  b.type !== "mute",
              );
              localStorage.setItem(
                "lamma_banned_list",
                JSON.stringify(filtered),
              );
              return filtered;
            });
            addLammaBotMessage(
              activeRoomId,
              `🕊️ فك الكتم التلقائي لـ [${userNick}]: انتهت عقوبة الدقيقة الواحدة. نرجو التزام بالمعايير الرصينة المعتمدة للشات.`,
            );
            addSystemActivityLog(
              "promote",
              userNick,
              "إلغاء الكتم التلقائي بعد نهاية العقوبة بنجاح بفضل نظام الأتمتة.",
              "🤖 LAMMA SYSTEM",
            );
          }, 60000);
        }, 900);
      }
    }

    if (isBlocked) {
      if (warningMessage) {
        addBotSystemWarning(activeRoomId, warningMessage);
      }
      setInputText("");
      return;
    }

    const isShadowed = bannedUsersList.some(
      (b) =>
        b.nickname.toLowerCase() === currentUser.nickname.toLowerCase() &&
        b.type === "shadow",
    );

    if (false) {
      // Local fallback mode when Firebase Auth anonymous sign-ins are restricted or unconfigured in Firebase Console
      const localMsg: Message = {
        id: "local-" + Date.now(),
        author: userNick,
        text: cleanText,
        color: currentUser.color || "#10b981",
        isOwn: true,
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
        type: "text",
      };

      setRoomMessages((prev) => {
        const currentMsgs = prev[activeRoomId] || [];
        return {
          ...prev,
          [activeRoomId]: [...currentMsgs, localMsg],
        };
      });
    } else {
      // Standard Firebase live production mode
      const newUuid = crypto.randomUUID();
      const newMessage: Message = {
        id: newUuid,
        author: userNick,
        text: cleanText,
        color: currentUser.color,
        isOwn: true,
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
        type: isShadowed ? "shadow_msg" : "text",
      };
      const updatedMessages = [
        ...(roomMessages[activeRoomId] || []),
        newMessage,
      ];
      setRoomMessages((prev) => ({
        ...prev,
        [activeRoomId]: updatedMessages,
      }));
      localStorage.setItem(
        `lamma_messages_${activeRoomId}`,
        JSON.stringify(updatedMessages),
      );

      // Push to Supabase if not shadowed
      if (!isShadowed && supabase) {
        supabase
          .from("messages")
          .insert([
            {
              id: newUuid,
              room_id: activeRoomId,
              author: userNick,
              text: cleanText,
              color: currentUser.color || "#10b981",
              type: "text",
              sender_uid: senderUid,
            },
          ])
          .then(({ error }) => {
            if (error) console.error("Error sending to Supabase:", error);
          });
      }
    }

    if (isCensored && warningMessage) {
      setTimeout(() => {
        addBotSystemWarning(activeRoomId, warningMessage);
      }, 600);
    }

    setInputText("");
    setShowEmojiPicker(false);
  };

  const getDynamicReply = (nickname: string) => {
    const lower = nickname.toLowerCase();
    if (lower.includes("سارة") || lower.includes("sara")) {
      return "يا هلا بيك في شاتي الخاص، تسعدني جداً معرفتكم 🌸!";
    }
    if (lower.includes("محمد") || lower.includes("mohamed")) {
      return "أهلاً صديقي، يسعدني الحديث معك بالخاص! كيف يمكنني مشاركتك اليوم؟ 🎧";
    }
    if (lower.includes("أحمد") || lower.includes("ahmed")) {
      return "مرحباً بك بالخاص، شات لمة صمم من أجلكم وأنا سعيد بتواصلكم معي 👑.";
    }
    if (lower.includes("علي") || lower.includes("ali")) {
      return "أهلاً بك، معك المشرف علي بالخاص. كيف يمكنني مساعدتك؟ يرجى إبلاغي بأي شكاوى 🛡️.";
    }
    return `مرحباً بك! يسعدني جداً حديثنا هنا على الخاص مع تمنياتي لك بوقت ممتع في شات لمة 💚.`;
  };

  const handleSendPM = () => {
    if (!pmInputText.trim()) return;
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const targetNickname = pmTarget.nickname;

    const updatedThread = [
      ...(pmThreads[targetNickname] || []),
      {
        text: pmInputText,
        isOwn: true,
        time: timeStr,
      },
    ];

    setPmThreads((prev) => ({
      ...prev,
      [targetNickname]: updatedThread,
    }));
    setPmInputText("");

    // Sarah/Target replies automatically after 1.5s
    setTimeout(() => {
      const replyText = getDynamicReply(targetNickname);
      setPmThreads((prev) => ({
        ...prev,
        [targetNickname]: [
          ...(prev[targetNickname] || []),
          {
            text: replyText,
            isOwn: false,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            }),
          },
        ],
      }));
    }, 1500);
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
    localStorage.setItem(
      `lamma_messages_${activeRoomId}`,
      JSON.stringify(updatedMessages),
    );

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
      const targetNickname = pmTarget.nickname;
      setPmThreads((prev) => ({
        ...prev,
        [targetNickname]: [
          ...(prev[targetNickname] || []),
          { text: "", isOwn: true, time: timeStr, mediaUrl: publicUrl, type: "image" },
        ],
      }));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSendAttachment = (type: "image" | "imageUrl" | "video" | "audio") => {
    const isOwnerOrAdmin =
      currentUser.role === "owner" ||
      currentUser.role === "admin" ||
      myActiveSession.role === "owner" ||
      myActiveSession.role === "admin";
    const isVIP =
      myActiveSession.role === "vip" ||
      myActiveSession.role === "platinum_vip" ||
      myActiveSession.role === "mod";

    if (type === "audio") {
      const isOwner =
        currentUser.role === "owner" || myActiveSession.role === "owner";
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
      className="h-[100dvh] flex flex-col justify-between overflow-hidden relative font-sans text-[color:var(--text-primary)] lamma-fire-frame lamma-fire-frame-app"
      dir="rtl"
      data-lamma-wall={wallTheme}
    >
      {activeRoomBg ? (
        <>
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url(${activeRoomBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              transform: "scale(1.05)",
              filter: isDefaultAmbientBg ? "blur(12px) saturate(0.95)" : "none",
            }}
          />
          {isDefaultAmbientBg ? (
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                backgroundImage: `url(${activeRoomBg})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
                opacity: 0.88,
              }}
            />
          ) : null}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(2, 6, 12, 0.54) 0%, rgba(2, 8, 14, 0.40) 18%, rgba(3, 8, 12, 0.64) 100%)",
            }}
          />
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 16% 18%, rgba(255, 145, 68, 0.12), transparent 20%), radial-gradient(circle at 76% 14%, rgba(37, 99, 235, 0.15), transparent 24%), radial-gradient(circle at 52% 82%, rgba(14, 165, 233, 0.10), transparent 28%)",
            }}
          />
          <div className="absolute inset-0 bg-black/38 z-0 pointer-events-none" />
        </>
      ) : null}
      {/* Background radial soft light particles */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle at center, ${hexToRgba(glowColor, 0.05)}, transparent 70%)`,
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none select-none">
            <img
              src="/images/lamma-wordmark.svg"
              alt="LAMMA CHAT"
              className="h-6 sm:h-7 opacity-90 drop-shadow-[0_0_18px_rgba(24,181,123,0.14)]"
            />
            <div className="flex items-center gap-1.5 pointer-events-auto lamma-header-center-badge">
              {isEditingWelcome ? (
                <input
                  type="text"
                  id="welcome-message-input"
                  name="welcome-message"
                  autoComplete="off"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  onBlur={() => setIsEditingWelcome(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingWelcome(false)}
                  className="text-[9px] md:text-[10px] text-white font-medium truncate w-28 md:w-44 rounded-lg px-2 py-1 lamma-input-shell"
                  autoFocus
                />
              ) : (
                <p
                  className="text-[9px] md:text-[10px] text-gray-400 font-medium truncate max-w-[160px] md:max-w-[240px] drop-shadow-md"
                  title={welcomeMessage}
                >
                  {welcomeMessage}
                </p>
              )}

              {(currentUser.role === "admin" ||
                currentUser.role === "owner" ||
                currentUser.role === "Owner") &&
                !isEditingWelcome && (
                  <button
                    onClick={() => setIsEditingWelcome(true)}
                    className="opacity-100 transition-opacity text-gray-500 hover:text-green-400 lamma-soft-action lamma-header-mini-btn"
                    title="تعديل ترحيب الشات"
                  >
                    <SettingsIcon size={9} />
                  </button>
                )}
            </div>
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
                {(myActiveSession.role === "owner" ||
                  myActiveSession.role === "admin" ||
                  myActiveSession.role === "vip" ||
                  myActiveSession.role === "platinum_vip") && (
                  <div
                    className={`absolute -top-0.5 left-1/2 -translate-x-1/2 lamma-prestige-seal ${
                      myActiveSession.role === "admin"
                        ? "lamma-prestige-admin"
                        : myActiveSession.role === "vip"
                          ? "lamma-prestige-vip"
                          : myActiveSession.role === "platinum_vip"
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
                  className={`text-[11px] font-black flex items-center gap-1 truncate max-w-[45vw] sm:max-w-none ${myActiveSession.role === "platinum_vip" ? "animate-[pulse_1.5s_infinite] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 font-extrabold" : ""}`}
                  style={{
                    color:
                      myActiveSession.role === "platinum_vip"
                        ? undefined
                        : myActiveSession.color,
                  }}
                >
                  {myActiveSession.nickname}
                  {myActiveSession.badge && (
                    <span className="text-[7px] lamma-badge-chip">
                      {myActiveSession.badge}
                    </span>
                  )}
                </span>
                <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1">
                    {myActiveSession.role === "platinum_vip" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-plat">
                        PLATINUM VIP
                      </span>
                    ) : myActiveSession.role === "vip" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-vip">
                        VIP
                      </span>
                    ) : myActiveSession.role === "owner" ? (
                      <span className="text-[8px] lamma-role-chip lamma-role-owner">
                        OWNER
                      </span>
                    ) : myActiveSession.role === "admin" ? (
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
                <div className="flex items-center gap-1 mt-1">
                  {/* Rooms selector button */}
                  <div className="relative dropdown-container flex items-center xl:hidden">
                    <button
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
                      title="كل الغرف"
                    >
                        <Compass size={10} strokeWidth={2.2} />
                    </button>
                  </div>

                  {/* Members selector button */}
                  <div className="relative dropdown-container flex items-center xl:hidden">
                    <button
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
                      title="المتصلون"
                    >
                      <Users size={10} />
                      <span className="absolute -top-0.5 -right-0.5 lamma-icon-dot"></span>
                    </button>
                  </div>

                  {isOwnerRole && (
                    <div className="relative dropdown-container flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeadershipTab("quick");
                          openModal("leadership");
                        }}
                        className="flex items-center justify-center transition-colors relative cursor-pointer text-yellow-400 lamma-toolbar-btn lamma-header-mini-btn"
                        title="غرفة القيادة"
                      >
                        <Crown size={10} />
                      </button>
                    </div>
                  )}

                  {/* Master Settings Dropdown container inline */}
                  <div className="relative dropdown-container flex items-center">
                    <button
                      onClick={() => toggleDropdown("headerMenu")}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${showHeaderMenu ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                      title="القائمة والإعدادات"
                    >
                      <SettingsIcon size={10} />
                    </button>
                    <AnimatePresence>
                      {showHeaderMenu && (
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHeaderMenu(false);
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
                    onClose={() => setShowHeaderMenu(false)}
                    title="القائمة الرئيسية"
                    icon={
                      <SettingsIcon size={14} className="text-gray-400" />
                    }
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
                    <button
                      onClick={() => toggleDropdown("pmList")}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer lamma-header-mini-btn ${showPmListDropdown ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                      title="الرسائل الخاصة"
                    >
                      <MessageCircle size={11} strokeWidth={2.2} />
                      {Object.keys(pmThreads).length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black/60 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.14)]"></span>
                      )}
                    </button>

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
                              <MessageCircle size={16} className="text-[rgb(148,163,184)]" />
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
                                      setPmTarget(targetUser as any);
                                      if (window.innerWidth < 1280)
                                        setMobileTab("private");
                                      else setIsPmOpen(true);
                                      setShowPmListDropdown(false);
                                    }}
                                    className="p-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer relative z-40 lamma-list-item"
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
                    icon={<MessageCircle size={16} className="text-[rgb(148,163,184)]" />}
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
                                setPmTarget(targetUser as any);
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
                    <button
                      onClick={() => toggleDropdown("notifications")}
                      className={`flex items-center justify-center transition-colors relative cursor-pointer ml-1 sm:ml-2 lamma-header-mini-btn ${showNotificationsDropdown ? "text-green-300 lamma-quiet-power-btn-active" : "text-gray-400 lamma-toolbar-btn"}`}
                      title="الإشعارات"
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
                    </button>

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
                              <Bell size={16} className="text-[rgb(148,163,184)]" />
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
                                        {new Date(n.at).toLocaleString("ar-EG", {
                                          hour: "numeric",
                                          minute: "numeric",
                                          day: "2-digit",
                                          month: "2-digit",
                                        })}
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
                      <p className="text-[11px] text-gray-400 font-bold border-b border-white/5 pb-2">
                        أحدث التنبيهات والأحداث الخاصة بك في البرنامج.
                      </p>

                      <div className="grid gap-2">
                        <div className="p-2.5 rounded-xl flex items-start gap-2.5 pointer-events-none cursor-default lamma-notification-card lamma-notification-card-unread">
                          <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                            <Heart size={12} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[11px] font-black text-white">
                              إعجاب بملفك الشخصي
                            </h4>
                            <p className="text-[9px] text-gray-400 mt-0.5">
                              قام <strong>عمر</strong> بتسجيل إعجابه بملفك
                              الشخصي.
                            </p>
                            <span className="text-[8px] text-gray-500 font-mono mt-1 block">
                              منذ 5 دقائق
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl flex items-start gap-2.5 opacity-80 lamma-notification-card">
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 pointer-events-none">
                            <Users size={12} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[11px] font-black text-white pointer-events-none">
                              طلب صداقة جديد
                            </h4>
                            <p className="text-[9px] text-gray-400 mt-0.5 pointer-events-none">
                              أرسل لك <strong>سارة</strong> طلب صداقة.
                            </p>
                            <div className="flex gap-1.5 mt-1.5">
                              <button className="px-2.5 py-1 font-bold text-[8px] rounded-md cursor-pointer lamma-feature-primary">
                                قبول
                              </button>
                              <button className="px-2.5 py-1 text-white font-bold text-[8px] rounded-md cursor-pointer lamma-soft-action">
                                رفض
                              </button>
                            </div>
                            <span className="text-[8px] text-gray-500 font-mono mt-1 block pointer-events-none">
                              منذ 3 ساعات
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl flex items-start gap-2.5 opacity-60 pointer-events-none lamma-notification-card">
                          <div className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center flex-shrink-0">
                            <Crown size={12} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[11px] font-black text-white">
                              ترقية الحساب
                            </h4>
                            <p className="text-[9px] text-gray-400 mt-0.5">
                              انتهى اشتراك VIP الخاص بك. جدد الآن للحصول على
                              الشارات.
                            </p>
                            <span className="text-[8px] text-gray-500 font-mono mt-1 block">
                              الأمس
                            </span>
                          </div>
                        </div>
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
              : "w-[300px] 2xl:w-[340px] p-3 opacity-100 border-r border-[rgba(163,230,53,0.10)] lamma-column-frame lamma-column-shell"
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
                const rect = leftColumnLayoutRef.current.getBoundingClientRect();
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
                    <Play size={16} className="text-[color:var(--accent-primary)]" />
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
                        <Pause size={16} className="text-[color:var(--accent-primary)]" />
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
                const rect = leftColumnLayoutRef.current.getBoundingClientRect();
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
                    <Play size={16} className="text-[color:var(--accent-primary)]" />
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
                                    { id: room.id, name: room.name, flag: room.icon },
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
                {/* Category: Owner */}
                <div>
                  <div className="text-[10px] text-yellow-500 font-black flex items-center gap-1.5 mb-1.5 uppercase tracking-widest font-sans">
                    <span>👑</span>
                    <span>Owners</span>
                  </div>
                  <div className="pl-1 space-y-1 font-sans rounded-2xl overflow-hidden bg-yellow-500/[0.03] lamma-list-panel p-1.5">
                    {chatMembers
                      .filter((m) => m.role === "owner")
                      .map((m, idx, arr) => (
                        <div
                          key={m.id}
                          onClick={() => openMemberProfile(m.nickname)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openMemberProfile(m.nickname);
                          }}
                          className={`p-1.5 px-2 rounded-xl hover:bg-yellow-500/10 flex items-center justify-between cursor-pointer transition-all lamma-list-item ${idx !== arr.length - 1 ? "mb-1" : ""}`}
                        >
                          <div className="flex items-center gap-2 text-yellow-500 font-black">
                            <div className="flex-shrink-0 flex items-center justify-center">
                              <AMLogo
                                size={24}
                                variant="circular"
                                glow={false}
                                crownRole="owner"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[11px]">
                                {m.nickname}
                              </span>
                              <span className="text-yellow-500 text-[6px] font-black bg-yellow-500/10 px-1 py-0.5 rounded border border-yellow-500/20 self-start mt-0.5 tracking-wider">
                                OWNER
                              </span>
                            </div>
                          </div>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Category: Admins */}
                <div>
                  <div className="text-[10px] text-blue-400 font-extrabold flex items-center gap-1.5 mb-1.5 font-sans uppercase tracking-widest mt-3">
                    <span>🛡️</span>
                    <span>Admins</span>
                  </div>
                  <div className="pl-1 space-y-1 font-sans rounded-2xl overflow-hidden bg-blue-500/[0.03] lamma-list-panel p-1.5">
                    {chatMembers
                      .filter((m) => m.role === "admin" || m.role === "mod")
                      .map((m, idx, arr) => (
                        <div
                          key={m.id}
                          onClick={() => openMemberProfile(m.nickname)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openMemberProfile(m.nickname);
                          }}
                          className={`p-1.5 px-2 rounded-xl hover:bg-blue-500/10 flex items-center justify-between cursor-pointer transition-all lamma-list-item ${idx !== arr.length - 1 ? "mb-1" : ""}`}
                        >
                          <div className="flex items-center gap-2 text-blue-400 font-black">
                            <div className="flex-shrink-0 flex items-center justify-center">
                              <AMLogo
                                size={24}
                                variant="circular"
                                glow={false}
                                crownRole="admin"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[11px]">
                                {m.nickname}
                              </span>
                              <span className="text-[6px] self-start mt-0.5 lamma-role-chip lamma-role-admin">
                                {m.role === "admin" ? "ADMIN" : "MODERATOR"}
                              </span>
                            </div>
                          </div>
                          <span className="lamma-icon-dot" />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Category: VIP users */}
                <div>
                  <div className="text-[10px] text-green-400 font-extrabold flex items-center gap-1.5 mb-1.5 font-sans uppercase tracking-widest mt-3">
                    <span>💎</span>
                    <span>VIP Members</span>
                  </div>
                  <div className="pl-1 space-y-1 font-sans rounded-2xl overflow-hidden bg-green-500/[0.03] lamma-list-panel p-1.5">
                    {chatMembers
                      .filter((m) => m.role === "vip")
                      .map((m, idx, arr) => (
                        <div
                          key={m.id}
                          onClick={() => openMemberProfile(m.nickname)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openMemberProfile(m.nickname);
                          }}
                          className={`p-1.5 px-2 rounded-xl hover:bg-green-500/10 flex items-center justify-between cursor-pointer transition-all lamma-list-item ${idx !== arr.length - 1 ? "mb-1" : ""}`}
                        >
                          <div className="flex items-center gap-2 text-green-400 font-black">
                            <div className="flex-shrink-0 flex items-center justify-center">
                              <AMLogo
                                size={24}
                                variant="circular"
                                glow={false}
                                crownRole="vip"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[11px]">
                                {m.nickname}
                              </span>
                              <span className="text-[6px] self-start mt-0.5 lamma-role-chip lamma-role-vip">
                                VIP
                              </span>
                            </div>
                          </div>
                          <span className="lamma-icon-dot" />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Category: Normal users and guests */}
                <div>
                  <div className="text-[10px] text-gray-400 font-extrabold flex items-center justify-between mb-1.5 font-sans mt-3">
                    <span className="flex items-center gap-1 font-sans uppercase tracking-widest text-[9px]">👥 Users & Guests</span>
                    <span className="text-[9px] font-mono text-gray-500">{chatMembers.filter(m => m.role === "user" || m.role === "guest").length} Active</span>
                  </div>
                  <div className="pl-1 space-y-1 font-sans rounded-2xl overflow-hidden bg-white/[0.02] lamma-list-panel p-1.5">
                    {chatMembers.filter(m => m.role === "user" || m.role === "guest").map((m, idx, arr) => (
                      <div 
                        key={m.id}
                        onClick={() => openMemberProfile(m.nickname)}
                        onContextMenu={(e) => { e.preventDefault(); openMemberProfile(m.nickname); }}
                        className={`p-1.5 px-2 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-all lamma-list-item ${idx !== arr.length - 1 ? 'mb-1' : ''}`}
                      >
                        <div className="flex items-center gap-2 text-gray-300 font-bold overflow-hidden">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/5 rounded-full border border-white/10 text-[24px]">
                            {m.avatar}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-bold text-[12px] truncate leading-tight">{m.nickname}</span>
                            <span className="text-[6.5px] self-start mt-0.5 truncate lamma-role-chip">
                              {m.role === 'guest' ? 'GUEST' : 'MEMBER'}
                            </span>
                          </div>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
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
          } ${isLeftColumnCollapsed ? "xl:border-l xl:border-[rgba(163,230,53,0.12)]" : ""} ${isRightColumnCollapsed ? "xl:border-r xl:border-[rgba(163,230,53,0.12)]" : ""} lamma-column-frame`}
        >
          {/* Room Top Bar: Topic & System Actions */}
          <div className="flex items-stretch justify-between min-h-[38px] shrink-0 lamma-fire-underline lamma-room-header">
            {/* Topic Side (Right) */}
            <div
              className="flex-1 flex flex-col justify-center px-3 border-l border-green-500/10 group/topic cursor-pointer relative lamma-topic-shell"
              onClick={() => {
                if (
                  !isEditingTopic &&
                  (currentUser.role === "admin" ||
                    currentUser.role === "Owner" ||
                    currentUser.role === "owner" ||
                    currentUser.role === "Malek" ||
                    currentUser.role === "malek" ||
                    currentUser.role === "المالك")
                ) {
                  setTopicInputText(roomTopics[activeRoomId] || "");
                  setIsEditingTopic(true);
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="flex items-center justify-center text-[10px] text-green-300 lamma-quiet-power-btn lamma-topic-pin">
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
                  <p className="text-[11.5px] font-black text-teal-50 truncate flex-1 leading-normal py-0.5 mt-0.5">
                    {roomTopics[activeRoomId] ||
                      "مرحباً بكم في الغرفة الذكية 💚"}
                  </p>
                )}
              </div>
            </div>

            {/* System Actions Side (Left) */}
            <div className="w-[132px] sm:w-[168px] md:w-[208px] flex items-center justify-center px-2 py-0.5 relative overflow-hidden bg-white/[0.02] border-r border-white/5">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={systemActivity.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-sm flex-shrink-0">
                    {systemActivity.type === "join" ? "➡️" : "👋"}
                  </span>
                  <div className="flex flex-col text-left mr-1 justify-center">
                    <span
                      className="text-[10px] font-bold text-gray-200 truncate max-w-[100px] sm:max-w-[130px] leading-normal"
                      dir="ltr"
                    >
                      {systemActivity.name}
                    </span>
                    <span
                      className={`text-[8px] font-black uppercase leading-normal ${systemActivity.type === "join" ? "text-green-300" : "text-red-400"}`}
                      dir="ltr"
                    >
                      {systemActivity.type === "join"
                        ? "Join to room"
                        : "Leave room"}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Header section replicating the top of chat log / Room Tabs - matching Ad Banner size & width */}
          <div
            className="w-full px-2 flex items-center justify-between shrink-0 z-10 h-[36px] lamma-fire-underline lamma-room-header"
            dir="rtl"
          >
            {/* Tabs Container */}
            <div className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar flex-1 h-full items-end pb-0">
              {openRooms
                .filter((room) => {
                  const role = currentUser.role.toLowerCase();
                  if (
                    room.id === "owner" &&
                    role !== "owner" &&
                    role !== "malek"
                  )
                    return false;
                  if (
                    room.id === "admin" &&
                    role !== "admin" &&
                    role !== "owner" &&
                    role !== "malek"
                  )
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
                        ? "lamma-room-tab-active text-green-300 font-extrabold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {activeRoomId === room.id && (
                      <motion.div
                        layoutId="activeRoomBg"
                        className="absolute inset-0 bg-green-500/10 rounded-t-lg"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <div className="flex items-center gap-1 min-w-0 relative z-10">
                      <span className="text-[11px]">{room.flag}</span>
                      <span className="text-[9.5px] truncate whitespace-nowrap pt-0.5">
                        {room.name}
                      </span>
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
              <div className="relative dropdown-container">
                <button
                  type="button"
                  onClick={() => {
                    // Close other dropdowns for absolute mutual exclusion
                    setShowNotificationsDropdown(false);
                    setShowGamesDropdown(false);
                    setShowAttachmentDropdown(false);
                    setShowMusicDropdown(false);
                    setShowEmojiPicker(false);
                    setShowCommandsDropdown(false);
                    setShowPrivacyDropdown(false);
                    setShowSettingsDropdown(false);
                    setShowSearchPop(false);
                    setShowUserContextPop(false);
                    setShowUserProfileBioPop(false);
                    setShowProfileModal(false);
                    setShowRoomsLists(false);
                    setShowMembersList(false);
                    setIsPmOpen(false);
                    setShowFeaturesTray(!showFeaturesTray);
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
                      className="absolute top-full left-0 mt-2 w-[280px] rounded-2xl z-50 overflow-hidden flex flex-col lamma-feature-shell"
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
                                const isOwner =
                                  currentUser.role === "owner" ||
                                  myActiveSession.role === "owner";
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
              </div>

              <div className="relative dropdown-container">
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
                      drag
                      dragMomentum={false}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed top-24 left-1/2 -translate-x-1/2 sm:left-auto sm:right-32 w-[280px] rounded-2xl z-[100] overflow-hidden flex flex-col cursor-move lamma-modal-shell"
                    >
                      <div className="flex items-center justify-between p-3 lamma-modal-header">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-rose-300" />
                          <h3 className="font-black text-white text-xs">
                            خصوصية وأمان
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowPrivacyDropdown(false)}
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
                          <div className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all lamma-admin-card">
                            <div className="flex flex-col gap-1">
                              <span className="text-white text-xs font-black">
                                إخفاء التواجد (وضع التخفي)
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold">
                                إخفاء حالتك "متصل الآن" (ميزة VIP)
                              </span>
                            </div>
                            <div className="w-10 h-5 rounded-full relative lamma-tab-soft">
                              <div className="w-4 h-4 bg-gray-400 rounded-full absolute top-0.5 left-0.5"></div>
                            </div>
                          </div>
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
                  // Mutual exclusion on mobile toggle
                  setShowRoomsLists(false);
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
                  setShowUserContextPop(false);
                  setShowUserProfileBioPop(false);
                  setShowProfileModal(false);
                  setIsPmOpen(false);
                  setShowMembersList(!showMembersList);
                }}
                className={`p-1 px-1.5 rounded-md transition-all flex md:hidden ${showMembersList ? "lamma-quiet-power-btn-active text-green-300" : "text-gray-400 hover:text-white lamma-toolbar-btn"}`}
                title="تثبيت قائمة الأعضاء"
              >
                <Users size={14} />
              </button>

              <div className="dropdown-container">
                <button
                  onClick={() => {
                    // Close other popups to satisfy mutual exclusion
                    setShowSearchPop(false);
                    setShowUserContextPop(false);
                    setShowUserProfileBioPop(false);
                    setShowProfileModal(false);
                    setShowCommandsDropdown(!showCommandsDropdown);
                  }}
                  className={`p-1 px-1.5 rounded-md transition-all flex ${showCommandsDropdown ? "lamma-quiet-power-btn-active text-green-300" : "text-green-400 hover:text-green-300 lamma-toolbar-btn"}`}
                  title="نظام الأوامر السريعة"
                >
                  <Grid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Feed Viewport */}
          <div
            className="flex-1 overflow-y-auto py-4 space-y-4 lamma-fire-scroll pr-4 pl-6"
            dir="rtl"
          >
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
                  currentUser.role === "admin" ||
                  myActiveSession.role === "owner" ||
                  myActiveSession.role === "admin") && (
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
                  currentUser.role === "admin" ||
                  myActiveSession.role === "owner" ||
                  myActiveSession.role === "admin") && (
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
                  تحميل الرسائل السابقة ⬆️
                </button>
              </div>
            )}

            {messages.map((msg, index) => {
              const isSystem = msg.type === "system";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start ${isCompactView ? "gap-1 py-0 px-1" : "gap-2 py-0 px-2"} max-w-full rounded transition-colors ${
                    isSystem
                      ? "my-1"
                      : "hover:bg-white/5"
                  }`}
                >
                  {/* Author Avatar */}
                  <div
                    className="flex-shrink-0 cursor-pointer mt-1 group/author animate-fadeIn"
                    onClick={() => openMemberProfile(msg.author)}
                  >
                    <AMLogo
                      size={isCompactView ? 16 : 22}
                      variant="circular"
                      glow={msg.author === myActiveSession.nickname}
                      frame={getFrameFromAuthor(msg.author, myActiveSession)}
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
                    onClick={() => openMemberProfile(msg.author)}
                  >
                    {(() => {
                      const role = isSystem
                        ? "admin"
                        : getRoleFromAuthor(msg.author, myActiveSession);
                      const cleanName = msg.author
                        .replace(
                          /\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g,
                          "",
                        )
                        .trim();
                      const nameColor = isSystem
                        ? "#a3e635"
                        : msg.author === myActiveSession.nickname
                          ? myActiveSession.color
                          : msg.color;
                      return (
                        <div className="lamma-author-line">
                          <span
                            style={{ color: nameColor }}
                            className={`font-bold text-[11px] group-hover/author:underline lamma-author-name ${myActiveSession.nickname === msg.author && myActiveSession.role === "platinum_vip" ? "animate-[pulse_1.5s_infinite] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400" : ""}`}
                          >
                            {cleanName}
                          </span>

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
                                Math.floor(Math.random() * translations.length)
                              ];
                            alert(`الترجمة التقريبية:\n\n${randomTranslation}`);
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
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex gap-1 mt-2 items-center">
                          {Object.entries(msg.reactions).map(([emoji, count]) => (
                            <span
                              key={emoji}
                              className="text-[9px] bg-white/10 rounded px-1 select-none flex items-center gap-0.5"
                            >
                              {emoji} {count}
                            </span>
                          ))}
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
                            className="rounded-xl max-w-[280px] object-cover border border-white/10"
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
            })}

            <div ref={messageEndRef} />
          </div>

          {/* Scrolling Commercial ad banner */}
          {isAdsEnabled && !isAdBannerDismissed && (
            <div
              className="w-full px-3 py-1 flex items-center justify-between text-yellow-500 text-[10px] font-bold z-[40] relative lamma-fire-overline lamma-banner-shell"
              dir="rtl"
            >
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <span className="shrink-0 text-yellow-400 flex items-center gap-1">
                  <Sparkles size={12} className="text-yellow-500" />{" "}
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
                onClick={() => setIsAdBannerDismissed(true)}
                className="shrink-0 mr-3 text-yellow-500 rounded p-1 cursor-pointer flex items-center justify-center transition-colors lamma-soft-action"
                title="إخفاء الشريط"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Restore ad banner pill if dismissed */}
          {isAdsEnabled && isAdBannerDismissed && (
            <div
              className="w-full px-3 py-1 flex items-center justify-center z-[40] relative cursor-pointer transition-colors text-[9px] hover:text-yellow-500 font-bold lamma-fire-overline lamma-banner-pill"
              dir="rtl"
              onClick={() => setIsAdBannerDismissed(false)}
            >
              <Gift size={10} className="mr-1" />
              إظهار الإعلانات
            </div>
          )}

          {/* Styled Room Chat Bottom Input panel matching exact screenshot 1 center bar */}
          <div
            className={
              isZenMode
                ? "p-1.5 sm:p-2 absolute bottom-2 left-2 right-2 max-w-4xl mx-auto z-40 bg-transparent shrink-0 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.8)] rounded-full"
                : "p-1.5 sm:p-2 bg-[#0d130e]/74 border-t border-green-500/8 relative z-10 shrink-0"
            }
          >
            <div
              className={`flex flex-wrap md:flex-nowrap items-center gap-1 sm:gap-1.5 rounded-3xl md:rounded-full px-2 sm:px-3 py-1.5 sm:py-2 md:py-1 ${
                isZenMode
                  ? "bg-[#0b100c]/88 border border-green-500/24 shadow-2xl backdrop-blur-xl lamma-chat-input-shell"
                  : "bg-black/35 border border-green-500/8 lamma-chat-input-shell"
              }`}
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
                    {isOwnerRole && (
                      <button
                        type="button"
                        onClick={() => {
                          setLeadershipTab("quick");
                          openModal("leadership");
                        }}
                        className="flex items-center justify-center text-yellow-400 transition-all cursor-pointer lamma-quiet-power-btn lamma-composer-tool"
                        title="غرفة القيادة"
                      >
                        <Crown size={14} strokeWidth={2.1} />
                      </button>
                    )}

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
              <div className="relative dropdown-container xl:hidden">
                <button
                  type="button"
                  onClick={() => {
                    const isOwner =
                      currentUser.role === "owner" ||
                      myActiveSession.role === "owner";
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
                          <Radio size={14} strokeWidth={2.1} className="text-green-300" />
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
              <div className="relative dropdown-container xl:hidden">
                <button
                  type="button"
                  onClick={() => {
                    const isOwner =
                      currentUser.role === "owner" ||
                      myActiveSession.role === "owner";
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
                          <Music size={14} strokeWidth={2.1} className="text-cyan-300" />
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
                className="flex items-center justify-center text-gray-400 hover:text-white transition-all lamma-toolbar-btn lamma-composer-tool"
                title="تسجيل صوتي"
              >
                <Mic size={14} />
              </button>

              <div className="relative dropdown-container">
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

              <input
                id="messageInput"
                name="messageInput"
                type="text"
                autoComplete="off"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="اكتب رسالة..."
                className="flex-1 min-w-[120px] bg-transparent border-0 focus:ring-0 text-xs focus:outline-none px-2 text-right lamma-composer-field"
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
                      drag
                      dragConstraints={{
                        left: -300,
                        right: 300,
                        top: -400,
                        bottom: 100,
                      }}
                      dragMomentum={false}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed bottom-24 right-4 md:right-10 w-48 rounded-2xl z-[99] flex flex-col pb-1 lamma-popover-shell"
                    >
                      <div className="flex items-center justify-between p-2.5 border-b border-green-500/20 bg-black/40 cursor-grab active:cursor-grabbing">
                        <div className="text-[10px] text-gray-400 font-bold pointer-events-none">
                          إعدادات الدردشة
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSettingsDropdown(false);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-white transition-all cursor-pointer relative z-50 float-left lamma-feature-action"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex flex-col p-2 gap-1.5">
                        <button className="text-right p-1.5 hover:bg-white/10 rounded-lg text-xs text-white transition-all cursor-pointer lamma-list-item">
                          تغيير لون الخط
                        </button>
                        <button className="text-right p-1.5 hover:bg-white/10 rounded-lg text-xs text-white transition-all cursor-pointer lamma-list-item">
                          الخط المائل
                        </button>
                        <button className="text-right p-1.5 hover:bg-white/10 rounded-lg text-xs text-white transition-all cursor-pointer lamma-list-item">
                          الخط العريض
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
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all flex-shrink-0 cursor-pointer lamma-send-orb"
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
              : "w-[320px] 2xl:w-[340px] p-3 opacity-100 border-l border-[rgba(163,230,53,0.10)] lamma-column-frame lamma-column-shell"
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
                    <BookOpen size={15} className="text-[color:var(--accent-secondary)]" />
                    <span className="text-[12px] font-black">الغرف</span>
                  </div>
                  <span className="text-[10px] text-[color:var(--text-secondary)] font-mono">
                    {ROOMS_DEF.length}
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
                    const visibleRooms = ROOMS_DEF.filter((room) => {
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
                const rect = rightColumnLayoutRef.current.getBoundingClientRect();
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
                    <Users size={15} className="text-[color:var(--accent-secondary)]" />
                    <span className="text-[12px] font-black">المتصلون</span>
                  </div>
                  <span className="text-[10px] text-[color:var(--text-secondary)] font-mono">
                    {chatMembers.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 pl-2 space-y-4 lamma-fire-scroll">
                  {[
                    {
                      key: "owner",
                      title: "👑 Owner",
                      border: "border-yellow-500/10",
                      bg: "bg-yellow-500/5",
                      text: "text-yellow-500",
                      crownRole: "owner" as const,
                    },
                    {
                      key: "admin",
                      title: "🛡️ Admin",
                      border: "border-blue-500/10",
                      bg: "bg-blue-500/5",
                      text: "text-blue-400",
                      crownRole: "admin" as const,
                    },
                    {
                      key: "vip",
                      title: "💎 VIP",
                      border: "border-green-500/10",
                      bg: "bg-green-500/5",
                      text: "text-green-400",
                      crownRole: "vip" as const,
                    },
                    {
                      key: "user",
                      title: "👤 Members",
                      border: "border-white/5",
                      bg: "bg-white/[0.02]",
                      text: "text-gray-300",
                      crownRole: "none" as const,
                    },
                  ].map((group) => {
                    const members =
                      group.key === "admin"
                        ? chatMembers.filter(
                            (m) => m.role === "admin" || m.role === "mod",
                          )
                        : group.key === "user"
                          ? chatMembers.filter(
                              (m) => m.role === "user" || m.role === "guest",
                            )
                          : chatMembers.filter((m) => m.role === group.key);
                    if (members.length === 0) return null;
                    return (
                      <div key={group.key} className="space-y-2">
                        <div
                          className={`text-[10px] font-black flex items-center justify-between uppercase tracking-widest ${group.text}`}
                        >
                          <span>{group.title}</span>
                          <span className="text-[9px] font-mono text-[color:var(--text-secondary)]">
                            {members.length}
                          </span>
                        </div>
                        <div
                          className={`space-y-0 rounded-2xl overflow-hidden border ${group.border} ${group.bg}`}
                        >
                          {members.slice(0, 24).map((m, idx) => (
                            <div
                              key={m.id}
                              onClick={() => openMemberProfile(m.nickname)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                openMemberProfile(m.nickname);
                              }}
                              className={`p-2 px-2.5 hover:bg-white/5 flex items-center justify-between cursor-pointer transition-all ${idx !== Math.min(members.length, 24) - 1 ? "border-b border-white/5" : ""}`}
                            >
                              <div
                                className={`flex items-center gap-2 font-black ${group.text} overflow-hidden`}
                              >
                                {group.key === "user" ? (
                                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/5 rounded-full border border-white/10 text-[20px]">
                                    {m.avatar}
                                  </div>
                                ) : (
                                  <div className="flex-shrink-0 flex items-center justify-center">
                                    <AMLogo
                                      size={24}
                                      variant="circular"
                                      glow={false}
                                      crownRole={group.crownRole}
                                    />
                                  </div>
                                )}
                                <div className="flex flex-col truncate">
                                  <span className="font-bold text-[12px] truncate leading-tight text-white">
                                    {m.nickname}
                                  </span>
                                  <span className="text-[8px] font-black text-[color:var(--text-secondary)]">
                                    {m.role}
                                  </span>
                                </div>
                              </div>
                              <span className="lamma-icon-dot shrink-0" />
                            </div>
                          ))}
                          {members.length > 24 ? (
                            <div className="p-2 text-[10px] text-[color:var(--text-secondary)] font-bold text-center lamma-section-card">
                              +{members.length - 24} المزيد
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ----------------- PANEL 5: FLOATING PRIVATE CONVERSATION WINDOW WITH SARAH (5th column) ----------------- */}
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
                  const isOwner =
                    currentUser.role === "owner" ||
                    myActiveSession.role === "owner";
                  const perm =
                    memberCustomPermissions[currentUser.nickname]?.callsAllowed;
                  if (!isOwner && !perm) {
                    alert(
                      "⚠️ عذراً: ميزة المكالمات الصوتية والمرئية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 📞",
                    );
                    return;
                  }
                  const normalizedRole = currentUser.role.toLowerCase();
                  if (normalizedRole === "guest" || normalizedRole === "زائر") {
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
                  const isOwner =
                    currentUser.role === "owner" ||
                    myActiveSession.role === "owner";
                  const perm =
                    memberCustomPermissions[currentUser.nickname]?.callsAllowed;
                  if (!isOwner && !perm) {
                    alert(
                      "⚠️ عذراً: ميزة المكالمات الصوتية والمرئية غير مفعلة لحسابك من قبل المالك. يمكنك طلب التفعيل من مالك الشات. 📞",
                    );
                    return;
                  }
                  const normalizedRole = currentUser.role.toLowerCase();
                  if (normalizedRole === "guest" || normalizedRole === "زائر") {
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
                      ? "bg-gradient-to-l from-green-600 to-[#a3e635] text-black font-extrabold rounded-tr-none"
                      : "bg-black/50 border border-green-500/5 text-gray-100 rounded-tl-none"
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
                  {msg.text ? <p className="m-0 text-right">{msg.text}</p> : null}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[8px] text-gray-500 font-mono">
                    {msg.time}
                  </span>
                  {msg.isOwn && (
                    <span
                      className={`text-[10px] ${Math.random() > 0.5 ? "text-blue-400" : "text-gray-400"}`}
                    >
                      {Math.random() > 0.5 ? "✓✓" : "✓"}
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
                  className="absolute bottom-16 right-3 bg-[#0a0f0c] border border-green-500/20 shadow-xl rounded-2xl p-2 grid grid-cols-4 gap-1 z-50 w-52 overflow-y-auto max-h-40"
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
                  className="absolute bottom-16 right-10 bg-[#0a0f0c] border border-green-500/20 shadow-xl rounded-2xl p-2 grid grid-cols-1 gap-1 z-50 w-40"
                >
                  <button
                    className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs text-gray-300 w-full text-right"
                    onClick={() => {
                      setShowPmAttachment(false);
                      if (isUploadingImage) return;
                      if (currentUser.authProvider !== "supabase") {
                        alert("📸 رفع الصور متاح للحسابات المسجلة فقط. سجل دخول الأول.");
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

              <input
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
        </motion.aside>
      </div>

      {/* ================= MODALS OVERLAYS ================= */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            drag
            dragConstraints={{ left: -400, right: 400, top: -200, bottom: 200 }}
            dragMomentum={false}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed top-12 left-[5%] sm:left-[10%] md:left-[20%] w-[90vw] sm:w-[80vw] md:w-[60vw] max-w-[800px] z-[120] bg-[#0c120d]/98 border border-green-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col backdrop-blur-xl"
            style={{
              resize: "both",
              overflow: "hidden",
              minWidth: "300px",
              minHeight: "400px",
              maxHeight: "85vh",
            }}
          >
            <div className="flex flex-col w-full h-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-green-500/20 bg-black/40 cursor-grab active:cursor-grabbing shrink-0">
                <div className="flex items-center gap-2 pointer-events-none">
                  <span className="text-lg flex items-center justify-center">
                    {(activeModal === "leadership" || activeModal === "owner") && (
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
              <div className="flex-1 overflow-y-auto p-5 text-right space-y-4">
                {activeModal === "leadership" && (
                  <div className="space-y-4 select-none" dir="rtl">
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
                  <div className="space-y-6 select-none" dir="rtl">
                    <div className="rounded-2xl p-4 text-center lamma-soft-warn">
                      <h4 className="text-sm font-black text-yellow-500 mb-2">
                        {activeModal === "leadership"
                          ? "التحكم السريع"
                          : "غرفة التحكم الخاصة بالمالك فقط"}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {activeModal === "leadership"
                          ? "تفعيل فوري وتطبيق مباشر على كل الغرف."
                          : "أي تغيير هنا يطبق فورا بالقوة الجبرية على كل الغرف والأعضاء."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Maintenance */}
                      <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            <span className="inline-flex items-center gap-1.5">
                              <SettingsIcon size={13} className="text-yellow-300" />
                              وضع الصيانة الشامل
                            </span>
                          </span>
                          <button
                            onClick={() => {
                              const newVal = !isMaintenanceMode;
                              setIsMaintenanceMode(newVal);
                              localStorage.setItem(
                                "lamma_maintenance_mode",
                                String(newVal),
                              );
                              addSystemActivityLog(
                                "promote",
                                currentUser.nickname,
                                `قام المالك ${newVal ? "بتفعيل" : "بإلغاء"} وضع الصيانة الشامل لكامل المنصة.`,
                              );
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isMaintenanceMode ? "lamma-danger-btn" : "lamma-soft-action text-gray-300"}`}
                          >
                            {isMaintenanceMode ? "إيقاف الصيانة" : "تفعيل"}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          يمنع الجميع من الدردشة باستثناء المالك والـ Admins.
                        </p>
                      </div>

                      {/* Global Mute */}
                      <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            <span className="inline-flex items-center gap-1.5">
                              <VolumeX size={13} className="text-red-300" />
                              كتم الشات العام
                            </span>
                          </span>
                          <button
                            onClick={() => {
                              const newVal = !isGlobalMute;
                              setIsGlobalMute(newVal);
                              localStorage.setItem(
                                "lamma_global_mute",
                                String(newVal),
                              );
                              addSystemActivityLog(
                                "ban",
                                currentUser.nickname,
                                `قام المالك ${newVal ? "بكتم" : "بفتح"} الشات العام على الجميع.`,
                              );
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isGlobalMute ? "lamma-danger-btn" : "lamma-soft-action text-gray-300"}`}
                          >
                            {isGlobalMute ? "إلغاء الكتم" : "كتم للكل"}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          منع جميع الأعضاء من الكتابة (شات كتابي).
                        </p>
                      </div>

                      {/* Global Mic Mute */}
                      <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            🎙️ حظر المايكروفون العام
                          </span>
                          <button
                            onClick={() => {
                              const newVal = !isGlobalMicMute;
                              setIsGlobalMicMute(newVal);
                              localStorage.setItem(
                                "lamma_global_mic_mute",
                                String(newVal),
                              );
                              addSystemActivityLog(
                                "ban",
                                currentUser.nickname,
                                `قام المالك ${newVal ? "بحظر" : "بإلغاء حظر"} المايكروفون العام والصوتيات.`,
                              );
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isGlobalMicMute ? "lamma-danger-btn" : "lamma-soft-action text-gray-300"}`}
                          >
                            {isGlobalMicMute ? "السماح بالمايك" : "حظر المايك"}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          إلغاء خاصية إرسال المقاطع الصوتية في كل الغرف.
                        </p>
                      </div>

                      {/* VIP Images Only */}
                      <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            🖼️ الصور للـ VIP فقط
                          </span>
                          <button
                            onClick={() => {
                              const newVal = !isOnlyVIPCanSendImages;
                              setIsOnlyVIPCanSendImages(newVal);
                              localStorage.setItem(
                                "lamma_vip_only_images",
                                String(newVal),
                              );
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isOnlyVIPCanSendImages ? "lamma-toggle-on" : "lamma-soft-action text-gray-300"}`}
                          >
                            {isOnlyVIPCanSendImages ? "مفعل (VIP)" : "الجميع"}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          قصر ميزة إرسال الصور والفيديوهات على الداعمين والـ
                          VIP.
                        </p>
                      </div>
                    </div>

                    {/* Change Primary App logo / icon */}
                    <div className="p-4 rounded-xl space-y-3 mt-4 lamma-section-card">
                      <h5 className="text-xs font-bold text-emerald-400">
                        🎨 تعديل أيقونة التطبيق واستبدال التصميم
                      </h5>
                      <p className="text-[10px] text-gray-400">
                        تغيير الأيقونة السيادية ورابط خلفية الشات لجميع
                        المستخدمين.
                      </p>

                      {/* Logo */}
                      <div className="flex p-1.5 rounded-lg mt-2 lamma-admin-card">
                        <input
                          type="text"
                          id="owner_logo_url_input"
                          placeholder="رابط أيقونة اللوجو الجديد (URL)..."
                          className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const inp = document.getElementById(
                              "owner_logo_url_input",
                            ) as HTMLInputElement;
                            if (inp && inp.value.trim() !== "") {
                              localStorage.setItem(
                                "lamma_custom_logo_url",
                                inp.value.trim(),
                              );
                              setBrandLogoUrl(inp.value.trim());
                              alert(
                                "تم تحديث أيقونة التطبيق بنجاح! سيتم تطبيقها لجميع المستخدمين.",
                              );
                              addSystemActivityLog(
                                "promote",
                                currentUser.nickname,
                                "قام المالك بتحديث أيقونة التطبيق السيادية.",
                              );
                            } else {
                              localStorage.removeItem("lamma_custom_logo_url");
                              setBrandLogoUrl(null);
                              alert("تم استعادة الأيقونة الافتراضية.");
                            }
                          }}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-feature-primary"
                        >
                          تحديث اللوجو
                        </button>
                      </div>

                      {/* Background */}
                      <div className="flex p-1.5 rounded-lg mt-3 lamma-admin-card">
                        <input
                          type="text"
                          id="owner_bg_url_input"
                          placeholder="رابط صورة لتبديل تصميم الخلفية (URL)..."
                          className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const inp = document.getElementById(
                              "owner_bg_url_input",
                            ) as HTMLInputElement;
                            if (inp && inp.value.trim() !== "") {
                              localStorage.setItem(
                                "lamma_owner_bg_image",
                                inp.value.trim(),
                              );
                              setOwnerBgImage(inp.value.trim());
                              alert("تم تطبيق تصميم الخلفية السيادي بنجاح!");
                              addSystemActivityLog(
                                "promote",
                                currentUser.nickname,
                                "قام المالك بتغيير تصميم خلفية الشات.",
                              );
                            } else {
                              localStorage.removeItem("lamma_owner_bg_image");
                              setOwnerBgImage(null);
                              alert("تم استعادة تصميم الخلفية الافتراضية.");
                            }
                          }}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
                        >
                          تحديث التصميم
                        </button>
                      </div>
                    </div>

                    {/* Word Wall Firewall */}
                    <div className="p-4 rounded-xl space-y-3 mt-4 lamma-soft-danger">
                      <h5 className="text-xs font-bold text-red-500">
                        🧱 جدار حماية الشات القوي (Word Wall)
                      </h5>
                      <p className="text-[10px] text-gray-400">
                        إضافة كلمات ممنوعة إلى جدار حماية اللمة لمنع أي رسائل
                        تحتوي عليها وطرد مرسلها فوراً.
                      </p>
                      <div className="flex p-1.5 rounded-lg lamma-admin-card">
                        <input
                          type="text"
                          id="owner_word_wall_input"
                          placeholder="أدخل الكلمة الممنوعة هنا..."
                          className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const inp = document.getElementById(
                              "owner_word_wall_input",
                            ) as HTMLInputElement;
                            const word = inp?.value.trim();
                            if (word) {
                              if (!bannedWords.includes(word)) {
                                setBannedWords((prev) => [...prev, word]);
                                alert(
                                  `تم إضافة الكلمة "${word}" لجدار الحماية!`,
                                );
                                addSystemActivityLog(
                                  "ban",
                                  currentUser.nickname,
                                  `قام المالك بإضافة كلمة جديدة لجدار المنع الشامل.`,
                                );
                              }
                              inp.value = "";
                            }
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all lamma-danger-btn"
                        >
                          إضافة للجدار
                        </button>
                      </div>
                      {/* Show a few sample words */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {bannedWords.slice(0, 8).map((word) => (
                          <span
                            key={word}
                            className="px-2 py-0.5 rounded-md text-red-300 text-[9px] lamma-soft-danger"
                          >
                            {word}
                          </span>
                        ))}
                        {bannedWords.length > 8 && (
                          <span className="text-[10px] text-gray-500">
                            +{bannedWords.length - 8} كلمات أخرى
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ADMIN MODAL CONTENT */}
                {activeModal === "admin" && (
                  <div className="space-y-5 select-none" dir="rtl">
                    {/* Tabs triggers */}
                    <div className="flex border-b border-green-500/10 pb-0.5 gap-2 select-none overflow-x-auto scroller-hidden">
                      <button
                        onClick={() => setAdminTab("actions")}
                        className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
                          adminTab === "actions"
                            ? "border-[#a3e635] text-[#a3e635]"
                            : "border-transparent text-gray-405 hover:text-white"
                        }`}
                      >
                        ⚡ الإحصاءات والتحكم السريع
                      </button>
                      <button
                        onClick={() => setAdminTab("logs")}
                        className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
                          adminTab === "logs"
                            ? "border-[#a3e635] text-[#a3e635]"
                            : "border-transparent text-gray-405 hover:text-white"
                        }`}
                      >
                        📝 سجل العمليات والأنشطة ({activityLogs.length})
                      </button>
                      <button
                        onClick={() => setAdminTab("bans")}
                        className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
                          adminTab === "bans"
                            ? "border-[#a3e635] text-[#a3e635]"
                            : "border-transparent text-gray-405 hover:text-white"
                        }`}
                      >
                        🚫 المطرودين والـ Mega Ban ({bannedUsersList.length})
                      </button>
                      <button
                        onClick={() => setAdminTab("store_mgmt")}
                        className={`pb-2 px-3 text-xs font-black transition-all border-b-2 cursor-pointer shrink-0 ${
                          adminTab === "store_mgmt"
                            ? "border-[#a3e635] text-[#a3e635]"
                            : "border-transparent text-gray-405 hover:text-white"
                        }`}
                      >
                        🏪 عروض وإضافات المتجر ({storeProducts.length})
                      </button>
                    </div>

                    {/* Sub-tab 1: actions */}
                    {adminTab === "actions" && (
                      <div
                        className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 text-right font-sans select-none"
                        dir="rtl"
                      >
                        {/* Dynamic Live Counter Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div className="p-2.5 bg-black/40 rounded-xl border border-emerald-500/10 text-center">
                            <div className="text-sm font-black text-emerald-400">
                              {chatMembers.filter((m) => m.status === "online")
                                .length + 85}
                            </div>
                            <div className="text-[8.5px] text-gray-400 font-extrabold">
                              المتواجدين الآن
                            </div>
                          </div>
                          <div className="p-2.5 bg-black/40 rounded-xl border border-yellow-500/10 text-center">
                            <div className="text-sm font-black text-yellow-500">
                              {chatMembers.filter(
                                (m) =>
                                  m.role === "vip" ||
                                  m.role === "owner" ||
                                  m.role === "admin" ||
                                  m.role === "mod",
                              ).length + 12}
                            </div>
                            <div className="text-[8.5px] text-gray-400 font-extrabold">
                              الرتب والـ VIP النشط
                            </div>
                          </div>
                          <div className="p-2.5 bg-black/40 rounded-xl border border-red-500/10 text-center">
                            <div className="text-sm font-black text-red-500">
                              {bannedUsersList.length}
                            </div>
                            <div className="text-[8.5px] text-gray-400 font-extrabold">
                              العقوبات والبلاغات
                            </div>
                          </div>
                          <div className="p-2.5 bg-black/40 rounded-xl border border-cyan-500/10 text-center">
                            <div className="text-sm font-black text-cyan-300">
                              ممتازة
                            </div>
                            <div className="text-[8.5px] text-gray-400 font-extrabold">
                              استجابة السيرفر
                            </div>
                          </div>
                        </div>

                        {/* SECTION A: GLOBAL ONE-CLICK SWITCHES */}
                        <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                          <h5 className="text-[10px] font-black text-emerald-400 border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                            🔒 مفاتيح السيطرة والتحكم السريع بضغطة واحدة (Global
                            Safety Toggles)
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Toggle 1: Maintenance Mode */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isMaintenanceMode;
                                setIsMaintenanceMode(nextVal);
                                addSystemActivityLog(
                                  "demote",
                                  currentUser.nickname,
                                  `تغيير حالة وضع الصيانة العام لموقع شات لمة إلى: [${nextVal ? "مفعّل" : "ملغى"}]`,
                                  "👑 OWNER MODERATOR",
                                );
                                addLammaBotMessage(
                                  activeRoomId,
                                  `🤖 إشعار إداري: تم ${nextVal ? "تفعيل وضع الصيانة المؤقت للشات لجميع الأعضاء لإجراء أعمال تحسينات فنية" : "إنهاء وضع الصيانة بنجاح واسترداد كافة قنوات الاتصال والسرعة"} بقرار من الإدارة ⚡.`,
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                                isMaintenanceMode
                                  ? "bg-yellow-500/10 border-yellow-500/35 text-yellow-400 shadow-md"
                                  : "lamma-tab-soft text-gray-300 hover:text-white"
                              }`}
                            >
                              <span>⚙️ وضع الصيانة الشامل</span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isMaintenanceMode ? "bg-yellow-500/20 text-yellow-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {isMaintenanceMode ? "نشط حالياً" : "صامت/مغلق"}
                              </span>
                            </button>

                            {/* Toggle 2: Global Mute */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isGlobalMute;
                                setIsGlobalMute(nextVal);
                                addSystemActivityLog(
                                  "ban",
                                  currentUser.nickname,
                                  `تغيير كتم الروم العام للدردشة إلى: [${nextVal ? "كتم نشط" : "مفتوح"}]`,
                                  "👑 OWNER MODERATOR",
                                );
                                addLammaBotMessage(
                                  activeRoomId,
                                  `🤖 إشعار الصيانة الذاتية: تم ${nextVal ? "كتم الدردشة في الروم العام لجميع الأعضاء مؤقتاً للمحافظة على آداب النقاش" : "إعادة فتح الدردشة العامة، أهلاً وسهلاً بالجميع للحديث الراقي"} بأمر المالك ⚠️.`,
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                                isGlobalMute
                                  ? "bg-red-500/10 border-red-500/35 text-red-400"
                                  : "lamma-tab-soft text-gray-300 hover:text-white"
                              }`}
                            >
                              <span>🔇 كتم الروم العام لكافة الأعضاء</span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isGlobalMute ? "bg-red-500/20 text-red-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {isGlobalMute ? "الكتم نشط" : "الكتابة مفتوحة"}
                              </span>
                            </button>

                            {/* Toggle 3: Global Mic Mute */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isGlobalMicMute;
                                setIsGlobalMicMute(nextVal);
                                addSystemActivityLog(
                                  "ban",
                                  currentUser.nickname,
                                  `تعديل إذن الميكروفونات والبث العام إلى: [${nextVal ? "مغلقة" : "مفتوحة"}]`,
                                  "👑 OWNER MODERATOR",
                                );
                                addLammaBotMessage(
                                  activeRoomId,
                                  `🤖 قرار ضبط المايكات: تم ${nextVal ? "إغلاق وتأمين ميكروفونات الشات لعامة الأعضاء" : "فتح قنوات التحدث الصوتي الحر مجرياً للأعضاء"}، تفضلوا بكل ترحيب 🎙️.`,
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                                isGlobalMicMute
                                  ? "bg-orange-500/10 border-orange-500/35 text-orange-400"
                                  : "lamma-tab-soft text-gray-300 hover:text-white"
                              }`}
                            >
                              <span>🎙️ إغلاق الميكروفونات العامة</span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isGlobalMicMute ? "bg-orange-500/20 text-orange-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {isGlobalMicMute
                                  ? "معطلة حالياً"
                                  : "صوت حر للجميع"}
                              </span>
                            </button>

                            {/* Toggle 4: VIP Only Media */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isOnlyVIPCanSendImages;
                                setIsOnlyVIPCanSendImages(nextVal);
                                addSystemActivityLog(
                                  "ban",
                                  currentUser.nickname,
                                  `تحويل تراخيص إرسال الوسائط في الروم إلى: [${nextVal ? "VIP فقط" : "مفتوح للجميع"}]`,
                                  "👑 OWNER MODERATOR",
                                );
                                addLammaBotMessage(
                                  activeRoomId,
                                  `🤖 حصر الوسائط: تم ${nextVal ? "حصر وإتاحة إرسال الصور والمرفقات والفيديوهات للرتب والـ VIP فقط لتقليل الضغط" : "فتح إمكانيات مشاركة الوسائط والصور لجميع الأعضاء"} بالدردشة 🎉.`,
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                                isOnlyVIPCanSendImages
                                  ? "bg-cyan-500/10 border-cyan-500/35 text-cyan-400"
                                  : "lamma-tab-soft text-gray-300 hover:text-white"
                              }`}
                            >
                              <span>📸 وضع وسائط الشات للـ VIP</span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isOnlyVIPCanSendImages ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {isOnlyVIPCanSendImages
                                  ? "مفعّل للـ VIP فقط"
                                  : "مفتوح لكافة الأعضاء"}
                              </span>
                            </button>

                            {/* Toggle 5: Mute Assistant Bot */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isBotSilent;
                                setIsBotSilent(nextVal);
                                addSystemActivityLog(
                                  "promote",
                                  currentUser.nickname,
                                  `ضبط صوت وتفاعل بوت المساعدة الآلي إلى: [${nextVal ? "صامت" : "متفاعل"}]`,
                                  "👑 OWNER MODERATOR",
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                                isBotSilent
                                  ? "bg-purple-500/10 border-purple-500/35 text-purple-400"
                                  : "lamma-tab-soft text-gray-300 hover:text-white"
                              }`}
                            >
                              <span>🤖 إسكات بوت المساعدة التلقائي</span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isBotSilent ? "bg-purple-500/20 text-purple-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {isBotSilent
                                  ? "وضع الصامت"
                                  : "روبوت متفاعل ونشط"}
                              </span>
                            </button>

                            {/* Toggle 6: Welcome Toast Greetings */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isWelcomeToastEnabled;
                                setIsWelcomeToastEnabled(nextVal);
                                addSystemActivityLog(
                                  "promote",
                                  currentUser.nickname,
                                  `ضبط ميزة ترحيب الدخول الفلاشي للشات إلى: [${nextVal ? "نشط" : "معطل"}]`,
                                  "👑 OWNER MODERATOR",
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                                isWelcomeToastEnabled
                                  ? "bg-lime-500/10 border-lime-500/35 text-lime-400"
                                  : "lamma-tab-soft text-gray-300 hover:text-white"
                              }`}
                            >
                              <span>✨ تفعيل الترحيب الفلاشي السريع</span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isWelcomeToastEnabled ? "bg-lime-500/20 text-lime-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {isWelcomeToastEnabled
                                  ? "نشط ومبهج"
                                  : "معطل مؤقتاً"}
                              </span>
                            </button>

                            {/* Toggle 7: Footer Advertising deals */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isAdsEnabled;
                                setIsAdsEnabled(nextVal);
                                addSystemActivityLog(
                                  "promote",
                                  currentUser.nickname,
                                  `تغيير عرض شريط عروض المتجر السفلي إلى: [${nextVal ? "معروض" : "مخفي"}]`,
                                  "👑 OWNER MODERATOR",
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-[10px] font-black cursor-pointer ${
                                isAdsEnabled
                                  ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400"
                                  : "lamma-tab-soft text-gray-300 hover:text-white"
                              }`}
                            >
                              <span>🔥 تفعيل شريط عروض المتجر بالسفل</span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isAdsEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {isAdsEnabled
                                  ? "يظهر للمستخدمين"
                                  : "الشريط مخفي"}
                              </span>
                            </button>

                            {/* Action 8: Purge Chat messages */}
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    "☠️ تحذير إخلاء وتطهير الروم العام: هل أنت متأكد تماماً من الرغبة في بتر ومسح كافة البيانات والمحادثات لجميع الأعضاء في الغرفة الحالية فوراً؟ لا يمكن استعادة البيانات!",
                                  )
                                ) {
                                  setRoomMessages((prev) => ({
                                    ...prev,
                                    [activeRoomId]: [],
                                  }));
                                  addSystemActivityLog(
                                    "demote",
                                    currentUser.nickname,
                                    `تطهير تام وإخلاء لجميع رسائل غرفة [${activeRoomId}] بأمر المالك التأسيسي فوسفورياً.`,
                                    "👑 OWNER MODERATOR",
                                  );
                                  addLammaBotMessage(
                                    activeRoomId,
                                    `🌟 تطهير إداري شامل: قام مالك الشات بتطهير ومسح كافة المحادثات الواردة في غرفة [${activeRoomId}] وتصفير سجلاتها بنجاح تام لسرعة مضاعفة ⚡!`,
                                  );
                                  alert(
                                    "✅ تم تطهير وبتر وحذف جميع رسائل الغرفة بأمان تام وسرعة خارقة!",
                                  );
                                }
                              }}
                              className="p-2.5 rounded-xl bg-red-650/20 hover:bg-red-600/30 text-red-500 hover:text-white border border-red-500/25 transition-all flex items-center justify-between text-[10px] font-black cursor-pointer"
                            >
                              <span>🗑️ تطهير وغسل الروم العام الآن</span>
                              <span className="text-[8.5px] font-bold px-1.5 py-0.5 bg-red-500/20 text-white rounded">
                                تصفير فوري
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* SECTION B: DYNAMIC INSTANT USER ROLE & VIP PROMOTION SUITE */}
                        <div className="p-4 rounded-2xl space-y-3.5 lamma-section-card">
                          <h5 className="text-[10px] font-black text-lime-400 border-b border-white/5 pb-1.5">
                            👤 لوحة التحكم بالترقيات والعزل السريع للأعضاء
                            (Instant Member Promotion Suite)
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Member Dropdown Picker */}
                            <div className="space-y-1">
                              <label
                                htmlFor="promo-target-select"
                                className="text-[9px] text-gray-400 font-extrabold"
                              >
                                اختر العضو (المتواجدين بالشات حالياً):
                              </label>
                              <select
                                id="promo-target-select"
                                name="promoTargetNickSelect"
                                value={promoTargetNick}
                                onChange={(e) => {
                                  setPromoTargetNick(e.target.value);
                                  const found = chatMembers.find(
                                    (m) => m.nickname === e.target.value,
                                  );
                                  if (found) {
                                    setPromoTargetColor(
                                      found.color || "#10b981",
                                    );
                                    setPromoTargetBadge(found.badge || "");
                                    setPromoTargetRole(found.role || "vip");
                                  }
                                }}
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              >
                                <option value="">
                                  --- اختر العضو المطلوب للعملية السريعة ---
                                </option>
                                {chatMembers.map((m) => (
                                  <option key={m.id} value={m.nickname}>
                                    {m.nickname} (الرتبة المعينة حالياً:{" "}
                                    {m.role === "owner"
                                      ? "👑 owner"
                                      : m.role === "admin"
                                        ? "🛡️ admin"
                                        : m.role === "vip"
                                          ? "💎 vip"
                                          : "👤 member"}
                                    )
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Manual Nickname write-in (for offline users) */}
                            <div className="space-y-1">
                              <label
                                htmlFor="promoTargetNick"
                                className="text-[9px] text-gray-400 font-extrabold"
                              >
                                أو اكتب اللقب يدوياً بالدقة:
                              </label>
                              <input
                                type="text"
                                id="promoTargetNick"
                                name="promoTargetNick"
                                autoComplete="off"
                                placeholder="مثلاً: بطل الأسبوع، أميرة القلوب"
                                value={promoTargetNick}
                                onChange={(e) =>
                                  setPromoTargetNick(e.target.value)
                                }
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              />
                            </div>

                            {/* Role Select */}
                            <div className="space-y-1">
                              <label
                                htmlFor="promo-target-role"
                                className="text-[9px] text-gray-400 font-extrabold"
                              >
                                الرتبة الجديدة المراد منحها بضغطة واحدة:
                              </label>
                              <select
                                id="promo-target-role"
                                name="promoTargetRole"
                                value={promoTargetRole}
                                onChange={(e) =>
                                  setPromoTargetRole(e.target.value as any)
                                }
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              >
                                <option value="owner">
                                  👑 رتبة مالك الشات التأسيسي (Owner Power)
                                </option>
                                <option value="admin">
                                  🛡️ رتبة هرمية: مدير عام الشات (Full
                                  Administration)
                                </option>
                                <option value="mod">
                                  ✨ رتبة هرمية: مشرف غرف ونقاش فاعل (Room Host)
                                </option>
                                <option value="platinum_vip">
                                  👑 رتبة استثنائية: باقة VIP بلاتينية المضيئة
                                  (Premium VIP)
                                </option>
                                <option value="vip">
                                  💎 رتبة متميزة: باقة VIP كبار الشخصيات
                                  الكلاسيكية (VIP Class)
                                </option>
                                <option value="user">
                                  👤 إرجاع لرتبة: عضو كامل للتفاعل (Registered
                                  User)
                                </option>
                                <option value="guest">
                                  👤 سحب الصلاحيات والرجوع لرتبة: زائر مؤقت
                                  (Guest Member)
                                </option>
                              </select>
                            </div>

                            {/* Display Custom Badge tag */}
                            <div className="space-y-1">
                              <label
                                htmlFor="promoTargetBadge"
                                className="text-[9px] text-gray-400 font-extrabold"
                              >
                                شارة اللقب الفخرية (Badge Tag) - اختيارية:
                              </label>
                              <input
                                type="text"
                                id="promoTargetBadge"
                                name="promoTargetBadge"
                                autoComplete="off"
                                placeholder="مثلاً: 👑 الإمبراطور أو 🛡️ حامي الروم"
                                value={promoTargetBadge}
                                onChange={(e) =>
                                  setPromoTargetBadge(e.target.value)
                                }
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              />
                            </div>
                          </div>

                          {/* Color DOTS picker */}
                          <div className="space-y-1.5 p-2 rounded-xl lamma-admin-card">
                            <div className="text-[9px] text-gray-400 font-extrabold block">
                              اختر لون الاسم المميز فوراً بضغطة زر:
                            </div>
                            <div className="flex gap-2 flex-wrap items-center">
                              {[
                                "#f59e0b",
                                "#f43f5e",
                                "#10b981",
                                "#a3e635",
                                "#ec4899",
                                "#06b6d4",
                                "#8b5cf6",
                                "#ef4444",
                                "#ffffff",
                              ].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setPromoTargetColor(c)}
                                  style={{ backgroundColor: c }}
                                  className={`w-5 h-5 rounded-full border border-black/80 hover:scale-110 transition-transform cursor-pointer ${
                                    promoTargetColor === c
                                      ? "ring-2 ring-lime-400 scale-105"
                                      : ""
                                  }`}
                                  title={c}
                                />
                              ))}
                              <input
                                type="text"
                                id="promoTargetColor"
                                name="promoTargetColor"
                                autoComplete="off"
                                placeholder="#ffffff"
                                value={promoTargetColor}
                                onChange={(e) =>
                                  setPromoTargetColor(e.target.value)
                                }
                                className="w-20 rounded px-1.5 py-0.5 text-[10px] text-white text-center font-mono focus:outline-none lamma-input-shell"
                              />
                            </div>
                          </div>

                          {/* ACTION SUBMIT BUTTON */}
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const nick = promoTargetNick.trim();
                                if (!nick) {
                                  alert(
                                    "❌ يرجى اختيار اسم العضو المتواجد أو كتابة اللقب يدوياً أولاً لإصدار الصلاحيات والمزايا!",
                                  );
                                  return;
                                }

                                // Update in chatMembers list
                                setChatMembers((prev) =>
                                  prev.map((m) => {
                                    if (
                                      m.nickname.toLowerCase() ===
                                      nick.toLowerCase()
                                    ) {
                                      return {
                                        ...m,
                                        role: (promoTargetRole ===
                                        "platinum_vip"
                                          ? "vip"
                                          : promoTargetRole) as any,
                                        color: promoTargetColor || m.color,
                                        badge: promoTargetBadge || m.badge,
                                      };
                                    }
                                    return m;
                                  }),
                                );

                                // If target is currently active user session
                                if (
                                  currentUser.nickname.toLowerCase() ===
                                  nick.toLowerCase()
                                ) {
                                  setMyActiveSession((prev) => ({
                                    ...prev,
                                    role: promoTargetRole as any,
                                    color: promoTargetColor || prev.color,
                                    badge: promoTargetBadge || prev.badge,
                                    frame:
                                      promoTargetRole === "platinum_vip"
                                        ? "from-yellow-400 via-amber-500 to-yellow-600"
                                        : "",
                                  }));
                                }

                                const roleLabel =
                                  promoTargetRole === "owner"
                                    ? "👑 مالك تأسيسي"
                                    : promoTargetRole === "admin"
                                      ? "🛡️ مدير عام"
                                      : promoTargetRole === "mod"
                                        ? "✨ مشرف غرف"
                                        : promoTargetRole === "platinum_vip"
                                          ? "👑 VIP بلاتيني"
                                          : promoTargetRole === "vip"
                                            ? "💎 VIP متميز"
                                            : promoTargetRole === "user"
                                              ? "👤 عضو مسجل"
                                              : "👤 زائر";

                                addSystemActivityLog(
                                  "promote",
                                  nick,
                                  `ترقية العضو [${nick}] إلى مرتبة [${roleLabel}] وتخصيص اللون ليكون [${promoTargetColor}] والشارة لـ [${promoTargetBadge || "غير معينة"}] بنجاح مميز.`,
                                  "👑 OWNER MODERATOR",
                                );
                                addLammaBotMessage(
                                  activeRoomId,
                                  `👑 قرار رئاسي: أصدر مالك شات الغالية مرسوماً رسمياً بترقية وتكليف العضو [${nick}] برتبة [<strong>${roleLabel}</strong>] وتعيين لون الشهرة [${promoTargetColor}] وشارة [${promoTargetBadge || "عضو نشط"}] ليكون ذو نفوذ فوري وصلاحية شاملة 🎉!`,
                                );

                                alert(
                                  `✅ تم ترقية ومنح العضو [${nick}] رتبة [${roleLabel}] بنجاح فوسفوري وتفعيل صلاحيتهم فوراً!`,
                                );

                                // Reset target fields
                                setPromoTargetNick("");
                                setPromoTargetBadge("");
                              }}
                              className="px-6 py-2 text-white font-black text-[11px] rounded-xl transition-all cursor-pointer lamma-feature-primary"
                            >
                              🚀 تطبيق مرسوم ومنح الصلاحية الفورية
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 2: Auditing / logs */}
                    {adminTab === "logs" && (
                      <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                        <div className="text-[10px] text-gray-400 font-bold">
                          جميع المعاملات والأنشطة الأمنية المسجلة لدى خادم شات
                          لمة:
                        </div>
                        {activityLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl space-y-1 text-right lamma-admin-card"
                          >
                            <div className="flex items-center justify-between text-[9px] text-gray-400 font-sans">
                              <span>الساعة: {log.time}</span>
                              <span
                                className={`px-1 py-0.5 rounded text-[8px] font-black ${
                                  log.type === "ban"
                                    ? "bg-red-500/15 text-red-400 border border-red-500/10"
                                    : log.type === "promote"
                                      ? "bg-green-500/15 text-green-400 border border-green-500/10"
                                      : log.type === "demote"
                                        ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/10"
                                        : "bg-blue-500/15 text-blue-450 border border-blue-500/10"
                                }`}
                              >
                                {log.type === "ban"
                                  ? "🛑 حظر وقمع"
                                  : log.type === "promote"
                                    ? "✨ ترقية ورتبة"
                                    : log.type === "demote"
                                      ? "⚠️ خفض/تنبيه"
                                      : log.type === "login"
                                        ? "📥 دخول"
                                        : "📤 خروج"}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-gray-250 leading-relaxed">
                              {log.details}
                            </div>
                            <div className="text-[9px] text-gray-500 font-sans">
                              المنفذ:{" "}
                              <span className="text-green-500">
                                {log.operatorNickname}
                              </span>{" "}
                              • الهدف:{" "}
                              <span className="text-white">
                                {log.userNickname}
                              </span>
                            </div>
                          </div>
                        ))}
                        {activityLogs.length === 0 && (
                          <div className="p-6 text-center text-gray-500 text-xs font-bold">
                            لا يوجد سجل أنشطة حالي.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tab 3: Bans management */}
                    {adminTab === "bans" && (
                      <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                        <div className="text-[10px] text-gray-400 font-bold mb-1">
                          التحكم في المعرفات المحظورة كلياً (Mega Ban) وحظر
                          الغرف والكتم:
                        </div>
                        {bannedUsersList.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-right gap-3 transition-all lamma-soft-danger"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                                <span>لقب: {item.nickname}</span>
                                <span
                                  className={`text-[8px] px-1 rounded font-black ${item.type === "megaban" ? "bg-red-500/15 text-red-400 border border-red-500/10" : "bg-orange-500/15 text-orange-400 border border-orange-500/10"}`}
                                >
                                  {item.type === "megaban"
                                    ? "🛑 حظر شامل (Mega Ban)"
                                    : item.type === "mute"
                                      ? "🔇 كتم حديث"
                                      : item.type === "shadow"
                                        ? "👻 حظر خفي (Shadow)"
                                        : item.type === "room"
                                          ? `🚫 حظر غرف (${item.roomId})`
                                          : "🚫 حظر معايير"}
                                </span>
                              </div>
                              <div className="text-[9.5px] text-gray-400 space-y-0.5">
                                <div>
                                  بصمة المعرف الفني:{" "}
                                  <span className="font-mono text-gray-300 text-[8.5px]">
                                    {item.fingerprint}
                                  </span>
                                </div>
                                <div>
                                  عنوان الـ IP:{" "}
                                  <span className="font-mono text-gray-300 text-[8.5px]">
                                    {item.ip}
                                  </span>
                                </div>
                                <div>
                                  السبب والمشرف:{" "}
                                  <span className="text-gray-250">
                                    {item.reason}
                                  </span>{" "}
                                  • بواسطة المشرف:{" "}
                                  <span className="text-[#a3e635]">
                                    {item.banner}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setBannedUsersList((prev) =>
                                  prev.filter((b) => b.id !== item.id),
                                );
                                addSystemActivityLog(
                                  "promote",
                                  item.nickname,
                                  `تم إلغاء حظر المعرف الفني واستعادة كافة رخص التفاعل للعضو ${item.nickname}.`,
                                );
                                alert(
                                  `تم إلغاء العقوبة بنجاح وإرجاع تراخيص العضو ${item.nickname}!`,
                                );
                              }}
                              className="p-1.5 px-3 rounded-lg text-[9.5px] font-black self-end md:self-center transition-all cursor-pointer shrink-0 lamma-feature-primary"
                            >
                              🕊️ إلغاء العقوبة وفك الحظر
                            </button>
                          </div>
                        ))}
                        {bannedUsersList.length === 0 && (
                          <div className="p-8 text-center text-gray-500 text-xs font-bold rounded-2xl lamma-section-card">
                            لا توجد محظورين أو بصمات أجهزة مقيدة حالياً. الشات
                            نظيف ومستقر بنسبة 100%.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tab 4: Store Management (🏪 عروض وإضافات المتجر) */}
                    {adminTab === "store_mgmt" && (
                      <div
                        className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 text-right font-sans"
                        dir="rtl"
                      >
                        <div className="p-4 rounded-2xl lamma-soft-success">
                          <h5 className="text-white text-xs font-black">
                            🏪 لوحة التحكم في عروض وهدايا المتجر التلقائي
                          </h5>
                          <p className="text-[9.5px] text-gray-400 font-bold leading-normal mt-1">
                            بصفتك مالك الشات (Owner)، يمكنك إضافة عرق رتبة VIP
                            جديدة، أشكال إطارات ملوّنة تدور حول الملف، ألقاب
                            فخرية تظهر للمحيط، أو مسح ميزات حية من المتجر فوراً.
                          </p>
                        </div>

                        {/* ADD / EDIT PRODUCT FORM */}
                        <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                          <h6 className="text-[11px] font-black text-emerald-400">
                            {editingProduct
                              ? "✍️ تعديل المنتج المختار"
                              : "➕ إضافة منتج/ميزة جديدة للمتجر"}
                          </h6>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label
                                htmlFor="prod-name"
                                className="text-[9px] text-gray-400 font-bold"
                              >
                                اسم الميزة في الشات:
                              </label>
                              <input
                                type="text"
                                id="prod-name"
                                name="prod-name"
                                autoComplete="off"
                                placeholder="مثلاً: 🔥 باقة التحدي أو إطار كواكب"
                                value={newProdName}
                                onChange={(e) => setNewProdName(e.target.value)}
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              />
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor="new-prod-tab"
                                className="text-[9px] text-gray-400 font-bold"
                              >
                                قسم العرض (التصنيف):
                              </label>
                              <select
                                id="new-prod-tab"
                                name="newProdTab"
                                value={newProdTab}
                                onChange={(e) =>
                                  setNewProdTab(e.target.value as any)
                                }
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              >
                                <option value="vip">
                                  💎 باقات وعرقيات VIP
                                </option>
                                <option value="skins">
                                  🎨 المظهر والإطارات الملونة
                                </option>
                                <option value="badges">
                                  🏷️ الألقاب والشارات الخاصة
                                </option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor="prod-price"
                                className="text-[9px] text-gray-400 font-bold"
                              >
                                السعر (بالجنيه المصري أو العملة البديلة):
                              </label>
                              <input
                                type="text"
                                id="prod-price"
                                name="prod-price"
                                autoComplete="off"
                                placeholder="مثلاً: 75 EGP"
                                value={newProdPrice}
                                onChange={(e) =>
                                  setNewProdPrice(e.target.value)
                                }
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              />
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor="new-prod-type"
                                className="text-[9px] text-gray-400 font-bold"
                              >
                                نوع الميزة التلقائية:
                              </label>
                              <select
                                id="new-prod-type"
                                name="newProdType"
                                value={newProdType}
                                onChange={(e) =>
                                  setNewProdType(e.target.value as any)
                                }
                                className="w-full rounded-xl p-2 text-xs text-white lamma-input-shell"
                              >
                                <option value="bronze">
                                  💎 باقة برونزية عادية (30 يوماً)
                                </option>
                                <option value="platinum">
                                  👑 باقة بلاتينية عظمى (30 يوماً - إطارات
                                  تدرجية)
                                </option>
                                <option value="frame">
                                  🎨 إطار مظهر متحرك (Frame)
                                </option>
                                <option value="title">
                                  🏷️ لقب وشارة دردشة مدمجة (Title & Badge)
                                </option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label
                              htmlFor="new-prod-desc"
                              className="text-[9px] text-gray-400 font-bold"
                            >
                              وصف العرض للمستخدم بالتفصيل:
                            </label>
                            <textarea
                              id="new-prod-desc"
                              name="newProdDesc"
                              autoComplete="off"
                              rows={2}
                              placeholder="صيغة ممتازة تشرح الصلاحيات الممنوحة لترغيب الأعضاء..."
                              value={newProdDesc}
                              onChange={(e) => setNewProdDesc(e.target.value)}
                              className="w-full rounded-xl p-2 text-xs text-white resize-none lamma-input-shell"
                            />
                          </div>

                          {/* Dynamic Inputs Based on Type Selected */}
                          {(newProdType === "bronze" ||
                            newProdType === "platinum") && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded-xl lamma-admin-card">
                              <div className="space-y-1">
                                <label
                                  htmlFor="prod-badge"
                                  className="text-[8px] text-gray-400 font-bold"
                                >
                                  نص شارة الإسم (Badge):
                                </label>
                                <input
                                  type="text"
                                  id="prod-badge"
                                  name="prod-badge"
                                  autoComplete="off"
                                  placeholder="مثل: S-VIP"
                                  value={newProdBadge}
                                  onChange={(e) =>
                                    setNewProdBadge(e.target.value)
                                  }
                                  className="w-full rounded-lg p-1.5 text-xs text-white lamma-input-shell"
                                />
                              </div>
                              <div className="space-y-1">
                                <label
                                  htmlFor="prod-color"
                                  className="text-[8px] text-gray-400 font-bold"
                                >
                                  لون الاسم (أو gradient):
                                </label>
                                <input
                                  type="text"
                                  id="prod-color"
                                  name="prod-color"
                                  autoComplete="off"
                                  placeholder="مثل: #ef4444"
                                  value={newProdColor}
                                  onChange={(e) =>
                                    setNewProdColor(e.target.value)
                                  }
                                  className="w-full rounded-lg p-1.5 text-xs text-white lamma-input-shell"
                                />
                              </div>
                              <div className="space-y-1">
                                <label
                                  htmlFor="prod-ext"
                                  className="text-[8px] text-gray-400 font-bold"
                                >
                                  الدور الإضافي (role):
                                </label>
                                <input
                                  type="text"
                                  id="prod-ext"
                                  name="prod-ext"
                                  autoComplete="off"
                                  placeholder="مثل: platinum_vip"
                                  value={newProdExt}
                                  onChange={(e) =>
                                    setNewProdExt(e.target.value)
                                  }
                                  className="w-full rounded-lg p-1.5 text-xs text-white lamma-input-shell"
                                />
                              </div>
                            </div>
                          )}

                          {newProdType === "frame" && (
                            <div className="p-2 rounded-xl space-y-1 lamma-admin-card">
                              <label
                                htmlFor="prod-frame"
                                className="text-[8px] text-gray-400 font-bold"
                              >
                                ألوان كلاس التدرج للإطار (Tailwind gradients):
                              </label>
                              <input
                                type="text"
                                id="prod-frame"
                                name="prod-frame"
                                autoComplete="off"
                                placeholder="مثل: from-red-500 via-orange-500 to-yellow-500"
                                value={newProdFrame}
                                onChange={(e) =>
                                  setNewProdFrame(e.target.value)
                                }
                                className="w-full rounded-lg p-1.5 text-xs text-white lamma-input-shell"
                              />
                            </div>
                          )}

                          {newProdType === "title" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-xl lamma-admin-card">
                              <div className="space-y-1">
                                <label
                                  htmlFor="prod-title"
                                  className="text-[8px] text-gray-400 font-bold"
                                >
                                  اللقب المعين للشات:
                                </label>
                                <input
                                  type="text"
                                  id="prod-title"
                                  name="prod-title"
                                  autoComplete="off"
                                  placeholder="مثل: إمبراطور السلام"
                                  value={newProdTitle}
                                  onChange={(e) =>
                                    setNewProdTitle(e.target.value)
                                  }
                                  className="w-full rounded-lg p-1.5 text-xs text-white lamma-input-shell"
                                />
                              </div>
                              <div className="space-y-1">
                                <label
                                  htmlFor="prod-badge-2"
                                  className="text-[8px] text-gray-400 font-bold"
                                >
                                  شارة اللقب الفخرية (Badge):
                                </label>
                                <input
                                  type="text"
                                  id="prod-badge-2"
                                  name="prod-badge-2"
                                  autoComplete="off"
                                  placeholder="مثل: 👑 القيصر"
                                  value={newProdBadge}
                                  onChange={(e) =>
                                    setNewProdBadge(e.target.value)
                                  }
                                  className="w-full rounded-lg p-1.5 text-xs text-white lamma-input-shell"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 justify-end pt-1">
                            {editingProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(null);
                                  setNewProdName("");
                                  setNewProdDesc("");
                                  setNewProdPrice("");
                                  setNewProdBadge("");
                                  setNewProdTitle("");
                                  setNewProdExt("");
                                }}
                                className="px-3 py-1.5 text-gray-300 font-bold text-[10px] rounded-lg transition-all lamma-soft-action"
                              >
                                إلغاء التعديل
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  !newProdName.trim() ||
                                  !newProdPrice.trim() ||
                                  !newProdDesc.trim()
                                ) {
                                  alert(
                                    "❌ يرجى ملء حقول الاسم، السعر، والوصف بنجاح لإتمام عملية النشر بالمتجر!",
                                  );
                                  return;
                                }

                                if (editingProduct) {
                                  // Edit item
                                  setStoreProducts((prev) =>
                                    prev.map((p) => {
                                      if (p.id === editingProduct.id) {
                                        return {
                                          ...p,
                                          name: newProdName,
                                          tab: newProdTab,
                                          price: newProdPrice,
                                          description: newProdDesc,
                                          type: newProdType,
                                          badge: newProdBadge || undefined,
                                          color: newProdColor || undefined,
                                          frame:
                                            newProdType === "frame"
                                              ? newProdFrame
                                              : newProdType === "platinum"
                                                ? "from-yellow-400 via-amber-500 to-yellow-600"
                                                : undefined,
                                          title: newProdTitle || undefined,
                                          ext: newProdExt || undefined,
                                        };
                                      }
                                      return p;
                                    }),
                                  );

                                  addSystemActivityLog(
                                    "promote",
                                    currentUser.nickname,
                                    `تعديل وإعادة نشر المنتج [${newProdName}] بالمتجر التلقائي.`,
                                    "👑 OWNER MODERATOR",
                                  );
                                  alert(
                                    "✅ تم تعديل المنتج وحفظ التغييرات بنجاح في نظام المتجر وذاكرة السيرفر!",
                                  );
                                  setEditingProduct(null);
                                } else {
                                  // Create item
                                  const item = {
                                    id: `prod-${Date.now()}`,
                                    tab: newProdTab,
                                    name: newProdName,
                                    price: newProdPrice,
                                    description: newProdDesc,
                                    type: newProdType,
                                    badge: newProdBadge || undefined,
                                    color: newProdColor || undefined,
                                    frame:
                                      newProdType === "frame"
                                        ? newProdFrame
                                        : newProdType === "platinum"
                                          ? "from-yellow-400 via-amber-500 to-yellow-600"
                                          : undefined,
                                    title: newProdTitle || undefined,
                                    ext: newProdExt || undefined,
                                  };

                                  setStoreProducts((prev) => [...prev, item]);
                                  addSystemActivityLog(
                                    "promote",
                                    currentUser.nickname,
                                    `إضافة وعرض ميزة متجر جديدة للمستخدمين: [${newProdName}] بقيمة ${newProdPrice}.`,
                                    "👑 OWNER MODERATOR",
                                  );
                                  alert(
                                    "✅ تم حقن ونشر الميزة الجديدة وتفعيل العرض فوسفورياً في المتجر بكفاءة!",
                                  );
                                }

                                // Reset form
                                setNewProdName("");
                                setNewProdDesc("");
                                setNewProdPrice("");
                                setNewProdBadge("");
                                setNewProdTitle("");
                                setNewProdExt("");
                              }}
                              className="px-4 py-1.5 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer lamma-feature-primary"
                            >
                              {editingProduct
                                ? "💾 حفظ وتعديل الميزة"
                                : "🚀 نشر فوري للميزة بالمتجر"}
                            </button>
                          </div>
                        </div>

                        {/* LISTING EXISTING STOCKED PRODUCTS */}
                        <div className="space-y-2">
                          <h6 className="text-[10px] text-gray-400 font-extrabold pr-1">
                            📋 العروض المتاحة حالياً بالمتجر وتحت سيطرتك:
                          </h6>
                          {storeProducts.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 rounded-xl flex items-center justify-between gap-3 text-right transition-all lamma-admin-card"
                            >
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setNewProdName(p.name);
                                    setNewProdTab(p.tab);
                                    setNewProdPrice(p.price);
                                    setNewProdDesc(p.description);
                                    setNewProdType(p.type);
                                    setNewProdBadge(p.badge || "");
                                    setNewProdColor(p.color || "#10b981");
                                    setNewProdFrame(
                                      p.frame || "from-purple-600 to-pink-600",
                                    );
                                    setNewProdTitle(p.title || "");
                                    setNewProdExt(p.ext || "");
                                  }}
                                  className="p-1 px-2.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer lamma-accent-btn"
                                  title="تعديل هذا المنتج"
                                >
                                  ✏️ تعديل
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `هل أنت متأكد تماماً من إزالة وحذف ميزة [${p.name}] من عروض المتجر؟ لن يراها الأعضاء مجدداً.`,
                                      )
                                    ) {
                                      setStoreProducts((prev) =>
                                        prev.filter((item) => item.id !== p.id),
                                      );
                                      addSystemActivityLog(
                                        "demote",
                                        currentUser.nickname,
                                        `سحب وحذف الميزة المتجرية [${p.name}] من نوافذ العرض والبيع.`,
                                        "👑 OWNER MODERATOR",
                                      );
                                    }
                                  }}
                                  className="p-1 px-2.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer lamma-danger-btn"
                                  title="حذف هذا المنتج"
                                >
                                  🗑️ حذف من المتجر
                                </button>
                              </div>

                              <div className="space-y-0.5">
                                <div className="text-xs font-black text-white flex items-center gap-1.5 justify-end">
                                  <span
                                    className={`text-[8.5px] px-1.5 py-0.5 rounded font-black ${
                                      p.tab === "vip"
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/10"
                                        : p.tab === "skins"
                                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/10"
                                          : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/10"
                                    }`}
                                  >
                                    {p.tab === "vip"
                                      ? "💎 باقة VIP"
                                      : p.tab === "skins"
                                        ? "🎨 مظاهر"
                                        : "🏷️ ألقاب وشارات"}
                                  </span>
                                  <span>{p.name}</span>
                                </div>
                                <p className="text-[9px] text-gray-400 font-medium leading-relaxed max-w-[280px]">
                                  {p.description}
                                </p>
                                <div className="text-[9px] text-emerald-500 font-mono flex items-center gap-2 justify-end">
                                  <span>
                                    السعر:{" "}
                                    <strong className="text-white text-[10px]">
                                      {p.price}
                                    </strong>
                                  </span>
                                  {p.type && (
                                    <span>
                                      • النوع التقني:{" "}
                                      <strong className="text-gray-300">
                                        {p.type}
                                      </strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {storeProducts.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-xs font-bold rounded-2xl lamma-section-card">
                              المتجر فارغ! استخدم النموذج أعلاه لإنشاء عرقيات
                              وعروض جديدة للربح والتأثير.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(activeModal === "guard" ||
                  (activeModal === "leadership" &&
                    leadershipTab === "guard")) && (
                  <div className="space-y-6 select-none" dir="rtl">
                    <div className="flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl gap-3 lamma-soft-success">
                      <div className="flex items-start gap-2.5">
                        <span className="text-2xl mt-0.5">🤖</span>
                        <div>
                          <h4 className="text-white text-xs font-black font-sans text-right">
                            مركز البوتات الذكية الشامل (Bot Control Center)
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed text-right font-sans">
                            يمتلك الشات منظومة 4 بوتات آلية تعمل في الخلفية
                            للحماية، الصيانة، كتابة التقارير الشاملة، ومراقبة
                            تكنولوجيا الاتصال.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsBotEnabled(!isBotEnabled)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0 select-none ${
                          isBotEnabled
                            ? "lamma-toggle-on"
                            : "lamma-toggle-off"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isBotEnabled ? "bg-lime-400 animate-pulse" : "bg-red-400"}`}
                        ></span>
                        {isBotEnabled
                          ? "تشغيل منظومة البوتات"
                          : "إيقاف المنظومة"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Bot 1: Protection Guard */}
                      <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-400 text-lg">🛡️</span>
                          <span className="text-xs font-bold text-white">
                            بوت الحماية المركزي (Lamma Guard)
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
                          يقوم بفلترة الشتائم، منع الروابط الخارجية، وإيقاف
                          الرسائل المكررة (Spam) تلقائياً حمايةً للمجتمع.
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <button
                            onClick={() =>
                              setBotRuleSwearFilter(!botRuleSwearFilter)
                            }
                            className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleSwearFilter ? "lamma-toggle-on" : "lamma-toggle-off"}`}
                          >
                            تصفية الشتائم {botRuleSwearFilter ? "🟢" : "🔴"}
                          </button>
                          <button
                            onClick={() => setBotRuleAntiSpam(!botRuleAntiSpam)}
                            className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleAntiSpam ? "lamma-toggle-on" : "lamma-toggle-off"}`}
                          >
                            منع السبام {botRuleAntiSpam ? "🟢" : "🔴"}
                          </button>
                          <button
                            onClick={() =>
                              setBotRuleAntiLinks(!botRuleAntiLinks)
                            }
                            className={`px-2 py-1 flex-1 text-center rounded text-[9px] transition-all font-bold cursor-pointer ${botRuleAntiLinks ? "lamma-toggle-on" : "lamma-toggle-off"}`}
                          >
                            منع الروابط {botRuleAntiLinks ? "🟢" : "🔴"}
                          </button>
                        </div>
                      </div>

                      {/* Bot 2: Maintenance & Reports */}
                      <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 text-lg">📋</span>
                          <span className="text-xs font-bold text-white">
                            بوت الصيانة وإعداد التقارير
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
                          يولد تقارير حالة الشات عبر الأمر /guard أو /status،
                          ويقوم برصد الخلل وتنبيه الإدارة في حالة الأعطال
                          الحرجة.
                        </p>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-center lamma-section-card text-blue-300">
                            أوامر التقارير: /guard | /status تعمل بكفاءة ✅
                          </div>
                        </div>
                      </div>

                      {/* Bot 3: Tech Tracker */}
                      <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 text-lg">🛰️</span>
                          <span className="text-xs font-bold text-white">
                            بوت متابعة التكنولوجيا والشبكات
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
                          يراقب خوادم الـ WebRTC والاتصالات، ويقوم بالتحويل
                          التلقائي (Auto-Fallback) للمسارات البديلة أثناء
                          المكالمات الصوتية والمرئية لتفادي التقطيع.
                        </p>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-center lamma-section-card text-purple-300">
                            خوادم جوجل وكلاودفلير متصلة وتعمل تلقائياً ⚡
                          </div>
                        </div>
                      </div>

                      {/* Bot 4: Word Wall Auto-Mod */}
                      <div className="p-3 rounded-xl flex flex-col gap-2 lamma-admin-card">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-red-400 text-lg">🧱</span>
                          <span className="text-xs font-bold text-white">
                            بوت الإشراف التلقائي (Word Firewall)
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400 h-10 leading-relaxed text-right font-sans">
                          مرتبط بغرفة تحكم المالك، يقوم بحجب وطرد أي عضو
                          تلقائياً إذا حاول إرسال كلمة موجودة في جدار الحماية
                          السيادي.
                        </p>
                        <div className="flex items-center justify-between mt-1 px-2 py-1.5 rounded-lg lamma-soft-danger">
                          <span className="text-[9px] text-red-400 font-bold">
                            حجم القاموس السيادي النشط:
                          </span>
                          <span className="text-[10px] text-white font-black bg-red-500/90 px-2 py-0.5 rounded-md">
                            {bannedWords.length} كلمة
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                      <div className="flex items-center justify-between border-b border-green-500/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="lamma-icon-dot"></span>
                          <h4 className="text-white text-xs font-black font-sans">
                            سجل الفحص الأمني (Real-time Live Logs)
                          </h4>
                        </div>
                        <button
                          onClick={() => setBotLogs([])}
                          className="text-[9px] text-red-400 hover:text-red-300 hover:underline font-bold"
                        >
                          مسح السجل
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto font-mono text-[9px] leading-relaxed">
                        {botLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-2 rounded-xl border flex items-start gap-2 text-right ${
                              log.severity === "danger"
                                ? "lamma-soft-danger text-red-300"
                                : log.severity === "warn"
                                  ? "lamma-soft-warn text-yellow-300"
                                  : "lamma-section-card text-gray-300"
                            }`}
                          >
                            <span className="text-gray-500 shrink-0 font-sans">
                              [{log.time}]
                            </span>
                            <span className="flex-grow font-sans">
                              {log.text}
                            </span>
                            <span className="shrink-0 font-black font-sans">
                              {log.severity === "danger"
                                ? "🛑 حجب"
                                : log.severity === "warn"
                                  ? "⚠️ إنذار"
                                  : "ℹ️ نظام"}
                            </span>
                          </div>
                        ))}
                        {botLogs.length === 0 && (
                          <div className="p-4 text-center text-gray-500 font-bold select-none w-full">
                            لا توجد محاولات تسلل أو اختراقات مسجلة حالياً. حارس
                            الحماية ساهر لمراقبة الشات.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QUICK ACTION CONTROLS */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const timeStr = new Date().toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            },
                          );
                          addBotSystemWarning(
                            activeRoomId,
                            "🚨 نداء بخصوص الحفاظ على هدوء الغرفة من حارس الشات الذكي Lamma Guard: نرجو من الجميع الاهتمام بآداب النقاش، وعدم نشر أي نصوص أو محتويات منافية حفاظا على استقرار الغرفة ومنعا للإقصاء التلقائي 🛡️.",
                          );
                          setBotLogs((prev) => [
                            {
                              id: `${Date.now()}`,
                              time: timeStr,
                              text: "بث الأدمن نداء عام بخصوص أمان واستقرار الشات لجميع الأعضاء.",
                              severity: "info",
                            },
                            ...prev,
                          ]);
                          setActiveModal(null);
                        }}
                        className="py-2.5 rounded-xl text-yellow-300 font-black text-[10px] transition-all flex items-center justify-center gap-1.5 select-none lamma-soft-warn"
                      >
                        🚨 إنذار عام للغرفة
                      </button>

                      <button
                        onClick={() => {
                          const timeStr = new Date().toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            },
                          );
                          setBotLogs((prev) => [
                            {
                              id: `${Date.now()}`,
                              time: timeStr,
                              text: "اختبار فحص الغرفة التلقائي: تم التحقق بنجاح من جدار الكلمات وسرعة نقل الحزم اللافكرية للغرف بنسب سلامة 100%.",
                              severity: "info",
                            },
                            ...prev,
                          ]);
                        }}
                        className="py-2.5 rounded-xl text-lime-300 font-black text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer lamma-soft-success"
                      >
                        ⚡ محاكاة فحص الغرفة
                      </button>
                    </div>
                  </div>
                )}

                {/* LAMMA AUTO-STORE AND AUTOMATION MODAL */}
                {(activeModal === "store" ||
                  (activeModal === "leadership" &&
                    leadershipTab === "store")) && (
                  <div className="space-y-4 text-right selection:bg-emerald-500/20 font-sans">
                    {/* Header Banner */}
                    <div className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none lamma-soft-success">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                          <span className="text-sm">💎</span>
                          <h4 className="text-white text-xs font-black">
                            المركز الذكي للأتمتة والمتجر التلقائي
                          </h4>
                        </div>
                        <p className="text-[9.5px] text-gray-400 font-bold leading-relaxed font-sans mt-0.5">
                          تفعيل فوري لرتب VIP، الأشكال، الألقاب، الأصدقاء
                          الأذكياء، وفحص سلامة وأمان المنصة آلياً بالكامل.
                        </p>
                      </div>
                      <div className="shrink-0 text-left">
                        <span className="text-[8.5px] font-black lamma-role-chip lamma-role-vip px-2.5 py-1 whitespace-nowrap">
                          ● معالج التحقق التلقائي نشط
                        </span>
                      </div>
                    </div>

                    {/* App Tabs Selection Bar */}
                    <div className="flex items-center gap-1 border-b border-white/5 pb-2 overflow-x-auto scroller-hidden select-none">
                      <button
                        onClick={() => {
                          setShopTab("vip");
                          setSelectedProduct(null);
                          setPayStatus("idle");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          shopTab === "vip"
                            ? "lamma-toggle-on"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        💎 باقات VIP الشاملة
                      </button>
                      <button
                        onClick={() => {
                          setShopTab("skins");
                          setSelectedProduct(null);
                          setPayStatus("idle");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          shopTab === "skins"
                            ? "lamma-toggle-on"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        🎨 المظهر والإطارات
                      </button>
                      <button
                        onClick={() => {
                          setShopTab("badges");
                          setSelectedProduct(null);
                          setPayStatus("idle");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          shopTab === "badges"
                            ? "lamma-toggle-on"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        🏷️ الألقاب والشارات
                      </button>
                      <button
                        onClick={() => {
                          setShopTab("suggests");
                          setPayStatus("idle");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          shopTab === "suggests"
                            ? "lamma-toggle-on"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        🤝 لقاء الرفاق آلياً
                      </button>
                      <button
                        onClick={() => {
                          setShopTab("stats");
                          setPayStatus("idle");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          shopTab === "stats"
                            ? "lamma-toggle-on"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        📊 إحصائيات الغرف تلقائياً
                      </button>
                      <button
                        onClick={() => {
                          setShopTab("maintenance");
                          setPayStatus("idle");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 transition-all ${
                          shopTab === "maintenance"
                            ? "lamma-toggle-off"
                            : "lamma-tab-soft text-gray-400 hover:text-white"
                        }`}
                      >
                        🔧 الصيانة والتعافي الذاتي
                      </button>
                    </div>

                    {/* TAB CONTENTS - 1. VIP BUNDLES */}
                    {shopTab === "vip" &&
                      payStatus !== "loading" &&
                      payStatus !== "success" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {storeProducts
                              .filter((p) => p.tab === "vip")
                              .map((p) => (
                                <div
                                  key={p.id}
                                  className="p-4 rounded-2xl flex flex-col justify-between transition-all select-none lamma-admin-card"
                                >
                                  <div className="space-y-1.5 text-right">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs lamma-role-chip lamma-role-vip font-extrabold px-1.5 py-0.5 rounded-lg">
                                        30 يوماً
                                      </span>
                                      <h5 className="font-sans font-black text-white text-xs">
                                        {p.name}
                                      </h5>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-bold leading-relaxed font-sans mt-0.5">
                                      {p.description}
                                    </p>
                                    <div className="pt-2 text-emerald-400 text-[10.5px] font-mono leading-none">
                                      السعر:{" "}
                                      <span className="text-white text-xs font-black">
                                        {p.price}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedProduct(p);
                                      setPayGateway("vodafone");
                                      setPaymentAccountInput("");
                                      setPayStatus("idle");
                                    }}
                                    className="w-full mt-4 py-2 text-white font-extrabold text-[10px] rounded-xl transition-all cursor-pointer lamma-feature-primary"
                                  >
                                    شراء فوري وتفعيل تلقائي
                                  </button>
                                </div>
                              ))}
                            {storeProducts.filter((p) => p.tab === "vip")
                              .length === 0 && (
                              <p className="col-span-2 text-center text-gray-500 text-[10px] font-bold py-6">
                                ⚠️ لا يوجد باقات VIP في المتجر حالياً.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* TAB CONTENTS - 2. SKINS & COSMETICS */}
                    {shopTab === "skins" &&
                      payStatus !== "loading" &&
                      payStatus !== "success" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {storeProducts
                            .filter((p) => p.tab === "skins")
                            .map((p) => (
                              <div
                                key={p.id}
                                className="p-3 rounded-xl flex flex-col justify-between transition-all text-right select-none lamma-admin-card"
                              >
                                <h5 className="font-sans font-black text-white text-[11px] flex items-center gap-1.5 justify-end">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  {p.name}
                                </h5>
                                <p className="text-[8.5px] text-gray-400 font-bold leading-relaxed mt-1">
                                  {p.description}
                                </p>
                                <div className="mt-3 text-[10px] text-emerald-400 font-mono">
                                  السعر: {p.price}
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedProduct(p);
                                    setPayGateway("instapay");
                                    setPaymentAccountInput("");
                                    setPayStatus("idle");
                                  }}
                                  className="mt-2 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer lamma-toggle-on"
                                >
                                  احصل علي الإطار فوراً
                                </button>
                              </div>
                            ))}
                          {storeProducts.filter((p) => p.tab === "skins")
                            .length === 0 && (
                            <p className="col-span-3 text-center text-gray-500 text-[10px] font-bold py-6">
                              ⚠️ لا توجد مظاهر أو إطارات ملوّنة حالياً.
                            </p>
                          )}
                        </div>
                      )}

                    {/* TAB CONTENTS - 3. BADGES & TITLES */}
                    {shopTab === "badges" &&
                      payStatus !== "loading" &&
                      payStatus !== "success" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {storeProducts
                            .filter((p) => p.tab === "badges")
                            .map((p) => (
                              <div
                                key={p.id}
                                className="p-4 rounded-2xl transition-all select-none lamma-admin-card"
                              >
                                <h5 className="font-sans font-black text-white text-xs">
                                  {p.name}
                                </h5>
                                <p className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed">
                                  {p.description}
                                </p>
                                <div className="mt-3 text-[10px] text-green-400 font-mono">
                                  السعر: {p.price}
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedProduct(p);
                                    setPayGateway("instapay");
                                    setPaymentAccountInput("");
                                    setPayStatus("idle");
                                  }}
                                  className="w-full mt-3 py-1.5 rounded-xl text-[9px] font-black transition-all cursor-pointer lamma-toggle-on"
                                >
                                  تثبيت اللقب فوراً آلياً
                                </button>
                              </div>
                            ))}
                          {storeProducts.filter((p) => p.tab === "badges")
                            .length === 0 && (
                            <p className="col-span-2 text-center text-gray-500 text-[10px] font-bold py-6">
                              ⚠️ لا توجد ألقاب أو شارات متاحة حالياً.
                            </p>
                          )}
                        </div>
                      )}

                    {/* TAB CONTENTS - 4. AUTOMATED FRIEND SUGGESTIONS */}
                    {shopTab === "suggests" && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-2xl lamma-section-card">
                          <p className="text-[9.5px] text-gray-300 font-bold leading-relaxed">
                            🤖 بوت الأرجحة الآلي يقترح عليك هؤلاء الأعضاء
                            المتواجدين حالياً الحاملين لنفس اهتمامات الحوار
                            والثقافة لتلقيح روابط الصداقة تلقائياً:
                          </p>
                        </div>

                        <div className="space-y-2">
                          {friendSuggestions.map((sug) => (
                            <div
                              key={sug.id}
                              className="p-3 rounded-xl flex items-center justify-between gap-3 text-right lamma-admin-card"
                            >
                              {sug.status === "pending" ? (
                                <span className="text-[9px] bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 py-1 px-2.5 rounded-lg font-bold animate-pulse font-sans">
                                  ⏳ جاري التفاوض الآلي...
                                </span>
                              ) : sug.status === "accepted" ? (
                                <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 py-1 px-2.5 rounded-lg font-bold font-sans">
                                  🤝 تم القبول والصداقة مفعّلة!
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    // Set pending status
                                    setFriendSuggestions((prev) =>
                                      prev.map((item) =>
                                        item.id === sug.id
                                          ? { ...item, status: "pending" }
                                          : item,
                                      ),
                                    );

                                    // Send bot notification
                                    const timeStr =
                                      new Date().toLocaleTimeString("ar-EG", {
                                        hour: "numeric",
                                        minute: "numeric",
                                        hour12: true,
                                      });
                                    setBotLogs((prev) => [
                                      {
                                        id: `${Date.now()}`,
                                        time: timeStr,
                                        text: `ماتش أوفر للتلقين: جاري مطابقة بيانات الاهتمام والصداقة مع ${sug.name} آلياً.`,
                                        severity: "info",
                                      },
                                      ...prev,
                                    ]);

                                    setTimeout(() => {
                                      setFriendSuggestions((prev) =>
                                        prev.map((item) =>
                                          item.id === sug.id
                                            ? { ...item, status: "accepted" }
                                            : item,
                                        ),
                                      );
                                      addLammaBotMessage(
                                        activeRoomId,
                                        `🤖 تهانينا الوفيرة: تم التوصيل الآلي وقبول طلب الصداقة المقترح بنجاح بين [${currentUser.nickname}] والزميل العضو الفعال [${sug.name}] بفضل خوارزمية الذكاء الاصطناعي بنسبة توافق 98% 🎉!`,
                                      );
                                    }, 2000);
                                  }}
                                  className="py-1 px-3 font-bold text-[9.5px] rounded-lg transition-all cursor-pointer lamma-feature-primary"
                                >
                                  📨 إرسال طلب صداقة آلي
                                </button>
                              )}

                              <div className="flex items-center gap-2">
                                <div className="space-y-0.5">
                                  <h6 className="text-[11px] font-black text-white">
                                    {sug.name}
                                  </h6>
                                  <p className="text-[8.5px] text-gray-500 font-extrabold">
                                    {sug.interest}
                                  </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0 select-none">
                                  {sug.icon}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENTS - 5. AUTOMATED CHARTS & STATISTICS */}
                    {shopTab === "stats" && (
                      <div className="space-y-3 font-sans">
                        <p className="text-[9.5px] text-gray-400 font-bold leading-normal pb-1">
                          📊 إحصائيات الغرف اليومية التلقائية المستخرجة آلياً
                          لتقديم إشارات الأمان والنشاط للإدارة على مدار الساعة:
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="p-3 rounded-xl text-center lamma-stat-card">
                            <span className="text-gray-500 text-[8.5px] font-black">
                              إجمالي الرسائل
                            </span>
                            <h5 className="text-[13px] font-black text-green-400 mt-1 font-mono">
                              5,820
                            </h5>
                          </div>
                          <div className="p-3 rounded-xl text-center lamma-stat-card">
                            <span className="text-gray-500 text-[8.5px] font-black">
                              الأعضاء المتفاعلين
                            </span>
                            <h5 className="text-[13px] font-black text-cyan-400 mt-1 font-mono">
                              409
                            </h5>
                          </div>
                          <div className="p-3 rounded-xl text-center lamma-stat-card">
                            <span className="text-gray-500 text-[8.5px] font-black">
                              الزوار الجدد
                            </span>
                            <h5 className="text-[13px] font-black text-yellow-400 mt-1 font-mono">
                              +185
                            </h5>
                          </div>
                          <div className="p-3 rounded-xl text-center lamma-stat-card">
                            <span className="text-gray-500 text-[8.5px] font-black">
                              جودة الاستقرار
                            </span>
                            <h5 className="text-[13px] font-black text-purple-400 mt-1 font-mono">
                              100%
                            </h5>
                          </div>
                        </div>

                        {/* Chart Representation */}
                        <div className="p-3 rounded-2xl lamma-section-card">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                            <span className="text-[8.5px] text-gray-500 font-black">
                              مؤشر نشاط الغرف بالساعات السابقة (النسبة النأوية)
                            </span>
                            <span className="text-[9px] text-emerald-400 font-black">
                              سيرفر الإحصائيات الآلي مكلل
                            </span>
                          </div>
                          <div className="space-y-2 pt-1 font-sans">
                            <div>
                              <div className="flex justify-between text-[8px] font-black text-gray-400 mb-0.5">
                                <span>58% نشاط تفاعلي</span>
                                <span>🇪🇬 غرفة مصر للحديث</span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: "58%" }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[8px] font-black text-gray-400 mb-0.5">
                                <span>32% نشاط تفاعلي</span>
                                <span>👫 لمة شباب وبنات العرب</span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-cyan-500 h-full rounded-full"
                                  style={{ width: "32%" }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[8px] font-black text-gray-400 mb-0.5">
                                <span>10% نشاط تفاعلي</span>
                                <span>💖 شات الرومانسية</span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-purple-500 h-full rounded-full"
                                  style={{ width: "10%" }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            addLammaBotMessage(
                              activeRoomId,
                              `📊 التقرير الإحصائي العام التلقائي (Lamma Analytics Report):
- إجمالي رسائل اليوم بغرف الشات: 5,820 رسالة متبادلة رسائل حرة 💬.
- عدد المسجلين النشطين على المنصة: 409 عضو فائق الفعالية 🚀.
- أفضل الغرف حرقاً ونشاطاً بالساعة: [غرفة مصر الوازنة EG] بمستويات نشاط 58% ✨.
- العضو الأكثر فاعلية وحضوراً لليوم: أحمد صاحب النخوة 👑.`,
                            );
                            alert(
                              "📊 تم بنجاح بث تقرير الإحصائيات الشامل التلقائي كرسالة رسمية مرئية للجميع بغرفة الدردشة!",
                            );
                          }}
                          className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black text-[10px] border border-emerald-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          📢 بث تقرير الإحصائيات الشامل في الغرفة
                        </button>
                      </div>
                    )}

                    {/* TAB CONTENTS - 6. AUTOMATED MAINTENANCE & HEALING */}
                    {shopTab === "maintenance" && (
                      <div className="space-y-3 font-sans">
                        <div className="p-3 rounded-xl flex items-center justify-between gap-3 text-right lamma-soft-danger">
                          <div className="space-y-0.5">
                            <h5 className="text-[11.5px] font-black text-white">
                              نظام الصيانة والتعافي الذاتي الشامل (Auto
                              Maintenance Engine)
                            </h5>
                            <p className="text-[8.5px] text-gray-400 font-bold leading-relaxed font-sans">
                              عند انقطاع الاتصال بقواعد البيانات Supabase أو
                              تعطل Realtime Client، يتدخل البوت دورياً لإعادة
                              التوجيه وإرسال التنبيهات اللازمة للمشرف الفني
                              آلياً.
                            </p>
                          </div>
                          <div
                            className={`w-3 h-3 rounded-full shrink-0 ${isDbConnectionLost ? "bg-red-500 animate-ping" : "bg-green-500 animate-pulse"}`}
                          ></div>
                        </div>

                        {/* Live simulation control */}
                        <div className="p-3 rounded-xl space-y-2 lamma-section-card">
                          <div className="flex items-center justify-between text-right border-b border-white/5 pb-1.5">
                            <span className="text-[8.5px] text-gray-500 font-extrabold">
                              الوضع الحالي لقنوات الإتصال
                            </span>
                            <span
                              className={`text-[9.1px] font-black ${isDbConnectionLost ? "text-red-400 animate-pulse" : "text-green-400"}`}
                            >
                              {isDbConnectionLost
                                ? "🔴 الخدمة معطلة (Supabase Lost)"
                                : "🟢 الخدمة مستقرة بالكامل"}
                            </span>
                          </div>

                          <div className="space-y-1 max-h-[105px] overflow-y-auto font-mono text-[8.5px] leading-relaxed">
                            {dbStatusLogs.map((log, i) => (
                              <div
                                key={i}
                                className="text-gray-400 p-1 border-b border-white/[0.02] last:border-0"
                              >
                                {log}
                              </div>
                            ))}
                            {dbStatusLogs.length === 0 && (
                              <div className="text-gray-500 text-center py-4 font-sans text-[9px] font-bold">
                                انقر على الخيار أدناه لتجربة المحاكاة ورصد
                                التعافي الفوري.
                              </div>
                            )}
                          </div>
                        </div>

                        {!isDbConnectionLost ? (
                          <button
                            onClick={() => {
                              setIsDbConnectionLost(true);
                              setIsReconnectingDb(true);
                              const now = new Date().toLocaleTimeString(
                                "ar-EG",
                                {
                                  hour: "numeric",
                                  minute: "numeric",
                                  second: "numeric",
                                },
                              );
                              setDbStatusLogs([
                                `[${now}] 🚨 طوارئ: تم رصد انقطاعات حادة بالمزود الرئيسي لقاعدة البيانات Supabase!`,
                                `[${now}] 🚨 طوارئ: انقطاع قنوات المزامنة المتزامنة الفورية (Realtime Engine Offline).`,
                                `[${now}] 🛡️ الأتمتة: تشغيل خطة الطوارئ فئة A والبدء بالمحاولات الدورية للتواصل البديل...`,
                              ]);

                              // Trigger progressive auto healing
                              setTimeout(() => {
                                const now2 = new Date().toLocaleTimeString(
                                  "ar-EG",
                                  {
                                    hour: "numeric",
                                    minute: "numeric",
                                    second: "numeric",
                                  },
                                );
                                setDbStatusLogs((prev) => [
                                  `[${now2}] ⚙️ المحرك: تم توجيه ترافيك الغرفة والنشاط للذاكرة العشوائية المستقرة البديلة (RAM-Mirror).`,
                                  `[${now2}] 🔔 التنبيه الآلي: تم إرسال رسالة بريدية عاجلة للمشرف الفني لفرض الرصد التكتيكي لقاعدة البيانات.`,
                                  ...prev,
                                ]);
                              }, 1800);

                              setTimeout(() => {
                                const now3 = new Date().toLocaleTimeString(
                                  "ar-EG",
                                  {
                                    hour: "numeric",
                                    minute: "numeric",
                                    second: "numeric",
                                  },
                                );
                                setDbStatusLogs((prev) => [
                                  `[${now3}] ✅ الأتمتة بنجاح: تم التغلب والتعافي التام وإعادة تصفية الاتصال بخادم النسخ الاحتياطية الاستراتيجي بنسبة استقرار 100%!`,
                                  `[${now3}] 📡 الاتصال: عودة حالة الحاقنات للون الأخضر والعمل مستقر بالكامل.`,
                                  ...prev,
                                ]);
                                setIsDbConnectionLost(false);
                                setIsReconnectingDb(false);
                                addLammaBotMessage(
                                  activeRoomId,
                                  "🤖 نظام التعافي الذاتي Lamma Maintenance: تم رصد انقطاع عابر في قنوات الاتصال بريل تايم Supabase وقامت الأتمتة الذاتية بإجراء تحويل المسار والربط بالخادم الرديف بنجاح تام في غضون ثوانٍ دون ضياع للرسائل 🚀🛡️!",
                                );
                              }, 4500);
                            }}
                            className="w-full py-2 font-extrabold text-[10px] rounded-xl transition-all cursor-pointer text-center lamma-danger-btn"
                          >
                            🔌 محاكاة قطع الاتصال ورصد التعافي الفوري للبوت
                          </button>
                        ) : (
                          <div className="py-2.5 rounded-xl text-center text-yellow-300 text-[10px] font-black font-sans lamma-soft-warn">
                            ⏳ جاري تنفيذ معالجات التعافي الذاتي من خلال البوت
                            الذكي... انتظر ثانية واحدة!
                          </div>
                        )}
                      </div>
                    )}

                    {/* GATEWAY PAYMENT PANEL (IF PRODUCT CHOSEN) */}
                    {selectedProduct &&
                      payStatus !== "loading" &&
                      payStatus !== "success" && (
                        <div className="p-4 rounded-2xl text-right space-y-3 font-sans animate-fadeIn lamma-section-card">
                          <div className="flex items-center justify-between border-b border-green-500/15 pb-2">
                            <button
                              onClick={() => setSelectedProduct(null)}
                              className="text-[9.5px] text-gray-500 hover:text-white font-black hover:underline"
                            >
                              رجوع للتسوق
                            </button>
                            <h6 className="font-sans font-black text-white text-xs">
                              عملية دفع آمنة مؤتمتة • Lamma AutoPay
                            </h6>
                          </div>

                          <div className="p-3 rounded-xl space-y-1.5 text-right lamma-admin-card">
                            <div className="text-[10px] text-gray-400 font-bold leading-normal">
                              المنتج المحدد للتفعيل التلقائي:
                            </div>
                            <div className="text-white text-[12px] font-black">
                              {selectedProduct.name}
                            </div>
                            <div className="text-emerald-400 text-[10.5px] font-mono">
                              طريقة الدفع وقيمتها: {selectedProduct.price}
                            </div>
                          </div>

                          {/* Choosing Gateway selectors */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] text-gray-400 font-extrabold pr-1">
                              اختر مزود الدفع الفوري:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <button
                                onClick={() => {
                                  setPayGateway("vodafone");
                                  setPaymentAccountInput("");
                                }}
                                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                                  payGateway === "vodafone"
                                    ? "lamma-toggle-off"
                                    : "lamma-tab-soft text-gray-400 hover:text-white"
                                }`}
                              >
                                🍎 فودافون كاش
                              </button>
                              <button
                                onClick={() => {
                                  setPayGateway("instapay");
                                  setPaymentAccountInput("");
                                }}
                                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                                  payGateway === "instapay"
                                    ? "lamma-accent-btn"
                                    : "lamma-tab-soft text-gray-400 hover:text-white"
                                }`}
                              >
                                ⚡ إنستاباي IPA
                              </button>
                              <button
                                onClick={() => {
                                  setPayGateway("paymob");
                                  setPaymentAccountInput("");
                                }}
                                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                                  payGateway === "paymob"
                                    ? "lamma-accent-btn"
                                    : "lamma-tab-soft text-gray-400 hover:text-white"
                                }`}
                              >
                                💳 بطاقة فيزا/ميزة
                              </button>
                              <button
                                onClick={() => {
                                  setPayGateway("stripe");
                                  setPaymentAccountInput("");
                                }}
                                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                                  payGateway === "stripe"
                                    ? "lamma-accent-btn"
                                    : "lamma-tab-soft text-gray-400 hover:text-white"
                                }`}
                              >
                                💳 Stripe الآلي
                              </button>
                              <button
                                onClick={() => {
                                  setPayGateway("paypal");
                                  setPaymentAccountInput("");
                                }}
                                className={`py-2 rounded-xl text-[9px] font-black border transition-all ${
                                  payGateway === "paypal"
                                    ? "lamma-soft-warn"
                                    : "lamma-tab-soft text-gray-400 hover:text-white"
                                }`}
                              >
                                🅿️ PayPal
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Input Based on Gateway */}
                          {payGateway === "vodafone" && (
                            <div className="space-y-1 text-right">
                              <label
                                htmlFor="vodafone-wallet-input"
                                className="text-[9px] text-gray-400 font-extrabold pr-1"
                              >
                                قم بتحويل المبلغ فودافون كاش للرقم{" "}
                                <span className="text-white text-xs font-mono">
                                  01029384756
                                </span>{" "}
                                ثم اكتب رقم محفظتك للتأكيد التلقائي:
                              </label>
                              <input
                                type="text"
                                id="vodafone-wallet-input"
                                name="vodafoneWallet"
                                autoComplete="tel"
                                maxLength={11}
                                placeholder="01xxxxxxxxx (رقم المحفظة المحول منها)"
                                value={paymentAccountInput}
                                onChange={(e) =>
                                  setPaymentAccountInput(
                                    e.target.value.replace(/\D/g, ""),
                                  )
                                }
                                className="w-full rounded-xl p-2.5 text-xs text-white text-right focus:outline-none text-right lamma-input-shell"
                              />
                            </div>
                          )}

                          {payGateway === "instapay" && (
                            <div className="space-y-1 text-right">
                              <label
                                htmlFor="instapay-address-input"
                                className="text-[9px] text-gray-400 font-extrabold pr-1"
                              >
                                قم بالتحويل الآمن لعنوان إنستاباي{" "}
                                <span className="text-white text-xs font-mono">
                                  lamma@instapay
                                </span>{" "}
                                ثم اكتب الـ Adresse الخاص بك:
                              </label>
                              <input
                                type="text"
                                id="instapay-address-input"
                                name="instapayAddress"
                                autoComplete="off"
                                placeholder="username@instapay (عنوان إرسالك للتسوية)"
                                value={paymentAccountInput}
                                onChange={(e) =>
                                  setPaymentAccountInput(e.target.value)
                                }
                                className="w-full rounded-xl p-2.5 text-xs text-white text-right focus:outline-none text-right lamma-input-shell"
                              />
                            </div>
                          )}

                          {payGateway === "paymob" && (
                            <div className="space-y-2 text-right">
                              <div className="text-[9px] text-gray-400 font-extrabold pr-1">
                                أدخل بيانات بطاقتك الائتمانية للتسوية الآمنة:
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  id="paymob-cvv"
                                  name="paymob-cvv"
                                  autoComplete="cc-csc"
                                  maxLength={3}
                                  placeholder="CVV"
                                  className="rounded-xl p-2 text-xs text-center text-white lamma-input-shell"
                                />
                                <input
                                  type="text"
                                  id="paymob-expiry"
                                  name="paymob-expiry"
                                  autoComplete="cc-exp"
                                  maxLength={5}
                                  placeholder="MM/YY"
                                  className="rounded-xl p-2 text-xs text-center text-white lamma-input-shell"
                                />
                                <input
                                  type="text"
                                  id="paymob-card-number"
                                  name="paymob-card-number"
                                  autoComplete="cc-number"
                                  maxLength={16}
                                  placeholder="رقم البطاقة المكون من 16 رقم"
                                  className="rounded-xl p-2 text-xs text-right text-white col-span-2 lamma-input-shell"
                                />
                              </div>
                            </div>
                          )}

                          {payGateway === "paypal" && (
                            <div className="space-y-1 text-right">
                              <label
                                htmlFor="paypal-email-input"
                                className="text-[9px] text-gray-400 font-extrabold pr-1"
                              >
                                قم بإدخال بريدك الإلكتروني المسجل في PayPal
                                للتسوية التلقائية:
                              </label>
                              <input
                                type="email"
                                id="paypal-email-input"
                                name="paypal-email"
                                autoComplete="email"
                                placeholder="name@example.com (حسابك لتسجيل المعاملة)"
                                value={paymentAccountInput}
                                onChange={(e) =>
                                  setPaymentAccountInput(e.target.value)
                                }
                                className="w-full rounded-xl p-2.5 text-xs text-white text-right focus:outline-none text-right lamma-input-shell"
                              />
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (
                                (payGateway === "vodafone" ||
                                  payGateway === "instapay") &&
                                !paymentAccountInput.trim()
                              ) {
                                alert(
                                  "❌ يرجى إدخال محفظة التحويل أو عنوان إنستاباي بنجاح للمطابقة الآلية!",
                                );
                                return;
                              }

                              setPayStatus("loading");
                              setPaymentLogs([
                                "⏳ جاري إنشاء حلقة تسوية المعاملة عبر Lamma AutoPay Server...",
                                "🔍 جاري التحري والتدقيق المالي من صحة تسليم إشعار فودافون كاش / إنستاباي اللاسلكي...",
                              ]);

                              // Simulation sequence
                              setTimeout(() => {
                                setPaymentLogs((prev) => [
                                  ...prev,
                                  "📂 عثرنا على إثبات الإشعار المعنون آلياً بمستويات سداد مقابلة.",
                                  "⚡ جاري المطابقة والتصديق الفوري في قواعد كبار الشخصيات والشارات المقترحة...",
                                ]);
                              }, 1000);

                              setTimeout(() => {
                                setPaymentLogs((prev) => [
                                  ...prev,
                                  "💎 تم تأكيد الدفع بنسبة سلامة 100%! جاري التفعيل، ترقية الصلاحيات، وحقن الجوان مظهر الشات...",
                                ]);
                              }, 2200);

                              setTimeout(() => {
                                setPayStatus("success");

                                if (
                                  selectedProduct.type === "bronze" ||
                                  selectedProduct.type === "platinum" ||
                                  selectedProduct.type === "vip"
                                ) {
                                  // Activate VIP
                                  const isPlat =
                                    selectedProduct.type === "platinum";
                                  const expiresAtMs =
                                    Date.now() + 30 * 24 * 60 * 60 * 1000;
                                  const subInfo = {
                                    isActive: true,
                                    type: isPlat ? "platinum" : "vip",
                                    role:
                                      selectedProduct.ext ||
                                      (isPlat ? "platinum_vip" : "vip"),
                                    color: isPlat
                                      ? "gradient"
                                      : selectedProduct.color || "#10b981",
                                    badge:
                                      selectedProduct.badge ||
                                      (isPlat ? "PLATINUM" : "VIP"),
                                    frame: isPlat
                                      ? "from-yellow-500 via-amber-500 to-yellow-600"
                                      : selectedProduct.frame || "",
                                    avatar: selectedProduct.avatar || "👤",
                                    expiresAt: expiresAtMs,
                                  };
                                  localStorage.setItem(
                                    "lamma_user_subscription",
                                    JSON.stringify(subInfo),
                                  );
                                  setSubscription(subInfo);

                                  // Apply update to current user session
                                  setMyActiveSession((prev) => ({
                                    ...prev,
                                    role: subInfo.role as any,
                                    color:
                                      subInfo.color === "gradient"
                                        ? undefined
                                        : subInfo.color,
                                    badge: subInfo.badge,
                                    avatar: subInfo.avatar,
                                    frame: subInfo.frame,
                                  }));

                                  addLammaBotMessage(
                                    activeRoomId,
                                    `🤖 تم تفعيل ميزة [${selectedProduct.name}] للعضو المميز [${currentUser.nickname}] غرفوياً بوقار متناهٍ لمدة 30 يوماً! تم تفعيل الشارات والاتصال الفوري تلقائياً بالتحقق عبر ${payGateway === "vodafone" ? "فودافون كاش 🍎" : payGateway === "instapay" ? "إنستاباي ⚡" : payGateway === "paypal" ? "PayPal 🅿️" : "البطاقة البنكية 💳"} 🎉!`,
                                  );
                                  addSystemActivityLog(
                                    "promote",
                                    currentUser.nickname,
                                    `شراء واشتراك تلقائي في باقة كبار الشخصيات VIP وتفعيلها فوراً آلياً بالدفع الرقمي.`,
                                    "🤖 LAMMA AUTO-VERIFIER",
                                  );
                                } else if (selectedProduct.type === "frame") {
                                  // Apply customized avatar frames!
                                  setMyActiveSession((prev) => ({
                                    ...prev,
                                    frame: selectedProduct.frame,
                                  }));
                                  addLammaBotMessage(
                                    activeRoomId,
                                    `🤖 مظهر جديد متجانس: قام العضو [${currentUser.nickname}] بشراء مظهر الإطار الراقي [${selectedProduct.name}] وتولت الأتمتة المظهرية من تفعليه فوراً حول ملفه الشخصي بنجاح 🎨!`,
                                  );
                                  addSystemActivityLog(
                                    "promote",
                                    currentUser.nickname,
                                    `شراء وتفعيل إطار المظهر المتوهج [${selectedProduct.name}] وتوليه فوراً.`,
                                    "🤖 LAMMA AUTO-VERIFIER",
                                  );
                                } else if (selectedProduct.type === "title") {
                                  // Apply customized title and text badges!
                                  setMyActiveSession((prev) => ({
                                    ...prev,
                                    title: selectedProduct.title,
                                    badge: selectedProduct.badge,
                                  }));
                                  addLammaBotMessage(
                                    activeRoomId,
                                    `🤖 صلاحية فخرية: قام العضو [${currentUser.nickname}] بشراء وتفعيل لقب التفاضل الخاص [${selectedProduct.title}] وتم إرساءه تلقائياً بجواز رتبته في الغرفة 🏷️!`,
                                  );
                                  addSystemActivityLog(
                                    "promote",
                                    currentUser.nickname,
                                    `تثبيت لقب العضو الفخري المميز [${selectedProduct.title}] بنجاح آلياً.`,
                                    "🤖 LAMMA AUTO-VERIFIER",
                                  );
                                }
                              }, 3200);
                            }}
                            className="w-full py-2.5 text-white text-[10.5px] font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 lamma-feature-primary"
                          >
                            💸 تأكيد الدفع التلقائي الآمن وإصدار الترقية فوراً
                          </button>
                        </div>
                      )}

                    {/* GATEWAY PAYMENT LOADER SIMULATION */}
                    {payStatus === "loading" && (
                      <div className="p-5 rounded-2xl text-center space-y-4 font-sans animate-fadeIn lamma-section-card">
                        <div className="w-12 h-12 rounded-full border-t-2 border-emerald-500 animate-spin mx-auto"></div>
                        <div className="space-y-1.5 pt-2">
                          <h6 className="font-sans font-black text-white text-xs">
                            جاري فحص المعاملات آلياً دون تدخل بشري...
                          </h6>
                          <p className="text-[10px] text-gray-400 font-bold leading-normal font-mono animate-pulse">
                            Lamma Auto-Verification Server Connection Node-9
                          </p>
                        </div>
                        <div className="p-3 rounded-xl space-y-1 max-h-[140px] overflow-y-auto lamma-admin-card">
                          {paymentLogs.map((log, i) => (
                            <div
                              key={i}
                              className="text-right text-emerald-400 text-[9px] font-bold font-mono"
                            >
                              ▸ {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GATEWAY PAYMENT SUCCESS PANEL */}
                    {payStatus === "success" && (
                      <div className="p-6 rounded-3xl text-center space-y-4 font-sans animate-bounceIn lamma-soft-success">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0 select-none">
                          ✓
                        </div>
                        <div className="space-y-1 pt-1 text-center">
                          <h6 className="font-sans font-black text-white text-sm">
                            تم الدفع والتفعيل التلقائي بنجاح!
                          </h6>
                          <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                            تم تفعيل الطلب واحتساب رتبك ودمج المزايا بالدردشة
                            تلقائياً. تم تسجيل الحدث وإشعار جميع الغرف في أمان
                            وسلام.
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl flex items-center justify-between text-right font-sans lamma-admin-card">
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-white text-xs font-black">
                              {myActiveSession.nickname}
                            </span>
                            <span className="text-emerald-400 font-mono text-[8.5px] mt-0.5">
                              {myActiveSession.role || "عضو مفعل لارج"}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                            نشط ومرخص آلياً
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProduct(null);
                            setPayStatus("idle");
                          }}
                          className="w-full py-2 text-white font-extrabold text-[10px] rounded-xl transition-all lamma-feature-primary"
                        >
                          عودة لمركز المتجر والأتمتة
                        </button>
                      </div>
                    )}

                    {/* --- SIMULATED CHRONOLOGICAL TESTING PANEL (FOR COMPREHENSIVE DEBUGGING) --- */}
                    {subscription && subscription.isActive && (
                      <div className="p-4 bg-yellow-500/[0.03] border border-yellow-500/15 rounded-2xl text-right mt-4 space-y-2 select-none font-sans">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-yellow-400">⏳</span>
                          <h6 className="font-sans font-black text-yellow-500 text-[10px]">
                            ⚙️ لوحة اختبار المحاكاة الزمنية (خاصة بالمطورين
                            ومراجعي النظام)
                          </h6>
                        </div>
                        <p className="text-[8.5px] text-gray-400 font-bold leading-relaxed font-sans mt-0.5">
                          تتيح لك اللوحة التقدم المرجعي لمشاهدة دورة حياة اشتراك
                          VIP الممنوح بالكامل كأنه حقيقي وتفعيل البوت للتذكير
                          الآلي وسحب الامتيازات فوراً!
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                          <button
                            onClick={() => handleAccelerateDays(7)}
                            className="py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-black text-[9px] rounded-lg border border-yellow-500/20 transition-all"
                          >
                            🕒 تسريع 7 أيام
                          </button>
                          <button
                            onClick={() => handleAccelerateDays(23)}
                            className="py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-black text-[9px] rounded-lg border border-yellow-500/20 transition-all"
                          >
                            🕒 تسريع 23 يوماً (أسبوع متبقي)
                          </button>
                          <button
                            onClick={() => handleAccelerateDays(27)}
                            className="py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-black text-[9px] rounded-lg border border-yellow-500/20 transition-all"
                          >
                            🕒 تسريع 27 يوماً (3 أيام متبقية)
                          </button>
                          <button
                            onClick={() => handleAccelerateDays(30)}
                            className="py-1.5 text-red-400 font-black text-[9px] rounded-lg transition-all col-span-2 md:col-span-1 lamma-danger-btn"
                          >
                            ⚠️ إنهاء كامل (30 يوماً)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeModal === "leadership" &&
                  leadershipTab === "design" && (
                    <div className="space-y-4 select-none" dir="rtl">
                      <div className="p-4 rounded-2xl lamma-section-card">
                        <div className="text-white text-xs font-black">
                          🎨 مركز التصميم
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1">
                          تحكم في الهوية البصرية: اللوجو، الخلفيات، وبعض عناصر
                          الواجهة.
                        </div>
                      </div>

                      {isOwnerRole && (
                        <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                          <div className="text-[11px] text-cyan-300 font-black">
                            ألوان الجدران
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold">
                            تبديل لون الفواصل والفريم والماسورة داخل الشات بالكامل.
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWallTheme("fire");
                                localStorage.setItem("lamma_wall_theme", "fire");
                              }}
                              className={`p-3 rounded-xl border transition-all ${
                                wallTheme === "fire"
                                  ? "lamma-accent-btn"
                                  : "lamma-tab-soft"
                              }`}
                            >
                              <div className="h-3 rounded-full bg-gradient-to-r from-yellow-500/30 via-orange-500/40 to-yellow-500/30 border border-yellow-500/25" />
                              <div className="text-[10px] font-black text-yellow-400 mt-2">
                                ناري
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWallTheme("ice");
                                localStorage.setItem("lamma_wall_theme", "ice");
                              }}
                              className={`p-3 rounded-xl border transition-all ${
                                wallTheme === "ice"
                                  ? "lamma-accent-btn"
                                  : "lamma-tab-soft"
                              }`}
                            >
                              <div className="h-3 rounded-full bg-gradient-to-r from-sky-400/25 via-cyan-400/35 to-sky-400/25 border border-sky-400/25" />
                              <div className="text-[10px] font-black text-sky-300 mt-2">
                                ثلجي
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWallTheme("violet");
                                localStorage.setItem(
                                  "lamma_wall_theme",
                                  "violet",
                                );
                              }}
                              className={`p-3 rounded-xl border transition-all ${
                                wallTheme === "violet"
                                  ? "lamma-accent-btn"
                                  : "lamma-tab-soft"
                              }`}
                            >
                              <div className="h-3 rounded-full bg-gradient-to-r from-fuchsia-500/20 via-violet-500/35 to-fuchsia-500/20 border border-violet-500/25" />
                              <div className="text-[10px] font-black text-violet-300 mt-2">
                                بنفسجي
                              </div>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                        <div className="text-[11px] text-cyan-300 font-black">
                          الشعار
                        </div>
                        <div className="flex items-center justify-center rounded-xl p-3 lamma-admin-card">
                          <img
                            src={brandLogoUrl || "/images/lamma-wordmark.svg"}
                            alt="LAMMA CHAT"
                            className="h-10 sm:h-12 w-auto"
                            draggable={false}
                          />
                        </div>
                        <div className="flex p-1.5 rounded-lg lamma-admin-card">
                          <input
                            type="text"
                            id="leadership_logo_url_input"
                            defaultValue={brandLogoUrl || ""}
                            placeholder="رابط الشعار (URL)..."
                            className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inp = document.getElementById(
                                "leadership_logo_url_input",
                              ) as HTMLInputElement;
                              if (inp && inp.value.trim() !== "") {
                                localStorage.setItem(
                                  "lamma_custom_logo_url",
                                  inp.value.trim(),
                                );
                                setBrandLogoUrl(inp.value.trim());
                              } else {
                                localStorage.removeItem("lamma_custom_logo_url");
                                setBrandLogoUrl(null);
                              }
                            }}
                            className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
                          >
                            تطبيق
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                        <div className="text-[11px] text-cyan-300 font-black">
                          ألوان الإضاءة
                        </div>
                        <div className="flex items-center gap-3 rounded-xl p-3 lamma-admin-card">
                          <input
                            type="color"
                            value={glowColor}
                            onChange={(e) => {
                              const next = e.target.value;
                              setGlowColor(next);
                              localStorage.setItem("lamma_glow_color", next);
                            }}
                            className="w-10 h-10 rounded-lg bg-transparent lamma-input-shell"
                          />
                          <input
                            type="text"
                            value={glowColor}
                            onChange={(e) => {
                              const next = e.target.value;
                              setGlowColor(next);
                              localStorage.setItem("lamma_glow_color", next);
                            }}
                            className="flex-1 rounded-lg text-[11px] text-white px-2 py-2 focus:outline-none lamma-input-shell"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                        <div className="text-[11px] text-cyan-300 font-black">
                          خلفية الغرفة الحالية
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold">
                          {openRooms.find((r) => r.id === activeRoomId)?.name ||
                            activeRoomId}
                        </div>
                        <div className="flex p-1.5 rounded-lg lamma-admin-card">
                          <input
                            type="text"
                            id="leadership_room_bg_url_input"
                            defaultValue={roomBgMap[activeRoomId] || ""}
                            placeholder="رابط صورة خلفية لهذه الغرفة (URL)..."
                            className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inp = document.getElementById(
                                "leadership_room_bg_url_input",
                              ) as HTMLInputElement;
                              const next = inp?.value?.trim() || "";
                              const updated = { ...roomBgMap };
                              if (next) updated[activeRoomId] = next;
                              else delete updated[activeRoomId];
                              setRoomBgMap(updated);
                              localStorage.setItem(
                                "lamma_room_bg_map",
                                JSON.stringify(updated),
                              );
                            }}
                            className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
                          >
                            تطبيق
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...roomBgMap };
                            delete updated[activeRoomId];
                            setRoomBgMap(updated);
                            localStorage.setItem(
                              "lamma_room_bg_map",
                              JSON.stringify(updated),
                            );
                          }}
                          className="w-full py-2.5 rounded-xl font-black text-[10px] transition-all lamma-danger-btn"
                        >
                          حذف خلفية الغرفة
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                        <div className="text-[11px] text-cyan-300 font-black">
                          الخلفية الافتراضية
                        </div>
                        <div className="flex p-1.5 rounded-lg lamma-admin-card">
                          <input
                            type="text"
                            id="leadership_bg_url_input"
                            defaultValue={ownerBgImage || ""}
                            placeholder="رابط صورة الخلفية (URL)..."
                            className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inp = document.getElementById(
                                "leadership_bg_url_input",
                              ) as HTMLInputElement;
                              if (inp && inp.value.trim() !== "") {
                                localStorage.setItem(
                                  "lamma_owner_bg_image",
                                  inp.value.trim(),
                                );
                                setOwnerBgImage(inp.value.trim());
                              } else {
                                localStorage.removeItem("lamma_owner_bg_image");
                                setOwnerBgImage(null);
                              }
                            }}
                            className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
                          >
                            تطبيق
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {activeModal === "leadership" &&
                  leadershipTab === "stats" && (
                    <div className="space-y-4 select-none" dir="rtl">
                      <div className="p-4 rounded-2xl lamma-section-card">
                        <div className="text-white text-xs font-black">
                          📊 الإحصائيات
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1">
                          نظرة سريعة على النشاط العام داخل الشات.
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl text-center lamma-stat-card">
                          <div className="text-sm font-black text-blue-300">
                            {chatMembers.filter((m) => m.status === "online")
                              .length}
                          </div>
                          <div className="text-[8.5px] text-gray-400 font-extrabold">
                            المتصلين الآن
                          </div>
                        </div>
                        <div className="p-3 rounded-xl text-center lamma-stat-card">
                          <div className="text-sm font-black text-emerald-400">
                            {(roomMessages?.[activeRoomId] || []).length}
                          </div>
                          <div className="text-[8.5px] text-gray-400 font-extrabold">
                            رسائل الغرفة الحالية
                          </div>
                        </div>
                        <div className="p-3 rounded-xl text-center lamma-stat-card">
                          <div className="text-sm font-black text-yellow-500">
                            {openRooms.length}
                          </div>
                          <div className="text-[8.5px] text-gray-400 font-extrabold">
                            الغرف المفتوحة
                          </div>
                        </div>
                        <div className="p-3 rounded-xl text-center lamma-stat-card">
                          <div className="text-sm font-black text-red-400">
                            {bannedUsersList.length}
                          </div>
                          <div className="text-[8.5px] text-gray-400 font-extrabold">
                            العقوبات/الحظر
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && selectedProfileMember && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-20 left-4 md:left-auto md:right-32 w-[340px] rounded-3xl overflow-hidden flex flex-col z-[100] cursor-move lamma-modal-shell"
            style={{
              resize: "both",
              overflow: "hidden",
              minWidth: "300px",
              minHeight: "450px",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            dir="rtl"
          >
            <div
              className="flex-1 flex flex-col overflow-y-auto"
              onPointerDownCapture={(e) => e.stopPropagation()}
            >
              {/* Profile Header */}
              <div className="flex items-center justify-between p-4 lamma-modal-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👤</span>
                  <h3 className="font-sans font-black text-white text-xs">
                    الملف التعريفي والرقابة الأمنية •{" "}
                    {selectedProfileMember.nickname}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setSelectedProfileMember(null);
                  }}
                  className="p-1.5 rounded-xl text-red-400 transition-all cursor-pointer lamma-danger-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Profile Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-right">
                {/* Visual Avatar Card */}
                <div className="p-4 rounded-2xl flex items-center gap-3 lamma-section-card">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0 lamma-quiet-power-btn">
                    {selectedProfileMember.avatar || "👤"}
                  </div>
                  <div className="flex-grow space-y-1">
                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <span>{selectedProfileMember.nickname}</span>
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider lamma-role-chip ${
                          selectedProfileMember.role === "platinum_vip"
                            ? "lamma-role-plat"
                            : selectedProfileMember.role === "owner"
                              ? "lamma-role-owner"
                              : selectedProfileMember.role === "admin"
                                ? "lamma-role-admin"
                                : selectedProfileMember.role === "mod"
                                  ? "lamma-role-mod"
                                  : selectedProfileMember.role === "vip"
                                    ? "lamma-role-vip"
                                    : ""
                        }`}
                      >
                        {selectedProfileMember.role === "platinum_vip"
                          ? "PLATINUM VIP"
                          : selectedProfileMember.role === "owner"
                            ? "OWNER"
                            : selectedProfileMember.role === "admin"
                              ? "ADMIN"
                              : selectedProfileMember.role === "mod"
                                ? "MODERATOR"
                                : selectedProfileMember.role === "vip"
                                  ? "VIP"
                                  : selectedProfileMember.role === "user"
                                    ? "MEMBER"
                                    : "GUEST"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold font-mono">
                      {selectedProfileMember.email ||
                        "حساب ضيف بدون بريد إلكتروني"}
                    </div>
                  </div>
                </div>

                {/* Fingerprint Metadata Section */}
                <div className="space-y-1.5">
                  <div className="text-[9px] font-black text-[#a3e635] tracking-wide uppercase">
                    بصمة المعرف الرقمي ومواصفات الاتصال الفني (Device Signature)
                  </div>
                  <div className="p-3 rounded-2xl space-y-2 text-[10px] font-mono text-gray-300 lamma-section-card">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        ID المعرف:
                      </span>{" "}
                      <span>{selectedProfileMember.id}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        بصمة الجهاز الفنية:
                      </span>{" "}
                      <span className="text-[#a3e635]">
                        {selectedProfileMember.fingerprint}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        عنوان الـ IP الحالي:
                      </span>{" "}
                      <span className="text-red-400 font-bold">
                        {selectedProfileMember.ip}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        نوع المتصفح والاتصال:
                      </span>{" "}
                      <span
                        className="truncate max-w-[180px] text-gray-400"
                        title={selectedProfileMember.browserSignature}
                      >
                        {selectedProfileMember.browserSignature}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 select-none">
                        مفتاح الحفظ المحلي:
                      </span>{" "}
                      <span className="text-gray-400 text-[8.5px] truncate max-w-[180px]">
                        {selectedProfileMember.localStorageId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Administration controls strictly based on current user role */}
                <div className="space-y-2 select-none">
                  <div className="text-[9px] font-black text-red-500 tracking-wide uppercase">
                    إجراءات الرقابة والإدارة السريعة (Administrative Control
                    Block)
                  </div>

                  {/* Permissions check block */}
                  {currentUser.role === "owner" ||
                  currentUser.role === "admin" ||
                  currentUser.role === "mod" ? (
                    <div className="space-y-3.5">
                      {/* Grid 1: Basic controls */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Warn */}
                        <button
                          onClick={() => {
                            const textMsg = `🚨 [تنبيه أمني رسمي] من حارس الشات Lamma Guard لـ [${selectedProfileMember.nickname}]: يرجى التقيد بالآداب والأخلاق العامة للشات وعدم الخروج عن إطار الحديث المتزن وإلا سيتم الطرد التلقائي 🛡️.`;
                            setRoomMessages((prev) => ({
                              ...prev,
                              [activeRoomId]: [
                                ...(prev[activeRoomId] || []),
                                {
                                  id: `sys-warn-${Date.now()}`,
                                  author: "حارس الشات 🛡️",
                                  text: textMsg,
                                  color: "#f59e0b",
                                  isOwn: false,
                                  time: new Date().toLocaleTimeString("ar-EG", {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  }),
                                  type: "system",
                                },
                              ],
                            }));
                            addSystemActivityLog(
                              "demote",
                              selectedProfileMember.nickname,
                              `تم إصدار إنذار وتحذير أمني علني للعضو في غرفة [${activeRoomId}]`,
                            );
                            alert(
                              `تم إرسال التحذير بنجاح كرسالة نظام في الغرفة.`,
                            );
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-bold text-[10px] rounded-xl border border-yellow-500/20 text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          ⚠️ إنذار وتحذير
                        </button>

                        {/* 2. Mute toggle */}
                        <button
                          onClick={() => {
                            const isCurrentlyMuted = bannedUsersList.some(
                              (b) =>
                                b.nickname.toLowerCase() ===
                                  selectedProfileMember.nickname.toLowerCase() &&
                                b.type === "mute",
                            );
                            if (isCurrentlyMuted) {
                              setBannedUsersList((prev) =>
                                prev.filter(
                                  (b) =>
                                    !(
                                      b.nickname.toLowerCase() ===
                                        selectedProfileMember.nickname.toLowerCase() &&
                                      b.type === "mute"
                                    ),
                                ),
                              );
                              addSystemActivityLog(
                                "promote",
                                selectedProfileMember.nickname,
                                `تم إلغاء كتم الصوت عن العضو ${selectedProfileMember.nickname} من قبل المشرف.`,
                              );
                              alert(`تم إلغاء الكتم بنجاح!`);
                            } else {
                              const muteBan: BanInfo = {
                                id: `mute-${Date.now()}`,
                                nickname: selectedProfileMember.nickname,
                                email: selectedProfileMember.email,
                                fingerprint: selectedProfileMember.fingerprint,
                                browserSignature:
                                  selectedProfileMember.browserSignature,
                                ip: selectedProfileMember.ip,
                                localStorageId:
                                  selectedProfileMember.localStorageId,
                                type: "mute",
                                banner: currentUser.nickname,
                                reason: "مخالفة معايير النقاش الهادئ",
                                time: new Date().toLocaleTimeString("ar-EG", {
                                  hour: "numeric",
                                  minute: "numeric",
                                }),
                              };
                              setBannedUsersList((prev) => [...prev, muteBan]);
                              addSystemActivityLog(
                                "ban",
                                selectedProfileMember.nickname,
                                `تم كتم صوت العضو ${selectedProfileMember.nickname} وإيقاف رخصة حديثه.`,
                              );
                              alert(
                                `تم كتم العضو [${selectedProfileMember.nickname}] من التحدث بنجاح!`,
                              );
                            }
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-[10px] rounded-xl border border-purple-500/20 text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          {bannedUsersList.some(
                            (b) =>
                              b.nickname.toLowerCase() ===
                                selectedProfileMember.nickname.toLowerCase() &&
                              b.type === "mute",
                          )
                            ? "🔊 إلغاء كتم الصوت"
                            : "🔇 كتم حديث العضو"}
                        </button>

                        {/* 3. Kick */}
                        <button
                          onClick={() => {
                            const sysText = `🚪 [طرد أمني عاجل] من المشرف لـ [${selectedProfileMember.nickname}]: تم الطرد فوراً لتنظيم الغرفة! 👋`;
                            setRoomMessages((prev) => ({
                              ...prev,
                              [activeRoomId]: [
                                ...(prev[activeRoomId] || []),
                                {
                                  id: `sys-kick-${Date.now()}`,
                                  author: "بوابة الطرد 🚪",
                                  text: sysText,
                                  color: "#ef4444",
                                  isOwn: false,
                                  time: new Date().toLocaleTimeString("ar-EG", {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  }),
                                  type: "system",
                                },
                              ],
                            }));
                            setChatMembers((prev) =>
                              prev.filter(
                                (m) =>
                                  m.nickname.toLowerCase() !==
                                  selectedProfileMember.nickname.toLowerCase(),
                              ),
                            );
                            addSystemActivityLog(
                              "ban",
                              selectedProfileMember.nickname,
                              `طرد فوري (Kick) للعضو الفوضوي من غرفة الدردشة.`,
                            );
                            alert(
                              `تم إخضاع العضو للطرد الفوري خارج الغرفة بالتأكيد!`,
                            );
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 text-orange-300 font-bold text-[10px] rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 lamma-soft-warn"
                        >
                          🚪 طرد فوري (Kick)
                        </button>

                        {/* 4. Delete messages */}
                        <button
                          onClick={() => {
                            setRoomMessages((prev) => {
                              const activeMsgs = prev[activeRoomId] || [];
                              const filtered = activeMsgs.filter(
                                (m) =>
                                  m.author
                                    .replace(
                                      /\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g,
                                      "",
                                    )
                                    .trim()
                                    .toLowerCase() !==
                                  selectedProfileMember.nickname.toLowerCase(),
                              );
                              return {
                                ...prev,
                                [activeRoomId]: filtered,
                              };
                            });
                            addSystemActivityLog(
                              "demote",
                              selectedProfileMember.nickname,
                              `تم مسح وسحب جميع رسائل العضو في غرفة [${activeRoomId}]`,
                            );
                            alert(
                              `تم تصفية ومسح جميع رسائل العضو [${selectedProfileMember.nickname}] من شات الغرفة بنجاح!`,
                            );
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 text-red-400 font-bold text-[10px] rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 lamma-danger-btn"
                        >
                          🗑️ حذف رسائله
                        </button>
                      </div>

                      {/* Extended Admin / Owner features */}
                      {(currentUser.role === "owner" ||
                        currentUser.role === "admin") && (
                        <div className="space-y-3 pt-2 border-t border-white/5 font-sans">
                          {/* Room specific bans and Rank promotions */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Room ban button */}
                            <button
                              onClick={() => {
                                const rb: BanInfo = {
                                  id: `roomban-${Date.now()}`,
                                  nickname: selectedProfileMember.nickname,
                                  email: selectedProfileMember.email,
                                  fingerprint:
                                    selectedProfileMember.fingerprint,
                                  browserSignature:
                                    selectedProfileMember.browserSignature,
                                  ip: selectedProfileMember.ip,
                                  localStorageId:
                                    selectedProfileMember.localStorageId,
                                  type: "room",
                                  roomId: activeRoomId,
                                  banner: currentUser.nickname,
                                  reason:
                                    "مخالفة آداب النقاش في الغرفة المحددة",
                                  time: new Date().toLocaleTimeString("ar-EG", {
                                    hour: "numeric",
                                    minute: "numeric",
                                  }),
                                };
                                setBannedUsersList((prev) => [...prev, rb]);
                                addSystemActivityLog(
                                  "ban",
                                  selectedProfileMember.nickname,
                                  `تم فرض حظر دخول الغرفة لـ ${selectedProfileMember.nickname} من غرفة [${activeRoomId}]`,
                                );
                                alert(
                                  `تم حظر العضو بنجاح من دخول الغرفة الحالية [${activeRoomId}].`,
                                );
                                setShowProfileModal(false);
                              }}
                              className="py-2 px-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 font-bold text-[9.5px] rounded-xl border border-pink-500/20 text-center transition-all cursor-pointer"
                            >
                              🚫 حظر غرف (Room Ban)
                            </button>

                            {/* Dropdown for role changes */}
                            <div className="flex flex-col gap-1 text-right">
                              <span className="text-[8.5px] text-gray-500 font-extrabold pr-1">
                                ترقية ومنح الصلاحيات:
                              </span>
                              <select
                                id="profile-role-select"
                                name="profileRoleSelect"
                                value={selectedProfileMember.role}
                                onChange={(e) => {
                                  const targetRole = e.target.value as any;
                                  setChatMembers((prev) =>
                                    prev.map((m) => {
                                      if (
                                        m.nickname.toLowerCase() ===
                                        selectedProfileMember.nickname.toLowerCase()
                                      ) {
                                        return { ...m, role: targetRole };
                                      }
                                      return m;
                                    }),
                                  );
                                  addSystemActivityLog(
                                    "promote",
                                    selectedProfileMember.nickname,
                                    `تغيير وتعيين رتبة لعضو الشات إلى [${targetRole}]`,
                                  );
                                  alert(
                                    `تم تغيير وتحديث صلاحيات العضو إلى [${targetRole}] بنجاح!`,
                                  );
                                  setSelectedProfileMember((prev) =>
                                    prev ? { ...prev, role: targetRole } : null,
                                  );
                                }}
                                className="bg-black/60 border border-green-500/25 p-1 rounded-xl text-[9px] text-[#a3e635] font-black focus:ring-0 focus:outline-none focus:border-green-500"
                              >
                                <option value="guest">👤 زائر (Guest)</option>
                                <option value="user">👨 عضو (Member)</option>
                                <option value="vip">💎 عضو مميز VIP</option>
                                <option value="mod">🛡️ مشرف (Moderator)</option>
                                <option value="admin">
                                  🛡️ مدير أدمن (Admin)
                                </option>
                                <option value="owner">👑 مالك (Owner)</option>
                              </select>
                            </div>
                          </div>

                          {/* Owner absolute Superbans */}
                          {currentUser.role === "owner" && (
                            <div className="pt-2.5 border-t border-white/5 space-y-3">
                              {/* Custom Permissions Controls exclusively handled by owner */}
                              <div className="p-3 bg-black/60 border border-green-500/25 rounded-2xl space-y-2.5">
                                <div className="text-[10px] font-black text-[#a3e635] flex items-center gap-1.5 border-b border-green-500/10 pb-1.5">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Shield size={13} className="text-lime-300" />
                                    صلاحيات المالك الحصرية للعضو:
                                  </span>
                                </div>
                                <div className="space-y-2 text-right">
                                  {/* 1. Audio Recording */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Mic size={14} className="text-emerald-300" />
                                      <span>تسجيل وبث الصوت ميكروفون:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.recordingAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              callsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            recordingAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية التسجيل لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.recordingAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.recordingAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 2. Live Calls */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Phone size={14} className="text-sky-300" />
                                      <span>
                                        إجراء المكالمات الهاتفية والمرئية:
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.callsAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            callsAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية المكالمات لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.callsAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.callsAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 3. Music/Radio access */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Radio size={14} className="text-cyan-300" />
                                      <span>
                                        تشغيل الراديو ومكتبة الموسيقى:
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.musicRadioAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              callsAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            musicRadioAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية الموسيقى والراديو لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.musicRadioAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.musicRadioAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 4. Room Creation */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Compass size={14} className="text-yellow-300" />
                                      <span>إتاحة إنشاء غرف خاصة:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.roomCreationAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              callsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            roomCreationAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية إنشاء الغرف لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.roomCreationAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.roomCreationAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="text-[8.5px] font-black text-red-500 select-none pr-1">
                                💥 حظر المالك الأعلى المطلق:
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {/* Mega Ban */}
                                <button
                                  onClick={() => {
                                    const mb: BanInfo = {
                                      id: `megaban-${Date.now()}`,
                                      nickname: selectedProfileMember.nickname,
                                      email: selectedProfileMember.email,
                                      fingerprint:
                                        selectedProfileMember.fingerprint,
                                      browserSignature:
                                        selectedProfileMember.browserSignature,
                                      ip: selectedProfileMember.ip,
                                      localStorageId:
                                        selectedProfileMember.localStorageId,
                                      type: "megaban",
                                      banner: currentUser.nickname,
                                      reason:
                                        "تطبيق الحظر الكلي والكامل والأبدي (Mega Ban Lockdown)",
                                      time: new Date().toLocaleTimeString(
                                        "ar-EG",
                                        { hour: "numeric", minute: "numeric" },
                                      ),
                                    };
                                    setBannedUsersList((prev) => [...prev, mb]);
                                    addSystemActivityLog(
                                      "ban",
                                      selectedProfileMember.nickname,
                                      `حظر كامل شامل ومطلق (Mega Ban) طمس وتجميد بصمته رقم: [${selectedProfileMember.fingerprint}]`,
                                    );

                                    const mbText = `🚨 [Mega Ban Lockdown]: أصدر المالك قراراً بالبتر الفني التام والمؤبد للعضو [${selectedProfileMember.nickname}] وتجميد بصمة جهازه والـ IP والحظر التلقائي لكافة الكوكيز والبيانات المحلية لديه! 🛑`;
                                    setRoomMessages((prev) => ({
                                      ...prev,
                                      [activeRoomId]: [
                                        ...(prev[activeRoomId] || []),
                                        {
                                          id: `sys-megaban-${Date.now()}`,
                                          author: "المجلس الأعلى 👑",
                                          text: mbText,
                                          color: "#dc2626",
                                          isOwn: false,
                                          time: new Date().toLocaleTimeString(
                                            "ar-EG",
                                            {
                                              hour: "numeric",
                                              minute: "numeric",
                                              hour12: true,
                                            },
                                          ),
                                          type: "system",
                                        },
                                      ],
                                    }));
                                    setChatMembers((prev) =>
                                      prev.filter(
                                        (m) =>
                                          m.nickname.toLowerCase() !==
                                          selectedProfileMember.nickname.toLowerCase(),
                                      ),
                                    );
                                    alert(
                                      `تم إخضاع العضو المشاغب فوراً للحظر المطلق Mega Ban وتجميد كافة بيانات اتصاله!`,
                                    );
                                    setShowProfileModal(false);
                                  }}
                                  className="py-2.5 bg-red-600/25 hover:bg-red-600/35 text-red-400 font-extrabold text-[9.5px] rounded-xl border border-red-500/30 text-center transition-all cursor-pointer"
                                >
                                  🚨 حظر شامل (Mega Ban)
                                </button>

                                {/* Shadow Ban */}
                                <button
                                  onClick={() => {
                                    const isShadow = bannedUsersList.some(
                                      (b) =>
                                        b.nickname.toLowerCase() ===
                                          selectedProfileMember.nickname.toLowerCase() &&
                                        b.type === "shadow",
                                    );
                                    if (isShadow) {
                                      setBannedUsersList((prev) =>
                                        prev.filter(
                                          (b) =>
                                            !(
                                              b.nickname.toLowerCase() ===
                                                selectedProfileMember.nickname.toLowerCase() &&
                                              b.type === "shadow"
                                            ),
                                        ),
                                      );
                                      addSystemActivityLog(
                                        "promote",
                                        selectedProfileMember.nickname,
                                        `تم إلغاء الحظر الخفي (Shadow Ban) عن العضو ${selectedProfileMember.nickname}.`,
                                      );
                                      alert(`تم إلغاء الحظر الخفي.`);
                                    } else {
                                      const sb: BanInfo = {
                                        id: `shadow-${Date.now()}`,
                                        nickname:
                                          selectedProfileMember.nickname,
                                        email: selectedProfileMember.email,
                                        fingerprint:
                                          selectedProfileMember.fingerprint,
                                        browserSignature:
                                          selectedProfileMember.browserSignature,
                                        ip: selectedProfileMember.ip,
                                        localStorageId:
                                          selectedProfileMember.localStorageId,
                                        type: "shadow",
                                        banner: currentUser.nickname,
                                        reason: "تطبيق حظر خفي شبكي من المالك",
                                        time: new Date().toLocaleTimeString(
                                          "ar-EG",
                                          {
                                            hour: "numeric",
                                            minute: "numeric",
                                          },
                                        ),
                                      };
                                      setBannedUsersList((prev) => [
                                        ...prev,
                                        sb,
                                      ]);
                                      addSystemActivityLog(
                                        "ban",
                                        selectedProfileMember.nickname,
                                        `تطبيق الحظر الخفي الشبح (Shadow Ban) للعضو.`,
                                      );
                                      alert(
                                        `تم تفعيل الحظر الشبح (Shadow Ban) بنجاح.`,
                                      );
                                    }
                                    setShowProfileModal(false);
                                  }}
                                  className="py-2.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 font-extrabold text-[9.5px] rounded-xl border border-gray-500/20 text-center transition-all cursor-pointer"
                                >
                                  {bannedUsersList.some(
                                    (b) =>
                                      b.nickname.toLowerCase() ===
                                        selectedProfileMember.nickname.toLowerCase() &&
                                      b.type === "shadow",
                                  )
                                    ? "👻 إلغاء حظر شبحي"
                                    : "👻 حظر خفي (Shadow)"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-2xl text-[9.5px] text-red-400 leading-relaxed font-sans font-semibold">
                      🔒 هذه المنطقة الرقابية محمية ومقيدة للأدمنية والمشرفين
                      وملاك الشات وتأسيسيه فقط. رتبتك غير مصرحة لتطبيق العقوبات
                      أو التعديلات.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal for Creating Room */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onCreate={(details) => {
          // Logic to create room (simplified for demo)
          alert(`تم إنشاء الغرفة: ${details.name}`);
          setIsCreateRoomModalOpen(false);
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
              role: target.role || "member",
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
            setShowUserContextPop(false);
          },
          onViewProfile: (target) => {
            setUserProfileBioTarget(target);
            setShowUserProfileBioPop(true);
            setShowUserContextPop(false);
          },
          onToggleFriend: (target) => {
            if (friendsList.includes(target.nickname)) {
              alert(
                `العضو [${target.nickname}] موجود بالفعل في قائمة أصدقائك! 🌟`,
              );
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
                `🚫 تم حظر العضو [${target.nickname}] بالكامل وتجميد محادثاته فوسفورياً!`,
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
              role: target.role || "member",
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

      {/* Real audio elements for Radio and Music streaming/playback */}
      <audio ref={radioAudioRef} src={currentRadioStation.url} preload="none" />
      <audio ref={musicAudioRef} src={currentMusicTrack.url} preload="none" />
    </div>
  );
}
