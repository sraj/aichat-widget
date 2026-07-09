import type { WidgetConfig, WidgetInstance } from '@aichat-widget/shared';
import { initWidget } from './shadow-dom';

// Re-export types for consumers
export type { WidgetConfig, WidgetInstance, WidgetEventMap } from '@aichat-widget/shared';

/**
 * Main entry point for the AI Chat Widget
 * 
 * @example CDN Usage:
 * ```html
 * <script src="https://cdn.example.com/ai-chat-widget.js"></script>
 * <script>
 *   const widget = AIChatWidget.init({
 *     apiKey: 'your-api-key',
 *     connection: {
 *       protocol: 'sse',
 *       baseUrl: 'https://api.example.com'
 *     }
 *   });
 * </script>
 * ```
 * 
 * @example NPM Usage:
 * ```typescript
 * import { init } from '@aichat-widget/widget';
 * 
 * const widget = init({
 *   apiKey: 'your-api-key',
 *   connection: {
 *     protocol: 'websocket',
 *     baseUrl: 'https://api.example.com'
 *   }
 * });
 * 
 * widget.on('message', (message) => {
 *   console.log('New message:', message);
 * });
 * 
 * widget.open();
 * ```
 */

/**
 * Initialize the chat widget with configuration
 */
export function init(config: WidgetConfig): WidgetInstance {
  return initWidget(config);
}

// Default export for UMD/IIFE builds
export default {
  init,
  version: '0.1.0',
};

// For global (window) usage in CDN builds
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).AIChatWidget = {
    init,
    version: '0.1.0',
  };
}
