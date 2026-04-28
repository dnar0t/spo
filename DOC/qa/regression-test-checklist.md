# Regression Test Checklist — СПО (Система Планирования и Отчетности)

**Version:** 1.0.0  
**Last Updated:** 2026-04-27  
**Audience:** QA Engineers

---

## Table of Contents

1. [Auth & Security](#1-auth--security)
2. [Administration](#2-administration)
3. [YouTrack Integration](#3-youtrack-integration)
4. [Sprint Planning](#4-sprint-planning)
5. [Reporting & Workflow](#5-reporting--workflow)
6. [Finance](#6-finance)
7. [Period Closing](#7-period-closing)
8. [Notifications](#8-notifications)
9. [Export](#9-export)

---

## 1. Auth & Security

### AUTH-01: User Login with Valid Credentials

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-01 |
| **Description** | Verify that a user can log in with valid AD credentials |
| **Prerequisites** | User exists in AD/LDAP, system is running |
| **Steps** | 1. Send POST `/api/auth/login` with valid `login` and `password`<br>2. Receive response |
| **Expected Result** | HTTP 200, response contains `accessToken`, `refreshToken`, and user info (no password exposure) |

### AUTH-02: User Login with Invalid Credentials

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-02 |
| **Description** | Verify that login fails with invalid credentials |
| **Prerequisites** | System is running |
| **Steps** | 1. Send POST `/api/auth/login` with invalid `login` or `password` |
| **Expected Result** | HTTP 401, error message "Invalid credentials" |

### AUTH-03: Brute Force Protection

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-03 |
| **Description** | Verify that account is temporarily blocked after multiple failed login attempts |
| **Prerequisites** | System is running, user exists |
| **Steps** | 1. Send POST `/api/auth/login` with invalid password 5+ times<br>2. Attempt login with valid credentials |
| **Expected Result** | After 5 failures: HTTP 429 "Too many attempts. Try again later." Account blocked for configurable period (default: 15 minutes) |

### AUTH-04: Token Refresh

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-04 |
| **Description** | Verify refresh token rotation works |
| **Prerequisites** | User is logged in |
| **Steps** | 1. Send POST `/api/auth/refresh` with valid `refreshToken`<br>2. Use old `refreshToken` again |
| **Expected Result** | First call: HTTP 200 with new `accessToken` and `refreshToken`<br>Second call: HTTP 401 (token rotation — old token is invalidated) |

### AUTH-05: Logout

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-05 |
| **Description** | Verify that logout revokes the session |
| **Prerequisites** | User is logged in |
| **Steps** | 1. Send POST `/api/auth/logout` with valid `refreshToken`<br>2. Attempt to use the same `refreshToken` |
| **Expected Result** | HTTP 200 on logout. Subsequent refresh attempt: HTTP 401 |

### AUTH-06: RBAC — ADMIN Access Granted

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-06 |
| **Description** | Verify that ADMIN role can access admin endpoints |
| **Prerequisites** | User with ADMIN role exists |
| **Steps** | 1. Log in as ADMIN<br>2. Send GET `/api/admin/users` |
| **Expected Result** | HTTP 200, users list returned |

### AUTH-07: RBAC — Employee Access Denied

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-07 |
| **Description** | Verify that employee role cannot access admin endpoints |
| **Prerequisites** | User with employee role exists |
| **Steps** | 1. Log in as employee<br>2. Send GET `/api/admin/users` |
| **Expected Result** | HTTP 403 Forbidden |

### AUTH-08: ABAC — Personal Report Visibility

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-08 |
| **Description** | Verify that employee can only view their own personal report |
| **Prerequisites** | Two users exist with personal reports in the current period |
| **Steps** | 1. Log in as User A<br>2. GET `/api/reporting/personal` for User A — success<br>3. GET `/api/reporting/personal` for User B — should fail |
| **Expected Result** | Own report: HTTP 200. Other's report: HTTP 403 |

### AUTH-09: Audit Log Entry Creation

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-09 |
| **Description** | Verify that sensitive operations are logged to audit log |
| **Prerequisites** | ADMIN user exists |
| **Steps** | 1. Deactivate a user<br>2. GET `/api/admin/audit-log` with filter by action `USER_DEACTIVATED` |
| **Expected Result** | Audit log contains entry with userId, action, entityType, entityId, timestamp |

### AUTH-10: Secrets Masking

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-10 |
| **Description** | Verify that secrets (API tokens, passwords) are masked in API responses and logs |
| **Prerequisites** | YouTrack integration is configured |
| **Steps** | 1. GET integration settings via API (if accessible)<br>2. Check log output for any sensitive values |
| **Expected Result** | Secrets appear as `****` or only last 4 chars in responses. Logs do not contain plaintext secrets. |

### AUTH-11: JWT Token Expiry

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-11 |
| **Description** | Verify that expired JWT token is rejected |
| **Prerequisites** | User is logged in |
| **Steps** | 1. Wait for `accessToken` to expire (default: 15 min) or manually create expired token<br>2. Send request with expired token |
| **Expected Result** | HTTP 401 Unauthorized |

### AUTH-12: Endpoint without Auth

| Field         | Value |
|---------------|-------|
| **ID**        | AUTH-12 |
| **Description** | Verify that unauthenticated requests to protected endpoints are rejected |
| **Prerequisites** | System is running |
| **Steps** | 1. Send GET `/api/admin/users` without Authorization header |
| **Expected Result** | HTTP 401 Unauthorized |

---

## 2. Administration

### ADMIN-01: Create User

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-01 |
| **Description** | Verify that ADMIN can create a new user |
| **Prerequisites** | Logged in as ADMIN |
| **Steps** | 1. POST `/api/admin/users` with `{ login, fullName, email, employmentDate }` |
| **Expected Result** | HTTP 201, user created with `isActive: true`. Login attempt succeeds. |

### ADMIN-02: Update User

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-02 |
| **Description** | Verify that ADMIN can update user profile |
| **Prerequisites** | User exists, logged in as ADMIN |
| **Steps** | 1. PUT `/api/admin/users/:id` with updated `fullName` |
| **Expected Result** | HTTP 200, user data updated. Changes reflected in GET. |

### ADMIN-03: Deactivate User

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-03 |
| **Description** | Verify that ADMIN can deactivate a user (soft delete) |
| **Prerequisites** | User exists and is active, logged in as ADMIN |
| **Steps** | 1. DELETE `/api/admin/users/:id`<br>2. Attempt to log in as deactivated user |
| **Expected Result** | HTTP 204. Login attempt fails with HTTP 401. User appears in list with `isActive: false`. |

### ADMIN-04: Assign Roles

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-04 |
| **Description** | Verify that ADMIN can assign roles to a user |
| **Prerequisites** | User exists, roles exist in system, logged in as ADMIN |
| **Steps** | 1. PUT `/api/admin/users/:id/roles` with `{ roleIds: [...] }`<br>2. Log in as that user and check access to protected endpoints |
| **Expected Result** | HTTP 204. User gains correct permissions. |

### ADMIN-05: Assign Manager

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-05 |
| **Description** | Verify that ADMIN/MANAGER can assign a manager to an employee |
| **Prerequisites** | Two users exist, logged in as ADMIN |
| **Steps** | 1. PUT `/api/admin/users/:id/manager` with `{ managerId: "..." }`<br>2. GET user details |
| **Expected Result** | HTTP 204. Employee profile shows manager in response. |

### ADMIN-06: Rate CRUD

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-06 |
| **Description** | Verify that ADMIN can create and view employee rates |
| **Prerequisites** | Employee exists, logged in as ADMIN |
| **Steps** | 1. POST `/api/admin/rates/:userId` with `{ monthlySalary, annualMinutes, effectiveFrom }`<br>2. GET `/api/admin/rates/:userId` to view current rate<br>3. GET `/api/admin/rates/:userId/history` |
| **Expected Result** | HTTP 201 on create. Current rate displayed. History shows all changes with timestamps. |

### ADMIN-07: Formula Management

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-07 |
| **Description** | Verify that ADMIN/FINANCE can list and update formulas |
| **Prerequisites** | Formulas exist (seeded), logged in as ADMIN |
| **Steps** | 1. GET `/api/admin/formulas`<br>2. PUT `/api/admin/formulas/:id` with updated value |
| **Expected Result** | HTTP 200. Formula value updated. Version history created. |

### ADMIN-08: Evaluation Scale Management

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-08 |
| **Description** | Verify that ADMIN can update evaluation scales |
| **Prerequisites** | Evaluation scales exist (seeded), logged in as ADMIN |
| **Steps** | 1. GET `/api/admin/evaluation-scales`<br>2. PUT `/api/admin/evaluation-scales/:id` with updated `percent` or `name` |
| **Expected Result** | HTTP 200. Scale updated. |

### ADMIN-09: Planning Settings

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-09 |
| **Description** | Verify that ADMIN can update planning settings |
| **Prerequisites** | Logged in as ADMIN |
| **Steps** | 1. PUT `/api/admin/settings/planning` with updated `workHoursPerMonth`, `reservePercent`, etc. |
| **Expected Result** | HTTP 200. Settings updated and reflected in capacity calculations. |

### ADMIN-10: Audit Log Pagination

| Field         | Value |
|---------------|-------|
| **ID**        | ADMIN-10 |
| **Description** | Verify audit log pagination and filtering |
| **Prerequisites** | Audit log contains multiple entries |
| **Steps** | 1. GET `/api/admin/audit-log?page=1&limit=10`<br>2. Filter by `action`, `userId`, `entityType`, `dateFrom`/`dateTo` |
| **Expected Result** | Paginated results with total count. Filters return matching entries only. |

---

## 3. YouTrack Integration

### YT-01: Test Connection

| Field         | Value |
|---------------|-------|
| **ID**        | YT-01 |
| **Description** | Verify YouTrack API connection test |
| **Prerequisites** | YouTrack integration configured, logged in as ADMIN |
| **Steps** | 1. POST `/api/youtrack/test-connection` |
| **Expected Result** | HTTP 200 with `{ success: true, message: "Connection successful", youtrackVersion: "..." }` |

### YT-02: Run Full Sync

| Field         | Value |
|---------------|-------|
| **ID**        | YT-02 |
| **Description** | Verify full YouTrack sync (users → projects → issues → work items) |
| **Prerequisites** | YouTrack integration configured, logged in as ADMIN |
| **Steps** | 1. POST `/api/youtrack/sync` with `{ type: "full" }`<br>2. Wait for sync to complete<br>3. GET `/api/youtrack/sync-runs` to check status |
| **Expected Result** | Sync completes with status `COMPLETED`. Issues and work items synced. `createdCount + updatedCount > 0`. |

### YT-03: Sync Run History

| Field         | Value |
|---------------|-------|
| **ID**        | YT-03 |
| **Description** | Verify sync run history endpoint |
| **Prerequisites** | At least one sync run completed |
| **Steps** | 1. GET `/api/youtrack/sync-runs`<br>2. GET `/api/youtrack/sync-runs/:id` (with logs) |
| **Expected Result** | List of sync runs with status, timestamps, counts. Detail view includes log entries. |

### YT-04: Issue List with Filters

| Field         | Value |
|---------------|-------|
| **ID**        | YT-04 |
| **Description** | Verify issues endpoint with filtering and pagination |
| **Prerequisites** | Issues synced |
| **Steps** | 1. GET `/api/youtrack/issues?page=1&limit=20`<br>2. Filter by `projectName`, `assigneeId`, `isResolved`, `systemName` |
| **Expected Result** | Paginated issues. Filters return correct subset. |

### YT-05: Sync Stats

| Field         | Value |
|---------------|-------|
| **ID**        | YT-05 |
| **Description** | Verify integration statistics endpoint |
| **Prerequisites** | Issues and work items synced |
| **Steps** | 1. GET `/api/youtrack/stats` |
| **Expected Result** | Returns `totalIssues`, `totalWorkItems`, `lastSyncAt`, `syncCount`, `errorCount` |

### YT-06: Sync Error Handling

| Field         | Value |
|---------------|-------|
| **ID**        | YT-06 |
| **Description** | Verify sync handles API errors gracefully |
| **Prerequisites** | YouTrack integration configured |
| **Steps** | 1. Temporarily make YouTrack API unavailable or provide invalid token<br>2. POST `/api/youtrack/sync` |
| **Expected Result** | Sync run shows status `ERROR`. Error details logged. Other system functions unaffected. |

### YT-07: Rate Limiting

| Field         | Value |
|---------------|-------|
| **ID**        | YT-07 |
| **Description** | Verify sync respects YouTrack API rate limits |
| **Prerequisites** | YouTrack integration configured |
| **Steps** | 1. Trigger multiple syncs rapidly<br>2. Check sync logs for rate limit handling |
| **Expected Result** | Sync engine respects `Retry-After` headers. Retry count increments but sync eventually completes. |

---

## 4. Sprint Planning

### PLAN-01: Create Period

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-01 |
| **Description** | Verify that ADMIN can create a new reporting period |
| **Prerequisites** | Logged in as user with permission |
| **Steps** | 1. POST `/api/periods` with `{ month, year, workHoursPerMonth }` |
| **Expected Result** | HTTP 201, period created with state `PLANNING`. Period appears in list. |

### PLAN-02: Period State Machine — PLANNING → PLAN_FIXED

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-02 |
| **Description** | Verify period workflow transitions correctly |
| **Prerequisites** | Period exists in `PLANNING` state, logged in as user with permission |
| **Steps** | 1. POST `/api/periods/:id/transition` with `{ toState: "PLAN_FIXED" }` |
| **Expected Result** | HTTP 200, period state changed to `PLAN_FIXED`. Plan becomes immutable. |

### PLAN-03: Period State Machine — Invalid Transition

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-03 |
| **Description** | Verify invalid state transitions are rejected |
| **Prerequisites** | Period exists in `PLANNING` state |
| **Steps** | 1. Attempt to transition directly from `PLANNING` to `CLOSED` |
| **Expected Result** | HTTP 400, error message about invalid transition |

### PLAN-04: Backlog Query

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-04 |
| **Description** | Verify backlog query with filters |
| **Prerequisites** | Issues synced |
| **Steps** | 1. GET `/api/backlog?periodId=...&page=1&limit=50`<br>2. Filter by `project`, `assignee`, `type`, `search` |
| **Expected Result** | Returns backlog issues sorted by readiness. Filters work correctly. |

### PLAN-05: Task Assignment

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-05 |
| **Description** | Verify planned task creation and assignment |
| **Prerequisites** | Period in `PLANNING` state, issues exist |
| **Steps** | 1. POST `/api/planned-tasks` with `{ sprintPlanId, youtrackIssueId, assigneeId, plannedMinutes }` |
| **Expected Result** | HTTP 201, task created. Debug/test/mgmt minutes calculated automatically based on config. |

### PLAN-06: Capacity Calculator

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-06 |
| **Description** | Verify capacity calculation with reserve |
| **Prerequisites** | Period exists with configured work hours and reserve percent |
| **Steps** | 1. GET `/api/periods/:id/capacity` |
| **Expected Result** | Returns `totalCapacity`, `plannedMinutes`, `reserveMinutes`, `availableMinutes`, and load zones (green/yellow/red). |

### PLAN-07: Fix Plan

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-07 |
| **Description** | Verify plan fixation creates a version |
| **Prerequisites** | Period in `PLANNING` state, tasks assigned |
| **Steps** | 1. POST `/api/periods/:id/fix-plan`<br>2. GET plan version history |
| **Expected Result** | HTTP 200, plan fixed. Version number incremented. Outbox event `PlanFixed` created. |

### PLAN-08: Fix Plan — Only Director Can Modify Fixed Plan

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-08 |
| **Description** | Verify only DIRECTOR can modify a fixed plan |
| **Prerequisites** | Period in `PLAN_FIXED` state, user with employee role |
| **Steps** | 1. Log in as employee<br>2. Attempt to add/remove tasks from fixed plan |
| **Expected Result** | HTTP 403 Forbidden. Log in as DIRECTOR — modification allowed. |

### PLAN-09: Plan Export to YouTrack

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-09 |
| **Description** | Verify plan can be exported to YouTrack |
| **Prerequisites** | Period with fixed plan |
| **Steps** | 1. POST `/api/periods/:id/export-to-youtrack` |
| **Expected Result** | HTTP 200, plan data pushed to YouTrack. Success logged. |

### PLAN-10: Period History

| Field         | Value |
|---------------|-------|
| **ID**        | PLAN-10 |
| **Description** | Verify period state transition history |
| **Prerequisites** | Period has undergone multiple transitions |
| **Steps** | 1. GET `/api/periods/:id/history` |
| **Expected Result** | Returns array of transitions with `fromState`, `toState`, `reason`, `userId`, `createdAt` |

---

## 5. Reporting & Workflow

### RPT-01: Load Fact Data

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-01 |
| **Description** | Verify fact data loading for a period |
| **Prerequisites** | Period in `FACT_LOADING` state, YouTrack configured |
| **Steps** | 1. POST `/api/periods/:id/load-fact`<br>2. Wait for sync to complete |
| **Expected Result** | Work items loaded for the period. Personal report lines generated. Status updated. |

### RPT-02: Personal Report Generation

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-02 |
| **Description** | Verify personal report is generated after fact load |
| **Prerequisites** | Period has loaded fact data |
| **Steps** | 1. GET `/api/reporting/personal?periodId=...&userId=...` |
| **Expected Result** | Returns personal report with lines: `issueId`, `minutes`, `planned/unplanned` status, `baseAmount`, evaluation amounts, totals. |

### RPT-03: Summary Report

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-03 |
| **Description** | Verify summary report for a period |
| **Prerequisites** | Period has personal reports generated |
| **Steps** | 1. GET `/api/reporting/summary?periodId=...` |
| **Expected Result** | Returns `totalPlanned`, `totalActual`, `completionPercent`, `unplannedMinutes`, `remainingMinutes`, `unfinishedTasks` |

### RPT-04: Summary Report Grouping

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-04 |
| **Description** | Verify summary report grouping by system/project/business level |
| **Prerequisites** | Period has report data |
| **Steps** | 1. GET `/api/reporting/summary?periodId=...&groupBy=system`<br>2. GET `/api/reporting/summary?periodId=...&groupBy=project` |
| **Expected Result** | Report grouped correctly with subtotals per group. |

### RPT-05: Planned/Unplanned Flag

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-05 |
| **Description** | Verify planned vs unplanned distinction in reports |
| **Prerequisites** | Period has planned tasks and synced work items |
| **Steps** | 1. GET personal report with detail<br>2. Check unplanned work items |
| **Expected Result** | Work items matching planned tasks marked `planned: true`. Extra work items marked `planned: false`. |

### RPT-06: Remaining Hours Calculation

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-06 |
| **Description** | Verify remaining hours and negative balance display |
| **Prerequisites** | Period has planned and actual data |
| **Steps** | 1. Create a period where actual > planned<br>2. GET summary report |
| **Expected Result** | Remaining hours calculated as `planned - actual`. Negative values shown with red highlight. |

### RPT-07: Period Statistics

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-07 |
| **Description** | Verify period statistics endpoint |
| **Prerequisites** | Period has data |
| **Steps** | 1. GET `/api/reporting/statistics?periodId=...` |
| **Expected Result** | Returns plan completion %, work type distribution, user-level stats, trend data. |

### RPT-08: Report Recalculation

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-08 |
| **Description** | Verify report recalculation after data change |
| **Prerequisites** | Period has existing reports |
| **Steps** | 1. Submit an evaluation change<br>2. POST `/api/reporting/recalculate?periodId=...` |
| **Expected Result** | Reports updated with new evaluation values. No duplicate lines created. |

### RPT-09: Server-side Filtering/Sorting/Pagination

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-09 |
| **Description** | Verify server-side filtering, sorting, and pagination on reports |
| **Prerequisites** | Period has sufficient data (50+ employees) |
| **Steps** | 1. GET `/api/reporting/summary?periodId=...&page=1&limit=10&sortBy=totalActual&sortOrder=desc` |
| **Expected Result** | Results returned with pagination metadata. Sorting applied correctly. |

### RPT-10: Manager Evaluation Submission

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-10 |
| **Description** | Verify manager can submit evaluation for subordinate |
| **Prerequisites** | User with manager role, period in `EVALUATION` state |
| **Steps** | 1. POST `/api/evaluations/manager` with `{ periodId, userId, youtrackIssueId, evaluationType, comment }` |
| **Expected Result** | HTTP 201, evaluation created. Manager can view but not modify business evaluations. |

### RPT-11: Business Evaluation Submission

| Field         | Value |
|---------------|-------|
| **ID**        | RPT-11 |
| **Description** | Verify business evaluation submission with evaluation key |
| **Prerequisites** | Period in `EVALUATION` state, evaluator has business evaluation key |
| **Steps** | 1. POST `/api/evaluations/business` with evaluation key |
| **Expected Result** | HTTP 201, evaluation created. Evaluation key consumed. |

---

## 6. Finance

### FIN-01: Salary Calculation

| Field         | Value |
|---------------|-------|
| **ID**        | FIN-01 |
| **Description** | Verify salary calculation is accurate |
| **Prerequisites** | Employee has rate configured (monthlySalary=10000000, annualMinutes=120000), personal report generated |
| **Steps** | 1. GET personal report<br>2. Manually verify: hourlyRate = monthlySalary / (annualMinutes / 12) |
| **Expected Result** | Calculated amounts match manual verification within rounding tolerance. |

### FIN-02: Effective Rate Calculation

| Field         | Value |
|---------------|-------|
| **ID**        | FIN-02 |
| **Description** | Verify effective rate calculation with evaluations |
| **Prerequisites** | Employee has manager evaluation (e.g., "Good" = 20%) and business evaluation (e.g., "Direct benefit" = 10%) |
| **Steps** | 1. GET personal report<br>2. Check `effectiveRate` and `totalOnHand` |
| **Expected Result** | Effective rate reflects base rate + manager % + business %. `totalOnHand` = `hourlyRate * minutes * (1 + managerPercent + businessPercent)`. |

### FIN-03: Tax Calculation

| Field         | Value |
|---------------|-------|
| **ID**        | FIN-03 |
| **Description** | Verify NDFL and insurance calculations |
| **Prerequisites** | Personal report generated |
| **Steps** | 1. GET personal report<br>2. Verify `ndfl` = `totalOnHand * 0.13` (13% NDFL)<br>3. Verify `insurance` = `totalOnHand * 0.302` (30.2% insurance)<br>4. Verify `totalWithTax` = `totalOnHand + ndfl + insurance` |
| **Expected Result** | All tax amounts calculated per configured rates. |

### FIN-04: Planned Cost Calculation

| Field         | Value |
|---------------|-------|
| **ID**        | FIN-04 |
| **Description** | Verify planned cost calculation |
| **Prerequisites** | Period has planned tasks with assignments |
| **Steps** | 1. GET `/api/finance/planned-cost?periodId=...` |
| **Expected Result** | Returns planned cost broken down by development, testing, management. |

### FIN-05: Actual Cost Calculation

| Field         | Value |
|---------------|-------|
| **ID**        | FIN-05 |
| **Description** | Verify actual cost calculation |
| **Prerequisites** | Period has personal reports generated |
| **Steps** | 1. GET `/api/finance/actual-cost?periodId=...` |
| **Expected Result** | Returns actual cost based on work items and rates. |

### FIN-06: Remaining Cost

| Field         | Value |
|---------------|-------|
| **ID**        | FIN-06 |
| **Description** | Verify remaining cost calculation |
| **Prerequisites** | Period has planned and actual costs |
| **Steps** | 1. GET `/api/finance/remaining-cost?periodId=...` |
| **Expected Result** | Remaining = planned - actual. Correct sign. |

### FIN-07: Freeze Financial Inputs

| Field         | Value |
|---------------|-------|
| **ID**        | FIN-07 |
| **Description** | Verify that financial inputs freeze prevents modification of closed period rates |
| **Prerequisites** | Period transitioned to `EVALUATION` or `CLOSED` |
| **Steps** | 1. Attempt to change rate for an employee after period is closed |
| **Expected Result** | Rate change allowed for current period only. Closed period snapshots remain immutable. |

---

## 7. Period Closing

### CLOSE-01: Close Period

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-01 |
| **Description** | Verify period can be closed by authorized user |
| **Prerequisites** | Period in `EVALUATION` state, user has permission |
| **Steps** | 1. POST `/api/periods/:id/close` |
| **Expected Result** | HTTP 200, period state = `CLOSED`. Snapshot created. |

### CLOSE-02: Snapshot — Employee Rates

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-02 |
| **Description** | Verify employee rates are snapshotted on close |
| **Prerequisites** | Period with rate changes during its lifecycle |
| **Steps** | 1. Close period<br>2. Check `period_snapshots` table for `employeeRates` |
| **Expected Result** | Snapshot contains all employee rates at the moment of closing. |

### CLOSE-03: Snapshot — Formulas and Scales

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-03 |
| **Description** | Verify formulas and evaluation scales are snapshotted |
| **Prerequisites** | Period being closed |
| **Steps** | 1. Close period<br>2. Check snapshot for `formulas` and `evaluationScales` |
| **Expected Result** | Snapshot contains formulas and scales. |

### CLOSE-04: Snapshot — Work Items and Issues

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-04 |
| **Description** | Verify work items and issues are snapshotted |
| **Prerequisites** | Period has work items |
| **Steps** | 1. Close period<br>2. Check snapshot for `workItems`, `issues`, `issueHierarchy` |
| **Expected Result** | All work items and issues captured. Hierarchy preserved. |

### CLOSE-05: Closed Report Immutability

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-05 |
| **Description** | Verify closed period reports are read-only |
| **Prerequisites** | Period is closed |
| **Steps** | 1. Attempt to evaluate a user in a closed period<br>2. Attempt to modify planned tasks in a closed period<br>3. Attempt to load fact for a closed period |
| **Expected Result** | All modifications return HTTP 403 or 400. |

### CLOSE-06: Reopen Period

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-06 |
| **Description** | Verify DIRECTOR can reopen a closed period |
| **Prerequisites** | Period is closed, logged in as DIRECTOR |
| **Steps** | 1. POST `/api/periods/:id/reopen` with `{ reason: "..." }` |
| **Expected Result** | HTTP 200, period state returns to `EVALUATION` or `REOPENED`. Audit log contains reopen entry. |

### CLOSE-07: Reopen — Employee Restriction

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-07 |
| **Description** | Verify non-DIRECTOR cannot reopen a period |
| **Prerequisites** | Period is closed, logged in as employee |
| **Steps** | 1. POST `/api/periods/:id/reopen` |
| **Expected Result** | HTTP 403 Forbidden. |

### CLOSE-08: Close Audit Log

| Field         | Value |
|---------------|-------|
| **ID**        | CLOSE-08 |
| **Description** | Verify close and reopen events are audited |
| **Prerequisites** | Period has been closed and reopened |
| **Steps** | 1. GET `/api/admin/audit-log` with filter `action = 'PERIOD_CLOSED'` or `action = 'PERIOD_REOPENED'` |
| **Expected Result** | Audit log contains entries with userId, periodId, timestamp for both actions. |

---

## 8. Notifications

### NOTIF-01: SMTP Configuration

| Field         | Value |
|---------------|-------|
| **ID**        | NOTIF-01 |
| **Description** | Verify SMTP settings can be configured |
| **Prerequisites** | Logged in as ADMIN |
| **Steps** | 1. Configure SMTP host, port, user, password via admin panel<br>2. Verify settings are saved |
| **Expected Result** | Settings saved. SMTP password stored encrypted (AES-256-GCM). |

### NOTIF-02: Notification Templates

| Field         | Value |
|---------------|-------|
| **ID**        | NOTIF-02 |
| **Description** | Verify notification templates are seeded |
| **Prerequisites** | System is freshly seeded |
| **Steps** | 1. Check `notification_templates` table |
| **Expected Result** | Templates exist for all required events (plan fix, period close, evaluation required, etc.) |

### NOTIF-03: Notification Queue

| Field         | Value |
|---------------|-------|
| **ID**        | NOTIF-03 |
| **Description** | Verify notification jobs are queued and processed |
| **Prerequisites** | Trigger an event that creates a notification (e.g., period close) |
| **Steps** | 1. Trigger event<br>2. Check `notification_runs` table |
| **Expected Result** | Notification created with status `PENDING` → `SENT`. Error status if SMTP not configured. |

### NOTIF-04: Event-Driven Notifications

| Field         | Value |
|---------------|-------|
| **ID**        | NOTIF-04 |
| **Description** | Verify notifications are sent for workflow events |
| **Prerequisites** | SMTP configured |
| **Steps** | 1. Complete a period close<br>2. Check if notification was sent to relevant users |
| **Expected Result** | Email notification sent to users about period closure. NotificationRun created. |

### NOTIF-05: Notification History

| Field         | Value |
|---------------|-------|
| **ID**        | NOTIF-05 |
| **Description** | Verify notification history is accessible |
| **Prerequisites** | Notifications have been sent or attempted |
| **Steps** | 1. GET notification history via admin panel |
| **Expected Result** | Returns list of notification runs with status, recipient, timestamp, error (if failed). |

---

## 9. Export

### EXP-01: Excel Export — Sprint Plan

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-01 |
| **Description** | Verify sprint plan can be exported to Excel |
| **Prerequisites** | Period with fixed plan, logged in as user with permission |
| **Steps** | 1. POST `/api/export/plan?periodId=...&format=xlsx` |
| **Expected Result** | HTTP 200, Excel file downloaded. File contains plan data: tasks, assignees, hours, estimates. |

### EXP-02: Excel Export — Summary Report

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-02 |
| **Description** | Verify summary report can be exported to Excel |
| **Prerequisites** | Period with generated summary report |
| **Steps** | 1. POST `/api/export/summary?periodId=...&format=xlsx` |
| **Expected Result** | HTTP 200, Excel file downloaded. File contains all summary report columns. |

### EXP-03: Excel Export — Personal Report

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-03 |
| **Description** | Verify personal report can be exported to Excel |
| **Prerequisites** | Period with personal report generated for user |
| **Steps** | 1. POST `/api/export/personal?periodId=...&userId=...&format=xlsx` |
| **Expected Result** | HTTP 200, Excel file downloaded. File contains personal report lines and totals. |

### EXP-04: PDF Export — Personal Report

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-04 |
| **Description** | Verify personal report can be exported to PDF |
| **Prerequisites** | Period with personal report generated |
| **Steps** | 1. POST `/api/export/personal?periodId=...&userId=...&format=pdf` |
| **Expected Result** | HTTP 200, PDF file downloaded. File is properly formatted with report data. |

### EXP-05: JSON Export — Accounting Integration

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-05 |
| **Description** | Verify JSON export for accounting integration |
| **Prerequisites** | Period with personal reports generated |
| **Steps** | 1. POST `/api/export/accounting?periodId=...&format=json` |
| **Expected Result** | HTTP 200, JSON file downloaded. Contains structured accounting data (employee, amounts, taxes). |

### EXP-06: Excel Export — Audit Log

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-06 |
| **Description** | Verify audit log export to Excel |
| **Prerequisites** | Audit log contains entries |
| **Steps** | 1. POST `/api/export/audit-log?dateFrom=...&dateTo=...&format=xlsx` |
| **Expected Result** | HTTP 200, Excel file downloaded with audit log entries for the specified period. |

### EXP-07: Async Export Job

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-07 |
| **Description** | Verify large exports are processed asynchronously |
| **Prerequisites** | Large dataset in period |
| **Steps** | 1. POST `/api/export/summary?periodId=...&format=xlsx&async=true` |
| **Expected Result** | HTTP 202, returns export job ID. Progress can be tracked. Download link available when complete. |

### EXP-08: Export Download

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-08 |
| **Description** | Verify export file download from generated link |
| **Prerequisites** | Export job completed, download URL available |
| **Steps** | 1. GET download URL from export job |
| **Expected Result** | HTTP 200, file downloaded. File content matches expected format. |

### EXP-09: Export File Deletion

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-09 |
| **Description** | Verify export files are cleaned up by retention policy |
| **Prerequisites** | Export files present in storage directory |
| **Steps** | 1. POST `/api/admin/retention/run` |
| **Expected Result** | Export files older than `RETENTION_EXPORT_DAYS` (default: 1 day) are deleted. Retention stats updated. |

### EXP-10: Unauthorized Export Access

| Field         | Value |
|---------------|-------|
| **ID**        | EXP-10 |
| **Description** | Verify user cannot export another user's personal report |
| **Prerequisites** | Two users with personal reports in same period |
| **Steps** | 1. Log in as User A<br>2. POST export for User B |
| **Expected Result** | HTTP 403 Forbidden. Export only allowed for own reports. |

---

## Appendix: Test Execution Log

```
## Regression Test Run #<number>

**Date:** YYYY-MM-DD  
**Tester:** <name>  
**Environment:** Docker / PM2 / Development  
**Build Version:** <commit hash>  
**Database Snapshot:** <migration name>

### Results Summary

| Module | Total | Passed | Failed | Skipped | Pass Rate |
|--------|-------|--------|--------|---------|-----------|
| Auth & Security | 12 | 0 | 0 | 0 | 0% |
| Administration | 10 | 0 | 0 | 0 | 0% |
| YouTrack Integration | 7 | 0 | 0 | 0 | 0% |
| Sprint Planning | 10 | 0 | 0 | 0 | 0% |
| Reporting & Workflow | 11 | 0 | 0 | 0 | 0% |
| Finance | 7 | 0 | 0 | 0 | 0% |
| Period Closing | 8 | 0 | 0 | 0 | 0% |
| Notifications | 5 | 0 | 0 | 0 | 0% |
| Export | 10 | 0 | 0 | 0 | 0% |
| **Total** | **80** | **0** | **0** | **0** | **0%** |

### Failed Tests

| ID | Module | Issue | Bug Tracking |
|----|--------|-------|--------------|
| | | | |

### Notes

<additional observations>
```

---

*End of Regression Test Checklist*
