import type {
  Connection,
  ConnectionState,
  Message,
  ConnectionConfig,
} from '@aichat-widget/shared';
import { EventEmitter, calculateBackoff, Logger } from '@aichat-widget/shared';

export interface ConnectionEvents {
  message: (message: Message) => void;
  stateChange: (state: ConnectionState) => void;
  error: (error: Error) => void;
}

/**
 * Base connection class with reconnection logic
 */
export abstract class BaseConnection implements Connection {
  protected _state: ConnectionState = 'disconnected';
  protected events = new EventEmitter<ConnectionEvents>();
  protected logger: Logger;
  protected reconnectAttempts = 0;
  protected reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  protected messageQueue: string[] = [];

  constructor(protected config: ConnectionConfig) {
    this.logger = new Logger('[Connection]', config.headers?.['debug'] === 'true');
  }

  get state(): ConnectionState {
    return this._state;
  }

  protected setState(state: ConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this.logger.debug('State changed:', state);
      this.events.emit('stateChange', state);
    }
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: string): Promise<void>;
  abstract abort(): void;

  onMessage(handler: (message: Message) => void): () => void {
    return this.events.on('message', handler);
  }

  onStateChange(handler: (state: ConnectionState) => void): () => void {
    return this.events.on('stateChange', handler);
  }

  onError(handler: (error: Error) => void): () => void {
    return this.events.on('error', handler);
  }

  protected handleError(error: Error): void {
    this.logger.error('Connection error:', error);
    this.events.emit('error', error);
    this.setState('error');

    if (this.config.autoReconnect !== false) {
      this.scheduleReconnect();
    }
  }

  protected scheduleReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts ?? 10;

    if (maxAttempts > 0 && this.reconnectAttempts >= maxAttempts) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const baseDelay = this.config.reconnectDelay ?? 1000;
    const maxDelay = this.config.maxReconnectDelay ?? 30000;
    const delay = calculateBackoff(this.reconnectAttempts, baseDelay, maxDelay);

    this.logger.debug(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.setState('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        this.logger.error('Reconnection failed:', error);
      });
    }, delay);
  }

  protected resetReconnectState(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  protected async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this._state === 'connected') {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this.send(message);
        } catch (error) {
          this.logger.error('Failed to send queued message:', error);
          // Re-queue the message
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  protected queueMessage(message: string): void {
    this.logger.debug('Queuing message (connection not ready)');
    this.messageQueue.push(message);
  }
}
