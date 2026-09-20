import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface MigrateOptions {
  dbPath?: string;
  dryRun?: boolean;
  skipBackup?: boolean;
  forcePreCommitFailure?: boolean;
}

export interface MigrationResult {
  success: boolean;
  dryRun: boolean;
  alreadyApplied: boolean;
  backupPath?: string;
  workspaceDuplicatesFound: number;
  workspaceDuplicatesRemoved: number;
  projectDuplicatesFound: number;
  projectDuplicatesRemoved: number;
  missingColumnsFound?: string[];
  projectsPendingBackfill?: number;
  tasksPendingBackfill?: number;
  projectsBackfilled?: number;
  tasksBackfilled?: number;
  error?: string;
}

/**
 * Deep schema, column, uniqueness, and predicate verification for canonical indexes.
 */
export function verifyUniqueIndexes(sqlite: Database.Database): {
  ok: boolean;
  error?: string;
} {
  try {
    // 1. Verify workspace_members index
    const wsIndexes = sqlite
      .prepare("PRAGMA index_list('workspace_members')")
      .all() as { name: string; unique: number; partial: number }[];
    const wsIdx = wsIndexes.find(
      (i) => i.name === "idx_workspace_members_ws_user"
    );
    if (!wsIdx) {
      return {
        ok: false,
        error: "Missing index idx_workspace_members_ws_user on workspace_members.",
      };
    }
    if (wsIdx.unique !== 1) {
      return {
        ok: false,
        error: "Index idx_workspace_members_ws_user is not UNIQUE.",
      };
    }
    if (wsIdx.partial !== 0) {
      return {
        ok: false,
        error: "Index idx_workspace_members_ws_user must not be partial.",
      };
    }
    const wsCols = sqlite
      .prepare("PRAGMA index_info('idx_workspace_members_ws_user')")
      .all() as { name: string }[];
    const wsColNames = wsCols.map((c) => c.name);
    if (
      wsColNames.length !== 2 ||
      wsColNames[0] !== "workspace_id" ||
      wsColNames[1] !== "user_id"
    ) {
      return {
        ok: false,
        error: `idx_workspace_members_ws_user has columns [${wsColNames.join(
          ", "
        )}], expected [workspace_id, user_id].`,
      };
    }

    // 2. Verify project_members index
    const pmIndexes = sqlite
      .prepare("PRAGMA index_list('project_members')")
      .all() as { name: string; unique: number; partial: number }[];
    const pmIdx = pmIndexes.find(
      (i) => i.name === "idx_project_members_proj_user"
    );
    if (!pmIdx) {
      return {
        ok: false,
        error: "Missing index idx_project_members_proj_user on project_members.",
      };
    }
    if (pmIdx.unique !== 1) {
      return {
        ok: false,
        error: "Index idx_project_members_proj_user is not UNIQUE.",
      };
    }
    if (pmIdx.partial !== 1) {
      return {
        ok: false,
        error:
          "Index idx_project_members_proj_user must be partial (WHERE user_id IS NOT NULL).",
      };
    }
    const pmCols = sqlite
      .prepare("PRAGMA index_info('idx_project_members_proj_user')")
      .all() as { name: string }[];
    const pmColNames = pmCols.map((c) => c.name);
    if (
      pmColNames.length !== 2 ||
      pmColNames[0] !== "project_id" ||
      pmColNames[1] !== "user_id"
    ) {
      return {
        ok: false,
        error: `idx_project_members_proj_user has columns [${pmColNames.join(
          ", "
        )}], expected [project_id, user_id].`,
      };
    }

    // 3. Verify partial predicate from sqlite_master.sql
    const pmSqlRow = sqlite
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_project_members_proj_user'"
      )
      .get() as { sql: string } | undefined;
    if (!pmSqlRow || !pmSqlRow.sql) {
      return {
        ok: false,
        error:
          "Missing sql in sqlite_master for idx_project_members_proj_user.",
      };
    }
    const normalizedSql = pmSqlRow.sql.replace(/\s+/g, " ").toUpperCase();
    if (
      !normalizedSql.includes("WHERE USER_ID IS NOT NULL") &&
      !normalizedSql.includes("WHERE `USER_ID` IS NOT NULL")
    ) {
      return {
        ok: false,
        error: `idx_project_members_proj_user SQL is missing partial predicate WHERE user_id IS NOT NULL: ${pmSqlRow.sql}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Checks existence of stable identity columns on projects and tasks.
 */
export function checkStableIdentityColumns(sqlite: Database.Database): {
  hasProjectOwnerUserId: boolean;
  hasTaskAssigneeUserId: boolean;
  missingColumns: string[];
} {
  const projectCols = sqlite
    .prepare("PRAGMA table_info('projects')")
    .all() as { name: string }[];
  const taskCols = sqlite
    .prepare("PRAGMA table_info('tasks')")
    .all() as { name: string }[];

  const hasProjectOwnerUserId = projectCols.some((c) => c.name === "owner_user_id");
  const hasTaskAssigneeUserId = taskCols.some((c) => c.name === "assignee_user_id");

  const missingColumns: string[] = [];
  if (!hasProjectOwnerUserId) missingColumns.push("projects.owner_user_id");
  if (!hasTaskAssigneeUserId) missingColumns.push("tasks.assignee_user_id");

  return {
    hasProjectOwnerUserId,
    hasTaskAssigneeUserId,
    missingColumns,
  };
}

/**
 * Calculates pending resolvable backfills for projects and tasks.
 * Strictly adheres to priority rules:
 * 1. Project lead user_id from project_members where role = 'lead' AND user_id IS NOT NULL.
 * 2. Fallback to unique name match in that project's workspace ONLY if lead user_id is NULL.
 * 3. Task: unique name match in that task's workspace.
 * Ambiguous (>1 matches) or missing (0 matches) remain NULL.
 */
export function countPendingResolvableBackfills(
  sqlite: Database.Database,
  colStatus: { hasProjectOwnerUserId: boolean; hasTaskAssigneeUserId: boolean }
): {
  resolvableProjects: number;
  unresolvableProjects: number;
  resolvableTasks: number;
  unresolvableTasks: number;
} {
  let resolvableProjects = 0;
  let unresolvableProjects = 0;
  let resolvableTasks = 0;
  let unresolvableTasks = 0;

  // Projects
  const projectQuery = colStatus.hasProjectOwnerUserId
    ? "SELECT id, workspace_id, owner FROM projects WHERE owner_user_id IS NULL"
    : "SELECT id, workspace_id, owner FROM projects";

  const unassignedProjects = sqlite.prepare(projectQuery).all() as {
    id: string;
    workspace_id: string;
    owner: string;
  }[];

  for (const p of unassignedProjects) {
    // Step A: Prefer single project lead's userId from project_members
    const leadRows = sqlite
      .prepare(
        "SELECT user_id FROM project_members WHERE project_id = ? AND role = 'lead' AND user_id IS NOT NULL"
      )
      .all(p.id) as { user_id: string }[];

    if (leadRows.length === 1 && leadRows[0].user_id) {
      resolvableProjects++;
      continue;
    }

    // Step B: Unique name fallback in project's workspace ONLY if lead userId is NULL/absent
    const nameMatches = sqlite
      .prepare(`
        SELECT u.id FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ? AND u.name = ?
      `)
      .all(p.workspace_id, p.owner) as { id: string }[];

    if (nameMatches.length === 1) {
      resolvableProjects++;
    } else {
      unresolvableProjects++;
    }
  }

  // Tasks
  const taskQuery = colStatus.hasTaskAssigneeUserId
    ? "SELECT id, workspace_id, assignee FROM tasks WHERE assignee_user_id IS NULL AND assignee != 'Unassigned'"
    : "SELECT id, workspace_id, assignee FROM tasks WHERE assignee != 'Unassigned'";

  const unassignedTasks = sqlite.prepare(taskQuery).all() as {
    id: string;
    workspace_id: string;
    assignee: string;
  }[];

  for (const t of unassignedTasks) {
    const nameMatches = sqlite
      .prepare(`
        SELECT u.id FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ? AND u.name = ?
      `)
      .all(t.workspace_id, t.assignee) as { id: string }[];

    if (nameMatches.length === 1) {
      resolvableTasks++;
    } else {
      unresolvableTasks++;
    }
  }

  return {
    resolvableProjects,
    unresolvableProjects,
    resolvableTasks,
    unresolvableTasks,
  };
}

/**
 * Creates an online SQLite backup safely and verifies its integrity.
 */
async function createVerifiedBackup(
  sqlite: Database.Database,
  dbPath: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.backup.${timestamp}`;

  await sqlite.backup(backupPath);

  if (!fs.existsSync(backupPath)) {
    throw new Error(
      `Backup creation failed: file not found at ${backupPath}`
    );
  }

  const backupDb = new Database(backupPath, { readonly: true });
  try {
    const integrity = backupDb.pragma("integrity_check") as {
      integrity_check: string;
    }[];
    if (integrity[0]?.integrity_check !== "ok") {
      throw new Error(
        `Backup integrity verification failed: ${integrity[0]?.integrity_check}`
      );
    }
  } finally {
    backupDb.close();
  }

  return backupPath;
}

export async function runUniquenessMigration(
  options: MigrateOptions = {}
): Promise<MigrationResult> {
  const dbPath =
    options.dbPath || path.resolve(process.cwd(), "collabspace.db");
  const dryRun = Boolean(options.dryRun);

  if (!fs.existsSync(/*turbopackIgnore: true*/ dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`);
  }

  // Open database connection without altering journal mode or mutating live database
  const sqlite = new Database(dbPath, dryRun ? { readonly: true, fileMustExist: true } : {});

  let backupPath: string | undefined;

  try {
    // 1. Initial Integrity Check
    const initialIntegrity = sqlite.pragma("integrity_check") as {
      integrity_check: string;
    }[];
    if (initialIntegrity[0]?.integrity_check !== "ok") {
      throw new Error(
        `Pre-migration SQLite integrity_check failed: ${initialIntegrity[0]?.integrity_check}`
      );
    }

    // 2. VERIFIED BACKUP FIRST (Created and verified before any connection pragmas or scans)
    if (!dryRun && !options.skipBackup) {
      backupPath = await createVerifiedBackup(sqlite, dbPath);
    }

    // 3. Apply live-connection pragmas AFTER verified backup is completed
    if (!dryRun) {
      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");
    }

    // 4. Conflict Scan & Cardinality Scan (MUST PASS BEFORE ANY DDL OR WRITES)
    // 3a. Cardinality check for workspace owners: start from workspaces table, require exactly 1 owner
    const wsOwners = sqlite
      .prepare(`
        SELECT w.id as workspace_id, COUNT(wm.id) as cnt
        FROM workspaces w
        LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.role = 'owner'
        GROUP BY w.id
      `)
      .all() as { workspace_id: string; cnt: number }[];
    for (const w of wsOwners) {
      if (w.cnt !== 1) {
        throw new Error(
          `Cardinality error: workspace ${w.workspace_id} has ${w.cnt} owners (must be exactly 1). Manual resolution required.`
        );
      }
    }

    // 3b. Cardinality check for project leads: start from projects table, require exactly 1 lead
    const projLeads = sqlite
      .prepare(`
        SELECT p.id as project_id, COUNT(pm.id) as cnt
        FROM projects p
        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.role = 'lead'
        GROUP BY p.id
      `)
      .all() as { project_id: string; cnt: number }[];
    for (const p of projLeads) {
      if (p.cnt !== 1) {
        throw new Error(
          `Cardinality error: project ${p.project_id} has ${p.cnt} leads (must be exactly 1). Manual resolution required.`
        );
      }
    }

    // 3c. Workspace members duplicate check: only exact equivalents permitted (same role AND same joined_at)
    const wsDuplicates = sqlite
      .prepare(`
        SELECT workspace_id, user_id, COUNT(*) as cnt
        FROM workspace_members
        GROUP BY workspace_id, user_id
        HAVING cnt > 1
      `)
      .all() as { workspace_id: string; user_id: string; cnt: number }[];

    for (const d of wsDuplicates) {
      const rows = sqlite
        .prepare(`
          SELECT id, role, joined_at FROM workspace_members
          WHERE workspace_id = ? AND user_id = ?
        `)
        .all(d.workspace_id, d.user_id) as {
        id: string;
        role: string;
        joined_at: string;
      }[];

      const distinctRoles = new Set(rows.map((r) => r.role));
      const distinctJoinedAt = new Set(rows.map((r) => r.joined_at));
      if (distinctRoles.size > 1 || distinctJoinedAt.size > 1) {
        throw new Error(
          `Conflicting duplicate workspace memberships for user ${d.user_id} in workspace ${d.workspace_id}: differing roles or joined_at timestamps. Manual resolution required.`
        );
      }
    }

    // 3d. Project members duplicate check: only exact equivalents permitted
    const pmDuplicates = sqlite
      .prepare(`
        SELECT project_id, user_id, COUNT(*) as cnt
        FROM project_members
        WHERE user_id IS NOT NULL
        GROUP BY project_id, user_id
        HAVING cnt > 1
      `)
      .all() as { project_id: string; user_id: string; cnt: number }[];

    for (const d of pmDuplicates) {
      const rows = sqlite
        .prepare(`
          SELECT id, role, name, initials, color FROM project_members
          WHERE project_id = ? AND user_id = ?
        `)
        .all(d.project_id, d.user_id) as {
        id: string;
        role: string;
        name: string;
        initials: string;
        color: string;
      }[];

      const distinctRoles = new Set(rows.map((r) => r.role));
      const distinctNames = new Set(rows.map((r) => r.name));
      const distinctInitials = new Set(rows.map((r) => r.initials));
      const distinctColors = new Set(rows.map((r) => r.color));

      if (
        distinctRoles.size > 1 ||
        distinctNames.size > 1 ||
        distinctInitials.size > 1 ||
        distinctColors.size > 1
      ) {
        throw new Error(
          `Conflicting duplicate project memberships for user ${d.user_id} in project ${d.project_id}: differing roles or identity data. Manual resolution required.`
        );
      }
    }

    const initialColStatus = checkStableIdentityColumns(sqlite);
    const initialPendingBackfills = countPendingResolvableBackfills(sqlite, initialColStatus);
    const hasMissingCols = initialColStatus.missingColumns.length > 0;
    const hasPendingBackfills =
      initialPendingBackfills.resolvableProjects > 0 ||
      initialPendingBackfills.resolvableTasks > 0;

    // 4. Dry-Run Handling
    if (dryRun) {
      const indexVerif = verifyUniqueIndexes(sqlite);
      const hasDuplicates = wsDuplicates.length > 0 || pmDuplicates.length > 0;
      const alreadyApplied =
        indexVerif.ok &&
        !hasDuplicates &&
        !hasMissingCols &&
        !hasPendingBackfills;

      sqlite.close();
      return {
        success: true,
        dryRun: true,
        alreadyApplied,
        workspaceDuplicatesFound: wsDuplicates.reduce(
          (sum, d) => sum + (d.cnt - 1),
          0
        ),
        workspaceDuplicatesRemoved: 0,
        projectDuplicatesFound: pmDuplicates.reduce(
          (sum, d) => sum + (d.cnt - 1),
          0
        ),
        projectDuplicatesRemoved: 0,
        missingColumnsFound: initialColStatus.missingColumns,
        projectsPendingBackfill: initialPendingBackfills.resolvableProjects,
        tasksPendingBackfill: initialPendingBackfills.resolvableTasks,
        projectsBackfilled: 0,
        tasksBackfilled: 0,
      };
    }

    // Check if already cleanly applied
    const initialIndexVerif = verifyUniqueIndexes(sqlite);
    if (
      initialIndexVerif.ok &&
      wsDuplicates.length === 0 &&
      pmDuplicates.length === 0 &&
      !hasMissingCols &&
      !hasPendingBackfills
    ) {
      sqlite.close();
      return {
        success: true,
        dryRun: false,
        alreadyApplied: true,
        backupPath,
        workspaceDuplicatesFound: 0,
        workspaceDuplicatesRemoved: 0,
        projectDuplicatesFound: 0,
        projectDuplicatesRemoved: 0,
        missingColumnsFound: [],
        projectsPendingBackfill: 0,
        tasksPendingBackfill: 0,
        projectsBackfilled: 0,
        tasksBackfilled: 0,
      };
    }

    let wsRemoved = 0;
    let pmRemoved = 0;
    let projectsBackfilled = 0;
    let tasksBackfilled = 0;

    const initialWsCount = (
      sqlite.prepare("SELECT COUNT(*) as count FROM workspace_members").get() as {
        count: number;
      }
    ).count;
    const initialPmCount = (
      sqlite.prepare("SELECT COUNT(*) as count FROM project_members").get() as {
        count: number;
      }
    ).count;

    // 5. ATOMIC TRANSACTION: Deduplicate, Add Columns, Backfill, Replace Indexes, Pre-Commit Verify, Commit
    sqlite.transaction(() => {
      // Deduplicate exact-equivalent workspace members
      for (const d of wsDuplicates) {
        const rows = sqlite
          .prepare(`
            SELECT id, joined_at FROM workspace_members
            WHERE workspace_id = ? AND user_id = ?
            ORDER BY joined_at ASC, id ASC
          `)
          .all(d.workspace_id, d.user_id) as {
          id: string;
          joined_at: string;
        }[];

        const toDelete = rows.slice(1);
        for (const row of toDelete) {
          sqlite
            .prepare("DELETE FROM workspace_members WHERE id = ?")
            .run(row.id);
          wsRemoved++;
        }
      }

      // Deduplicate exact-equivalent project members
      for (const d of pmDuplicates) {
        const rows = sqlite
          .prepare(`
            SELECT id FROM project_members
            WHERE project_id = ? AND user_id = ?
            ORDER BY id ASC
          `)
          .all(d.project_id, d.user_id) as { id: string }[];

        const toDelete = rows.slice(1);
        for (const row of toDelete) {
          sqlite
            .prepare("DELETE FROM project_members WHERE id = ?")
            .run(row.id);
          pmRemoved++;
        }
      }

      // Add missing columns if not present
      const currentCols = checkStableIdentityColumns(sqlite);
      if (!currentCols.hasProjectOwnerUserId) {
        sqlite.exec(
          "ALTER TABLE projects ADD COLUMN owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL"
        );
      }
      if (!currentCols.hasTaskAssigneeUserId) {
        sqlite.exec(
          "ALTER TABLE tasks ADD COLUMN assignee_user_id TEXT REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL"
        );
      }

      // Backfill projects.owner_user_id
      const pendingProjects = sqlite
        .prepare(
          "SELECT id, workspace_id, owner FROM projects WHERE owner_user_id IS NULL"
        )
        .all() as { id: string; workspace_id: string; owner: string }[];

      for (const p of pendingProjects) {
        // Step A: Prefer single project lead's userId from project_members
        const leadRows = sqlite
          .prepare(
            "SELECT user_id FROM project_members WHERE project_id = ? AND role = 'lead' AND user_id IS NOT NULL"
          )
          .all(p.id) as { user_id: string }[];

        if (leadRows.length === 1 && leadRows[0].user_id) {
          sqlite
            .prepare("UPDATE projects SET owner_user_id = ? WHERE id = ?")
            .run(leadRows[0].user_id, p.id);
          projectsBackfilled++;
          continue;
        }

        // Step B: Unique name fallback in project's workspace ONLY if lead userId is NULL/absent
        const nameMatches = sqlite
          .prepare(`
            SELECT u.id FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = ? AND u.name = ?
          `)
          .all(p.workspace_id, p.owner) as { id: string }[];

        if (nameMatches.length === 1) {
          sqlite
            .prepare("UPDATE projects SET owner_user_id = ? WHERE id = ?")
            .run(nameMatches[0].id, p.id);
          projectsBackfilled++;
        }
      }

      // Backfill tasks.assignee_user_id
      const pendingTasks = sqlite
        .prepare(
          "SELECT id, workspace_id, assignee FROM tasks WHERE assignee_user_id IS NULL AND assignee != 'Unassigned'"
        )
        .all() as { id: string; workspace_id: string; assignee: string }[];

      for (const t of pendingTasks) {
        const nameMatches = sqlite
          .prepare(`
            SELECT u.id FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = ? AND u.name = ?
          `)
          .all(t.workspace_id, t.assignee) as { id: string }[];

        if (nameMatches.length === 1) {
          sqlite
            .prepare("UPDATE tasks SET assignee_user_id = ? WHERE id = ?")
            .run(nameMatches[0].id, t.id);
          tasksBackfilled++;
        }
      }

      // Row count verification
      const postWsCount = (
        sqlite.prepare("SELECT COUNT(*) as count FROM workspace_members").get() as {
          count: number;
        }
      ).count;
      const postPmCount = (
        sqlite.prepare("SELECT COUNT(*) as count FROM project_members").get() as {
          count: number;
        }
      ).count;

      if (postWsCount !== initialWsCount - wsRemoved) {
        throw new Error(
          `Workspace member count mismatch: expected ${initialWsCount - wsRemoved}, got ${postWsCount}`
        );
      }
      if (postPmCount !== initialPmCount - pmRemoved) {
        throw new Error(
          `Project member count mismatch: expected ${initialPmCount - pmRemoved}, got ${postPmCount}`
        );
      }

      // Drop old / invalid / partial indexes
      sqlite.exec(`
        DROP INDEX IF EXISTS idx_workspace_members_ws_user;
        DROP INDEX IF EXISTS idx_project_members_proj_user;
      `);

      // Recreate canonical unique indexes
      sqlite.exec(`
        CREATE UNIQUE INDEX idx_workspace_members_ws_user
        ON workspace_members(workspace_id, user_id);

        CREATE UNIQUE INDEX idx_project_members_proj_user
        ON project_members(project_id, user_id)
        WHERE user_id IS NOT NULL;
      `);

      // Pre-commit verification 1: Foreign key check
      const fkCheck = sqlite.pragma("foreign_key_check") as unknown[];
      if (fkCheck.length > 0) {
        throw new Error(
          `Pre-commit foreign_key_check failed: ${JSON.stringify(fkCheck)}`
        );
      }

      // Pre-commit verification 2: Deep index schema & predicate check
      const preCommitIndexVerif = verifyUniqueIndexes(sqlite);
      if (!preCommitIndexVerif.ok) {
        throw new Error(
          `Pre-commit index verification failed: ${preCommitIndexVerif.error}`
        );
      }

      // Pre-commit verification 3: Column check
      const postCols = checkStableIdentityColumns(sqlite);
      if (postCols.missingColumns.length > 0) {
        throw new Error(
          `Pre-commit column verification failed: missing ${postCols.missingColumns.join(", ")}`
        );
      }

      // Pre-commit verification 4: Unfilled resolvable backfill check
      const postPending = countPendingResolvableBackfills(sqlite, postCols);
      if (postPending.resolvableProjects > 0 || postPending.resolvableTasks > 0) {
        throw new Error(
          `Pre-commit backfill verification failed: ${postPending.resolvableProjects} projects and ${postPending.resolvableTasks} tasks remain resolvable but unfilled.`
        );
      }

      // Pre-commit verification 5: SQLite integrity check
      const preCommitIntegrity = sqlite.pragma("integrity_check") as {
        integrity_check: string;
      }[];
      if (preCommitIntegrity[0]?.integrity_check !== "ok") {
        throw new Error(
          `Pre-commit integrity_check failed: ${preCommitIntegrity[0]?.integrity_check}`
        );
      }

      // Forced failure injection check for testing
      if (options.forcePreCommitFailure) {
        throw new Error("Forced pre-commit failure injection.");
      }
    })();

    // 6. Post-Commit Verification
    const postIntegrity = sqlite.pragma("integrity_check") as {
      integrity_check: string;
    }[];
    if (postIntegrity[0]?.integrity_check !== "ok") {
      throw new Error(
        `CRITICAL: Post-commit integrity_check failed! Restore required from backup: ${backupPath}`
      );
    }

    sqlite.close();

    return {
      success: true,
      dryRun: false,
      alreadyApplied: false,
      backupPath,
      workspaceDuplicatesFound: wsDuplicates.reduce(
        (sum, d) => sum + (d.cnt - 1),
        0
      ),
      workspaceDuplicatesRemoved: wsRemoved,
      projectDuplicatesFound: pmDuplicates.reduce(
        (sum, d) => sum + (d.cnt - 1),
        0
      ),
      projectDuplicatesRemoved: pmRemoved,
      missingColumnsFound: initialColStatus.missingColumns,
      projectsPendingBackfill: initialPendingBackfills.resolvableProjects,
      tasksPendingBackfill: initialPendingBackfills.resolvableTasks,
      projectsBackfilled,
      tasksBackfilled,
    };
  } catch (err: unknown) {
    try {
      if (sqlite.open) sqlite.close();
    } catch {}
    throw err;
  }
}

if (require.main === module || process.argv[1]?.endsWith("migrate-uniqueness.ts")) {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("Starting uniqueness constraints migration...");
  if (isDryRun) {
    console.log("[DRY-RUN MODE] Strictly read-only. No changes will be written to disk.");
  }

  runUniquenessMigration({ dryRun: isDryRun })
    .then((result) => {
      console.log("\nMigration completed successfully:");
      console.log(`- Mode: ${result.dryRun ? "DRY-RUN" : "LIVE"}`);
      console.log(`- Already applied: ${result.alreadyApplied}`);
      if (result.backupPath) {
        console.log(`- Verified backup: ${result.backupPath}`);
      }
      console.log(
        `- Workspace duplicates found: ${result.workspaceDuplicatesFound}, removed: ${result.workspaceDuplicatesRemoved}`
      );
      console.log(
        `- Project duplicates found: ${result.projectDuplicatesFound}, removed: ${result.projectDuplicatesRemoved}`
      );
      if (result.missingColumnsFound && result.missingColumnsFound.length > 0) {
        console.log(`- Missing columns found: ${result.missingColumnsFound.join(", ")}`);
      }
      if (result.projectsPendingBackfill !== undefined) {
        console.log(`- Projects pending backfill: ${result.projectsPendingBackfill}`);
      }
      if (result.tasksPendingBackfill !== undefined) {
        console.log(`- Tasks pending backfill: ${result.tasksPendingBackfill}`);
      }
      if (result.projectsBackfilled !== undefined) {
        console.log(`- Projects backfilled: ${result.projectsBackfilled}`);
      }
      if (result.tasksBackfilled !== undefined) {
        console.log(`- Tasks backfilled: ${result.tasksBackfilled}`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("\nMigration FAILED:", err);
      process.exit(1);
    });
}
