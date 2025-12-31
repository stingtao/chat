'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/lib/api';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import WorkspaceSwitcher from '@/components/chat/WorkspaceSwitcher';
import FriendList from '@/components/chat/FriendList';
import FriendRequests from '@/components/chat/FriendRequests';
import CreateGroup from '@/components/chat/CreateGroup';
import { useMessagePolling } from '@/hooks/useMessagePolling';
import { useStatusUpdate } from '@/hooks/useStatusUpdate';
import { WorkspaceMember } from '@/lib/types';

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

  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [currentMemberTag, setCurrentMemberTag] = useState<string>('');
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Enable message polling for real-time updates
  useMessagePolling(3000);

  // Update user's online status every 30 seconds
  useStatusUpdate(30000);

  // Initialize auth from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const userType = localStorage.getItem('userType');

    if (!storedToken || !storedUser || userType !== 'client') {
      router.push('/client/login');
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
      const response = await api.getWorkspaces();
      if (response.success && response.data) {
        setWorkspaces(response.data);
        if (response.data.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(response.data[0]);
        }
      }
      setLoading(false);
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

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentWorkspace || !currentConversationId || !token) return;

    const loadMessages = async () => {
      setLoading(true);
      const response = await api.getMessages(
        currentWorkspace.id,
        currentConversationType === 'direct' ? currentConversationId : undefined,
        currentConversationType === 'group' ? currentConversationId : undefined
      );

      if (response.success && response.data) {
        setMessages(response.data);
      }
      setLoading(false);
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
      alert('Failed to upload file: ' + (uploadResponse.error || 'Unknown error'));
    }

    setUploadingFile(false);
  };

  // Join workspace
  const handleJoinWorkspace = async (inviteCode: string) => {
    const response = await api.joinWorkspace(inviteCode);
    if (response.success && response.data) {
      const newWorkspaces = [...workspaces, response.data];
      setWorkspaces(newWorkspaces);
      setCurrentWorkspace(response.data);
      toggleWorkspaceSwitcher(); // Close the modal
      alert(`Successfully joined workspace: ${response.data.name}`);
    } else {
      alert(`Failed to join workspace: ${response.error || 'Unknown error'}`);
    }
  };

  // Send friend request
  const handleSendFriendRequest = async (userId: string) => {
    if (!currentWorkspace) return;

    const response = await api.sendFriendRequest(currentWorkspace.id, userId);
    if (response.success) {
      toggleFriendList();
      alert('Friend request sent successfully!');
      // Reload friends
      const friendsResponse = await api.getFriends(currentWorkspace.id);
      if (friendsResponse.success && friendsResponse.data) {
        setFriends(friendsResponse.data);
      }
    } else {
      // Show the specific error message from the API
      alert(response.error || 'Failed to send friend request');
    }
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
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    reset();
    router.push('/client/login');
  };

  // Get current conversation details
  const getCurrentConversation = () => {
    if (!currentConversationId) return null;

    if (currentConversationType === 'direct') {
      const friendship = friends.find((f) => f.friend?.id === currentConversationId);
      return {
        name: friendship?.friend?.username || 'Unknown',
        avatar: friendship?.friend?.avatar,
      };
    } else {
      const group = groups.find((g) => g.id === currentConversationId);
      return {
        name: group?.name || 'Unknown Group',
        avatar: group?.avatar,
      };
    }
  };

  const conversation = getCurrentConversation();

  if (loading && !currentWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!currentWorkspace) {
    console.log('[No Workspace Screen] Rendering, showWorkspaceSwitcher:', showWorkspaceSwitcher);
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Workspace</h2>
            <p className="text-gray-600 mb-6">
              You need to join a workspace to start chatting
            </p>
            <button
              type="button"
              onClick={() => {
                console.log('=== Join Workspace button clicked ===');
                console.log('Before toggle - showWorkspaceSwitcher:', showWorkspaceSwitcher);
                toggleWorkspaceSwitcher();
                console.log('After toggle called');
              }}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Join Workspace
            </button>
          </div>
        </div>

        {/* Workspace Switcher Modal - MUST be here too! */}
        {showWorkspaceSwitcher && (
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            onSelectWorkspace={setCurrentWorkspace}
            onJoinWorkspace={handleJoinWorkspace}
            onClose={toggleWorkspaceSwitcher}
          />
        )}
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <div className="bg-green-600 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              console.log('Workspace switcher button clicked');
              console.log('Current showWorkspaceSwitcher:', showWorkspaceSwitcher);
              toggleWorkspaceSwitcher();
            }}
            className="w-10 h-10 rounded-xl bg-white bg-opacity-20 flex items-center justify-center font-bold hover:bg-opacity-30 transition-colors"
            style={{
              backgroundColor: currentWorkspace.settings?.primaryColor || '#3b82f6',
            }}
          >
            {currentWorkspace.name.substring(0, 2).toUpperCase()}
          </button>
          <div>
            <h1 className="font-semibold">{currentWorkspace.name}</h1>
            <p className="text-xs text-green-100">
              {user?.username}
              {currentMemberTag && <span className="opacity-75">#{currentMemberTag}</span>}
              {' • '}{user?.email}
            </p>
            <p className="text-xs text-green-100">
              {friends.length} friends • {groups.length} groups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            title="Create Group"
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
            onClick={() => setShowFriendRequests(true)}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors relative"
            title="Friend Requests"
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleFriendList}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            title="Add Friends"
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
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            title="Logout"
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
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
          <ConversationList
            friends={friends}
            groups={groups}
            currentConversationId={currentConversationId}
            currentConversationType={currentConversationType}
            onSelectConversation={setCurrentConversation}
          />
        </div>

        {/* Chat Window */}
        <div className="flex-1 hidden md:block">
          {conversation && user ? (
            <ChatWindow
              conversationName={conversation.name}
              conversationAvatar={conversation.avatar}
              messages={messages}
              currentUserId={user.id}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              loading={sendingMessage}
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
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a friend or group to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showWorkspaceSwitcher ? (
        <>
          {console.log('WorkspaceSwitcher should render now, showWorkspaceSwitcher:', showWorkspaceSwitcher)}
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            onSelectWorkspace={setCurrentWorkspace}
            onJoinWorkspace={handleJoinWorkspace}
            onClose={toggleWorkspaceSwitcher}
          />
        </>
      ) : (
        <>
          {console.log('WorkspaceSwitcher hidden, showWorkspaceSwitcher:', showWorkspaceSwitcher)}
        </>
      )}

      {showFriendList && (
        <FriendList
          members={workspaceMembers}
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
          }}
        />
      )}

      {showCreateGroup && (
        <CreateGroup
          friends={friends}
          onCreateGroup={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  );
}
