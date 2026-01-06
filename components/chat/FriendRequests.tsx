'use client';

import { useState, useEffect } from 'react';
import { Friendship } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { api } from '@/lib/api';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface FriendRequestsProps {
  workspaceId: string;
  userId: string;
  onClose: () => void;
  onRequestHandled: () => void;
}

export default function FriendRequests({
  workspaceId,
  userId,
  onClose,
  onRequestHandled,
}: FriendRequestsProps) {
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = useLang();
  const t = getTranslations(lang);

  useEffect(() => {
    loadRequests();
  }, [workspaceId]);

  const loadRequests = async () => {
    setLoading(true);
    const response = await api.getFriendRequests(workspaceId);
    if (response.success && response.data) {
      // Filter to show only pending requests received by this user
      const pendingRequests = response.data.filter(
        (r: Friendship) => r.receiverId === userId && r.status === 'pending'
      );
      setRequests(pendingRequests);
    }
    setLoading(false);
  };

  const handleRequest = async (friendshipId: string, status: 'accepted' | 'rejected') => {
    const response = await api.respondToFriendRequest(friendshipId, status);
    if (response.success) {
      setRequests(requests.filter(r => r.id !== friendshipId));
      onRequestHandled();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t.friendRequests.title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Requests List */}
        <div className="overflow-y-auto max-h-96 p-2">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderBottomColor: 'var(--ws-primary)' }}
              ></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <p className="text-sm">{t.friendRequests.empty}</p>
            </div>
          ) : (
            requests.map((request) => {
              const sender = request.sender;
              if (!sender) return null;

              return (
                <div
                  key={request.id}
                  className="p-4 rounded-xl flex items-center gap-3 hover:bg-gray-50 transition-colors mb-2"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {sender.avatar ? (
                      <img
                        src={sender.avatar}
                        alt={sender.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(sender.username)
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {sender.username}
                    </h3>
                    <p className="text-sm text-gray-500">{t.friendRequests.wantsToBeFriends}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequest(request.id, 'accepted')}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: 'var(--ws-secondary)',
                        color: 'var(--ws-secondary-text)',
                      }}
                    >
                      {t.friendRequests.accept}
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, 'rejected')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      {t.friendRequests.decline}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
