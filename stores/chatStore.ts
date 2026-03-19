import { create } from 'zustand';
import { ClientUser, Workspace, Message, Friendship, Group } from '@/lib/types';
import { appendReadByUser, mergeMessagesById } from '@/lib/utils';

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
  setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  mergeMessages: (messages: Message[]) => void;
  markMessagesRead: (messageIds: string[], userId: string) => void;

  // Friends
  friends: Friendship[];
  setFriends: (friends: Friendship[] | ((friends: Friendship[]) => Friendship[])) => void;

  // Groups
  groups: Group[];
  setGroups: (groups: Group[] | ((groups: Group[]) => Group[])) => void;

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
  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === 'function' ? messages(state.messages) : messages,
    })),
  addMessage: (message) =>
    set((state) => ({ messages: mergeMessagesById(state.messages, message) })),
  mergeMessages: (messages) =>
    set((state) => ({ messages: mergeMessagesById(state.messages, messages) })),
  markMessagesRead: (messageIds, userId) =>
    set((state) => {
      if (messageIds.length === 0) {
        return { messages: state.messages };
      }

      const messageIdSet = new Set(messageIds);
      return {
        messages: state.messages.map((message) =>
          messageIdSet.has(message.id)
            ? { ...message, readBy: appendReadByUser(message.readBy, userId) }
            : message
        ),
      };
    }),
  setFriends: (friends) =>
    set((state) => ({
      friends: typeof friends === 'function' ? friends(state.friends) : friends,
    })),
  setGroups: (groups) =>
    set((state) => ({
      groups: typeof groups === 'function' ? groups(state.groups) : groups,
    })),
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
