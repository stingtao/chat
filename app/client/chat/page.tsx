'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/lib/api';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import WorkspaceSwitcher from '@/components/chat/WorkspaceSwitcher';
import FriendList from '@/components/chat/FriendList';
import FriendRequests from '@/components/chat/FriendRequests';
import CreateGroup from '@/components/chat/CreateGroup';
import GroupSettings from '@/components/chat/GroupSettings';
import ProfileSettings from '@/components/chat/ProfileSettings';
import { useMessagePolling } from '@/hooks/useMessagePolling';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useWorkspaceRealtime } from '@/hooks/useWorkspaceRealtime';
import { useStatusUpdate } from '@/hooks/useStatusUpdate';
import {
  FriendAcceptedEventPayload,
  FriendRequestEventPayload,
  GroupDeletedEventPayload,
  GroupRealtimeEventPayload,
  Friendship,
  Group,
  Message,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberJoinedEventPayload,
  WorkspaceMemberRemovedEventPayload,
  WorkspaceMemberUpdatedEventPayload,
} from '@/lib/types';
import { getContrastColor, hexToRgba, isUserOnline, normalizeHexColor } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang, useLangHref } from '@/hooks/useLang';
import ClientImage from '@/components/ui/ClientImage';

const CONVERSATION_LIST_POLL_INTERVAL_MS = 8000;

export default function ChatPage() {
  const router = useRouter();
  const {
    user,
    setUser,
    setToken,
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    setWorkspaces,
    currentConversationId,
    currentConversationType,
    setCurrentConversation,
    messages,
    setMessages,
    addMessage,
    markMessagesRead,
    friends,
    setFriends,
    groups,
    setGroups,
    showWorkspaceSwitcher,
    showFriendList,
    toggleWorkspaceSwitcher,
    toggleFriendList,
    reset,
  } = useChatStore();

  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [currentMemberTag, setCurrentMemberTag] = useState<string>('');
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<Friendship[]>([]);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [workspaceSwitcherJoinMode, setWorkspaceSwitcherJoinMode] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const seenFriendRequestIdsRef = useRef<Record<string, Set<string>>>({});
  const friendshipRefreshRequestIdRef = useRef(0);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const markConversationReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lang = useLang();
  const t = getTranslations(lang);
  const withLang = useLangHref();

  const hasWorkspace = Boolean(currentWorkspace);
  const currentWorkspaceId = currentWorkspace?.id || null;
  const workspaceName = currentWorkspace?.name || t.chat.noWorkspaceTitle;
  const workspaceInitials = currentWorkspace?.name
    ? currentWorkspace.name.substring(0, 2).toUpperCase()
    : '++';
  const workspaceLogo = currentWorkspace?.settings?.logo;
  const workspaceSettings = currentWorkspace?.settings;
  const primaryColor = normalizeHexColor(workspaceSettings?.primaryColor, '#3b82f6');
  const secondaryColor = normalizeHexColor(workspaceSettings?.secondaryColor, '#10b981');
  const themeStyle = {
    '--ws-primary': primaryColor,
    '--ws-secondary': secondaryColor,
    '--ws-primary-soft': hexToRgba(primaryColor, 0.12),
    '--ws-secondary-soft': hexToRgba(secondaryColor, 0.12),
    '--ws-primary-text': getContrastColor(primaryColor),
    '--ws-secondary-text': getContrastColor(secondaryColor),
  } as CSSProperties;
  const welcomeMessage = hasWorkspace ? workspaceSettings?.welcomeMessage?.trim() : undefined;
  const allowGroupChat = hasWorkspace ? (workspaceSettings?.allowGroupChat ?? true) : false;
  const maxGroupSize = workspaceSettings?.maxGroupSize ?? 100;
  const canCreateGroup = hasWorkspace && allowGroupChat;
  const getSeenRequestIds = (workspaceId: string) => {
    if (!seenFriendRequestIdsRef.current[workspaceId]) {
      seenFriendRequestIdsRef.current[workspaceId] = new Set<string>();
    }
    return seenFriendRequestIdsRef.current[workspaceId];
  };

  const incomingPendingFriendRequests = useMemo(
    () =>
      currentWorkspace && user
        ? pendingFriendRequests.filter(
            (request) => request.receiverId === user.id && request.status === 'pending'
          )
        : [],
    [currentWorkspace, pendingFriendRequests, user]
  );
  const hasUnseenFriendRequests =
    currentWorkspace && user
      ? incomingPendingFriendRequests.some(
          (request) => !getSeenRequestIds(currentWorkspace.id).has(request.id)
        )
      : false;

  const upsertPendingFriendRequest = useCallback((friendship: Friendship) => {
    setPendingFriendRequests((currentRequests) => {
      const nextRequests = currentRequests.filter((request) => request.id !== friendship.id);
      return [friendship, ...nextRequests];
    });
  }, []);

  const removePendingFriendRequest = useCallback((friendshipId: string) => {
    setPendingFriendRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== friendshipId)
    );
  }, []);

  const buildAcceptedFriendship = useCallback((friendship: Friendship) => {
    if (!user) {
      return null;
    }

    const otherUser =
      friendship.senderId === user.id ? friendship.receiver : friendship.sender;
    if (!otherUser) {
      return null;
    }

    const workspaceMember = workspaceMembers.find((member) => member.userId === otherUser.id);
    return {
      ...friendship,
      friend: {
        ...otherUser,
        isOnline: workspaceMember?.user?.isOnline ?? otherUser.isOnline,
        lastSeenAt:
          workspaceMember?.user?.lastSeenAt ||
          workspaceMember?.lastSeenAt ||
          otherUser.lastSeenAt,
      },
      unreadCount: friendship.unreadCount ?? 0,
    };
  }, [user, workspaceMembers]);

  const upsertAcceptedFriendship = useCallback((friendship: Friendship) => {
    const nextFriendship = buildAcceptedFriendship(friendship);
    if (!nextFriendship?.friend?.id) {
      return;
    }

    setFriends((currentFriends) => {
      const existingFriendship = currentFriends.find(
        (currentFriendship) => currentFriendship.friend?.id === nextFriendship.friend?.id
      );

      if (!existingFriendship) {
        return [nextFriendship, ...currentFriends];
      }

      return currentFriends.map((currentFriendship) =>
        currentFriendship.friend?.id === nextFriendship.friend?.id
          ? {
              ...currentFriendship,
              ...nextFriendship,
              friend: {
                ...currentFriendship.friend,
                ...nextFriendship.friend,
              },
              lastMessage: currentFriendship.lastMessage || nextFriendship.lastMessage,
              unreadCount: currentFriendship.unreadCount ?? nextFriendship.unreadCount ?? 0,
            }
          : currentFriendship
      );
    });
  }, [buildAcceptedFriendship, setFriends]);

  const upsertGroupSummary = useCallback((group: Group) => {
    setGroups((currentGroups) => {
      const existingGroup = currentGroups.find(
        (currentGroupItem) => currentGroupItem.id === group.id
      );

      if (!existingGroup) {
        return [group, ...currentGroups];
      }

      return currentGroups.map((currentGroupItem) =>
        currentGroupItem.id === group.id
          ? {
              ...currentGroupItem,
              ...group,
              lastMessage: currentGroupItem.lastMessage || group.lastMessage,
              unreadCount: currentGroupItem.unreadCount ?? group.unreadCount ?? 0,
            }
          : currentGroupItem
      );
    });
  }, [setGroups]);

  const removeGroupSummary = useCallback((groupId: string) => {
    setGroups((currentGroups) =>
      currentGroups.filter((currentGroupItem) => currentGroupItem.id !== groupId)
    );

    if (currentConversationType === 'group' && currentConversationId === groupId) {
      setCurrentConversation(null, null);
      setMessages([]);
      setShowGroupSettings(false);
    }
  }, [
    currentConversationId,
    currentConversationType,
    setCurrentConversation,
    setGroups,
    setMessages,
  ]);

  const upsertWorkspaceMember = useCallback((member: WorkspaceMember) => {
    setWorkspaceMembers((currentMembers) => {
      const existingMember = currentMembers.find(
        (currentMember) => currentMember.userId === member.userId
      );

      if (!existingMember) {
        return [member, ...currentMembers];
      }

      return currentMembers.map((currentMember) =>
        currentMember.userId === member.userId
          ? {
              ...currentMember,
              ...member,
              user: member.user
                ? {
                    ...currentMember.user,
                    ...member.user,
                    isOnline: currentMember.user?.isOnline ?? member.user.isOnline,
                    lastSeenAt: currentMember.user?.lastSeenAt || member.user.lastSeenAt,
                  }
                : currentMember.user,
            }
          : currentMember
      );
    });

    if (member.userId === user?.id) {
      setCurrentMemberTag(member.memberTag);
    }
  }, [user?.id]);

  const applyWorkspaceMemberProfile = useCallback((member: WorkspaceMember) => {
    upsertWorkspaceMember(member);

    if (!member.user) {
      return;
    }

    const nextUser = member.user;
    const lastSeenAt = member.lastSeenAt;

    if (nextUser.id === user?.id) {
      setUser({
        ...user,
        ...nextUser,
        isOnline: user.isOnline ?? nextUser.isOnline,
        lastSeenAt: user.lastSeenAt || lastSeenAt,
      });
    }

    setFriends((currentFriends) =>
      currentFriends.map((friendship) => ({
        ...friendship,
        friend:
          friendship.friend?.id === nextUser.id
            ? {
                ...friendship.friend,
                ...nextUser,
                isOnline: friendship.friend.isOnline ?? nextUser.isOnline,
                lastSeenAt: friendship.friend.lastSeenAt || lastSeenAt,
              }
            : friendship.friend,
        sender:
          friendship.sender?.id === nextUser.id
            ? {
                ...friendship.sender,
                ...nextUser,
                isOnline: friendship.sender.isOnline ?? nextUser.isOnline,
                lastSeenAt: friendship.sender.lastSeenAt || lastSeenAt,
              }
            : friendship.sender,
        receiver:
          friendship.receiver?.id === nextUser.id
            ? {
                ...friendship.receiver,
                ...nextUser,
                isOnline: friendship.receiver.isOnline ?? nextUser.isOnline,
                lastSeenAt: friendship.receiver.lastSeenAt || lastSeenAt,
              }
            : friendship.receiver,
      }))
    );

    setPendingFriendRequests((currentRequests) =>
      currentRequests.map((request) => ({
        ...request,
        sender:
          request.sender?.id === nextUser.id
            ? {
                ...request.sender,
                ...nextUser,
                isOnline: request.sender.isOnline ?? nextUser.isOnline,
                lastSeenAt: request.sender.lastSeenAt || lastSeenAt,
              }
            : request.sender,
        receiver:
          request.receiver?.id === nextUser.id
            ? {
                ...request.receiver,
                ...nextUser,
                isOnline: request.receiver.isOnline ?? nextUser.isOnline,
                lastSeenAt: request.receiver.lastSeenAt || lastSeenAt,
              }
            : request.receiver,
      }))
    );

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.senderId === nextUser.id
          ? {
              ...message,
              senderName: nextUser.username,
              senderAvatar: nextUser.avatar,
            }
          : message
      )
    );
  }, [setFriends, setMessages, upsertWorkspaceMember, user, setUser]);

  const removeWorkspaceMember = useCallback((userId: string) => {
    const typingTimeout = typingTimeoutsRef.current[userId];
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      delete typingTimeoutsRef.current[userId];
    }

    setTypingUserIds((currentIds) => currentIds.filter((currentId) => currentId !== userId));
    setWorkspaceMembers((currentMembers) =>
      currentMembers.filter((member) => member.userId !== userId)
    );
    setFriends((currentFriends) =>
      currentFriends.filter((friendship) => friendship.friend?.id !== userId)
    );
    setPendingFriendRequests((currentRequests) =>
      currentRequests.filter(
        (request) => request.senderId !== userId && request.receiverId !== userId
      )
    );

    if (currentConversationType === 'direct' && currentConversationId === userId) {
      setCurrentConversation(null, null);
      setMessages([]);
    }
  }, [
    currentConversationId,
    currentConversationType,
    setCurrentConversation,
    setFriends,
    setMessages,
  ]);

  const handleCurrentUserRemovedFromWorkspace = useCallback((workspaceId: string) => {
    if (currentWorkspace?.id !== workspaceId) {
      return;
    }

    friendshipRefreshRequestIdRef.current += 1;
    const nextWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId);

    if (showFriendList) {
      toggleFriendList();
    }

    if (showWorkspaceSwitcher) {
      toggleWorkspaceSwitcher();
    }

    setShowFriendRequests(false);
    setShowCreateGroup(false);
    setShowGroupSettings(false);
    setShowProfileSettings(false);
    setTypingUserIds([]);
    setCurrentConversation(null, null);
    setMessages([]);
    setFriends([]);
    setGroups([]);
    setWorkspaceMembers([]);
    setPendingFriendRequests([]);
    setCurrentMemberTag('');
    setMessagesLoading(false);
    setWorkspaces(nextWorkspaces);
    setCurrentWorkspace(nextWorkspaces[0] || null);
  }, [
    currentWorkspace?.id,
    setCurrentConversation,
    setCurrentWorkspace,
    setFriends,
    setGroups,
    setMessages,
    setWorkspaces,
    showFriendList,
    showWorkspaceSwitcher,
    toggleFriendList,
    toggleWorkspaceSwitcher,
    workspaces,
  ]);

  const applyActiveConversationState = useCallback((
    nextFriends: Friendship[] | null,
    nextGroups: Group[] | null
  ) => ({
    friends:
      nextFriends?.map((friendship) =>
        currentConversationType === 'direct' && friendship.friend?.id === currentConversationId
          ? { ...friendship, unreadCount: 0 }
          : friendship
      ) || null,
    groups:
      nextGroups?.map((group) =>
        currentConversationType === 'group' && group.id === currentConversationId
          ? { ...group, unreadCount: 0 }
          : group
      ) || null,
  }), [currentConversationId, currentConversationType]);

  const fetchFriendshipState = useCallback(async (workspaceId: string) => {
    if (!user) {
      return {
        friends: null,
        requests: null,
      };
    }

    const [friendsResponse, requestsResponse] = await Promise.all([
      api.getFriends(workspaceId),
      api.getFriendRequests(workspaceId),
    ]);

    return {
      friends: friendsResponse.success && friendsResponse.data ? friendsResponse.data : null,
      requests: requestsResponse.success && requestsResponse.data
        ? (requestsResponse.data as Friendship[])
        : null,
    };
  }, [user]);

  const applyFriendshipState = useCallback((
    nextFriends: Friendship[] | null,
    nextRequests: Friendship[] | null
  ) => {
    const nextCollections = applyActiveConversationState(nextFriends, null);

    if (nextCollections.friends) {
      setFriends(nextCollections.friends);
    }

    if (nextRequests) {
      setPendingFriendRequests(nextRequests);
    }
  }, [applyActiveConversationState, setFriends]);

  const refreshFriendshipState = useCallback(async (workspaceId: string) => {
    const requestId = ++friendshipRefreshRequestIdRef.current;
    const nextFriendshipState = await fetchFriendshipState(workspaceId);

    if (requestId !== friendshipRefreshRequestIdRef.current) {
      return;
    }

    applyFriendshipState(
      nextFriendshipState.friends,
      nextFriendshipState.requests
    );
  }, [applyFriendshipState, fetchFriendshipState]);

  const clearTypingUser = useCallback((userId: string) => {
    const timeout = typingTimeoutsRef.current[userId];
    if (timeout) {
      clearTimeout(timeout);
      delete typingTimeoutsRef.current[userId];
    }

    setTypingUserIds((currentIds) => currentIds.filter((currentId) => currentId !== userId));
  }, []);

  const updatePresenceForUser = useCallback((userId: string, isOnline: boolean) => {
    const presenceTimestamp = new Date().toISOString();

    setFriends((currentFriends) =>
      currentFriends.map((friendship) =>
        friendship.friend?.id === userId
          ? {
              ...friendship,
              friend: {
                ...friendship.friend,
                isOnline,
                lastSeenAt: presenceTimestamp,
              },
            }
          : friendship
      )
    );

    setWorkspaceMembers((currentMembers) =>
      currentMembers.map((member) =>
        member.userId === userId
          ? {
              ...member,
              lastSeenAt: presenceTimestamp,
              user: member.user
                ? {
                    ...member.user,
                    isOnline,
                    lastSeenAt: presenceTimestamp,
                  }
                : member.user,
            }
          : member
      )
    );
  }, [setFriends]);

  const handleTypingStartEvent = useCallback((senderId: string) => {
    if (!senderId || senderId === user?.id) {
      return;
    }

    setTypingUserIds((currentIds) =>
      currentIds.includes(senderId) ? currentIds : [...currentIds, senderId]
    );

    const timeout = typingTimeoutsRef.current[senderId];
    if (timeout) {
      clearTimeout(timeout);
    }

    typingTimeoutsRef.current[senderId] = setTimeout(() => {
      clearTypingUser(senderId);
    }, 3000);
  }, [clearTypingUser, user?.id]);

  const handleTypingStopEvent = useCallback((senderId: string) => {
    if (!senderId) {
      return;
    }

    clearTypingUser(senderId);
  }, [clearTypingUser]);

  const scheduleMarkConversationRead = useCallback(() => {
    if (!currentWorkspace || !currentConversationId || !currentConversationType || !user) {
      return;
    }

    if (markConversationReadTimeoutRef.current) {
      clearTimeout(markConversationReadTimeoutRef.current);
    }

    markConversationReadTimeoutRef.current = setTimeout(() => {
      void (async () => {
        const response = await api.markConversationRead({
          workspaceId: currentWorkspace.id,
          receiverId: currentConversationType === 'direct' ? currentConversationId : undefined,
          groupId: currentConversationType === 'group' ? currentConversationId : undefined,
        });

        if (response.success && response.data?.messageIds?.length) {
          markMessagesRead(response.data.messageIds, user.id);
        }
      })();
    }, 120);
  }, [
    currentConversationId,
    currentConversationType,
    currentWorkspace,
    markMessagesRead,
    user,
  ]);

  const openWorkspaceSwitcher = (mode: 'list' | 'join' = 'list') => {
    setWorkspaceSwitcherJoinMode(mode === 'join');
    if (!showWorkspaceSwitcher) {
      toggleWorkspaceSwitcher();
    }
  };

  const closeWorkspaceSwitcher = () => {
    if (showWorkspaceSwitcher) {
      toggleWorkspaceSwitcher();
    }
    setWorkspaceSwitcherJoinMode(false);
  };

  const selectWorkspace = (workspace: Workspace, options?: { closeSwitcher?: boolean }) => {
    if (currentWorkspace?.id === workspace.id) {
      if (options?.closeSwitcher) {
        closeWorkspaceSwitcher();
      }
      return;
    }

    friendshipRefreshRequestIdRef.current += 1;
    setCurrentConversation(null, null);
    setMessages([]);
    setFriends([]);
    setGroups([]);
    setWorkspaceMembers([]);
    setPendingFriendRequests([]);
    setCurrentMemberTag('');
    setMessagesLoading(false);
    setCurrentWorkspace(workspace);

    if (options?.closeSwitcher) {
      closeWorkspaceSwitcher();
    }
  };

  const clearConversationUnread = useCallback((
    conversationId: string,
    conversationType: 'direct' | 'group'
  ) => {
    if (conversationType === 'direct') {
      setFriends((currentFriends) =>
        currentFriends.map((friendship) =>
          friendship.friend?.id === conversationId
            ? { ...friendship, unreadCount: 0 }
            : friendship
        )
      );
      return;
    }

    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === conversationId
          ? { ...group, unreadCount: 0 }
          : group
      )
    );
  }, [setFriends, setGroups]);

  const updateConversationActivity = useCallback((options: {
    conversationId: string;
    conversationType: 'direct' | 'group';
    message: Message;
    unreadBehavior?: 'preserve' | 'clear' | 'increment';
  }) => {
    if (options.conversationType === 'direct') {
      setFriends((currentFriends) =>
        currentFriends.map((friendship) =>
          friendship.friend?.id === options.conversationId
            ? {
                ...friendship,
                lastMessage: options.message,
                unreadCount:
                  options.unreadBehavior === 'clear'
                    ? 0
                    : options.unreadBehavior === 'increment'
                      ? (friendship.unreadCount || 0) + 1
                      : friendship.unreadCount,
              }
            : friendship
        )
      );
      return;
    }

    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === options.conversationId
          ? {
              ...group,
              lastMessage: options.message,
              unreadCount:
                options.unreadBehavior === 'clear'
                  ? 0
                  : options.unreadBehavior === 'increment'
                    ? (group.unreadCount || 0) + 1
                    : group.unreadCount,
            }
          : group
      )
    );
  }, [setFriends, setGroups]);

  const handleSelectConversation = useCallback((conversationId: string, conversationType: 'direct' | 'group') => {
    clearConversationUnread(conversationId, conversationType);
    setCurrentConversation(conversationId, conversationType);
  }, [clearConversationUnread, setCurrentConversation]);

  const handleWorkspaceRealtimeMessage = useCallback((message: Message) => {
    if (!user) {
      return;
    }

    const conversationType = message.groupId ? 'group' : 'direct';
    const conversationId = message.groupId || (
      message.senderId === user.id ? message.receiverId : message.senderId
    );

    if (!conversationId) {
      return;
    }

    const isActiveConversation =
      currentConversationId === conversationId &&
      currentConversationType === conversationType;
    const isOwnMessage = message.senderId === user.id;

    updateConversationActivity({
      conversationId,
      conversationType,
      message,
      unreadBehavior: isActiveConversation
        ? 'clear'
        : isOwnMessage
          ? 'preserve'
          : 'increment',
    });

    if (isActiveConversation && !isOwnMessage) {
      scheduleMarkConversationRead();
    }
  }, [
    currentConversationId,
    currentConversationType,
    scheduleMarkConversationRead,
    updateConversationActivity,
    user,
  ]);

  const handleFriendRequestEvent = useCallback((payload: FriendRequestEventPayload) => {
    if (!user) {
      return;
    }

    const friendship = payload.friendship;
    if (!friendship?.id) {
      return;
    }

    const isParticipant =
      friendship.senderId === user.id || friendship.receiverId === user.id;
    if (!isParticipant) {
      return;
    }

    if (payload.action === 'rejected') {
      removePendingFriendRequest(friendship.id);
      void refreshFriendshipState(payload.workspaceId);
      return;
    }

    upsertPendingFriendRequest(friendship);
    void refreshFriendshipState(payload.workspaceId);

    if (showFriendRequests && friendship.receiverId === user.id) {
      getSeenRequestIds(payload.workspaceId).add(friendship.id);
    }
  }, [
    refreshFriendshipState,
    removePendingFriendRequest,
    showFriendRequests,
    upsertPendingFriendRequest,
    user,
  ]);

  const handleFriendAcceptedEvent = useCallback((payload: FriendAcceptedEventPayload) => {
    if (!user) {
      return;
    }

    const friendship = payload.friendship;
    if (!friendship?.id) {
      return;
    }

    const isParticipant =
      friendship.senderId === user.id || friendship.receiverId === user.id;
    if (!isParticipant) {
      return;
    }

    removePendingFriendRequest(friendship.id);
    upsertAcceptedFriendship(friendship);
    void refreshFriendshipState(payload.workspaceId);
  }, [
    refreshFriendshipState,
    removePendingFriendRequest,
    upsertAcceptedFriendship,
    user,
  ]);

  const handleGroupCreatedEvent = useCallback((payload: GroupRealtimeEventPayload) => {
    if (!user || !payload.memberIds.includes(user.id)) {
      return;
    }

    upsertGroupSummary(payload.group);
  }, [upsertGroupSummary, user]);

  const handleGroupUpdatedEvent = useCallback((payload: GroupRealtimeEventPayload) => {
    if (!user) {
      return;
    }

    if (payload.memberIds.includes(user.id)) {
      upsertGroupSummary(payload.group);
      return;
    }

    removeGroupSummary(payload.group.id);
  }, [removeGroupSummary, upsertGroupSummary, user]);

  const handleGroupDeletedEvent = useCallback((payload: GroupDeletedEventPayload) => {
    removeGroupSummary(payload.groupId);
  }, [removeGroupSummary]);

  const handleWorkspaceMemberJoinedEvent = useCallback((
    payload: WorkspaceMemberJoinedEventPayload
  ) => {
    upsertWorkspaceMember(payload.member);
  }, [upsertWorkspaceMember]);

  const handleWorkspaceMemberRemovedEvent = useCallback((
    payload: WorkspaceMemberRemovedEventPayload
  ) => {
    if (payload.userId === user?.id) {
      handleCurrentUserRemovedFromWorkspace(payload.workspaceId);
      return;
    }

    removeWorkspaceMember(payload.userId);
  }, [handleCurrentUserRemovedFromWorkspace, removeWorkspaceMember, user?.id]);

  const handleWorkspaceMemberUpdatedEvent = useCallback((
    payload: WorkspaceMemberUpdatedEventPayload
  ) => {
    applyWorkspaceMemberProfile(payload.member);
  }, [applyWorkspaceMemberProfile]);

  const { connected: realtimeConnected, sendEvent } = useRealtimeChat({
    onIncomingMessage: (message) => {
      if (message.senderId !== user?.id) {
        scheduleMarkConversationRead();
      }
    },
    onMessageRead: (payload) => {
      if (!payload.userId || !payload.messageIds?.length) {
        return;
      }

      markMessagesRead(payload.messageIds, payload.userId);
    },
    onTypingStart: (payload) => {
      if (payload.senderId) {
        handleTypingStartEvent(payload.senderId);
      }
    },
    onTypingStop: (payload) => {
      if (payload.senderId) {
        handleTypingStopEvent(payload.senderId);
      }
    },
  });
  const { connected: workspaceRealtimeConnected } = useWorkspaceRealtime({
    onMessage: handleWorkspaceRealtimeMessage,
    onUserOnline: (userId) => {
      updatePresenceForUser(userId, true);
    },
    onUserOffline: (userId) => {
      updatePresenceForUser(userId, false);
    },
    onFriendRequest: handleFriendRequestEvent,
    onFriendAccepted: handleFriendAcceptedEvent,
    onGroupCreated: handleGroupCreatedEvent,
    onGroupUpdated: handleGroupUpdatedEvent,
    onGroupDeleted: handleGroupDeletedEvent,
    onWorkspaceMemberJoined: handleWorkspaceMemberJoinedEvent,
    onWorkspaceMemberRemoved: handleWorkspaceMemberRemovedEvent,
    onWorkspaceMemberUpdated: handleWorkspaceMemberUpdatedEvent,
  });

  // Enable message polling for real-time updates (fallback when websocket is down)
  useMessagePolling(3000, !realtimeConnected);

  // Update user's online status every 30 seconds
  useStatusUpdate(30000);

  // Initialize auth from cookie-backed session
  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      setAuthReady(false);
      api.setToken(null);

      const response = await api.getClientSession();
      if (cancelled) {
        return;
      }

      if (response.success && response.data) {
        setToken('cookie-session');
        setUser(response.data);
        setAuthReady(true);
        return;
      }

      reset();
      setToken(null);
      setUser(null);
      setAuthReady(true);
      router.push(withLang('/client/login'));
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [reset, router, setToken, setUser, withLang]);

  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;

    const verifySession = async () => {
      const response = await api.getClientSession();
      if (cancelled || (response.success && response.data)) {
        return;
      }

      reset();
      setToken(null);
      setUser(null);
      router.push(withLang('/client/login'));
    };

    void verifySession();
    const interval = setInterval(() => {
      void verifySession();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authReady, reset, router, setToken, setUser, user, withLang]);

  // Load workspaces
  useEffect(() => {
    if (!authReady || !user) return;

    const loadWorkspaces = async () => {
      setWorkspacesLoading(true);
      try {
        const response = await api.getWorkspaces();
        if (response.success && response.data) {
          setWorkspaces(response.data);
          if (response.data.length > 0 && !currentWorkspaceId) {
            setCurrentWorkspace(response.data[0]);
          }
        }
      } finally {
        setWorkspacesLoading(false);
      }
    };

    void loadWorkspaces();
  }, [authReady, user, currentWorkspaceId, setCurrentWorkspace, setWorkspaces]);

  // Load friends and groups when workspace changes
  useEffect(() => {
    if (!currentWorkspaceId || !user) return;

    let cancelled = false;
    const loadData = async () => {
      const requestId = ++friendshipRefreshRequestIdRef.current;
      const [friendshipState, groupsResponse, membersResponse] = await Promise.all([
        fetchFriendshipState(currentWorkspaceId),
        api.getGroups(currentWorkspaceId),
        api.getWorkspaceMembers(currentWorkspaceId),
      ]);

      if (cancelled || requestId !== friendshipRefreshRequestIdRef.current) {
        return;
      }

      applyFriendshipState(
        friendshipState.friends,
        friendshipState.requests
      );

      const nextCollections = applyActiveConversationState(
        null,
        groupsResponse.success && groupsResponse.data ? groupsResponse.data : null
      );

      if (nextCollections.groups) {
        setGroups(nextCollections.groups);
      }

      if (membersResponse.success && membersResponse.data) {
        setWorkspaceMembers(membersResponse.data);

        if (user) {
          const currentMember = membersResponse.data.find((m: WorkspaceMember) => m.userId === user.id);
          if (currentMember) {
            setCurrentMemberTag(currentMember.memberTag);
          }
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [
    applyActiveConversationState,
    applyFriendshipState,
    currentWorkspaceId,
    fetchFriendshipState,
    user,
    setGroups,
  ]);

  useEffect(() => {
    if (!currentWorkspaceId || !user) return;

    let cancelled = false;
    const refreshConversationCollections = async () => {
      const requestId = ++friendshipRefreshRequestIdRef.current;
      const [friendshipState, groupsResponse] = await Promise.all([
        fetchFriendshipState(currentWorkspaceId),
        api.getGroups(currentWorkspaceId),
      ]);

      if (cancelled || requestId !== friendshipRefreshRequestIdRef.current) {
        return;
      }

      applyFriendshipState(
        friendshipState.friends,
        friendshipState.requests
      );

      const nextCollections = applyActiveConversationState(
        null,
        groupsResponse.success && groupsResponse.data ? groupsResponse.data : null
      );

      if (nextCollections.groups) {
        setGroups(nextCollections.groups);
      }
    };

    const interval = setInterval(() => {
      void refreshConversationCollections();
    }, CONVERSATION_LIST_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    applyActiveConversationState,
    applyFriendshipState,
    currentWorkspaceId,
    fetchFriendshipState,
    setGroups,
    user,
  ]);

  useEffect(() => {
    if (!currentWorkspaceId || !user || !workspaceRealtimeConnected) return;

    void refreshFriendshipState(currentWorkspaceId);
  }, [currentWorkspaceId, refreshFriendshipState, user, workspaceRealtimeConnected]);

  useEffect(() => {
    if (!showFriendRequests || !currentWorkspaceId || !user) {
      return;
    }

    const seenSet = getSeenRequestIds(currentWorkspaceId);
    incomingPendingFriendRequests.forEach((request) => {
      seenSet.add(request.id);
    });
  }, [
    currentWorkspaceId,
    incomingPendingFriendRequests,
    showFriendRequests,
    user,
  ]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentWorkspaceId || !currentConversationId || !currentConversationType || !user) {
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const response = await api.getMessagesIncremental({
          workspaceId: currentWorkspaceId,
          receiverId: currentConversationType === 'direct' ? currentConversationId : undefined,
          groupId: currentConversationType === 'group' ? currentConversationId : undefined,
          limit: 100,
          markRead: true,
        });

        if (!cancelled && response.success && response.data) {
          setMessages(response.data);
          clearConversationUnread(currentConversationId, currentConversationType);
        }
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [
    clearConversationUnread,
    currentConversationId,
    currentConversationType,
    currentWorkspaceId,
    setMessages,
    user,
  ]);

  useEffect(() => {
    setTypingUserIds([]);
    Object.values(typingTimeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
    typingTimeoutsRef.current = {};

    if (markConversationReadTimeoutRef.current) {
      clearTimeout(markConversationReadTimeoutRef.current);
      markConversationReadTimeoutRef.current = null;
    }
  }, [currentConversationId, currentConversationType]);

  useEffect(() => {
    return () => {
      Object.values(typingTimeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current = {};

      if (markConversationReadTimeoutRef.current) {
        clearTimeout(markConversationReadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !currentConversationId || !currentConversationType) {
      return;
    }

    updateConversationActivity({
      conversationId: currentConversationId,
      conversationType: currentConversationType,
      message: lastMessage,
      unreadBehavior: 'clear',
    });
  }, [messages, currentConversationId, currentConversationType, updateConversationActivity]);

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!currentWorkspace || !currentConversationId || !user) return;

    setSendingMessage(true);
    const response = await api.sendMessage({
      workspaceId: currentWorkspace.id,
      content,
      receiverId: currentConversationType === 'direct' ? currentConversationId : undefined,
      groupId: currentConversationType === 'group' ? currentConversationId : undefined,
    });

    if (response.success && response.data) {
      addMessage(response.data);
      updateConversationActivity({
        conversationId: currentConversationId,
        conversationType: currentConversationType!,
        message: response.data,
        unreadBehavior: 'clear',
      });
    }
    setSendingMessage(false);
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!currentWorkspace || !currentConversationId || !user) return;

    setUploadingFile(true);

    // Upload file to R2
    const uploadResponse = await api.uploadFile(file);

    if (uploadResponse.success && uploadResponse.data) {
      // Determine message type and content based on file type
      const isImage = file.type.startsWith('image/');
      const messageType = isImage ? 'image' : 'file';
      const content = isImage ? '' : file.name;

      // Send message with file URL
      const response = await api.sendMessage({
        workspaceId: currentWorkspace.id,
        content: content || `Sent ${messageType}`,
        receiverId: currentConversationType === 'direct' ? currentConversationId : undefined,
        groupId: currentConversationType === 'group' ? currentConversationId : undefined,
        type: messageType,
        fileUrl: uploadResponse.data.url,
      });

      if (response.success && response.data) {
        addMessage(response.data);
        updateConversationActivity({
          conversationId: currentConversationId,
          conversationType: currentConversationType!,
          message: response.data,
          unreadBehavior: 'clear',
        });
      }
    } else {
      alert(t.chat.fileUploadFailed(uploadResponse.error || t.chat.unknownError));
    }

    setUploadingFile(false);
  };

  // Join workspace
  const handleJoinWorkspace = async (inviteCode: string) => {
    const response = await api.joinWorkspace(inviteCode);
    if (response.success && response.data) {
      const joinedWorkspace = response.data;
      const exists = workspaces.some((workspace) => workspace.id === joinedWorkspace.id);
      const newWorkspaces = exists ? workspaces : [...workspaces, joinedWorkspace];
      setWorkspaces(newWorkspaces);
      selectWorkspace(joinedWorkspace, { closeSwitcher: true });
      alert(t.chat.joinSuccess(joinedWorkspace.name));
    } else {
      alert(t.chat.joinFailure(response.error || t.chat.unknownError));
    }
  };

  // Send friend request
  const handleSendFriendRequest = async (userId: string) => {
    if (!currentWorkspace) return;

    const response = await api.sendFriendRequest(currentWorkspace.id, userId);
    if (response.success && response.data) {
      upsertPendingFriendRequest(response.data);
      void refreshFriendshipState(currentWorkspace.id);
      toggleFriendList();
      alert(t.chat.friendRequestSent);
    } else {
      // Show the specific error message from the API
      alert(t.chat.friendRequestFailed(response.error || t.chat.unknownError));
    }
  };

  const handleOpenFriendList = () => {
    if (!hasWorkspace || !currentWorkspace) {
      return;
    }

    if (!showFriendList) {
      void refreshFriendshipState(currentWorkspace.id);
    }

    toggleFriendList();
  };

  const handleOpenFriendRequests = () => {
    if (!currentWorkspace || !user) return;
    void refreshFriendshipState(currentWorkspace.id);
    setShowFriendRequests(true);
  };

  const handleFriendRequestAction = useCallback(async (
    friendshipId: string,
    status: 'accepted' | 'rejected'
  ) => {
    const response = await api.respondToFriendRequest(friendshipId, status);
    if (!response.success) {
      alert(t.chat.friendRequestFailed(response.error || t.chat.unknownError));
      return;
    }

    removePendingFriendRequest(friendshipId);

    if (status === 'accepted' && response.data) {
      upsertAcceptedFriendship(response.data);
    }

    if (currentWorkspace) {
      void refreshFriendshipState(currentWorkspace.id);
    }
  }, [
    currentWorkspace,
    refreshFriendshipState,
    removePendingFriendRequest,
    t.chat,
    upsertAcceptedFriendship,
  ]);

  // Create group
  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    if (!currentWorkspace) return;

    const response = await api.createGroup({
      workspaceId: currentWorkspace.id,
      name,
      memberIds,
    });

    if (response.success && response.data) {
      upsertGroupSummary(response.data);
    } else {
      alert(t.chat.createGroupFailed(response.error || t.chat.unknownError));
    }
  };

  const handleRenameGroup = async (name: string) => {
    if (!currentWorkspace || !currentGroup) return;

    const response = await api.updateGroup({
      workspaceId: currentWorkspace.id,
      groupId: currentGroup.id,
      name,
    });

    if (response.success && response.data) {
      upsertGroupSummary(response.data);
    } else {
      alert(t.groupSettings.renameFailed(response.error || t.chat.unknownError));
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentWorkspace || !currentGroup) return;

    const response = await api.leaveGroup({
      workspaceId: currentWorkspace.id,
      groupId: currentGroup.id,
    });

    if (response.success) {
      removeGroupSummary(currentGroup.id);
      setShowGroupSettings(false);
    } else {
      alert(t.groupSettings.leaveFailed(response.error || t.chat.unknownError));
    }
  };

  const handleUpdateProfile = async (data: { username?: string; avatar?: string | null }) => {
    if (!user) return;

    const response = await api.updateProfile(data);
    if (response.success && response.data) {
      const updatedUser = response.data;
      setUser(updatedUser);
      const currentWorkspaceMember = workspaceMembers.find(
        (member) => member.userId === updatedUser.id
      );
      if (currentWorkspaceMember) {
        applyWorkspaceMemberProfile({
          ...currentWorkspaceMember,
          user: {
            ...currentWorkspaceMember.user,
            ...updatedUser,
          },
        });
      }
      setShowProfileSettings(false);
    } else {
      alert(t.profileSettings.saveFailed(response.error || t.chat.unknownError));
    }
  };

  // Logout
  const handleLogout = async () => {
    await api.logoutClient();
    api.setToken(null);
    setToken(null);
    reset();
    router.push(withLang('/client/login'));
  };

  // Get current conversation details
  const getCurrentConversation = () => {
    if (!currentConversationId) return null;

    if (currentConversationType === 'direct') {
      const friendship = friends.find((f) => f.friend?.id === currentConversationId);
      return {
        name: friendship?.friend?.username || t.common.unknown,
        avatar: friendship?.friend?.avatar,
      };
    } else {
      const group = groups.find((g) => g.id === currentConversationId);
      return {
        name: group?.name || t.common.unknownGroup,
        avatar: group?.avatar,
      };
    }
  };

  const conversation = getCurrentConversation();
  const currentFriend =
    currentConversationType === 'direct'
      ? friends.find((friendship) => friendship.friend?.id === currentConversationId)?.friend || null
      : null;
  const currentGroup =
    currentConversationType === 'group'
      ? groups.find((group) => group.id === currentConversationId) || null
      : null;
  const typingUsers = typingUserIds
    .map((typingUserId) => {
      if (currentConversationType === 'direct') {
        const friendship = friends.find((friendship) => friendship.friend?.id === typingUserId);
        return friendship?.friend?.username
          ? { id: typingUserId, name: friendship.friend.username }
          : null;
      }

      const workspaceMember = workspaceMembers.find((member) => member.userId === typingUserId);
      return workspaceMember?.user?.username
        ? { id: typingUserId, name: workspaceMember.user.username }
        : null;
    })
    .filter((typingUser): typingUser is { id: string; name: string } => Boolean(typingUser));
  const hasActiveConversation = Boolean(conversation && user);

  if (!authReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2"
            style={{ borderBottomColor: primaryColor }}
          />
          <p className="text-sm">{t.auth.common.pleaseWait}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100" style={themeStyle}>
      {/* Top Bar */}
      <div
        className="p-4 flex items-center justify-between shadow-lg"
        style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-primary-text)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => openWorkspaceSwitcher(hasWorkspace ? 'list' : 'join')}
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors overflow-hidden"
            style={{
              backgroundColor: 'var(--ws-secondary)',
              color: 'var(--ws-secondary-text)',
            }}
            aria-label={hasWorkspace ? t.workspaceSwitcher.title : t.chat.joinWorkspace}
            title={hasWorkspace ? t.workspaceSwitcher.title : t.chat.joinWorkspace}
          >
            {workspaceLogo ? (
              <ClientImage
                src={workspaceLogo}
                alt={workspaceName}
                className="w-full h-full object-cover"
              />
            ) : hasWorkspace ? (
              workspaceInitials
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v14m7-7H5"
                />
              </svg>
            )}
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{workspaceName}</h1>
            <p className="text-xs opacity-80 truncate">
              {hasWorkspace ? t.chat.stats(friends.length, groups.length) : t.chat.noWorkspaceSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => canCreateGroup && setShowCreateGroup(true)}
            className={`p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors ${
              canCreateGroup ? '' : 'opacity-50 cursor-not-allowed'
            }`}
            title={canCreateGroup ? t.chat.createGroup : t.chat.createGroupDisabled}
            disabled={!canCreateGroup}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleOpenFriendRequests}
            disabled={!hasWorkspace}
            className={`p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors relative ${
              hasWorkspace ? '' : 'opacity-50 cursor-not-allowed'
            }`}
            title={t.chat.friendRequests}
          >
            {hasUnseenFriendRequests && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleOpenFriendList}
            disabled={!hasWorkspace}
            className={`p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors ${
              hasWorkspace ? '' : 'opacity-50 cursor-not-allowed'
            }`}
            title={t.chat.addFriends}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowProfileSettings(true)}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            title={t.profileSettings.editProfile}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.121 17.804A4 4 0 007 19h10a4 4 0 001.879-.475M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            title={t.chat.logout}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col ${
            hasActiveConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {welcomeMessage && (
            <div
              className="mx-4 mt-4 mb-2 rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--ws-secondary-soft)',
                color: 'var(--ws-secondary)',
              }}
            >
              {welcomeMessage}
            </div>
          )}
          <div className="flex-1 min-h-0">
            <ConversationList
              workspaces={workspaces}
              currentWorkspace={currentWorkspace}
              currentUser={user}
              currentMemberTag={currentMemberTag}
              workspacesLoading={workspacesLoading}
              friends={friends}
              groups={groups}
              currentConversationId={currentConversationId}
              currentConversationType={currentConversationType}
              onSelectWorkspace={(workspace) => selectWorkspace(workspace)}
              onJoinWorkspace={() => openWorkspaceSwitcher('join')}
              onSelectConversation={handleSelectConversation}
            />
          </div>
        </div>

        {/* Chat Window */}
        <div
          className={`flex-1 min-h-0 ${hasActiveConversation ? 'flex' : 'hidden md:flex'}`}
        >
          {!hasWorkspace ? (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
              <div className="text-center max-w-sm px-6">
                <svg
                  className="w-24 h-24 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                  />
                </svg>
                <p className="text-lg font-medium">{t.chat.noWorkspaceTitle}</p>
                <p className="text-sm mt-1">{t.chat.noWorkspaceSubtitle}</p>
                <button
                  type="button"
                  onClick={() => openWorkspaceSwitcher('join')}
                  className="mt-4 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-primary-text)' }}
                >
                  {t.chat.joinWorkspace}
                </button>
              </div>
            </div>
          ) : conversation && user ? (
            <ChatWindow
              conversationName={conversation.name}
              conversationAvatar={conversation.avatar}
              messages={messages}
              currentUserId={user.id}
              onBack={() => setCurrentConversation(null, null)}
              onOpenOptions={() => currentGroup && setShowGroupSettings(true)}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              loading={messagesLoading}
              inputDisabled={sendingMessage}
              uploading={uploadingFile}
              isOnline={
                currentFriend
                  ? currentFriend.isOnline ?? isUserOnline(currentFriend.lastSeenAt)
                  : undefined
              }
              lastSeen={currentFriend?.lastSeenAt}
              typingUsers={typingUsers}
              onTypingStart={() => {
                sendEvent({
                  type: 'typing_start',
                  payload: {},
                });
              }}
              onTypingStop={() => {
                sendEvent({
                  type: 'typing_stop',
                  payload: {},
                });
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
              <div className="text-center">
                <svg
                  className="w-24 h-24 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg font-medium">{t.chat.selectConversationTitle}</p>
                <p className="text-sm mt-1">{t.chat.selectConversationSubtitle}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showWorkspaceSwitcher && (
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onSelectWorkspace={selectWorkspace}
          onJoinWorkspace={handleJoinWorkspace}
          onClose={closeWorkspaceSwitcher}
          initialShowJoinForm={workspaceSwitcherJoinMode}
        />
      )}

      {showFriendList && currentWorkspace && (
        <FriendList
          members={workspaceMembers}
          currentUserId={user?.id || ''}
          friendIds={friends.map((friend) => friend.friend?.id).filter(Boolean) as string[]}
          pendingOutgoingIds={pendingFriendRequests
            .filter((request) => request.senderId === user?.id)
            .map((request) => request.receiverId)}
          pendingIncomingIds={pendingFriendRequests
            .filter((request) => request.receiverId === user?.id)
            .map((request) => request.senderId)}
          onSendFriendRequest={handleSendFriendRequest}
          onClose={handleOpenFriendList}
        />
      )}

      {showFriendRequests && user && currentWorkspace && (
        <FriendRequests
          requests={incomingPendingFriendRequests}
          onClose={() => setShowFriendRequests(false)}
          onRequestHandled={handleFriendRequestAction}
        />
      )}

      {showCreateGroup && (
        <CreateGroup
          friends={friends}
          maxGroupSize={maxGroupSize}
          onCreateGroup={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      {showGroupSettings && currentGroup && (
        <GroupSettings
          group={currentGroup}
          onClose={() => setShowGroupSettings(false)}
          onRename={handleRenameGroup}
          onLeave={handleLeaveGroup}
        />
      )}

      {showProfileSettings && user && (
        <ProfileSettings
          user={user}
          onClose={() => setShowProfileSettings(false)}
          onSave={handleUpdateProfile}
        />
      )}
    </div>
  );
}
