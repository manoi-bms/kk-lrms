// T051: GET /api/sse/dashboard — SSE stream for real-time dashboard updates
import { v4 as uuidv4 } from 'uuid';
import { ensureInit } from '@/lib/ensure-init';
import { SseManager } from '@/lib/sse';

export async function GET() {
  await ensureInit();
  const clientId = uuidv4();
  const sseManager = SseManager.getInstance();

  const stream = new ReadableStream({
    start(controller) {
      sseManager.addClient(clientId, controller);

      // Send initial connection event
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`),
      );
    },
    cancel() {
      sseManager.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
