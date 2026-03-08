// T010: BMS Session API types

export interface BmsSessionResponse {
  session_id: string;
}

export interface UserIdentity {
  name: string;
  position: string;
  hospital_code: string;
  department: string;
  is_hr_admin: boolean;
  is_director: boolean;
}

export interface UserRoles {
  is_hr_admin: boolean;
  is_director: boolean;
}

export interface DatabaseInfo {
  type: 'postgresql' | 'mysql';
  version?: string;
}

export interface SessionConfig {
  sessionId: string;
  jwt: string;
  bmsUrl: string;
  userInfo: UserIdentity;
  expiresAt: Date;
  expiredSecond: number;
  databaseInfo?: DatabaseInfo;
}

export interface BmsQueryResult {
  data: Record<string, unknown>[];
  field: string[];
  field_name: string[];
  record_count: number;
  MessageCode?: number;
}

export interface BmsValidateResponse {
  jwt: string;
  bms_url: string;
  user_info: UserIdentity;
  expired_second: number;
}

export interface BmsApiError {
  code: 'UNAUTHORIZED' | 'SQL_ERROR' | 'TIMEOUT' | 'CONNECTION_ERROR';
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface BmsSqlRequest {
  sql: string;
  params?: Record<string, unknown>;
}
