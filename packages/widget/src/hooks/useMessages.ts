import { useState, useEffect, useRef } from 'preact/hooks';
import type { Message } from '@aichat-widget/shared';
import { storage, Logger } from '@aichat-widget/shared';

interface UseMessagesOptions {
  initialMessages?: Message[];
  persistHistory?: boolean;
  storageKey?: string;
  debug?: boolean;
}

/**
 * Hook to manage messages state and persistence
 * Separates message business logic from UI
 */
export function useMessages({
  initialMessages = [],
  persistHistory = true,
  storageKey = 'aichat-widget-messages',
  debug = false,
}: UseMessagesOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const logger = useRef(new Logger('[useMessages]', debug)).current;
  const initializedRef = useRef(false);

  // Load persisted messages on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;

      if (persistHistory) {
        const stored = storage.get<Message[]>(storageKey);
        if (stored && Array.isArray(stored)) {
          logger.debug('Loaded persisted messages:', stored.length);
          setMessages([...initialMessages, ...stored]);
          return;
        }
      }

      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      }
    }
  }, []);

  // Persist messages when they change
  useEffect(() => {
    if (persistHistory && messages.length > 0 && initializedRef.current) {
      storage.set(storageKey, messages);
      logger.debug('Persisted messages:', messages.length);
    }
  }, [messages, persistHistory, storageKey]);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const addMessages = (newMessages: Message[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
  };

  const clearMessages = () => {
    setMessages([]);
    if (persistHistory) {
      storage.remove(storageKey);
    }
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    );
  };

  const upsertMessage = (message: Message) => {
    setMessages((prev) => {
      const index = prev.findIndex((msg) => msg.id === message.id);
      if (index === -1) {
        return [...prev, message];
      }

      const next = [...prev];
      next[index] = { ...next[index], ...message };
      return next;
    });
  };

  return {
    messages,
    addMessage,
    addMessages,
    clearMessages,
    updateMessage,
    upsertMessage,
    hasMessages: messages.length > 0,
  };
}
