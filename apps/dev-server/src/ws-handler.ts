import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Mock AI responses
const mockResponses = [
  "I'm a mock AI assistant running on WebSocket! How can I help?",
  "That's a great question! Let me help you with that...",
  "I understand. Here's what I think...",
  "Interesting! Let me break this down...",
  "Based on your message, here's my response...",
  "I can definitely help with that. Here's how...",
];

export function createWebSocketHandler(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/chat/ws',
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const apiKey = url.searchParams.get('apiKey');

    console.log('🔌 WebSocket connection established');

    // Validate API key
    if (!apiKey || !apiKey.startsWith('demo-api-key')) {
      console.log('❌ Invalid API key for WebSocket');
      ws.close(4001, 'Invalid API key');
      return;
    }

    // Send welcome message
    const welcomeMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '👋 Connected to mock WebSocket server! Send me a message.',
      timestamp: Date.now(),
    };

    ws.send(
      JSON.stringify({
        type: 'message',
        payload: welcomeMessage,
      })
    );

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());

        // Handle ping
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Handle message
        if (parsed.type === 'message') {
          const userMessage = parsed.payload as Message;
          console.log('📨 Received WebSocket message:', userMessage.content.substring(0, 50));

          // Simulate processing delay
          setTimeout(() => {
            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
            const response: Message = {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: randomResponse,
              timestamp: Date.now(),
            };

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'message',
                  payload: response,
                })
              );
            }
          }, 500 + Math.random() * 1500); // Random delay 500-2000ms
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Handle close
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} ${reason}`);
    });

    // Send periodic keep-alive pings
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  console.log('🔌 WebSocket server initialized on /api/chat/ws');
}
