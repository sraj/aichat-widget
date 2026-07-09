# 🤖 AI Chat Widget

[![npm version](https://img.shields.io/npm/v/@srajvenkat/aichat-widget)](https://www.npmjs.com/package/@srajvenkat/aichat-widget)
[![CI](https://github.com/sraj/aichat-widget/actions/workflows/ci.yml/badge.svg)](https://github.com/sraj/aichat-widget/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<div align="center">
  <img src="docs/images/widget-closed.png" alt="Widget toggle button" width="400" />
  <img src="docs/images/widget-open.png" alt="Widget panel open" width="400" />
  <br />
  <img src="docs/images/widget-chat.png" alt="Widget chat conversation" width="400" />
</div>

Production-grade embeddable chat widget built with Shadow DOM, Preact, Tailwind CSS, and Turborepo. Supports EventSource SSE, POST fetch-based SSE, and WebSocket protocols for real-time communication.

## Features

- **Shadow DOM isolation** for full style encapsulation
- **Multi-protocol** — EventSource SSE, fetch-SSE, and WebSocket
- **Customizable** themes, positioning, and panel behavior
- **Accessible** — WCAG 2.1 AA, keyboard navigation, focus management
- **TypeScript-first** packages with shared Zod validation
- **Responsive** — desktop, tablet, and mobile
- **Resilient** — reconnection with exponential backoff, error boundaries
- **Lightweight** — < 45 KB gzipped

## Install

```bash
npm install @srajvenkat/aichat-widget
# or
pnpm add @srajvenkat/aichat-widget
```

## Quick Start

```typescript
import { init } from '@srajvenkat/aichat-widget';

init({
  apiKey: 'your-api-key',
  connection: {
    protocol: 'sse',
    baseUrl: 'https://api.example.com',
  },
  theme: {
    primaryColor: '#3b82f6',
  },
  position: {
    position: 'bottom-right',
  },
});
```

```html
<!-- Or via CDN -->
<script src="https://unpkg.com/@srajvenkat/aichat-widget"></script>
<script>
  AIChatWidget.init({
    apiKey: 'your-api-key',
    connection: {
      protocol: 'fetch-sse',
      baseUrl: 'https://api.example.com',
      streamEndpoint: '/api/chat/ask/stream',
    },
  });
</script>
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server + demo
pnpm dev:all

# Run checks
pnpm lint
pnpm type-check
pnpm --filter @aichat-widget/shared test
```

## Documentation

- [Widget API](packages/widget/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [Performance](docs/PERFORMANCE.md)

## License

MIT © [Suman Raj Venkatesan](https://github.com/sraj)
