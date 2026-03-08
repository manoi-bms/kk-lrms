// T012: KK-LRMS domain types and enums

export enum HospitalLevel {
  A_S = 'A_S',
  M1 = 'M1',
  M2 = 'M2',
  F1 = 'F1',
  F2 = 'F2',
  F3 = 'F3',
}

export enum ConnectionStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

export enum LaborStatus {
  ACTIVE = 'ACTIVE',
  DELIVERED = 'DELIVERED',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum UserRole {
  OBSTETRICIAN = 'OBSTETRICIAN',
  NURSE = 'NURSE',
  ADMIN = 'ADMIN',
}

export interface Hospital {
  id: string;
  hcode: string;
  name: string;
  level: HospitalLevel;
  isActive: boolean;
  lastSyncAt: Date | null;
  connectionStatus: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface HospitalBmsConfig {
  id: string;
  hospitalId: string;
  tunnelUrl: string;
  sessionId: string | null;
  sessionJwt: string | null;
  sessionExpiresAt: Date | null;
  databaseType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedPatient {
  id: string;
  hospitalId: string;
  hn: string;
  an: string;
  name: string;
  cid: string | null;
  age: number;
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  admitDate: Date;
  heightCm: number | null;
  weightKg: number | null;
  weightDiffKg: number | null;
  fundalHeightCm: number | null;
  usWeightG: number | null;
  hematocritPct: number | null;
  laborStatus: LaborStatus;
  deliveredAt: Date | null;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedVitalSign {
  id: string;
  patientId: string;
  measuredAt: Date;
  maternalHr: number | null;
  fetalHr: string | null;
  sbp: number | null;
  dbp: number | null;
  cervixCm: number | null;
  effacementPct: number | null;
  station: string | null;
  hct: number | null;
  pphAmountMl: number | null;
  syncedAt: Date;
  createdAt: Date;
}

export interface CpdScore {
  id: string;
  patientId: string;
  score: number;
  riskLevel: RiskLevel;
  recommendation: string | null;
  factorGravida: number | null;
  factorAncCount: number | null;
  factorGaWeeks: number | null;
  factorHeightCm: number | null;
  factorWeightDiff: number | null;
  factorFundalHt: number | null;
  factorUsWeight: number | null;
  factorHematocrit: number | null;
  missingFactors: string[];
  calculatedAt: Date;
  createdAt: Date;
}

export interface CpdFactors {
  gravida: number;
  ancCount: number;
  gaWeeks: number;
  heightCm: number;
  weightDiffKg: number;
  fundalHeightCm: number;
  usWeightG: number;
  hematocritPct: number;
}

export interface User {
  id: string;
  bmsUserName: string;
  bmsHospitalCode: string | null;
  bmsPosition: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
