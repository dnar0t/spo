# Performance Test Checklist — СПО (Система Планирования и Отчетности)

**Version:** 1.0.0  
**Last Updated:** 2026-04-27  
**Audience:** QA Engineers, Developers

---

## Table of Contents

1. [Test Scenarios](#1-test-scenarios)
2. [Test Data Volumes](#2-test-data-volumes)
3. [Expected Response Times](#3-expected-response-times)
4. [How to Measure](#4-how-to-measure)
5. [What to Check](#5-what-to-check)

---

## 1. Test Scenarios

### 1.1 Report Generation

| ID | Scenario | Description |
|----|----------|-------------|
| PERF-01 | Personal Report (small) | Generate personal report for an employee with < 10 issues |
| PERF-02 | Personal Report (medium) | Generate personal report for an employee with 10–50 issues |
| PERF-03 | Personal Report (large) | Generate personal report for an employee with 50–200 issues |
| PERF-04 | Summary Report (small) | Generate summary report for a period with < 10 employees |
| PERF-05 | Summary Report (medium) | Generate summary report for a period with 10–50 employees |
| PERF-06 | Summary Report (large) | Generate summary report for a period with 50–200 employees |
| PERF-07 | Summary Report (X-large) | Generate summary report for a period with 200+ employees |
| PERF-08 | Grouped Summary (by system) | Generate summary report grouped by system |
| PERF-09 | Grouped Summary (by project) | Generate summary report grouped by project |
| PERF-10 | Grouped Summary (by business level) | Generate summary report at business grouping level "Story" |

### 1.2 Period Close

| ID | Scenario | Description |
|----|----------|-------------|
| PERF-11 | Period Close (small) | Close period with < 10 employees and < 100 work items |
| PERF-12 | Period Close (medium) | Close period with 10–50 employees and 100–1000 work items |
| PERF-13 | Period Close (large) | Close period with 50–200 employees and 1000–5000 work items |
| PERF-14 | Period Close (X-large) | Close period with 200+ employees and 5000+ work items |
| PERF-15 | Snapshot Creation | Measure time to create period snapshot |
| PERF-16 | Period Reopen | Measure time to reopen a closed period (including snapshot restore) |

### 1.3 Export

| ID | Scenario | Description |
|----|----------|-------------|
| PERF-17 | Excel Export (plan) | Export sprint plan to Excel (medium period) |
| PERF-18 | Excel Export (summary) | Export summary report to Excel (medium period) |
| PERF-19 | Excel Export (personal) | Export personal report to Excel (medium employee) |
| PERF-20 | PDF Export (personal) | Export personal report to PDF (medium employee) |
| PERF-21 | JSON Export (accounting) | Export JSON for accounting integration (medium period) |
| PERF-22 | Excel Export (audit log) | Export audit log to Excel (30 days, 1000+ records) |

### 1.4 YouTrack Sync

| ID | Scenario | Description |
|----|----------|-------------|
| PERF-23 | Full Sync (small) | Full YouTrack sync with < 100 issues |
| PERF-24 | Full Sync (medium) | Full YouTrack sync with 100–1000 issues |
| PERF-25 | Full Sync (large) | Full YouTrack sync with 1000–5000 issues |
| PERF-26 | Fact Load (by period) | Load work items for a period (medium dataset) |
| PERF-27 | Reconciliation | Run work item reconciliation against YouTrack |

### 1.5 API Endpoints

| ID | Scenario | Description |
|----|----------|-------------|
| PERF-28 | GET /api/admin/users (paginated) | List users with pagination (100 users, page 1) |
| PERF-29 | GET /api/admin/audit-log (paginated) | List audit log entries (1000 entries, page 1) |
| PERF-30 | GET /api/youtrack/issues (filtered) | List issues with filters and pagination |
| PERF-31 | GET /api/periods (list) | List periods with pagination |
| PERF-32 | GET /api/reporting/summary (period) | Get summary report for a period |
| PERF-33 | GET /api/reporting/personal (user) | Get personal report for a user |
| PERF-34 | POST /api/admin/retention/run | Trigger retention cleanup (with data to clean) |

---

## 2. Test Data Volumes

### 2.1 Data Size Definitions

| Category | Small | Medium | Large | X-Large |
|----------|-------|--------|-------|---------|
| Employees | < 10 | 10–50 | 50–200 | 200+ |
| YouTrack Issues | < 100 | 100–1000 | 1000–5000 | 5000+ |
| Work Items per Period | < 100 | 100–1000 | 1000–5000 | 5000+ |
| Audit Log Entries | < 1000 | 1000–10000 | 10000–100000 | 100000+ |
| Notification Runs | < 100 | 100–1000 | 1000–5000 | 5000+ |
| Sync Log Entries | < 100 | 100–1000 | 1000–5000 | 5000+ |
| Export Files | < 10 | 10–100 | 100–500 | 500+ |

### 2.2 Test Data Preparation

- Seed script should generate test data at each volume level
- Use realistic data distributions (e.g., 80/20 rule for issue assignment)
- Ensure data relationships are maintained (e.g., user → issues → work items → reports)
- Test with both evenly distributed and skewed data distributions

---

## 3. Expected Response Times

### 3.1 API Endpoint Response Times

| Endpoint Category | Small | Medium | Large | X-Large |
|-------------------|-------|--------|-------|---------|
| Simple CRUD (GET list) | < 200ms | < 500ms | < 1000ms | < 2000ms |
| Simple CRUD (GET detail) | < 100ms | < 200ms | < 300ms | < 500ms |
| Report Generation | < 500ms | < 2000ms | < 5000ms | < 10000ms |
| Export Generation | < 2000ms | < 5000ms | < 15000ms | < 30000ms |
| Period Close | < 1000ms | < 5000ms | < 15000ms | < 30000ms |
| YouTrack Sync | < 30000ms | < 60000ms | < 120000ms | < 300000ms |
| Retention Cleanup | < 1000ms | < 5000ms | < 10000ms | < 30000ms |

### 3.2 Concurrent Load

| Scenario | Concurrent Users | Expected P95 | Expected P99 | Error Rate |
|----------|-----------------|--------------|--------------|------------|
| Normal load | 10 | < 1000ms | < 3000ms | < 0.1% |
| Peak load | 50 | < 3000ms | < 5000ms | < 0.5% |
| Stress test | 100+ | < 5000ms | < 10000ms | < 1% |

---

## 4. How to Measure

### 4.1 Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| **k6** (recommended) | Load testing and benchmarking | `npm install -g k6` or download from https://k6.io |
| **autocannon** | HTTP benchmarking | `npm install -g autocannon` |
| **wrk** | HTTP benchmarking | `apt install wrk` or `brew install wrk` |
| **Postman / Newman** | API test collection runner | Download from https://postman.com |
| **pg_stat_statements** | Database query performance tracking | Enable via PostgreSQL config |

### 4.2 k6 Test Template

```javascript
// k6-performance-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '3m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.01'],           // Error rate < 1%
    http_req_duration: ['p(95)<3000', 'p(99)<5000'], // P95 < 3s, P99 < 5s
  },
};

const BASE_URL = 'https://spo.example.com/api';

export default function () {
  const headers = {
    'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Health check
  const healthResp = http.get(`${BASE_URL}/health`);
  check(healthResp, { 'health status is 200': (r) => r.status === 200 });
  responseTime.add(healthResp.timings.duration);

  // Test 2: Get users list
  const usersResp = http.get(`${BASE_URL}/admin/users?limit=20`, { headers });
  check(usersResp, { 'users list is 200': (r) => r.status === 200 });
  responseTime.add(usersResp.timings.duration);

  // Test 3: Get periods list
  const periodsResp = http.get(`${BASE_URL}/periods?limit=10`, { headers });
  check(periodsResp, { 'periods list is 200': (r) => r.status === 200 });
  responseTime.add(periodsResp.timings.duration);

  sleep(1);
}
```

### 4.3 Manual Measurement Steps

1. **Enable query logging in PostgreSQL:**
   ```sql
   SET log_min_duration_statement = 500;  -- Log queries taking > 500ms
   ```

2. **Monitor database connections:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **Track slow queries:**
   ```sql
   SELECT query, calls, mean_time, total_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 20;
   ```

4. **Use `time` command for script execution:**
   ```bash
   time curl -s https://spo.example.com/api/admin/retention/run -X POST
   ```

5. **Use Docker stats for container resource usage:**
   ```bash
   docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
   ```

---

## 5. What to Check

### 5.1 CPU Usage

| Check | Threshold | Tool |
|-------|-----------|------|
| Backend container CPU | < 80% sustained | `docker stats` |
| PostgreSQL CPU | < 70% sustained | `docker stats` or `top` |
| Redis CPU | < 50% sustained | `docker stats` |
| Overall server CPU | < 80% average over 5 min | `top`, `htop`, Prometheus |

**What to look for:**
- CPU spikes during period close operations
- High CPU during report generation (especially grouped reports)
- CPU contention between services
- Unexpected CPU usage during idle periods

### 5.2 Memory Usage

| Check | Threshold | Tool |
|-------|-----------|------|
| Backend container memory | < 80% of limit (512MB) | `docker stats` |
| PostgreSQL shared_buffers | < 80% allocated | PostgreSQL monitoring |
| Redis memory | < 80% of `maxmemory` | `INFO memory` |
| System memory (without swap) | < 85% | `free -m` |
| Swap usage | 0 (swap should not be used) | `swapon -s` |

**What to look for:**
- Memory leaks over time (steady increase in backend memory)
- Growth in database connection memory
- Large export files consuming RAM during generation
- Redis memory fragmentation

### 5.3 Database Query Performance

| Check | Threshold | Tool |
|-------|-----------|------|
| Average query time | < 100ms | `pg_stat_statements` |
| P95 query time | < 500ms | `pg_stat_statements` |
| Max query time | < 5000ms | `pg_stat_statements` |
| Connections active | < 50 concurrent | `pg_stat_activity` |
| Connection wait time | < 10% of connections waiting | `pg_stat_activity` |
| Cache hit ratio | > 99% | `pg_statio_user_tables` |
| Index scans | > 90% of all scans | `pg_stat_user_indexes` |

**What to look for:**
- Sequential scans on large tables (missing indexes)
- Long-running queries blocking other operations
- Lock contention during period close or report generation
- `temp_files` creation (indicates work_mem is too low)

### 5.4 API Response Times

| Check | Threshold | Tool |
|-------|-----------|------|
| P50 response time | < 300ms | k6, autocannon |
| P95 response time | < 2000ms | k6, autocannon |
| P99 response time | < 5000ms | k6, autocannon |
| Max response time | < 30000ms | k6, autocannon |
| Error rate | < 1% | k6, autocannon |
| Timeout rate | 0% | k6, autocannon |

**What to look for:**
- Endpoints that consistently perform poorly
- Degradation under concurrent load
- Endpoints that don't paginate large datasets server-side
- N+1 query patterns

### 5.5 Export Generation

| Check | Threshold | Tool |
|-------|-----------|------|
| Excel export (medium) | < 5000ms | Application logs |
| PDF export (medium) | < 10000ms | Application logs |
| Export file size | < 50 MB | Filesystem |
| Export disk usage | < 1 GB total | `du -sh exports/` |
| Export job completion rate | 100% | Database export_jobs table |

**What to look for:**
- Memory spikes during large export generation
- Very large export files causing download issues
- Export jobs stuck in "PENDING" state
- Disk space filling up with export files

### 5.6 Period Close

| Check | Threshold | Tool |
|-------|-----------|------|
| Time to close (medium) | < 5000ms | Application logs |
| Time to create snapshot | < 10000ms | Application logs |
| Snapshot size | < 500 MB | Database |
| Transaction duration | < 30000ms | PostgreSQL logs |
| Lock duration | < 5000ms | `pg_locks` |

**What to look for:**
- Long-running transactions blocking reads
- Snapshot size growing unexpectedly
- Deadlocks during concurrent operations
- Timeout errors during close

### 5.7 YouTrack Sync

| Check | Threshold | Tool |
|-------|-----------|------|
| Full sync (medium) | < 120000ms (2 min) | Sync run logs |
| Fact load (medium period) | < 60000ms | Sync run logs |
| API calls to YouTrack | < 100 per sync | YouTrack logs |
| Retry count per sync | < 5 total | Sync run errors |
| Error count per sync | < 10 total | Sync run errors |
| Data consistency | 100% | Reconciliation check |

**What to look for:**
- Rate limiting from YouTrack API
- Timeout errors on slow YouTrack responses
- Data inconsistency between YouTrack and local DB
- Sync duration increasing over time

### 5.8 Network

| Check | Threshold | Tool |
|-------|-----------|------|
| Backend → PostgreSQL latency | < 1ms | `ping` from backend container |
| Backend → Redis latency | < 1ms | `redis-cli --latency` |
| Backend → YouTrack latency | < 200ms | `curl -w %{time_total}` |
| Nginx → Backend latency | < 2ms | Nginx access logs |

---

## Appendix: Test Execution Log Template

Use this template to record each performance test run.

```
## Performance Test Run #<number>

**Date:** YYYY-MM-DD  
**Tester:** <name>  
**Environment:** Docker / PM2 / Kubernetes  
**Dataset Size:** Small / Medium / Large / X-Large  
**Build Version:** <commit hash>

### Results Summary

| Scenario ID | Endpoint / Operation | Response Time (ms) | Result |
|-------------|----------------------|--------------------|--------|
| PERF-01     | Personal Report (small) | ??? | ✅ PASS / ❌ FAIL |
| PERF-02     | Personal Report (medium) | ??? | ✅ PASS / ❌ FAIL |
| ...         | ...                  | ...                | ...    |

### Resource Usage (Peak)

| Resource | Value | Notes |
|----------|-------|-------|
| CPU (server) | ???% | |
| Memory (server) | ???% | |
| CPU (backend) | ???% | |
| Memory (backend) | ??? MB | |
| DB Connections | ??? | |
| Disk I/O | ??? MB/s | |

### Issues Found

1. <description>
2. <description>

### Notes

<additional observations>
```
