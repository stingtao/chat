import { create } from 'zustand';
import { ClientUser, Workspace, Message, Friendship, Group } from '@/lib/types';

interface ChatStore {
  // User & Auth
  user: ClientUser | null;
  token: string | null;
  setUser: (user: ClientUser | null) => void;
  setToken: (token: string | null) => void;

  // Current workspace
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;

  // Current conversation
  currentConversationId: string | null;
  currentConversationType: 'direct' | 'group' | null;
  setCurrentConversation: (id: string | null, type: 'direct' | 'group' | null) => void;

  // Messages
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  // Friends
  friends: Friendship[];
  setFriends: (friends: Friendship[]) => void;

  // Groups
  groups: Group[];
  setGroups: (groups: Group[]) => void;

  // UI State
  showWorkspaceSwitcher: boolean;
  showFriendList: boolean;
  toggleWorkspaceSwitcher: () => void;
  toggleFriendList: () => void;

  // Reset
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // Initial state
  user: null,
  token: null,
  currentWorkspace: null,
  workspaces: [],
  currentConversationId: null,
  currentConversationType: null,
  messages: [],
  friends: [],
  groups: [],
  showWorkspaceSwitcher: false,
  showFriendList: false,

  // Actions
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentConversation: (id, type) =>
    set({ currentConversationId: id, currentConversationType: type }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setFriends: (friends) => set({ friends }),
  setGroups: (groups) => set({ groups }),
  toggleWorkspaceSwitcher: () =>
    set((state) => ({ showWorkspaceSwitcher: !state.showWorkspaceSwitcher })),
  toggleFriendList: () =>
    set((state) => ({ showFriendList: !state.showFriendList })),
  reset: () => set({
    user: null,
    token: null,
    currentWorkspace: null,
    workspaces: [],
    currentConversationId: null,
    currentConversationType: null,
    messages: [],
    friends: [],
    groups: [],
    showWorkspaceSwitcher: false,
    showFriendList: false,
  }),
}));
