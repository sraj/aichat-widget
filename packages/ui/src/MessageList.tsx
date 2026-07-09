import { useRef, useEffect } from 'preact/hooks';
import type { Citation, Message } from '@aichat-widget/shared';
import { formatTimestamp, sanitizeHtml } from '@aichat-widget/shared';
import { MessageListSkeleton, TypingIndicator } from './Skeleton';
import { CitationCard } from './CitationCard';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isTyping?: boolean;
}

/**
 * Message list component with auto-scroll and loading states
 * OWASP: XSS prevention through sanitization
 */
export function MessageList({ messages, isLoading = false, isTyping = false }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  if (isLoading) {
    return <MessageListSkeleton count={3} />;
  }

  if (messages.length === 0) {
    return (
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="text-center text-gray-400">
          <svg
            class="w-12 h-12 mx-auto mb-3 opacity-50"
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
          <p class="text-sm">Start a conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      style={{ backgroundColor: 'var(--widget-background-color)' }}
    >
      {messages.map((message, index) => {
        const citationsRaw = message.metadata?.citations;
        const citations = Array.isArray(citationsRaw)
          ? citationsRaw.filter((citation): citation is Citation => {
              return (
                typeof citation === 'object' &&
                citation !== null &&
                typeof (citation as Citation).title === 'string'
              );
            })
          : [];
        const isStreaming = message.metadata?.streamStatus === 'streaming';

        return (
          <div
            key={message.id}
            ref={index === messages.length - 1 ? lastMessageRef : undefined}
            class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              class={`max-w-[80%] rounded-lg p-3 message-shadow ${
                message.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'
              }`}
              style={{
                backgroundColor:
                  message.role === 'user'
                    ? 'var(--widget-primary-color)'
                    : message.role === 'error'
                    ? '#fee2e2'
                    : '#f3f4f6',
                color:
                  message.role === 'user'
                    ? '#ffffff'
                    : message.role === 'error'
                    ? '#dc2626'
                    : 'var(--widget-text-color)',
              }}
            >
              {/* OWASP: XSS Prevention - sanitize all user content */}
              <div
                class="text-sm whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.content) }}
              />

              {isStreaming && message.role === 'assistant' && (
                <span class="inline-block ml-1 animate-pulse text-xs align-middle">|</span>
              )}

              {citations.length > 0 && message.role === 'assistant' && (
                <div class="mt-2 space-y-2">
                  {citations.map((citation, citationIndex) => (
                    <CitationCard
                      key={`${message.id}-citation-${citationIndex}`}
                      citation={citation}
                    />
                  ))}
                </div>
              )}

              <div
                class={`text-xs mt-1 ${
                  message.role === 'user'
                    ? 'text-white/70'
                    : message.role === 'error'
                    ? 'text-red-500/70'
                    : 'text-gray-500'
                }`}
              >
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Show typing indicator when assistant is typing */}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
