# AI Chat Widget

Production-grade embeddable chat UI widget with Shadow DOM isolation, supporting EventSource SSE, POST fetch-based SSE, and WebSocket protocols.

## Features

- 🔒 Shadow DOM isolation
- ⚡ EventSource SSE, fetch-SSE, and WebSocket support
- 🎨 Fully customizable
- 📦 < 100KB gzipped
- ♿ WCAG 2.1 AA accessible
- 🚀 Production ready

## Quick Start

### CDN

```html
<script src="https://cdn.example.com/ai-chat-widget.js"></script>
<script>
  AIChatWidget.init({
    apiKey: 'your-api-key',
    connection: {
      protocol: 'sse',
      baseUrl: 'https://api.example.com'
    }
  });
</script>
```

### NPM

```bash
pnpm add @srajvenkat/aichat-widget
```

```typescript
import { init } from '@srajvenkat/aichat-widget';

init({
  apiKey: 'your-api-key',
  connection: {
    protocol: 'websocket',
    baseUrl: 'https://api.example.com'
  }
});
```

## Documentation

Example protocol values:

- `sse` for EventSource GET streams
- `fetch-sse` for POST + `fetch()` streaming
- `websocket` for WS connections

See [full documentation](../../README.md) for complete API reference, configuration options, and examples.

## License

MIT
