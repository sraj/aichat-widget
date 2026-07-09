import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import type { Connection, ConnectionState, Message } from '@aichat-widget/shared';
import { Logger } from '@aichat-widget/shared';

interface UseConnectionOptions {
  connection: Connection;
  debug?: boolean;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: ConnectionState) => void;
}

/**
 * Hook to manage connection lifecycle and state
 * Separates connection business logic from UI
 */
export function useConnection({
  connection,
  debug = false,
  onMessage,
  onError,
  onStateChange,
}: UseConnectionOptions) {
  const [state, setState] = useState<ConnectionState>(connection.state);
  const logger = useRef(new Logger('[useConnection]', debug)).current;
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onStateChangeRef.current = onStateChange;
  }, [onMessage, onError, onStateChange]);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to connection events
    const unsubscribeMessage = connection.onMessage((message) => {
      if (!mountedRef.current) return;
      logger.debug('Message received:', message);
      onMessageRef.current?.(message);
    });

    const unsubscribeState = connection.onStateChange((newState) => {
      if (!mountedRef.current) return;
      logger.debug('State changed:', newState);
      setState(newState);
      onStateChangeRef.current?.(newState);
    });

    const unsubscribeError = connection.onError((error) => {
      if (!mountedRef.current) return;
      logger.error('Connection error:', error);
      onErrorRef.current?.(error);
    });

    // Connect
    connection.connect().catch((error) => {
      logger.error('Failed to connect:', error);
    });

    // Cleanup
    return () => {
      mountedRef.current = false;
      unsubscribeMessage();
      unsubscribeState();
      unsubscribeError();
      connection.disconnect();
    };
  }, [connection]);

  const send = useCallback(
    async (content: string) => {
      if (!connection || state !== 'connected') {
        logger.warn('Cannot send message: not connected');
        throw new Error('Not connected');
      }
      await connection.send(content);
    },
    [connection, state]
  );

  const abort = useCallback(() => {
    connection.abort();
  }, [connection]);

  return {
    state,
    send,
    abort,
    isConnected: state === 'connected',
    canAbort: state === 'connected' || state === 'connecting' || state === 'reconnecting',
    isConnecting: state === 'connecting' || state === 'reconnecting',
    isDisconnected: state === 'disconnected' || state === 'error',
  };
}
