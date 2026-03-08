# Implementation Plan: KK-LRMS — Labor Room Monitoring System

**Branch**: `001-kk-lrms-app` | **Date**: 2026-03-08 | **Spec**: `specs/001-kk-lrms-app/spec.md`
**Input**: Feature specification from `/specs/001-kk-lrms-app/spec.md`

## Summary

Build a real-time labor room monitoring dashboard for Khon Kaen province
obstetricians to monitor ~26 community hospitals. The system pulls patient data
from HOSxP HIS systems via **BMS Session API** (per-hospital tunnel URLs with
SQL query access), caches it locally in PostgreSQL, and presents it through a
Next.js web dashboard with real-time updates via SWR polling + SSE.

Key technical decisions from research:
- **Data access**: BMS Session API with SQL queries (no centralized REST API)
- **Auth**: BMS Session-based identity wrapped in NextAuth.js
- **DB**: Custom abstraction layer (SQLite for tests, PostgreSQL for production)
- **Real-time**: Server-side SQL polling (30s) → SSE broadcast → SWR client
- **Charts**: Recharts for partogram and vital sign graphs
- **UI**: Tailwind CSS 4 + shadcn/ui with Thai language support

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ LTS
**Primary Dependencies**: Next.js 15 (App Router), React 19, NextAuth.js v5,
  Recharts, SWR, Tailwind CSS 4, shadcn/ui, pg (PostgreSQL driver),
  better-sqlite3 (test driver)
**Storage**: PostgreSQL 16+ (production cache), SQLite in-memory (unit tests),
  HOSxP databases (PostgreSQL or MySQL via BMS Session API)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Linux server (Docker), desktop browsers + iPad Safari
**Project Type**: Web application (full-stack Next.js)
**Performance Goals**: Dashboard update <30s, 200 concurrent users, <2s API
  response, <5s webhook processing
**Constraints**: PDPA compliance for patient data, Thai language primary,
  BMS Session API rate limits, offline resilience for HOSxP downtime
**Scale/Scope**: ~26 hospitals, ~200 concurrent users, 6 main screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality & Safety — PASS

- TypeScript strict mode enabled in tsconfig.json
- ESLint + Prettier configured
- PDPA: patient name and CID encrypted at rest
- SQL injection prevented: parameterized queries via BMS API
- No hardcoded conditions: risk thresholds, hospital data, and SQL templates
  all configurable

### II. Test-Driven Development — PASS

- Vitest for unit tests with SQLite in-memory (fast, isolated)
- Integration tests for BMS Session Client, CPD score calculation, data sync
- E2E tests with Playwright for critical user flows
- TDD red-green-refactor cycle enforced per constitution

### III. Reusable Components & DRY — PASS

- Shared UI components: CpdBadge, RiskIndicator, ConnectionStatus, VitalGauge
- Reusable chart wrappers: PartogramChart, VitalSignChart, BpBarChart
- Shared utilities: date formatting, risk color mapping, Thai locale helpers
- Database abstraction: single adapter interface for SQLite/PostgreSQL

### IV. Centralized Business Logic — PASS

- CPD score calculation in `src/services/cpd-score.ts` (single source)
- Partogram alert/action line logic in `src/services/partogram.ts`
- Risk level config in `src/config/risk-levels.ts` (thresholds + colors)
- HOSxP → KK-LRMS data mapping in `src/services/sync.ts`
- BMS Session client in `src/lib/bms-session.ts`

### V. Informative UX — PASS

- Loading states with SWR `isLoading`/`isValidating`
- Connection status badges per hospital (ONLINE/OFFLINE/UNKNOWN)
- Last sync timestamps on all data views
- Actionable error messages in Thai
- Print views show data source and timestamp

### VI. Performance — PASS

- Server-side polling (30s) with SSE for instant broadcast
- SWR client-side caching with 30s revalidation
- PostgreSQL connection pooling via pg.Pool
- Offline resilience: cached data with staleness indicator

### Post-Design Re-Check — PASS

All principles verified against final design artifacts:
- data-model.md: Two-layer architecture (HOSxP source + local cache)
- contracts/api-routes.md: All routes authenticated, Thai error messages
- research.md: 10 research decisions with rationale
- quickstart.md: Docker Compose setup, verification steps

## Project Structure

### Documentation (this feature)

```text
specs/001-kk-lrms-app/
├── plan.md              # This file
├── research.md          # Phase 0: BMS Session API, HOSxP schema, etc.
├── data-model.md        # Phase 1: Two-layer data model
├── quickstart.md        # Phase 1: Setup and verification steps
├── contracts/
│   └── api-routes.md    # Phase 1: API route contracts
└── tasks.md             # Phase 2: Task breakdown (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/                       # Next.js 15 App Router
│   ├── (auth)/                # Auth pages (login)
│   │   └── login/page.tsx
│   ├── (dashboard)/           # Protected dashboard pages
│   │   ├── page.tsx           # Province dashboard (US1)
│   │   ├── hospitals/
│   │   │   └── [hcode]/
│   │   │       └── page.tsx   # Hospital patient list
│   │   └── patients/
│   │       └── [an]/
│   │           └── page.tsx   # Patient detail (US4)
│   ├── admin/                 # Admin pages (US6)
│   │   └── page.tsx
│   ├── api/                   # API routes
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   ├── dashboard/route.ts           # Dashboard data
│   │   ├── hospitals/[hcode]/
│   │   │   └── patients/route.ts        # Hospital patient list
│   │   ├── patients/[an]/
│   │   │   ├── route.ts                 # Patient detail
│   │   │   ├── vitals/route.ts          # Vital signs
│   │   │   ├── partogram/route.ts       # Partogram data
│   │   │   └── contractions/route.ts    # Contraction data
│   │   ├── sse/dashboard/route.ts       # SSE stream
│   │   └── admin/                       # Admin endpoints
│   │       └── hospitals/route.ts
│   └── layout.tsx             # Root layout (Thai font, providers)
├── components/                # Reusable UI components
│   ├── ui/                    # shadcn/ui base components
│   ├── dashboard/             # Dashboard-specific
│   │   ├── HospitalTable.tsx
│   │   └── SummaryCards.tsx
│   ├── patient/               # Patient detail
│   │   ├── PatientHeader.tsx
│   │   ├── ClinicalData.tsx
│   │   ├── ContractionTable.tsx
│   │   └── PrintForm.tsx
│   ├── charts/                # Recharts wrappers
│   │   ├── PartogramChart.tsx
│   │   ├── VitalSignGauge.tsx
│   │   └── BpBarChart.tsx
│   └── shared/                # Cross-cutting
│       ├── CpdBadge.tsx
│       ├── RiskIndicator.tsx
│       ├── ConnectionStatus.tsx
│       └── LoadingState.tsx
├── db/                        # Database abstraction layer
│   ├── adapter.ts             # Abstract DatabaseAdapter
│   ├── sqlite-adapter.ts      # SQLite (unit tests)
│   ├── postgres-adapter.ts    # PostgreSQL (production)
│   ├── schema-sync.ts         # Auto table/field sync
│   ├── table-definition.ts    # TableDefinition type
│   ├── query-builder.ts       # Type-safe query builder
│   ├── connection.ts          # Connection factory
│   ├── tables/                # Table definitions
│   │   ├── hospitals.ts
│   │   ├── hospital-bms-config.ts
│   │   ├── cached-patients.ts
│   │   ├── cached-vital-signs.ts
│   │   ├── cpd-scores.ts
│   │   ├── users.ts
│   │   └── audit-logs.ts
│   └── seeds/                 # Lookup data seeders
│       ├── seeder.ts          # Abstract DataSeeder
│       ├── hospital-seeder.ts
│       ├── admin-seeder.ts
│       └── index.ts           # Seed orchestrator
├── services/                  # Business logic (centralized)
│   ├── cpd-score.ts           # CPD risk calculation
│   ├── partogram.ts           # Partogram alert/action lines
│   ├── sync.ts                # Data sync from BMS Session
│   ├── dashboard.ts           # Dashboard aggregation
│   └── audit.ts               # Audit logging
├── lib/                       # Shared utilities
│   ├── auth.ts                # NextAuth.js config (BMS Session provider)
│   ├── bms-session.ts         # BMS Session API client
│   ├── encryption.ts          # PDPA field encryption
│   ├── sse.ts                 # SSE event emitter
│   └── utils.ts               # General utilities
├── hooks/                     # Custom React hooks
│   ├── useDashboard.ts        # SWR hook for dashboard data
│   ├── usePatient.ts          # SWR hook for patient detail
│   ├── useSSE.ts              # SSE connection hook
│   └── usePartogram.ts        # SWR hook for partogram
├── types/                     # TypeScript type definitions
│   ├── hosxp.ts               # HOSxP source types
│   ├── domain.ts              # KK-LRMS domain types
│   ├── api.ts                 # API response types
│   └── bms-session.ts         # BMS Session types
└── config/                    # Configuration
    ├── risk-levels.ts         # CPD thresholds & colors
    ├── hospitals.ts           # Hospital level definitions
    └── hosxp-queries.ts       # SQL query templates (PG + MySQL)

tests/
├── unit/
│   ├── services/
│   │   ├── cpd-score.test.ts
│   │   ├── partogram.test.ts
│   │   └── sync.test.ts
│   ├── db/
│   │   ├── schema-sync.test.ts
│   │   └── query-builder.test.ts
│   ├── lib/
│   │   ├── bms-session.test.ts
│   │   └── encryption.test.ts
│   └── components/
│       ├── CpdBadge.test.tsx
│       └── PartogramChart.test.tsx
└── e2e/
    ├── dashboard.spec.ts
    └── admin.spec.ts

docker-compose.yml             # PostgreSQL + app
.env.example                   # Environment template
tailwind.config.ts             # Tailwind CSS 4 config
next.config.ts                 # Next.js config
tsconfig.json                  # TypeScript strict config
vitest.config.ts               # Vitest config
package.json
```

**Structure Decision**: Single Next.js project with App Router. Backend (API
routes, services, DB layer) and frontend (pages, components) colocated in `src/`.
This avoids monorepo complexity for a focused application serving one province.

## Complexity Tracking

> No constitution violations found. Design stays within complexity bounds.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Custom DB abstraction | No ORM | Constitution requires SQLite↔PostgreSQL switching for TDD; ORMs don't support this cleanly |
| BMS Session Client | Custom class | No existing library for BMS Session protocol; thin wrapper around fetch |
| SQL query templates | Dual PG/MySQL | HOSxP databases may be either type; centralized in config |
