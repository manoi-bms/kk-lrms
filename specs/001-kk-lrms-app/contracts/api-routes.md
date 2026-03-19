# API Routes Contract: KK-LRMS

**Branch**: `001-kk-lrms-app` | **Date**: 2026-03-08

## Overview

KK-LRMS exposes **internal API routes** consumed by the frontend via SWR.
Data ingestion happens server-side via **BMS Session API polling** (every 30s) —
not through incoming webhooks. Changes are broadcast to clients via SSE.

All internal routes require authentication. Admin routes require `role === 'ADMIN'`.

## Authentication

### BMS Session Flow

1. User provides `bms-session-id` (GUID from HOSxP workstation)
2. KK-LRMS validates via `hosxp.net/phapi/PasteJSON` → gets JWT + user info
3. NextAuth.js creates local session with role mapping
4. All subsequent requests use NextAuth.js session (JWT strategy)

Unauthenticated requests receive `401 Unauthorized`.
Admin-only routes (`/api/admin/*`) require `role === 'ADMIN'` → `403 Forbidden`.

### POST /api/auth/bms-session

Login via BMS Session ID.

**Auth**: None (public endpoint)

**Request**:
```json
{
  "sessionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Response 200**:
```json
{
  "user": {
    "name": "นพ.สมชาย",
    "role": "OBSTETRICIAN",
    "hospitalCode": "10670",
    "position": "แพทย์"
  },
  "expiresAt": "2026-04-07T10:30:00+07:00"
}
```

**Response 401**: Invalid or expired BMS session ID

## Data Ingestion (Server-Side)

Data flows into KK-LRMS via server-side polling, NOT client requests:

```
For each hospital with BMS config:
  1. Get/refresh session: {tunnel_url}/api/SessionID
  2. Validate: hosxp.net/phapi/PasteJSON → JWT + bms_url
  3. Execute SQL: {bms_url}/api/sql (Bearer JWT)
  4. Parse response: { data[], field[], field_name[], record_count }
  5. Upsert into local PostgreSQL cache
  6. If changes detected → broadcast SSE event
  7. Wait 30 seconds → repeat
```

## Internal API Routes

### GET /api/dashboard

Dashboard summary: all hospitals with patient counts by risk level.

**Auth**: Required (any role)
**Cache**: SWR revalidation every 30 seconds

**Response 200**:
```json
{
  "hospitals": [
    {
      "hcode": "10670",
      "name": "รพ.ชุมแพ",
      "level": "M1",
      "connectionStatus": "ONLINE",
      "lastSyncAt": "2026-03-08T10:30:00+07:00",
      "counts": {
        "low": 1,
        "medium": 2,
        "high": 0,
        "total": 3
      }
    }
  ],
  "summary": {
    "totalLow": 5,
    "totalMedium": 8,
    "totalHigh": 2,
    "totalActive": 15
  },
  "updatedAt": "2026-03-08T10:30:00+07:00"
}
```

### GET /api/hospitals/:hcode/patients

Patient list for a specific hospital.

**Auth**: Required (any role)
**Query params**: `status` (active|delivered|all), `risk_level` (low|medium|high|all), `page`, `per_page`

**Response 200**:
```json
{
  "patients": [
    {
      "id": "uuid",
      "hn": "000105188",
      "an": "6700012345",
      "name": "นาง...",
      "age": 28,
      "gravida": 2,
      "gaWeeks": 39,
      "ancCount": 8,
      "admitDate": "2026-03-08T02:30:00+07:00",
      "laborStatus": "ACTIVE",
      "cpdScore": {
        "score": 7,
        "riskLevel": "MEDIUM",
        "recommendation": null
      },
      "latestVitals": {
        "maternalHr": 82,
        "fetalHr": 140,
        "sbp": 120,
        "dbp": 80,
        "measuredAt": "2026-03-08T10:15:00+07:00"
      },
      "latestCervix": {
        "dilationCm": 5,
        "measuredAt": "2026-03-08T10:00:00+07:00"
      },
      "syncedAt": "2026-03-08T10:30:00+07:00"
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "perPage": 20,
    "totalPages": 1
  }
}
```

### GET /api/patients/:an

Full patient detail including latest vitals and CPD score.

**Auth**: Required (any role)
**Audit**: Logs VIEW_PATIENT event

**Response 200**:
```json
{
  "patient": {
    "id": "uuid",
    "hn": "000105188",
    "an": "6700012345",
    "name": "นาง...",
    "age": 28,
    "gravida": 2,
    "gaWeeks": 39,
    "ancCount": 8,
    "admitDate": "2026-03-08T02:30:00+07:00",
    "heightCm": 155,
    "weightKg": 75,
    "weightDiffKg": 15,
    "fundalHeightCm": 35,
    "usWeightG": 3200,
    "hematocritPct": 33,
    "laborStatus": "ACTIVE",
    "hospital": {
      "hcode": "10670",
      "name": "รพ.ชุมแพ",
      "level": "M1"
    },
    "syncedAt": "2026-03-08T10:30:00+07:00"
  },
  "cpdScore": {
    "score": 7,
    "riskLevel": "MEDIUM",
    "recommendation": null,
    "factors": {
      "gravida": 2,
      "ancCount": 8,
      "gaWeeks": 39,
      "heightCm": 155,
      "weightDiffKg": 15,
      "fundalHeightCm": 35,
      "usWeightG": 3200,
      "hematocritPct": 33
    },
    "missingFactors": [],
    "calculatedAt": "2026-03-08T10:30:00+07:00"
  }
}
```

### GET /api/patients/:an/vitals

Vital signs time-series for trend graphs.

**Auth**: Required (any role)

**Response 200**:
```json
{
  "vitals": [
    {
      "measuredAt": "2026-03-08T04:00:00+07:00",
      "maternalHr": 80,
      "fetalHr": 138,
      "sbp": 118,
      "dbp": 78,
      "pphAmountMl": null
    }
  ]
}
```

### GET /api/patients/:an/partogram

Cervix measurements for partogram graph.

**Auth**: Required (any role)

**Response 200**:
```json
{
  "partogram": {
    "startTime": "2026-03-08T02:30:00+07:00",
    "entries": [
      {
        "measuredAt": "2026-03-08T04:00:00+07:00",
        "dilationCm": 3,
        "alertLineCm": 3,
        "actionLineCm": null
      }
    ]
  }
}
```

### GET /api/patients/:an/contractions

Uterine contraction records.

**Auth**: Required (any role)

**Response 200**:
```json
{
  "contractions": [
    {
      "measuredAt": "2026-03-08T10:00:00+07:00",
      "intervalMin": 3,
      "durationSec": 55,
      "intensity": "MODERATE"
    }
  ]
}
```

### GET /api/sse/dashboard

Server-Sent Events stream for real-time dashboard updates.

**Auth**: Required (any role)
**Content-Type**: `text/event-stream`

**Events**:
```
event: patient-update
data: {"type":"new_admission","hcode":"10670","an":"6700012345","riskLevel":"MEDIUM"}

event: patient-update
data: {"type":"vital_update","hcode":"10670","an":"6700012345","riskLevel":"HIGH"}

event: patient-update
data: {"type":"delivered","hcode":"10670","an":"6700012345"}

event: connection-status
data: {"hcode":"10670","status":"OFFLINE","lastSyncAt":"2026-03-08T10:30:00+07:00"}

event: sync-complete
data: {"hcode":"10670","patientsUpdated":3,"timestamp":"2026-03-08T10:30:30+07:00"}
```

## Admin API Routes

### GET /api/admin/hospitals

List all hospitals with BMS config status.

**Auth**: Required (ADMIN role only)

**Response 200**:
```json
{
  "hospitals": [
    {
      "hcode": "10670",
      "name": "รพ.ชุมแพ",
      "level": "M1",
      "isActive": true,
      "connectionStatus": "ONLINE",
      "lastSyncAt": "2026-03-08T10:30:00+07:00",
      "bmsConfig": {
        "tunnelUrl": "https://10670-ondemand-win-xxxxx.tunnel.hosxp.net",
        "hasSession": true,
        "sessionExpiresAt": "2026-04-07T10:30:00+07:00",
        "databaseType": "postgresql"
      }
    }
  ]
}
```

### PUT /api/admin/hospitals/:hcode/bms-config

Update BMS Session configuration for a hospital.

**Auth**: Required (ADMIN role only)

**Request**:
```json
{
  "tunnelUrl": "https://10670-ondemand-win-xxxxx.tunnel.hosxp.net"
}
```

**Response 200**:
```json
{
  "status": "ok",
  "sessionValidated": true,
  "databaseType": "postgresql"
}
```

### POST /api/admin/hospitals/:hcode/test-connection

Test BMS Session connection for a hospital.

**Auth**: Required (ADMIN role only)

**Response 200**:
```json
{
  "connected": true,
  "databaseType": "postgresql",
  "databaseVersion": "PostgreSQL 16.4",
  "tablesFound": ["ipt", "ipt_pregnancy", "ipt_pregnancy_vital_sign", "labor"]
}
```

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "กรุณาเข้าสู่ระบบ",
    "details": null
  }
}
```

| HTTP Status | Code               | Thai Message                        |
| ----------- | ------------------ | ----------------------------------- |
| 401         | UNAUTHORIZED       | กรุณาเข้าสู่ระบบ                    |
| 403         | FORBIDDEN          | ไม่มีสิทธิ์เข้าถึง                   |
| 404         | NOT_FOUND          | ไม่พบข้อมูล                          |
| 422         | VALIDATION_ERROR   | ข้อมูลไม่ถูกต้อง                     |
| 500         | INTERNAL_ERROR     | เกิดข้อผิดพลาด กรุณาลองใหม่          |
| 503         | BMS_UNAVAILABLE    | ไม่สามารถเชื่อมต่อ BMS ได้           |
