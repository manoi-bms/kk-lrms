// T025: hospital_bms_config table definition
import type { TableDefinition } from '../table-definition';

export const hospitalBmsConfigTable: TableDefinition = {
  name: 'hospital_bms_config',
  fields: [
    { name: 'id', type: 'uuid', primaryKey: true },
    {
      name: 'hospital_id',
      type: 'uuid',
      unique: true,
      references: { table: 'hospitals', column: 'id' },
    },
    { name: 'tunnel_url', type: 'string', maxLength: 500 },
    { name: 'session_id', type: 'string', maxLength: 50, nullable: true },
    { name: 'session_jwt', type: 'text', nullable: true },
    { name: 'session_expires_at', type: 'datetime', nullable: true },
    { name: 'database_type', type: 'string', maxLength: 20, nullable: true },
    { name: 'created_at', type: 'datetime' },
    { name: 'updated_at', type: 'datetime' },
  ],
  indexes: [
    { name: 'idx_hbc_hospital_id', columns: ['hospital_id'], unique: true },
  ],
};
