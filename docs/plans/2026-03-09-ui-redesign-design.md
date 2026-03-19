# KK-LRMS UI Redesign — Design Document

**Date**: 2026-03-09
**Status**: Approved
**Approach**: Page-Level Redesign with Shared Layout Shell (Approach B)

## Context & Decisions

| Question | Choice | Rationale |
|----------|--------|-----------|
| Usage context | Mixed (desktop + wall display) | Desktop-first density, readable at distance |
| Visual style | Clean medical | White/gray base, teal/blue accent, colored card borders |
| Empty hospitals | Separate sections | Active hospitals prominent, offline list below |
| Patient detail layout | Single column + sticky header | Simple, works all screen sizes, always know which patient |
| Login page | Split layout with hero | Professional first impression, system context |
| Font | Google Sarabun | Cleaner than Noto Sans Thai for dashboards |

---

## 1. Design System & Color Palette

### Primary Colors (Teal Medical Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#0d9488` (teal-600) | Buttons, active nav, links, accents |
| `primary-dark` | `#0f766e` (teal-700) | Hover states, sidebar background |
| `primary-light` | `#ccfbf1` (teal-50) | Selected row highlights, active backgrounds |

### Risk Colors

| Level | Border/Accent | Background | Text |
|-------|--------------|------------|------|
| High | `#ef4444` red-500 | `#fef2f2` red-50 | `#dc2626` red-600 |
| Medium | `#f59e0b` amber-500 | `#fffbeb` amber-50 | `#d97706` amber-600 |
| Low | `#22c55e` green-500 | `#f0fdf4` green-50 | `#16a34a` green-600 |

### Typography

- **Font**: Google Sarabun (via `next/font/google`)
- Page titles: `text-xl font-semibold`
- Section headings: `text-base font-medium text-slate-700`
- Body/data: `text-sm text-slate-600`
- Numbers/values: `font-mono font-semibold`

### Cards

- White background, `rounded-xl`, `shadow-sm`
- Risk-colored left border (4px) for patient/hospital cards
- `p-5` padding

---

## 2. Layout Shell (Sidebar + Top Bar)

### Sidebar (left, persistent)

- Width: 240px expanded, 64px collapsed (icon-only)
- Background: `teal-700`
- White text
- Navigation items:
  - แดชบอร์ด (Dashboard)
  - โรงพยาบาล (Hospitals)
  - ตั้งค่า (Settings — ADMIN only)
- Active page: white/teal-50 background with teal left border accent
- User info + logout at bottom
- Collapse toggle button
- Mobile: hidden by default, hamburger menu opens as overlay

### Top Bar (horizontal, above content)

- White background, subtle bottom border
- Breadcrumb navigation: `แดชบอร์ด > รพ.ชุมแพ > AN-2026-001`
- Real-time Bangkok clock
- User name + role badge + logout button
- Sticky at top of content area

### Content Area

- Background: `#f8fafc` (slate-50)
- Max-width: `1400px` centered with `px-6 py-5`
- All content renders inside cards

---

## 3. Main Dashboard (Province Overview)

### Summary Cards (top row, 4 cards)

- White cards, `rounded-xl`, `shadow-sm`
- Colored top border (4px) matching risk level / teal for total
- Large number: `text-3xl font-bold font-mono`
- Contextual subtitle: (ต้องเฝ้าระวัง / ติดตามต่อเนื่อง / ปกติ)

### Active Hospitals Section

- Section heading: "โรงพยาบาลที่มีผู้คลอด (N แห่ง)"
- Each hospital = clickable card:
  - Hospital name + level badge + total patient count
  - Risk breakdown as colored pills inline
  - Connection status + last sync timestamp
  - Left border color: highest risk level present
- Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`

### Offline/Empty Hospitals Section

- Collapsible section (default: expanded)
- Section heading: "โรงพยาบาลอื่นๆ (N แห่ง)" with toggle
- Compact 2-3 column grid, muted text (`text-slate-400`)
- Hospital name + level + status dot only

---

## 4. Hospital Patient List

### Hospital Summary Card (top)

- Hospital name, level badge, connection status, last sync
- Risk breakdown summary

### Patient Cards (sorted by risk, high first)

- Each patient = full clickable card
- Left border colored by risk level (4px)
- Name + CPD badge prominently at top
- Demographics in compact line: AN, HN, age, gravida
- GA + ANC count
- **Latest vitals preview inline**: Maternal HR, Fetal HR, BP, cervix dilation
- Admit date with relative time ("8 ชม. ที่แล้ว") + status badge
- Responsive: single column, 2 columns on wide screens

---

## 5. Patient Detail Page

### Sticky Patient Header

- Appears after scrolling past main header
- Compact single bar: Name, CPD badge, status, hospital
- Always visible while scrolling

### Section Cards (top to bottom)

1. **ข้อมูลทั่วไปและคลินิก** — 4-column grid (age, gravida, GA, ANC, height, weight diff, fundal height, US weight, hematocrit)

2. **สัญญาณชีพล่าสุด** — 4 gauge cards:
   - Radial gauge with color coding
   - Value + unit
   - Sparkline trend (last 8 readings)
   - Thai status text: ปกติ / เฝ้าระวัง / ผิดปกติ

3. **Partogram** — current dilation prominently displayed, chart in card wrapper

4. **ความดันโลหิต (BP)** — existing bar chart restyled in card

5. **การหดรัดตัวของมดลูก (UC)** — table in card

6. **Print button** — teal outline button at bottom

### High-Risk Alert Dialog

- Keep existing design (red border, auto-open for CPD >= 10)

---

## 6. Login Page (Split Layout)

### Left Panel (Hero)

- Background: teal-700 to teal-900 gradient
- White text
- System name (Thai + English subtitle)
- 3 feature bullet points with icons
- Version number at bottom
- Subtle pattern/mesh background texture

### Right Panel (Form)

- White background
- Vertically centered form
- "เข้าสู่ระบบ KK-LRMS" heading
- Session ID input with teal focus ring
- Teal primary button (full width)
- Helper text: describes BMS authentication
- Error state: red border + red text

### Responsive

- Mobile: left panel collapses, small teal header bar + form only

---

## Files to Create/Modify

### New Files
- `src/components/layout/Sidebar.tsx` — sidebar navigation
- `src/components/layout/TopBar.tsx` — top bar with breadcrumb, clock, user
- `src/components/layout/DashboardLayout.tsx` — shell combining sidebar + topbar + content
- `src/components/dashboard/ActiveHospitalCard.tsx` — active hospital card
- `src/components/dashboard/InactiveHospitalList.tsx` — compact offline list
- `src/components/patient/PatientCard.tsx` — patient card for hospital list
- `src/components/patient/StickyPatientHeader.tsx` — sticky scroll header
- `src/components/patient/HospitalSummaryCard.tsx` — hospital info card on patient list

### Modified Files
- `src/app/layout.tsx` — swap Noto Sans Thai → Sarabun
- `src/app/globals.css` — update theme tokens (teal palette, slate-50 bg)
- `src/app/(dashboard)/layout.tsx` — wrap with DashboardLayout
- `src/app/(dashboard)/page.tsx` — use new summary cards + hospital sections
- `src/app/(dashboard)/hospitals/[hcode]/page.tsx` — use patient cards
- `src/app/(dashboard)/patients/[an]/page.tsx` — card-wrapped sections + sticky header
- `src/app/(auth)/login/page.tsx` — split layout redesign
- `src/components/dashboard/SummaryCards.tsx` — restyle with top borders
- `src/components/dashboard/HospitalTable.tsx` — replace with card grid (or keep as fallback)
- `src/components/patient/ClinicalData.tsx` — 4-column grid in card
- `src/components/patient/PatientHeader.tsx` — redesign + extract sticky version
- `src/components/charts/VitalSignGauge.tsx` — add Thai status text
- `src/components/shared/CpdBadge.tsx` — minor style updates for new palette
- `src/components/shared/ConnectionStatus.tsx` — minor style updates
