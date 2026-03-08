// T013: API response types per contracts/api-routes.md

import type { RiskLevel, ConnectionStatus, HospitalLevel, LaborStatus } from './domain';

// Dashboard
export interface DashboardHospital {
  hcode: string;
  name: string;
  level: HospitalLevel;
  connectionStatus: ConnectionStatus;
  lastSyncAt: string | null;
  counts: {
    low: number;
    medium: number;
    high: number;
    total: number;
  };
}

export interface DashboardSummary {
  totalLow: number;
  totalMedium: number;
  totalHigh: number;
  totalActive: number;
}

export interface DashboardResponse {
  hospitals: DashboardHospital[];
  summary: DashboardSummary;
  updatedAt: string;
}

// Patient List
export interface PatientListItem {
  id: string;
  hn: string;
  an: string;
  name: string;
  age: number;
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  admitDate: string;
  laborStatus: LaborStatus;
  cpdScore: {
    score: number;
    riskLevel: RiskLevel;
    recommendation: string | null;
  } | null;
  latestVitals: {
    maternalHr: number | null;
    fetalHr: string | null;
    sbp: number | null;
    dbp: number | null;
    measuredAt: string;
  } | null;
  latestCervix: {
    dilationCm: number;
    measuredAt: string;
  } | null;
  syncedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PatientListResponse {
  patients: PatientListItem[];
  pagination: Pagination;
}

// Patient Detail
export interface PatientDetailResponse {
  patient: {
    id: string;
    hn: string;
    an: string;
    name: string;
    age: number;
    gravida: number | null;
    gaWeeks: number | null;
    ancCount: number | null;
    admitDate: string;
    heightCm: number | null;
    weightKg: number | null;
    weightDiffKg: number | null;
    fundalHeightCm: number | null;
    usWeightG: number | null;
    hematocritPct: number | null;
    laborStatus: LaborStatus;
    hospital: {
      hcode: string;
      name: string;
      level: HospitalLevel;
    };
    syncedAt: string;
  };
  cpdScore: {
    score: number;
    riskLevel: RiskLevel;
    recommendation: string | null;
    factors: {
      gravida: number | null;
      ancCount: number | null;
      gaWeeks: number | null;
      heightCm: number | null;
      weightDiffKg: number | null;
      fundalHeightCm: number | null;
      usWeightG: number | null;
      hematocritPct: number | null;
    };
    missingFactors: string[];
    calculatedAt: string;
  } | null;
}

// Vital Signs
export interface VitalSignEntry {
  measuredAt: string;
  maternalHr: number | null;
  fetalHr: string | null;
  sbp: number | null;
  dbp: number | null;
  pphAmountMl: number | null;
}

export interface VitalSignsResponse {
  vitals: VitalSignEntry[];
}

// Partogram
export interface PartogramEntry {
  measuredAt: string;
  dilationCm: number;
  alertLineCm: number | null;
  actionLineCm: number | null;
}

export interface PartogramResponse {
  partogram: {
    startTime: string;
    entries: PartogramEntry[];
  };
}

// Contractions
export interface ContractionEntry {
  measuredAt: string;
  intervalMin: number | null;
  durationSec: number | null;
  intensity: 'MILD' | 'MODERATE' | 'STRONG';
}

export interface ContractionsResponse {
  contractions: ContractionEntry[];
}

// Error
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: unknown | null;
  };
}

// SSE Events
export interface SsePatientUpdateEvent {
  type: 'new_admission' | 'vital_update' | 'delivered';
  hcode: string;
  an: string;
  riskLevel?: RiskLevel;
}

export interface SseConnectionStatusEvent {
  hcode: string;
  status: ConnectionStatus;
  lastSyncAt: string;
}

export interface SseSyncCompleteEvent {
  hcode: string;
  patientsUpdated: number;
  timestamp: string;
}
