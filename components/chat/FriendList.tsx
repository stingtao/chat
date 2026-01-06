'use client';

import { useMemo, useState } from 'react';
import { WorkspaceMember } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface FriendListProps {
  members: WorkspaceMember[];
  currentUserId: string;
  friendIds: string[];
  pendingOutgoingIds: string[];
  pendingIncomingIds: string[];
  onSendFriendRequest: (userId: string) => void;
  onClose: () => void;
}

export default function FriendList({
  members,
  currentUserId,
  friendIds,
  pendingOutgoingIds,
  pendingIncomingIds,
  onSendFriendRequest,
  onClose,
}: FriendListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const lang = useLang();
  const t = getTranslations(lang);

  const friendIdSet = useMemo(() => new Set(friendIds), [friendIds]);
  const pendingOutgoingSet = useMemo(
    () => new Set(pendingOutgoingIds),
    [pendingOutgoingIds]
  );
  const pendingIncomingSet = useMemo(
    () => new Set(pendingIncomingIds),
    [pendingIncomingIds]
  );

  const filteredMembers = members.filter((member) => {
    if (!member.user) return false;
    if (member.user.id === currentUserId) return false;
    if (friendIdSet.has(member.user.id)) return false;
    if (pendingIncomingSet.has(member.user.id)) return false;

    const query = searchQuery.toLowerCase();
    const username = member.user.username.toLowerCase();
    const memberTag = member.memberTag.toLowerCase();
    const fullTag = `${username}#${memberTag}`.toLowerCase();

    // Search by username, memberTag, or full tag (username#1234)
    return username.includes(query) ||
           memberTag.includes(query) ||
           fullTag.includes(query);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t.friendList.title}</h2>
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

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.friendList.searchPlaceholder}
            className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900 placeholder-gray-500"
          />
        </div>

        {/* Member List */}
        <div className="overflow-y-auto max-h-96 p-2">
          {filteredMembers.map((member) => {
            if (!member.user) return null;
            const isPending = pendingOutgoingSet.has(member.user.id);

            return (
              <div
                key={member.id}
                className="p-4 rounded-xl flex items-center gap-3 hover:bg-gray-50 transition-colors mb-2"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {member.user.avatar ? (
                    <img
                      src={member.user.avatar}
                      alt={member.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(member.user.username)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {member.user.username}
                    <span className="text-gray-500 font-normal">#{member.memberTag}</span>
                  </h3>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                </div>
                {isPending ? (
                  <span className="px-3 py-2 text-sm font-medium text-gray-500">
                    {t.friendList.adding}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSendFriendRequest(member.user!.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--ws-secondary)',
                      color: 'var(--ws-secondary-text)',
                    }}
                  >
                    {t.friendList.addFriend}
                  </button>
                )}
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">{t.friendList.empty}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
