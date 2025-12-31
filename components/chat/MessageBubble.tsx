import { Message } from '@/lib/types';
import { formatTime, getInitials } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div
      className={`flex items-end gap-2 mb-3 message-slide-in ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isOwn && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
          {message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderName || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(message.senderName || 'U')
          )}
        </div>
      )}

      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isOwn
            ? 'bg-green-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {!isOwn && message.senderName && (
          <div className="text-xs font-semibold mb-1 text-gray-600">
            {message.senderName}
          </div>
        )}

        {message.type === 'image' && message.fileUrl && (
          <img
            src={message.fileUrl}
            alt="Shared image"
            className="rounded-lg max-w-full mb-1"
          />
        )}

        {message.type === 'file' && message.fileUrl && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${
              isOwn ? 'bg-green-600' : 'bg-gray-200'
            }`}
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm underline">{message.content}</span>
          </a>
        )}

        {message.content && message.type !== 'file' && (
          <div className="break-words">{message.content}</div>
        )}

        <div
          className={`text-xs mt-1 ${
            isOwn ? 'text-green-100' : 'text-gray-500'
          }`}
        >
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
