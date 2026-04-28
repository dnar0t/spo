# Deployment Guide — СПО (Система Планирования и Отчетности)

**Version:** 1.0.0  
**Last Updated:** 2026-04-27  
**Audience:** DevOps Engineers, System Administrators

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Production Deployment Options](#3-production-deployment-options)
   - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
   - [Option B: Manual Deployment with PM2](#option-b-manual-deployment-with-pm2)
   - [Option C: Kubernetes (Future)](#option-c-kubernetes-future)
4. [Docker Compose Production Setup](#4-docker-compose-production-setup)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Database Management](#6-database-management)
7. [Logging and Monitoring](#7-logging-and-monitoring)
8. [Security Checklist](#8-security-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 2 cores | 4+ cores    |
| RAM      | 4 GB    | 8 GB        |
| Disk     | 20 GB   | 50 GB SSD   |
| Network  | 100 Mbps| 1 Gbps      |

### Required Software

| Software       | Version   | Purpose                    |
|----------------|-----------|----------------------------|
| Node.js        | 20.x LTS  | Backend runtime            |
| PostgreSQL     | 16.x      | Primary database           |
| Redis          | 7.x       | Caching & session storage  |
| Docker         | 24.x+     | Container runtime          |
| Docker Compose | 2.x+      | Container orchestration    |
| Nginx          | 1.25.x    | Reverse proxy & SSL        |
| Git            | 2.x       | Source control              |

### Domain and SSL

- A registered domain name (e.g., `spo.example.com`)
- SSL/TLS certificate (Let's Encrypt, commercial CA, or internal CA)
- DNS A/AAAA record pointing to the server's public IP

---

## 2. Environment Setup

### Step 1: Clone Repository

```bash
git clone <repository-url> /opt/spo
cd /opt/spo
```

### Step 2: Install Dependencies

```bash
# Using npm workspaces
npm ci --workspaces --include-workspace-root

# If deploying manually (without Docker), also install global PM2
npm install -g pm2
```

### Step 3: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit the file with production values
nano .env
```

See the [Environment Variables Reference](#5-environment-variables-reference) for a complete list.

### Step 4: Run Database Migrations

```bash
# Using Prisma
cd packages/backend
npx prisma migrate deploy --schema=src/infrastructure/prisma/prisma/schema.prisma
```

### Step 5: Seed Initial Data

```bash
# Seed roles, admin user, dictionaries, notification templates
npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts
```

### Step 6: Build the Application

```bash
# Build shared library and backend
npm run build
```

---

## 3. Production Deployment Options

### Option A: Docker Compose (Recommended)

The simplest and most reliable deployment method. All services run in isolated containers.

```bash
# Start all services
docker compose -f docker/docker-compose.prod.yml up -d

# Check status
docker compose -f docker/docker-compose.prod.yml ps

# View logs
docker compose -f docker/docker-compose.prod.yml logs -f

# Stop all services
docker compose -f docker/docker-compose.prod.yml down
```

**Pros:**
- Consistent environment across deployments
- Easy scaling and updates
- Built-in health checks and restart policies

**Cons:**
- Requires Docker installation
- Slightly higher resource overhead

### Option B: Manual Deployment with PM2

For environments where Docker is not available.

```bash
# Install PM2 globally
npm install -g pm2

# Build the backend
npm run build

# Start with PM2
cd packages/backend
pm2 start dist/main.js --name spo-backend -i max

# Save PM2 process list for auto-restart on reboot
pm2 save
pm2 startup

# Monitor
pm2 monit
pm2 logs spo-backend
```

**PM2 Ecosystem File** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'spo-backend',
    script: 'dist/main.js',
    cwd: '/opt/spo/packages/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/spo/error.log',
    out_file: '/var/log/spo/out.log',
    merge_logs: true,
    max_memory_restart: '512M',
    restart_delay: 5000,
    max_restarts: 10,
  }],
};
```

### Option C: Kubernetes (Future)

Planned for future releases. The application is designed with 12-factor app principles and can be containerized for Kubernetes deployment.

Key considerations:
- Stateless backend (scale horizontally)
- PostgreSQL managed via Cloud Native PG operator or managed service
- Redis via Helm chart
- Ingress controller for TLS termination
- Persistent volumes for export files
- ConfigMaps and Secrets for configuration

---

## 4. Docker Compose Production Setup

### File: `docker/docker-compose.prod.yml`

Refer to the production Docker Compose file in the repository for the complete service definition.

### Service Architecture

```
                    ┌──────────────┐
                    │   Internet   │
                    └──────┬───────┘
                           │ :443 (HTTPS)
                    ┌──────▼───────┐
                    │    Nginx     │
                    │  (Reverse    │
                    │   Proxy)     │
                    └──────┬───────┘
                           │ :3000
                    ┌──────▼───────┐
                    │   Backend    │
                    │  (NestJS)    │
                    └──┬───────┬───┘
                       │       │
              ┌────────▼──┐ ┌──▼────────┐
              │ PostgreSQL │ │   Redis   │
              │  (Port     │ │  (Cache)  │
              │   5432)    │ │           │
              └────────────┘ └───────────┘
```

### Key Configuration Notes

1. **PostgreSQL** is exposed only on `127.0.0.1:5432` for direct access by administrators.
2. **Backend** is exposed only on `127.0.0.1:3000` — only Nginx can reach it.
3. **Nginx** handles SSL termination and serves as the single entry point.
4. **Networks** are separated: `frontend` (Nginx accessible) and `backend` (internal only).
5. **Health checks** ensure services are ready before dependencies start.

---

## 5. Environment Variables Reference

### General

| Variable       | Default         | Description                          |
|----------------|-----------------|--------------------------------------|
| `NODE_ENV`     | `production`    | Node environment mode                |
| `PORT`         | `3000`          | Backend HTTP port                     |
| `HOST`         | `0.0.0.0`       | Backend listen address               |
| `CORS_ORIGIN`  | `https://spo.example.com` | Allowed CORS origin        |
| `LOG_LEVEL`    | `log`           | Log level (log, warn, error, debug)  |

### Database

| Variable        | Default | Description                    |
|-----------------|---------|--------------------------------|
| `DATABASE_URL`  | —       | PostgreSQL connection string   |
| `DB_USER`       | `spo`   | PostgreSQL user                |
| `DB_PASSWORD`   | —       | PostgreSQL password (**required**) |
| `DB_NAME`       | `spo`   | PostgreSQL database name       |
| `DB_HOST`       | `localhost` | PostgreSQL host             |
| `DB_PORT`       | `5432`  | PostgreSQL port                |

### Redis

| Variable      | Default       | Description          |
|---------------|---------------|----------------------|
| `REDIS_HOST`  | `localhost`   | Redis host           |
| `REDIS_PORT`  | `6379`        | Redis port           |
| `REDIS_PASSWORD` | —          | Redis password (optional) |

### JWT

| Variable                 | Default | Description                          |
|--------------------------|---------|--------------------------------------|
| `JWT_SECRET`             | —       | JWT signing secret (**required**)    |
| `JWT_EXPIRATION`         | `15m`   | Access token expiry                  |
| `JWT_REFRESH_EXPIRATION` | `7d`    | Refresh token expiry                 |

### YouTrack Integration

| Variable              | Default | Description                     |
|-----------------------|---------|---------------------------------|
| `YOUTRACK_BASE_URL`   | —       | YouTrack instance URL           |
| `YOUTRACK_API_TOKEN`  | —       | YouTrack API token              |
| `YOUTRACK_SYNC_CRON`  | `0 */6 * * *` | Sync schedule (cron)      |

### Email / SMTP

| Variable    | Default                       | Description          |
|-------------|-------------------------------|----------------------|
| `SMTP_HOST` | —                             | SMTP server host     |
| `SMTP_PORT` | `587`                         | SMTP server port     |
| `SMTP_USER` | —                             | SMTP username        |
| `SMTP_PASS` | —                             | SMTP password        |
| `SMTP_FROM` | `noreply@spo.example.com`     | Sender email address |

### LDAP

| Variable              | Default | Description                 |
|-----------------------|---------|-----------------------------|
| `LDAP_URL`            | —       | LDAP server URL             |
| `LDAP_BASE_DN`        | —       | LDAP base distinguished name|
| `LDAP_BIND_DN`        | —       | LDAP bind DN                |
| `LDAP_BIND_CREDENTIALS` | —     | LDAP bind credentials       |

### Export

| Variable              | Default              | Description                    |
|-----------------------|----------------------|--------------------------------|
| `EXPORT_STORAGE_PATH` | `./exports`          | Path to export files           |
| `EXPORT_BASE_URL`     | `/api/export/download` | Export download URL prefix  |

### Retention

| Variable                        | Default | Description                              |
|---------------------------------|---------|------------------------------------------|
| `RETENTION_EXPORT_DAYS`         | `1`     | Keep export files for N days             |
| `RETENTION_NOTIFICATION_DAYS`   | `90`    | Keep notification runs for N days        |
| `RETENTION_AUDIT_DAYS`          | `365`   | Keep audit logs for N days               |
| `RETENTION_SYNC_LOG_DAYS`       | `90`    | Keep sync log entries for N days         |
| `RETENTION_LOGIN_ATTEMPT_DAYS`  | `90`    | Keep login attempts for N days           |
| `BACKUP_RETENTION_DAYS`         | `30`    | Keep database backups for N days         |

### Rate Limiting

| Variable        | Default | Description                      |
|-----------------|---------|----------------------------------|
| `THROTTLE_TTL`  | `60`    | Rate limit window (seconds)      |
| `THROTTLE_LIMIT`| `10`    | Max requests per window          |

### Encryption

| Variable         | Default | Description                                    |
|------------------|---------|------------------------------------------------|
| `ENCRYPTION_KEY` | —       | AES-256-GCM key for secrets storage (**required**) |

---

## 6. Database Management

### Migration Commands

```bash
# Apply all pending migrations
cd packages/backend
npx prisma migrate deploy --schema=src/infrastructure/prisma/prisma/schema.prisma

# Create a new migration (development only)
npx prisma migrate dev --name <migration_name> --schema=src/infrastructure/prisma/prisma/schema.prisma

# Reset database (development only — drops all data)
npx prisma migrate reset --schema=src/infrastructure/prisma/prisma/schema.prisma
```

### Seed Commands

```bash
# Seed initial data (roles, admin user, dictionaries, templates)
cd packages/backend
npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts
```

### Backup Procedures

#### Automated Backup (via Docker backup container)

Backups run automatically at 2:00 AM daily (configurable via the backup service).

#### Manual Backup

```bash
# Using the backup script
cd docker/backups
DB_HOST=localhost DB_PORT=5432 DB_NAME=spo DB_USER=spo DB_PASSWORD=secret \
  BACKUP_DIR=/opt/backups RETENTION_DAYS=30 \
  ./backup.sh
```

#### Using pg_dump directly

```bash
pg_dump -h localhost -U spo -d spo --format=custom --file=/opt/backups/spo_manual_$(date +%Y%m%d).sql
```

### Restore Procedures

```bash
# Using the restore script
cd docker/backups
./restore.sh spo_backup_20260427_000000.sql

# Interactive mode
./restore.sh
```

#### Using pg_restore directly

```bash
# Drop existing connections first
psql -h localhost -U spo -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'spo' AND pid <> pg_backend_pid();"

# Restore
pg_restore -h localhost -U spo -d spo --clean --if-exists /opt/backups/spo_backup_20260427.sql
```

---

## 7. Logging and Monitoring

### Log Locations

| Service     | Docker                  | Manual (PM2)              |
|-------------|-------------------------|---------------------------|
| Backend     | `docker logs spo-backend` | `/var/log/spo/out.log`  |
| PostgreSQL  | `docker logs spo-postgres` | `/var/log/postgresql/`  |
| Nginx       | `docker logs spo-nginx`   | `/var/log/nginx/`       |
| Redis       | `docker logs spo-redis`   | `/var/log/redis/`       |
| Backup      | `docker/backups/backup.log` | `/opt/backups/backup.log` |

### Log Rotation

Docker uses the `json-file` logging driver with:
- Max file size: 10 MB
- Max files: 3

For manual deployments, configure logrotate:

```bash
# /etc/logrotate.d/spo
/var/log/spo/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

### Health Check Endpoint

```
GET /api/health
```

Returns HTTP 200 with a JSON response:

```json
{
  "status": "ok",
  "timestamp": "2026-04-27T12:00:00.000Z",
  "uptime": 123456,
  "database": "connected",
  "redis": "connected"
}
```

### Monitoring Recommendations

| Metric                  | Tool                    | Alert Threshold          |
|-------------------------|-------------------------|--------------------------|
| CPU usage               | Prometheus + Grafana    | > 80% for 5 minutes      |
| Memory usage            | Prometheus + Grafana    | > 85%                    |
| Disk usage              | Node Exporter           | > 85%                    |
| Response time           | Prometheus              | > 2000ms (p95)           |
| Error rate              | Prometheus              | > 1% of requests         |
| Database connections    | PostgreSQL exporter     | > 80% of max_connections |
| SSL certificate expiry  | Cert-manager / cron     | < 30 days remaining      |

---

## 8. Security Checklist

### Firewall Rules

Ensure only necessary ports are open:

| Port | Protocol | Source          | Service          |
|------|----------|-----------------|------------------|
| 22   | TCP      | Admin IPs only  | SSH              |
| 80   | TCP      | Any             | HTTP (redirects to HTTPS) |
| 443  | TCP      | Any             | HTTPS            |
| 5432 | TCP      | Internal only   | PostgreSQL       |
| 6379 | TCP      | Internal only   | Redis            |

### SSL/TLS

- Use TLS 1.2 or 1.3 only
- Disable TLS 1.0 and 1.1
- Use strong ciphers (e.g., `ECDHE-ECDSA-AES128-GCM-SHA256`)
- Enable HSTS header
- Auto-renew Let's Encrypt certificates with Certbot or acme.sh
- Generate DH parameters for Perfect Forward Secrecy:
  ```bash
  openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048
  ```

### Secrets Management

- **Never** hardcode secrets in source code
- Use environment variables for all secrets
- Store secrets in a vault (HashiCorp Vault, AWS Secrets Manager, or encrypted files)
- Rotate secrets periodically:
  - `JWT_SECRET` — every 90 days
  - `DB_PASSWORD` — every 90 days
  - `ENCRYPTION_KEY` — every 180 days
- Restrict file permissions on `.env`:
  ```bash
  chmod 600 .env
  chown root:spo-user .env
  ```

### Database Access Control

- Create separate database users for application and admin
- Application user should have only `SELECT`, `INSERT`, `UPDATE`, `DELETE` on application tables
- Run `GRANT` commands to restrict permissions
- Enable PostgreSQL SSL connections
- Use `pg_hba.conf` to restrict access by IP

### Application Security

- Helmet middleware is enabled (security headers)
- Input validation with `class-validator`
- Rate limiting on auth endpoints
- CORS restricted to specific origin
- Audit logging for all sensitive operations
- Secrets masked in API responses and logs

---

## 9. Troubleshooting

### Common Issues and Solutions

#### Backend fails to start

**Symptom:** Container exits immediately or PM2 process crashes  
**Check:**
```bash
# Docker
docker logs spo-backend --tail 50

# Check if PostgreSQL is accessible
docker exec spo-backend sh -c "nc -zv postgres 5432"

# PM2
pm2 logs spo-backend --lines 50
```

**Solutions:**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running and healthy
- Check that migrations have been applied
- Verify Redis is accessible

#### Database connection refused

**Symptom:** Backend logs show `ECONNREFUSED`  
**Check:**
```bash
docker compose -f docker/docker-compose.prod.yml ps
docker logs spo-postgres --tail 20
```

**Solutions:**
- Wait for PostgreSQL to finish starting (start_period: 30s)
- Check `DB_HOST` and `DB_PORT` environment variables
- Verify network connectivity between services

#### YouTrack sync fails

**Symptom:** Sync run status shows `ERROR`  
**Check:**
```bash
# Check sync logs via API
curl -X GET https://spo.example.com/api/youtrack/sync-runs

# Check backend logs
docker logs spo-backend | grep -i youtrack
```

**Solutions:**
- Verify `YOUTRACK_BASE_URL` and `YOUTRACK_API_TOKEN`
- Test connection via API: `POST /api/youtrack/test-connection`
- Check network access from backend to YouTrack
- Verify rate limiting and API token permissions

#### Email delivery fails

**Symptom:** Notification runs show status `ERROR`  
**Check:**
```bash
docker logs spo-backend | grep -i smtp
docker logs spo-backend | grep -i email
```

**Solutions:**
- Verify SMTP host, port, and credentials
- Check if SMTP server allows relaying from this IP
- Test with `swaks` or `telnet` to SMTP server
- Verify firewall allows outbound SMTP traffic

#### Performance degradation

**Symptom:** Slow API responses, high CPU/memory usage  
**Check:**
```bash
# Docker resource usage
docker stats

# Database query performance
docker exec spo-postgres sh -c "psql -U spo -c 'SELECT * FROM pg_stat_activity;'"

# Slow queries
docker exec spo-postgres sh -c "psql -U spo -c 'SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 20;'"
```

**Solutions:**
- Enable query logging in PostgreSQL (set `log_min_duration_statement = 1000`)
- Check for missing indexes
- Verify `work_mem` and `shared_buffers` settings
- Consider scaling up server resources
- Check if retention cleanup needs to be run

#### Disk space running low

**Symptom:** Backup or export operations fail  
**Check:**
```bash
df -h
du -sh /var/lib/docker/volumes/spo-*
du -sh /opt/spo/docker/backups/*
```

**Solutions:**
- Run retention cleanup: `POST /api/admin/retention/run`
- Clean old backups manually
- Increase disk size or set up log rotation
- Move backups to external/S3 storage

#### SSL certificate expiry

**Symptom:** Browser shows security warning  
**Check:**
```bash
openssl s_client -connect spo.example.com:443 -servername spo.example.com </dev/null 2>/dev/null | openssl x509 -noout -dates
```

**Solutions:**
- Set up auto-renewal with Certbot
- Verify DNS records point to the server
- Check that port 80 is open for ACME challenge

---

## Appendix: Quick Reference

### Useful Commands

```bash
# Full restart
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d

# Rebuild backend image
docker compose -f docker/docker-compose.prod.yml build backend

# Update database schema
cd packages/backend && npx prisma migrate deploy

# View only errors
docker compose -f docker/docker-compose.prod.yml logs --tail=100 | grep -i error

# Execute command in backend container
docker exec spo-backend sh -c "node -e 'console.log(process.env.NODE_ENV)'"

# Backup database manually
docker exec spo-postgres sh -c "pg_dump -U spo -d spo --format=custom --file=/backups/manual_backup.sql"

# Restore database manually
docker exec spo-postgres sh -c "pg_restore -U spo -d spo --clean /backups/manual_backup.sql"
```
```

Now let me create the operational runbook: