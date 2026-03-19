# Research: KK-LRMS App

**Branch**: `001-kk-lrms-app` | **Date**: 2026-03-08

## R1: Data Access Architecture — BMS Session API

**Decision**: Use BMS Session API with per-hospital tunnel URLs to execute read-only SQL queries directly against each hospital's HOSxP database. Data is cached in KK-LRMS PostgreSQL for fast dashboard rendering.

**Rationale**:
- The BMS Session API is the standard mechanism for accessing HOSxP data. Each hospital runs a BMS API server accessible via a tunnel URL (e.g., `https://XXXXX-ondemand-win-XXXXXXX.tunnel.hosxp.net`).
- Authentication uses a `bms-session-id` (GUID format) to retrieve a JWT Bearer token and API endpoint URL from `hosxp.net/phapi/PasteJSON`.
- Data is accessed via `/api/sql` endpoint with SQL SELECT queries, providing full flexibility to query any non-blacklisted table.
- Server-side polling: KK-LRMS server connects to each configured hospital and executes SQL queries every 30 seconds.
- Results are cached in local PostgreSQL for fast dashboard response times.
- BMS Session supports PostgreSQL and MySQL/MariaDB databases — SQL queries must handle database-type differences.

**Architecture**:
```
KK-LRMS Server
├── For each configured hospital:
│   ├── Get session ID from {tunnel_url}/api/SessionID
│   ├── Validate via hosxp.net/phapi/PasteJSON → JWT + bms_url
│   ├── Execute SQL queries via {bms_url}/api/sql (Bearer JWT)
│   ├── Parse BMS API response (data[], field[], field_name[], record_count)
│   └── Cache results in local PostgreSQL
├── Dashboard clients poll KK-LRMS API (SWR 30s)
└── SSE broadcasts when new data arrives from any hospital
```

**Verified live**: Test hospital HCODE 99999 tunnel URL confirmed working. Session ID retrieval, validation, and SQL query execution all functional. Database is PostgreSQL 16.4.

**Alternatives considered**:
- **Centralized BMS REST API**: SPEC.md assumed REST endpoints like `/api/v1/labor/patients`. These don't exist — BMS Session provides raw SQL access instead.
- **Direct database connection**: BMS API handles authentication, security, and tunneling. Direct DB connections would bypass security controls.

## R2: HOSxP Table Schema for Labor Data

**Decision**: Map SPEC.md data requirements to actual HOSxP tables discovered via live database introspection.

**Rationale**: SPEC.md referenced tables like `labor_vital`, `labor_cervix`, `labor_detail` which don't exist in the actual HOSxP database. The real tables are:

| SPEC.md Reference | Actual HOSxP Table | Key Columns |
|---|---|---|
| `patient` | `patient` | hn, pname, fname, lname, cid, birthday, sex |
| `ipt` (admission) | `ipt` | an, hn, regdate, regtime, dchdate, ward, admdoctor |
| `labor` | `labor` | laborid, an, mother_gvalue (gravida), mother_hct, mother_aging, labour_startdate/time, placenta_bloodloss |
| `labor_vital` (NOT FOUND) | `ipt_pregnancy_vital_sign` | an, hr, bps, bpd, fetal_heart_sound, cervical_open_size, hct, height, bw, eff, station |
| `labor_cervix` (NOT FOUND) | `ipt_pregnancy_vital_sign` | cervical_open_size (dilation), eff (effacement), station |
| `labor_detail` (NOT FOUND) | `labor` | placenta_bloodloss (PPH), membrane_* (amniotic fluid) |
| `anc` | `person_anc` | person_id, blood_hct_result, ga, lmp, edc, preg_no, service_count |
| `person_anc` | `person_anc` | Same as above |
| `opdscreen` | `opdscreen` | hn, height, weight |
| N/A | `ipt_pregnancy` | an, preg_number, ga, labor_date, anc_complete, child_count |

**Key finding**: `ipt_pregnancy_vital_sign` contains cervix dilation (`cervical_open_size`), vitals (hr, bps, bpd), FHR (`fetal_heart_sound`), and hematocrit in a single table — combining what SPEC.md split across `labor_vital`, `labor_cervix`, and `labor_detail`.

**Note**: The `patient` table was not found in the test database (HCODE 99999) but exists in real HOSxP installations. SQL queries should handle missing tables gracefully.

## R3: Real-Time Dashboard Updates

**Decision**: Server-side SQL polling (30-second intervals) replaces webhook-based push. Client-side SWR polling with SSE for instant broadcast.

**Rationale**:
- BMS Session API is read-only — there is no webhook push mechanism from BMS Session.
- KK-LRMS server polls each hospital's HOSxP database every 30 seconds using SQL queries via BMS Session API.
- When new/changed data is detected, it's cached locally and broadcast to dashboard clients via SSE.
- SWR provides automatic revalidation, request deduplication, and focus-on-window refetch on the client side.
- Hybrid approach: SWR polls KK-LRMS API (not HOSxP directly), SSE pushes instant updates when server detects changes.

**Data flow**:
```
HOSxP DB ←──(SQL/30s)── KK-LRMS Server ──(SSE)──→ Dashboard Clients
                              │                          ↑
                              └── PostgreSQL Cache ──(SWR/30s)──┘
```

**Alternatives considered**:
- **Client-side direct SQL**: Each browser client executing SQL against HOSxP via BMS Session. Rejected — session management complexity, security concerns, and 26 hospitals × 200 users = excessive connections.
- **Webhooks from HOSxP**: SPEC.md mentions webhooks. If HOSxP supports them separately from BMS Session, they can be added later as an optimization. Current design works without them.

## R4: Authentication Strategy

**Decision**: BMS Session-based authentication. Users provide their `bms-session-id` (obtained from their HOSxP workstation) to authenticate with KK-LRMS. NextAuth.js wraps the BMS Session validation.

**Rationale**:
- BMS Session provides user identity: name, position, hospital_code, department, is_hr_admin, is_director.
- Users already have BMS sessions from their HOSxP workstations — no separate credentials needed.
- Session flow: User gets `bms-session-id` from workstation → passes to KK-LRMS → KK-LRMS validates via hosxp.net → creates local session with user info and role mapping.
- Role mapping: BMS `position` + `is_director` → KK-LRMS role (OBSTETRICIAN/NURSE/ADMIN).
- JWT strategy with NextAuth.js for stateless session management after initial BMS validation.
- Session expiry from BMS (`expired_second`: default 2592000 seconds / 30 days) synced with KK-LRMS session.

**Alternatives considered**:
- **Separate username/password auth**: Would require maintaining a separate user database. BMS Session already provides identity.
- **Direct BMS JWT passthrough**: BMS session code is the JWT. But wrapping in NextAuth provides unified session management, CSRF protection, and token rotation.

## R5: Database Abstraction Layer (Schema Sync)

**Decision**: Custom database abstraction layer with abstract `DatabaseAdapter` class supporting both SQLite and PostgreSQL. Schema definitions as TypeScript objects. Auto table/field sync on startup.

**Rationale**:
- SQLite for unit tests: In-memory mode via `better-sqlite3` for fast, isolated test execution.
- PostgreSQL for production: Full ACID, connection pooling via `pg.Pool`.
- Auto-sync on startup: Schema sync engine reads TypeScript table definitions, compares against actual DB, creates missing tables/columns. No migration scripts.
- Type-safe queries via thin query builder generating driver-specific SQL.

**Alternatives considered**:
- Prisma ORM, TypeORM, Drizzle ORM — all require migration scripts and don't support runtime SQLite↔PostgreSQL switching easily.

## R6: BMS Session SQL Client

**Decision**: Create a reusable `BmsSessionClient` class that handles session management, SQL query execution, response parsing, and error handling for each hospital connection.

**Rationale**:
- Each hospital requires: tunnel URL, session ID management, JWT token caching, SQL query execution.
- BMS API response format is specific: `{ data: [], field: [], field_name: [], record_count, MessageCode }`.
- The client handles database-type detection (PostgreSQL vs MySQL) and adjusts SQL syntax accordingly.
- Session refresh: Periodically re-validate session ID to prevent expiry.
- Error handling: 501 (unauthorized), 409 (SQL error), connection timeouts.
- Parameter binding for SQL injection prevention.

**Architecture**:
```
BmsSessionClient
├── constructor(tunnelUrl: string)
├── connect(): Promise<SessionConfig>     — Get session ID, validate, extract config
├── executeQuery(sql: string, params?): Promise<BmsQueryResult>
├── refreshSession(): Promise<void>
├── getDatabaseType(): 'postgresql' | 'mysql'
├── isConnected(): boolean
└── disconnect(): void
```

## R7: Charting Library

**Decision**: Recharts for all clinical graphs (Partogram, Vital Signs trends, BP charts).

**Rationale**: Same as before — built on React and D3, composable API, responsive containers, real-time updates by simply updating data props.

## R8: Lookup Data Seeding

**Decision**: Abstract `DataSeeder` class with HospitalSeeder (26 KK hospitals) and DefaultAdminSeeder. Runs automatically after schema sync on startup. Each seeder is idempotent.

## R9: UI Framework

**Decision**: Tailwind CSS 4 + shadcn/ui. Thai font via `@fontsource/noto-sans-thai`.

## R10: SQL Query Templates for HOSxP

**Decision**: Define SQL query templates as configurable TypeScript constants. Templates adapt to database type (PostgreSQL vs MySQL) and use parameter binding.

**Rationale**:
- HOSxP databases may be PostgreSQL or MySQL/MariaDB — SQL syntax differs (e.g., `RANDOM()` vs `RAND()`, string quoting, date functions).
- SQL templates centralized in `src/config/hosxp-queries.ts` — not scattered across services.
- Parameter binding via BMS API's `params` object prevents SQL injection.
- Templates are configurable per constitution principle (no hardcoded conditions).

**Example templates**:
```typescript
// Active labor patients
const ACTIVE_LABOR_PATIENTS = {
  postgresql: `
    SELECT i.an, i.hn, i.regdate, i.regtime, i.ward,
           ip.preg_number, ip.ga, ip.labor_date
    FROM ipt i
    JOIN ipt_pregnancy ip ON i.an = ip.an
    WHERE i.dchdate IS NULL
    ORDER BY i.regdate DESC`,
  mysql: `
    SELECT i.an, i.hn, i.regdate, i.regtime, i.ward,
           ip.preg_number, ip.ga, ip.labor_date
    FROM ipt i
    JOIN ipt_pregnancy ip ON i.an = ip.an
    WHERE i.dchdate IS NULL
    ORDER BY i.regdate DESC`
};

// Pregnancy vital signs (partogram + vitals)
const PREGNANCY_VITAL_SIGNS = {
  postgresql: `
    SELECT pvs.an, pvs.hr, pvs.bps, pvs.bpd,
           pvs.fetal_heart_sound, pvs.cervical_open_size,
           pvs.eff, pvs.station, pvs.hct, pvs.height, pvs.bw
    FROM ipt_pregnancy_vital_sign pvs
    WHERE pvs.an = :an`,
  mysql: `...same with MySQL syntax adjustments...`
};
```
