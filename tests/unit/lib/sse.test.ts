// Unit tests for src/lib/sse.ts — SseManager singleton
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SseManager } from '@/lib/sse';

function createMockController() {
  const chunks: Uint8Array[] = [];
  const controller = {
    enqueue: vi.fn((chunk: Uint8Array) => chunks.push(chunk)),
    close: vi.fn(),
  } as unknown as ReadableStreamDefaultController;
  return { controller, chunks };
}

function decodeChunks(chunks: Uint8Array[]): string {
  const decoder = new TextDecoder();
  return chunks.map((c) => decoder.decode(c)).join('');
}

describe('SseManager', () => {
  let manager: SseManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = SseManager.getInstance();
    // Clean slate for each test
    manager.destroy();
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
    // Reset the singleton so each test gets a fresh instance
    // We need to access the private static field to reset it
    // @ts-expect-error accessing private static for test cleanup
    SseManager.instance = undefined;
  });

  it('starts with zero clients', () => {
    expect(manager.getClientCount()).toBe(0);
  });

  it('returns the same singleton instance', () => {
    const instance1 = SseManager.getInstance();
    const instance2 = SseManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('adds a client and increases client count', () => {
    const { controller } = createMockController();
    manager.addClient('client-1', controller);
    expect(manager.getClientCount()).toBe(1);
  });

  it('adds multiple clients', () => {
    const { controller: c1 } = createMockController();
    const { controller: c2 } = createMockController();
    manager.addClient('client-1', c1);
    manager.addClient('client-2', c2);
    expect(manager.getClientCount()).toBe(2);
  });

  it('removes a client and decreases client count', () => {
    const { controller } = createMockController();
    manager.addClient('client-1', controller);
    expect(manager.getClientCount()).toBe(1);

    manager.removeClient('client-1');
    expect(manager.getClientCount()).toBe(0);
  });

  it('removing a non-existent client does not throw', () => {
    expect(() => manager.removeClient('nonexistent')).not.toThrow();
  });

  it('broadcasts events to all connected clients', () => {
    const mock1 = createMockController();
    const mock2 = createMockController();
    manager.addClient('client-1', mock1.controller);
    manager.addClient('client-2', mock2.controller);

    manager.broadcast('patient-update', { an: '123' });

    const expected = 'event: patient-update\ndata: {"an":"123"}\n\n';

    expect(decodeChunks(mock1.chunks)).toBe(expected);
    expect(decodeChunks(mock2.chunks)).toBe(expected);
  });

  it('broadcasts correct SSE format', () => {
    const mock = createMockController();
    manager.addClient('client-1', mock.controller);

    manager.broadcast('sync-complete', { hospital: 'KK', count: 5 });

    const output = decodeChunks(mock.chunks);
    expect(output).toContain('event: sync-complete');
    expect(output).toContain('data: {"hospital":"KK","count":5}');
    // Must end with double newline per SSE spec
    expect(output).toMatch(/\n\n$/);
  });

  it('handles client disconnect gracefully during broadcast', () => {
    const goodMock = createMockController();
    const badController = {
      enqueue: vi.fn(() => {
        throw new Error('Stream closed');
      }),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    manager.addClient('good-client', goodMock.controller);
    manager.addClient('bad-client', badController);

    expect(manager.getClientCount()).toBe(2);

    // Broadcast should not throw even if one client errors
    expect(() => manager.broadcast('test-event', { ok: true })).not.toThrow();

    // The bad client should have been removed
    expect(manager.getClientCount()).toBe(1);

    // The good client should still have received the message
    expect(decodeChunks(goodMock.chunks)).toContain('event: test-event');
  });

  it('sends heartbeat pings to all clients every 30 seconds', () => {
    // Reset singleton to get fresh heartbeat interval
    // @ts-expect-error accessing private static for test cleanup
    SseManager.instance = undefined;
    manager = SseManager.getInstance();

    const mock = createMockController();
    manager.addClient('client-1', mock.controller);

    // Advance timer by 30 seconds to trigger heartbeat
    vi.advanceTimersByTime(30000);

    const output = decodeChunks(mock.chunks);
    expect(output).toContain(': ping');
  });

  it('removes disconnected clients during heartbeat', () => {
    // @ts-expect-error accessing private static for test cleanup
    SseManager.instance = undefined;
    manager = SseManager.getInstance();

    const badController = {
      enqueue: vi.fn(() => {
        throw new Error('Stream closed');
      }),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    manager.addClient('bad-client', badController);
    expect(manager.getClientCount()).toBe(1);

    // Trigger heartbeat
    vi.advanceTimersByTime(30000);

    // Client that errored should be removed
    expect(manager.getClientCount()).toBe(0);
  });

  it('destroy clears all clients and stops heartbeat', () => {
    const mock = createMockController();
    manager.addClient('client-1', mock.controller);
    expect(manager.getClientCount()).toBe(1);

    manager.destroy();
    expect(manager.getClientCount()).toBe(0);
  });

  it('broadcast to zero clients does not throw', () => {
    expect(() => manager.broadcast('test', { data: 1 })).not.toThrow();
  });

  it('replaces a client with the same ID', () => {
    const mock1 = createMockController();
    const mock2 = createMockController();

    manager.addClient('same-id', mock1.controller);
    manager.addClient('same-id', mock2.controller);

    // Map.set replaces the value — count should still be 1
    expect(manager.getClientCount()).toBe(1);

    // Broadcasting should only reach the second controller
    manager.broadcast('test', { val: 42 });
    expect(mock2.chunks.length).toBe(1);
    // The first controller should NOT receive the broadcast
    expect(mock1.chunks.length).toBe(0);
  });
});
