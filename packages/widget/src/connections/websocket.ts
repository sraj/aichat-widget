import type { ConnectionConfig, Message } from '@aichat-widget/shared';
import { generateId } from '@aichat-widget/shared';
import { BaseConnection } from './base';

/**
 * WebSocket connection implementation
 */
export class WebSocketConnection extends BaseConnection {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private wsUrl: string;

  constructor(config: ConnectionConfig) {
    super(config);
    const wsEndpoint = config.wsEndpoint || '/ws';
    
    // Convert HTTP(S) to WS(S)
    const url = new URL(`${config.baseUrl}${wsEndpoint}`);
    url.protocol = url.protocol.replace('http', 'ws');
    
    // Add API key as query param
    const apiKey = this.config.headers?.['Authorization']?.replace('Bearer ', '') || '';
    url.searchParams.set('apiKey', apiKey);
    
    this.wsUrl = url.toString();
  }

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      this.logger.debug('Already connected or connecting');
      return;
    }

    this.setState('connecting');
    this.logger.debug('Connecting via WebSocket:', this.wsUrl);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.logger.debug('WebSocket connection opened');
          this.setState('connected');
          this.resetReconnectState();
          this.startPingInterval();
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle ping/pong
            if (data.type === 'ping') {
              this.sendPong();
              return;
            }

            // Handle regular messages
            if (data.type === 'message') {
              const message: Message = data.payload;
              this.logger.debug('Received message:', message);
              this.events.emit('message', message);
            }
          } catch (error) {
            this.logger.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (event) => {
          this.logger.error('WebSocket error:', event);
          const error = new Error('WebSocket connection error');
          this.handleError(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          this.logger.debug('WebSocket closed:', event.code, event.reason);
          this.stopPingInterval();
          this.setState('disconnected');

          if (!event.wasClean && this.config.autoReconnect !== false) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.logger.debug('Disconnecting WebSocket');

    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
    this.resetReconnectState();
  }

  async send(content: string): Promise<void> {
    if (this._state !== 'connected' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
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
      this.ws.send(
        JSON.stringify({
          type: 'message',
          payload: message,
        })
      );
      this.logger.debug('Message sent successfully');
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      throw error;
    }
  }

  abort(): void {
    // WebSocket protocol does not have a request-scoped stream to abort.
    // Keep as a no-op for interface compatibility.
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          this.logger.error('Failed to send ping:', error);
        }
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendPong(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'pong' }));
      } catch (error) {
        this.logger.error('Failed to send pong:', error);
      }
    }
  }
}
