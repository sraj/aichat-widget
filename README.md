# 🤖 AI Chat Widget

Production-grade embeddable chat widget built with Shadow DOM, Preact, Tailwind CSS, and Turborepo. Supports EventSource SSE, POST fetch-based SSE, and WebSocket protocols for real-time communication.

## Features

- Shadow DOM isolation for full style encapsulation
- Multi-protocol support across EventSource SSE, fetch-SSE, and WebSocket
- Customizable themes, positioning, and panel behavior
- Accessible UI with keyboard navigation and focus management
- Production-oriented defaults with reconnection and error handling
- TypeScript-first packages and shared validation
- Responsive layout that works on desktop, tablet, and mobile
- Optional message persistence for user continuity
- Abortable fetch-based streaming with citations-first delivery

## Install

```bash
pnpm install
```

## Quick Start

```bash
pnpm dev:all
```

For a fetch-based SSE backend, use:

```javascript
connection: {
  protocol: 'fetch-sse',
  baseUrl: 'https://api.example.com',
  streamEndpoint: '/api/chat/ask/stream'
}
```

## Documentation

- [docs/README.md](docs/README.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md)
- [packages/widget/README.md](packages/widget/README.md)

## License

MIT
