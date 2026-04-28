# Security Review Document — СПО (Система Планирования и Отчетности)

**Version:** 1.0  
**Date:** 2025  
**Scope:** Backend application, infrastructure, database, API security  
**Architecture:** Clean Architecture + DDD, Modular Monolith, NestJS

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Authorization (RBAC/ABAC)](#2-authorization-rbacabac)
3. [Secrets Management](#3-secrets-management)
4. [Data Protection](#4-data-protection)
5. [API Security](#5-api-security)
6. [Infrastructure Security](#6-infrastructure-security)
7. [Recommendations & Action Items](#7-recommendations--action-items)

---

## 1. Authentication

### 1.1 JWT Configuration

| Parameter | Current Value | Assessment |
|---|---|---|
| **Algorithm** | `HS256` (HMAC-SHA256) | ✅ **Good.** Industry-standard symmetric algorithm. |
| **Access Token Expiry** | 900 seconds (15 min) via `JWT_ACCESS_EXPIRY_SECONDS` env | ✅ **Good.** Short expiry reduces risk window. |
| **Refresh Token Expiry** | 604,800 seconds (7 days) via `JWT_REFRESH_EXPIRY_SECONDS` env | ✅ **Good.** Standard duration. |
| **Secret Strength** | Falls back to `'default-dev-secret-change-in-production'` if `JWT_SECRET` is not set | ⚠️ **Warning.** Production must use a strong (>=256-bit) random secret via environment variable. |
| **Token Structure** | `{ sub, login, sessionId, iat, exp }` | ✅ **Good.** Minimal payload without sensitive data. |

**Implementation details:**
- `JwtService` uses `jsonwebtoken` library with explicit algorithm restriction: `algorithms: ['HS256']`
- Token expiry is validated by the library; expired tokens throw `TokenExpiredError`
- Failed verification throws `UnauthorizedException` with clear error messages
- Access tokens are stateless (no DB lookup required)

**Risk:** If `JWT_SECRET` is not set in production, the fallback default can be easily guessed. The application logs a warning, but does not prevent startup.

### 1.2 Refresh Token Rotation

| Aspect | Current State | Assessment |
|---|---|---|
| **Rotation** | ✅ Implemented. Old token revoked, new token issued on `/api/auth/refresh` | ✅ **Good practice.** |
| **Token Generation** | `crypto.randomBytes(48)` → hex string (96 chars) | ✅ **Strong.** 384 bits of entropy. |
| **Storage** | SHA-256 hash stored in `RefreshToken.tokenHash` | ✅ **Good.** Plaintext tokens never stored. |
| **Revocation** | `revokedAt` field set on logout and refresh | ✅ **Good.** Prevents replay. |
| **Expiry** | `expiresAt` column; unused tokens cleaned up by `@@index([expiresAt])` | ✅ **Good.** |

### 1.3 Rate Limiting on Login Endpoint

| Aspect | Current State | Assessment |
|---|---|---|
| **Throttler Module** | ✅ `@nestjs/throttler` is a dependency (`^6.5.0`) | ✅ **Good.** |
| **Login Endpoint** | ⚠️ **Partially.** `LoginAttempt` model tracks attempts, but global throttler needs configuration in `main.ts` | ⚠️ **Need verification.** The throttler module should be configured globally or on auth routes. |
| **Implementation** | `LoginAttempt` records include `login`, `ipAddress`, `isSuccess`, `attemptedAt`, `blockedUntil` | ✅ **Good.** Enables brute-force detection per IP and per login. |

**Recommendation:** Ensure `@nestjs/throttler` is imported in the global module and configured with appropriate limits (e.g., 10 login attempts per minute per IP).

### 1.4 Brute Force Protection

| Mechanism | Current State | Assessment |
|---|---|---|
| **LoginAttempt Tracking** | ✅ `LoginAttempt` model stores every attempt with IP, timestamp, success/failure | ✅ **Good.** |
| **Blocking** | `blockedUntil` column exists but blocking logic must be enforced in use case | ⚠️ **Needs verification.** Ensure `LoginUseCase` checks recent failed attempts and enforces block before processing. |
| **Indexes** | `@@index([login, attemptedAt])`, `@@index([ipAddress, attemptedAt])`, `@@index([attemptedAt])` | ✅ **Good.** Fast queries for brute-force detection. |

**Recommendation:** Implement threshold-based blocking: block login for 15 minutes after 5 consecutive failed attempts.

### 1.5 LDAP Bind Injection Prevention

| Aspect | Current State | Assessment |
|---|---|---|
| **Provider** | `LdapMockAdapter` (mock mode default, `LDAP_MOCK_ENABLED=true`) | ✅ **Safe for dev.** |
| **Input Sanitization** | ⚠️ Not yet implemented in mock adapter; real LDAP adapter must sanitize login input | ⚠️ **Risk.** LDAP injection can occur if `login` is not sanitized before bind. |
| **Recommendation** | In a real LDAP adapter, escape special characters in DN components: `\`, `*`, `(`, `)`, `\0`, `/`, etc. Use parameterized LDAP search filters. | — |

**Implementation status:** The LDAP adapter is currently in mock mode. A real adapter (`ldapjs`) must implement:
- Input sanitization (escape LDAP special characters)
- Use of anonymous bind or service account for search, then user-specific bind for verification
- Never constructing DN from user input directly; search by attribute instead (e.g., `(sAMAccountName=login)`)

---

## 2. Authorization (RBAC/ABAC)

### 2.1 Role-Based Guards

| Guard | Implementation | Assessment |
|---|---|---|
| **JwtAuthGuard** | Extracts JWT, verifies signature, attaches `{ id, login, sessionId }` to `request.user` | ✅ **Good.** |
| **RolesGuard** | Uses `@Roles()` decorator metadata; checks `request.user.roles` array | ✅ **Good.** |

**Role Hierarchy:**
- `admin` — full system access
- `director` — organizational oversight
- `manager` — team management, evaluations
- `employee` — reports, personal data
- `business` — business evaluations
- `accountant` — financial data access
- `viewer` — read-only access

### 2.2 ABAC Policies

The following Attribute-Based Access Control policies should be enforced (verify implementation):

| Policy | Context | Required Enforcement |
|---|---|---|
| **Personal Reports** | Employee can view/edit only their own reports | `request.user.id === report.userId` |
| **Manager Evaluations** | Manager can evaluate their direct reports only | `employee.managerId === request.user.id` |
| **Finance Data** | Only `accountant`, `admin`, `director` can view financial aggregates | Role check + ABAC for specific employees |
| **Rate Access** | Employee rates visible only to HR/Admin/Accountant | Role-based with data scope |
| **Period Reopen** | Only `admin` can reopen closed periods | Role check + audit trail |

**Verification check:** Review each controller/service to ensure ABAC is enforced:
- `finance.controller.ts` — verify that an employee cannot view another employee's financial data
- `reporting.controller.ts` — verify that personal report access is scoped to the authenticated user
- `admin.controller.ts` — verify admin-only endpoints are properly guarded

### 2.3 Endpoint Guard Coverage

| Module | Endpoints | Guards | Status |
|---|---|---|---|
| **Auth** | `POST /login` | Public | ✅ Public endpoint (intentional) |
| **Auth** | `POST /refresh` | Public | ✅ Public endpoint |
| **Auth** | `POST /logout` | `JwtAuthGuard` | ✅ |
| **Auth** | `GET /me` | `JwtAuthGuard` | ✅ |
| **Auth** | `POST /test-ldap` | `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')` | ✅ Properly restricted |
| **Admin** | Admin endpoints | `JwtAuthGuard` + `RolesGuard` | ✅ Verify all |
| **Planning** | Planning endpoints | `JwtAuthGuard` | ✅ Verify ABAC |
| **Reporting** | Report endpoints | `JwtAuthGuard` | ✅ Verify ABAC |
| **Finance** | Finance endpoints | `JwtAuthGuard` | ✅ Verify role guard |

### 2.4 Directory/Manager Restrictions

- A **director** should be able to view aggregated data across all employees
- A **manager** should only see data for their direct reports (their `managerId` field)
- An **employee** should only see their own data
- **Business** users should only see evaluation-related data, not financial details

**Verify** that `employee_profiles.managerId` is used to scope queries for managers in:
- Report retrieval
- Work item aggregation
- Evaluation management
- Planning dashboards

---

## 3. Secrets Management

### 3.1 Encryption Service

| Aspect | Implementation | Assessment |
|---|---|---|
| **Algorithm** | `aes-256-gcm` (AES-256-GCM) | ✅ **Gold standard.** Authenticated encryption. |
| **IV Length** | 12 bytes (96 bits) | ✅ **Standard.** |
| **Auth Tag Length** | 16 bytes (128 bits) | ✅ **Standard.** |
| **Key** | `ENCRYPTION_KEY` env var, 64 hex chars = 32 bytes (256 bits) | ✅ **Proper key size.** |
| **Fallback** | SHA-256 of dev string if key is missing | ⚠️ **Development only.** Warning is logged. |
| **Output Format** | Base64: `IV (12B) + Ciphertext + AuthTag (16B)` | ✅ **Good.** Self-contained format. |

**Recommendation:** The `ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes). Generate with: `openssl rand -hex 32`.

### 3.2 SMTP Password Encryption

| Aspect | Implementation | Assessment |
|---|---|---|
| **Storage** | Encrypted using `EncryptionService` → stored as encrypted base64 string | ✅ **Secure.** |
| **Usage** | Decrypted on-the-fly when creating nodemailer transporter | ✅ **Secure.** Never stored in plaintext. |
| **Logging** | Password not logged; `[DRY-RUN]` mode logs only subject and body length | ✅ **Good.** |

### 3.3 API Token Encryption (YouTrack)

| Aspect | Implementation | Assessment |
|---|---|---|
| **Field** | `IntegrationSettings.apiTokenEncrypted` | ✅ **Encrypted field.** |
| **Encryption** | Uses `EncryptionService` (AES-256-GCM) | ✅ **Secure.** |

### 3.4 Secrets Masked in Responses

| Context | Current State | Assessment |
|---|---|---|
| **API responses** | Should not expose `apiTokenEncrypted` in API responses from integration settings | ⚠️ **Verify** that class-transformer `@Exclude()` or manual stripping is applied |
| **Audit logs** | Audit logs should mask sensitive field values in changes/metadata | ⚠️ **Verify** that sensitive data is not logged |

**Recommendation:** Add `@Exclude()` decorator to sensitive fields in DTOs, or implement a serialization interceptor.

### 3.5 Encryption Key Requirements

- **Length:** 64 hex characters (32 bytes)
- **Storage:** Environment variable only (never in code or version control)
- **Rotation:** Document key rotation procedure
- **Backup:** Encrypted backup of ENCRYPTION_KEY in secure vault

---

## 4. Data Protection

### 4.1 No Float Types for Financial Data

| Principle | Implementation | Assessment |
|---|---|---|
| **Money** | Stored in **kopecks** (integer). `Money` value object enforces integers. | ✅ **Excellent.** No floating-point errors. |
| **Minutes** | Stored in **minutes** (integer). `Minutes` value object enforces integers. | ✅ **Excellent.** |
| **Percentages** | Stored in **basis points** (integer, 1% = 100). `Percentage` value object enforces integers. | ✅ **Excellent.** |
| **Hourly Rate** | Stored in **kopecks per hour × 60** (integer). `HourlyRate` value object enforces integers. | ✅ **Excellent.** |

All financial calculations go through value objects (`Money.percent()`, `Money.add()`, etc.), ensuring no floating-point rounding errors.

### 4.2 Immutable Snapshots for Closed Periods

| Feature | Implementation | Assessment |
|---|---|---|
| **PeriodSnapshot** | Stores complete state at period close: rates, formulas, scales, work items, issues, hierarchy, report lines, aggregates | ✅ **Excellent.** Full auditability. |
| **Frozen Reports** | `PersonalReport.isFrozen` and `PeriodSummaryReport.isFrozen` flags | ✅ **Prevents modification.** |
| **Unique Constraint** | `@@unique([periodId])` on `PersonalReport` (per user+period) | ✅ **Prevents duplicates.** |

**Business rule:** Once a period is closed and snapshot created, modifications must be:
1. Prevented by application logic (check `isFrozen`)
2. Only possible via reopen flow (with audit trail and reason)

### 4.3 Audit Logging

| Aspect | Implementation | Assessment |
|---|---|---|
| **Model** | `AuditLog` with `entityType`, `entityId`, `action`, `userId`, `changes (JSON)`, `metadata (JSON)` | ✅ **Comprehensive.** |
| **Indexes** | `@@index([entityType, entityId])`, `@@index([action])`, `@@index([createdAt])`, `@@index([userId])` | ✅ **Good for querying.** |
| **Coverage** | Must log: period transitions, report changes, evaluation changes, rate changes, user management | ⚠️ **Verify** that all critical operations create audit log entries. |

**Critical operations that MUST be audited:**
- ✅ User login/logout (via LoginAttempt)
- ✅ Period state transitions (via PeriodTransition model)
- ✅ Plan fixes (sprint_plans.fixed_at)
- ⚠️ Rate changes
- ⚠️ Report modifications
- ⚠️ Evaluation changes
- ⚠️ Configuration changes

### 4.4 Input Validation

| Layer | Implementation | Assessment |
|---|---|---|
| **DTO Validation** | `class-validator` decorators on all DTOs | ✅ **Good.** |
| **Global Pipe** | `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` | ✅ **Excellent.** Strips unknown properties, transforms types. |
| **SQL Injection** | **Prisma ORM** provides parameterized queries by default | ✅ **No raw SQL injection risk.** |
| **XSS** | Input validation + helmet headers handle most cases | ✅ **Good.** |

---

## 5. API Security

### 5.1 Helmet Middleware

| Feature | Status | Notes |
|---|---|---|
| **Helmet** | `app.use(helmet())` in `main.ts` | ✅ **Enabled globally.** |
| **CSP** | Default helmet CSP | ⚠️ Customize for production (see nginx config) |
| **X-Frame-Options** | `DENY` (default) | ✅ |
| **X-Content-Type-Options** | `nosniff` (default) | ✅ |
| **Strict-Transport-Security** | Not set by default; needs HTTPS | ⚠️ Enable in production with `max-age=31536000; includeSubDomains` |

### 5.2 Rate Limiting

| Feature | Status | Notes |
|---|---|---|
| **@nestjs/throttler** | Dependency available (`^6.5.0`) | ✅ |
| **Global Configuration** | ⚠️ **Needs verification** — must be imported in `AppModule` and configured | ⚠️ Confirm throttler module is configured |
| **Login Endpoint** | Can be rate-limited with custom `@Throttle()` decorator | ✅ |
| **Upload/Export Endpoints** | Should have separate rate limits | ⚠️ Check implementation |

**Recommended configuration:**
```typescript
// Global: 100 requests per 60 seconds
// Auth/Login: 10 requests per 60 seconds
// Export: 5 requests per 60 seconds
```

### 5.3 CORS Configuration

| Aspect | Current | Assessment |
|---|---|---|
| **Origin** | `origin: true` (reflects request origin) | ⚠️ **Too permissive for production.** Use explicit allowed origins. |
| **Credentials** | `credentials: true` | ✅ Required for cookies/tokens. |

**Recommendation:** In production, set `origin` to specific allowed origins:
```typescript
origin: process.env.NODE_ENV === 'production'
  ? ['https://spo.company.com', 'https://app.spo.company.com']
  : true,
```

### 5.4 SQL Injection Prevention

| Layer | Protection | Assessment |
|---|---|---|
| **ORM** | Prisma Client — parameterized queries only | ✅ **Safe.** |
| **Raw Queries** | `prisma.$queryRaw` — use only with template literals | ⚠️ **Verify** no raw queries accept unsanitized input. |
| **Migration SQL** | Static SQL files only | ✅ |

### 5.5 Request Validation

All incoming data is validated by:
1. **DTO classes** with `class-validator` decorators (`@IsString()`, `@IsInt()`, `@IsOptional()`, etc.)
2. **Global ValidationPipe** configured with:
   - `whitelist: true` — strips unknown properties
   - `forbidNonWhitelisted: true` — rejects requests with unknown properties
   - `transform: true` — transforms plain objects to DTO instances

---

## 6. Infrastructure Security

### 6.1 PostgreSQL Security

| Aspect | Current | Recommendation |
|---|---|---|
| **User** | `user` in docker-compose | ⚠️ **Non-root is good**, but use a more specific name and strong password via `.env` |
| **Password** | `password` in docker-compose | ⚠️ **Hardcoded.** Use `POSTGRES_PASSWORD_FILE` or `.env` for production. |
| **SSL** | Not configured | ⚠️ **Enable SSL** for production connections (`sslmode=require` in `DATABASE_URL`). |
| **Network** | Public port 5432 | ⚠️ **Restrict** to backend container only (remove `ports` or use internal Docker network). |
| **Connection Pool** | Prisma handles pooling | ✅ |

### 6.2 Redis Security

| Aspect | Current | Recommendation |
|---|---|---|
| **Authentication** | No password (default) | ⚠️ **Set `REDIS_PASSWORD`** and configure `requirepass` in production. |
| **Port** | 6379 (default) | ⚠️ **Use non-default port** or restrict network access. |
| **Persistence** | `redis_data` volume | ✅ |
| **Encryption** | Not configured | ⚠️ Consider Redis TLS for production. |

### 6.3 Docker Security

| Aspect | Current | Assessment |
|---|---|---|
| **Base Image** | `node:20-alpine` | ✅ **Minimal and secure.** |
| **Multi-stage Build** | ✅ Builder → Production stage | ✅ **Good.** No build tools in production image. |
| **Non-root User** | ⚠️ Not configured — runs as root | ⚠️ **Add `USER node`** before `ENTRYPOINT` in Dockerfile. |
| **Tini** | `/sbin/tini` as init | ✅ **Proper signal handling.** |
| **Healthcheck** | Configured for postgres and redis | ✅ |

**Recommendation for Dockerfile:**
```dockerfile
# Add before ENTRYPOINT
USER node
```

### 6.4 HTTPS Termination (Nginx)

**Recommended nginx configuration:**
- External HTTPS on port 443
- SSL termination at nginx (certificates from Let's Encrypt or internal CA)
- Reverse proxy to backend on `http://localhost:3000`
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting per IP
- Request body size limit (e.g., 10MB)
- Gzip compression
- Access and error logging
- Static file serving for export download directory

Key security headers for nginx:
```
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;" always;
```

---

## 7. Recommendations & Action Items

### High Priority (Must Fix Before Production)

| # | Issue | Component | Action |
|---|---|---|---|
| H1 | **Default JWT secret** | `JwtService` | Set `JWT_SECRET` env in production; prevent startup if default is used |
| H2 | **Hardcoded DB password** | docker-compose | Use `.env` file or Docker secrets |
| H3 | **No SSL for DB/Redis** | docker-compose | Enable SSL/TLS for production connections |
| H4 | **Container runs as root** | Dockerfile | Add `USER node` before entrypoint |
| H5 | **CORS `origin: true`** | `main.ts` | Restrict to specific origins in production |

### Medium Priority

| # | Issue | Component | Action |
|---|---|---|---|
| M1 | **Brute-force blocking** | `LoginUseCase` | Implement threshold-based account lockout |
| M2 | **LDAP injection prevention** | LDAP adapter | Sanitize inputs when real LDAP adapter is implemented |
| M3 | **Rate limiting configuration** | `AppModule` | Verify `@nestjs/throttler` is properly imported and configured |
| M4 | **Sensitive data in API responses** | DTOs/Serialization | Add `@Exclude()` or interceptor for sensitive fields |
| M5 | **Redis password** | docker-compose | Add `requirepass` configuration |

### Low Priority (Best Practices)

| # | Issue | Component | Action |
|---|---|---|---|
| L1 | **HSTS header** | main.ts/nginx | Enable `Strict-Transport-Security` |
| L2 | **Encryption key rotation** | Documentation | Document key rotation procedure |
| L3 | **Audit log completeness** | Services | Verify all critical operations create audit entries |
| L4 | **Period snapshot immutability** | Period closing | Add application-level check to prevent writes to frozen snapshots |
| L5 | **Docker non-default network** | docker-compose | Create internal network for backend-db communication |

### Security Checklist Summary

```
[✅] JWT with short expiry (15 min) and HS256 algorithm
[✅] Refresh token rotation with hash storage
[✅] AES-256-GCM for encryption of secrets
[✅] Integer types for all financial data (no Float)
[✅] Immutable period snapshots
[⚠️] Rate limiting (dependency exists, verify configuration)
[⚠️] Brute-force protection (tracking exists, verify blocking logic)
[⚠️] Input validation via DTOs and global ValidationPipe
[⚠️] Helmet security headers
[⚠️] CORS configuration (restrict in production)
[⚠️] Non-root user in Docker container
[⚠️] Database passwords via environment variables
[❌] LDAP injection prevention (not yet implemented)
[❌] SSL/TLS for database connections
[❌] Redis authentication
```

---

*This security review should be revisited after each major release and before production deployment. All high-priority items must be resolved before going live.*
```

Now create the nginx configuration files: