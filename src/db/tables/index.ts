// Barrel export for all table definitions
import type { TableDefinition } from '../table-definition';
import { hospitalsTable } from './hospitals';
import { hospitalBmsConfigTable } from './hospital-bms-config';
import { cachedPatientsTable } from './cached-patients';
import { cachedVitalSignsTable } from './cached-vital-signs';
import { cpdScoresTable } from './cpd-scores';
import { usersTable } from './users';
import { auditLogsTable } from './audit-logs';

export {
  hospitalsTable,
  hospitalBmsConfigTable,
  cachedPatientsTable,
  cachedVitalSignsTable,
  cpdScoresTable,
  usersTable,
  auditLogsTable,
};

// All tables in creation order (respects foreign key dependencies)
export const ALL_TABLES: TableDefinition[] = [
  hospitalsTable,
  hospitalBmsConfigTable,
  usersTable,
  cachedPatientsTable,
  cachedVitalSignsTable,
  cpdScoresTable,
  auditLogsTable,
];
