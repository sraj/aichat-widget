/**
 * Spec-compliant stateful SSE parser (WHATWG EventSource specification).
 *
 * Design goals (matching rag-chat-ui approach):
 *  - Survives byte-level chunking: one network frame ≠ one event
 *  - Handles \r\n, \r, and bare \n line endings
 *  - Supports comment lines (:), multi-line data: fields, leading-space rule
 *  - Pure function / no I/O — fully unit-testable
 */

export interface SseEvent {
  /** SSE event type (defaults to "message" if no `event:` field) */
  type: string;
  /** Concatenated data payload */
  data: string;
  /** Optional `id:` field */
  id?: string;
  /** Optional `retry:` field value in ms */
  retry?: number;
}

export class SseParser {
  /** Unparsed bytes carried over from the previous chunk */
  private buffer = '';

  /** Fields accumulated for the current event */
  private eventType = '';
  private dataLines: string[] = [];
  private lastEventId = '';
  private retryMs: number | undefined;

  /**
   * Feed a raw text chunk (may be partial lines).
   * Returns zero or more complete SSE events.
   */
  feed(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const events: SseEvent[] = [];

    // Split on any SSE-legal line ending: \r\n, \r, or \n
    // We keep a trailing empty segment so an unterminated line stays in the buffer.
    const lines = this.buffer.split(/\r\n|\r|\n/);

    // The last segment is either "" (the chunk ended with a newline) or a partial line.
    this.buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine;

      if (line === '') {
        // Empty line → dispatch event if we have data
        const event = this.dispatch();
        if (event) events.push(event);
        continue;
      }

      if (line.startsWith(':')) {
        // Comment line — ignore
        continue;
      }

      // Split "field:value" — value may contain ':' characters
      const colonIndex = line.indexOf(':');
      let field: string;
      let value: string;

      if (colonIndex === -1) {
        // Line with no colon: entire line is field name, value is ""
        field = line;
        value = '';
      } else {
        field = line.slice(0, colonIndex);
        // Remove exactly one leading space per spec
        value = line.slice(colonIndex + 1).replace(/^ /, '');
      }

      switch (field) {
        case 'event':
          this.eventType = value;
          break;
        case 'data':
          this.dataLines.push(value);
          break;
        case 'id':
          // Null character in id field is ignored per spec
          if (!value.includes('\0')) {
            this.lastEventId = value;
          }
          break;
        case 'retry': {
          const ms = parseInt(value, 10);
          if (!isNaN(ms)) this.retryMs = ms;
          break;
        }
        default:
          // Unknown field — ignore per spec
          break;
      }
    }

    return events;
  }

  /**
   * Flush any remaining buffered data as a final event (e.g. on stream end).
   * Returns the event if data exists, otherwise null.
   */
  flush(): SseEvent | null {
    if (this.buffer.length > 0) {
      // Complete the last line, then force-dispatch the accumulated event
      this.feed('\n');
      return this.dispatch();
    }
    return this.dispatch() ?? null;
  }

  /** Reset all accumulated state (call between logical streams) */
  reset(): void {
    this.buffer = '';
    this.eventType = '';
    this.dataLines = [];
    this.retryMs = undefined;
    // lastEventId is intentionally preserved across resets per spec
  }

  private dispatch(): SseEvent | null {
    if (this.dataLines.length === 0) {
      // No data — reset fields but don't emit
      this.eventType = '';
      return null;
    }

    // Join data lines with "\n" per spec (last line does NOT get a trailing "\n")
    const data = this.dataLines.join('\n');

    const event: SseEvent = {
      type: this.eventType || 'message',
      data,
      id: this.lastEventId || undefined,
      retry: this.retryMs,
    };

    // Reset per-event fields (lastEventId and retryMs persist across events)
    this.eventType = '';
    this.dataLines = [];

    return event;
  }
}

/**
 * Convenience: parse a complete SSE text body in one shot.
 * Useful for tests.
 */
export function parseSseText(text: string): SseEvent[] {
  const parser = new SseParser();
  const events = parser.feed(text);
  const last = parser.flush();
  if (last) events.push(last);
  return events;
}
