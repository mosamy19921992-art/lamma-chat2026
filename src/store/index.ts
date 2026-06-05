// ============================================
// Zustand Store for Lamma Chat
// Global State Management
// ============================================

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { UserSession, Message, ChatMember, Room } from '../lib/chatTypes';

// ============================================
// Types
// ============================================

export interface ThemeState {
  primary: 'dark' | 'amoled';
  wall: 'fire' | 'ice' | 'violet';
  custom: string | null;
}

export interface UIState {
  sidebarOpen: boolean;
  membersListOpen: boolean;
  roomsListOpen: boolean;
  activeTab: 'rooms' | 'members' | 'private';
  zenMode: boolean;
  leftColumnCollapsed: boolean;
  rightColumnCollapsed: boolean;
}

export interface ChatState {
  currentRoom: string;
  rooms: Room[];
  messages: Record<string, Message[]>;
  members: ChatMember[];
  typingUsers: Record<string, string[]>;
  unreadCounts: Record<string, number>;
}

export interface UserState {
  session: UserSession | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  preferences: {
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    autoScroll: boolean;
  };
}

export interface AppState {
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  lastSync: number | null;
}

export interface StoreState {
  theme: ThemeState;
  ui: UIState;
  chat: ChatState;
  user: UserState;
  app: AppState;
}

// ============================================
// Initial State
// ============================================

const initialState: StoreState = {
  theme: {
    primary: 'dark',
    wall: 'fire',
    custom: null,
  },
  ui: {
    sidebarOpen: false,
    membersListOpen: false,
    roomsListOpen: false,
    activeTab: 'rooms',
    zenMode: false,
    leftColumnCollapsed: false,
    rightColumnCollapsed: false,
  },
  chat: {
    currentRoom: 'egypt',
    rooms: [],
    messages: {},
    members: [],
    typingUsers: {},
    unreadCounts: {},
  },
  user: {
    session: null,
    isAuthenticated: false,
    isGuest: false,
    preferences: {
      soundEnabled: true,
      notificationsEnabled: true,
      autoScroll: true,
    },
  },
  app: {
    isLoading: true,
    isOnline: true,
    error: null,
    lastSync: null,
  },
};

// ============================================
// Store Creation
// ============================================

export const useStore = create<StoreState>()(
  subscribeWithSelector(
    immer(
      persist(
        (set, get) => ({
          ...initialState,

          // Theme Actions
          setPrimaryTheme: (theme: 'dark' | 'amoled') => {
            set((state) => {
              state.theme.primary = theme;
            });
          },

          setWallTheme: (wall: 'fire' | 'ice' | 'violet') => {
            set((state) => {
              state.theme.wall = wall;
            });
          },

          setCustomTheme: (color: string | null) => {
            set((state) => {
              state.theme.custom = color;
            });
          },

          // UI Actions
          toggleSidebar: () => {
            set((state) => {
              state.ui.sidebarOpen = !state.ui.sidebarOpen;
            });
          },

          toggleMembersList: () => {
            set((state) => {
              state.ui.membersListOpen = !state.ui.membersListOpen;
            });
          },

          toggleRoomsList: () => {
            set((state) => {
              state.ui.roomsListOpen = !state.ui.roomsListOpen;
            });
          },

          setActiveTab: (tab: 'rooms' | 'members' | 'private') => {
            set((state) => {
              state.ui.activeTab = tab;
            });
          },

          toggleZenMode: () => {
            set((state) => {
              state.ui.zenMode = !state.ui.zenMode;
            });
          },

          // Chat Actions
          setCurrentRoom: (roomId: string) => {
            set((state) => {
              state.chat.currentRoom = roomId;
              // Reset unread count for this room
              state.chat.unreadCounts[roomId] = 0;
            });
          },

          addMessage: (roomId: string, message: Message) => {
            set((state) => {
              if (!state.chat.messages[roomId]) {
                state.chat.messages[roomId] = [];
              }
              state.chat.messages[roomId].push(message);
              
              // Increment unread count if not in current room
              if (state.chat.currentRoom !== roomId) {
                state.chat.unreadCounts[roomId] = (state.chat.unreadCounts[roomId] || 0) + 1;
              }
            });
          },

          setMessages: (roomId: string, messages: Message[]) => {
            set((state) => {
              state.chat.messages[roomId] = messages;
            });
          },

          clearMessages: (roomId: string) => {
            set((state) => {
              delete state.chat.messages[roomId];
            });
          },

          setMembers: (members: ChatMember[]) => {
            set((state) => {
              state.chat.members = members;
            });
          },

          addMember: (member: ChatMember) => {
            set((state) => {
              const exists = state.chat.members.find(m => m.id === member.id);
              if (!exists) {
                state.chat.members.push(member);
              }
            });
          },

          removeMember: (memberId: string) => {
            set((state) => {
              state.chat.members = state.chat.members.filter(m => m.id !== memberId);
            });
          },

          // User Actions
          setUserSession: (session: UserSession | null) => {
            set((state) => {
              state.user.session = session;
              state.user.isAuthenticated = !!session;
              state.user.isGuest = session?.authProvider === 'guest';
            });
          },

          logout: () => {
            set((state) => {
              state.user.session = null;
              state.user.isAuthenticated = false;
              state.user.isGuest = false;
            });
          },

          setPreference: (key: keyof UserState['preferences'], value: boolean) => {
            set((state) => {
              state.user.preferences[key] = value;
            });
          },

          // App Actions
          setLoading: (loading: boolean) => {
            set((state) => {
              state.app.isLoading = loading;
            });
          },

          setOnline: (online: boolean) => {
            set((state) => {
              state.app.isOnline = online;
            });
          },

          setError: (error: string | null) => {
            set((state) => {
              state.app.error = error;
            });
          },

          clearError: () => {
            set((state) => {
              state.app.error = null;
            });
          },

          setLastSync: (timestamp: number) => {
            set((state) => {
              state.app.lastSync = timestamp;
            });
          },

          // Reset
          reset: () => {
            set((state) => {
              Object.assign(state, initialState);
            });
          },
        }),
        {
          name: 'lamma-chat-storage',
          partialize: (state) => ({
            theme: state.theme,
            user: {
              preferences: state.user.preferences,
            },
          }),
        }
      )
    )
  )
);

// ============================================
// Selectors (for performance)
// ============================================

export const selectCurrentUser = (state: StoreState) => state.user.session;
export const selectIsAuthenticated = (state: StoreState) => state.user.isAuthenticated;
export const selectCurrentRoom = (state: StoreState) => state.chat.currentRoom;
export const selectCurrentRoomMessages = (state: StoreState) => 
  state.chat.messages[state.chat.currentRoom] || [];
export const selectUnreadCount = (state: StoreState, roomId: string) => 
  state.chat.unreadCounts[roomId] || 0;
export const selectTotalUnread = (state: StoreState) => 
  Object.values(state.chat.unreadCounts).reduce((a, b) => a + b, 0);

export default useStore;
