import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import {
  createPostSSEStreamHandler,
  createSSEHandler,
  getRandomMockResponse,
} from './sse-handler';
import { createWebSocketHandler } from './ws-handler';

const app = new Hono();
const PORT = process.env.PORT || 3001;
const createPostSSEStream = createPostSSEStreamHandler();

// Request logging
app.use('*', logger());

// Security headers (OWASP)
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    // Allow all localhost origins for development
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin || '*';
    }
    return false;
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // Don't require credentials for dev
  maxAge: 86400, // 24 hours
}));

// Rate limiting middleware (OWASP recommendation)
// For development: very high limits to allow for SSE reconnections
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window for faster reset
const RATE_LIMIT_MAX = 1000; // 1000 requests per minute for dev

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const now = Date.now();
  const clientData = rateLimitMap.get(ip);

  if (clientData) {
    if (now > clientData.resetTime) {
      // Reset the count
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else if (clientData.count >= RATE_LIMIT_MAX) {
      return c.json({ error: 'Too many requests, please try again later' }, 429);
    } else {
      clientData.count++;
    }
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  await next();
});

// API Key validation middleware
const validateApiKey = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const apiKey = authHeader?.replace('Bearer ', '') || c.req.query('apiKey');

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 401);
  }

  // Mock validation - in production, validate against database
  if (!apiKey.startsWith('demo-api-key')) {
    return c.json({ error: 'Invalid API key' }, 403);
  }

  await next();
};

// Input sanitization middleware
const sanitizeInput = async (c: any, next: any) => {
  const body = await c.req.json().catch(() => ({}));

  if (body && (body.content || body.message)) {
    const inputField = typeof body.content === 'string' ? 'content' : 'message';
    // Basic XSS prevention - remove script tags and dangerous patterns
    body[inputField] = body[inputField]
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Limit content length (OWASP: prevent DoS)
    if (body[inputField].length > 5000) {
      return c.json({ error: 'Message too long (max 5000 characters)' }, 400);
    }

    // Store sanitized body for route handler
    c.set('sanitizedBody', body);
  }

  await next();
};

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint
app.get('/api/chat/stream', validateApiKey, createSSEHandler());

// POST fetch-based SSE streaming endpoint
app.post('/api/chat/ask/stream', validateApiKey, sanitizeInput, async (c) => {
  const body = c.get('sanitizedBody') || await c.req.json();
  const message = typeof body.message === 'string' ? body.message : body.content;

  if (!message || typeof message !== 'string') {
    return c.json({ error: 'Invalid message content' }, 400);
  }

  console.log('📡 Starting POST SSE stream:', message.substring(0, 50));

  const stream = await createPostSSEStream(message, c.req.raw.signal);
  return c.body(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});

// POST endpoint for messages (used with SSE)
app.post('/api/chat/messages', validateApiKey, sanitizeInput, async (c) => {
  const body = c.get('sanitizedBody') || await c.req.json();
  const { id, role, content, timestamp } = body;

  console.log('📨 Received message:', { id, role, content: content?.substring(0, 50) });

  // Validate input (OWASP: input validation)
  if (!content || typeof content !== 'string') {
    return c.json({ error: 'Invalid message content' }, 400);
  }

  if (role !== 'user') {
    return c.json({ error: 'Invalid message role' }, 400);
  }

  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Return mock AI response
  const mockResponse = {
    id: `msg-${Date.now()}`,
    role: 'assistant' as const,
    content: getRandomMockResponse(),
    timestamp: Date.now(),
  };

  console.log('🤖 Sending mock response:', mockResponse.content.substring(0, 50));

  return c.json({ 
    success: true, 
    messageId: id,
    response: mockResponse,
  });
});

// Start server
const server = serve({
  fetch: app.fetch,
  port: parseInt(PORT),
});

console.log(`🚀 Mock Chat Server running on http://localhost:${PORT}`);
console.log(`📡 SSE endpoint: http://localhost:${PORT}/api/chat/stream`);
console.log(`📨 POST SSE stream endpoint: http://localhost:${PORT}/api/chat/ask/stream`);
console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/api/chat/ws`);
console.log(`🔑 Use API key: demo-api-key-12345`);

// WebSocket server
createWebSocketHandler(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
