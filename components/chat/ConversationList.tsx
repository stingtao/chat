'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { ClientUser, Friendship, Group, Workspace } from '@/lib/types';
import { formatDate, getContrastColor, getInitials, isUserOnline, toDate } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';
import ClientImage from '@/components/ui/ClientImage';

interface ConversationListProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentUser: ClientUser | null;
  currentMemberTag?: string;
  workspacesLoading?: boolean;
  friends: Friendship[];
  groups: Group[];
  currentConversationId: string | null;
  currentConversationType: 'direct' | 'group' | null;
  onSelectWorkspace: (workspace: Workspace) => void;
  onJoinWorkspace: () => void;
  onSelectConversation: (id: string, type: 'direct' | 'group') => void;
}

interface ConversationItem {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar?: string;
  preview: string;
  unreadCount: number;
  lastActivityAt?: Date | string;
  subtitle?: string;
  isOnline?: boolean;
}

function isFriendship(item: Friendship | Group): item is Friendship {
  return 'friend' in item;
}

function getConversationPreview(
  item: Friendship | Group,
  currentUserId: string | undefined,
  t: ReturnType<typeof getTranslations>
): string {
  const lastMessage = item.lastMessage;

  if (!lastMessage) {
    return isFriendship(item)
      ? t.conversationList.startChatHint
      : t.conversationList.members(item.memberCount || 0);
  }

  if (lastMessage.type === 'image') {
    return lastMessage.senderId === currentUserId
      ? t.conversationList.youSentImage
      : t.conversationList.sentImage;
  }

  if (lastMessage.type === 'file') {
    return lastMessage.senderId === currentUserId
      ? t.conversationList.youSentFile
      : t.conversationList.sentFile;
  }

  const content = lastMessage.content?.trim() || t.conversationList.startChatHint;
  return lastMessage.senderId === currentUserId
    ? `${t.conversationList.youPrefix}: ${content}`
    : content;
}

function sortConversationItems(items: ConversationItem[]): ConversationItem[] {
  return [...items].sort((a, b) => {
    const unreadDiff = (b.unreadCount || 0) - (a.unreadCount || 0);
    if (unreadDiff !== 0) {
      return unreadDiff;
    }

    const timeDiff =
      (toDate(b.lastActivityAt)?.getTime() || 0) -
      (toDate(a.lastActivityAt)?.getTime() || 0);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.name.localeCompare(b.name);
  });
}

export default function ConversationList({
  workspaces,
  currentWorkspace,
  currentUser,
  currentMemberTag,
  workspacesLoading = false,
  friends,
  groups,
  currentConversationId,
  currentConversationType,
  onSelectWorkspace,
  onJoinWorkspace,
  onSelectConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const lang = useLang();
  const t = getTranslations(lang);
  const hasWorkspace = Boolean(currentWorkspace);
  const workspaceLabel = currentWorkspace?.name || t.chat.noWorkspaceTitle;
  const userName = currentUser?.username || t.common.unknown;
  const userEmail = currentUser?.email || t.common.noEmail;

  const directMessages = useMemo(() => {
    const items = friends.reduce<ConversationItem[]>((acc, friendship) => {
        const friend = friendship.friend;
        if (!friend) return acc;
        const isOnline = friend.isOnline ?? isUserOnline(friend.lastSeenAt);

        acc.push({
          id: friend.id,
          type: 'direct' as const,
          name: friend.username,
          avatar: friend.avatar,
          preview: getConversationPreview(friendship, currentUser?.id, t),
          unreadCount: friendship.unreadCount || 0,
          lastActivityAt: friendship.lastMessage?.createdAt,
          subtitle: friend.lastSeenAt
            ? isOnline
              ? t.chatWindow.online
              : formatDate(friend.lastSeenAt)
            : undefined,
          isOnline,
        });

        return acc;
      }, []);

    const filtered = deferredQuery
      ? items.filter((item) => {
          const haystack = [
            item.name,
            item.preview,
            item.subtitle || '',
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(deferredQuery);
        })
      : items;

    return sortConversationItems(filtered);
  }, [friends, currentUser?.id, deferredQuery, t]);

  const groupMessages = useMemo(() => {
    const items = groups.map((group) => ({
      id: group.id,
      type: 'group' as const,
      name: group.name,
      avatar: group.avatar,
      preview: getConversationPreview(group, currentUser?.id, t),
      unreadCount: group.unreadCount || 0,
      lastActivityAt: group.lastMessage?.createdAt,
      subtitle: t.conversationList.members(group.memberCount || 0),
    }));

    const filtered = deferredQuery
      ? items.filter((item) => {
          const haystack = [item.name, item.preview, item.subtitle || '']
            .join(' ')
            .toLowerCase();
          return haystack.includes(deferredQuery);
        })
      : items;

    return sortConversationItems(filtered);
  }, [groups, currentUser?.id, deferredQuery, t]);

  const totalUnread = useMemo(
    () =>
      [...directMessages, ...groupMessages].reduce(
        (sum, conversation) => sum + (conversation.unreadCount || 0),
        0
      ),
    [directMessages, groupMessages]
  );

  const renderConversationButton = (item: ConversationItem) => {
    const isActive =
      currentConversationId === item.id &&
      currentConversationType === item.type;

    return (
      <button
        type="button"
        key={`${item.type}-${item.id}`}
        onClick={() => onSelectConversation(item.id, item.type)}
        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
        style={isActive ? { backgroundColor: 'var(--ws-primary-soft)' } : undefined}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-semibold overflow-hidden"
            style={
              item.type === 'direct'
                ? undefined
                : {
                    backgroundColor: currentWorkspace?.settings?.primaryColor || '#3b82f6',
                    color: getContrastColor(
                      currentWorkspace?.settings?.primaryColor || '#3b82f6'
                    ),
                  }
            }
          >
            {item.avatar ? (
              <ClientImage
                src={item.avatar}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center ${
                  item.type === 'direct'
                    ? 'bg-gradient-to-br from-blue-400 to-cyan-600'
                    : ''
                }`}
              >
                {getInitials(item.name)}
              </div>
            )}
          </div>
          {item.type === 'direct' && item.isOnline && (
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
              {item.subtitle ? (
                <p className="text-[11px] mt-0.5 text-gray-500 truncate">{item.subtitle}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {item.lastActivityAt ? (
                <span className="text-[11px] text-gray-400">
                  {formatDate(item.lastActivityAt)}
                </span>
              ) : null}
              {item.unreadCount > 0 ? (
                <span
                  className="min-w-5 px-1.5 h-5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    backgroundColor: 'var(--ws-primary)',
                    color: 'var(--ws-primary-text)',
                  }}
                >
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </span>
              ) : null}
            </div>
          </div>
          <p
            className={`mt-1 text-sm truncate ${
              item.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`}
          >
            {item.preview}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-r">
      <div className="border-b bg-slate-50/80">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {t.workspaceSwitcher.title}
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {workspaceLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onJoinWorkspace}
              className="h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
              aria-label={t.chat.joinWorkspace}
              title={t.chat.joinWorkspace}
            >
              <svg
                className="w-5 h-5 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v14m7-7H5"
                />
              </svg>
            </button>
          </div>

          {workspacesLoading ? (
            <div className="mt-3 flex gap-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-11 w-11 rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : workspaces.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {workspaces.map((workspace) => {
                const isActive = currentWorkspace?.id === workspace.id;
                const workspaceColor = workspace.settings?.primaryColor || '#3b82f6';
                const workspaceLogo = workspace.settings?.logo;
                const label = workspace.name.substring(0, 2).toUpperCase();

                return (
                  <button
                    type="button"
                    key={workspace.id}
                    onClick={() => onSelectWorkspace(workspace)}
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center font-semibold text-sm transition-all border-2 ${
                      isActive
                        ? 'border-white shadow-lg'
                        : 'border-transparent hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: workspaceColor,
                      color: getContrastColor(workspaceColor),
                    }}
                    aria-pressed={isActive}
                    title={workspace.name}
                  >
                    {workspaceLogo ? (
                      <ClientImage
                        src={workspaceLogo}
                        alt={workspace.name}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      label
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={onJoinWorkspace}
              className="mt-3 w-full py-2 px-3 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              {t.chat.joinWorkspace}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.conversationList.title}
          </h2>
          {hasWorkspace && (
            <span className="text-xs text-gray-500">
              {totalUnread > 0
                ? t.conversationList.unreadSummary(totalUnread)
                : t.chat.stats(friends.length, groups.length)}
            </span>
          )}
        </div>
        {!hasWorkspace && (
          <p className="text-xs text-gray-500 mt-1">{t.chat.noWorkspaceSubtitle}</p>
        )}
      </div>

      <div className="p-3 border-b">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t.conversationList.searchPlaceholder}
          disabled={!hasWorkspace}
          className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900 placeholder-gray-500 disabled:opacity-60"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasWorkspace ? (
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
            <p className="text-sm">{t.chat.noWorkspaceTitle}</p>
            <p className="text-xs mt-1">{t.chat.noWorkspaceSubtitle}</p>
          </div>
        ) : directMessages.length === 0 && groupMessages.length === 0 ? (
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
            <p className="text-sm">
              {deferredQuery
                ? t.conversationList.searchEmpty
                : t.conversationList.emptyTitle}
            </p>
            <p className="text-xs mt-1">
              {deferredQuery
                ? t.conversationList.searchEmptyHint
                : t.conversationList.emptySubtitle}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {directMessages.length > 0 && (
              <>
                <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  <span>{t.conversationList.directMessages}</span>
                  <span>{directMessages.length}</span>
                </div>
                {directMessages.map(renderConversationButton)}
              </>
            )}

            {groupMessages.length > 0 && (
              <>
                <div className="px-4 pt-4 pb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  <span>{t.conversationList.groups}</span>
                  <span>{groupMessages.length}</span>
                </div>
                {groupMessages.map(renderConversationButton)}
              </>
            )}
          </div>
        )}
      </div>

      {currentUser && (
        <div className="border-t bg-slate-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-semibold">
                {currentUser.avatar ? (
                  <ClientImage
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(userName)
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                {t.chat.currentUserLabel}
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {userName}
                {currentMemberTag ? (
                  <span className="ml-1 text-gray-500">#{currentMemberTag}</span>
                ) : null}
              </p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
