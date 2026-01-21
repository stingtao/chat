'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { useStatusUpdate } from '@/hooks/useStatusUpdate';
import { Friendship, Workspace, WorkspaceMember } from '@/lib/types';
import { getContrastColor, hexToRgba, normalizeHexColor } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang, useLangHref } from '@/hooks/useLang';

export default function ChatPage() {
  const router = useRouter();
  const {
    user,
    token,
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
  const [hasUnseenFriendRequests, setHasUnseenFriendRequests] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [workspaceSwitcherJoinMode, setWorkspaceSwitcherJoinMode] = useState(false);
  const seenFriendRequestIdsRef = useRef<Record<string, Set<string>>>({});
  const lang = useLang();
  const t = getTranslations(lang);
  const withLang = useLangHref();

  const hasWorkspace = Boolean(currentWorkspace);
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

  const refreshFriendRequests = async (workspaceId: string) => {
    if (!user) return;
    const response = await api.getFriendRequests(workspaceId);
    if (response.success && response.data) {
      const requests = response.data as Friendship[];
      setPendingFriendRequests(requests);

      const incomingRequests = requests.filter(
        (request) => request.receiverId === user.id && request.status === 'pending'
      );
      const seenSet = getSeenRequestIds(workspaceId);
      const hasUnseen = incomingRequests.some((request) => !seenSet.has(request.id));
      setHasUnseenFriendRequests(hasUnseen);
    }
  };

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

    setCurrentConversation(null, null);
    setMessages([]);
    setFriends([]);
    setGroups([]);
    setWorkspaceMembers([]);
    setPendingFriendRequests([]);
    setHasUnseenFriendRequests(false);
    setCurrentMemberTag('');
    setMessagesLoading(false);
    setCurrentWorkspace(workspace);

    if (options?.closeSwitcher) {
      closeWorkspaceSwitcher();
    }
  };

  const { connected: realtimeConnected } = useRealtimeChat();

  // Enable message polling for real-time updates (fallback when websocket is down)
  useMessagePolling(3000, !realtimeConnected);

  // Update user's online status every 30 seconds
  useStatusUpdate(30000);

  // Initialize auth from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const userType = localStorage.getItem('userType');

    if (!storedToken || !storedUser || userType !== 'client') {
      router.push(withLang('/client/login'));
      return;
    }

    setToken(storedToken);
    setUser(JSON.parse(storedUser));
    api.setToken(storedToken);
  }, [router, setToken, setUser]);

  // Load workspaces
  useEffect(() => {
    if (!token) return;

    const loadWorkspaces = async () => {
      setWorkspacesLoading(true);
      try {
        const response = await api.getWorkspaces();
        if (response.success && response.data) {
          setWorkspaces(response.data);
          if (response.data.length > 0 && !currentWorkspace) {
            setCurrentWorkspace(response.data[0]);
          }
        }
      } finally {
        setWorkspacesLoading(false);
      }
    };

    loadWorkspaces();
  }, [token]);

  // Load friends and groups when workspace changes
  useEffect(() => {
    if (!currentWorkspace || !token) return;

    const loadData = async () => {
      // Load friends
      const friendsResponse = await api.getFriends(currentWorkspace.id);
      if (friendsResponse.success && friendsResponse.data) {
        setFriends(friendsResponse.data);
      }

      // Load groups
      const groupsResponse = await api.getGroups(currentWorkspace.id);
      if (groupsResponse.success && groupsResponse.data) {
        setGroups(groupsResponse.data);
      }

      // Load workspace members
      const membersResponse = await api.getWorkspaceMembers(currentWorkspace.id);
      if (membersResponse.success && membersResponse.data) {
        setWorkspaceMembers(membersResponse.data);

        // Find current user's memberTag
        if (user) {
          const currentMember = membersResponse.data.find((m: WorkspaceMember) => m.userId === user.id);
          if (currentMember) {
            setCurrentMemberTag(currentMember.memberTag);
          }
        }
      }
    };

    loadData();
  }, [currentWorkspace, token]);

  useEffect(() => {
    if (!currentWorkspace || !token || !user) return;

    refreshFriendRequests(currentWorkspace.id);
    const interval = setInterval(() => {
      refreshFriendRequests(currentWorkspace.id);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentWorkspace, token, user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentWorkspace || !currentConversationId || !token) return;

    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const response = await api.getMessages(
          currentWorkspace.id,
          currentConversationType === 'direct' ? currentConversationId : undefined,
          currentConversationType === 'group' ? currentConversationId : undefined
        );

        if (response.success && response.data) {
          setMessages(response.data);
        }
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [currentWorkspace, currentConversationId, currentConversationType, token]);

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
      const exists = workspaces.some((workspace) => workspace.id === response.data.id);
      const newWorkspaces = exists ? workspaces : [...workspaces, response.data];
      setWorkspaces(newWorkspaces);
      selectWorkspace(response.data, { closeSwitcher: true });
      alert(t.chat.joinSuccess(response.data.name));
    } else {
      alert(t.chat.joinFailure(response.error || t.chat.unknownError));
    }
  };

  // Send friend request
  const handleSendFriendRequest = async (userId: string) => {
    if (!currentWorkspace) return;

    const response = await api.sendFriendRequest(currentWorkspace.id, userId);
    if (response.success) {
      toggleFriendList();
      alert(t.chat.friendRequestSent);
      refreshFriendRequests(currentWorkspace.id);
      // Reload friends
      const friendsResponse = await api.getFriends(currentWorkspace.id);
      if (friendsResponse.success && friendsResponse.data) {
        setFriends(friendsResponse.data);
      }
    } else {
      // Show the specific error message from the API
      alert(t.chat.friendRequestFailed(response.error || t.chat.unknownError));
    }
  };

  const handleOpenFriendRequests = () => {
    if (!currentWorkspace || !user) return;
    const incomingIds = pendingFriendRequests
      .filter((request) => request.receiverId === user.id)
      .map((request) => request.id);
    const seenSet = getSeenRequestIds(currentWorkspace.id);
    incomingIds.forEach((id) => seenSet.add(id));
    setHasUnseenFriendRequests(false);
    setShowFriendRequests(true);
  };

  // Create group
  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    if (!currentWorkspace) return;

    const response = await api.createGroup({
      workspaceId: currentWorkspace.id,
      name,
      memberIds,
    });

    if (response.success) {
      // Reload groups
      const groupsResponse = await api.getGroups(currentWorkspace.id);
      if (groupsResponse.success && groupsResponse.data) {
        setGroups(groupsResponse.data);
      }
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

    if (response.success) {
      const groupsResponse = await api.getGroups(currentWorkspace.id);
      if (groupsResponse.success && groupsResponse.data) {
        setGroups(groupsResponse.data);
      }
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
      const groupsResponse = await api.getGroups(currentWorkspace.id);
      if (groupsResponse.success && groupsResponse.data) {
        setGroups(groupsResponse.data);
      }
      setShowGroupSettings(false);
      if (currentConversationId === currentGroup.id) {
        setCurrentConversation(null, null);
        setMessages([]);
      }
    } else {
      alert(t.groupSettings.leaveFailed(response.error || t.chat.unknownError));
    }
  };

  const handleUpdateProfile = async (data: { username?: string; avatar?: string | null }) => {
    if (!user) return;

    const response = await api.updateProfile(data);
    if (response.success && response.data) {
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      setShowProfileSettings(false);
    } else {
      alert(t.profileSettings.saveFailed(response.error || t.chat.unknownError));
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
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
  const currentGroup =
    currentConversationType === 'group'
      ? groups.find((group) => group.id === currentConversationId) || null
      : null;
  const hasActiveConversation = Boolean(conversation && user);

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
              <img
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
            onClick={() => hasWorkspace && toggleFriendList()}
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
              onSelectConversation={setCurrentConversation}
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

      {showFriendList && (
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
          onClose={toggleFriendList}
        />
      )}

      {showFriendRequests && user && currentWorkspace && (
        <FriendRequests
          workspaceId={currentWorkspace.id}
          userId={user.id}
          onClose={() => setShowFriendRequests(false)}
          onRequestHandled={async () => {
            // Reload friends list after accepting/rejecting a request
            const friendsResponse = await api.getFriends(currentWorkspace.id);
            if (friendsResponse.success && friendsResponse.data) {
              setFriends(friendsResponse.data);
            }
            refreshFriendRequests(currentWorkspace.id);
          }}
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
