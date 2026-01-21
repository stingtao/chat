import { Message } from '@/lib/types';
import { formatTime, getInitials } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showReadReceipt?: boolean;
}

// Read receipt status icons
function ReadReceiptIcon({ status }: { status: 'sent' | 'delivered' | 'read' }) {
  if (status === 'read') {
    // Double check mark (blue for read)
    return (
      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7M5 13l4 4L19 7" transform="translate(-2, 0)" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7M5 13l4 4L19 7" transform="translate(2, 0)" />
      </svg>
    );
  }
  if (status === 'delivered') {
    // Double check mark (gray for delivered)
    return (
      <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" transform="translate(-2, 0)" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" transform="translate(2, 0)" />
      </svg>
    );
  }
  // Single check mark (gray for sent)
  return (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function MessageBubble({ message, isOwn, showReadReceipt = false }: MessageBubbleProps) {
  // Determine read receipt status
  const getReadStatus = (): 'sent' | 'delivered' | 'read' => {
    try {
      const readBy = JSON.parse(message.readBy || '[]');
      if (Array.isArray(readBy) && readBy.length > 0) {
        return 'read';
      }
    } catch {
      // If parsing fails, assume sent
    }
    // For now, assume delivered if message has an ID (was saved)
    return message.id ? 'delivered' : 'sent';
  };
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
            ? 'rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
        style={
          isOwn
            ? { backgroundColor: 'var(--ws-primary)', color: 'var(--ws-primary-text)' }
            : undefined
        }
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
              isOwn ? '' : 'bg-gray-200'
            }`}
            style={
              isOwn
                ? {
                    backgroundColor: 'var(--ws-secondary)',
                    color: 'var(--ws-secondary-text)',
                  }
                : undefined
            }
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
          className="text-xs mt-1 flex items-center gap-1 justify-end"
          style={
            isOwn
              ? { color: 'var(--ws-primary-text)', opacity: 0.8 }
              : { color: '#6b7280' }
          }
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && showReadReceipt && <ReadReceiptIcon status={getReadStatus()} />}
        </div>
      </div>
    </div>
  );
}
