import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/lib/api';

export function useStatusUpdate(intervalMs: number = 30000) {
  const { currentWorkspace } = useChatStore();

  useEffect(() => {
    if (!currentWorkspace) return;

    const updateStatus = async () => {
      try {
        await api.updateStatus(currentWorkspace.id);
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    };

    // Update immediately on mount
    updateStatus();

    // Then update periodically
    const interval = setInterval(updateStatus, intervalMs);

    return () => clearInterval(interval);
  }, [currentWorkspace?.id, intervalMs]);
}
