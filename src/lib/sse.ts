// T038: SSE event emitter — singleton SseManager

interface SseClient {
  id: string;
  controller: ReadableStreamDefaultController;
}

export class SseManager {
  private static instance: SseManager;
  private clients: Map<string, SseClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    // Start heartbeat every 30s to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  static getInstance(): SseManager {
    if (!SseManager.instance) {
      SseManager.instance = new SseManager();
    }
    return SseManager.instance;
  }

  addClient(id: string, controller: ReadableStreamDefaultController): void {
    this.clients.set(id, { id, controller });
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  broadcast(event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    for (const [clientId, client] of this.clients) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        // Client disconnected — remove
        this.clients.delete(clientId);
      }
    }
  }

  private sendHeartbeat(): void {
    const encoder = new TextEncoder();
    const ping = encoder.encode(': ping\n\n');

    for (const [clientId, client] of this.clients) {
      try {
        client.controller.enqueue(ping);
      } catch {
        this.clients.delete(clientId);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clients.clear();
  }
}
