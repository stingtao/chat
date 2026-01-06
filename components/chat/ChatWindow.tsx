'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { getTranslations } from '@/lib/i18n';
import { useLang } from '@/hooks/useLang';

interface ChatWindowProps {
  conversationName: string;
  conversationAvatar?: string;
  messages: Message[];
  currentUserId: string;
  onBack?: () => void;
  onSendMessage: (content: string) => void;
  onFileUpload?: (file: File) => void;
  loading?: boolean;
  uploading?: boolean;
}

export default function ChatWindow({
  conversationName,
  conversationAvatar,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
  onFileUpload,
  loading = false,
  uploading = false,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lang = useLang();
  const t = getTranslations(lang);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            aria-label={t.chatWindow.backLabel}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {conversationAvatar ? (
            <img
              src={conversationAvatar}
              alt={conversationName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            conversationName.substring(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">{conversationName}</h2>
          <p className="text-xs" style={{ color: 'var(--ws-secondary)' }}>{t.chatWindow.online}</p>
        </div>
        <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
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
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderBottomColor: 'var(--ws-primary)' }}
            ></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm">{t.chatWindow.noMessagesTitle}</p>
              <p className="text-xs mt-1">{t.chatWindow.noMessagesSubtitle}</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSend={onSendMessage}
        onFileUpload={onFileUpload}
        disabled={loading}
        uploading={uploading}
      />
    </div>
  );
}
