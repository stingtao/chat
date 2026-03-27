'use client';

import { useState } from 'react';
import type { Friendship } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';
import ClientImage from '@/components/ui/ClientImage';

interface FriendRequestsProps {
  requests: Friendship[];
  onClose: () => void;
  onRequestHandled: (friendshipId: string, status: 'accepted' | 'rejected') => Promise<void>;
}

export default function FriendRequests({
  requests,
  onClose,
  onRequestHandled,
}: FriendRequestsProps) {
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const lang = useLang();
  const t = getTranslations(lang);

  const handleRequest = async (friendshipId: string, status: 'accepted' | 'rejected') => {
    setProcessingRequestId(friendshipId);
    try {
      await onRequestHandled(friendshipId, status);
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t.friendRequests.title}</h2>
          <button
            type="button"
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
          {requests.length === 0 ? (
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0 relative overflow-hidden">
                    {sender.avatar ? (
                      <ClientImage
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
                      type="button"
                      onClick={() => handleRequest(request.id, 'accepted')}
                      disabled={processingRequestId === request.id}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        backgroundColor: 'var(--ws-secondary)',
                        color: 'var(--ws-secondary-text)',
                      }}
                    >
                      {t.friendRequests.accept}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequest(request.id, 'rejected')}
                      disabled={processingRequestId === request.id}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
