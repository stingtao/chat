import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/lib/api';
import { toDate } from '@/lib/utils';

export function useMessagePolling(intervalMs: number = 3000, enabled: boolean = true) {
  const {
    currentWorkspace,
    currentConversationId,
    currentConversationType,
    messages,
    mergeMessages,
  } = useChatStore();

  const lastMessageAtRef = useRef<string | null>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    lastMessageAtRef.current = lastMessage
      ? toDate(lastMessage.createdAt)?.toISOString() || null
      : null;
  }, [messages]);

  useEffect(() => {
    if (!enabled || !currentWorkspace || !currentConversationId || !currentConversationType) {
      return;
    }

    const pollMessages = async () => {
      try {
        const response = await api.getMessagesIncremental({
          workspaceId: currentWorkspace.id,
          receiverId: currentConversationType === 'direct' ? currentConversationId : undefined,
          groupId: currentConversationType === 'group' ? currentConversationId : undefined,
          after: lastMessageAtRef.current || undefined,
          limit: 100,
          markRead: true,
        });

        if (response.success && response.data) {
          const newMessages = response.data;
          if (newMessages.length > 0) {
            mergeMessages(newMessages);
          }
        }
      } catch (error) {
        console.error('Failed to poll messages:', error);
      }
    };

    void pollMessages();
    const interval = setInterval(pollMessages, intervalMs);

    return () => clearInterval(interval);
  }, [
    enabled,
    currentWorkspace?.id,
    currentConversationId,
    currentConversationType,
    intervalMs,
    mergeMessages,
  ]);
}
