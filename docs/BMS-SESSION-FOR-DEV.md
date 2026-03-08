# BMS Session Specification for Developers v2.0

> **IMPORTANT NOTICE**: This is a developer-focused specification for building applications that use the BMS Session system for **read-only access to non-sensitive data**. This document intentionally excludes authentication key algorithms for sensitive data access and write operations.
>
> **Design Philosophy**: With good application design, it is NOT necessary to access or store sensitive data to display useful information and statistical dashboards. Applications should be designed to work with aggregated, anonymized, or non-personally-identifiable data whenever possible.

## Overview

The BMS (Bangkok Medical Software) Session system provides secure authentication and database access for HOSxP hospital management systems. This specification documents how the system uses `bms-session-id` to establish user sessions, authenticate API requests, and execute **read-only** SQL queries against hospital databases.

**Dynamic BMS Session Integration:**
- Destination systems should accept `bms-session-id` via URL parameters
- Example: `https://example.com/?bms-session-id=CB411DB0-B121-43C6-B795-80ADECE6A13C`
- System uses session ID to retrieve correct endpoint URL from HOSxP API
- Session ID is dynamic and can change per user/session

**Scope of This Document:**
- Read-only operations via `/api/sql` endpoint
- Session management and validation
- Building dashboards and statistical displays
- Accessing non-sensitive aggregate data

## Architecture Flow

### 1. Session ID Acquisition

The system supports three methods to obtain a BMS session ID:

1. **URL Parameter**: `?bms-session-id=SESSION_ID`
2. **Cookie Storage**: Automatically stored for 7 days after successful authentication
3. **Manual Input**: User enters session ID through the UI

### 1.1 Server-Side Session Management

The BMS API server runs locally on the HOSxP workstation.

The bms-session-id is dynamic. Destination systems designed to use bms-session-id should allow passing bms-session-id in URL parameter (e.g., `https://example.com/?bms-session-id=xxxx-xxxx-xxxxx-xxxx`) and use it to retrieve the correct endpoint URL before fetching API data.

**Session Code Lifecycle**:
1. Server starts → generates new JWT (GUID format)
2. JWT stored internally
3. JWT used as Bearer token for API authentication
4. JWT remains valid until server restarts

### 2. Session Retrieval Flow

```
User → URL/Cookie/Input → SessionValidator → retrieveBmsSession() → HOSxP API
                                                     ↓
                                        https://hosxp.net/phapi/PasteJSON
                                                     ↓
                                           Session Data Response
```

Sample JSON response from `https://hosxp.net/phapi/PasteJSON?Action=GET&code=xxxx-xxxx-xxxxx-xxxx`:

```json
{
   "result":{
      "system_info":{
         "version":"1.0.0.0",
         "environment":"production"
      },
      "user_info":{
         "name":"Ondemand User",
         "position":"User",
         "position_id":1,
         "hospital_code":"00000",
         "doctor_code":"00000",
         "department":"server",
         "location":"server",
         "is_hr_admin":false,
         "is_director":false,
         "bms_url":"https://00000-ondemand-win-3ru63gfld9e.tunnel.hosxp.net",
         "bms_session_port":53845,
         "bms_session_code":"xxxx-xxxx-xxxxx-xxxx",
         "bms_database_name":"bmshosxp",
         "bms_database_type":"PostgreSQL"
      },
      "key_value":"xxxx-xxxx-xxxxx-xxxx",
      "expired_second":2592000
   },
   "MessageCode":200,
   "Message":"OK",
   "RequestTime":"2025-11-09T09:09:58.756Z",
   "EndpointIP":"10.0.0.15",
   "EndpointPort":17028,
   "processing_time_ms":0
}
```

## API Endpoints

### `/api/sql` - Query Endpoint (Read Operations)

**Purpose**: Execute SQL queries to retrieve data from the database

**Supported Methods**: GET, POST

**Supported SQL Statements**:
- `SELECT` - Retrieve data from tables
- `DESCRIBE` / `DESC` - Show table structure
- `EXPLAIN` - Show query execution plan
- `SHOW` - Show database metadata (SHOW TABLES, SHOW DATABASES, etc.)
- `WITH` - Common Table Expressions (CTE) - *Requires MariaDB 10.2+ or MySQL 8.0+*

**Request Parameters**:
- `sql` (required): SQL query statement
- `app` (required): Application identifier
- `params` (optional): Parameter binding for SQL injection prevention

**Parameter Binding for SQL Injection Prevention**:
- Use named parameters (`:param_name`) in SQL queries
- Provide parameter values and types in separate `params` object
- Supported parameter types: `string`, `integer`, `float`, `date`, `time`, `datetime`
- Parameters are safely bound to prevent SQL injection attacks
- Example: `SELECT * FROM patient WHERE hn = :hn` with `params: { hn: { value: "12345", value_type: "string" } }`

**Request Examples**:

```javascript
// POST Request (JSON Body) - Simple query
POST /api/sql
{
  "sql": "SELECT COUNT(*) as total FROM patient WHERE birthday >= '2024-01-01'",
  "app": "BMS.Dashboard.React"
}

// POST Request (JSON Body) with parameter binding
POST /api/sql
{
  "sql": "SELECT COUNT(*) as total, sex FROM patient WHERE birthday = :birthday GROUP BY sex",
  "app": "BMS.Dashboard.React",
  "params": {
    "birthday": {"value": "2024-01-01", "value_type": "date"}
  }
}

// GET Request
GET /api/sql?sql=SELECT%20VERSION()%20as%20version&app=BMS.Dashboard.React

// DESCRIBE Statement
POST /api/sql
{
  "sql": "DESCRIBE patient",
  "app": "BMS.Dashboard.React"
}

// SHOW Statement
POST /api/sql
{
  "sql": "SHOW TABLES",
  "app": "BMS.Dashboard.React"
}

// EXPLAIN Statement
POST /api/sql
{
  "sql": "EXPLAIN SELECT * FROM ovst WHERE vstdate = '2024-01-01'",
  "app": "BMS.Dashboard.React"
}
```

**Response Format**:
```json
{
  "result": {},
  "MessageCode": 200,
  "Message": "OK",
  "RequestTime": "2025-10-20T12:00:00.000Z",
  "data": [
    {
      "column1": "value1",
      "column2": "value2"
    }
  ],
  "field": [6, 6],
  "field_name": ["column1", "column2"],
  "record_count": 2
}
```

**Response Fields**:
- `result` - Additional result metadata (usually empty object)
- `MessageCode` - HTTP-style status code (200 = success, 400/500 = error)
- `Message` - Status message ("OK" for success, error description for failures)
- `RequestTime` - ISO 8601 timestamp of request processing
- `data` - Array of result rows (each row is an object with column name/value pairs)
- `field` - Array of field type codes (see Field Type Codes section)
- `field_name` - Array of column names in the result set
- `record_count` - Number of records returned

**Error Response Format**:
```json
{
  "result": {},
  "MessageCode": 409,
  "Message": "Database error: #42000You have an error in your SQL syntax...",
  "RequestTime": "2025-10-20T12:00:00.000Z"
}
```

**HTTP Status Codes**:
- `200` - Request processed (check MessageCode for actual query status)
- `501` - Not Implemented / Unauthorized (missing or invalid Bearer token)

**MessageCode Reference**:
- `200` - Success: Query executed successfully
- `400` - Bad Request: Invalid SQL or parameters
- `409` - Conflict: SQL syntax error or unsupported SQL feature
- `500` - Server Error: Database error or internal server error

**Security Features**:
- SQL sanitization (removes trailing semicolons, converts backslashes)
- Support for LIMIT clause normalization ("; LIMIT" → " LIMIT")
- Bearer token authentication required
- **Table access restrictions**:
  - Blacklisted tables: opduser, opdconfig, sys_var, user_var, user_jwt
  - Maximum 20 tables per query
  - No cross-database queries (dots not allowed in table names)
- **SQL statement whitelist**: Only SELECT, DESCRIBE, EXPLAIN, SHOW, WITH allowed

---

## Field Type Codes

```
1 = Boolean
2 = Integer
3 = Float
4 = DateTime (stored as String in ISO 8601 YYYY-MM-DDTHH:mm:ss, local Time Zone)
5 = Time (stored as String HH:mm:ss)
6 = String
7 = Blob/Binary Data (Base64 encoded)
9 = String
```

---

## Core Components

### Service Layer (`src/services/bmsSession.ts`)

#### Key Functions:

1. **`retrieveBmsSession(sessionId: string)`**
   - Calls HOSxP PasteJSON API with session ID
   - Returns session data including user info and connection config
   - Handles authentication and error states

2. **`executeSqlViaApi(sql, config)`**
   - Executes SQL SELECT queries against hospital database
   - Uses connection config from session data
   - Supports Bearer token authentication
   - Endpoint: `/api/sql`

3. **`extractConnectionConfig(sessionData)`**
   - Extracts API URL from `user_info.bms_url`
   - Extracts authentication key from `user_info.bms_session_code` (or `key_value`)
   - Extracts session expiry from `expired_second`
   - Returns connection configuration object

#### Data Types:

```typescript
interface BmsSessionResponse {
  MessageCode: number;        // 200 = success, 500 = expired
  Message?: string;
  result?: {
    system_info?: {
      version?: string;         // Application version
      environment?: string;     // 'production' or 'development'
    };
    user_info?: {
      name?: string;                    // Full username
      position?: string;                // Position name
      position_id?: string;             // Position standard ID
      hospital_code?: string;           // Hospital code
      doctor_code?: string;             // Doctor code
      department?: string;              // Department name
      location?: string;                // Hospital name
      is_hr_admin?: boolean;            // HR admin flag
      is_director?: boolean;            // Director flag
      bms_url?: string;                 // Public API URL
      bms_session_port?: number;        // Tunnel port number
      bms_session_code?: string;        // JWT authentication token
      bms_database_name?: string;       // Database name
      bms_database_type?: string;       // Database type (e.g., 'mysql')
    };
    key_value?: string;         // JWT token (same as bms_session_code)
    expired_second?: number;    // Session expiry time in seconds (default: 36000 = 10 hours)
  };
}
```

### React Hooks (`src/hooks/useBmsSession.ts`)

#### `useBmsSession()` Hook
Primary React hook for session management:

- **State Management**: Tracks session ID, data, connection config, user info
- **Connection Methods**:
  - `connectSession(sessionId)` - Establishes new session
  - `disconnectSession()` - Clears current session
  - `refreshSession()` - Refreshes existing session
- **Query Execution**:
  - `executeQuery(sql)` - Runs SELECT queries via authenticated API

#### `useQuery()` Hook
Manages SQL SELECT query lifecycle:

- Tracks query data, loading state, errors
- Supports auto-execution on mount
- Provides `execute()` and `reset()` methods

### Session Storage (`src/utils/sessionStorage.ts`)

#### Cookie Management:
- **Storage**: 7-day expiry, secure flag for HTTPS
- **Functions**:
  - `setSessionCookie(sessionId)` - Stores session
  - `getSessionCookie()` - Retrieves stored session
  - `removeSessionCookie()` - Clears session

#### URL Handling:
- `getSessionFromUrl()` - Extracts from URL parameter
- `removeSessionFromUrl()` - Cleans URL after extraction
- `handleUrlSession()` - Combined flow: extract → store → clean

### Context Provider (`src/contexts/BmsSessionContext.tsx`)

Provides global session state via React Context:
- Wraps app with `BmsSessionProvider`
- Access via `useBmsSessionContext()` hook
- Shares session state across all components

## Complete Data Flow

### 1. Session Initialization

```
1. User visits: https://app.example.com/?bms-session-id=ABC123
2. SessionValidator component mounts
3. handleUrlSession() is called:
   - Extracts "ABC123" from URL
   - Stores in cookie (7-day expiry)
   - Removes parameter from URL (clean URL)
4. connectSession("ABC123") is triggered
```

### 2. Session Validation

```
1. retrieveBmsSession("ABC123") called
2. GET request to: https://hosxp.net/phapi/PasteJSON?Action=GET&code=ABC123
3. Response parsed:
   - MessageCode 200: Success → Extract config
   - MessageCode 500: Session expired
   - Other: Error handling
4. extractConnectionConfig() processes response:
   - API URL: result.user_info.bms_url
   - Auth Key: result.user_info.bms_session_code (or result.key_value)
   - Expiry: result.expired_second (default: 36000 seconds / 10 hours)
   - User Info: result.user_info (name, position, hospital, etc.)
   - System Info: result.system_info (version, environment)
```

### 3. API Configuration Extraction

The system extracts configuration from the session response:

```javascript
// API URL extraction:
const apiUrl = result.user_info.bms_url;  // Public API URL (e.g., http://tunnel-url)

// Authentication Key extraction (JWT token):
const apiAuthKey = result.user_info.bms_session_code;  // JWT token
// Alternative: result.key_value (same JWT token)

// Session expiry:
const expirySeconds = result.expired_second;  // Default: 36000 (10 hours)

// Additional connection info:
const databaseName = result.user_info.bms_database_name;  // Database name
const databaseType = result.user_info.bms_database_type;  // Database type
```

### 4. SQL Query Execution (Read)

```
1. Component calls: session.executeQuery(sql)
2. executeSqlViaApi() builds request:
   - URL: {apiUrl}/api/sql?sql={encodedSQL}&app=BMS.Dashboard.React
   - Headers: Authorization: Bearer {apiAuthKey}
3. SQL is minified before transport (comments removed, whitespace compressed)
4. Response handled:
   - 200: Parse JSON data array
   - 401: Unauthorized (invalid key)
   - 502: Bad Gateway (tunnel issue)
   - Other: Error handling
```

## User Roles and Permissions

The session data includes user role information that can be used for authorization:

### Available Role Flags

```typescript
interface UserRoles {
  is_hr_admin: boolean;    // Human Resources administrator
  is_director: boolean;    // Hospital director/management
}
```

### Role-Based Access Control Example

```jsx
function DashboardPanel() {
  const session = useBmsSessionContext();

  // Check user role for dashboard visibility
  const canViewDirectorStats = session.userInfo?.is_director;
  const canViewHRStats = session.userInfo?.is_hr_admin;

  return (
    <div>
      <h1>Hospital Dashboard</h1>
      <GeneralStats />
      {canViewDirectorStats && <DirectorStats />}
      {canViewHRStats && <HRStats />}
    </div>
  );
}
```

### User Identity Information

```typescript
interface UserIdentity {
  name: string;              // Full name
  position: string;          // Job position
  position_id: string;       // Position standard ID
  doctor_code?: string;      // Doctor code (if applicable)
  department: string;        // Department name
  location: string;          // Hospital name
  hospital_code: string;     // Hospital identification code
}
```

## Database Connection Information

The session includes database connection details:

```typescript
interface DatabaseInfo {
  bms_url: string;              // API endpoint URL (tunnel URL)
  bms_session_code: string;     // JWT authentication token
  bms_database_name: string;    // Database name
  bms_database_type: string;    // Database type (e.g., 'mysql', 'PostgreSQL')
}
```

### Using Database Information

```jsx
function DatabaseStatus() {
  const session = useBmsSessionContext();

  return (
    <div>
      <h3>Database Connection</h3>
      <p>Database: {session.userInfo?.bms_database_name}</p>
      <p>Type: {session.userInfo?.bms_database_type}</p>
      <p>API URL: {session.userInfo?.bms_url}</p>
    </div>
  );
}
```

## Database Type Awareness and Compatibility

The BMS Session API supports multiple database types commonly used in HOSxP deployments, including MySQL, MariaDB, and PostgreSQL.

### Database Type Detection

```javascript
// Automatic detection query
const versionQuery = await client.executeQuery('SELECT VERSION() as version');
const version = versionQuery.data.data[0].version.toLowerCase();

// Detection logic
if (version.includes('mysql') || version.includes('mariadb')) {
    return 'mysql'; // MySQL or MariaDB
} else if (version.includes('postgresql') || version.includes('postgres')) {
    return 'postgresql'; // PostgreSQL
} else {
    return 'unknown'; // Other databases
}
```

**Database Types Supported:**
- **MySQL** 5.7+ / 8.0+
- **MariaDB** 10.2+ / 10.3+ / 10.4+ / 10.5+ / 10.6+
- **PostgreSQL** 9.6+ / 10+ / 11+ / 12+ / 13+ / 14+
- **Other**: Fallback to standard SQL with MySQL syntax

### PostgreSQL String Quoting Requirements

**Critical**: PostgreSQL requires single quotes (`'`) for string literals. Double quotes (`"`) are used for identifiers (table/column names).

```sql
-- ✅ Correct PostgreSQL syntax
SELECT * FROM patient WHERE hn = '12345'
SELECT * FROM patient WHERE status = 'active'
SELECT * FROM patient WHERE pname LIKE '%Smith%'

-- ❌ Incorrect (will cause syntax errors)
SELECT * FROM patient WHERE hn = "12345"
SELECT * FROM patient WHERE status = "active"
```

**Best Practice**: Use single quotes for all string literals to ensure compatibility across MySQL, MariaDB, and PostgreSQL.

### Database-Specific SQL Queries

#### Table Structure Queries

**MySQL/MariaDB:**
```sql
DESCRIBE patient
-- Returns: Field, Type, Null, Key, Default, Extra
```

**PostgreSQL:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'patient'
ORDER BY ordinal_position
-- Returns: column_name, data_type, is_nullable, column_default
```

#### Table Listing Queries

**MySQL/MariaDB:**
```sql
SHOW TABLES
-- Returns: Tables_in_database_name (e.g., "Tables_in_hos")
```

**PostgreSQL:**
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
-- Returns: tablename
```

#### Random Sampling Queries

**MySQL/MariaDB:**
```sql
SELECT * FROM patient ORDER BY RAND() LIMIT 5
```

**PostgreSQL:**
```sql
SELECT * FROM patient ORDER BY RANDOM() LIMIT 5
```

### Field Type Code Mapping

| Field Type | MySQL/MariaDB | PostgreSQL | Field Code |
|------------|---------------|------------|------------|
| Boolean | TINYINT(1) | BOOLEAN | 1 |
| Integer | INT, BIGINT | INTEGER, BIGINT | 2 |
| Float | FLOAT, DOUBLE | REAL, DOUBLE PRECISION | 3 |
| DateTime | DATETIME, TIMESTAMP | TIMESTAMP, DATE | 4 |
| Time | TIME | TIME | 5 |
| String | VARCHAR, TEXT | VARCHAR, TEXT | 6 |
| Blob | BLOB, LONGBLOB | BYTEA | 7 |
| Text | TEXT | TEXT | 9 |

### Database Version Compatibility

#### Minimum Supported Versions
- **MySQL**: 5.7+ (recommended: 8.0+)
- **MariaDB**: 10.2+ (recommended: 10.5+)
- **PostgreSQL**: 9.6+ (recommended: 12+)

#### Feature Support by Version
| Feature | MySQL 5.7 | MySQL 8.0 | MariaDB 10.2 | MariaDB 10.5+ | PostgreSQL 9.6 | PostgreSQL 12+ |
|---------|-----------|-----------|--------------|---------------|----------------|----------------|
| Common Table Expressions (CTE) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Window Functions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| JSON Functions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Regular Expressions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Component Integration

### SessionValidator Component
Entry point for session management:

```jsx
<BmsSessionProvider>
  <SessionValidator onSessionReady={handleReady}>
    {/* Protected content */}
  </SessionValidator>
</BmsSessionProvider>
```

- Shows login UI if no session
- Validates existing sessions
- Manages session lifecycle

### Using Session in Components (Read Operations)

```jsx
function MyComponent() {
  const session = useBmsSessionContext();

  // Check connection status
  if (!session.isConnected) {
    return <div>Not connected</div>;
  }

  // Access user information from session
  const userInfo = session.userInfo;
  console.log("User:", userInfo.name);
  console.log("Position:", userInfo.position);
  console.log("Hospital:", userInfo.location);
  console.log("Department:", userInfo.department);
  console.log("Is Director:", userInfo.is_director);
  console.log("Is HR Admin:", userInfo.is_hr_admin);

  // Access system information
  const systemInfo = session.systemInfo;
  console.log("Version:", systemInfo.version);
  console.log("Environment:", systemInfo.environment);

  // Execute SQL query
  const handleQuery = async () => {
    const result = await session.executeQuery(
      "SELECT COUNT(*) as total FROM patient"
    );

    if (result.ok) {
      console.log("Data:", result.data);
    }
  };
}
```

## Security Considerations

### Authentication
- Session IDs are temporary tokens from HOSxP system
- Bearer token authentication for API calls
- Sessions expire after 10 hours (36000 seconds) by default
  - Expiry time included in session response: `expired_second`
  - MessageCode 500 indicates expired session
- JWT tokens used for API authentication (`bms_session_code`)

### Data Protection
- HTTPS enforced for production
- Cookies use secure flag when on HTTPS
- Session IDs removed from URL after processing

### SQL Injection Prevention
- SQL queries are URL-encoded before transmission
- Backend HOSxP API validates and sanitizes
- **Table name validation**:
  - Blacklisted tables cannot be accessed
  - Maximum 20 tables per query
  - Dots not allowed in table names (prevents cross-database queries)
- **SQL statement whitelist**:
  - Only SELECT, DESCRIBE, EXPLAIN, SHOW, WITH statements allowed
  - Other SQL statements return 403 Forbidden error

### Authorization Level: Read-Only Access

> **Note**: This specification covers read-only access. Write operations require additional authentication that is not documented here.

- **Endpoint**: `/api/sql`
- **Requirements**:
  - Valid session ID
  - Bearer token authentication (`bms_session_code`)
- **Permissions**:
  - Execute SELECT queries
  - Use DESCRIBE, EXPLAIN, SHOW statements
  - Read all accessible tables (except blacklisted)

## Error Handling

### Session Errors
- **Expired Session**: MessageCode 500, prompts re-authentication
- **Invalid Session**: 401 Unauthorized, invalid/missing API key
- **Network Issues**: 502 Bad Gateway, timeout handling (30s default)

### Query Errors (Read)
- SQL syntax errors returned in response with MessageCode 409
- **Blacklisted table access**: Returns validation error
- **Unsupported SQL statement**: Returns 403 error
- **Too many tables**: Returns validation error (max 20 tables)
- **Invalid table name format**: Returns validation error (no dots allowed)
- Connection failures trigger retry logic
- Timeout after 60 seconds (server-side timeout)

## Best Practices

### Session Management
1. Always check `isConnected` before queries
2. Handle session expiry gracefully
3. Clear sessions on logout

### Query Optimization
1. Minify SQL before transport
2. Use parallel queries when possible
3. Implement proper error handling
4. Use LIMIT to restrict result sets
5. Use aggregate functions for statistics

### Privacy-Conscious Design

> **Key Principle**: Design your application to work with non-sensitive, aggregated data.

1. **Use COUNT, SUM, AVG** instead of retrieving individual records
2. **Avoid selecting personal identifiers** (CID, full names, addresses) when not necessary
3. **Use grouping** to show statistics by category rather than individual data
4. **Consider date ranges** for trends rather than specific dates

**Good Examples**:
```sql
-- Statistics by age group
SELECT
  CASE
    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 18 THEN 'Child'
    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 65 THEN 'Adult'
    ELSE 'Senior'
  END as age_group,
  COUNT(*) as patient_count
FROM patient
GROUP BY age_group

-- Monthly visit trends (using ovst = outpatient visits table)
SELECT
  DATE_FORMAT(vstdate, '%Y-%m') as month,
  COUNT(*) as visit_count
FROM ovst
WHERE vstdate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY month
ORDER BY month

-- Department workload (using kskdepartment for department names)
SELECT
  k.department,
  COUNT(*) as patient_count
FROM ovst o
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate = CURDATE()
GROUP BY k.department
```

### Component Design
1. Use context provider at app root
2. Leverage hooks for state management
3. Implement loading states
4. Show meaningful error messages

## Example Implementations

### Full Component with Read Operations

```jsx
import { useBmsSessionContext, useQuery } from '../hooks/useBmsSession';

function HospitalStats() {
  const session = useBmsSessionContext();
  const query = useQuery(
    "SELECT COUNT(*) as total FROM patient",
    session,
    true // auto-execute
  );

  if (!session.isConnected) {
    return <div>Please connect session</div>;
  }

  if (query.isLoading) {
    return <div>Loading...</div>;
  }

  if (query.error) {
    return <div>Error: {query.error}</div>;
  }

  return (
    <div>
      <h2>Patient Count: {query.data?.[0]?.total || 0}</h2>
      <p>User: {session.userInfo?.name}</p>
      <p>Position: {session.userInfo?.position}</p>
      <p>Hospital: {session.userInfo?.location}</p>
      <p>Department: {session.userInfo?.department}</p>
      <p>System Version: {session.systemInfo?.version}</p>
    </div>
  );
}
```

### Statistical Dashboard Example

```jsx
import { useBmsSessionContext, useQuery } from '../hooks/useBmsSession';

function DashboardStats() {
  const session = useBmsSessionContext();

  // Multiple queries for dashboard
  const patientCount = useQuery(
    "SELECT COUNT(*) as total FROM patient",
    session, true
  );

  const todayVisits = useQuery(
    "SELECT COUNT(*) as total FROM ovst WHERE vstdate = CURDATE()",
    session, true
  );

  const genderStats = useQuery(
    "SELECT sex, COUNT(*) as count FROM patient GROUP BY sex",
    session, true
  );

  if (!session.isConnected) {
    return <div>Please connect session</div>;
  }

  return (
    <div className="dashboard">
      <h1>Hospital Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Patients</h3>
          <p>{patientCount.data?.[0]?.total || 'Loading...'}</p>
        </div>

        <div className="stat-card">
          <h3>Today's Visits</h3>
          <p>{todayVisits.data?.[0]?.total || 'Loading...'}</p>
        </div>

        <div className="stat-card">
          <h3>Gender Distribution</h3>
          {genderStats.data?.map(row => (
            <p key={row.sex}>{row.sex}: {row.count}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Manual Session Connection

```jsx
function LoginForm() {
  const [sessionId, setSessionId] = useState('');
  const session = useBmsSessionContext();

  const handleConnect = async () => {
    const success = await session.connectSession(sessionId);
    if (success) {
      // Store in cookie for persistence
      setSessionCookie(sessionId);
    }
  };

  return (
    <div>
      <input
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        placeholder="Enter BMS Session ID"
      />
      <button onClick={handleConnect}>
        Connect
      </button>
    </div>
  );
}
```

## Real-World Examples

### Example 1: Get Database Version
```bash
GET /api/sql?sql=SELECT%20VERSION()%20as%20version&app=BMS.Dashboard.React
Authorization: Bearer {session_token}

Response:
{
  "result": {},
  "MessageCode": 200,
  "Message": "OK",
  "RequestTime": "2025-10-20T12:00:00.000Z",
  "data": [{"version": "10.1.14-MariaDB"}],
  "field": [6],
  "field_name": ["version"],
  "record_count": 1
}
```

### Example 2: Get Table Structure
```bash
GET /api/sql?sql=DESCRIBE%20patient&app=BMS.Dashboard.React
Authorization: Bearer {session_token}

Response:
{
  "result": {},
  "MessageCode": 200,
  "Message": "OK",
  "RequestTime": "2025-10-20T12:00:00.000Z",
  "data": [
    {
      "Field": "hn",
      "Type": "varchar(9)",
      "Null": "NO",
      "Key": "PRI",
      "Default": null,
      "Extra": ""
    }
    // ... more fields
  ],
  "field": [6, 6, 6, 6, 6, 6],
  "field_name": ["Field", "Type", "Null", "Key", "Default", "Extra"],
  "record_count": 100
}
```

### Example 3: Aggregate Statistics Query
```bash
POST /api/sql
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "sql": "SELECT sex, COUNT(*) as count FROM patient WHERE birthday IS NOT NULL GROUP BY sex",
  "app": "BMS.Dashboard.React"
}

Response:
{
  "result": {},
  "MessageCode": 200,
  "Message": "OK",
  "RequestTime": "2025-10-20T12:00:00.000Z",
  "data": [
    {"sex": "M", "count": 45230},
    {"sex": "F", "count": 52180}
  ],
  "field": [6, 2],
  "field_name": ["sex", "count"],
  "record_count": 2
}
```

### Example 4: Blacklisted Table Access (Error)
```bash
GET /api/sql?sql=SELECT%20*%20FROM%20opduser%20LIMIT%201&app=BMS.Dashboard.React
Authorization: Bearer {session_token}

Response:
{
  "result": {},
  "MessageCode": 400,
  "Message": "SQL Validation Failed",
  "RequestTime": "2025-10-20T12:00:00.000Z"
}
```

## Testing

### Connection Test Query
```sql
SELECT VERSION()
```

### Sample Statistics Queries (Read)
```sql
-- Patient count by gender
SELECT sex, COUNT(*) as count
FROM patient
GROUP BY sex

-- Monthly visit statistics (ovst = outpatient visits)
SELECT
  DATE_FORMAT(vstdate, '%Y-%m') as month,
  COUNT(*) as visits
FROM ovst
WHERE vstdate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
GROUP BY month
ORDER BY month

-- Department workload today (kskdepartment for department names)
SELECT
  k.department,
  COUNT(*) as patient_count
FROM ovst o
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate = CURDATE()
GROUP BY k.department
ORDER BY patient_count DESC
```

## Troubleshooting

### Common Issues

1. **Session Not Found**
   - Check URL parameter format: `?bms-session-id=VALUE`
   - Verify cookie is set correctly
   - Ensure session hasn't expired

2. **API Connection Failed**
   - Verify network connectivity
   - Check CORS settings if applicable
   - Confirm API URL is accessible

3. **SQL Execution Errors**
   - Validate SQL syntax
   - Check database permissions
   - Verify table/column names
   - Use single quotes for string literals

4. **Unauthorized Access (HTTP 501)**
   - Verify Bearer token is included in request
   - Check session is valid and not expired

## Version History

- **v2.0.0** (Developer Edition):
  - Documentation for read-only operations
  - Focus on non-sensitive data access
  - Privacy-conscious design patterns
  - Statistical dashboard examples

- **v1.0.0**: Initial implementation
  - Support for URL parameter, cookie storage
  - HOSxP API integration
  - React hooks and context provider
  - Read-only SQL query execution

---

## HOSxP Database Reference

> **Note**: This section documents key tables in HOSxP database commonly used for dashboard development.

### Core Tables

#### `patient` - Patient Registration
Primary table containing patient demographic data.

| Column | Type | Description |
|--------|------|-------------|
| `hos_guid` | varchar(38) | Primary key (GUID) |
| `hn` | varchar(9) | Hospital Number (unique) |
| `pname` | varchar(25) | Name prefix (Mr., Mrs., etc.) |
| `fname` | varchar(100) | First name |
| `lname` | varchar(100) | Last name |
| `sex` | char(1) | Gender (1=Male, 2=Female) |
| `birthday` | date | Date of birth |
| `bloodgrp` | varchar(20) | Blood group |
| `pttype` | char(2) | Patient type code |
| `nationality` | char(3) | Nationality code |
| `religion` | char(2) | Religion code |
| `occupation` | varchar(4) | Occupation code |
| `firstday` | date | First registration date |
| `last_visit` | date | Last visit date |
| `last_update` | datetime | Last record update |

#### `ovst` - Outpatient Visits
Records of outpatient visits (OPD).

| Column | Type | Description |
|--------|------|-------------|
| `hos_guid` | varchar(38) | Primary key (GUID) |
| `vn` | varchar | Visit Number (unique) |
| `hn` | varchar | Patient HN (FK to patient) |
| `vstdate` | date | Visit date |
| `vsttime` | time | Visit time |
| `doctor` | varchar | Doctor code (FK to doctor) |
| `spclty` | char | Specialty code |
| `cur_dep` | char | Current department code |
| `pttype` | char(2) | Patient type for this visit |
| `main_dep` | char | Main department code |
| `staff` | varchar | Staff who registered |

#### `kskdepartment` - Department Master
Department/clinic reference table.

| Column | Type | Description |
|--------|------|-------------|
| `depcode` | char | Department code (primary key) |
| `department` | varchar | Department name |
| `spclty` | char | Specialty code |
| `doctor_code` | varchar | Default doctor code |
| `hospital_department_id` | int | Hospital department ID |

#### `doctor` - Doctor Master
Doctor/physician reference table.

| Column | Type | Description |
|--------|------|-------------|
| `code` | varchar | Doctor code (primary key) |
| `name` | varchar | Full name |
| `shortname` | varchar | Short name/abbreviation |
| `licenseno` | varchar | Medical license number |
| `department` | varchar | Department name |
| `active` | char | Active status (Y/N) |

### Common Relationships

```
patient.hn ─────────────────┐
                            ↓
ovst.hn ←───────────────────┘
ovst.cur_dep ───────────────→ kskdepartment.depcode
ovst.doctor ────────────────→ doctor.code
```

### Example Join Queries

```sql
-- Visit with patient and department info
SELECT
    o.vn,
    o.vstdate,
    o.vsttime,
    p.hn,
    CONCAT(p.pname, p.fname, ' ', p.lname) as patient_name,
    k.department
FROM ovst o
LEFT JOIN patient p ON o.hn = p.hn
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate = CURDATE()
LIMIT 100

-- Visit counts by department today
SELECT
    k.depcode,
    k.department,
    COUNT(*) as visit_count
FROM ovst o
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate = CURDATE()
GROUP BY k.depcode, k.department
ORDER BY visit_count DESC

-- Doctor workload
SELECT
    d.code,
    d.name as doctor_name,
    COUNT(*) as patient_count
FROM ovst o
LEFT JOIN doctor d ON o.doctor = d.code
WHERE o.vstdate = CURDATE()
GROUP BY d.code, d.name
ORDER BY patient_count DESC
```

---

## Appendix: Recommended Queries for Dashboards

### Patient Statistics
```sql
-- Total registered patients
SELECT COUNT(*) as total FROM patient

-- Patients by age group
SELECT
  CASE
    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 1 THEN 'Infant'
    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 13 THEN 'Child'
    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 20 THEN 'Teenager'
    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 40 THEN 'Young Adult'
    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 60 THEN 'Middle Age'
    ELSE 'Senior'
  END as age_group,
  COUNT(*) as count
FROM patient
WHERE birthday IS NOT NULL
GROUP BY age_group

-- Patients by blood type
SELECT bloodgrp, COUNT(*) as count
FROM patient
WHERE bloodgrp IS NOT NULL AND bloodgrp != ''
GROUP BY bloodgrp
```

### Visit Statistics
```sql
-- Daily visits for the past week (ovst = outpatient visits)
SELECT vstdate, COUNT(*) as visits
FROM ovst
WHERE vstdate >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY vstdate
ORDER BY vstdate

-- Peak hours analysis
SELECT
  HOUR(vsttime) as hour,
  COUNT(*) as visits
FROM ovst
WHERE vstdate = CURDATE()
GROUP BY HOUR(vsttime)
ORDER BY hour
```

### System Health
```sql
-- Database version
SELECT VERSION() as version

-- Table count
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()

-- Check table structure
DESCRIBE patient
```

---

> **Remember**: This specification is designed for building read-only dashboards and statistical displays. For write operations or access to sensitive data, please refer to the full BMS Session Specification document and consult with your system administrator for proper authorization.
