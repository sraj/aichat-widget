import type { Citation, ConnectionConfig, Message } from '@aichat-widget/shared';
import { generateId, SseParser } from '@aichat-widget/shared';
import { BaseConnection } from './base';

interface StreamBody {
  message: string;
}

/**
 * POST-based SSE over fetch + ReadableStream.
 * Keeps EventSource-based SSE available as a separate protocol.
 */
export class FetchSSEConnection extends BaseConnection {
  private streamEndpoint: string;
  private messagesEndpoint: string;
  private abortController: AbortController | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    const streamPath = config.streamEndpoint || '/api/chat/ask/stream';
    const messagesPath = config.messagesEndpoint || '/api/chat/messages';
    this.streamEndpoint = this.resolveEndpoint(streamPath);
    this.messagesEndpoint = this.resolveEndpoint(messagesPath);
  }

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      return;
    }

    // This transport is request-scoped. Consider it ready once configured.
    this.setState('connecting');
    this.setState('connected');
    this.resetReconnectState();
    await this.processMessageQueue();
  }

  async disconnect(): Promise<void> {
    this.abort();
    this.resetReconnectState();
    this.setState('disconnected');
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.logger.debug('Aborted in-flight fetch stream');
    }
  }

  async send(content: string): Promise<void> {
    if (this._state !== 'connected') {
      this.queueMessage(content);
      return;
    }

    if (this.abortController) {
      // Ensure only one in-flight stream at a time.
      this.abort();
    }

    this.abortController = new AbortController();

    const assistantId = generateId();
    let assistantText = '';
    let citations: Citation[] = [];

    try {
      const response = await fetch(this.streamEndpoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({ message: content } satisfies StreamBody),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 405) {
          this.logger.warn(
            `Fetch SSE endpoint unavailable (${response.status}). Falling back to ${this.messagesEndpoint}`
          );
          await this.sendNonStreamingFallback(content, assistantId);
          return;
        }

        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response stream body available');
      }

      const parser = new SseParser();
      const decoder = new TextDecoder();
      const reader = response.body.getReader();

      const emitAssistant = (streamStatus: 'streaming' | 'done') => {
        // Avoid noisy empty updates unless we already have citations to show.
        if (assistantText.length === 0 && citations.length === 0) {
          return;
        }

        const msg: Message = {
          id: assistantId,
          role: 'assistant',
          content: assistantText,
          timestamp: Date.now(),
          metadata: {
            citations,
            streamStatus,
          },
        };
        this.events.emit('message', msg);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const events = parser.feed(chunk);

        for (const event of events) {
          const citationsEventName = this.config.citationsEventName || 'citations';
          const tokenEventName = this.config.tokenEventName || 'token';
          const doneEventName = this.config.doneEventName || 'done';
          const errorEventName = this.config.streamErrorEventName || 'error';

          if (event.type === citationsEventName) {
            const parsed = this.parseEventData(event.data);
            const nextCitations = this.extractCitations(parsed);
            if (nextCitations.length > 0) {
              citations = nextCitations;
              emitAssistant('streaming');
            }
            continue;
          }

          if (event.type === tokenEventName) {
            const parsed = this.parseEventData(event.data);
            const token = this.extractToken(parsed);
            if (token) {
              assistantText += token;
              emitAssistant('streaming');
            }
            continue;
          }

          if (event.type === doneEventName) {
            const parsed = this.parseEventData(event.data);
            const fullText = this.extractFinalText(parsed);
            if (fullText && fullText.length > assistantText.length) {
              assistantText = fullText;
            }
            emitAssistant('done');
            this.abortController = null;
            return;
          }

          if (event.type === errorEventName) {
            const parsed = this.parseEventData(event.data);
            const message =
              (typeof parsed === 'object' && parsed && 'error' in parsed
                ? String((parsed as Record<string, unknown>).error)
                : event.data) || 'Stream error';
            throw new Error(message);
          }

          // Fallback for generic message event payloads
          if (event.type === 'message') {
            const parsed = this.parseEventData(event.data);
            const token = this.extractToken(parsed) || (typeof parsed === 'string' ? parsed : '');
            if (token) {
              assistantText += token;
              emitAssistant('streaming');
            }
          }
        }
      }

      // Flush any final buffered event and emit final assistant message
      const tail = parser.flush();
      if (tail?.data) {
        const parsed = this.parseEventData(tail.data);
        const token = this.extractToken(parsed) || (typeof parsed === 'string' ? parsed : '');
        if (token) {
          assistantText += token;
        }
      }
      emitAssistant('done');
    } catch (error) {
      // AbortError is expected when user presses Stop.
      if ((error as Error).name === 'AbortError') {
        this.logger.debug('Fetch SSE stream aborted by user');
        return;
      }
      this.handleError(error as Error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  private parseEventData(data: string): unknown {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private extractToken(payload: unknown): string {
    if (typeof payload === 'string') return payload;
    if (!payload || typeof payload !== 'object') return '';

    const record = payload as Record<string, unknown>;
    const candidates = [record.token, record.delta, record.content, record.text];
    for (const candidate of candidates) {
      if (typeof candidate === 'string') return candidate;
    }

    return '';
  }

  private extractFinalText(payload: unknown): string {
    if (typeof payload === 'string') return payload;
    if (!payload || typeof payload !== 'object') return '';

    const record = payload as Record<string, unknown>;
    const candidates = [record.answer, record.content, record.text];
    for (const candidate of candidates) {
      if (typeof candidate === 'string') return candidate;
    }

    return '';
  }

  private extractCitations(payload: unknown): Citation[] {
    const normalizeCitation = (input: unknown): Citation | null => {
      if (!input || typeof input !== 'object') return null;
      const citation = input as Record<string, unknown>;
      const titleCandidate = citation.title ?? citation.name ?? citation.source;
      if (typeof titleCandidate !== 'string' || titleCandidate.trim().length === 0) {
        return null;
      }

      return {
        title: titleCandidate,
        snippet: typeof citation.snippet === 'string' ? citation.snippet : undefined,
        url: typeof citation.url === 'string' ? citation.url : undefined,
        score: typeof citation.score === 'number' ? citation.score : undefined,
      };
    };

    if (Array.isArray(payload)) {
      return payload.map(normalizeCitation).filter((citation): citation is Citation => Boolean(citation));
    }

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      if (Array.isArray(record.citations)) {
        return record.citations
          .map(normalizeCitation)
          .filter((citation): citation is Citation => Boolean(citation));
      }
    }

    return [];
  }

  private resolveEndpoint(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    try {
      return new URL(path, this.config.baseUrl).toString();
    } catch {
      return `${this.config.baseUrl}${path}`;
    }
  }

  private async sendNonStreamingFallback(content: string, assistantId: string): Promise<void> {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const response = await fetch(this.messagesEndpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(userMessage),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json().catch(() => ({}))) as {
      response?: Message;
      message?: Message;
      content?: string;
    };

    const payload = data.response || data.message;
    const assistantContent =
      payload?.content || (typeof data.content === 'string' ? data.content : '');

    if (!assistantContent) {
      throw new Error('Fallback response did not include assistant content');
    }

    this.events.emit('message', {
      id: payload?.id || assistantId,
      role: 'assistant',
      content: assistantContent,
      timestamp: payload?.timestamp || Date.now(),
      metadata: {
        citations: payload?.metadata?.citations,
        streamStatus: 'done',
      },
    });
  }
}
