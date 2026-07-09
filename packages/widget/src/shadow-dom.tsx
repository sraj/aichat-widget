import { render } from 'preact';
import type { WidgetConfig, WidgetInstance, WidgetEventMap } from '@aichat-widget/shared';
import {
  validateConfig,
  supportsShadowDOM,
  supportsCustomElements,
  EventEmitter,
  Logger,
  Z_INDEX,
} from '@aichat-widget/shared';
import { ChatWidget } from './ChatWidget';
import cssText from './styles/index.css?inline';

const WIDGET_TAG = 'ai-chat-widget';
const WIDGET_ATTR_CONFIG = 'data-config';

/**
 * Custom element for the chat widget
 */
class AIChatWidgetElement extends HTMLElement {
  private _shadowRoot!: ShadowRoot;
  config!: WidgetConfig;
  events!: EventEmitter<WidgetEventMap>;
  private logger!: Logger;
  private _isOpen = false;

  constructor() {
    super();
    this.logger = new Logger('[AIChatWidgetElement]');
  }

  connectedCallback() {
    // Attach shadow DOM
    this._shadowRoot = this.attachShadow({ mode: 'closed' });

    // Get config from attribute or property
    const configAttr = this.getAttribute(WIDGET_ATTR_CONFIG);
    if (configAttr) {
      try {
        this.config = validateConfig(JSON.parse(configAttr));
      } catch (error) {
        this.logger.error('Invalid config in data-config attribute:', error);
        this.renderError('Invalid configuration');
        return;
      }
    } else if (this.config) {
      this.config = (this as unknown as { _config?: WidgetConfig })._config ?? this.config;
    } else {
      this.logger.error('No configuration provided');
      this.renderError('No configuration provided');
      return;
    }

    this.logger.setEnabled(this.config.debug || false);
    this.events = (this as unknown as { _events?: EventEmitter<WidgetEventMap> })._events || new EventEmitter<WidgetEventMap>();

    // Inject styles into shadow DOM
    const styleElement = document.createElement('style');
    styleElement.textContent = cssText;
    this._shadowRoot.appendChild(styleElement);

    // Create container for Preact app
    const container = document.createElement('div');
    container.id = 'widget-root';
    this._shadowRoot.appendChild(container);

    // Render Preact app
    render(<ChatWidget config={this.config} events={this.events} />, container);

    this.logger.debug('Widget initialized');
  }

  disconnectedCallback() {
    // Cleanup
    if (this.events) {
      this.events.removeAllListeners();
    }
    this.logger.debug('Widget destroyed');
  }

  private renderError(message: string) {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .error-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #fee2e2;
        border: 1px solid #fca5a5;
        border-radius: 8px;
        padding: 16px;
        max-width: 300px;
        font-family: system-ui, -apple-system, sans-serif;
        color: #dc2626;
        z-index: ${Z_INDEX.ERROR};
      }
    `;
    this._shadowRoot.appendChild(styleElement);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-container';
    errorDiv.innerHTML = `
      <strong>AI Chat Widget Error</strong><br>
      ${message}
    `;
    this._shadowRoot.appendChild(errorDiv);
  }

  // Public API methods
  open() {
    this._isOpen = true;
    // Dispatch window event to communicate with ChatWidget component
    window.dispatchEvent(new CustomEvent('widget-api-open'));
    // Also emit event for external listeners
    this.events?.emit('open');
  }

  close() {
    this._isOpen = false;
    // Dispatch window event to communicate with ChatWidget component
    window.dispatchEvent(new CustomEvent('widget-api-close'));
    // Also emit event for external listeners
    this.events?.emit('close');
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  sendMessage(content: string) {
    // This will be handled by the ChatWidget component
    this.logger.debug('Send message:', content);
  }
}

/**
 * Initialize the chat widget
 */
export function initWidget(config: unknown): WidgetInstance {
  const logger = new Logger('[AIChatWidget]');

  // Check browser support
  if (!supportsShadowDOM()) {
    const error = new Error('Shadow DOM is not supported in this browser');
    logger.error(error.message);
    throw error;
  }

  if (!supportsCustomElements()) {
    const error = new Error('Custom Elements are not supported in this browser');
    logger.error(error.message);
    throw error;
  }

  // Validate configuration
  let validatedConfig: WidgetConfig;
  try {
    validatedConfig = validateConfig(config);
  } catch (error) {
    logger.error('Invalid configuration:', error);
    const wrapped = new Error(`Invalid widget configuration: ${(error as Error).message}`);
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }

  logger.setEnabled(validatedConfig.debug || false);
  logger.debug('Initializing widget with config:', validatedConfig);

  // Register custom element if not already registered
  if (!customElements.get(WIDGET_TAG)) {
    customElements.define(WIDGET_TAG, AIChatWidgetElement);
    logger.debug('Custom element registered:', WIDGET_TAG);
  }

  // Create and append widget element
  const widgetElement = document.createElement(WIDGET_TAG) as AIChatWidgetElement;
  widgetElement.config = validatedConfig;

  // Create event emitter
  const events = new EventEmitter<WidgetEventMap>();
  widgetElement.events = events;

  // Append to body
  document.body.appendChild(widgetElement);

  // Return widget instance API
  const instance: WidgetInstance = {
    open: () => widgetElement.open(),
    close: () => widgetElement.close(),
    toggle: () => widgetElement.toggle(),
    sendMessage: (content: string) => widgetElement.sendMessage(content),
    getConnectionState: () => {
      // This would need to be exposed from ChatWidget
      return 'disconnected';
    },
    on: <K extends keyof WidgetEventMap>(event: K, handler: WidgetEventMap[K]) => {
      return events.on(event, handler);
    },
    destroy: () => {
      logger.debug('Destroying widget');
      widgetElement.remove();
      events.removeAllListeners();
    },
  };

  return instance;
}
