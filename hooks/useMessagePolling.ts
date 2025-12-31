import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/lib/api';

export function useMessagePolling(intervalMs: number = 3000) {
  const {
    currentWorkspace,
    currentConversationId,
    currentConversationType,
    messages,
    setMessages,
  } = useChatStore();

  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace || !currentConversationId) return;

    // Update last message ID when messages change
    if (messages.length > 0) {
      lastMessageIdRef.current = messages[messages.length - 1].id;
    }

    const pollMessages = async () => {
      try {
        const response = await api.getMessages(
          currentWorkspace.id,
          currentConversationType === 'direct' ? currentConversationId : undefined,
          currentConversationType === 'group' ? currentConversationId : undefined
        );

        if (response.success && response.data) {
          const newMessages = response.data;

          // Only update if there are new messages
          if (newMessages.length > messages.length) {
            setMessages(newMessages);
          } else if (newMessages.length > 0) {
            const lastNewId = newMessages[newMessages.length - 1].id;
            if (lastNewId !== lastMessageIdRef.current) {
              setMessages(newMessages);
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll messages:', error);
      }
    };

    const interval = setInterval(pollMessages, intervalMs);

    return () => clearInterval(interval);
  }, [currentWorkspace, currentConversationId, currentConversationType, messages.length, intervalMs]);
}
