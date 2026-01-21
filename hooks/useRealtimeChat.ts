'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { Message, WSMessage } from '@/lib/types';

export function useRealtimeChat() {
  const {
    token,
    currentWorkspace,
    currentConversationId,
    currentConversationType,
    messages,
    addMessage,
  } = useChatStore();

  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((message) => message.id));
  }, [messages]);

  useEffect(() => {
    if (
      !token ||
      !currentWorkspace ||
      !currentConversationId ||
      !currentConversationType
    ) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setConnected(false);
      return;
    }

    const url = new URL('/ws', window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('token', token);
    url.searchParams.set('workspaceId', currentWorkspace.id);
    url.searchParams.set('type', currentConversationType);
    url.searchParams.set('id', currentConversationId);

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

      if (message.type !== 'new_message') return;
      const payload = message.payload as Message;
      if (!payload?.id) return;
      if (messageIdsRef.current.has(payload.id)) return;

      messageIdsRef.current.add(payload.id);
      addMessage(payload);
    };

    return () => {
      socket.close();
    };
  }, [token, currentWorkspace?.id, currentConversationId, currentConversationType, addMessage]);

  return { connected };
}
