# Feature Specification: KK-LRMS — Labor Room Monitoring System

**Feature Branch**: `001-kk-lrms-app`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "create next.js + postgresql system that has spec in SPEC.md"

## Assumptions

- The system is a **Next.js web application with PostgreSQL** as the application database for caching, session management, and configuration storage.
- Patient data originates from HOSxP HIS systems at community hospitals and is accessed via per-hospital BMS Session API tunnel URLs with SQL query access. KK-LRMS does not own patient data — it caches and presents it.
- Each hospital exposes a BMS tunnel URL (e.g., `https://XXXXX.tunnel.hosxp.net`). KK-LRMS obtains a session ID, validates it via hosxp.net to get a JWT Bearer token, then executes SQL queries against HOSxP databases via `/api/sql`.
- The system serves Khon Kaen province (Health Region 7) covering ~26 community hospitals of various levels (A/S, M1, M2, F1, F2, F3).
- Primary language is Thai with English medical terminology.
- Target devices are desktop monitors and tablets (iPad) used in labor rooms.
- All patient data handling MUST comply with Thailand's PDPA (Personal Data Protection Act).
- CPD Risk Score calculation formula and factor weights are defined in the existing clinical protocol (referenced in SPEC.md section 4.1.3).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Province Dashboard Monitoring (Priority: P1)

As an obstetrician at Khon Kaen Hospital, I need to see a real-time overview of all labor patients across every community hospital in the province, grouped by CPD risk level, so I can quickly identify which hospitals have high-risk cases requiring my attention.

**Why this priority**: This is the core value proposition — centralized visibility across all community hospitals. Without the dashboard, the system has no purpose. Every other feature builds on top of this view.

**Independent Test**: Can be fully tested by logging in, viewing the dashboard with sample patient data from multiple hospitals, and verifying that patient counts update within 30 seconds of data changes. Delivers immediate situational awareness to obstetricians.

**Acceptance Scenarios**:

1. **Given** the obstetrician is logged in, **When** the dashboard loads, **Then** a summary table shows all community hospitals with patient counts grouped by CPD risk level (low/green, medium/yellow, high/red) and a total column.
2. **Given** the dashboard is open, **When** a new labor patient is admitted at any community hospital, **Then** the dashboard updates within 30 seconds to reflect the new patient count.
3. **Given** the dashboard is open, **When** a community hospital's HOSxP system is offline, **Then** that hospital shows an "Offline" indicator with the timestamp of the last successful data sync, and the most recent cached data is still displayed.
4. **Given** the dashboard is open, **When** the obstetrician views the overview section, **Then** the system displays a real-time clock, total active patients by risk level, date range of data, and connection status for each hospital.
5. **Given** the dashboard table is displayed, **When** the obstetrician clicks on a hospital row, **Then** the system navigates to that hospital's patient list.

---

### User Story 2 - CPD Risk Score Assessment (Priority: P2)

As an obstetrician, I need the system to automatically calculate and display CPD (Cephalopelvic Disproportion) risk scores for each labor patient based on their clinical data, color-coded by severity, so I can prioritize which patients need immediate referral to the central hospital.

**Why this priority**: CPD risk scoring is the primary clinical decision-support feature. It transforms raw data into actionable risk classification, directly impacting patient safety. The dashboard (P1) shows counts, but this story gives meaning to the numbers.

**Independent Test**: Can be tested by viewing a patient's CPD score, verifying it calculates correctly from 8 clinical factors, and confirming appropriate color-coding and referral recommendation appears for high-risk scores (>= 10).

**Acceptance Scenarios**:

1. **Given** a patient has complete clinical data (gravida, ANC count, gestational age, height, weight gain, fundal height, ultrasound weight, hematocrit), **When** the system receives this data, **Then** it automatically calculates the CPD risk score.
2. **Given** a patient's CPD score is below 5, **When** displayed anywhere in the system, **Then** it shows a green badge with the score number.
3. **Given** a patient's CPD score is between 5 and 9.5, **When** displayed anywhere in the system, **Then** it shows a yellow badge with the score number.
4. **Given** a patient's CPD score is 10 or above, **When** displayed anywhere in the system, **Then** it shows a red badge with the score number AND displays the recommendation: "ควรประสานส่งต่อทันที!" (Recommend immediate referral coordination).
5. **Given** an obstetrician opens a high-risk patient's detail page, **When** the page loads, **Then** a prominent alert popup warns about the high CPD risk with the referral recommendation.
6. **Given** a patient's vital signs are updated in HOSxP, **When** the system receives the update via webhook, **Then** the CPD score is automatically recalculated and the badge updates accordingly.

---

### User Story 3 - Digital Partogram Tracking (Priority: P3)

As a labor room nurse at the central hospital, I need to view a digital partogram graph showing cervix dilation progress over time with alert and action reference lines, so I can monitor labor progression and identify cases that are falling behind expected rates.

**Why this priority**: The partogram is the standard clinical tool for monitoring labor progress. It requires the data pipeline from P1 and complements the risk scoring from P2 by providing continuous visual monitoring.

**Independent Test**: Can be tested by viewing a patient's partogram, verifying cervix dilation data points are plotted over time alongside alert and action lines, and confirming the graph updates when new data arrives.

**Acceptance Scenarios**:

1. **Given** a patient has cervix dilation measurements recorded over time, **When** the user opens the partogram view, **Then** the system displays a graph with time (0-24 hours) on the X-axis and cervix dilation (0-10 cm) on the Y-axis.
2. **Given** the partogram is displayed, **When** viewing the graph, **Then** three lines are visible: cervix dilation progress (cyan/green with shaded area), alert line (red), and action line (blue).
3. **Given** the partogram is open, **When** new cervix measurement data arrives from HOSxP, **Then** the graph updates in real-time without requiring a page refresh.
4. **Given** the partogram is displayed, **When** the user views the latest measurement, **Then** a large circular badge shows the current cervix dilation value in centimeters with the date/time of the measurement.

---

### User Story 4 - Patient Detail & Vital Signs Monitoring (Priority: P4)

As an obstetrician, I need to view comprehensive clinical details for each labor patient including demographics, maternal health data, vital sign trends, and uterine contraction monitoring — all pulled automatically from HOSxP — so I can make informed clinical decisions without requiring community hospital staff to re-enter data.

**Why this priority**: Detailed patient view is essential for clinical decision-making but depends on the dashboard (P1) and risk scoring (P2) for navigation and context. This story provides the depth of information needed when a patient requires closer attention.

**Independent Test**: Can be tested by navigating to a patient's detail page, verifying all data fields are populated from HOSxP data, and confirming vital sign trend graphs render correctly.

**Acceptance Scenarios**:

1. **Given** the obstetrician selects a patient from the hospital list, **When** the detail page loads, **Then** it displays: patient demographics (HN, AN, age, admit date, status), pregnancy data (gravida, ANC visits, GA, height, weight diff, fundal height, U/S weight, hematocrit), and the source hospital name with last update timestamp.
2. **Given** the patient detail page is displayed, **When** viewing clinical indicators, **Then** four vital sign widgets show as circular gauges with trend graphs: maternal heart rate (HR), fetal heart rate (FHR), blood pressure (SBP/DBP), and postpartum hemorrhage (PPH).
3. **Given** the patient detail page is displayed, **When** viewing the uterine contraction section, **Then** a table displays contraction records with columns: time, interval (minutes), duration (seconds), and intensity (mild/moderate/strong).
4. **Given** the patient detail page is displayed, **When** clicking the "Print" button, **Then** the system generates a printable symptom change recording form with columns: date/time, V/S, UC, FHS, Cervix, examiner name, SOS, Med, notes — pre-filled with available HOSxP data.
5. **Given** the patient has a CPD score >= 10, **When** the detail page is viewed, **Then** a prominent referral recommendation panel is displayed with the CPD badge and action suggestion.

---

### User Story 5 - Authentication & Role-Based Access (Priority: P5)

As an IT administrator, I need the system to authenticate users via the BMS Session API (JWT) and enforce role-based access control, so that only authorized personnel can access patient data and administrative functions comply with PDPA requirements.

**Why this priority**: Security is critical for a healthcare system handling personal health data, but the authentication framework is infrastructure that enables all other stories. It must be built early as a foundation, though it isn't independently demonstrable as clinical value.

**Independent Test**: Can be tested by logging in with valid/invalid credentials, verifying session management works (expiry, logout), and confirming different roles see appropriate menu items and data.

**Acceptance Scenarios**:

1. **Given** a user is not authenticated, **When** they access any page, **Then** they are redirected to the login page.
2. **Given** valid credentials are provided, **When** the user submits the login form, **Then** the system authenticates via BMS Session API, creates a session with JWT token, and redirects to the dashboard.
3. **Given** invalid credentials are provided, **When** the user submits the login form, **Then** the system displays a clear error message in Thai without revealing which credential was wrong.
4. **Given** a user is authenticated, **When** their session token expires, **Then** they are prompted to re-authenticate with a message explaining the session has expired.
5. **Given** a user with "obstetrician" role is logged in, **When** they navigate the system, **Then** they can view all patient data and dashboards but cannot access admin settings.
6. **Given** a user with "admin" role is logged in, **When** they navigate to admin settings, **Then** they can manage API keys for each hospital, configure webhook URLs, and manage hospital directory.
7. **Given** any user accesses patient data, **When** the data is retrieved, **Then** the access event is recorded in an audit log with user identity, timestamp, and data accessed.

---

### User Story 6 - System Administration & Hospital Management (Priority: P6)

As an IT administrator, I need to manage hospital BMS tunnel connections and monitor system health, so that the data pipeline from community hospitals remains operational and issues can be diagnosed quickly.

**Why this priority**: Administrative functions are essential for operations but serve a small user group (IT admins) and are not part of the primary clinical workflow.

**Independent Test**: Can be tested by accessing the admin panel, configuring BMS tunnel URLs, testing connections, and verifying connection status indicators work correctly.

**Acceptance Scenarios**:

1. **Given** an admin is on the settings page, **When** they view the hospital list, **Then** each hospital shows its HCODE (5-digit code), name, level (A/M1/M2/F1/F2/F3), BMS tunnel status, database type, and current connection status.
2. **Given** an admin is managing a hospital, **When** they save a BMS tunnel URL, **Then** the system validates the URL by attempting to connect, retrieves the database type, and displays the connection result.
3. **Given** the connection status page is open, **When** a hospital's HOSxP goes offline, **Then** the status indicator changes to "Offline" with the last successful sync timestamp within 60 seconds.
4. **Given** a hospital's HOSxP has been offline, **When** it comes back online, **Then** the system automatically resumes data synchronization and updates the status to "Online."

---

### Edge Cases

- What happens when a patient is transferred between community hospitals during active labor? The system MUST use CID (national ID) to identify the same patient across hospitals, link records from both hospitals, and maintain continuity of the partogram and vital sign history.
- What happens when HOSxP sends incomplete data (e.g., missing ultrasound weight for CPD calculation)? The system MUST calculate a partial CPD score from available factors and clearly indicate which factors are missing.
- What happens when multiple obstetricians view the same patient simultaneously? The system MUST support concurrent read access without data conflicts.
- What happens when all hospital BMS tunnel connections are unreachable? The system MUST display cached data with a clear system-wide banner indicating data may be stale.
- What happens when a patient's CPD risk level changes from medium to high while an obstetrician is viewing the dashboard? The system MUST update the dashboard in real-time and display a visual indicator (animation or highlight) on the changed row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST pull patient data from each hospital's HOSxP database via BMS Session API (per-hospital tunnel URL + SQL queries with JWT authentication), caching results locally in PostgreSQL.
- **FR-002**: System MUST calculate CPD Risk Score automatically from 8 factors: gravida, ANC count, gestational age, maternal height, weight gain, fundal height, ultrasound weight, and hematocrit.
- **FR-003**: System MUST classify CPD risk into three levels: low (< 5, green), medium (5-9.5, yellow), high (>= 10, red) with consistent color coding across all views.
- **FR-004**: System MUST display a province-wide dashboard showing all community hospitals with patient counts grouped by risk level.
- **FR-005**: System MUST render digital partogram graphs with cervix dilation, alert line, and action line plotted over time.
- **FR-006**: System MUST display vital sign trend graphs for HR, FHR, BP (SBP/DBP), and PPH with circular gauge badges showing latest values.
- **FR-007**: System MUST display uterine contraction monitoring table with time, interval, duration, and intensity columns.
- **FR-008**: System MUST poll each hospital's HOSxP database via BMS Session API every 30 seconds, detect new admissions, vital sign updates, and delivery events, and update the local cache accordingly.
- **FR-009**: System MUST broadcast detected changes to connected dashboard clients via Server-Sent Events (SSE) within 5 seconds of detection.
- **FR-010**: System MUST authenticate users via BMS Session API with JWT tokens and enforce role-based access control (obstetrician, nurse, admin).
- **FR-011**: System MUST maintain an audit log of all patient data access events.
- **FR-012**: System MUST support printing a symptom change recording form (date/time, V/S, UC, FHS, Cervix, examiner, SOS, Med, notes) pre-filled with HOSxP data.
- **FR-013**: System MUST display HOSxP connection status per hospital (Online/Offline/Last Sync).
- **FR-014**: System MUST display cached data when a hospital's HOSxP is offline, with a clear "Offline" indicator and last sync timestamp.
- **FR-015**: System MUST allow administrators to manage BMS tunnel URL configurations per hospital (save, validate, test connection) and monitor connection health status.
- **FR-016**: System MUST update the dashboard within 30 seconds when patient data changes.
- **FR-017**: System MUST display a prominent alert with referral recommendation when a patient's CPD score reaches >= 10.
- **FR-018**: System MUST support pagination and filtering (by hospital, status, risk level, date range) on patient lists.
- **FR-019**: System MUST display the source hospital name and data timestamp on every patient data view to prevent decisions based on stale information.
- **FR-020**: System MUST display content primarily in Thai with English for medical terminology.
- **FR-021**: System MUST support responsive layout for both desktop monitors and tablets (iPad).
- **FR-022**: System MUST use HTTPS/TLS 1.2+ for all communications.

### Key Entities

- **Hospital**: Community hospital in Khon Kaen province. Identified by HCODE (5-digit code). Has a name, level classification (A/S, M1, M2, F1, F2, F3), API connection configuration, and connection status.
- **Patient**: A pregnant woman admitted for labor. Uniquely identified across hospitals by CID (13-digit national ID). HN (Hospital Number) is unique only within a single hospital; AN (Admission Number) identifies a specific admission. Has demographics (name, age, CID) and pregnancy data (gravida, GA, ANC count). When a patient transfers between hospitals, CID is used to link records and maintain continuity.
- **Labor Record**: The active labor episode for a patient. Contains admission date, labor status (active/delivered), and links to all clinical measurements.
- **CPD Risk Score**: Calculated risk assessment from 8 clinical factors. Has a numeric score, risk level classification, contributing factors breakdown, and calculation timestamp.
- **Vital Signs**: Time-series measurements including maternal HR, fetal HR, blood pressure (SBP/DBP), and PPH amount. Each entry has a measurement timestamp.
- **Cervix Measurement**: Time-series cervix dilation measurements used for partogram plotting. Each entry has dilation value (0-10 cm) and measurement timestamp.
- **Uterine Contraction**: Time-series contraction records with interval (minutes), duration (seconds), and intensity (mild/moderate/strong).
- **User**: System user with authentication credentials. Has a role (obstetrician, nurse, admin) that determines access permissions.
- **Audit Log Entry**: Record of patient data access. Contains user identity, action performed, data accessed, and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Obstetricians can identify all high-risk labor patients across the province within 10 seconds of opening the dashboard.
- **SC-002**: Dashboard data reflects changes from community hospitals within 30 seconds of the change occurring in HOSxP.
- **SC-003**: System supports at least 200 concurrent users without performance degradation.
- **SC-004**: CPD risk scores are calculated and displayed within 2 seconds of receiving complete patient data.
- **SC-005**: Partogram and vital sign graphs update in real-time without requiring manual page refresh.
- **SC-006**: When a hospital's HOSxP is offline, users can still view the last known data with a clear staleness indicator — no blank screens or error pages.
- **SC-007**: 95% of obstetricians can navigate from dashboard to a specific patient's detail page in under 3 clicks.
- **SC-008**: Printed symptom recording forms contain all available pre-filled data, reducing manual data entry for nurses.
- **SC-009**: All patient data access events are logged for PDPA compliance audit, with 100% coverage.
- **SC-010**: System achieves 99.5% uptime measured monthly.
