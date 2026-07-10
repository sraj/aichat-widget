import type { PanelConfig } from '@aichat-widget/shared';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message, ConnectionState } from '@aichat-widget/shared';
import { Z_INDEX } from '@aichat-widget/shared';
import type { Ref } from 'preact';

interface ChatPanelProps {
  isOpen: boolean;
  title: string;
  placeholder: string;
  panel: PanelConfig;
  messages: Message[];
  connectionState: ConnectionState;
  isStreaming?: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  onAbort?: () => void;
  focusTrapRef?: Ref<HTMLDivElement>;
}

/**
 * Main chat panel component with slide-out animation and focus trap
 * WCAG 2.1: Focus management for modal dialogs
 */
export function ChatPanel({
  isOpen,
  title,
  placeholder,
  panel,
  messages,
  connectionState,
  isStreaming = false,
  onClose,
  onSend,
  onAbort,
  focusTrapRef,
}: ChatPanelProps) {
  const { mode = 'slide-out', showOverlay = true } = panel;

  // Determine panel positioning based on mode
  const getPanelClasses = () => {
    const baseClasses = `fixed flex flex-col widget-shadow transition-all duration-300`;

    switch (mode) {
      case 'slide-out':
        return `${baseClasses} top-0 right-0 h-full w-96 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`;
      case 'popover':
        return `${baseClasses} bottom-20 right-5 w-96 h-[600px] rounded-lg overflow-hidden origin-bottom-right ${isOpen ? 'scale-100' : 'scale-0'}`;
      case 'fullscreen':
        return `${baseClasses} inset-0 w-full h-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;
      default:
        return `${baseClasses} top-0 right-0 h-full w-96 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`;
    }
  };

  const isDisabled = connectionState !== 'connected';
  const panelClasses = getPanelClasses();

  return (
    <>
      {/* Overlay/Backdrop */}
      {showOverlay && isOpen && (
        <div
          class="fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-300"
          style={{ zIndex: Z_INDEX.OVERLAY }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Chat Panel */}
      <div
        ref={focusTrapRef}
        class={panelClasses}
        style={{ backgroundColor: 'var(--widget-background-color)', zIndex: Z_INDEX.PANEL }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <Header title={title} connectionState={connectionState} onClose={onClose} />
        <MessageList messages={messages} />
        <MessageInput
          placeholder={placeholder}
          disabled={isDisabled}
          onSend={onSend}
          isStreaming={isStreaming}
          onAbort={onAbort}
        />
      </div>
    </>
  );
}
