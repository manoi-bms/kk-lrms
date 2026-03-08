<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)

  Added principles:
    - I.   Code Quality & Safety
    - II.  Test-Driven Development (NON-NEGOTIABLE)
    - III. Reusable Components & DRY Architecture
    - IV.  Centralized Business Logic
    - V.   Informative User Experience & Progress Reporting
    - VI.  Performance & Real-Time Reliability

  Added sections:
    - Version Control Discipline
    - Development Workflow & Skill Usage
    - Governance

  Removed sections: N/A (initial creation)

  Templates requiring updates:
    - .specify/templates/plan-template.md        ✅ compatible (Constitution Check gate exists)
    - .specify/templates/spec-template.md         ✅ compatible (user stories + acceptance criteria align)
    - .specify/templates/tasks-template.md        ✅ compatible (TDD phase + checkpoint pattern aligns)
    - .specify/templates/commands/               ✅ no command files exist

  Follow-up TODOs: None
-->

# KK-LRMS Constitution

## Core Principles

### I. Code Quality & Safety

Every line of code in KK-LRMS directly affects patient safety and
clinical decision-making. Code quality is non-negotiable.

- All code MUST pass strict linting and type checking before merge.
  TypeScript strict mode is mandatory; `any` types require written
  justification in a code comment.
- No hardcoded conditions for LLM prompts — MUST be dynamic and
  configurable.
- No hardcoded conditions for document or data lookup — MUST be
  generalizable and parameterized.
- All builds MUST succeed with zero warnings before a task is
  considered complete.
- Security vulnerabilities (OWASP Top 10) MUST be prevented at
  authoring time: validate inputs at system boundaries, sanitize
  outputs, use parameterized queries.
- PDPA compliance MUST be maintained for all patient data handling.

### II. Test-Driven Development (NON-NEGOTIABLE)

Tests are written FIRST. No implementation code is written until a
failing test exists that defines the expected behavior.

- Red-Green-Refactor cycle is strictly enforced:
  1. Write a test that fails (Red).
  2. Write the minimum code to make it pass (Green).
  3. Refactor while keeping tests green (Refactor).
- Unit tests MUST cover each task before moving to the next.
- Integration tests MUST cover critical data flows: HOSxP API
  integration, CPD score calculation, Partogram rendering, and
  webhook event processing.
- E2E tests MUST produce detailed debug logs for every step —
  network calls, console output, UI states, and error traces.
- When multiple tests fail, logs MUST be reviewed to find the true
  root cause. Never suppress errors or add exceptions to bypass
  failures.
- Test results that appear to pass falsely MUST be documented and
  investigated in the next cycle.

### III. Reusable Components & DRY Architecture

Every piece of functionality MUST be built for reuse. Duplication is
a defect.

- Always create reusable components and functions — never duplicate
  code across modules.
- Extract shared utilities (date formatting, risk color mapping,
  API response handling, Thai locale helpers) into dedicated modules.
- UI components MUST be composable: a CPD Badge, Vital Sign Widget,
  or Risk Color Indicator built once and reused across Dashboard,
  Patient Detail, and Notification views.
- When a pattern appears twice, extract it. When it appears three
  times, it MUST already be a shared abstraction.

### IV. Centralized Business Logic

Business rules live in service layers, never in UI components or
API route handlers.

- CPD Risk Score calculation MUST be in a single, tested service
  function — not duplicated across frontend and backend.
- Partogram alert/action line logic MUST be centralized in one
  module.
- Risk level classification (low/medium/high thresholds and color
  codes) MUST be defined once in a shared configuration.
- Data transformation from HOSxP format to KK-LRMS domain models
  MUST happen in dedicated mapping/adapter modules.
- Notification content generation MUST be in a service layer,
  not in webhook handlers.

### V. Informative User Experience & Progress Reporting

Every user-facing operation MUST provide clear, actionable feedback.
Clinical users depend on immediate situational awareness.

- Every operation MUST show progress indication: loading spinners
  for API calls, counts/percentages for multi-step processes,
  and status badges for connection health.
- Error messages MUST be actionable — state what went wrong AND
  what the user can do about it (e.g., "HOSxP รพ.ชุมแพ ไม่ตอบสนอง
  — แสดงข้อมูลล่าสุดเมื่อ 10:30 น., กำลังลองเชื่อมต่อใหม่").
- Color coding (green/yellow/red) MUST be consistent across all
  screens: Dashboard, Patient List, Patient Detail, and
  notifications.
- Real-time data MUST display the timestamp of the last successful
  sync from HOSxP for each hospital.
- Print views MUST clearly show data source and timestamp to prevent
  clinical decisions based on stale information.

### VI. Performance & Real-Time Reliability

KK-LRMS is a real-time clinical monitoring system. Latency directly
impacts patient safety.

- Dashboard MUST update within 30 seconds of new data from HOSxP.
- BMS Session API SQL query responses MUST complete within 2 seconds
  per request.
- Detected data changes MUST be broadcast to clients via SSE within
  5 seconds.
- The system MUST support at least 200 concurrent users per
  province.
- When HOSxP is offline, cached data MUST be displayed with a
  clear "Offline — Last sync: [timestamp]" indicator.
- Server-side polling (every 30 seconds per hospital) is the primary
  data ingestion mechanism via BMS Session API.

## Version Control Discipline

Commit early, commit often. Every meaningful change gets its own
commit to prevent loss of work and enable precise rollback.

- Commit after every completed task or logical group of changes.
- Commit messages MUST be clear and descriptive — state the "why"
  not just the "what".
- Never commit secrets (API keys, JWT tokens, .env files).
- Feature branches MUST pass all tests before merge to main.
- Code review is required before merging any branch to main.

## Development Workflow & Skill Usage

Use available development skills and workflows to build the best
possible application. Do not skip established processes.

- **Brainstorming** skill MUST be used before any creative work —
  creating features, building components, or modifying behavior.
- **TDD** skill MUST be used when implementing any feature or
  bugfix — tests before implementation code.
- **Feature-dev** skill MUST be used for guided feature development
  with codebase understanding and architecture focus.
- **Systematic debugging** skill MUST be used when encountering any
  bug, test failure, or unexpected behavior, before proposing fixes.
- **Code review** skill MUST be used after completing major features
  to validate work against requirements.
- **Verification-before-completion** skill MUST be used before
  claiming work is done — run verification commands and confirm
  output before making success claims.
- **Planning** skill MUST be used before multi-step tasks — plan
  before coding.

## Governance

This constitution is the supreme governance document for the
KK-LRMS project. It supersedes all other development practices
when conflicts arise.

### Amendment Procedure

1. Propose the amendment with rationale and impact assessment.
2. Review against existing principles for conflicts.
3. Update the constitution with a version bump following semantic
   versioning:
   - **MAJOR**: Principle removal or incompatible redefinition.
   - **MINOR**: New principle or materially expanded guidance.
   - **PATCH**: Clarification, wording, or typo fix.
4. Propagate changes to dependent templates (plan, spec, tasks).
5. Document the change in the Sync Impact Report.

### Compliance Review

- All pull requests MUST verify compliance with these principles.
- The Constitution Check gate in `plan-template.md` MUST pass
  before Phase 0 research and again after Phase 1 design.
- Any added complexity MUST be justified against the Simplicity
  principle — start simple, add complexity only when proven
  necessary.

**Version**: 1.0.1 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-09
