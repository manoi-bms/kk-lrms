// POST /api/webhooks/patient-data — inbound webhook for non-HOSxP hospitals
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { ensureInit } from '@/lib/ensure-init';
import { validateApiKey, validatePayload, processWebhookPayload } from '@/services/webhook';
import { SseManager } from '@/lib/sse';

export async function POST(request: NextRequest) {
  try {
    await ensureInit();
    const db = await getDatabase();

    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use: Bearer <api-key>' },
        { status: 401 },
      );
    }

    const rawKey = authHeader.slice(7);

    // Validate API key
    const keyInfo = await validateApiKey(db, rawKey);
    if (!keyInfo) {
      return NextResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401 },
      );
    }

    // Parse and validate payload
    const body = await request.json().catch(() => null);
    const validation = validatePayload(body);
    if (!validation.valid || !validation.payload) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    // Process webhook
    const sseManager = SseManager.getInstance();
    const result = await processWebhookPayload(
      db,
      keyInfo.hospitalId,
      validation.payload,
      sseManager,
    );

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
