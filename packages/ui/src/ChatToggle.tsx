import type { PositionConfig } from '@aichat-widget/shared';
import { Z_INDEX } from '@aichat-widget/shared';

interface ChatToggleProps {
  isOpen: boolean;
  position: PositionConfig;
  onClick: () => void;
  unreadCount?: number;
}

/**
 * Floating toggle button to open/close the chat - Freshdesk style
 */
export function ChatToggle({ isOpen, position, onClick, unreadCount = 0 }: ChatToggleProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  // Position classes mapping
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const positionClass = positionClasses[position.position || 'bottom-right'];

  return (
    <button
      class={`fixed ${positionClass} px-5 py-3 rounded-full widget-shadow hover:shadow-2xl transition-all duration-300 focus:outline-none flex items-center gap-3 ${
        isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
      }`}
      style={{
        backgroundColor: 'var(--widget-primary-color)',
        pointerEvents: isOpen ? 'none' : 'auto',
        zIndex: position.zIndex || Z_INDEX.TOGGLE,
        minWidth: '60px',
        minHeight: '60px',
      }}
      onClick={handleClick}
      aria-label="Open chat"
      type="button"
    >
      {/* Chat Icon - Modern Freshdesk-style */}
      <svg
        class="w-7 h-7 text-white flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* Text Label - Freshdesk style */}
      <span class="text-white font-medium text-sm whitespace-nowrap">
        Chat with us
      </span>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div class="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
          <span class="text-white text-xs font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </button>
  );
}
