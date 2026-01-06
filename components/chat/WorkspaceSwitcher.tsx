'use client';

import { useState } from 'react';
import { Workspace } from '@/lib/types';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (workspace: Workspace) => void;
  onJoinWorkspace: (inviteCode: string) => void;
  onClose: () => void;
}

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onJoinWorkspace,
  onClose,
}: WorkspaceSwitcherProps) {
  console.log('WorkspaceSwitcher component rendered!');
  console.log('Props:', { workspaces, currentWorkspace, showJoinForm: false });

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const lang = useLang();
  const t = getTranslations(lang);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      onJoinWorkspace(inviteCode.trim());
      setInviteCode('');
      setShowJoinForm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t.workspaceSwitcher.title}</h2>
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

        {/* Workspace List */}
        <div className="overflow-y-auto max-h-96 p-2">
          {workspaces.map((workspace) => (
            <button
              type="button"
              key={workspace.id}
              onClick={() => {
                onSelectWorkspace(workspace);
                onClose();
              }}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-colors mb-2 border-2 ${
                currentWorkspace?.id === workspace.id
                  ? ''
                  : 'hover:bg-gray-50 border-transparent'
              }`}
              style={
                currentWorkspace?.id === workspace.id
                  ? {
                      backgroundColor: 'var(--ws-primary-soft)',
                      borderColor: 'var(--ws-primary)',
                    }
                  : undefined
              }
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{
                  backgroundColor: workspace.settings?.primaryColor || '#3b82f6',
                }}
              >
                {workspace.settings?.logo ? (
                  <img
                    src={workspace.settings.logo}
                    alt={workspace.name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  workspace.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
                <p className="text-sm text-gray-500">{workspace.slug}</p>
              </div>
              {currentWorkspace?.id === workspace.id && (
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
          ))}

          {workspaces.length === 0 && !showJoinForm && (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">{t.workspaceSwitcher.emptyTitle}</p>
              <p className="text-xs mt-1">{t.workspaceSwitcher.emptySubtitle}</p>
            </div>
          )}
        </div>

        {/* Join Workspace Form */}
        {showJoinForm ? (
          <form onSubmit={handleJoin} className="p-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.workspaceSwitcher.inviteCodeLabel}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123XY"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--ws-primary)] focus:border-transparent uppercase text-gray-900 placeholder-gray-400"
                maxLength={8}
                required
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-medium hover:opacity-90"
                style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-primary-text)' }}
              >
                {t.workspaceSwitcher.join}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowJoinForm(false)}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {t.workspaceSwitcher.cancel}
            </button>
          </form>
        ) : (
          <div className="p-4 border-t">
            <button
              type="button"
              onClick={() => setShowJoinForm(true)}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-primary-text)' }}
            >
              {t.workspaceSwitcher.joinWorkspace}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
