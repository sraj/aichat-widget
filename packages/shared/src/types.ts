import { z } from 'zod';

/**
 * Z-index constants for layering
 * Ensures proper stacking of widget components
 */
export const Z_INDEX = {
  OVERLAY: 999997,
  PANEL: 999998,
  TOGGLE: 999999,
  ERROR: 999999,
} as const;

/**
 * Widget position on the page
 */
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

/**
 * Panel display mode
 */
export type PanelMode = 'slide-out' | 'popover' | 'fullscreen';

/**
 * Connection protocol
 */
export type ConnectionProtocol = 'sse' | 'fetch-sse' | 'websocket';

/**
 * Connection state
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'error';

/**
 * Citation attached to an assistant response
 */
export interface Citation {
  title: string;
  snippet?: string;
  url?: string;
  score?: number;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /** Primary brand color */
  primaryColor?: string;
  /** Background color for the panel */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Toggle button background color */
  buttonColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Border radius (e.g., '8px', '1rem') */
  borderRadius?: string;
  /** Enable dark mode */
  darkMode?: boolean;
}

/**
 * Position configuration
 */
export interface PositionConfig {
  /** Widget position on page */
  position?: WidgetPosition;
  /** Offset from bottom (e.g., '20px', '1.5rem') */
  offsetBottom?: string;
  /** Offset from side (e.g., '20px', '1.5rem') */
  offsetSide?: string;
  /** Z-index for the widget */
  zIndex?: number;
}

/**
 * Panel configuration
 */
export interface PanelConfig {
  /** Display mode */
  mode?: PanelMode;
  /** Panel width (for slide-out mode, e.g., '400px', '30vw') */
  width?: string;
  /** Panel height (for popover mode, e.g., '600px', '80vh') */
  height?: string;
  /** Show overlay/backdrop when panel is open */
  showOverlay?: boolean;
  /** Enable animation */
  animated?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  /** Connection protocol to use */
  protocol: ConnectionProtocol;
  /** Base URL for the API */
  baseUrl: string;
  /** SSE endpoint path (when protocol is 'sse') */
  sseEndpoint?: string;
  /** SSE messages endpoint for POST requests (when protocol is 'sse') */
  messagesEndpoint?: string;
  /** Streaming endpoint path for fetch-based SSE POST (when protocol is 'fetch-sse') */
  streamEndpoint?: string;
  /** SSE event name that carries citations */
  citationsEventName?: string;
  /** SSE event name that carries incremental token chunks */
  tokenEventName?: string;
  /** SSE event name signaling stream completion */
  doneEventName?: string;
  /** SSE event name signaling stream error */
  streamErrorEventName?: string;
  /** WebSocket endpoint path (when protocol is 'websocket') */
  wsEndpoint?: string;
  /** Enable automatic reconnection */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (0 = infinite) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnect delay in milliseconds */
  maxReconnectDelay?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers for requests */
  headers?: Record<string, string>;
}

/**
 * Main widget configuration
 */
export interface WidgetConfig {
  /** API key for authentication */
  apiKey: string;
  /** Connection configuration */
  connection: ConnectionConfig;
  /** Theme customization */
  theme?: ThemeConfig;
  /** Position customization */
  position?: PositionConfig;
  /** Panel customization */
  panel?: PanelConfig;
  /** Widget title */
  title?: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Initial messages to display */
  initialMessages?: Message[];
  /** Enable message history persistence */
  persistHistory?: boolean;
  /** Enable telemetry/logging */
  enableTelemetry?: boolean;
  /** Custom event handlers */
  onError?: (error: Error) => void;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Chat message
 */
export interface Message {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Optional metadata */
  metadata?: {
    citations?: Citation[];
    streamStatus?: 'streaming' | 'done';
    [key: string]: unknown;
  };
}

/**
 * Widget instance API
 */
export interface WidgetInstance {
  /** Open the chat panel */
  open: () => void;
  /** Close the chat panel */
  close: () => void;
  /** Toggle the chat panel */
  toggle: () => void;
  /** Send a message programmatically */
  sendMessage: (content: string) => void;
  /** Get connection state */
  getConnectionState: () => ConnectionState;
  /** Subscribe to events */
  on: <K extends keyof WidgetEventMap>(event: K, handler: WidgetEventMap[K]) => () => void;
  /** Destroy the widget and clean up */
  destroy: () => void;
}

/**
 * Widget event handlers
 */
export interface WidgetEventMap {
  open: () => void;
  close: () => void;
  message: (message: Message) => void;
  error: (error: Error) => void;
  connectionChange: (state: ConnectionState) => void;
  beforeSend: (content: string) => void | boolean;
}

/**
 * Connection interface
 */
export interface Connection {
  /** Current connection state */
  readonly state: ConnectionState;
  /** Connect to the server */
  connect: () => Promise<void>;
  /** Disconnect from the server */
  disconnect: () => Promise<void>;
  /** Send a message */
  send: (message: string) => Promise<void>;
  /** Abort an in-flight stream/request if supported */
  abort: () => void;
  /** Subscribe to messages */
  onMessage: (handler: (message: Message) => void) => () => void;
  /** Subscribe to state changes */
  onStateChange: (handler: (state: ConnectionState) => void) => () => void;
  /** Subscribe to errors */
  onError: (handler: (error: Error) => void) => () => void;
}

/**
 * Zod schema for runtime validation
 */
export const ThemeConfigSchema = z.object({
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  buttonColor: z.string().optional(),
  fontFamily: z.string().optional(),
  borderRadius: z.string().optional(),
  darkMode: z.boolean().optional(),
});

export const PositionConfigSchema = z.object({
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
  offsetBottom: z.string().optional(),
  offsetSide: z.string().optional(),
  zIndex: z.number().optional(),
});

export const PanelConfigSchema = z.object({
  mode: z.enum(['slide-out', 'popover', 'fullscreen']).optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  showOverlay: z.boolean().optional(),
  animated: z.boolean().optional(),
  animationDuration: z.number().optional(),
});

export const ConnectionConfigSchema = z.object({
  protocol: z.enum(['sse', 'fetch-sse', 'websocket']),
  baseUrl: z.string().url(),
  sseEndpoint: z.string().optional(),
  messagesEndpoint: z.string().optional(),
  streamEndpoint: z.string().optional(),
  citationsEventName: z.string().optional(),
  tokenEventName: z.string().optional(),
  doneEventName: z.string().optional(),
  streamErrorEventName: z.string().optional(),
  wsEndpoint: z.string().optional(),
  autoReconnect: z.boolean().optional(),
  maxReconnectAttempts: z.number().optional(),
  reconnectDelay: z.number().optional(),
  maxReconnectDelay: z.number().optional(),
  timeout: z.number().optional(),
  headers: z.record(z.string()).optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'error']),
  content: z.string(),
  timestamp: z.number(),
  metadata: z
    .object({
      citations: z
        .array(
          z.object({
            title: z.string(),
            snippet: z.string().optional(),
            url: z.string().optional(),
            score: z.number().optional(),
          })
        )
        .optional(),
      streamStatus: z.enum(['streaming', 'done']).optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export const WidgetConfigSchema = z.object({
  apiKey: z.string().min(1),
  connection: ConnectionConfigSchema,
  theme: ThemeConfigSchema.optional(),
  position: PositionConfigSchema.optional(),
  panel: PanelConfigSchema.optional(),
  title: z.string().optional(),
  placeholder: z.string().optional(),
  initialMessages: z.array(MessageSchema).optional(),
  persistHistory: z.boolean().optional(),
  enableTelemetry: z.boolean().optional(),
  debug: z.boolean().optional(),
});

/**
 * Validate widget configuration
 */
export function validateConfig(config: unknown): WidgetConfig {
  return WidgetConfigSchema.parse(config);
}

/**
 * Get default configuration values
 */
export function getDefaultConfig(): Partial<WidgetConfig> {
  return {
    connection: {
      protocol: 'sse',
      baseUrl: 'http://localhost:3001',
      sseEndpoint: '/api/chat/stream',
      messagesEndpoint: '/api/chat/messages',
      streamEndpoint: '/api/chat/ask/stream',
      citationsEventName: 'citations',
      tokenEventName: 'token',
      doneEventName: 'done',
      streamErrorEventName: 'error',
      wsEndpoint: '/api/chat/ws',
    },
    theme: {
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      buttonColor: '#3b82f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      borderRadius: '12px',
      darkMode: false,
    },
    position: {
      position: 'bottom-right',
      offsetBottom: '20px',
      offsetSide: '20px',
      zIndex: Z_INDEX.TOGGLE,
    },
    panel: {
      mode: 'slide-out',
      width: '400px',
      height: '600px',
      showOverlay: true,
      animated: true,
      animationDuration: 300,
    },
    title: 'Chat Assistant',
    placeholder: 'Type your message...',
    initialMessages: [],
    persistHistory: true,
    enableTelemetry: false,
    debug: false,
  };
}
