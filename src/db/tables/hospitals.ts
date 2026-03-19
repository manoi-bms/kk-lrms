// T024: hospitals table definition
import type { TableDefinition } from '../table-definition';

export const hospitalsTable: TableDefinition = {
  name: 'hospitals',
  fields: [
    { name: 'id', type: 'uuid', primaryKey: true },
    { name: 'hcode', type: 'string', maxLength: 5, unique: true },
    { name: 'name', type: 'string', maxLength: 255 },
    { name: 'level', type: 'string', maxLength: 5 },
    { name: 'is_active', type: 'boolean', defaultValue: true },
    { name: 'last_sync_at', type: 'datetime', nullable: true },
    { name: 'connection_status', type: 'string', maxLength: 10, defaultValue: 'UNKNOWN' },
    { name: 'created_at', type: 'datetime' },
    { name: 'updated_at', type: 'datetime' },
  ],
  indexes: [
    { name: 'idx_hospitals_hcode', columns: ['hcode'], unique: true },
  ],
};
