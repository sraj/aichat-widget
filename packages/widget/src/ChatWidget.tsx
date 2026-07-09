import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { WidgetConfig, WidgetEventMap, Message } from '@aichat-widget/shared';
import {
  getDefaultConfig,
  deepMerge,
  generateId,
  EventEmitter,
  Logger,
} from '@aichat-widget/shared';
import { ErrorBoundary, ChatToggle, ChatPanel } from '@aichat-widget/ui';
import { createConnection } from './connections';
import { useConnection, useMessages, useWidgetUI, useFocusTrap } from './hooks';

interface ChatWidgetProps {
  config: WidgetConfig;
  events: EventEmitter<WidgetEventMap>;
}

/**
 * Main Chat Widget component with separated business logic
 * OWASP Security: Input validation, output encoding, secure defaults
 */
export function ChatWidget({ config, events }: ChatWidgetProps) {
  const logger = new Logger('[ChatWidget]', config.debug);

  // Merge config with secure defaults
  const fullConfig = deepMerge(getDefaultConfig(), config);
  const { theme, position, panel, title, placeholder, persistHistory, connection: connConfig } =
    fullConfig;

  // Ensure required configs exist (TypeScript safety)
  if (!connConfig || !position || !panel) {
    throw new Error('[ChatWidget] Invalid configuration: missing required connection, position, or panel config');
  }

  // Business Logic Hooks (Separation of Concerns)
  const { isOpen, unreadCount, close, toggle, incrementUnread, resetUnread, open } = useWidgetUI({
    onOpen: () => {
      resetUnread();
    },
    onClose: () => {
      // No-op
    },
  });

  // Emit events when state changes (only for external listeners, not internal)
  useEffect(() => {
    events.emit(isOpen ? 'open' : 'close');
  }, [isOpen, events]);

  // Listen for external open/close calls from widget instance API  
  // These come from shadow-dom.tsx widgetElement.open()/close()
  useEffect(() => {
    const handleOpen = (_event: Event) => {
      logger.debug('[ChatWidget] External open() called');
      if (!isOpen) {
        open();
      }
    };

    const handleClose = (_event: Event) => {
      logger.debug('[ChatWidget] External close() called');
      if (isOpen) {
        close();
      }
    };

    // Use custom event names to avoid confusion with state change events
    window.addEventListener('widget-api-open', handleOpen);
    window.addEventListener('widget-api-close', handleClose);

    return () => {
      window.removeEventListener('widget-api-open', handleOpen);
      window.removeEventListener('widget-api-close', handleClose);
    };
  }, [isOpen, open, close, logger]);

  const { messages, addMessage, upsertMessage } = useMessages({
    initialMessages: config.initialMessages,
    persistHistory,
    debug: config.debug,
  });
  const seenMessageIdsRef = useRef(new Set<string>());
  const externalMessageSnapshotRef = useRef(new Map<string, { content: string; citationsKey: string }>());

  useEffect(() => {
    // Keep snapshot cache bounded to ids that still exist in message history.
    const aliveIds = new Set(messages.map((message) => message.id));

    for (const id of externalMessageSnapshotRef.current.keys()) {
      if (!aliveIds.has(id)) {
        externalMessageSnapshotRef.current.delete(id);
      }
    }

    for (const id of seenMessageIdsRef.current) {
      if (!aliveIds.has(id)) {
        seenMessageIdsRef.current.delete(id);
      }
    }
  }, [messages]);

  // Initialize connection (memoized to prevent recreation on every render)
  // Using JSON.stringify for stable dependency comparison of the config object
  const connection = useMemo(() => {
    return createConnection({
      ...connConfig,
      headers: {
        ...connConfig.headers,
        Authorization: `Bearer ${config.apiKey}`,
        // Don't send debug header - it's for client-side logging only
      },
    });
  }, [JSON.stringify(connConfig), config.apiKey]);

  const { state: connectionState, send, abort, isConnected } = useConnection({
    connection,
    debug: config.debug,
    onMessage: (message: Message) => {
      logger.debug('Received message:', message);

      // OWASP: Validate message structure
      if (!message.id || !message.role || typeof message.content !== 'string') {
        logger.error('Invalid message structure:', message);
        return;
      }

      const isNewMessage = !seenMessageIdsRef.current.has(message.id);
      if (isNewMessage) {
        seenMessageIdsRef.current.add(message.id);
      }

      // Stream updates reuse the same id; upsert keeps a single assistant bubble.
      upsertMessage(message);

      // External listeners don't need status-only duplicates when text/sources are unchanged.
      const citations = Array.isArray(message.metadata?.citations)
        ? message.metadata?.citations
        : [];
      const citationsKey = JSON.stringify(
        citations.map((citation) => ({
          title: citation.title,
          url: citation.url,
          score: citation.score,
          snippet: citation.snippet,
        }))
      );

      const previousSnapshot = externalMessageSnapshotRef.current.get(message.id);
      const shouldEmitExternalMessage =
        !previousSnapshot ||
        previousSnapshot.content !== message.content ||
        previousSnapshot.citationsKey !== citationsKey;

      if (shouldEmitExternalMessage) {
        externalMessageSnapshotRef.current.set(message.id, {
          content: message.content,
          citationsKey,
        });
        events.emit('message', message);
      }

      // Increment unread count if panel is closed
      if (!isOpen && isNewMessage) {
        incrementUnread();
      }
    },
    onError: (error: Error) => {
      logger.error('Connection error:', error);

      // Add user-friendly error message
      const errorMessage: Message = {
        id: generateId(),
        role: 'error',
        content: `Connection error: ${error.message}`,
        timestamp: Date.now(),
      };
      addMessage(errorMessage);

      events.emit('error', error);

      if (config.onError) {
        config.onError(error);
      }
    },
    onStateChange: (state) => {
      logger.debug('Connection state changed:', state);
      events.emit('connectionChange', state);
    },
  });

  // Focus trap for accessibility (WCAG 2.1) - only when overlay is enabled
  const shouldTrapFocus = isOpen && (panel.showOverlay !== false);
  const focusTrapRef = useFocusTrap(shouldTrapFocus);

  // Prevent body scroll when widget is open with overlay (focus trap)
  useEffect(() => {
    if (isOpen && panel.showOverlay !== false) {
      // Get the host document body (outside shadow DOM)
      const hostBody = document.body;
      const originalOverflow = hostBody.style.overflow;
      const originalPaddingRight = hostBody.style.paddingRight;
      
      // Check if there's a scrollbar
      const hasScrollbar = window.innerWidth > document.documentElement.clientWidth;
      
      // Prevent scroll
      hostBody.style.overflow = 'hidden';
      
      // Prevent layout shift by adding padding for scrollbar
      if (hasScrollbar) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        hostBody.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        hostBody.style.overflow = originalOverflow;
        hostBody.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen, panel.showOverlay]);

  // Listen for Escape key from focus trap
  useEffect(() => {
    const handleCloseRequest = () => {
      if (isOpen) {
        close();
      }
    };

    window.addEventListener('widget-close-requested', handleCloseRequest);
    return () => window.removeEventListener('widget-close-requested', handleCloseRequest);
  }, [isOpen, close]);

  // Apply theme CSS variables
  useEffect(() => {
    if (theme) {
      const root = document.documentElement;
      if (theme.primaryColor) root.style.setProperty('--widget-primary-color', theme.primaryColor);
      if (theme.backgroundColor)
        root.style.setProperty('--widget-background-color', theme.backgroundColor);
      if (theme.textColor) root.style.setProperty('--widget-text-color', theme.textColor);
      if (theme.fontFamily) root.style.setProperty('--widget-font-family', theme.fontFamily);
      if (theme.borderRadius) root.style.setProperty('--widget-border-radius', theme.borderRadius);
    }
  }, [theme]);

  const handleSend = async (content: string) => {
    if (!isConnected) {
      logger.warn('Cannot send message: not connected');
      
      // Show error to user
      const errorMessage: Message = {
        id: generateId(),
        role: 'error',
        content: 'Not connected. Please wait for connection to establish.',
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
      return;
    }

    // OWASP: Input validation (additional client-side check)
    if (content.length > 5000) {
      logger.error('Message too long:', content.length);
      return;
    }

    // Check if sending should be prevented
    events.emit('beforeSend', content);
    // Note: beforeSend handler can be used for validation but doesn't prevent send
    // To prevent, use onError or validation in the handler

    // Add user message to UI immediately (optimistic update)
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    addMessage(userMessage);

    // Send to backend
    try {
      await send(content);
    } catch (error) {
      logger.error('Failed to send message:', error);

      const errorMessage: Message = {
        id: generateId(),
        role: 'error',
        content: `Failed to send: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    }
  };

  return (
    <ErrorBoundary onError={(error) => events.emit('error', error)}>
      <div class="font-sans">
        <ChatToggle
          isOpen={isOpen}
          position={position}
          onClick={toggle}
          unreadCount={unreadCount}
        />
        <ChatPanel
          isOpen={isOpen}
          title={title!}
          placeholder={placeholder!}
          panel={panel!}
          messages={messages}
          connectionState={connectionState}
          isStreaming={messages.some((msg) => msg.metadata?.streamStatus === 'streaming')}
          onClose={close}
          onSend={handleSend}
          onAbort={abort}
          focusTrapRef={focusTrapRef}
        />
      </div>
    </ErrorBoundary>
  );
}
