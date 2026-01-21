'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ClientUser } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface ProfileSettingsProps {
  user: ClientUser;
  onClose: () => void;
  onSave: (data: { username?: string; avatar?: string | null }) => Promise<void>;
}

export default function ProfileSettings({
  user,
  onClose,
  onSave,
}: ProfileSettingsProps) {
  const lang = useLang();
  const t = getTranslations(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const response = await api.uploadFile(file);
      if (response.success && response.data?.url) {
        setAvatar(response.data.url);
      } else {
        alert(t.profileSettings.uploadFailed(response.error || t.chat.unknownError));
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      alert(t.profileSettings.usernameRequired);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        username: trimmed,
        avatar: avatar || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t.profileSettings.title}
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

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-semibold overflow-hidden">
              {avatar ? (
                <img
                  src={avatar}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(username)
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleUpload(file);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-60"
              >
                {uploading ? t.profileSettings.uploading : t.profileSettings.upload}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.profileSettings.usernameLabel}
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] text-gray-900"
              maxLength={30}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              disabled={saving || uploading}
            >
              {t.profileSettings.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-60"
              style={{
                backgroundColor: 'var(--ws-primary)',
                color: 'var(--ws-primary-text)',
              }}
            >
              {saving ? t.profileSettings.saving : t.profileSettings.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
