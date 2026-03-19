// T029: users table definition
import type { TableDefinition } from '../table-definition';

export const usersTable: TableDefinition = {
  name: 'users',
  fields: [
    { name: 'id', type: 'uuid', primaryKey: true },
    { name: 'bms_user_name', type: 'string', maxLength: 255 },
    { name: 'bms_hospital_code', type: 'string', maxLength: 10, nullable: true },
    { name: 'bms_position', type: 'string', maxLength: 100, nullable: true },
    { name: 'role', type: 'string', maxLength: 20 },
    { name: 'is_active', type: 'boolean', defaultValue: true },
    { name: 'last_login_at', type: 'datetime', nullable: true },
    { name: 'created_at', type: 'datetime' },
    { name: 'updated_at', type: 'datetime' },
  ],
  indexes: [
    { name: 'idx_users_bms_name', columns: ['bms_user_name'] },
    { name: 'idx_users_role', columns: ['role'] },
  ],
};
