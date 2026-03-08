# Data Model: KK-LRMS

**Branch**: `001-kk-lrms-app` | **Date**: 2026-03-08

## Overview

KK-LRMS has **two data layers**:

1. **HOSxP Source Data** — accessed read-only via BMS Session API (SQL queries through per-hospital tunnel URLs). This is the authoritative clinical data.
2. **KK-LRMS Local Cache** — PostgreSQL database storing cached patient data, system configuration, user sessions, and audit logs. Uses a custom database abstraction layer supporting both SQLite (tests) and PostgreSQL (production).

### Data Flow

```
HOSxP DB (per hospital)
  ↓ SQL queries via BMS Session API (/api/sql)
KK-LRMS Server (polling every 30s)
  ↓ Upsert cached data
KK-LRMS PostgreSQL (local cache)
  ↓ API responses
Dashboard Clients (SWR + SSE)
```

### Schema Sync Strategy

Local tables are defined as TypeScript `TableDefinition` objects in `src/db/tables/`. On server startup, the `SchemaSync` engine:
1. Reads all table definitions
2. Introspects the current database schema
3. Creates missing tables
4. Adds missing columns to existing tables
5. Creates missing indexes

**No SQL migration scripts are used.** Schema changes are made by updating TypeScript table definitions.

### Database Adapters

- **SqliteAdapter** (`better-sqlite3`): Used for unit tests. In-memory mode.
- **PostgresAdapter** (`pg`): Used for development and production. Connection pooling via `pg.Pool`.

### Type Mapping

| Abstract Type | PostgreSQL              | SQLite                     |
| ------------- | ----------------------- | -------------------------- |
| uuid          | VARCHAR(36)             | TEXT                       |
| string(N)     | VARCHAR(N)              | TEXT                       |
| text          | TEXT                    | TEXT                       |
| integer       | INTEGER                 | INTEGER                    |
| decimal       | DECIMAL(10,2)           | REAL                       |
| boolean       | BOOLEAN                 | INTEGER (0/1)              |
| datetime      | TIMESTAMPTZ             | TEXT (ISO 8601)            |
| json          | JSONB                   | TEXT (JSON string)         |
| string[]      | TEXT[]                  | TEXT (JSON array string)   |

## HOSxP Source Tables (Read-Only via BMS Session)

These tables exist in each hospital's HOSxP database. KK-LRMS queries them via BMS Session API.

### patient (HOSxP)

| Column | Type | Description |
|--------|------|-------------|
| hn | varchar(9) | Hospital Number (PK) |
| pname | varchar(25) | Name prefix |
| fname | varchar(100) | First name |
| lname | varchar(100) | Last name |
| cid | varchar(13) | National ID (13 digits) |
| birthday | date | Date of birth |
| sex | char(1) | Gender (1=Male, 2=Female) |

### ipt (HOSxP — Inpatient Admission)

| Column | Type | Description |
|--------|------|-------------|
| an | varchar | Admission Number |
| hn | varchar | Hospital Number (FK → patient) |
| regdate | date | Registration date |
| regtime | time | Registration time |
| dchdate | date | Discharge date (NULL = still admitted) |
| dchtime | time | Discharge time |
| ward | varchar | Ward code |
| admdoctor | varchar | Admitting doctor code |

### ipt_pregnancy (HOSxP — Pregnancy Data)

| Column | Type | Description |
|--------|------|-------------|
| an | varchar | Admission Number (FK → ipt) |
| preg_number | integer | Pregnancy number (Gravida) |
| ga | integer | Gestational age (weeks) |
| labor_date | date | Labor date |
| anc_complete | char | ANC complete flag |
| child_count | integer | Number of children |
| deliver_type | integer | Delivery type ID |

### ipt_pregnancy_vital_sign (HOSxP — Pregnancy Vitals + Partogram)

| Column | Type | Description |
|--------|------|-------------|
| an | varchar | Admission Number (FK → ipt) |
| hr | integer | Maternal heart rate (bpm) |
| bps | numeric | Systolic blood pressure (mmHg) |
| bpd | numeric | Diastolic blood pressure (mmHg) |
| fetal_heart_sound | varchar | Fetal heart rate/sound |
| cervical_open_size | numeric | Cervix dilation (cm) — Partogram data |
| eff | numeric | Cervical effacement (%) |
| station | varchar | Fetal station |
| hct | numeric | Hematocrit (%) |
| height | numeric | Maternal height (cm) |
| bw | numeric | Body weight (kg) |
| temperature | numeric | Temperature |
| rr | integer | Respiratory rate |
| ultrasound_result | text | Ultrasound result text |

### labor (HOSxP — Labor Record)

| Column | Type | Description |
|--------|------|-------------|
| laborid | integer | Primary key |
| an | varchar | Admission Number |
| mother_gvalue | varchar | Gravida (G value) |
| mother_hct | varchar | Hematocrit |
| mother_aging | integer | Gestational age |
| mother_lmp_date | date | Last menstrual period |
| mother_edc_date | date | Expected date of confinement |
| labour_startdate/time | date/time | Labor start |
| labour_finishdate/time | date/time | Labor finish (delivery) |
| placenta_bloodloss | integer | Blood loss (PPH, ml) |
| infant_weight | numeric | Infant weight (grams) |
| infant_sex | char | Infant sex |

### person_anc (HOSxP — ANC Registration)

| Column | Type | Description |
|--------|------|-------------|
| person_anc_id | integer | Primary key |
| person_id | integer | Person ID |
| blood_hct_result | varchar | Hematocrit result |
| ga | integer | Gestational age |
| lmp | date | Last menstrual period |
| edc | date | Expected date of confinement |
| preg_no | integer | Pregnancy number |
| service_count | integer | ANC visit count |

### opdscreen (HOSxP — Screening/Physical Exam)

| Column | Type | Description |
|--------|------|-------------|
| hn | varchar | Hospital Number |
| height | numeric | Height (cm) |
| weight | numeric | Weight (kg) |

## KK-LRMS Local Entities (PostgreSQL Cache)

### Entity Relationship

```
Hospital 1──N HospitalBmsConfig
Hospital 1──N CachedPatient 1──N CachedVitalSign
                    │
                    ├── 1──N CpdScore
                    └── 1──1 CachedLaborRecord

User 1──N AuditLog
```

### Hospital

| Field          | Type        | Constraints                      | Notes                                    |
| -------------- | ----------- | -------------------------------- | ---------------------------------------- |
| id             | UUID        | PK, auto-generated              |                                          |
| hcode          | String(5)   | UNIQUE, NOT NULL                 | 5-digit hospital code from MOH           |
| name           | String(255) | NOT NULL                         | Hospital name in Thai                    |
| level          | Enum        | NOT NULL                         | A_S, M1, M2, F1, F2, F3                 |
| is_active      | Boolean     | NOT NULL, DEFAULT true           |                                          |
| last_sync_at   | DateTime    | NULL                             | Last successful data sync                |
| connection_status | Enum     | NOT NULL, DEFAULT UNKNOWN        | ONLINE, OFFLINE, UNKNOWN                 |
| created_at     | DateTime    | NOT NULL, DEFAULT now()          |                                          |
| updated_at     | DateTime    | NOT NULL, auto-updated           |                                          |

### HospitalBmsConfig

BMS Session configuration per hospital. Separated from Hospital for security.

| Field           | Type        | Constraints                      | Notes                                    |
| --------------- | ----------- | -------------------------------- | ---------------------------------------- |
| id              | UUID        | PK, auto-generated              |                                          |
| hospital_id     | UUID        | FK → Hospital, UNIQUE, NOT NULL  |                                          |
| tunnel_url      | String(500) | NOT NULL                         | BMS tunnel URL (e.g., https://XXXXX.tunnel.hosxp.net) |
| session_id      | String(50)  | NULL                             | Current BMS session ID (GUID)            |
| session_jwt     | String(500) | NULL                             | Cached JWT Bearer token                  |
| session_expires_at | DateTime | NULL                             | When the session expires                 |
| database_type   | String(20)  | NULL                             | postgresql or mysql                      |
| created_at      | DateTime    | NOT NULL, DEFAULT now()          |                                          |
| updated_at      | DateTime    | NOT NULL, auto-updated           |                                          |

### CachedPatient

Cached patient data from HOSxP (refreshed every 30s polling cycle).

| Field          | Type        | Constraints                      | Notes                                    |
| -------------- | ----------- | -------------------------------- | ---------------------------------------- |
| id             | UUID        | PK, auto-generated              |                                          |
| hospital_id    | UUID        | FK → Hospital, NOT NULL          |                                          |
| hn             | String(20)  | NOT NULL                         | Hospital Number from HOSxP               |
| an             | String(20)  | NOT NULL                         | Admission Number from HOSxP              |
| name           | String(255) | NOT NULL                         | Encrypted: pname + fname + lname         |
| cid            | String(13)  | NULL                             | Encrypted: National ID                   |
| age            | Integer     | NOT NULL                         | Calculated from birthday                 |
| gravida        | Integer     | NULL                             | From ipt_pregnancy.preg_number           |
| ga_weeks       | Integer     | NULL                             | From ipt_pregnancy.ga                    |
| anc_count      | Integer     | NULL                             | From person_anc.service_count            |
| admit_date     | DateTime    | NOT NULL                         | From ipt.regdate + regtime               |
| height_cm      | Decimal     | NULL                             | From opdscreen.height or ipt_pregnancy_vital_sign.height |
| weight_kg      | Decimal     | NULL                             | From opdscreen.weight or ipt_pregnancy_vital_sign.bw |
| weight_diff_kg | Decimal     | NULL                             | Calculated weight gain                   |
| fundal_height_cm | Decimal   | NULL                             | From labor.fundal_height (if available)  |
| us_weight_g    | Decimal     | NULL                             | Ultrasound fetal weight                  |
| hematocrit_pct | Decimal     | NULL                             | From ipt_pregnancy_vital_sign.hct        |
| labor_status   | Enum        | NOT NULL, DEFAULT ACTIVE         | ACTIVE or DELIVERED                      |
| delivered_at   | DateTime    | NULL                             | From labor.labour_finishdate/time        |
| synced_at      | DateTime    | NOT NULL                         | When data was last fetched from HOSxP    |
| created_at     | DateTime    | NOT NULL, DEFAULT now()          |                                          |
| updated_at     | DateTime    | NOT NULL, auto-updated           |                                          |

**Indexes**: `(hospital_id, an)` unique composite, `hospital_id`, `hn`, `labor_status`
**Encryption**: `name` and `cid` fields MUST be encrypted at rest (PDPA).

### CpdScore

| Field              | Type        | Constraints                  | Notes                                |
| ------------------ | ----------- | ---------------------------- | ------------------------------------ |
| id                 | UUID        | PK, auto-generated          |                                      |
| patient_id         | UUID        | FK → CachedPatient, NOT NULL |                                      |
| score              | Decimal     | NOT NULL                     | Numeric CPD score                    |
| risk_level         | Enum        | NOT NULL                     | LOW, MEDIUM, HIGH                    |
| recommendation     | String(500) | NULL                         | Thai text for high-risk              |
| factor_gravida     | Integer     | NULL                         |                                      |
| factor_anc_count   | Integer     | NULL                         |                                      |
| factor_ga_weeks    | Integer     | NULL                         |                                      |
| factor_height_cm   | Decimal     | NULL                         |                                      |
| factor_weight_diff | Decimal     | NULL                         |                                      |
| factor_fundal_ht   | Decimal     | NULL                         |                                      |
| factor_us_weight   | Decimal     | NULL                         |                                      |
| factor_hematocrit  | Decimal     | NULL                         |                                      |
| missing_factors    | String[]    | DEFAULT []                   | Factors not available                |
| calculated_at      | DateTime    | NOT NULL                     |                                      |
| created_at         | DateTime    | NOT NULL, DEFAULT now()      |                                      |

**Indexes**: `(patient_id, calculated_at)`, `risk_level`

### CachedVitalSign

| Field          | Type        | Constraints                      | Notes                                    |
| -------------- | ----------- | -------------------------------- | ---------------------------------------- |
| id             | UUID        | PK, auto-generated              |                                          |
| patient_id     | UUID        | FK → CachedPatient, NOT NULL     |                                          |
| measured_at    | DateTime    | NOT NULL                         | When measurement was taken               |
| maternal_hr    | Integer     | NULL                             | From ipt_pregnancy_vital_sign.hr         |
| fetal_hr       | String(50)  | NULL                             | From fetal_heart_sound (may be text)     |
| sbp            | Integer     | NULL                             | From ipt_pregnancy_vital_sign.bps        |
| dbp            | Integer     | NULL                             | From ipt_pregnancy_vital_sign.bpd        |
| cervix_cm      | Decimal     | NULL                             | From cervical_open_size (partogram)      |
| effacement_pct | Decimal     | NULL                             | From eff                                 |
| station        | String(10)  | NULL                             | From station                             |
| hct            | Decimal     | NULL                             | Hematocrit at measurement time           |
| pph_amount_ml  | Integer     | NULL                             | From labor.placenta_bloodloss            |
| synced_at      | DateTime    | NOT NULL                         |                                          |
| created_at     | DateTime    | NOT NULL, DEFAULT now()          |                                          |

**Indexes**: `(patient_id, measured_at)` unique composite

### User

| Field          | Type        | Constraints                      | Notes                                    |
| -------------- | ----------- | -------------------------------- | ---------------------------------------- |
| id             | UUID        | PK, auto-generated              |                                          |
| bms_user_name  | String(255) | NOT NULL                         | From BMS Session user_info.name          |
| bms_hospital_code | String(10) | NULL                          | From BMS Session user_info.hospital_code |
| bms_position   | String(100) | NULL                             | From BMS Session user_info.position      |
| role           | Enum        | NOT NULL                         | OBSTETRICIAN, NURSE, ADMIN               |
| is_active      | Boolean     | NOT NULL, DEFAULT true           |                                          |
| last_login_at  | DateTime    | NULL                             |                                          |
| created_at     | DateTime    | NOT NULL, DEFAULT now()          |                                          |
| updated_at     | DateTime    | NOT NULL, auto-updated           |                                          |

**Indexes**: `bms_user_name`, `role`
**Note**: No password stored. Authentication via BMS Session API.

### AuditLog

| Field          | Type        | Constraints                      | Notes                                    |
| -------------- | ----------- | -------------------------------- | ---------------------------------------- |
| id             | UUID        | PK, auto-generated              |                                          |
| user_id        | UUID        | FK → User, NOT NULL              |                                          |
| action         | String(50)  | NOT NULL                         | VIEW_PATIENT, VIEW_DASHBOARD, PRINT, etc |
| resource_type  | String(50)  | NOT NULL                         | PATIENT, DASHBOARD, REPORT               |
| resource_id    | String(50)  | NULL                             | Patient AN or Hospital HCODE             |
| ip_address     | String(45)  | NULL                             |                                          |
| user_agent     | String(500) | NULL                             |                                          |
| metadata       | JSON        | NULL                             |                                          |
| created_at     | DateTime    | NOT NULL, DEFAULT now()          |                                          |

**Indexes**: `(user_id, created_at)`, `(resource_type, resource_id)`, `created_at`
**Retention**: Minimum 1 year per PDPA. **Write-only**: append-only, no UPDATE/DELETE.

## Enums

| Enum Name         | Values                            |
| ----------------- | --------------------------------- |
| HospitalLevel     | A_S, M1, M2, F1, F2, F3          |
| ConnectionStatus  | ONLINE, OFFLINE, UNKNOWN          |
| LaborStatus       | ACTIVE, DELIVERED                 |
| RiskLevel         | LOW, MEDIUM, HIGH                 |
| UserRole          | OBSTETRICIAN, NURSE, ADMIN        |

## Lookup Data Seeding

Same as before: HospitalSeeder (26 KK hospitals), DefaultAdminSeeder.

## Key SQL Queries

### KK-LRMS → HOSxP (via BMS Session /api/sql)

```sql
-- Active labor patients for a hospital
SELECT i.an, i.hn, i.regdate, i.regtime, i.ward,
       ip.preg_number, ip.ga, ip.labor_date, ip.anc_complete
FROM ipt i
JOIN ipt_pregnancy ip ON i.an = ip.an
WHERE i.dchdate IS NULL
ORDER BY i.regdate DESC

-- Pregnancy vital signs (includes partogram data)
SELECT pvs.*
FROM ipt_pregnancy_vital_sign pvs
WHERE pvs.an = :an

-- Patient demographics (from patient table)
SELECT p.hn, p.pname, p.fname, p.lname, p.cid, p.birthday, p.sex
FROM patient p
WHERE p.hn = :hn
```

### KK-LRMS Internal (PostgreSQL cache)

```sql
-- Dashboard: All hospitals with patient counts by risk level
SELECT h.hcode, h.name, h.level, h.connection_status, h.last_sync_at,
  COUNT(CASE WHEN cs.risk_level = 'LOW' THEN 1 END) AS low_count,
  COUNT(CASE WHEN cs.risk_level = 'MEDIUM' THEN 1 END) AS medium_count,
  COUNT(CASE WHEN cs.risk_level = 'HIGH' THEN 1 END) AS high_count,
  COUNT(cp.id) AS total_count
FROM hospitals h
LEFT JOIN cached_patients cp ON cp.hospital_id = h.id AND cp.labor_status = 'ACTIVE'
LEFT JOIN LATERAL (
  SELECT risk_level FROM cpd_scores
  WHERE patient_id = cp.id
  ORDER BY calculated_at DESC LIMIT 1
) cs ON true
WHERE h.is_active = true
GROUP BY h.id
ORDER BY h.name;
```
