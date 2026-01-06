'use client';

import { Friendship, Group } from '@/lib/types';
import { formatDate, getInitials, isUserOnline } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface ConversationListProps {
  friends: Friendship[];
  groups: Group[];
  currentConversationId: string | null;
  currentConversationType: 'direct' | 'group' | null;
  onSelectConversation: (id: string, type: 'direct' | 'group') => void;
}

export default function ConversationList({
  friends,
  groups,
  currentConversationId,
  currentConversationType,
  onSelectConversation,
}: ConversationListProps) {
  const lang = useLang();
  const t = getTranslations(lang);

  return (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">{t.conversationList.title}</h2>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <input
          type="text"
          placeholder={t.conversationList.searchPlaceholder}
          className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900 placeholder-gray-500"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {/* Friends */}
        {friends.map((friendship) => {
          const friend = friendship.friend;
          if (!friend) return null;

          const isActive =
            currentConversationId === friend.id &&
            currentConversationType === 'direct';

          return (
            <button
              type="button"
              key={friendship.id}
              onClick={() => onSelectConversation(friend.id, 'direct')}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              style={isActive ? { backgroundColor: 'var(--ws-primary-soft)' } : undefined}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt={friend.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(friend.username)
                  )}
                </div>
                {isUserOnline(friend.lastSeenAt) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>

              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {friend.username}
                  </h3>
                  {/* <span className="text-xs text-gray-500">10:30 AM</span> */}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {t.conversationList.startChatHint}
                </p>
              </div>
            </button>
          );
        })}

        {/* Groups */}
        {groups.map((group) => {
          const isActive =
            currentConversationId === group.id &&
            currentConversationType === 'group';

          return (
            <button
              type="button"
              key={group.id}
              onClick={() => onSelectConversation(group.id, 'group')}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              style={isActive ? { backgroundColor: 'var(--ws-primary-soft)' } : undefined}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(group.name)
                )}
              </div>

              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {group.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {t.conversationList.members(group.memberCount || 0)}
                </p>
              </div>
            </button>
          );
        })}

        {/* Empty State */}
        {friends.length === 0 && groups.length === 0 && (
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
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
            <p className="text-sm">{t.conversationList.emptyTitle}</p>
            <p className="text-xs mt-1">{t.conversationList.emptySubtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}
