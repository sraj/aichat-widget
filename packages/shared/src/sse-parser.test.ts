import { describe, expect, it } from 'vitest';
import { SseParser, parseSseText } from './sse-parser';

describe('SseParser', () => {
  it('parses basic message event', () => {
    const events = parseSseText('data: hello\n\n');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'message',
      data: 'hello',
      id: undefined,
      retry: undefined,
    });
  });

  it('parses custom event types', () => {
    const events = parseSseText('event: token\ndata: hi\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('token');
    expect(events[0].data).toBe('hi');
  });

  it('supports multi-line data fields', () => {
    const events = parseSseText('data: line 1\ndata: line 2\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('line 1\nline 2');
  });

  it('handles comments and ignores unknown fields', () => {
    const events = parseSseText(':keepalive\nfoo:bar\ndata: ok\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('ok');
  });

  it('handles CRLF line endings', () => {
    const events = parseSseText('event: token\r\ndata: a\r\n\r\n');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('token');
    expect(events[0].data).toBe('a');
  });

  it('handles bare CR line endings', () => {
    const events = parseSseText('event: token\rdata: a\r\r');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('token');
    expect(events[0].data).toBe('a');
  });

  it('supports byte-level chunking across fields', () => {
    const parser = new SseParser();
    const out1 = parser.feed('eve');
    const out2 = parser.feed('nt: token\nda');
    const out3 = parser.feed('ta: hel');
    const out4 = parser.feed('lo\n\n');

    expect(out1).toHaveLength(0);
    expect(out2).toHaveLength(0);
    expect(out3).toHaveLength(0);
    expect(out4).toHaveLength(1);
    expect(out4[0]).toEqual({
      type: 'token',
      data: 'hello',
      id: undefined,
      retry: undefined,
    });
  });

  it('applies leading-space rule after colon', () => {
    const events = parseSseText('data:  two-spaces\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe(' two-spaces');
  });

  it('parses id and retry fields', () => {
    const events = parseSseText('id: 42\nretry: 3000\ndata: hi\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('42');
    expect(events[0].retry).toBe(3000);
  });

  it('flushes trailing buffered event without final newline', () => {
    const parser = new SseParser();
    const events = parser.feed('event: done\ndata: final');
    const finalEvent = parser.flush();

    expect(events).toHaveLength(0);
    expect(finalEvent).not.toBeNull();
    expect(finalEvent?.type).toBe('done');
    expect(finalEvent?.data).toBe('final');
  });
});
