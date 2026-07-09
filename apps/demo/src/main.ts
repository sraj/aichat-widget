import { init } from '@aichat-widget/widget';

let widgetInstance: ReturnType<typeof init> | null = null;

declare global {
  interface Window {
    initializeWidget: () => void;
    openWidget: () => void;
    closeWidget: () => void;
    destroyWidget: () => void;
    sendStreamingTestPrompt: () => void;
  }
}

// Get config values from form
function getConfig() {
  const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
  const baseUrl = (document.getElementById('baseUrl') as HTMLInputElement).value;
  const protocol = (document.getElementById('protocol') as HTMLSelectElement).value;
  const position = (document.getElementById('position') as HTMLSelectElement).value;
  const panelMode = (document.getElementById('panelMode') as HTMLSelectElement).value;
  const showOverlay = (document.getElementById('showOverlay') as HTMLSelectElement).value === 'true';
  const primaryColor = (document.getElementById('primaryColor') as HTMLInputElement).value;
  const title = (document.getElementById('title') as HTMLInputElement).value;
  const placeholder = (document.getElementById('placeholder') as HTMLInputElement).value;

  return {
    apiKey,
    connection: {
      protocol: protocol as 'sse' | 'fetch-sse' | 'websocket',
      baseUrl,
      // These endpoints are handled by the dev server
      sseEndpoint: '/api/chat/stream',
      messagesEndpoint: '/api/chat/messages',
      streamEndpoint: '/api/chat/ask/stream',
      wsEndpoint: '/api/chat/ws',
      autoReconnect: true, // Re-enabled - loop issue fixed with useMemo
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
    },
    theme: {
      primaryColor,
      darkMode: false,
    },
    position: {
      position: position as any,
      offsetBottom: '20px',
      offsetSide: '20px',
    },
    panel: {
      mode: panelMode as any,
      width: '400px',
      height: '600px',
      showOverlay: showOverlay,
      animated: true,
    },
    title,
    placeholder,
    persistHistory: true,
    debug: true,
    initialMessages: [
      {
        id: 'welcome-1',
        role: 'assistant' as const,
        content: 'Hello! 👋 Welcome to the AI Chat Widget demo. This is a production-ready embeddable chat widget.',
        timestamp: Date.now() - 5000,
      },
      {
        id: 'welcome-2',
        role: 'assistant' as const,
        content: '✨ Features:\n• Shadow DOM isolation\n• SSE & WebSocket support\n• Customizable themes\n• Accessible (WCAG 2.1 AA)\n• Production-ready error handling',
        timestamp: Date.now() - 3000,
      },
    ],
  };
}

// Update status indicator
function updateStatus(status: string, connected: boolean = false) {
  const statusEl = document.getElementById('widgetStatus');
  if (statusEl) {
    statusEl.textContent = status;
    statusEl.className = `status ${connected ? 'status-connected' : 'status-disconnected'}`;
  }
}

// Initialize widget
window.initializeWidget = function () {
  try {
    // Destroy existing instance
    if (widgetInstance) {
      widgetInstance.destroy();
    }

    const config = getConfig();
    console.log('Initializing widget with config:', config);

    widgetInstance = init(config);

    // Setup event listeners
    widgetInstance.on('open', () => {
      console.log('Widget opened');
    });

    widgetInstance.on('close', () => {
      console.log('Widget closed');
    });

    widgetInstance.on('message', (message: unknown) => {
      console.log('New message:', message);
    });

    widgetInstance.on('error', (error: Error) => {
      console.error('Widget error:', error);
    });

    widgetInstance.on('connectionChange', (state: unknown) => {
      console.log('Connection state:', state);
      updateStatus(`Connected (${state})`, state === 'connected');
    });

    updateStatus('Initialized', true);
    alert('✅ Widget initialized successfully! Check the bottom right corner.');
  } catch (error) {
    console.error('Failed to initialize widget:', error);
    alert('❌ Failed to initialize widget. Check console for details.');
    updateStatus('Error', false);
  }
};

// Open widget
window.openWidget = function () {
  if (widgetInstance) {
    widgetInstance.open();
  } else {
    alert('⚠️ Please initialize the widget first');
  }
};

// Close widget
window.closeWidget = function () {
  if (widgetInstance) {
    widgetInstance.close();
  } else {
    alert('⚠️ Please initialize the widget first');
  }
};

// Destroy widget
window.destroyWidget = function () {
  if (widgetInstance) {
    widgetInstance.destroy();
    widgetInstance = null;
    updateStatus('Destroyed', false);
    alert('🗑️ Widget destroyed');
  } else {
    alert('⚠️ No widget to destroy');
  }
};

// Send a one-click prompt that is ideal for validating stream tokens/citations/stop behavior
window.sendStreamingTestPrompt = function () {
  if (!widgetInstance) {
    alert('⚠️ Please initialize the widget first');
    return;
  }

  const protocol = (document.getElementById('protocol') as HTMLSelectElement).value;
  if (protocol !== 'fetch-sse') {
    alert('⚠️ Switch protocol to Fetch SSE for this test prompt');
    return;
  }

  widgetInstance.open();
  widgetInstance.sendMessage(
    'Summarize why POST-based SSE is useful for chat UIs, include 3 key points and cite sources.'
  );
};

// Auto-initialize on page load
console.log('Demo app loaded. Click "Initialize Widget" to start!');
