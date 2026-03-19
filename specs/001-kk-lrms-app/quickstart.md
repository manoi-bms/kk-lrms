# Quickstart: KK-LRMS

**Branch**: `001-kk-lrms-app` | **Date**: 2026-03-08

## Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 16+
- Docker & Docker Compose (for local PostgreSQL)
- Git

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd kk-lrms
git checkout 001-kk-lrms-app
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d db
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database (local cache)
DATABASE_URL="postgresql://kklrms:kklrms@localhost:5432/kklrms?schema=public"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

# BMS Session API (for authentication validation)
BMS_VALIDATE_URL="https://hosxp.net/phapi/PasteJSON"

# Encryption key for PDPA compliance (patient name/CID)
ENCRYPTION_KEY="<generate-with-openssl-rand-hex-32>"
```

### 4. Configure hospital BMS connections

Hospital BMS tunnel URLs are configured via the admin panel after first login.
For development, the test hospital (HCODE 99999) can be configured:

```env
# Development only: auto-configure test hospital on startup
DEV_HOSPITAL_TUNNEL_URL="https://99999-ondemand-win-3ru63gfld9e.tunnel.hosxp.net"
```

### 5. Initialize database

Database tables are created automatically on server start via SchemaSync.
Lookup data (26 hospitals, default admin) is seeded automatically.

No manual migration or seed commands needed — just start the server.

### 6. Run development server

```bash
npm run dev
```

Open http://localhost:3000

### 7. Run tests

```bash
npm test              # Unit tests (Vitest + SQLite in-memory)
npm run test:e2e      # E2E tests (Playwright, requires running dev server)
```

## BMS Session Development

### Getting a test session

```bash
# 1. Get a session ID from the test hospital
curl https://99999-ondemand-win-3ru63gfld9e.tunnel.hosxp.net/api/SessionID

# 2. Validate and get JWT (use the session_id from step 1)
curl "https://hosxp.net/phapi/PasteJSON?session_id=<SESSION_ID>"

# 3. Execute SQL against the test hospital
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<BMS_URL>/api/sql?q=SELECT VERSION()"
```

### HOSxP Database Access via MCP

For development, MCP tools can directly connect to HOSxP databases:
- `mcp__postgres__query` for PostgreSQL HOSxP databases
- `mcp__mysql__mysql_query` for MySQL HOSxP databases

Same table structure applies — SQL syntax may differ between database types.

## Project Structure

```
kk-lrms/
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   │   ├── page.tsx       # Province dashboard
│   │   │   ├── hospitals/
│   │   │   │   └── [hcode]/
│   │   │   │       └── page.tsx  # Hospital patient list
│   │   │   └── patients/
│   │   │       └── [an]/
│   │   │           └── page.tsx  # Patient detail
│   │   ├── admin/             # Admin pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth + BMS Session
│   │   │   ├── dashboard/     # Dashboard data
│   │   │   ├── hospitals/     # Hospital data
│   │   │   ├── patients/      # Patient data
│   │   │   ├── sse/           # SSE stream
│   │   │   └── admin/         # Admin endpoints
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── dashboard/         # Dashboard-specific
│   │   ├── patient/           # Patient detail
│   │   ├── charts/            # Recharts wrappers
│   │   └── shared/            # Cross-cutting (CpdBadge, etc.)
│   ├── db/                    # Database abstraction layer
│   │   ├── adapter.ts         # Abstract DatabaseAdapter
│   │   ├── sqlite-adapter.ts  # SQLite (unit tests)
│   │   ├── postgres-adapter.ts # PostgreSQL (production)
│   │   ├── schema-sync.ts     # Auto table/field sync
│   │   ├── tables/            # Table definitions
│   │   └── seeds/             # Lookup data seeders
│   ├── services/              # Business logic (centralized)
│   │   ├── cpd-score.ts       # CPD risk calculation
│   │   ├── partogram.ts       # Partogram logic
│   │   ├── sync.ts            # Data sync from BMS Session
│   │   ├── dashboard.ts       # Dashboard aggregation
│   │   └── audit.ts           # Audit logging
│   ├── lib/                   # Shared utilities
│   │   ├── auth.ts            # NextAuth config
│   │   ├── bms-session.ts     # BMS Session API client
│   │   ├── encryption.ts      # PDPA field encryption
│   │   ├── sse.ts             # SSE event emitter
│   │   └── utils.ts           # General utilities
│   ├── hooks/                 # Custom React hooks (SWR)
│   ├── types/                 # TypeScript type definitions
│   └── config/                # Configuration
│       ├── risk-levels.ts     # CPD thresholds & colors
│       ├── hospitals.ts       # Hospital level definitions
│       └── hosxp-queries.ts   # SQL templates (PG + MySQL)
├── tests/
│   ├── unit/                  # Vitest + SQLite in-memory
│   ├── integration/           # Integration tests
│   └── e2e/                   # Playwright E2E
├── docker-compose.yml         # PostgreSQL for dev/production
├── .env.example
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

## Key Verification Steps

1. **Dashboard loads**: Login with BMS Session ID → See province dashboard
2. **Hospital data**: Dashboard shows 26 hospitals with connection status
3. **Patient list**: Click hospital → See patient list with CPD badges
4. **Patient detail**: Click patient → See demographics, vitals, partogram
5. **Real-time update**: Wait 30s → Dashboard updates from HOSxP polling
6. **Offline handling**: Hospital goes offline → Shows "Offline" indicator
7. **Print form**: Patient detail → Click Print → Pre-filled form
8. **Admin panel**: Login as admin → Manage hospital BMS tunnel URLs

## Docker Compose (full stack)

```bash
docker compose up --build
```

This starts:
- PostgreSQL on port 5432
- KK-LRMS app on port 3000
