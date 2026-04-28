#!/bin/bash
# ============================================
# СПО — PostgreSQL Backup Script
# ============================================
# Creates a compressed dump of the SPO database
# with date-stamped filenames and auto-cleanup
# of backups older than RETENTION_DAYS.
#
# Usage:
#   ./backup.sh                          # uses defaults / env vars
#   ./backup.sh                          # or run via cron
#
# Restore example:
#   pg_restore -U user -d spo --clean spo_backup_20260427.sql
# ============================================

set -euo pipefail

# ---- Configuration ----
# These can be overridden via environment variables
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-spo}"
DB_USER="${DB_USER:-user}"
DB_PASSWORD="${DB_PASSWORD:-password}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# ---- Derived values ----
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="spo_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# ---- Functions ----
log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

cleanup_old_backups() {
    log "INFO" "Cleaning up backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
    find "${BACKUP_DIR}" -name "spo_backup_*.sql" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    log "INFO" "Cleanup completed."
}

# ---- Main ----

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log "INFO" "============================================"
log "INFO" "Starting PostgreSQL backup"
log "INFO" "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
log "INFO" "Backup path: ${BACKUP_PATH}"
log "INFO" "Retention: ${RETENTION_DAYS} days"

# Export password for pg_dump
export PGPASSWORD="${DB_PASSWORD}"

# Perform the backup
if pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --verbose \
    --file="${BACKUP_PATH}" \
    2>> "${LOG_FILE}"; then
    log "INFO" "Backup completed successfully: ${BACKUP_FILENAME}"

    # Get file size
    FILE_SIZE=$(stat -c%s "${BACKUP_PATH}" 2>/dev/null || echo "0")
    log "INFO" "Backup size: ${FILE_SIZE} bytes"
else
    log "ERROR" "Backup failed!"
    unset PGPASSWORD
    exit 1
fi

# Clean up old backups
cleanup_old_backups

# Unset sensitive environment variable
unset PGPASSWORD

log "INFO" "Backup process finished."
exit 0
