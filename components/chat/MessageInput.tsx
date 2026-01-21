'use client';

import { useState, useRef } from 'react';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface MessageInputProps {
  onSend: (content: string) => void;
  onFileUpload?: (file: File) => void;
  placeholder?: string;
  disabled?: boolean;
  uploading?: boolean;
  onTyping?: () => void;
}

export default function MessageInput({
  onSend,
  onFileUpload,
  placeholder,
  disabled = false,
  uploading = false,
  onTyping,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = useLang();
  const t = getTranslations(lang);
  const resolvedPlaceholder = placeholder || t.messageInput.placeholder;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isSendDisabled = !message.trim() || disabled;

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white p-4">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          disabled={disabled || uploading}
          title={t.messageInput.attachFile}
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
          ) : (
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
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          )}
        </button>

        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (e.target.value.trim()) {
              onTyping?.();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] focus:border-transparent disabled:bg-gray-100 text-gray-900 placeholder-gray-400"
        />

        <button
          type="submit"
          disabled={isSendDisabled}
          className="p-2 rounded-full disabled:cursor-not-allowed transition-colors hover:opacity-90"
          style={
            isSendDisabled
              ? { backgroundColor: '#d1d5db', color: '#6b7280' }
              : { backgroundColor: 'var(--ws-primary)', color: 'var(--ws-primary-text)' }
          }
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
