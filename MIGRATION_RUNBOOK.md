# CollabSpace Database Uniqueness Constraints & Tenant Security Migration Runbook

## Overview
This runbook details the end-to-end production procedure for applying uniqueness constraints on workspace and project memberships in CollabSpace.

- **Workspace Membership Constraint**: `idx_workspace_members_ws_user` ON `workspace_members(workspace_id, user_id)` (UNIQUE)
- **Project Membership Constraint**: `idx_project_members_proj_user` ON `project_members(project_id, user_id) WHERE user_id IS NOT NULL` (UNIQUE partial index)

---

## Prerequisites
- Node.js runtime and dependencies installed (`npm install`).
- Access to the production host environment.
- Sufficient disk space for database backup (at least 2x `collabspace.db` size).

---

## Step-by-Step Execution Plan

### Step 1: Stop Application Writers
To guarantee transactional consistency and prevent race conditions with incoming write operations, stop the application or redirect traffic to a maintenance page.

```bash
# Example systemd / pm2 commands depending on process manager:
pm2 stop collabspace
# or
systemctl stop collabspace
```

Verify that no active processes hold open write handles on `collabspace.db`:
```bash
fuser collabspace.db
```

---

### Step 2: Perform Verified WAL-Safe Backup
The migration script automatically creates an online verified backup using SQLite's online backup API before running conflict or cardinality scans, but an explicit pre-migration snapshot must also be taken:

```bash
# Checkpoint WAL into main database
sqlite3 collabspace.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Create backup copy using a single timestamp variable
BACKUP_FILE="collabspace.db.pre-migration.$(date +%s)"
cp collabspace.db "$BACKUP_FILE"

# Verify backup integrity
sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;"
# Output must be: ok
```

---

### Step 3: Run Read-Only Dry Run
Execute the migration script in `--dry-run` mode. This mode opens SQLite strictly with `readonly: true`, without setting WAL pragma, modifying bytes, or changing file timestamps.

```bash
npx tsx scripts/migrate-uniqueness.ts --dry-run
```

- **Clean Result**: If `alreadyApplied: true` and 0 duplicates found, the constraints already exist and are valid.
- **Duplicates Found**: If exact-equivalent duplicates are found (rows sharing identical roles AND identical joined_at timestamps), the dry run will report the counts.
- **Conflicts Aborted**: If conflicting roles, differing joined_at timestamps, differing identity attributes, or invalid owner/lead cardinalities exist (zero or multiple owners/leads per workspace/project), the dry run will fail fast with an error indicating which records require manual resolution.

---

### Step 4: Resolve Any Manual Conflicts
If Step 3 reported conflicting roles, differing joined_at timestamps, or multiple/zero owners or leads:
1. Inspect the reported workspace or project IDs.
2. Determine the correct authoritative role/owner/lead with stakeholders.
3. Update or remove the incorrect conflicting rows manually via SQL transaction.
4. Re-run `--dry-run` until it completes cleanly without conflict errors.

---

### Step 5: Execute Live Migration
Execute the live migration:

```bash
npx tsx scripts/migrate-uniqueness.ts
```

**Internal Execution & Failure Handling Guarantees**:
1. **Zero Pre-Backup Mutation**: Opens the target database without altering its journal mode or setting connection pragmas. Runs initial `PRAGMA integrity_check`.
2. **Verified Backup Created First**: Creates an automated online verified backup (`collabspace.db.backup.<timestamp>`) and verifies `PRAGMA integrity_check` on the backup *before* performing any scans, pragma updates, or writes.
3. **Live Pragmas Applied After Verified Backup**: Applies `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON` to the live connection only after the verified backup exists and passes integrity check.
4. **Pre-DDL Conflict & Cardinality Scans**: Evaluates every workspace and project to ensure exactly 1 owner and 1 lead exist, and ensures all duplicates are strictly exact-equivalents.
5. **Atomic Transaction**:
   - Deduplicates exact-equivalent rows (keeping the earliest record).
   - Drops invalid/partial indexes if present.
   - Creates canonical unique indexes (`idx_workspace_members_ws_user` and partial `idx_project_members_proj_user WHERE user_id IS NOT NULL`).
   - Verifies foreign keys (`PRAGMA foreign_key_check`).
   - Verifies deep index schema and partial SQL predicate.
   - Runs pre-commit `PRAGMA integrity_check`.
6. **Pre-Commit vs Post-Commit Failure Guarantees**:
   - **Pre-Commit Failures**: Any failure during deduplication, DDL execution, index creation, foreign key checks, or pre-commit integrity check immediately triggers an automatic transaction rollback. The database rows and pre-existing indexes remain 100% unaltered.
   - **Post-Commit Failures**: If any failure occurs after the transaction has committed (e.g. during post-commit verification), the database must be restored from the verified backup created in Step 2 / Step 5 using the Rollback Procedure below.

---

### Step 6: Post-Migration Health & Integrity Check
Run integrity and constraint checks against the migrated database:

```bash
sqlite3 collabspace.db "PRAGMA integrity_check;"
# Must return: ok

sqlite3 collabspace.db "PRAGMA foreign_key_check;"
# Must return empty (zero rows)

# Verify unique indexes exist and are valid
sqlite3 collabspace.db "PRAGMA index_list('workspace_members');"
sqlite3 collabspace.db "PRAGMA index_list('project_members');"
```

---

### Step 7: Deploy Application Code & Restart Services
1. Deploy the updated application codebase containing:
   - Fail-closed DM validation across reads, sends, and SSE.
   - Loud startup index verification (fails fast with `"migration required"` if indexes are absent).
   - Strict project roster validation and sole-lead protection.
2. Restart application processes:

```bash
pm2 start collabspace
# or
systemctl start collabspace
```

3. Monitor application logs to confirm startup passes index verification cleanly:
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

