import type { ConnectionConfig, Message } from '@aichat-widget/shared';
import { generateId } from '@aichat-widget/shared';
import { BaseConnection } from './base';

/**
 * SSE (Server-Sent Events) connection implementation
 */
export class SSEConnection extends BaseConnection {
  private eventSource: EventSource | null = null;
  private sendEndpoint: string;

  constructor(config: ConnectionConfig) {
    super(config);
    const sseEndpoint = config.sseEndpoint || '/api/chat/stream';
    const messagesEndpoint = config.messagesEndpoint || '/api/chat/messages';
    this.sendEndpoint = `${config.baseUrl}${messagesEndpoint}`;
    
    // SSE endpoint URL construction
    const sseUrl = new URL(`${config.baseUrl}${sseEndpoint}`);
    // Add API key as query param for SSE (since we can't set headers)
    sseUrl.searchParams.set('apiKey', this.getApiKey());
    this.eventSourceUrl = sseUrl.toString();
  }

  private eventSourceUrl: string;

  private getApiKey(): string {
    // Extract API key from headers or config
    return this.config.headers?.['Authorization']?.replace('Bearer ', '') || '';
  }

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      this.logger.debug('Already connected or connecting');
      return;
    }

    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('connecting');
    this.logger.debug('Connecting via SSE:', this.eventSourceUrl);

    try {
      this.eventSource = new EventSource(this.eventSourceUrl);

      this.eventSource.onopen = () => {
        this.logger.debug('SSE connection opened');
        this.setState('connected');
        this.resetReconnectState();
        this.processMessageQueue();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          this.logger.debug('Received message:', message);
          this.events.emit('message', message);
        } catch (error) {
          this.logger.error('Failed to parse message:', error);
        }
      };

      this.eventSource.onerror = (_event) => {
        const es = this.eventSource;
        if (!es) return;

        // Check EventSource readyState
        // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        if (es.readyState === EventSource.CLOSED) {
          this.logger.error('SSE connection closed');
          this.setState('disconnected');
          if (this.config.autoReconnect !== false) {
            this.scheduleReconnect();
          }
        } else if (es.readyState === EventSource.CONNECTING) {
          // Still trying to connect, don't treat as error yet
          this.logger.debug('SSE reconnecting...');
        }
      };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.debug('Disconnecting SSE');
    this.resetReconnectState();

    if (this.eventSource) {
      // Remove event listeners before closing to prevent triggering onerror
      this.eventSource.onopen = null;
      this.eventSource.onmessage = null;
      this.eventSource.onerror = null;
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('disconnected');
  }

  abort(): void {
    // EventSource transport is receive-only and has no in-flight POST stream to abort.
    // Keep this as a no-op for interface compatibility.
  }

  async send(content: string): Promise<void> {
    if (this._state !== 'connected') {
      this.queueMessage(content);
      return;
    }

    const message: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(this.sendEndpoint, {
        method: 'POST',
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(message),
        credentials: 'omit', // Don't send cookies for cross-origin requests
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Parse response and emit AI message if present
      const data = await response.json();
      this.logger.debug('Message sent successfully:', data);
      
      if (data.response) {
        // Server returned an AI response, emit it as a message
        this.events.emit('message', data.response as Message);
      }
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      throw error;
    }
  }
}
