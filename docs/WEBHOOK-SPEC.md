# KK-LRMS Webhook API Specification

**Version:** 1.0
**Base URL:** `https://kk-lrms.bmscloud.in.th`
**Contact:** สำนักงานสาธารณสุขจังหวัดขอนแก่น (สสจ.ขอนแก่น)

## Overview

The KK-LRMS Webhook API allows **non-HOSxP hospitals** (private hospitals, hospitals using other HIS systems) to submit labor patient data into the centralized monitoring system. Data submitted via webhook receives identical processing to HOSxP-polled data:

- Patient name and CID encrypted (AES-256-GCM, PDPA compliant)
- CPD Risk Score calculated automatically from 8 clinical factors
- Cross-hospital transfer detection via CID hash
- Real-time SSE broadcast to dashboard clients
- Hospital connection status updated to ONLINE

---

## Authentication

All webhook requests require a **Bearer token** in the `Authorization` header.

```
Authorization: Bearer kklrms_a1b2c3d4e5f6789012345678901234567890
```

### API Key Format

| Property     | Value                          |
|-------------|--------------------------------|
| Prefix      | `kklrms_`                      |
| Key length  | 47 characters (prefix + 40 hex)|
| Storage     | SHA-256 hash (raw key never stored) |
| Scope       | Bound to one hospital          |
| Revocation  | Immediate, irreversible        |

> **Important:** The raw API key is shown **only once** when created. Store it securely.

### Obtaining an API Key

Contact the KK-LRMS administrator (สสจ.ขอนแก่น) to register your hospital and receive an API key. The admin will:

1. Register your hospital in the system (assign HCODE)
2. Generate an API key bound to your hospital
3. Provide the raw key (one-time display)

---

## Endpoints

### 1. Submit Patient Data

```
POST /api/webhooks/patient-data
```

Submit labor patient data for your hospital. Supports up to **100 patients** per request.

#### Headers

| Header          | Value                              | Required |
|----------------|------------------------------------|----------|
| Content-Type   | `application/json`                 | Yes      |
| Authorization  | `Bearer <api-key>`                 | Yes      |

#### Request Body

```json
{
  "mode": "full_snapshot",
  "patients": [
    {
      "hn": "HN-001",
      "an": "AN-2026-001",
      "name": "นาง ทดสอบ ระบบ",
      "cid": "1100500012345",
      "age": 28,
      "gravida": 1,
      "ga_weeks": 41,
      "anc_count": 3,
      "admit_date": "2026-03-08T08:00:00+07:00",
      "height_cm": 148,
      "weight_kg": 75,
      "weight_diff_kg": 20,
      "fundal_height_cm": 37,
      "us_weight_g": 4000,
      "hematocrit_pct": 29,
      "labor_status": "ACTIVE"
    }
  ]
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "patientsProcessed": 1,
  "newAdmissions": 1,
  "discharges": 0,
  "transfers": 0,
  "timestamp": "2026-03-08T08:00:05.123Z"
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 400    | `{ "error": "\"patients\" must be an array" }` | Invalid JSON or missing required fields |
| 400    | `{ "error": "\"patients\" array must not be empty" }` | Empty patients array |
| 400    | `{ "error": "\"patients\" array must not exceed 100 items per request" }` | Too many patients |
| 400    | `{ "error": "\"mode\" must be \"incremental\" or \"full_snapshot\"" }` | Invalid mode value |
| 400    | `{ "error": "Validation errors: patients[0].hn is required (string); ..." }` | Missing required patient fields |
| 401    | `{ "error": "Missing or invalid Authorization header. Use: Bearer <api-key>" }` | No Bearer token |
| 401    | `{ "error": "Invalid or revoked API key" }` | Wrong key, expired, or revoked |
| 500    | `{ "error": "Internal server error" }` | Server-side error |

---

## Ingestion Modes

### `incremental` (default)

Add or update **only** the patients included in the payload. Patients already in the system but not included in this request **retain their current status**.

Use this when:
- Sending updates for individual patients as they change
- Your system sends events (admit, update, discharge) one at a time
- You want to explicitly control each patient's status

```json
{
  "mode": "incremental",
  "patients": [
    {
      "hn": "HN-001", "an": "AN-001", "name": "นาง ทดสอบ",
      "age": 28, "admit_date": "2026-03-08T08:00:00+07:00",
      "labor_status": "DELIVERED"
    }
  ]
}
```

> **Note:** In incremental mode, you MUST explicitly send `"labor_status": "DELIVERED"` when a patient is discharged. Otherwise the patient remains ACTIVE in the dashboard indefinitely.

### `full_snapshot`

Send the **complete list** of all currently active patients. Patients in the system but **not** in the payload are automatically marked as `DELIVERED`.

Use this when:
- Your system periodically exports all active labor patients (e.g., every 5-30 minutes)
- You want the dashboard to automatically reflect discharges without explicit status updates
- Your system queries its database for all active patients and sends the full list

```json
{
  "mode": "full_snapshot",
  "patients": [
    { "hn": "HN-001", "an": "AN-001", "name": "Patient A", "age": 25, "admit_date": "..." },
    { "hn": "HN-002", "an": "AN-002", "name": "Patient B", "age": 30, "admit_date": "..." }
  ]
}
```

> **How it works:** If your hospital previously had 5 active patients and you send a `full_snapshot` with 3 patients, the 2 missing patients are automatically marked as DELIVERED with a `delivered_at` timestamp.

### Mode Comparison

| Behavior | `incremental` | `full_snapshot` |
|----------|--------------|-----------------|
| Patients in payload | Upserted (insert or update) | Upserted (insert or update) |
| Patients NOT in payload | **No change** (stay ACTIVE) | **Auto-discharged** (marked DELIVERED) |
| Discharge handling | Must send `labor_status: "DELIVERED"` explicitly | Automatic — omit from payload |
| Best for | Event-driven systems | Periodic batch exports |
| `discharges` in response | Always `0` | Count of auto-discharged patients |

---

## Patient Data Fields

### Required Fields

| Field        | Type   | Description                                    | Example                          |
|-------------|--------|------------------------------------------------|----------------------------------|
| `hn`        | string | Hospital Number (unique within your hospital)  | `"HN-001"`                       |
| `an`        | string | Admission Number (primary key for upsert)      | `"AN-2026-001"`                  |
| `name`      | string | Patient full name (auto-encrypted per PDPA)    | `"นาง สมหญิง ใจดี"`              |
| `age`       | number | Patient age in years                           | `28`                             |
| `admit_date`| string | Admission datetime (ISO 8601)                  | `"2026-03-08T08:00:00+07:00"`   |

### Optional Fields — CPD Risk Factors

These fields are used to calculate the CPD (Cephalopelvic Disproportion) risk score. The more fields provided, the more accurate the risk assessment.

| Field              | Type   | Description                                | CPD Factor | Example |
|-------------------|--------|--------------------------------------------|------------|---------|
| `cid`             | string | National ID (13 digits, auto-encrypted)    | —          | `"1100500012345"` |
| `gravida`         | number | Pregnancy count (ครรภ์ที่)                   | Gravida=1 → +2 pts | `1` |
| `ga_weeks`        | number | Gestational age in weeks (อายุครรภ์)         | ≥40 → +1.5 pts | `41` |
| `anc_count`       | number | Antenatal care visits (จำนวนฝากครรภ์)       | <4 → +1.5 pts | `3` |
| `height_cm`       | number | Maternal height in cm (ส่วนสูง)             | <150 → +2 pts | `148` |
| `weight_kg`       | number | Current weight in kg                       | —          | `75` |
| `weight_diff_kg`  | number | Weight gain during pregnancy (ส่วนต่างน้ำหนัก) | >20 → +2 pts | `20` |
| `fundal_height_cm`| number | Fundal height in cm (ยอดมดลูก)              | >36 → +2 pts | `37` |
| `us_weight_g`     | number | Estimated fetal weight by U/S (น้ำหนักเด็ก)  | >3500 → +2 pts | `4000` |
| `hematocrit_pct`  | number | Hematocrit percentage (ค่าความเข้มข้นเลือด)  | <30 → +1.5 pts | `29` |
| `labor_status`    | string | `"ACTIVE"` (default) or `"DELIVERED"`      | —          | `"ACTIVE"` |

### CPD Risk Levels

| Level  | Score Range | Color  | Action                            |
|--------|------------|--------|-----------------------------------|
| LOW    | 0 — 4.99   | Green  | ติดตามปกติ                         |
| MEDIUM | 5 — 9.99   | Yellow | เฝ้าระวังใกล้ชิด เตรียมพร้อมส่งต่อ    |
| HIGH   | ≥ 10       | Red    | ควรประสานส่งต่อ รพ.แม่ข่ายทันที!    |

> **Note:** Missing CPD factors are reported in the patient's detail view. Providing all 8 factors ensures the most accurate risk assessment.

### CID and Cross-Hospital Transfer Detection

When a patient's `cid` (national ID) is provided, the system:

1. Encrypts it with AES-256-GCM (PDPA compliance)
2. Stores a SHA-256 hash for cross-hospital matching
3. Detects if the same CID exists at another hospital with `ACTIVE` status
4. If detected: marks the source hospital's record as `TRANSFERRED` and broadcasts an SSE event

This enables seamless tracking when a patient transfers between hospitals.

---

## Response Fields

| Field              | Type    | Description                                           |
|-------------------|---------|-------------------------------------------------------|
| `success`         | boolean | `true` if processed successfully                      |
| `patientsProcessed` | number | Total patients upserted                               |
| `newAdmissions`   | number  | Patients that were newly created (not previously in system) |
| `discharges`      | number  | Patients auto-discharged (`full_snapshot` mode only)  |
| `transfers`       | number  | Cross-hospital transfers detected via CID             |
| `timestamp`       | string  | Server processing timestamp (ISO 8601)                |

---

## Examples

### Example 1: Admit a New Patient (Incremental)

```bash
curl -X POST https://kk-lrms.bmscloud.in.th/api/webhooks/patient-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kklrms_your_api_key_here" \
  -d '{
    "patients": [{
      "hn": "HN-12345",
      "an": "AN-2026-0001",
      "name": "นาง ทดสอบ ระบบ",
      "cid": "1100500012345",
      "age": 28,
      "gravida": 1,
      "ga_weeks": 41,
      "anc_count": 3,
      "admit_date": "2026-03-19T08:00:00+07:00",
      "height_cm": 148,
      "weight_diff_kg": 20,
      "fundal_height_cm": 37,
      "us_weight_g": 4000,
      "hematocrit_pct": 29
    }]
  }'
```

Response:

```json
{
  "success": true,
  "patientsProcessed": 1,
  "newAdmissions": 1,
  "discharges": 0,
  "transfers": 0,
  "timestamp": "2026-03-19T08:00:02.456Z"
}
```

### Example 2: Update Patient Data (Incremental)

Send the same `an` with updated fields — the system will upsert (update existing record).

```bash
curl -X POST https://kk-lrms.bmscloud.in.th/api/webhooks/patient-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kklrms_your_api_key_here" \
  -d '{
    "patients": [{
      "hn": "HN-12345",
      "an": "AN-2026-0001",
      "name": "นาง ทดสอบ ระบบ",
      "age": 28,
      "gravida": 1,
      "ga_weeks": 42,
      "admit_date": "2026-03-19T08:00:00+07:00",
      "height_cm": 148,
      "weight_diff_kg": 22,
      "fundal_height_cm": 38,
      "us_weight_g": 4100,
      "hematocrit_pct": 28
    }]
  }'
```

### Example 3: Discharge a Patient (Incremental)

```bash
curl -X POST https://kk-lrms.bmscloud.in.th/api/webhooks/patient-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kklrms_your_api_key_here" \
  -d '{
    "patients": [{
      "hn": "HN-12345",
      "an": "AN-2026-0001",
      "name": "นาง ทดสอบ ระบบ",
      "age": 28,
      "admit_date": "2026-03-19T08:00:00+07:00",
      "labor_status": "DELIVERED"
    }]
  }'
```

### Example 4: Full Snapshot (Send All Active Patients)

Send every currently active patient. Any patient previously in the system but not in this list will be automatically discharged.

```bash
curl -X POST https://kk-lrms.bmscloud.in.th/api/webhooks/patient-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kklrms_your_api_key_here" \
  -d '{
    "mode": "full_snapshot",
    "patients": [
      {
        "hn": "HN-12345", "an": "AN-2026-0001",
        "name": "นาง ผู้ป่วย คนที่หนึ่ง", "age": 28,
        "gravida": 1, "ga_weeks": 41, "anc_count": 3,
        "admit_date": "2026-03-19T08:00:00+07:00",
        "height_cm": 148, "weight_diff_kg": 20,
        "fundal_height_cm": 37, "us_weight_g": 4000,
        "hematocrit_pct": 29
      },
      {
        "hn": "HN-12346", "an": "AN-2026-0002",
        "name": "นาง ผู้ป่วย คนที่สอง", "age": 24,
        "gravida": 2, "ga_weeks": 38, "anc_count": 8,
        "admit_date": "2026-03-19T10:00:00+07:00",
        "height_cm": 162, "weight_diff_kg": 10,
        "fundal_height_cm": 30, "us_weight_g": 2800,
        "hematocrit_pct": 36
      },
      {
        "hn": "HN-12347", "an": "AN-2026-0003",
        "name": "นาง ผู้ป่วย คนที่สาม", "age": 30,
        "admit_date": "2026-03-19T12:00:00+07:00"
      }
    ]
  }'
```

Response:

```json
{
  "success": true,
  "patientsProcessed": 3,
  "newAdmissions": 0,
  "discharges": 2,
  "transfers": 0,
  "timestamp": "2026-03-19T14:00:01.789Z"
}
```

> The `discharges: 2` means 2 patients that were previously active were not in this snapshot and were automatically marked as DELIVERED.

### Example 5: Minimal Data (Required Fields Only)

```bash
curl -X POST https://kk-lrms.bmscloud.in.th/api/webhooks/patient-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kklrms_your_api_key_here" \
  -d '{
    "patients": [{
      "hn": "HN-99001",
      "an": "AN-2026-9001",
      "name": "นาง ทดสอบ ส่งข้อมูลน้อย",
      "age": 25,
      "admit_date": "2026-03-19T08:00:00+07:00"
    }]
  }'
```

> With only required fields, the CPD score will be calculated but report many missing factors. The more clinical data you provide, the more accurate the risk assessment.

---

## Admin API (API Key Management)

These endpoints require admin authentication (login to KK-LRMS with admin role). They are **not** accessible via API key.

### List API Keys

```
GET /api/admin/webhooks
```

Response:

```json
{
  "keys": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "hospitalId": "660e8400-e29b-41d4-a716-446655440001",
      "hcode": "99901",
      "hospitalName": "รพ.เอกชนทดสอบ",
      "keyPrefix": "kklrms_a",
      "label": "Production Key",
      "isActive": true,
      "lastUsedAt": "2026-03-19T14:30:00.000Z",
      "createdAt": "2026-03-15T09:00:00.000Z",
      "revokedAt": null
    }
  ]
}
```

### Create API Key

```
POST /api/admin/webhooks
```

Request:

```json
{
  "hcode": "99901",
  "label": "Production Key"
}
```

Response (201 Created):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "apiKey": "kklrms_a1b2c3d4e5f6789012345678901234567890",
  "keyPrefix": "kklrms_a",
  "hospitalName": "รพ.เอกชนทดสอบ",
  "hcode": "99901",
  "label": "Production Key",
  "message": "API key created. Save this key — it will not be shown again."
}
```

> **Warning:** The `apiKey` field contains the raw key and is only returned in this response. It cannot be retrieved later.

### Revoke API Key

```
DELETE /api/admin/webhooks/:keyId
```

Response:

```json
{
  "success": true,
  "message": "API key revoked"
}
```

> Revocation is **immediate and irreversible**. Any webhook request using a revoked key will receive `401 Unauthorized`.

---

## Integration Guide

### Recommended Setup for Periodic Systems

If your HIS can export all active labor patients periodically:

```
┌──────────────┐     every 5-30 min      ┌──────────────────┐
│  Your HIS    │ ───── full_snapshot ────→ │  KK-LRMS API     │
│  (Database)  │     POST /api/webhooks/  │  Dashboard auto-  │
│              │     patient-data         │  updates via SSE  │
└──────────────┘                          └──────────────────┘
```

1. Query your database for all active labor patients (`WHERE discharge_date IS NULL`)
2. Map each patient to the webhook payload format
3. Send as `full_snapshot` — discharged patients are handled automatically
4. Recommended interval: **every 5 minutes**

### Recommended Setup for Event-Driven Systems

If your HIS emits events (admit, update, discharge):

```
┌──────────────┐    on each event         ┌──────────────────┐
│  Your HIS    │ ───── incremental ─────→ │  KK-LRMS API     │
│  (Events)    │     POST /api/webhooks/  │  Dashboard auto-  │
│              │     patient-data         │  updates via SSE  │
└──────────────┘                          └──────────────────┘
```

1. On patient admit: send patient data with `labor_status: "ACTIVE"` (or omit, defaults to ACTIVE)
2. On data update: send updated fields (same `an`)
3. On discharge: send with `labor_status: "DELIVERED"`
4. Use `incremental` mode (default)

### Error Handling

- **Retry on 500**: Server errors are transient. Retry with exponential backoff (1s, 2s, 4s, max 60s).
- **Do not retry on 400**: Fix the payload. Check validation error message for details.
- **Do not retry on 401**: Check your API key. Contact admin if revoked.
- **Idempotent upserts**: Sending the same patient data multiple times is safe. The system upserts by `an` (admission number).

### Data Processing Pipeline

After receiving your webhook data, the system automatically:

1. **Encrypts** patient name and CID (AES-256-GCM per PDPA)
2. **Upserts** patient records by AN (admission number)
3. **Detects transfers** via CID SHA-256 hash (cross-hospital matching)
4. **Calculates CPD score** from all available clinical factors
5. **Broadcasts SSE** events for new admissions and risk changes
6. **Auto-discharges** missing patients (full_snapshot mode only)
7. **Updates hospital status** to ONLINE on the dashboard

---

## Data Privacy (PDPA Compliance)

| Data Field      | Storage Method                                    |
|----------------|---------------------------------------------------|
| Patient name   | AES-256-GCM encrypted at rest                     |
| CID (national ID) | AES-256-GCM encrypted + SHA-256 hash for matching |
| Clinical data  | Stored in plaintext (not personally identifiable)  |
| API key        | SHA-256 hash only (raw key never stored)           |

All data transmitted over HTTPS/TLS. Patient names are **never displayed** on the dashboard UI — only HN and AN are shown.

---

## Rate Limits

| Constraint              | Limit                |
|------------------------|----------------------|
| Patients per request   | 100 maximum          |
| Request payload size   | 1 MB                 |
| Recommended interval   | ≥ 5 minutes (full_snapshot) |

---

## Changelog

| Version | Date       | Changes                                          |
|---------|------------|--------------------------------------------------|
| 1.0     | 2026-03-19 | Initial release: incremental + full_snapshot modes, API key auth, CPD scoring, transfer detection |
