'use client';

import { useState } from 'react';
import { Friendship } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface CreateGroupProps {
  friends: Friendship[];
  maxGroupSize?: number;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  onClose: () => void;
}

export default function CreateGroup({
  friends,
  maxGroupSize,
  onCreateGroup,
  onClose,
}: CreateGroupProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const lang = useLang();
  const t = getTranslations(lang);

  const resolvedMaxGroupSize =
    typeof maxGroupSize === 'number' && maxGroupSize > 0 ? maxGroupSize : 100;
  const maxSelectableFriends = Math.max(resolvedMaxGroupSize - 1, 0);
  const isCreateDisabled = !groupName.trim() || selectedFriends.length === 0;

  const handleToggleFriend = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else if (selectedFriends.length < maxSelectableFriends) {
      setSelectedFriends([...selectedFriends, friendId]);
    } else {
      return;
    }
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedFriends.length > 0) {
      onCreateGroup(groupName.trim(), selectedFriends);
      onClose();
    }
  };

  const filteredFriends = friends.filter(f =>
    f.friend?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t.createGroup.title}</h2>
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

        {/* Group Name Input */}
        <div className="p-4 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.createGroup.groupNameLabel}
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t.createGroup.groupNamePlaceholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900 placeholder-gray-400"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-2">
            {t.createGroup.maxMembers(resolvedMaxGroupSize)}
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.createGroup.searchPlaceholder}
            className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900 placeholder-gray-500"
          />
        </div>

        {/* Selected Count */}
        {selectedFriends.length > 0 && (
          <div
            className="px-4 py-2 text-sm"
            style={{ backgroundColor: 'var(--ws-primary-soft)', color: 'var(--ws-primary)' }}
          >
            {t.createGroup.selectedCount(selectedFriends.length)}
          </div>
        )}

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredFriends.length === 0 ? (
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
              <p className="text-sm">
                {searchQuery ? t.createGroup.noFriendsFound : t.createGroup.noFriendsToAdd}
              </p>
            </div>
          ) : (
            filteredFriends.map((friendship) => {
              const friend = friendship.friend;
              if (!friend) return null;

              const isSelected = selectedFriends.includes(friend.id);

                return (
                  <button
                    type="button"
                    key={friendship.id}
                    onClick={() => handleToggleFriend(friend.id)}
                    className={`w-full p-4 rounded-xl flex items-center gap-3 transition-colors mb-2 ${
                      isSelected ? 'border-2' : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: 'var(--ws-primary-soft)',
                            borderColor: 'var(--ws-primary)',
                          }
                        : undefined
                    }
                    disabled={!isSelected && selectedFriends.length >= maxSelectableFriends}
                  >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
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
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">
                      {friend.username}
                    </h3>
                    <p className="text-sm text-gray-500">{friend.email}</p>
                  </div>
                  {isSelected && (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      style={{ color: 'var(--ws-primary)' }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {t.createGroup.cancel}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreateDisabled}
            className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed"
            style={
              isCreateDisabled
                ? { backgroundColor: '#d1d5db', color: '#6b7280' }
                : { backgroundColor: 'var(--ws-primary)', color: 'var(--ws-primary-text)' }
            }
          >
            {t.createGroup.create}
          </button>
        </div>
      </div>
    </div>
  );
}
