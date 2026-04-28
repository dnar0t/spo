#!/bin/bash
# ============================================
# СПО — PostgreSQL Restore Script
# ============================================
# Lists available backups and restores a selected
# backup file to the SPO database.
#
# Usage:
#   ./restore.sh                              # interactive mode
#   ./restore.sh spo_backup_20260427_000000.sql  # direct restore
#   ./restore.sh /full/path/to/backup.sql        # direct restore
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

# ---- Functions ----
log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}"
}

list_backups() {
    echo ""
    echo "Available backups in ${BACKUP_DIR}:"
    echo "========================================"

    local backups=()
    while IFS= read -r -d $'\0' file; do
        backups+=("$file")
    done < <(find "${BACKUP_DIR}" -name "spo_backup_*.sql" -type f -print0 2>/dev/null | sort -rz)

    if [ ${#backups[@]} -eq 0 ]; then
        log "ERROR" "No backups found in ${BACKUP_DIR}"
        exit 1
    fi

    local index=1
    for backup in "${backups[@]}"; do
        local size
        local date_modified
        size=$(stat -c%s "$backup" 2>/dev/null || stat -f%z "$backup" 2>/dev/null || echo "0")
        date_modified=$(stat -c%y "$backup" 2>/dev/null || stat -f%Sm "$backup" 2>/dev/null || echo "unknown")
        local size_hr
        if [ "$size" -ge 1073741824 ]; then
            size_hr=$(echo "scale=2; $size / 1073741824" | bc)
            size_hr="${size_hr} GB"
        elif [ "$size" -ge 1048576 ]; then
            size_hr=$(echo "scale=2; $size / 1048576" | bc)
            size_hr="${size_hr} MB"
        elif [ "$size" -ge 1024 ]; then
            size_hr=$(echo "scale=2; $size / 1024" | bc)
            size_hr="${size_hr} KB"
        else
            size_hr="${size} B"
        fi
        printf "  [%2d] %s  (%s, %s)\n" "$index" "$(basename "$backup")" "$date_modified" "$size_hr"
        index=$((index + 1))
    done

    echo ""
    echo "${#backups[@]} backup(s) found."
    echo ""

    BACKUP_LIST=("${backups[@]}")
}

drop_connections() {
    log "WARN" "Dropping all existing connections to database '${DB_NAME}'..."

    export PGPASSWORD="${DB_PASSWORD}"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "postgres" -c "
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${DB_NAME}'
          AND pid <> pg_backend_pid();
    " 2>/dev/null || true
    unset PGPASSWORD

    log "INFO" "Connections dropped."
}

confirm_restore() {
    local backup_file="$1"
    echo ""
    echo "⚠️  WARNING: You are about to restore a database backup!"
    echo "========================================================"
    echo "  Database:    ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
    echo "  Backup file: ${backup_file}"
    echo "  Timestamp:   $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "This will OVERWRITE the current database with the backup data."
    echo "All current data will be LOST."
    echo ""
    read -r -p "Are you sure you want to proceed? (type 'yes' to confirm): " confirmation

    if [ "${confirmation}" != "yes" ]; then
        log "INFO" "Restore cancelled by user."
        exit 0
    fi
}

perform_restore() {
    local backup_file="$1"

    log "INFO" "Starting database restore..."
    log "INFO" "Backup: ${backup_file}"
    log "INFO" "Target: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"

    export PGPASSWORD="${DB_PASSWORD}"

    # Drop existing connections before restore
    drop_connections

    # Perform restore
    if pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --clean \
        --if-exists \
        --verbose \
        --no-owner \
        --no-privileges \
        "${backup_file}" 2>&1; then
        log "INFO" "Restore completed successfully!"
    else
        log "ERROR" "Restore failed!"
        unset PGPASSWORD
        exit 1
    fi

    unset PGPASSWORD
}

# ---- Main ----

log "INFO" "============================================"
log "INFO" "PostgreSQL Restore Script"
log "INFO" "============================================"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Check if a specific backup file was provided as argument
if [ $# -ge 1 ]; then
    BACKUP_FILE="$1"

    # Check if it's a relative path (just a filename) — prepend BACKUP_DIR
    if [[ "${BACKUP_FILE}" != /* ]] && [[ ! -f "${BACKUP_FILE}" ]]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    fi

    if [ ! -f "${BACKUP_FILE}" ]; then
        log "ERROR" "Backup file not found: ${BACKUP_FILE}"
        exit 1
    fi

    confirm_restore "${BACKUP_FILE}"
    perform_restore "${BACKUP_FILE}"
else
    # Interactive mode — list backups and let user choose
    list_backups

    if [ ${#BACKUP_LIST[@]} -eq 0 ]; then
        exit 1
    fi

    echo ""
    read -r -p "Enter backup number to restore (1-${#BACKUP_LIST[@]}): " selection

    if ! [[ "${selection}" =~ ^[0-9]+$ ]] || [ "${selection}" -lt 1 ] || [ "${selection}" -gt "${#BACKUP_LIST[@]}" ]; then
        log "ERROR" "Invalid selection: ${selection}"
        exit 1
    fi

    BACKUP_FILE="${BACKUP_LIST[$((selection - 1))]}"
    confirm_restore "${BACKUP_FILE}"
    perform_restore "${BACKUP_FILE}"
fi

exit 0
