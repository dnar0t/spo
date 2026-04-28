# Operational Runbook — СПО (Система Планирования и Отчетности)

**Version:** 1.0.0  
**Last Updated:** 2026-04-27  
**Audience:** System Administrators, DevOps Engineers, Support Team

---

## Table of Contents

1. [Daily Operations](#1-daily-operations)
2. [Weekly Operations](#2-weekly-operations)
3. [Monthly Operations](#3-monthly-operations)
4. [Incident Response](#4-incident-response)
5. [Recovery Procedures](#5-recovery-procedures)
6. [Monitoring Alerts](#6-monitoring-alerts)

---

## 1. Daily Operations

### 1.1 Health Check Verification

**When:** Every morning, 09:00

**Steps:**
1. Check the health endpoint:
   ```bash
   curl -s https://spo.example.com/api/health | jq .
   ```

2. Verify all services report `"status": "ok"`:
   - Backend status
   - Database connection
   - Redis connection

3. Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-04-27T09:00:00.000Z",
     "uptime": 86400,
     "database": "connected",
     "redis": "connected"
   }
   ```

4. If any service is unhealthy, follow the [Incident Response](#4-incident-response) section.

### 1.2 Review Sync Logs

**When:** Every morning, 09:30

**Steps:**
1. Check the latest YouTrack sync run status:
   ```bash
   curl -s https://spo.example.com/api/youtrack/sync-runs?limit=5 | jq .
   ```

2. Verify:
   - Last sync completed successfully (`status: "COMPLETED"`)
   - No excessive error count (`errorCount: 0`)
   - Sync duration is within expected range

3. If sync failed, check sync run details:
   ```bash
   # Replace <sync-run-id> with the actual ID
   curl -s https://spo.example.com/api/youtrack/sync-runs/<sync-run-id> | jq .
   ```

4. Review error details and escalate if issues persist.

### 1.3 Monitor Export Directory

**When:** Every morning, 10:00

**Steps:**
1. Check disk usage of the export directory:
   ```bash
   # Docker
   docker exec spo-backend sh -c "du -sh /app/exports"
   
   # Manual deployment
   du -sh /opt/spo/packages/backend/exports
   ```

2. Verify export files are being cleaned up by retention policy:
   ```bash
   curl -s https://spo.example.com/api/admin/retention/stats | jq .
   ```

3. If export directory is growing unexpectedly, manually trigger retention cleanup:
   ```bash
   curl -X POST https://spo.example.com/api/admin/retention/run \
     -H "Authorization: Bearer <admin-token>"
   ```

---

## 2. Weekly Operations

### 2.1 Review Audit Logs

**When:** Every Monday, 10:00

**Steps:**
1. Review audit log for suspicious activity:
   ```bash
   # Last 7 days, failed actions
   curl -s "https://spo.example.com/api/admin/audit-log?dateFrom=$(date -d '7 days ago' +%Y-%m-%d)&limit=50" | jq '.data[] | select(.action | test("FAILED|ERROR|DENIED"))'
   ```

2. Verify critical operations were logged:
   - User creation/deactivation
   - Role assignments
   - Period close/reopen
   - Plan fix/unfix
   - Settings changes

3. Check for unauthorized access attempts:
   ```bash
   curl -s "https://spo.example.com/api/admin/audit-log?action=ACCESS_DENIED&dateFrom=$(date -d '7 days ago' +%Y-%m-%d)" | jq .
   ```

### 2.2 Check Backup Integrity

**When:** Every Monday, 11:00

**Steps:**
1. List available backups:
   ```bash
   docker exec spo-backup sh -c "ls -lh /backups/db/"
   ```

2. Verify the most recent backup exists and is recent (within 48 hours):
   ```bash
   # Check latest backup timestamp
   docker exec spo-backup sh -c "ls -lt /backups/db/spo_backup_*.sql | head -1"
   ```

3. Test backup integrity by checking file header:
   ```bash
   # Verify it's a valid PostgreSQL custom format dump
   docker exec spo-postgres sh -c "pg_restore --list /backups/db/$(docker exec spo-backup sh -c 'ls -t /backups/db/spo_backup_*.sql | head -1')" | head -10
   ```

4. Verify backup log for errors:
   ```bash
   cat docker/backups/backup.log | grep -i "ERROR\|FAILED"
   ```

5. Check that old backups are being cleaned up per retention policy (default: 30 days).

### 2.3 Review Performance Metrics

**When:** Every Monday, 14:00

**Steps:**
1. Check API response times (if Prometheus/Grafana is set up):
   - P95 response time should be < 1000ms
   - P99 response time should be < 3000ms

2. Review database query performance:
   ```bash
   docker exec spo-postgres sh -c "psql -U spo -c \"SELECT query, calls, mean_time::numeric(10,2) as avg_ms, total_time::numeric(10,2) as total_ms FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 20;\""
   ```

3. Check for slow queries (mean_time > 1000ms) and identify optimization opportunities.

4. Review resource usage trends:
   ```bash
   # Docker stats snapshot
   docker stats --no-stream
   ```

---

## 3. Monthly Operations

### 3.1 Period Close Verification

**When:** After each period close

**Steps:**
1. Verify the period state transitioned to `CLOSED`:
   ```bash
   curl -s "https://spo.example.com/api/periods?state=CLOSED&limit=1" | jq .
   ```

2. Confirm snapshot was created:
   ```bash
   # Check period snapshots via database
   docker exec spo-postgres sh -c "psql -U spo -c 'SELECT COUNT(*) FROM period_snapshots;'"
   ```

3. Verify closed report immutability:
   - Attempt to modify a closed period report (should fail with 403 Forbidden)
   - Verify audit log contains close event

4. Check that period summary data is consistent:
   - Total planned hours ≈ total actual hours + remaining
   - Completion percent is within expected range

### 3.2 Retention Cleanup Verification

**When:** First day of each month, 10:00

**Steps:**
1. Check retention statistics before cleanup:
   ```bash
   curl -s https://spo.example.com/api/admin/retention/stats | jq .
   ```

2. Review the counts of records scheduled for cleanup:
   - Export files (> 1 day old)
   - Notification runs (> 90 days old)
   - Audit logs (> 365 days old)
   - Sync log entries (> 90 days old)
   - Login attempts (> 90 days old)

3. If counts seem abnormally high, investigate before running cleanup:
   - Check for retention configuration issues
   - Verify cron job is running daily

4. Trigger manual cleanup and verify results:
   ```bash
   curl -X POST https://spo.example.com/api/admin/retention/run \
     -H "Authorization: Bearer <admin-token>" | jq .
   ```

### 3.3 Review User Access

**When:** First day of each month, 11:00

**Steps:**
1. List all active users:
   ```bash
   curl -s "https://spo.example.com/api/admin/users?limit=100" | jq '.data[] | {id, login, fullName, isActive, roles}'
   ```

2. Verify terminated employees are deactivated in the system.

3. Review users with ADMIN role:
   ```bash
   curl -s "https://spo.example.com/api/admin/users?limit=100" | jq '.data[] | select(.roles | index("ADMIN"))'
   ```

4. Ensure ADMIN access is limited to authorized personnel only.

5. Check for inactive user accounts (> 90 days without login):
   - Review login attempt history
   - Consider deactivation if no activity

---

## 4. Incident Response

### 4.1 Database Connection Failure

**Severity:** Critical  
**Response Time:** Immediate  

**Symptoms:**
- Health check shows `"database": "disconnected"`
- Backend returns 500 errors
- Users cannot log in or access data

**Immediate Actions:**
1. Check PostgreSQL status:
   ```bash
   docker compose -f docker/docker-compose.prod.yml ps postgres
   docker logs spo-postgres --tail 50
   ```

2. Check database connectivity:
   ```bash
   docker exec spo-backend sh -c "nc -zv postgres 5432"
   docker exec spo-postgres sh -c "pg_isready -U spo"
   ```

3. If PostgreSQL is down, restart the service:
   ```bash
   docker compose -f docker/docker-compose.prod.yml restart postgres
   ```

4. If container is unhealthy, check volume and disk:
   ```bash
   df -h
   docker volume inspect spo-postgres-data
   ```

**Root Cause Analysis:**
- Check PostgreSQL logs for corruption or out-of-disk errors
- Verify max_connections hasn't been exceeded
- Check for long-running queries blocking connections

**Resolution:**
1. If disk full: free up space, then restart PostgreSQL
2. If corrupted: restore from latest backup (see [Database Restore](#51-database-restore))
3. If connection pool exhausted: increase `max_connections` or fix connection leaks

**Post-Incident:**
- Update runbook with prevention measures
- Consider adding database connection pooling (PgBouncer)
- Set up disk usage alerting

### 4.2 YouTrack Sync Failure

**Severity:** High  
**Response Time:** Within 1 hour during business hours  

**Symptoms:**
- Sync run status shows `ERROR`
- `POST /api/youtrack/sync` returns error
- Period fact loading fails

**Immediate Actions:**
1. Check sync run details:
   ```bash
   curl -s https://spo.example.com/api/youtrack/sync-runs?limit=1 | jq .
   ```

2. Test YouTrack connection:
   ```bash
   curl -X POST https://spo.example.com/api/youtrack/test-connection \
     -H "Authorization: Bearer <admin-token>"
   ```

3. Review error details in sync logs:
   ```bash
   curl -s https://spo.example.com/api/youtrack/sync-runs/<sync-run-id> | jq '.logs'
   ```

4. Check backend logs:
   ```bash
   docker logs spo-backend --tail 100 | grep -i youtrack
   ```

**Root Cause Analysis:**
- YouTrack API rate limiting (check response headers)
- YouTrack API endpoint changes
- Network connectivity issues
- API token expired or revoked
- Field mapping changes in YouTrack

**Resolution:**
1. Rate limiting: wait for cooldown period, reduce sync frequency
2. API changes: update field mapping in admin panel
3. Network: check firewall rules and DNS resolution
4. Token: regenerate API token in YouTrack and update in SPO

**Prevention:**
- Monitor sync success rate
- Set up alerting for sync failures
- Keep field mapping documentation up to date

### 4.3 Email Delivery Failure

**Severity:** Medium  
**Response Time:** Within 4 hours  

**Symptoms:**
- Notification run status shows `ERROR`
- Users report not receiving email notifications
- Backend logs show SMTP errors

**Immediate Actions:**
1. Check SMTP configuration:
   ```bash
   docker exec spo-backend sh -c "env | grep SMTP"
   ```

2. Test SMTP connection:
   ```bash
   docker exec spo-backend sh -c "nc -zv $SMTP_HOST $SMTP_PORT"
   ```

3. Check backend logs for SMTP errors:
   ```bash
   docker logs spo-backend --tail 100 | grep -i "smtp\|email\|mail"
   ```

**Root Cause Analysis:**
- SMTP server unreachable
- Invalid credentials
- Sender address not allowed
- SMTP rate limiting
- TLS/SSL version mismatch

**Resolution:**
1. Verify SMTP credentials are correct and not expired
2. Check if SMTP server allows relaying from the SPO server IP
3. Update SMTP settings in `.env` and restart backend:
   ```bash
   docker compose -f docker/docker-compose.prod.yml restart backend
   ```
4. Check email queue for stuck messages

**Prevention:**
- Monitor email delivery success rate
- Set up alerts for failed notifications
- Maintain SMTP provider redundancy (secondary SMTP)

### 4.4 Performance Degradation

**Severity:** High  
**Response Time:** Within 2 hours during business hours  

**Symptoms:**
- Slow page loads and API responses
- Users reporting timeouts
- High CPU/memory usage on server

**Immediate Actions:**
1. Check server resources:
   ```bash
   top -bn1 | head -20
   df -h
   free -m
   ```

2. Check Docker resource usage:
   ```bash
   docker stats --no-stream
   ```

3. Identify slow API endpoints (if APM is configured):
   - Check response time percentiles
   - Identify endpoints with highest latency

4. Check for long-running database queries:
   ```bash
   docker exec spo-postgres sh -c "psql -U spo -c \"SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 20;\""
   ```

**Root Cause Analysis:**
- High load from concurrent users
- Unexpected surge in API requests
- Missing database indexes
- Slow external API calls (YouTrack)
- Memory leak in application
- Insufficient server resources

**Resolution:**
1. **High load:**
   - Scale up backend instances (increase `instances` in PM2 or add backend containers)
   - Temporarily increase rate limiting if under attack
   - Consider adding a CDN or caching layer

2. **Database:**
   - Add missing indexes (analyze slow queries)
   - Run `ANALYZE` to update query planner statistics
   - Increase `work_mem` and `shared_buffers` temporarily

3. **Memory leak:**
   - Restart backend service (temporary fix)
   - Monitor memory usage patterns for diagnosis
   - Check for unclosed database connections

4. **External API:**
   - Reduce sync frequency
   - Implement caching for YouTrack data
   - Consider async processing for non-critical operations

**Post-Incident:**
- Review and optimize slow queries
- Implement performance monitoring (if not already in place)
- Consider horizontal scaling strategy
- Update capacity planning estimates

### 4.5 Security Incident

**Severity:** Critical  
**Response Time:** Immediate  

**Symptoms:**
- Unauthorized access detected
- Suspicious login attempts (brute force)
- Data breach suspicion
- API token compromise

**Immediate Actions:**
1. **Isolate the affected system:**
   - Block the attacking IP address at the firewall level
   - Temporarily disable compromised user accounts
   - Rotate all API tokens and secrets

2. **Preserve evidence:**
   - Capture logs before any cleanup
   - Take a snapshot of the current state
   - Record timestamps of suspicious activities

3. **Audit log review:**
   ```bash
   # Check for failed login attempts
   curl -s "https://spo.example.com/api/admin/audit-log?action=LOGIN_FAILED&dateFrom=$(date -d '24 hours ago' +%Y-%m-%d)" | jq .
   
   # Check for suspicious role assignments
   curl -s "https://spo.example.com/api/admin/audit-log?action=ROLE_ASSIGNED&dateFrom=$(date -d '24 hours ago' +%Y-%m-%d)" | jq .
   ```

4. **Rotate credentials:**
   - `JWT_SECRET`
   - `DB_PASSWORD`
   - `YOUTRACK_API_TOKEN`
   - `ENCRYPTION_KEY`
   - SMTP credentials

**Root Cause Analysis:**
- Determine entry point (weak password, vulnerability, exposed API)
- Review recent code changes for security vulnerabilities
- Check for exposed environment variables or secrets in logs

**Resolution:**
1. Patch the vulnerability
2. Restore from clean backup if data was compromised
3. Implement additional security controls:
   - IP whitelisting for admin endpoints
   - Two-factor authentication
   - Enhanced audit logging
   - Intrusion detection (fail2ban, WAF)

**Post-Incident:**
- Conduct full security review
- Update security policies
- Document lessons learned
- Report to security team/management as applicable

---

## 5. Recovery Procedures

### 5.1 Database Restore

**Prerequisites:**
- Latest backup file available
- Database service is running
- Admin access to PostgreSQL

**Procedure:**

1. **Stop the backend application:**
   ```bash
   docker compose -f docker/docker-compose.prod.yml stop backend
   ```

2. **List available backups:**
   ```bash
   docker exec spo-backup sh -c "ls -lh /backups/db/"
   ```

3. **Choose the backup to restore:**

   Option A — Using the restore script (interactive):
   ```bash
   cd docker/backups
   docker exec -it spo-backup sh -c "BACKUP_DIR=/backups/db /backups/restore.sh"
   ```

   Option B — Using the restore script (direct file):
   ```bash
   docker exec spo-backup sh -c "BACKUP_DIR=/backups/db /backups/restore.sh spo_backup_20260427_000000.sql"
   ```

   Option C — Manual restore:
   ```bash
   # Drop existing connections
   docker exec spo-postgres sh -c "psql -U spo -d postgres -c \"SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'spo' AND pid <> pg_backend_pid();\""
   
   # Drop and recreate database
   docker exec spo-postgres sh -c "psql -U spo -d postgres -c 'DROP DATABASE IF EXISTS spo;'"
   docker exec spo-postgres sh -c "psql -U spo -d postgres -c 'CREATE DATABASE spo;'"
   
   # Restore
   docker exec spo-postgres sh -c "pg_restore -U spo -d spo --clean /backups/db/spo_backup_20260427_000000.sql"
   ```

4. **Verify the restore:**
   ```bash
   docker exec spo-postgres sh -c "psql -U spo -d spo -c 'SELECT COUNT(*) FROM users;'"
   ```

5. **Restart the backend:**
   ```bash
   docker compose -f docker/docker-compose.prod.yml start backend
   ```

6. **Verify application health:**
   ```bash
   curl -s https://spo.example.com/api/health | jq .
   ```

### 5.2 Container Restart

**Single container restart:**
```bash
# Restart a specific service
docker compose -f docker/docker-compose.prod.yml restart backend

# Check logs after restart
docker compose -f docker/docker-compose.prod.yml logs --tail=20 backend
```

**Full stack restart:**
```bash
# Graceful restart of all services
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d

# Wait for all services to be healthy
docker compose -f docker/docker-compose.prod.yml ps
```

**Rebuild and restart (after code update):**
```bash
# Pull latest code
git pull origin main

# Rebuild backend image
docker compose -f docker/docker-compose.prod.yml build backend

# Apply database migrations
cd packages/backend
npx prisma migrate deploy --schema=src/infrastructure/prisma/prisma/schema.prisma

# Restart with new image
docker compose -f docker/docker-compose.prod.yml up -d --force-recreate backend
```

### 5.3 Application Restart (Manual Deployment)

**Using PM2:**
```bash
# Graceful restart
pm2 reload spo-backend

# Hard restart
pm2 restart spo-backend

# Stop and start
pm2 stop spo-backend
pm2 start spo-backend
```

**After code update:**
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --workspaces --include-workspace-root

# Build
npm run build

# Run migrations
cd packages/backend
npx prisma migrate deploy --schema=src/infrastructure/prisma/prisma/schema.prisma

# Restart
pm2 reload spo-backend
```

### 5.4 Full Disaster Recovery

**Scenario:** Complete server failure (hardware, OS corruption, catastrophic failure)

**Prerequisites:**
- Latest backup stored off-site / S3
- Infrastructure-as-code (Docker Compose, configuration)
- Server provisioning scripts available

**Procedure:**

1. **Provision a new server:**
   - Deploy a new server with the same specifications
   - Install Docker, Docker Compose, Git
   - Configure firewall and security groups

2. **Deploy the application:**
   ```bash
   git clone <repository-url> /opt/spo
   cd /opt/spo
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Restore the database:**
   - Copy the latest backup from off-site storage to the server
   ```bash
   scp user@backup-server:/path/to/backup.sql /opt/spo/docker/backups/
   ```
   - Start PostgreSQL only
   ```bash
   docker compose -f docker/docker-compose.prod.yml up -d postgres
   ```
   - Restore the database (see [Database Restore](#51-database-restore))

4. **Start remaining services:**
   ```bash
   docker compose -f docker/docker-compose.prod.yml up -d
   ```

5. **Verify everything:**
   - Check health endpoint
   - Verify user authentication works
   - Verify YouTrack sync
   - Run retention cleanup

6. **Update DNS records** to point to the new server (if IP changed)

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 24 hours (daily backups)

---

## 6. Monitoring Alerts

### 6.1 What to Monitor

| Component          | Metric                      | Severity | Alert Method        |
|--------------------|-----------------------------|----------|---------------------|
| Backend            | Service down                | Critical | Email, SMS, Slack   |
| Backend            | HTTP 5xx rate > 1%          | High     | Email, Slack        |
| Backend            | Response time P95 > 2s      | High     | Slack               |
| PostgreSQL         | Connection count > 80       | High     | Slack               |
| PostgreSQL         | Replication lag > 30s       | High     | Email, Slack        |
| PostgreSQL         | Disk usage > 85%            | Warning  | Slack               |
| Server             | CPU usage > 80% for 5m      | High     | Slack               |
| Server             | Memory usage > 85%          | High     | Slack               |
| Server             | Disk usage > 85%            | Warning  | Email, Slack        |
| Server             | Disk usage > 95%            | Critical | Email, SMS, Slack   |
| YouTrack Sync      | Sync failure                | High     | Email, Slack        |
| YouTrack Sync      | Sync not run in 12h         | Warning  | Slack               |
| Backup             | Backup failure              | High     | Email, Slack        |
| Backup             | No backup in 48h            | Critical | Email, SMS, Slack   |
| SSL Certificate    | Expiring in < 30 days       | Warning  | Email, Slack        |
| SSL Certificate    | Expired                     | Critical | Email, SMS, Slack   |

### 6.2 Alert Thresholds

| Level    | Response Time | Notification       | Action Required               |
|----------|---------------|--------------------|-------------------------------|
| Critical | Immediate     | SMS + Phone call   | On-call engineer responds     |
| High     | 1 hour        | Email + Slack      | Team lead responds            |
| Warning  | 4 hours       | Slack only         | Investigate during next check |
| Info     | Next business day | None           | Logged for trend analysis     |

### 6.3 Escalation Procedures

**Level 1 — On-Call Engineer (Immediate Response)**

- First responder for all Critical and High alerts
- Follow runbook procedures for known incidents
- Escalate to Level 2 if:
  - Incident not resolved within 30 minutes
  - Data loss is suspected
  - Security incident is confirmed
  - Multiple interconnected services are affected

**Level 2 — Senior Engineer / Team Lead**

- Handles complex incidents requiring deeper investigation
- Coordinates cross-service recovery
- Authorizes service degradation or downtime if necessary
- Escalate to Level 3 if:
  - Incident requires infrastructure changes
  - External vendor involvement needed
  - Critical data recovery needed

**Level 3 — DevOps Manager / Architecture Team**

- Authorizes disaster recovery procedures
- Coordinates with external vendors (YouTrack, SMTP, hosting)
- Makes decisions on service restoration priorities
- Conducts post-incident review

### 6.4 Escalation Contacts

| Level  | Role              | Contact Method        |
|--------|-------------------|-----------------------|
| L1     | On-Call Engineer  | Phone: [On-call number] |
| L2     | Senior Engineer   | Phone: [Senior phone]   |
| L2     | Team Lead         | Email: [Team lead email] |
| L3     | DevOps Manager    | Phone: [Manager phone]   |
| L3     | Security Officer  | Email: [Security email]   |
| L3     | System Architect  | Email: [Architect email]  |

---

## Appendix: Quick Reference

### Key Commands

```bash
# Service status
docker compose -f docker/docker-compose.prod.yml ps

# Health check
curl https://spo.example.com/api/health

# View logs (all services)
docker compose -f docker/docker-compose.prod.yml logs --tail=50

# View logs (single service)
docker compose -f docker/docker-compose.prod.yml logs --tail=50 backend

# Database query
docker exec spo-postgres sh -c "psql -U spo -d spo -c 'SELECT * FROM users LIMIT 5;'"

# Check database connections
docker exec spo-postgres sh -c "psql -U spo -c 'SELECT count(*) FROM pg_stat_activity;'"

# Run retention cleanup
curl -X POST https://spo.example.com/api/admin/retention/run -H "Authorization: Bearer <token>"

# Manual database backup
docker exec spo-backup sh -c "BACKUP_DIR=/backups/db /backups/backup.sh"

# Restart application
docker compose -f docker/docker-compose.prod.yml restart backend

# Full restart
docker compose -f docker/docker-compose.prod.yml down && docker compose -f docker/docker-compose.prod.yml up -d
```

### Contact Information

| Service       | Contact             | Notes                          |
|---------------|---------------------|--------------------------------|
| YouTrack      | [YouTrack admin]    | API token management           |
| SMTP          | [Email admin]       | SMTP credentials and quotas    |
| Server/Hosting| [Infra team]        | Server provisioning and access |
| Database      | [DBA team]          | Database performance and tuning|
| Security      | [Security team]     | Incident response and auditing |
```

Now let me create the performance test checklist and regression test checklist:

```
**Tool call continues on next page...**