'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { Message, WSMessage } from '@/lib/types';

interface RealtimeReadPayload {
  conversationType?: 'direct' | 'group';
  conversationId?: string;
  userId?: string;
  messageIds?: string[];
}

interface RealtimeTypingPayload {
  senderId?: string;
}

export function useRealtimeChat(options: {
  onIncomingMessage?: (message: Message) => void;
  onMessageRead?: (payload: RealtimeReadPayload) => void;
  onTypingStart?: (payload: RealtimeTypingPayload) => void;
  onTypingStop?: (payload: RealtimeTypingPayload) => void;
} = {}) {
  const { onIncomingMessage, onMessageRead, onTypingStart, onTypingStop } = options;
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
  const callbacksRef = useRef({
    onIncomingMessage,
    onMessageRead,
    onTypingStart,
    onTypingStop,
  });

  useEffect(() => {
    callbacksRef.current = {
      onIncomingMessage,
      onMessageRead,
      onTypingStart,
      onTypingStop,
    };
  }, [onIncomingMessage, onMessageRead, onTypingStart, onTypingStop]);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((message) => message.id));
  }, [messages]);

  const sendEvent = useCallback((event: Omit<WSMessage, 'timestamp'>) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    socketRef.current.send(
      JSON.stringify({
        ...event,
        timestamp: Date.now(),
      })
    );
    return true;
  }, []);

  useEffect(() => {
    if (
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
    if (token && token !== 'cookie-session') {
      url.searchParams.set('token', token);
    }
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

      if (message.type === 'new_message') {
        const payload = message.payload as unknown as Message;
        if (!payload?.id) return;
        if (messageIdsRef.current.has(payload.id)) return;

        messageIdsRef.current.add(payload.id);
        addMessage(payload);
        callbacksRef.current.onIncomingMessage?.(payload);
        return;
      }

      if (message.type === 'message_read') {
        callbacksRef.current.onMessageRead?.(
          message.payload as unknown as RealtimeReadPayload
        );
        return;
      }

      if (message.type === 'typing_start') {
        callbacksRef.current.onTypingStart?.(
          message.payload as unknown as RealtimeTypingPayload
        );
        return;
      }

      if (message.type === 'typing_stop') {
        callbacksRef.current.onTypingStop?.(
          message.payload as unknown as RealtimeTypingPayload
        );
      }
    };

    return () => {
      socket.close();
    };
  }, [token, currentWorkspace?.id, currentConversationId, currentConversationType, addMessage]);

  return { connected, sendEvent };
}
