# CollabSpace Production Database Migration Runbook

## Overview
This runbook details the production procedures for applying schema migrations, uniqueness constraints, stable user identity columns, session performance indexes, and login rate limiting to CollabSpace databases.

---

## Migration Suite Overview

1. **Phase 1: Uniqueness Constraints & Stable Identity** (`scripts/migrate-uniqueness.ts`):
   - `idx_workspace_members_ws_user` ON `workspace_members(workspace_id, user_id)` (UNIQUE).
   - `idx_project_members_proj_user` ON `project_members(project_id, user_id) WHERE user_id IS NOT NULL` (UNIQUE partial index).
   - `projects.owner_user_id`: Foreign key referencing `users(id)` ON DELETE SET NULL.
   - `tasks.assignee_user_id`: Foreign key referencing `users(id)` ON DELETE SET NULL.

2. **Phase 2: Session Security, Password Hardening & Rate Limiting** (`scripts/migrate-auth-security.ts`):
   - Table `auth_rate_limits`: Stores persistent login attempt windows and lockouts.
   - Indexes `idx_sessions_user_id` and `idx_sessions_expires_at` ON `sessions`: Enables fast server-side session revocation and cleanup.
   - Credential Audit: Scans and validates all `users.password_hash` entries (modern RFC 7914 `$scrypt$` PHC format vs legacy format), failing closed on any corrupted entry.
   - Purges expired sessions (`expires_at <= now()`).

---

## Prerequisites
- Node.js runtime and dependencies installed (`npm install`).
- Production environment access with permissions to execute administrative TypeScript scripts.
- Sufficient disk space for database backup (at least 2x `collabspace.db` size).
- Confirm zero active write processes on `collabspace.db` before execution.

---

## Step-by-Step Execution Plan

### Step 1: Stop Application Writers
To guarantee transactional consistency and prevent race conditions with incoming write operations, stop application processes:

```bash
pm2 stop collabspace
# or
systemctl stop collabspace
```

Verify that no active processes hold open write handles on `collabspace.db`:
```bash
fuser collabspace.db
```

---

### Step 2: Perform Verified WAL-Safe Pre-Migration Snapshot
Checkpoint any active WAL pages and create a verified snapshot:

```bash
# Checkpoint WAL into main database
sqlite3 collabspace.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Create backup copy with timestamp
BACKUP_FILE="collabspace.db.pre-migration.$(date +%s)"
cp collabspace.db "$BACKUP_FILE"

# Verify backup integrity
sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;"
# Output must be: ok
```

---

### Step 3: Run Read-Only Dry Runs
Execute both migration scripts in `--dry-run` mode. Dry run opens the database strictly with `readonly: true`, without altering journal mode, modifying bytes, or changing file timestamps.

```bash
# 1. Uniqueness & Stable Identity dry-run
npx tsx scripts/migrate-uniqueness.ts --dry-run

# 2. Auth Security & Rate Limits dry-run
npx tsx scripts/migrate-auth-security.ts --dry-run
```

- **Output Checks**:
  - `alreadyApplied: true` indicates constraints/tables/indexes already exist.
  - Conflicting duplicate roles, differing `joined_at` timestamps, zero/multiple owners or leads, or corrupted password hashes will abort fail-closed with detailed diagnostics.

---

### Step 4: Resolve Any Manual Conflicts
If Step 3 reported conflicting roles, invalid cardinalities, or malformed credentials:
1. Review the reported record IDs.
2. Resolve authoritative ownership, lead assignment, or invalid credentials.
3. Re-run `--dry-run` until both scripts report clean status with 0 conflict errors.

---

### Step 5: Execute Live Migrations
Execute the migrations in sequence:

```bash
# Phase 1: Uniqueness & Stable Identity
npx tsx scripts/migrate-uniqueness.ts

# Phase 2: Auth Security & Rate Limiting
npx tsx scripts/migrate-auth-security.ts
```

**Internal Execution Guarantees**:
1. **Pre-Backup Immutability**: Databases are opened without pragma mutations; initial `PRAGMA integrity_check` is verified.
2. **Automated Online Backup**: Creates a verified online SQLite backup before any scans, writes, or pragma alterations.
3. **Connection Pragmas**: Applies `PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;` only after verified backup succeeds.
4. **Fail-Closed Audits**: Scans memberships and credential integrity; aborts fail-closed on corruptions.
5. **Atomic Transactions**:
   - Schema additions (`auth_rate_limits`, columns `owner_user_id`, `assignee_user_id`).
   - Deduplication and prioritized backfill.
   - Index creation (`idx_workspace_members_ws_user`, `idx_project_members_proj_user`, `idx_sessions_user_id`, `idx_sessions_expires_at`).
   - Expired session purge.
   - Pre-commit foreign key check and `PRAGMA integrity_check`.

---

### Step 6: Post-Migration Health & Integrity Check
Verify database health and schema objects:

```bash
sqlite3 collabspace.db "PRAGMA integrity_check;"
# Must return: ok

sqlite3 collabspace.db "PRAGMA foreign_key_check;"
# Must return empty (zero rows)

# Verify indexes
sqlite3 collabspace.db "PRAGMA index_list('workspace_members');"
sqlite3 collabspace.db "PRAGMA index_list('project_members');"
sqlite3 collabspace.db "PRAGMA index_list('sessions');"

# Verify table info
sqlite3 collabspace.db "PRAGMA table_info('auth_rate_limits');"
sqlite3 collabspace.db "PRAGMA table_info('projects');"
sqlite3 collabspace.db "PRAGMA table_info('tasks');"
```

---

### Step 7: Deploy Application Code & Restart Services
1. Deploy the updated application codebase containing:
   - Modern RFC 7914 `$scrypt$` PHC hashing and transparent auto-upgrade on login.
   - Fixation-resistant session rotation and multi-session revocation on password change.
   - Fail-closed per-account and per-IP login throttling with uniform error responses.
   - Loud startup verification failing loud on unmigrated databases.
2. Restart application processes:

```bash
pm2 start collabspace
# or
systemctl start collabspace
```

3. Monitor application logs to confirm startup passes schema verification cleanly:
```bash
pm2 logs collabspace
```

---

## Rollback Procedure (In Case of Post-Deployment Failure)
If unexpected issues arise after restarting the application:

1. Stop application:
   ```bash
   pm2 stop collabspace
   ```
2. Restore verified database from pre-migration backup:
   ```bash
   rm -f collabspace.db collabspace.db-wal collabspace.db-shm
   cp collabspace.db.pre-migration.<timestamp> collabspace.db
   ```
3. Re-verify integrity of restored database:
   ```bash
   sqlite3 collabspace.db "PRAGMA integrity_check;"
   ```
4. Roll back application binary/code to previous release.
5. Restart application services and verify status.
