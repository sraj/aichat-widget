import type { ConnectionState } from '@aichat-widget/shared';

interface HeaderProps {
  title: string;
  connectionState: ConnectionState;
  onClose: () => void;
}

/**
 * Chat panel header with title, status, and controls
 */
export function Header({ title, connectionState, onClose }: HeaderProps) {
  const statusLabels = {
    connecting: 'Connecting...',
    connected: 'Online',
    disconnected: 'Offline',
    error: 'Error',
    reconnecting: 'Reconnecting...',
  };

  const statusColors = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
    reconnecting: 'bg-orange-500',
  };

  return (
    <div
      class="flex items-center justify-between p-4 border-b"
      style={{
        backgroundColor: 'var(--widget-background-color)',
        borderColor: 'rgba(0, 0, 0, 0.1)',
      }}
    >
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold" style={{ color: 'var(--widget-text-color)' }}>
          {title}
        </h2>
        <div class="flex items-center gap-2">
          <div class={`w-2 h-2 rounded-full ${statusColors[connectionState]}`} />
          <span class="text-xs text-gray-500">{statusLabels[connectionState]}</span>
        </div>
      </div>

      <button
        onClick={onClose}
        class="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="Close chat"
        type="button"
      >
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
