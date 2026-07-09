# Architecture & Design

Comprehensive guide to the AI Chat Widget architecture, monorepo structure, implementation details, and integration patterns.

---

## Table of Contents

1. [Monorepo Structure](#monorepo-structure)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Details](#implementation-details)
4. [Script Loading & Integration](#script-loading--integration)

---

## Monorepo Structure

### Project Layout

```
aichat-widget/
├── apps/                    # Applications & Tools
│   ├── demo/               # Demo application
│   └── dev-server/         # Development mock server
│
├── packages/               # Reusable Libraries
│   ├── ui/                # 🎨 Reusable UI components
│   ├── widget/            # 📦 Main widget library
│   └── shared/            # 🔧 Shared types & utilities
│
├── pnpm-workspace.yaml     # Workspace definition
├── turbo.json              # Turborepo pipeline config
└── package.json            # Root package
```

### Package Descriptions

#### **`packages/` - Publishable Libraries**

**`@aichat-widget/shared`** - Shared utilities
- TypeScript types and interfaces
- Utilities (sanitization, validation, formatting)
- Zod schemas for runtime validation
- Zero dependencies (except Zod)

**`@aichat-widget/ui`** - Pure presentational components
- Reusable across projects
- No business logic
- Components: `ChatToggle`, `ChatPanel`, `MessageList`, `MessageInput`, `Header`, `Skeleton`, `ErrorBoundary`
- Props-driven, fully controlled

**`@aichat-widget/widget`** - Main widget package  
- Business logic and orchestration
- Imports from `@aichat-widget/ui` and `@aichat-widget/shared`
- Connection management (EventSource SSE, fetch-SSE, WebSocket)
- Hooks: `useConnection`, `useMessages`, `useWidgetUI`, `useFocusTrap`
- Shadow DOM setup and custom element

#### **`apps/` - Applications & Tools**

**`demo`** - Demo application
- Showcases widget integration
- Interactive configuration playground
- Not published as package
- Vite development server

**`dev-server`** - Development server
- Hono-based mock backend
- SSE and WebSocket endpoints
- Rate limiting and security middleware
- Development tool only

### Dependency Graph

```
apps/demo
  └── @aichat-widget/widget
        ├── @aichat-widget/ui
        └── @aichat-widget/shared
              └── zod

apps/dev-server
  └── hono, ws
```

### Benefits of This Structure

1. **Clear Separation** - Libraries vs. applications
2. **Reusability** - UI components can be used independently
3. **Independent Versioning** - Each package versioned separately
4. **Better Tree-Shaking** - Import only what you need
5. **Proper Turborepo Convention** - Follows official guidelines
6. **Parallel Builds** - Turborepo builds packages in parallel respecting dependencies

### Turborepo Commands

```bash
# Build all packages (respects dependency order)
pnpm build

# Develop all packages with watch mode
pnpm dev

# Run dev server + demo together
pnpm dev:all

# Build specific package
pnpm --filter @aichat-widget/ui build
pnpm --filter @aichat-widget/widget build

# Develop specific app
pnpm --filter demo dev
pnpm --filter dev-server dev

# Clean all build artifacts
pnpm clean
```

---

## Architecture Overview

### Separation of Concerns

The widget follows a strict layered architecture:

```
┌─────────────────────────────────────┐
│     Presentation Layer (UI)         │
│  ChatToggle, ChatPanel, MessageList │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Business Logic (Hooks)         │
│  useConnection, useMessages, etc.   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Data Layer (Connections)      │
│  SSEConnection, WebSocketConnection │
└─────────────────────────────────────┘
```

### Core Components

#### **Presentation Layer** (`packages/ui/src/`)

**`ChatToggle.tsx`** - Floating action button
- Freshdesk-style pill button with icon + text
- Position-aware (bottom-right/left, top-right/left)
- Unread count badge with pulse animation
- Responsive sizing

**`ChatPanel.tsx`** - Main chat panel
- Three modes: `slide-out` (default), `popover`, `fullscreen`
- Conditional overlay and focus trap
- Slide-in/out animations
- Z-index management via constants

**`Header.tsx`** - Panel header
- Title display
- Connection status indicator (5 states)
- Close button with accessibility

**`MessageList.tsx`** - Message display
- Auto-scroll to bottom
- Skeleton loading states
- Empty state handling
- Virtualization-ready structure

**`MessageBubble.tsx`** - Individual message
- User vs. Assistant styling
- Timestamp formatting
- Sanitized HTML rendering
- Avatar placeholders

**`MessageInput.tsx`** - Message composition
- Auto-growing textarea (1-3 lines)
- Character count (5000 max)
- Send button with disabled state
- Enter to send, Shift+Enter for newline

**`ErrorBoundary.tsx`** - Error containment
- Catches React errors in widget
- Prevents breaking host page
- Displays friendly error UI
- Reset functionality

**`Skeleton.tsx`** - Loading states
- Message skeletons
- Typing indicator (3-dot animation)
- Header skeleton

#### **Business Logic Layer** (`packages/widget/src/hooks/`)

**`useConnection.ts`** - Connection lifecycle
- Protocol selection (EventSource SSE / fetch-SSE / WebSocket)
- Auto-reconnection with exponential backoff
- Connection state management
- Message sending logic
- Event emission for external listeners

**`useMessages.ts`** - Message management
- Message array state
- Optional localStorage persistence
- Add/clear operations
- Timestamp generation

**`useWidgetUI.ts`** - UI state
- Open/close panel state
- Toggle functionality
- Programmatic API integration
- Custom events for internal communication

**`useFocusTrap.ts`** - Accessibility
- Focus containment when panel open
- Tab/Shift+Tab cycling
- Escape key handler
- Focus restoration on close

#### **Data Layer** (`packages/widget/src/connections/`)

**`BaseConnection.ts`** - Abstract base class
- Reconnection logic (exponential backoff)
- State management (disconnected/connecting/connected/error/reconnecting)
- Event emission
- Logger integration
- Configurable retry limits

**`SSEConnection.ts`** - Server-Sent Events
- EventSource API
- GET-based stream for simple event feeds
- Graceful reconnection on stream close
- Response parsing and message emission

**`FetchSSEConnection.ts`** - POST fetch-based SSE
- Uses `fetch()` + `ReadableStream`
- POST body for prompts/messages
- Supports `Authorization` headers and `AbortController`
- Citations-first and token streaming events

**`WebSocketConnection.ts`** - WebSocket
- Native WebSocket API
- Ping/pong keep-alive (30s interval)
- Clean vs. dirty close detection
- JSON message protocol

### Shadow DOM Integration

**`shadow-dom.tsx`** - Widget initialization
- Custom element: `<ai-chat-widget>`
- Closed shadow root (full encapsulation)
- Style injection (Tailwind + custom CSS)
- Error boundary at root level
- Z-index constants for layering

**Benefits:**
- ✅ Complete CSS isolation (no host page conflicts)
- ✅ Clean global namespace (one custom element)
- ✅ Theme variables can't leak out
- ✅ Widget styles can't be overridden accidentally

---

## Implementation Details

### Configuration System

**Full Config Interface:**

```typescript
interface WidgetConfig {
  apiKey: string;
  
  connection: {
    protocol: 'sse' | 'websocket';
    baseUrl: string;
    sseEndpoint?: string;
    wsEndpoint?: string;
    messagesEndpoint?: string;
    autoReconnect?: boolean;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    maxReconnectDelay?: number;
    headers?: Record<string, string>;
  };
  
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    darkMode?: boolean;
  };
  
  position?: {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    offsetBottom?: string;
    offsetSide?: string;
    zIndex?: number;
  };
  
  panel?: {
    title?: string;
    mode?: 'slide-out' | 'popover' | 'fullscreen';
    width?: string;
    height?: string;
    showOverlay?: boolean;
    animated?: boolean;
  };
  
  persistHistory?: boolean;
  enableTelemetry?: boolean;
  debug?: boolean;
}
```

**Config Merging:**
- Deep merge with `deepMerge()` utility
- User config overrides defaults
- Type-safe via Zod schemas
- Validation on initialization

### Technology Stack

- **Preact 10.20.1** - Lightweight React alternative (3KB)
- **TypeScript 5.4.5** - Strict mode, full type safety
- **Tailwind CSS 3.4.3** - Utility-first styling
- **Vite 5.2.10** - Build tool (fast, modern)
- **Turborepo 1.13.2** - Monorepo orchestration
- **pnpm 9.1.0** - Fast, efficient package manager
- **Hono 4.3.6** - Fast web framework for dev server
- **Zod 3.23.6** - Runtime validation

### Build Output

**Widget Package:**
- **UMD**: 110.62 KB → 29.86 KB gzipped (for CDN)
- **ESM**: 192.85 KB → 38.89 KB gzipped (for npm)
- Source maps included (development only)
- All dependencies bundled (zero runtime deps)

### Key Design Decisions

#### 1. **Why Preact over React?**
- 10x smaller (3KB vs. 30KB gzipped)
- Same API, easy migration
- Perfect for embeddable widgets
- No compromise on features

#### 2. **Why Shadow DOM?**
- Complete CSS isolation
- No style conflicts with host page
- Encapsulated implementation
- Professional embed pattern

#### 3. **Why Turborepo over Lerna?**
- Faster builds (caching)
- Better DX (pipeline config)
- Active development
- Modern tooling

#### 4. **Why SSE and WebSocket?**
- SSE: Simple, HTTP-based, auto-reconnect
- WebSocket: Bidirectional, lower latency
- User choice based on needs
- Shared reconnection logic

#### 5. **Why Hono over Express?**
- 3x faster
- TypeScript-first
- Modern async/await
- Better DX

---

## Script Loading & Integration

### TL;DR: Use `defer` ✅

```html
<!-- ✅ RECOMMENDED: defer for better performance -->
<script defer src="https://cdn.example.com/ai-chat-widget.js" onload="initWidget()"></script>
<script>
  function initWidget() {
    AIChatWidget.init({ /* config */ });
  }
</script>
```

### Loading Options Comparison

#### **Option 1: Regular (Blocking)**

```html
<script src="https://cdn.example.com/ai-chat-widget.js"></script>
<script>
  const widget = AIChatWidget.init({ /* config */ });
</script>
```

**How it works:**
1. Browser encounters `<script>` tag
2. ⏸️ **BLOCKS** HTML parsing
3. Downloads script (network delay)
4. Executes script
5. Resumes HTML parsing
6. Second script executes

**Pros:**
- ✅ Simple - widget available immediately
- ✅ Predictable execution order

**Cons:**
- ❌ **Blocks page rendering** - delays First Contentful Paint
- ❌ Slower page load
- ❌ Poor user experience on slow connections
- ❌ Bad Lighthouse/PageSpeed scores

#### **Option 2: With `defer` ✅ (Recommended)**

```html
<script defer src="https://cdn.example.com/ai-chat-widget.js" onload="initWidget()"></script>
<script>
  function initWidget() {
    AIChatWidget.init({ /* config */ });
  }
</script>
```

**How it works:**
1. Browser encounters `<script defer>` tag
2. ✅ **Continues parsing HTML** (non-blocking!)
3. Downloads script in parallel
4. After DOM ready, executes script
5. Calls `onload="initWidget()"` callback
6. Widget initializes

**Pros:**
- ✅ **Non-blocking** - doesn't delay page rendering
- ✅ Faster perceived page load
- ✅ Better Core Web Vitals (FCP, LCP)
- ✅ Better Lighthouse scores
- ✅ Industry best practice

**Cons:**
- ⚠️ Need to use `onload` callback

#### **Option 3: With `async` (Not Recommended)**

```html
<script async src="https://cdn.example.com/ai-chat-widget.js"></script>
```

**Not recommended** because:
- ❌ Executes as soon as downloaded (unpredictable timing)
- ❌ May execute before DOM is ready
- ❌ Multiple async scripts don't execute in order
- ❌ Can break if widget needs DOM elements

#### **Option 4: ES Modules**

```html
<script type="module" src="https://cdn.example.com/ai-chat-widget.esm.js"></script>
```

**Benefits:**
- ✅ Always deferred by default
- ✅ Supports ES modules
- ✅ Native browser support

**Considerations:**
- ⚠️ Need to build ESM version
- ⚠️ Older browsers need fallback

### Performance Impact

#### Without defer:
```
┌─────────┐    ┌──────────┐    ┌──────────┐
│ Parse   │ ⏸️ │ Download │ ⏸️ │ Execute  │
│ HTML    │    │ Script   │    │ Script   │
└─────────┘    └──────────┘    └──────────┘
   1s             2s (BLOCKED)    0.5s (BLOCKED)
```
**Total blocking time: 2.5s** ❌

#### With defer:
```
┌─────────────────┐
│ Parse HTML      │ ✅ Non-blocking
│ + Download      │    (parallel)
└─────────────────┘
        │
        └─→ Execute when DOM ready
```
**Total blocking time: 0s** ✅

### Page Load Timeline (3G Connection)

**Without defer:**
```
0ms    - HTML parsing starts
500ms  - Script tag encountered → BLOCKED
2500ms - Script downloaded
3000ms - Script executed
3100ms - Page interactive ❌ (3.1s)
```

**With defer:**
```
0ms    - HTML parsing starts
500ms  - Script tag encountered → continues parsing
1500ms - HTML fully parsed
2000ms - Script downloaded (in parallel)
2100ms - Script executed
2200ms - Page interactive ✅ (2.2s)
```

**Improvement: 900ms faster (29% improvement)** 🚀

### Recommended Implementations

#### **Method 1: With onload callback (Simplest)**

```html
<script defer src="https://cdn.example.com/ai-chat-widget.js" onload="initWidget()"></script>
<script>
  function initWidget() {
    if (typeof AIChatWidget === 'undefined') {
      console.error('Widget failed to load');
      return;
    }
    
    const widget = AIChatWidget.init({
      apiKey: 'your-api-key',
      connection: {
        protocol: 'sse',
        baseUrl: 'https://api.example.com'
      }
    });
  }
</script>
```

#### **Method 2: With DOMContentLoaded (More Robust)**

```html
<script defer src="https://cdn.example.com/ai-chat-widget.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof AIChatWidget === 'undefined') {
      console.error('Widget failed to load');
      return;
    }
    
    const widget = AIChatWidget.init({
      apiKey: 'your-api-key',
      connection: {
        protocol: 'sse',
        baseUrl: 'https://api.example.com'
      }
    });
  });
</script>
```

#### **Method 3: ES Module (Modern)**

```html
<script type="module">
  import { init } from 'https://cdn.example.com/ai-chat-widget.esm.js';
  
  const widget = init({
    apiKey: 'your-api-key',
    connection: {
      protocol: 'sse',
      baseUrl: 'https://api.example.com'
    }
  });
</script>
```

#### **Method 4: NPM Package (Recommended for Apps)**

```bash
pnpm add @aichat-widget/widget
```

```typescript
import { init } from '@aichat-widget/widget';

const widget = init({
  apiKey: process.env.WIDGET_API_KEY,
  connection: {
    protocol: 'sse',
    baseUrl: 'https://api.example.com'
  }
});
```

### Integration Best Practices

1. **Always use `defer` for CDN scripts**
2. **Check if widget loaded before initializing**
3. **Handle load failures gracefully**
4. **Don't block page load**
5. **Use environment variables for API keys**
6. **Test on slow networks (3G throttling)**
7. **Monitor Core Web Vitals**

### Testing Integration

```javascript
// Add error handling
window.addEventListener('error', (e) => {
  if (e.filename?.includes('ai-chat-widget')) {
    console.error('Widget failed to load:', e);
    // Notify error tracking service
  }
});

// Test widget availability
if (window.AIChatWidget) {
  console.log('✅ Widget loaded successfully');
} else {
  console.error('❌ Widget failed to load');
}
```

### CDN Recommendations

1. **Use versioned URLs**: `ai-chat-widget@1.0.0.js`
2. **Enable Subresource Integrity (SRI)**:
   ```html
   <script defer 
     src="https://cdn.example.com/ai-chat-widget.js"
     integrity="sha384-..."
     crossorigin="anonymous">
   </script>
   ```
3. **Set proper cache headers**: `Cache-Control: public, max-age=31536000`
4. **Use CDN with HTTP/3 support** for faster downloads
5. **Provide both UMD and ESM versions**

---

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start everything (dev server + demo)
pnpm dev:all

# Or start separately:
pnpm dev:server  # Terminal 1 (port 3001)
pnpm dev:demo    # Terminal 2 (port 3000)
```

### Building for Production

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @aichat-widget/widget build

# Check bundle size
cd packages/widget/dist
ls -lh *.js
gzip -c ai-chat-widget.umd.js | wc -c
```

### Testing the Widget

1. Open demo: `http://localhost:3000`
2. Click "Initialize Widget"
3. Test features:
   - Open/close panel
   - Send messages (SSE/WebSocket)
   - Test reconnection (stop dev-server)
   - Test different panel modes
   - Test overlay vs. no overlay
   - Test position configuration
   - Test programmatic API

### Code Organization Tips

- **Add new UI component**: Add to `packages/ui/src/`
- **Add new hook**: Add to `packages/widget/src/hooks/`
- **Add new utility**: Add to `packages/shared/src/utils.ts`
- **Add new type**: Add to `packages/shared/src/types.ts`
- **Update connection logic**: Edit `packages/widget/src/connections/`

### Common Issues

**Issue: Tailwind classes not working**
- **Solution**: Ensure `tailwind.config.js` scans all component paths

**Issue: Build fails with type errors**
- **Solution**: Run `pnpm build` in shared/ui packages first

**Issue: Dev server CORS errors**
- **Solution**: Check dev-server CORS config allows your origin

**Issue: Widget not visible**
- **Solution**: Check z-index, position config, and Shadow DOM styles

---

## Next Steps

- **Production Deployment**: See main [README.md](../README.md)
- **Security**: See [SECURITY.md](./SECURITY.md)
- **Performance**: See [PERFORMANCE.md](./PERFORMANCE.md)
