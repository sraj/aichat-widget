import type { Connection, ConnectionConfig } from '@aichat-widget/shared';
import { SSEConnection } from './sse';
import { FetchSSEConnection } from './fetch-sse';
import { WebSocketConnection } from './websocket';

/**
 * Factory function to create appropriate connection based on config
 */
export function createConnection(config: ConnectionConfig): Connection {
  switch (config.protocol) {
    case 'sse':
      return new SSEConnection(config);
    case 'fetch-sse':
      return new FetchSSEConnection(config);
    case 'websocket':
      return new WebSocketConnection(config);
    default:
      throw new Error(`Unsupported connection protocol: ${config.protocol}`);
  }
}

export { BaseConnection } from './base';
export { SSEConnection } from './sse';
export { FetchSSEConnection } from './fetch-sse';
export { WebSocketConnection } from './websocket';
