'use client';

import { useEffect, useState } from 'react';
import type { Group } from '@/lib/types';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface GroupSettingsProps {
  group: Group;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
  onLeave: () => Promise<void>;
}

export default function GroupSettings({
  group,
  onClose,
  onRename,
  onLeave,
}: GroupSettingsProps) {
  const lang = useLang();
  const t = getTranslations(lang);
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setName(group.name);
  }, [group.id, group.name]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;

    try {
      setSaving(true);
      await onRename(trimmed);
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    try {
      setLeaving(true);
      await onLeave();
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t.groupSettings.title}
          </h2>
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.groupSettings.groupNameLabel}
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900"
              maxLength={60}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || leaving || name.trim() === group.name}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-60"
              style={{
                backgroundColor: 'var(--ws-primary)',
                color: 'var(--ws-primary-text)',
              }}
            >
              {saving ? t.groupSettings.saving : t.groupSettings.save}
            </button>
            <button
              type="button"
              onClick={handleLeave}
              disabled={saving || leaving}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60"
            >
              {leaving ? t.groupSettings.leaving : t.groupSettings.leave}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
