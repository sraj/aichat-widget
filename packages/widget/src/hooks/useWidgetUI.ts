import { useState, useCallback } from 'preact/hooks';

interface UseWidgetUIOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Hook to manage widget UI state
 * Separates UI state logic from components
 */
export function useWidgetUI({ onOpen, onClose }: UseWidgetUIOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const open = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const incrementUnread = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    isOpen,
    unreadCount,
    open,
    close,
    toggle,
    incrementUnread,
    resetUnread,
  };
}
