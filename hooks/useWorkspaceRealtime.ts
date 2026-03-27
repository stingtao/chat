'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type {
  FriendAcceptedEventPayload,
  FriendRequestEventPayload,
  GroupDeletedEventPayload,
  GroupRealtimeEventPayload,
  Message,
  SpamReportRealtimeEventPayload,
  WorkspaceMemberJoinedEventPayload,
  WorkspaceMemberBlockedEventPayload,
  WorkspaceMemberRemovedEventPayload,
  WorkspaceMemberUnblockedEventPayload,
  WorkspaceMemberUpdatedEventPayload,
  WSMessage,
} from '@/lib/types';

export function useWorkspaceRealtime(options: {
  enabled?: boolean;
  workspaceId?: string | null;
  token?: string | null;
  authType?: 'client' | 'host';
  onMessage?: (message: Message) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
  onFriendRequest?: (payload: FriendRequestEventPayload) => void;
  onFriendAccepted?: (payload: FriendAcceptedEventPayload) => void;
  onGroupCreated?: (payload: GroupRealtimeEventPayload) => void;
  onGroupUpdated?: (payload: GroupRealtimeEventPayload) => void;
  onGroupDeleted?: (payload: GroupDeletedEventPayload) => void;
  onWorkspaceMemberJoined?: (payload: WorkspaceMemberJoinedEventPayload) => void;
  onWorkspaceMemberRemoved?: (payload: WorkspaceMemberRemovedEventPayload) => void;
  onWorkspaceMemberUpdated?: (payload: WorkspaceMemberUpdatedEventPayload) => void;
  onSpamReportCreated?: (payload: SpamReportRealtimeEventPayload) => void;
  onSpamReportUpdated?: (payload: SpamReportRealtimeEventPayload) => void;
  onWorkspaceMemberBlocked?: (payload: WorkspaceMemberBlockedEventPayload) => void;
  onWorkspaceMemberUnblocked?: (payload: WorkspaceMemberUnblockedEventPayload) => void;
}) {
  const {
    enabled = true,
    workspaceId: workspaceIdOverride,
    token: tokenOverride,
    authType = 'client',
    onMessage,
    onUserOnline,
    onUserOffline,
    onFriendRequest,
    onFriendAccepted,
    onGroupCreated,
    onGroupUpdated,
    onGroupDeleted,
    onWorkspaceMemberJoined,
    onWorkspaceMemberRemoved,
    onWorkspaceMemberUpdated,
    onSpamReportCreated,
    onSpamReportUpdated,
    onWorkspaceMemberBlocked,
    onWorkspaceMemberUnblocked,
  } = options;
  const { token, currentWorkspace } = useChatStore();
  const workspaceId = workspaceIdOverride || currentWorkspace?.id || null;
  const sessionToken = tokenOverride === undefined ? token : tokenOverride;
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef({
    onMessage,
    onUserOnline,
    onUserOffline,
    onFriendRequest,
    onFriendAccepted,
    onGroupCreated,
    onGroupUpdated,
    onGroupDeleted,
    onWorkspaceMemberJoined,
    onWorkspaceMemberRemoved,
    onWorkspaceMemberUpdated,
    onSpamReportCreated,
    onSpamReportUpdated,
    onWorkspaceMemberBlocked,
    onWorkspaceMemberUnblocked,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onUserOnline,
      onUserOffline,
      onFriendRequest,
      onFriendAccepted,
      onGroupCreated,
      onGroupUpdated,
      onGroupDeleted,
      onWorkspaceMemberJoined,
      onWorkspaceMemberRemoved,
      onWorkspaceMemberUpdated,
      onSpamReportCreated,
      onSpamReportUpdated,
      onWorkspaceMemberBlocked,
      onWorkspaceMemberUnblocked,
    };
  }, [
    onMessage,
    onUserOnline,
    onUserOffline,
    onFriendAccepted,
    onFriendRequest,
    onGroupCreated,
    onGroupDeleted,
    onGroupUpdated,
    onWorkspaceMemberJoined,
    onWorkspaceMemberRemoved,
    onWorkspaceMemberUpdated,
    onSpamReportCreated,
    onSpamReportUpdated,
    onWorkspaceMemberBlocked,
    onWorkspaceMemberUnblocked,
  ]);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setConnected(false);
      return;
    }

    const url = new URL('/ws', window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    if (sessionToken && sessionToken !== 'cookie-session') {
      url.searchParams.set('token', sessionToken);
    }
    url.searchParams.set('workspaceId', workspaceId);
    url.searchParams.set('scope', 'workspace');
    url.searchParams.set('authType', authType);

    const socket = new WebSocket(url.toString());
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;

      let message: WSMessage | null = null;
      try {
        message = JSON.parse(event.data) as WSMessage;
      } catch {
        return;
      }

      if (message.type === 'new_message') {
        const payload = message.payload as unknown as Message;
        if (!payload?.id || payload.workspaceId !== workspaceId) {
          return;
        }

        callbacksRef.current.onMessage?.(payload);
        return;
      }

      if (message.type === 'user_online') {
        const userId = typeof message.payload?.userId === 'string' ? message.payload.userId : null;
        if (userId) {
          callbacksRef.current.onUserOnline?.(userId);
        }
        return;
      }

      if (message.type === 'user_offline') {
        const userId = typeof message.payload?.userId === 'string' ? message.payload.userId : null;
        if (userId) {
          callbacksRef.current.onUserOffline?.(userId);
        }
        return;
      }

      if (message.type === 'friend_request') {
        const payload = message.payload as unknown as FriendRequestEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.friendship?.id) {
          callbacksRef.current.onFriendRequest?.(payload);
        }
        return;
      }

      if (message.type === 'friend_accepted') {
        const payload = message.payload as unknown as FriendAcceptedEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.friendship?.id) {
          callbacksRef.current.onFriendAccepted?.(payload);
        }
        return;
      }

      if (message.type === 'group_created') {
        const payload = message.payload as unknown as GroupRealtimeEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.group?.id) {
          callbacksRef.current.onGroupCreated?.(payload);
        }
        return;
      }

      if (message.type === 'group_updated') {
        const payload = message.payload as unknown as GroupRealtimeEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.group?.id) {
          callbacksRef.current.onGroupUpdated?.(payload);
        }
        return;
      }

      if (message.type === 'group_deleted') {
        const payload = message.payload as unknown as GroupDeletedEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.groupId) {
          callbacksRef.current.onGroupDeleted?.(payload);
        }
        return;
      }

      if (message.type === 'workspace_member_joined') {
        const payload =
          message.payload as unknown as WorkspaceMemberJoinedEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.member?.userId) {
          callbacksRef.current.onWorkspaceMemberJoined?.(payload);
        }
        return;
      }

      if (message.type === 'workspace_member_removed') {
        const payload =
          message.payload as unknown as WorkspaceMemberRemovedEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.userId) {
          callbacksRef.current.onWorkspaceMemberRemoved?.(payload);
        }
        return;
      }

      if (message.type === 'workspace_member_updated') {
        const payload =
          message.payload as unknown as WorkspaceMemberUpdatedEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.member?.userId) {
          callbacksRef.current.onWorkspaceMemberUpdated?.(payload);
        }
        return;
      }

      if (message.type === 'spam_report_created') {
        const payload = message.payload as unknown as SpamReportRealtimeEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.report?.id) {
          callbacksRef.current.onSpamReportCreated?.(payload);
        }
        return;
      }

      if (message.type === 'spam_report_updated') {
        const payload = message.payload as unknown as SpamReportRealtimeEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.report?.id) {
          callbacksRef.current.onSpamReportUpdated?.(payload);
        }
        return;
      }

      if (message.type === 'workspace_member_blocked') {
        const payload =
          message.payload as unknown as WorkspaceMemberBlockedEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.blockedUser?.userId) {
          callbacksRef.current.onWorkspaceMemberBlocked?.(payload);
        }
        return;
      }

      if (message.type === 'workspace_member_unblocked') {
        const payload =
          message.payload as unknown as WorkspaceMemberUnblockedEventPayload | undefined;
        if (payload?.workspaceId === workspaceId && payload.userId) {
          callbacksRef.current.onWorkspaceMemberUnblocked?.(payload);
        }
      }
    };

    return () => {
      socket.close();
    };
  }, [authType, enabled, sessionToken, workspaceId]);

  return { connected };
}
