// T030: audit_logs table definition — append-only (no UPDATE/DELETE)
import type { TableDefinition } from '../table-definition';

export const auditLogsTable: TableDefinition = {
  name: 'audit_logs',
  fields: [
    { name: 'id', type: 'uuid', primaryKey: true },
    {
      name: 'user_id',
      type: 'uuid',
      references: { table: 'users', column: 'id' },
    },
    { name: 'action', type: 'string', maxLength: 50 },
    { name: 'resource_type', type: 'string', maxLength: 50 },
    { name: 'resource_id', type: 'string', maxLength: 50, nullable: true },
    { name: 'ip_address', type: 'string', maxLength: 45, nullable: true },
    { name: 'user_agent', type: 'string', maxLength: 500, nullable: true },
    { name: 'metadata', type: 'json', nullable: true },
    { name: 'created_at', type: 'datetime' },
  ],
  indexes: [
    { name: 'idx_al_user_created', columns: ['user_id', 'created_at'] },
    { name: 'idx_al_resource', columns: ['resource_type', 'resource_id'] },
    { name: 'idx_al_created_at', columns: ['created_at'] },
  ],
};
