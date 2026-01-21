'use client';

import { ClientUser, Friendship, Group, Workspace } from '@/lib/types';
import { getContrastColor, getInitials, isUserOnline } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

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
  const lang = useLang();
  const t = getTranslations(lang);
  const hasWorkspace = Boolean(currentWorkspace);
  const workspaceLabel = currentWorkspace?.name || t.chat.noWorkspaceTitle;
  const userName = currentUser?.username || t.common.unknown;
  const userEmail = currentUser?.email || t.common.noEmail;

  return (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Workspace Selector */}
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
                      <img
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

      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.conversationList.title}
          </h2>
          {hasWorkspace && (
            <span className="text-xs text-gray-500">
              {t.chat.stats(friends.length, groups.length)}
            </span>
          )}
        </div>
        {!hasWorkspace && (
          <p className="text-xs text-gray-500 mt-1">{t.chat.noWorkspaceSubtitle}</p>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <input
          type="text"
          placeholder={t.conversationList.searchPlaceholder}
          disabled={!hasWorkspace}
          className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900 placeholder-gray-500 disabled:opacity-60"
        />
      </div>

      {/* Conversation List */}
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
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Current User */}
      {currentUser && (
        <div className="border-t bg-slate-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-semibold">
                {currentUser.avatar ? (
                  <img
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
