import type { Context } from 'hono';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface Citation {
  title: string;
  snippet: string;
  url: string;
  score: number;
}

// Mock AI responses for SSE
export const mockResponses = [
  "I'm a mock AI assistant. How can I help you today?",
  "That's an interesting question! Let me think about it...",
  "Based on what you've told me, here's what I think...",
  "I understand your concern. Here's my suggestion...",
  "Great question! Let me break this down for you...",
  "I can help you with that. Here are some options...",
  "That makes sense. Have you considered...",
  "I see what you mean. Let me explain...",
];

const mockCitations: Citation[] = [
  {
    title: 'Widget Architecture Notes',
    snippet: 'Shadow DOM isolates styles and prevents host page CSS conflicts.',
    url: 'https://example.local/docs/widget-architecture',
    score: 0.93,
  },
  {
    title: 'Streaming Transport Guide',
    snippet: 'POST + fetch stream supports auth headers and JSON payloads.',
    url: 'https://example.local/docs/streaming-transport',
    score: 0.89,
  },
  {
    title: 'Accessibility Checklist',
    snippet: 'Focus trapping and keyboard support are required for modal dialogs.',
    url: 'https://example.local/docs/accessibility',
    score: 0.86,
  },
];

// Helper to get a random mock response
export function getRandomMockResponse(): string {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

export function createSSEHandler() {
  return async (c: Context) => {
    console.log('📡 SSE connection established');

    // SSE stream
    return c.body(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          // Send initial connection message
          const welcomeMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: '👋 Connected to mock Hono server! Send me a message to get started.',
            timestamp: Date.now(),
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(welcomeMessage)}\n\n`));

          // Disabled automatic messages - only send on user request
          // const messageInterval = setInterval(() => { ... }, 30000);

          // Keep-alive ping every 30 seconds
          const keepAlive = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': keep-alive\n\n'));
            } catch (error) {
              console.log('📡 SSE stream ended');
              clearInterval(keepAlive);
            }
          }, 30000);

          // Note: ReadableStream doesn't have a direct way to detect disconnect
          // The errors above handle it when the stream is closed
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
      }
    );
  };
}

function toSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createPostSSEStreamHandler() {
  return async (message: string, signal: AbortSignal): Promise<ReadableStream> => {
    const encoder = new TextEncoder();
    const response = getRandomMockResponse();
    const citations = mockCitations
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2));

    return new ReadableStream({
      start(controller) {
        let timeoutIds: ReturnType<typeof setTimeout>[] = [];

        const cleanup = () => {
          timeoutIds.forEach((id) => clearTimeout(id));
          timeoutIds = [];
        };

        const abortHandler = () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // Stream may already be closed.
          }
        };

        signal.addEventListener('abort', abortHandler, { once: true });

        // Send citations first so UI can render sources before token completion.
        controller.enqueue(encoder.encode(toSseEvent('citations', { citations, query: message })));

        const chunks = response.split(' ');
        chunks.forEach((chunk, index) => {
          const id = setTimeout(() => {
            if (signal.aborted) return;
            const token = index === chunks.length - 1 ? chunk : `${chunk} `;
            controller.enqueue(encoder.encode(toSseEvent('token', { token })));

            if (index === chunks.length - 1) {
              controller.enqueue(encoder.encode(toSseEvent('done', { answer: response })));
              cleanup();
              signal.removeEventListener('abort', abortHandler);
              controller.close();
            }
          }, 80 * (index + 1));

          timeoutIds.push(id);
        });
      },
      cancel() {
        // Client disconnected.
      },
    });
  };
}
