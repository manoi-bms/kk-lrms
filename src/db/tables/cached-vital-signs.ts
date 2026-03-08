// T027: cached_vital_signs table definition
import type { TableDefinition } from '../table-definition';

export const cachedVitalSignsTable: TableDefinition = {
  name: 'cached_vital_signs',
  fields: [
    { name: 'id', type: 'uuid', primaryKey: true },
    {
      name: 'patient_id',
      type: 'uuid',
      references: { table: 'cached_patients', column: 'id' },
    },
    { name: 'measured_at', type: 'datetime' },
    { name: 'maternal_hr', type: 'integer', nullable: true },
    { name: 'fetal_hr', type: 'string', maxLength: 50, nullable: true },
    { name: 'sbp', type: 'integer', nullable: true },
    { name: 'dbp', type: 'integer', nullable: true },
    { name: 'cervix_cm', type: 'decimal', nullable: true },
    { name: 'effacement_pct', type: 'decimal', nullable: true },
    { name: 'station', type: 'string', maxLength: 10, nullable: true },
    { name: 'hct', type: 'decimal', nullable: true },
    { name: 'pph_amount_ml', type: 'integer', nullable: true },
    { name: 'synced_at', type: 'datetime' },
    { name: 'created_at', type: 'datetime' },
  ],
  indexes: [
    { name: 'idx_cvs_patient_measured', columns: ['patient_id', 'measured_at'], unique: true },
  ],
};
