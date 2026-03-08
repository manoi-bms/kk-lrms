# Tasks: KK-LRMS — Labor Room Monitoring System

**Input**: Design documents from `/specs/001-kk-lrms-app/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-routes.md, research.md, quickstart.md

**Tests**: Included — Constitution mandates TDD (NON-NEGOTIABLE). Tests are written FIRST.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6)
- Exact file paths included

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize Next.js 15 project with all tooling configured

- [x] T001 Initialize Next.js 15 project with TypeScript 5.x strict mode, create package.json with name "kk-lrms" and tsconfig.json with strict: true in project root
- [x] T002 [P] Install runtime dependencies: next react react-dom swr recharts pg next-auth @fontsource/noto-sans-thai uuid in package.json
- [x] T003 [P] Install dev dependencies: vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom better-sqlite3 @types/better-sqlite3 @types/pg @types/uuid eslint prettier @playwright/test in package.json
- [x] T004 [P] Configure Tailwind CSS 4 with custom KK-LRMS colors (risk green/yellow/red) and initialize shadcn/ui in tailwind.config.ts and postcss.config.mjs
- [x] T005 [P] Configure Vitest with React testing support, path aliases matching tsconfig, jsdom environment in vitest.config.ts
- [x] T006 [P] Create docker-compose.yml with PostgreSQL 16 service (db: kklrms/kklrms, port 5432) and app service (port 3000, depends_on db)
- [x] T007 [P] Create .env.example with DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, BMS_VALIDATE_URL, ENCRYPTION_KEY, DEV_HOSPITAL_TUNNEL_URL
- [x] T008 [P] Configure ESLint with TypeScript strict rules and Prettier integration in eslint.config.mjs and .prettierrc
- [x] T009 Configure next.config.ts (standalone output, experimental instrumentation) and verify clean build passes with `npm run build`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type Definitions

- [x] T010 [P] Define BMS Session types: BmsSessionResponse, UserIdentity, UserRoles, DatabaseInfo, SessionConfig, BmsQueryResult, BmsApiError in src/types/bms-session.ts
- [x] T011 [P] Define HOSxP source row types: HosxpPatientRow, HosxpIptRow, HosxpPregnancyRow, HosxpVitalSignRow, HosxpLaborRow, HosxpAncRow matching actual HOSxP column names in src/types/hosxp.ts
- [x] T012 [P] Define KK-LRMS domain types and enums: Hospital, CachedPatient, CachedVitalSign, CpdScore, User, AuditLog, HospitalBmsConfig; enums HospitalLevel, ConnectionStatus, LaborStatus, RiskLevel, UserRole in src/types/domain.ts
- [x] T013 [P] Define API response types: DashboardResponse, PatientListResponse, PatientDetailResponse, VitalSignsResponse, PartogramResponse, ContractionsResponse, ErrorResponse, Pagination per contracts/api-routes.md in src/types/api.ts

### Configuration

- [x] T014 [P] Create risk level config: score thresholds (<5=LOW, 5-9.5=MEDIUM, >=10=HIGH), colors (green #22c55e, yellow #eab308, red #ef4444), Thai labels (ต่ำ/ปานกลาง/สูง), CPD factor weights per SPEC.md section 4.1.3 in src/config/risk-levels.ts
- [x] T015 [P] Create hospital level definitions: A_S, M1, M2, F1, F2, F3 enum values with Thai display names, sort order, level descriptions in src/config/hospitals.ts
- [x] T016 [P] Create dual-dialect SQL query templates: ACTIVE_LABOR_PATIENTS, PREGNANCY_VITAL_SIGNS, PATIENT_DEMOGRAPHICS, LABOR_RECORD, ANC_DATA with both PostgreSQL and MySQL variants; parameterized, no hardcoded conditions in src/config/hosxp-queries.ts

### Database Abstraction Layer

- [x] T017 Create TableDefinition type with FieldDefinition (name, abstract type, nullable, default, unique, references) and IndexDefinition (columns, unique) in src/db/table-definition.ts
- [x] T018 Create abstract DatabaseAdapter class with methods: execute(sql, params), query<T>(sql, params), getTableNames(), getColumnInfo(table), transaction(fn), close() in src/db/adapter.ts
- [x] T019 Write test and implement SqliteAdapter: better-sqlite3 in-memory mode, type mapping (boolean→INTEGER 0/1, datetime→TEXT ISO8601, json→TEXT, string[]→TEXT JSON array), all DatabaseAdapter methods in src/db/sqlite-adapter.ts and tests/unit/db/sqlite-adapter.test.ts
- [x] T020 Write test and implement PostgresAdapter: pg.Pool connection pooling, type mapping (TIMESTAMPTZ, JSONB, BOOLEAN, TEXT[]), parameterized queries with $1/$2 placeholders in src/db/postgres-adapter.ts and tests/unit/db/postgres-adapter.test.ts
- [x] T021 Write test and implement SchemaSync engine: introspect current DB schema, diff against TableDefinitions, CREATE TABLE for missing tables, ALTER TABLE ADD COLUMN for missing columns, CREATE INDEX for missing indexes, idempotent re-runs in src/db/schema-sync.ts and tests/unit/db/schema-sync.test.ts
- [x] T022 Write test and implement QueryBuilder: SELECT/INSERT/UPDATE/DELETE builder, WHERE clauses (=, !=, IN, IS NULL, LIKE), JOINs, ORDER BY, LIMIT/OFFSET, driver-specific placeholders ($1 for PG, ? for SQLite) in src/db/query-builder.ts and tests/unit/db/query-builder.test.ts
- [x] T023 Create connection factory: NODE_ENV-based routing (test→SqliteAdapter in-memory, development/production→PostgresAdapter from DATABASE_URL) in src/db/connection.ts

### Table Definitions

- [x] T024 [P] Define hospitals table: id uuid PK, hcode varchar(5) UNIQUE NOT NULL, name varchar(255), level varchar(5), is_active boolean DEFAULT true, last_sync_at datetime NULL, connection_status varchar(10) DEFAULT 'UNKNOWN', timestamps in src/db/tables/hospitals.ts
- [x] T025 [P] Define hospital_bms_config table: id uuid PK, hospital_id uuid FK→hospitals UNIQUE, tunnel_url varchar(500) NOT NULL, session_id varchar(50) NULL, session_jwt text NULL, session_expires_at datetime NULL, database_type varchar(20) NULL, timestamps in src/db/tables/hospital-bms-config.ts
- [x] T026 [P] Define cached_patients table: id uuid PK, hospital_id FK, hn varchar(20), an varchar(20), name varchar(255) encrypted, cid varchar(13) encrypted, age integer, gravida, ga_weeks, anc_count, admit_date, height_cm, weight_kg, weight_diff_kg, fundal_height_cm, us_weight_g, hematocrit_pct, labor_status DEFAULT 'ACTIVE', delivered_at, synced_at; unique composite (hospital_id, an) in src/db/tables/cached-patients.ts
- [x] T027 [P] Define cached_vital_signs table: id uuid PK, patient_id FK, measured_at datetime, maternal_hr integer, fetal_hr varchar(50), sbp integer, dbp integer, cervix_cm decimal, effacement_pct decimal, station varchar(10), hct decimal, pph_amount_ml integer, synced_at; unique composite (patient_id, measured_at) in src/db/tables/cached-vital-signs.ts
- [x] T028 [P] Define cpd_scores table: id uuid PK, patient_id FK, score decimal, risk_level varchar(10), recommendation varchar(500), factor_gravida, factor_anc_count, factor_ga_weeks, factor_height_cm, factor_weight_diff, factor_fundal_ht, factor_us_weight, factor_hematocrit, missing_factors text[], calculated_at, created_at in src/db/tables/cpd-scores.ts
- [x] T029 [P] Define users table: id uuid PK, bms_user_name varchar(255), bms_hospital_code varchar(10), bms_position varchar(100), role varchar(20), is_active boolean DEFAULT true, last_login_at datetime NULL, timestamps in src/db/tables/users.ts
- [x] T030 [P] Define audit_logs table: id uuid PK, user_id FK→users, action varchar(50), resource_type varchar(50), resource_id varchar(50), ip_address varchar(45), user_agent varchar(500), metadata jsonb, created_at; append-only constraint in src/db/tables/audit-logs.ts

### Data Seeders

- [x] T031 Create abstract DataSeeder class with shouldRun(db): Promise<boolean>, seed(db): Promise<number>, getName(): string in src/db/seeds/seeder.ts
- [x] T032 [P] Create HospitalSeeder with all 26 KK community hospitals: 10670 รพ.ชุมแพ M1, 10671 รพ.น้ำพอง M1, 10672 รพ.บ้านไผ่ A_S, 10673 รพ.พล M2, 10674 รพ.ภูเวียง M1, etc. per data-model.md in src/db/seeds/hospital-seeder.ts
- [x] T033 [P] Create AdminSeeder: default admin user (bms_user_name='admin', role='ADMIN', is_active=true), only seeds if users table has 0 rows in src/db/seeds/admin-seeder.ts
- [x] T034 Write test and implement seed orchestrator: register seeders, run shouldRun checks, execute seed in order, log "HospitalSeeder: seeded 26 records", skip already-seeded in src/db/seeds/index.ts and tests/unit/db/seeds.test.ts

### Shared Libraries

- [x] T035 Write test and implement BmsSessionClient: constructor(tunnelUrl), getSessionId() via GET tunnel_url/api/SessionID, validateSession(sessionId) via hosxp.net/phapi/PasteJSON → JWT + bms_url, executeQuery(sql, params?) via GET/POST bms_url/api/sql with Bearer JWT, parseResponse(raw) → BmsQueryResult, refreshSession(), getDatabaseType() → 'postgresql'|'mysql', error handling (501 unauthorized, 409 SQL error, timeout) in src/lib/bms-session.ts and tests/unit/lib/bms-session.test.ts
- [x] T036 Write test and implement PDPA field encryption: AES-256-GCM encrypt(plaintext, key)/decrypt(ciphertext, key), key from ENCRYPTION_KEY env var, random IV per encryption, support for encrypting patient name and CID fields in src/lib/encryption.ts and tests/unit/lib/encryption.test.ts
- [x] T037 [P] Create general utilities: formatThaiDate(date), formatThaiTime(date), calculateAge(birthday), riskLevelToColor(level), riskLevelToThaiLabel(level), formatHospitalLevel(level), truncateName(name, maxLen) in src/lib/utils.ts
- [x] T038 [P] Create SSE event emitter: singleton SseManager class with addClient(id, res), removeClient(id), broadcast(event, data), heartbeat interval (30s keepalive `:ping`), client count tracking in src/lib/sse.ts

### Shared UI Components

- [x] T039 [P] Create CpdBadge component: rounded pill showing score number, background color from risk-levels.ts (green/yellow/red), size variants (sm/md/lg), tooltip with Thai recommendation "ควรประสานส่งต่อทันที!" for HIGH risk in src/components/shared/CpdBadge.tsx
- [x] T040 [P] Create RiskIndicator component: colored circle dot + Thai risk label (เสี่ยงต่ำ/เสี่ยงปานกลาง/เสี่ยงสูง), optional pulse animation when risk level just changed in src/components/shared/RiskIndicator.tsx
- [x] T041 [P] Create ConnectionStatus component: status dot (green=ออนไลน์, red=ออฟไลน์, gray=ไม่ทราบ) + label + last sync timestamp formatted as Thai relative time in src/components/shared/ConnectionStatus.tsx
- [x] T042 [P] Create LoadingState component: centered spinner with optional Thai message prop, skeleton variant for table loading, respects SWR isLoading/isValidating states in src/components/shared/LoadingState.tsx
- [x] T043 Initialize shadcn/ui base components: Button, Card, Table, Badge, Dialog, Input, Tooltip, Select, Tabs, Separator via shadcn CLI in src/components/ui/
- [x] T044 Create root layout with Noto Sans Thai font import, SWRConfig provider with global config (30s dedupingInterval), HTML lang="th", viewport meta for tablet responsiveness, Thai page title in src/app/layout.tsx

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Province Dashboard Monitoring (Priority: P1) 🎯 MVP

**Goal**: Real-time province-wide dashboard showing all 26 hospitals with patient counts grouped by CPD risk level, auto-updating every 30 seconds via server-side HOSxP polling + SSE.

**Independent Test**: Login → dashboard loads with hospital table → counts update within 30s → click hospital row → patient list with CPD badges

### Tests for User Story 1 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T045 [P] [US1] Write test for sync service: pollHospital connects via BmsSessionClient and executes SQL queries, transformHosxpPatient maps HosxpIptRow+HosxpPregnancyRow→CachedPatient, upsertCachedPatients inserts/updates by hospital_id+an, detectChanges returns list of changed ANs in tests/unit/services/sync.test.ts
- [x] T046 [P] [US1] Write test for dashboard service: getProvinceDashboard joins hospitals→cached_patients→latest cpd_scores and returns risk counts per hospital, getSummaryTotals aggregates across all hospitals, handles hospitals with zero patients and OFFLINE status in tests/unit/services/dashboard.test.ts

### Implementation for User Story 1

- [x] T047 [US1] Implement sync service: pollHospital(bmsClient, db, hospitalId) executes SQL templates for active labor patients + vital signs + demographics, transformHosxpPatient/VitalSign maps HOSxP rows to domain types (with encryption for name/cid), upsertCachedPatients/VitalSigns does INSERT ON CONFLICT UPDATE, detectChanges compares synced data and returns changed ANs in src/services/sync.ts
- [x] T048 [US1] Implement dashboard service: getProvinceDashboard(db) runs dashboard SQL from data-model.md (hospitals LEFT JOIN cached_patients LEFT JOIN LATERAL cpd_scores), getSummaryTotals(hospitals) sums risk counts, getHospitalPatientList(db, hospitalId, filters) with pagination in src/services/dashboard.ts
- [x] T049 [US1] Create GET /api/dashboard route: call getProvinceDashboard, format as DashboardResponse per contracts/api-routes.md, handle errors with ErrorResponse in src/app/api/dashboard/route.ts
- [x] T050 [US1] Create GET /api/hospitals/[hcode]/patients route: parse query params (status, risk_level, page, per_page), call getHospitalPatientList with filters, return PatientListResponse with pagination in src/app/api/hospitals/[hcode]/patients/route.ts
- [x] T051 [US1] Create GET /api/sse/dashboard route: create ReadableStream, register client with SseManager, send initial connection event, handle client disconnect cleanup, set headers Content-Type text/event-stream + Cache-Control no-cache in src/app/api/sse/dashboard/route.ts
- [x] T052 [P] [US1] Create useDashboard SWR hook: fetcher for /api/dashboard, refreshInterval 30000, revalidateOnFocus true, return { hospitals, summary, updatedAt, isLoading, error, mutate } in src/hooks/useDashboard.ts
- [x] T053 [P] [US1] Create useSSE hook: create EventSource to /api/sse/dashboard, listen for patient-update and connection-status events, parse JSON data, call SWR mutate to trigger re-fetch on relevant events, auto-reconnect with exponential backoff on error in src/hooks/useSSE.ts
- [x] T054 [US1] Create SummaryCards component: 4 shadcn Cards showing total active patients, high-risk count (red bg), medium-risk (yellow bg), low-risk (green bg); real-time Bangkok clock (ICU locale th-TH); responsive grid 2x2 on mobile, 4x1 on desktop in src/components/dashboard/SummaryCards.tsx
- [x] T055 [US1] Create HospitalTable component: shadcn Table with columns hospital name, level Badge, low/medium/high counts with colored cells, total patients, ConnectionStatus component, last sync time; sortable by name, risk counts, total; row onClick navigates to /hospitals/[hcode] via router.push; highlight animation when counts change via useSSE in src/components/dashboard/HospitalTable.tsx
- [x] T056 [US1] Create province dashboard page: layout with SummaryCards at top, HospitalTable below; use useDashboard + useSSE hooks; show LoadingState while fetching; show StaleBanner if all hospitals offline in src/app/(dashboard)/page.tsx
- [x] T057 [US1] Create hospital patient list page: page header with hospital name + level + ConnectionStatus; filterable table (name, AN, age, GA, CpdBadge, maternal HR, fetal HR, BP, cervix cm, admit date); dropdown filters for status and risk level; pagination; row click navigates to /patients/[an] in src/app/(dashboard)/hospitals/[hcode]/page.tsx
- [x] T058 [US1] Add polling scheduler to sync service: startPolling(db, sseEmitter) creates interval per hospital with BMS config, staggered timing (30s/numHospitals offset), calls pollHospital, updates hospital connection_status to ONLINE/OFFLINE, broadcasts SSE events on detected changes; stopPolling() clears all intervals in src/services/sync.ts
- [x] T059 [US1] Wire startup sequence: register instrumentation hook or custom server init that runs connectDb() → SchemaSync.sync() → SeedOrchestrator.run() → startPolling(db, sseManager), handle graceful shutdown with stopPolling + db.close in src/app/api/startup.ts or instrumentation.ts

**Checkpoint**: Province dashboard functional — login, view all hospitals, see risk counts, patient lists, real-time updates via SSE

---

## Phase 4: User Story 2 — CPD Risk Score Assessment (Priority: P2)

**Goal**: Automatic CPD risk calculation from 8 clinical factors, color-coded badges everywhere, high-risk alert with Thai referral recommendation.

**Independent Test**: View patient CPD score → verify calculation from 8 factors → green/yellow/red badge → >=10 shows "ควรประสานส่งต่อทันที!" → recalculates on data update

### Tests for User Story 2 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T060 [P] [US2] Write test for CPD score service: calculateCpdScore with all 8 factors returns correct score using weights from SPEC.md, partial score with 3 missing factors returns lower score + missingFactors array, classifyRiskLevel boundaries (<5=LOW, 5=MEDIUM, 9.5=MEDIUM, 10=HIGH), generateRecommendation returns Thai text for HIGH in tests/unit/services/cpd-score.test.ts
- [x] T061 [P] [US2] Write test for CpdBadge component: renders with green background and score "3" for LOW, yellow background and score "7" for MEDIUM, red background and score "12" for HIGH, shows tooltip with "ควรประสานส่งต่อทันที!" for HIGH only in tests/unit/components/CpdBadge.test.tsx

### Implementation for User Story 2

- [x] T062 [US2] Implement CPD score service: calculateCpdScore(factors: Partial<CpdFactors>) applies configurable weights from risk-levels.ts to each of 8 factors (gravida, ancCount, gaWeeks, heightCm, weightDiffKg, fundalHeightCm, usWeightG, hematocritPct), classifyRiskLevel(score) returns RiskLevel enum, handleMissingFactors(available) returns { adjustedScore, missingFactors[] }, generateRecommendation(riskLevel) returns Thai text in src/services/cpd-score.ts
- [x] T063 [US2] Integrate CPD calculation into sync service: after upsertCachedPatients, for each patient call calculateCpdScore with patient's clinical data, INSERT new cpd_scores row, compare with previous risk level, broadcast SSE patient-update with riskLevel if changed in src/services/sync.ts (update pollHospital)
- [x] T064 [US2] Create HighRiskAlert dialog component: shadcn Dialog with red border, large CpdBadge showing score, bold Thai text "ควรประสานส่งต่อทันที!", patient AN and name, dismiss button "รับทราบ"; auto-opens when patient CPD >= 10 on detail page in src/components/shared/HighRiskAlert.tsx

**Checkpoint**: CPD scoring functional — badges visible on dashboard and patient lists, high-risk alerts trigger

---

## Phase 5: User Story 3 — Digital Partogram Tracking (Priority: P3)

**Goal**: Digital partogram graph showing cervix dilation progress over time with computed alert and action reference lines.

**Independent Test**: View patient partogram → X-axis time (0-24h), Y-axis dilation (0-10cm) → three lines visible (progress cyan, alert red, action blue) → large badge shows current dilation → updates in real-time

### Tests for User Story 3 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T065 [P] [US3] Write test for partogram service: calculateAlertLine starts at 4cm dilation with 1cm/hr progression, calculateActionLine is 4 hours to the right of alert line, generatePartogramEntries maps cervix_cm + measured_at from vital signs into PartogramEntry[] with computed alert/action values in tests/unit/services/partogram.test.ts
- [x] T066 [P] [US3] Write test for PartogramChart component: renders Recharts with X-axis 0-24h, Y-axis 0-10cm, cyan dilation progress line with data points, red dashed alert line, blue dashed action line, circular badge showing latest dilation value in tests/unit/components/PartogramChart.test.tsx

### Implementation for User Story 3

- [x] T067 [US3] Implement partogram service: calculateAlertLine(activePhaseStartTime, startDilation=4) generates 1cm/hr reference points, calculateActionLine(alertLineEntries) offsets 4 hours right, generatePartogramEntries(vitalSigns[]) extracts cervix_cm + measured_at and pairs with computed alert/action values in src/services/partogram.ts
- [x] T068 [US3] Create GET /api/patients/[an]/partogram route: query cached_vital_signs WHERE patient AN AND cervix_cm IS NOT NULL ordered by measured_at, call partogram service to compute alert/action lines, return PartogramResponse per contracts/api-routes.md in src/app/api/patients/[an]/partogram/route.ts
- [x] T069 [US3] Create usePartogram SWR hook: fetcher for /api/patients/[an]/partogram, 30s refreshInterval, return { partogram: { startTime, entries[] }, isLoading, error } in src/hooks/usePartogram.ts
- [x] T070 [US3] Create PartogramChart component: Recharts ResponsiveContainer + ComposedChart, X-axis time (hours from labor start, 0-24 ticks), Y-axis cervix dilation (0-10cm), Area with cyan fill for dilation progress, Line red dashed for alert, Line blue dashed for action, large circular badge overlay showing current dilation cm + timestamp, empty state message "ยังไม่มีข้อมูล Partogram" in src/components/charts/PartogramChart.tsx

**Checkpoint**: Partogram rendering correctly with alert/action lines from cached vital sign data

---

## Phase 6: User Story 4 — Patient Detail & Vital Signs Monitoring (Priority: P4)

**Goal**: Comprehensive patient detail page with demographics, pregnancy data, vital sign gauges with trends, partogram, contraction table, and printable form.

**Independent Test**: Click patient from list → detail page loads with all clinical data → vital sign gauges show HR/FHR/BP/PPH → partogram renders → contraction table displays → Print generates pre-filled form

### Tests for User Story 4 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T071 [P] [US4] Write test for patient detail API route: returns full patient demographics + pregnancy data + latest CPD score + hospital info for valid AN, returns 404 for unknown AN, creates VIEW_PATIENT audit log entry in tests/unit/api/patient.test.ts

### Implementation for User Story 4

- [x] T072 [US4] Create GET /api/patients/[an] route: query cached_patients by AN with LEFT JOIN latest cpd_scores + hospital info, decrypt name/cid for response, create audit log VIEW_PATIENT entry, return PatientDetailResponse per contracts/api-routes.md, 404 if not found in src/app/api/patients/[an]/route.ts
- [x] T073 [US4] Create GET /api/patients/[an]/vitals route: query cached_vital_signs WHERE patient_id matches AN's patient ordered by measured_at ASC, return VitalSignsResponse with time-series array in src/app/api/patients/[an]/vitals/route.ts
- [x] T074 [US4] Create GET /api/patients/[an]/contractions route: extract contraction-related data from cached_vital_signs or separate source, return ContractionsResponse with measuredAt, intervalMin, durationSec, intensity in src/app/api/patients/[an]/contractions/route.ts
- [x] T075 [US4] Create usePatient SWR hook: composite hook fetching patient detail + vitals + partogram, 30s refresh, return { patient, cpdScore, vitals[], partogram, contractions[], isLoading, error } in src/hooks/usePatient.ts
- [x] T076 [P] [US4] Create VitalSignGauge component: Recharts RadialBarChart showing current value as gauge fill, colored by normal/warning/critical ranges (e.g., FHR: 110-160 normal, <110 or >160 warning), small sparkline trend below gauge, labels in Thai, configurable for HR/FHR/BP/PPH in src/components/charts/VitalSignGauge.tsx
- [x] T077 [P] [US4] Create BpBarChart component: Recharts BarChart with grouped SBP/DBP bars over time, horizontal ReferenceLine at 140 (hypertension) and 90 (hypotension threshold), colored bars (normal=blue, elevated=orange, high=red) in src/components/charts/BpBarChart.tsx
- [x] T078 [US4] Create PatientHeader component: layout with HN, AN, age "ปี", admit date Thai format, labor status Badge (ACTIVE=green "คลอดอยู่", DELIVERED=gray "คลอดแล้ว"), hospital name + level badge, ConnectionStatus with last sync, CpdBadge prominent on right side in src/components/patient/PatientHeader.tsx
- [x] T079 [US4] Create ClinicalData component: 2-column responsive grid showing gravida (ครรภ์ที่), GA weeks (อายุครรภ์), ANC count (ฝากครรภ์), height cm, weight diff kg, fundal height cm, U/S weight g, hematocrit %; missing values show "ไม่มีข้อมูล" in gray with dash in src/components/patient/ClinicalData.tsx
- [x] T080 [US4] Create ContractionTable component: shadcn Table with columns เวลา (time), ระยะห่าง (interval min), ระยะเวลา (duration sec), ความรุนแรง (intensity: MILD=เบา/yellow, MODERATE=ปานกลาง/orange, STRONG=รุนแรง/red Badge); sortable by time; empty state "ยังไม่มีข้อมูลการหดรัดตัว" in src/components/patient/ContractionTable.tsx
- [x] T081 [US4] Create PrintForm component: @media print optimized A4 layout, header with hospital name + patient info + date, table columns: วันเวลา, V/S, UC, FHS, Cervix, ผู้ตรวจ, SOS, Med, หมายเหตุ; pre-fill rows with available HOSxP data from vitals, footer with "พิมพ์จาก KK-LRMS เมื่อ [timestamp]" in src/components/patient/PrintForm.tsx
- [x] T082 [US4] Create patient detail page: full layout with PatientHeader at top, HighRiskAlert dialog (auto-open if CPD>=10), ClinicalData section, 2x2 grid of VitalSignGauge (HR/FHR/BP/PPH), PartogramChart, BpBarChart, ContractionTable, floating Print button → opens PrintForm in dialog; usePatient + useSSE for real-time in src/app/(dashboard)/patients/[an]/page.tsx

**Checkpoint**: Complete patient detail with all clinical data, charts, vital gauges, and printable form

---

## Phase 7: User Story 5 — Authentication & Role-Based Access (Priority: P5)

**Goal**: BMS Session-based authentication with NextAuth.js, role-based route protection, and PDPA audit logging for all patient data access.

**Independent Test**: Access page unauthenticated → redirect to login → enter BMS Session ID → validate → dashboard → admin-only routes blocked for non-admin → audit log records all access

### Tests for User Story 5 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T083 [P] [US5] Write test for BMS Session auth provider: validates session ID via hosxp.net, maps BMS position to UserRole (director→ADMIN, doctor→OBSTETRICIAN, default→NURSE), rejects expired sessions, handles hosxp.net connection errors in tests/unit/lib/auth.test.ts
- [x] T084 [P] [US5] Write test for audit service: logAccess creates audit_logs row with all required fields (user_id, action, resource_type), enforces append-only (no update/delete methods), validates required fields in tests/unit/services/audit.test.ts

### Implementation for User Story 5

- [x] T085 [US5] Configure NextAuth.js v5 with custom CredentialsProvider: authorize(credentials) takes bms_session_id, calls BmsSessionClient to validate → extract user identity, map position→UserRole, create/update users table record, return JWT with user id + name + role + hospitalCode in src/lib/auth.ts
- [x] T086 [US5] Create NextAuth catch-all route handler exporting GET and POST from NextAuth(authConfig) in src/app/api/auth/[...nextauth]/route.ts
- [x] T087 [US5] Create POST /api/auth/bms-session convenience route: receive { sessionId }, validate via BmsSessionClient, return { user: { name, role, hospitalCode }, expiresAt } for client-side pre-validation, return 401 for invalid in src/app/api/auth/bms-session/route.ts
- [x] T088 [US5] Implement audit service: logAccess(userId, action, resourceType, resourceId?, ip?, userAgent?, metadata?) inserts audit_logs record, no update/delete methods exposed, validateRequiredFields before insert in src/services/audit.ts
- [x] T089 [US5] Create login page: centered Card with Thai heading "เข้าสู่ระบบ KK-LRMS", BMS Session ID input field with placeholder, "เข้าสู่ระบบ" Button, loading state during validation, Thai error messages ("Session ID ไม่ถูกต้องหรือหมดอายุ"), auto-redirect to dashboard on success via signIn() in src/app/(auth)/login/page.tsx
- [x] T090 [US5] Create Next.js middleware: check NextAuth session token, redirect unauthenticated users to /login for all /(dashboard)/* and /admin/* paths, check role=ADMIN for /admin/* paths → redirect to / if not admin, pass-through for /api/auth/*, /_next/*, /login in src/middleware.ts
- [x] T091 [US5] Integrate audit logging into existing API routes: add logAccess(userId, 'VIEW_PATIENT', 'PATIENT', an) in GET /api/patients/[an]/route.ts, add logAccess(userId, 'VIEW_DASHBOARD', 'DASHBOARD') in GET /api/dashboard/route.ts, extract user from NextAuth session in src/app/api/patients/[an]/route.ts and src/app/api/dashboard/route.ts

**Checkpoint**: Full auth flow working — login, session management, role-based access, audit trail for PDPA

---

## Phase 8: User Story 6 — System Administration & Hospital Management (Priority: P6)

**Goal**: Admin panel to manage hospital BMS tunnel URLs, test connections, and monitor system health with per-hospital connection status.

**Independent Test**: Login as admin → admin page shows all hospitals → edit BMS tunnel URL → test connection → see DB type/version → verify connection status updates

### Tests for User Story 6 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T092 [P] [US6] Write test for admin API routes: GET /api/admin/hospitals returns hospitals with BMS config status and connection info, PUT bms-config validates tunnel URL format and tests session, POST test-connection returns DB type + version + found tables; all require ADMIN role in tests/unit/api/admin.test.ts

### Implementation for User Story 6

- [x] T093 [US6] Create GET /api/admin/hospitals route: query hospitals LEFT JOIN hospital_bms_config, return list with hcode, name, level, isActive, connectionStatus, lastSyncAt, bmsConfig { tunnelUrl, hasSession, sessionExpiresAt, databaseType }; require ADMIN role in src/app/api/admin/hospitals/route.ts
- [x] T094 [US6] Create PUT /api/admin/hospitals/[hcode]/bms-config route: receive { tunnelUrl }, validate URL format, create BmsSessionClient and connect to verify, save tunnel_url + session info + database_type to hospital_bms_config, return { status, sessionValidated, databaseType }; require ADMIN role in src/app/api/admin/hospitals/[hcode]/bms-config/route.ts
- [x] T095 [US6] Create POST /api/admin/hospitals/[hcode]/test-connection route: create BmsSessionClient with stored tunnel_url, connect + execute SELECT VERSION(), discover key tables (ipt, ipt_pregnancy, ipt_pregnancy_vital_sign, labor), return { connected, databaseType, databaseVersion, tablesFound[] }; require ADMIN role in src/app/api/admin/hospitals/[hcode]/test-connection/route.ts
- [x] T096 [US6] Create admin page: header "จัดการโรงพยาบาล", hospital management Table (HCODE, ชื่อ, ระดับ, Tunnel URL truncated, ConnectionStatus, Session Status badge, DB Type), edit Dialog (tunnel URL Input + บันทึก/ทดสอบการเชื่อมต่อ buttons), test results display (DB version, tables found), require admin auth in src/app/admin/page.tsx

**Checkpoint**: Admin panel complete — manage BMS configs, test connections, monitor hospital status

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Responsive design, error handling, E2E tests, production readiness

- [x] T097 Add responsive layout with Tailwind responsive breakpoints: tablet-first design for iPad, collapsible sidebar on mobile, touch-friendly table rows and buttons, test at 768px and 1024px breakpoints across all pages
- [x] T098 Create error boundary and custom error pages: src/app/error.tsx (Thai "เกิดข้อผิดพลาด" + retry button), src/app/not-found.tsx (Thai "ไม่พบหน้าที่ต้องการ" + go home link), global-error.tsx for uncaught errors
- [x] T099 [P] Create Playwright E2E test for dashboard flow: navigate to / → redirect to login → enter test session ID → submit → dashboard loads → verify hospital table has rows → click first hospital → patient list loads → click first patient → detail page with charts renders in tests/e2e/dashboard.spec.ts
- [x] T100 [P] Create Playwright E2E test for admin flow: login as admin → navigate to /admin → verify hospital table → click edit on hospital → enter tunnel URL → save → test connection → verify status updates in tests/e2e/admin.spec.ts
- [x] T101 Create StaleBanner component: fixed top banner when all hospital connections are OFFLINE "ระบบไม่สามารถเชื่อมต่อ HOSxP ได้ — ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน", per-hospital inline warning when individual hospital is offline in src/components/shared/StaleBanner.tsx
- [x] T102 Create Dockerfile: multi-stage build (Stage 1: Node 20 alpine + npm ci + npm run build, Stage 2: Node 20 alpine + copy standalone output + expose 3000) and update docker-compose.yml to build from Dockerfile
- [x] T103 Run quickstart.md validation: execute all 8 verification steps end-to-end (login, dashboard loads, hospital data, patient list, patient detail, real-time update, offline handling, print form, admin panel) and document results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3-8)**: All depend on Foundational completion
  - US1-US4 can proceed in priority order (P1→P2→P3→P4)
  - US5 (Auth) should ideally precede US6 (Admin) since admin requires role enforcement
  - US2 (CPD) enriches US1 (Dashboard) with risk scores — but US1 works without it (shows counts=0)
  - US3 (Partogram) and US4 (Patient Detail) can run in parallel
- **Polish (Phase 9)**: After all desired user stories complete

### User Story Dependencies

```
Phase 2 (Foundational)
  ├── US1 (Dashboard) ──→ US2 (CPD) enriches dashboard risk counts
  │                   ──→ US3 (Partogram) ─┐
  │                                         ├──→ US4 (Patient Detail) combines all
  │                   ──→ US5 (Auth) ──→ US6 (Admin)
  └── All stories independently testable after Foundational
```

- **US1 (P1)**: Start after Foundational — no story dependencies
- **US2 (P2)**: Enriches US1 but independently testable — CpdBadge already in Foundational shared
- **US3 (P3)**: Independently testable — uses cached_vital_signs from sync service
- **US4 (P4)**: Benefits from US2 (CPD badge) + US3 (partogram chart) but works with empty states
- **US5 (P5)**: Independently testable — adds auth protection to existing routes
- **US6 (P6)**: Depends on US5 (ADMIN role check) — independently testable for admin functions

### Within Each User Story

1. Tests MUST be written and FAIL before implementation code
2. Services before API routes
3. API routes before SWR hooks
4. SWR hooks before UI components
5. Components before pages
6. Commit after each task or logical group

### Parallel Opportunities

- **Phase 1**: T002-T008 all [P] — run simultaneously
- **Phase 2 Types**: T010-T013 all [P] — 4 files in parallel
- **Phase 2 Config**: T014-T016 all [P] — 3 files in parallel
- **Phase 2 Tables**: T024-T030 all [P] — 7 files in parallel
- **Phase 2 Seeders**: T032-T033 [P] — 2 files in parallel
- **Phase 2 Libs**: T037-T038 [P] — 2 files in parallel
- **Phase 2 UI**: T039-T042 all [P] — 4 components in parallel
- **Phase 3 Tests**: T045-T046 [P] — write both test files simultaneously
- **Phase 3 Hooks**: T052-T053 [P] — independent hooks
- **Phase 4 Tests**: T060-T061 [P]
- **Phase 5 Tests**: T065-T066 [P]
- **Phase 6 Charts**: T076-T077 [P] — independent chart components
- **Phase 7 Tests**: T083-T084 [P]
- **Phase 9 E2E**: T099-T100 [P] — independent test suites

---

## Parallel Example: Foundational Phase

```bash
# Launch all type definitions simultaneously (4 agents):
Agent 1: "Define BMS Session types in src/types/bms-session.ts"        # T010
Agent 2: "Define HOSxP source row types in src/types/hosxp.ts"         # T011
Agent 3: "Define domain types and enums in src/types/domain.ts"        # T012
Agent 4: "Define API response types in src/types/api.ts"               # T013

# Then launch all table definitions simultaneously (7 agents):
Agent 1: "Define hospitals table in src/db/tables/hospitals.ts"                     # T024
Agent 2: "Define hospital_bms_config table in src/db/tables/hospital-bms-config.ts" # T025
Agent 3: "Define cached_patients table in src/db/tables/cached-patients.ts"         # T026
Agent 4: "Define cached_vital_signs table in src/db/tables/cached-vital-signs.ts"   # T027
Agent 5: "Define cpd_scores table in src/db/tables/cpd-scores.ts"                   # T028
Agent 6: "Define users table in src/db/tables/users.ts"                             # T029
Agent 7: "Define audit_logs table in src/db/tables/audit-logs.ts"                   # T030
```

## Parallel Example: User Story 1

```bash
# Write both test files in parallel:
Agent 1: "Write sync service test in tests/unit/services/sync.test.ts"          # T045
Agent 2: "Write dashboard service test in tests/unit/services/dashboard.test.ts" # T046

# After services implemented, launch hooks in parallel:
Agent 1: "Create useDashboard hook in src/hooks/useDashboard.ts"    # T052
Agent 2: "Create useSSE hook in src/hooks/useSSE.ts"                # T053
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational (T010-T044) — **CRITICAL: blocks all stories**
3. Complete Phase 3: US1 Dashboard (T045-T059)
4. **STOP and VALIDATE**: Test dashboard loads, shows hospitals, updates in real-time
5. Deploy/demo as MVP — obstetricians can see province-wide overview

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Dashboard) → Test → Deploy → **MVP with province-wide visibility**
3. US2 (CPD Risk) → Test → Deploy → Dashboard shows meaningful risk scores
4. US3 (Partogram) → Test → Deploy → Labor progress monitoring added
5. US4 (Patient Detail) → Test → Deploy → Full clinical detail view
6. US5 (Auth) → Test → Deploy → Secure access, PDPA compliance
7. US6 (Admin) → Test → Deploy → Self-service hospital management
8. Polish → E2E tests → Production deploy

### Single Developer Strategy

Complete stories sequentially in priority order (P1→P6), committing after each task. Each story checkpoint validates independently before moving to next.

### Parallel Team Strategy

After Foundational phase completes together:
- **Developer A**: US1 (Dashboard) → US4 (Patient Detail)
- **Developer B**: US2 (CPD Risk) → US3 (Partogram)
- **Developer C**: US5 (Auth) → US6 (Admin)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [US#] maps task to specific user story for traceability
- Constitution mandates TDD: write failing tests before implementation
- Commit after every task (Version Control Discipline)
- All UI text in Thai with English medical terminology
- Patient name/cid MUST be encrypted (PDPA) — use encryption.ts from T036
- SQL queries MUST handle both PostgreSQL and MySQL via hosxp-queries.ts templates
- Risk colors (green/yellow/red) MUST be consistent across ALL screens — use risk-levels.ts
