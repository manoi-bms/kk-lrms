// T088: Audit service — append-only PDPA access logging
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseAdapter } from '@/db/adapter';

export interface AuditLogEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function logAccess(
  db: DatabaseAdapter,
  entry: AuditLogEntry,
): Promise<void> {
  if (!entry.userId || !entry.action || !entry.resourceType) {
    throw new Error('Missing required audit log fields: userId, action, resourceType');
  }

  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId ?? null,
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      now,
    ],
  );
}
