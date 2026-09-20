import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { setDatabaseForTesting } from "@/lib/db";
import { testAuthStorage } from "@/lib/db/auth";
import {
  deleteAccountAction,
  transferWorkspaceOwnershipAction,
  createWorkspaceAction,
  deleteWorkspaceAction,
  leaveWorkspaceAction,
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/app/actions";
import { ensureTablesBasic, createCanonicalIndexes } from "@/lib/db/seed";
import {
  runUniquenessMigration,
  checkStableIdentityColumns,
  countPendingResolvableBackfills,
} from "../../scripts/migrate-uniqueness";

function createTempDbPath(name: string): string {
  const tmpDir = path.resolve(process.cwd(), ".test-tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return path.join(
    tmpDir,
    `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.db`
  );
}

function cleanupTempDb(dbFile: string) {
  try {
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
    if (fs.existsSync(`${dbFile}-wal`)) fs.unlinkSync(`${dbFile}-wal`);
    if (fs.existsSync(`${dbFile}-shm`)) fs.unlinkSync(`${dbFile}-shm`);
  } catch {}
}

interface TableSnapshots {
  users: unknown[];
  workspaces: unknown[];
  workspace_members: unknown[];
  projects: unknown[];
  tasks: unknown[];
}

function takeFullSnapshot(sqlite: Database.Database): TableSnapshots {
  return {
    users: sqlite.prepare("SELECT * FROM users ORDER BY id ASC").all(),
    workspaces: sqlite.prepare("SELECT * FROM workspaces ORDER BY id ASC").all(),
    workspace_members: sqlite
      .prepare("SELECT * FROM workspace_members ORDER BY id ASC")
      .all(),
    projects: sqlite.prepare("SELECT * FROM projects ORDER BY id ASC").all(),
    tasks: sqlite.prepare("SELECT * FROM tasks ORDER BY id ASC").all(),
  };
}

async function runLifecycleTests() {
  console.log("==================================================");
  console.log("RUNNING WORKSPACE LIFECYCLE & STABLE IDENTITY TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (!condition) {
      console.error(`  FAIL: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    } else {
      console.log(`  PASS: ${testName}`);
      passed++;
    }
  }

  const dbPath = createTempDbPath("lifecycle-test");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  ensureTablesBasic(sqlite);
  createCanonicalIndexes(sqlite);
  setDatabaseForTesting(sqlite);

  const now = new Date().toISOString();

  try {
    // --- Seed Base Data ---
    // Users: u_owner (owns ws1 & ws2), u_member1 (in ws1), u_member2 (in ws2), u_cross (in ws2 only)
    sqlite
      .prepare(
        "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("u_owner", "owner@test.com", "uowner", "Alice Owner", "hash", null, now);
    sqlite
      .prepare(
        "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("u_member1", "m1@test.com", "umem1", "Bob Member", "hash", null, now);
    sqlite
      .prepare(
        "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("u_member2", "m2@test.com", "umem2", "Carol Member", "hash", null, now);
    sqlite
      .prepare(
        "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("u_cross", "cross@test.com", "ucross", "Dave Cross", "hash", null, now);

    // Workspaces
    // ws1: multi-member (u_owner, u_member1)
    sqlite
      .prepare(
        "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("ws1", "Workspace Alpha", "ws-alpha", "Pro", 1, now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws1_owner", "ws1", "u_owner", "owner", now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws1_m1", "ws1", "u_member1", "member", now);

    // ws2: multi-member (u_owner, u_member2, u_cross)
    sqlite
      .prepare(
        "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("ws2", "Workspace Beta", "ws-beta", "Pro", 1, now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws2_owner", "ws2", "u_owner", "owner", now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws2_m2", "ws2", "u_member2", "member", now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws2_cross", "ws2", "u_cross", "member", now);

    // ws_sole: sole-member (u_owner only)
    sqlite
      .prepare(
        "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("ws_sole", "Workspace Sole", "ws-sole", "Pro", 1, now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws_sole_owner", "ws_sole", "u_owner", "owner", now);

    // =========================================================================
    // Group A: Account Deletion Invariants
    // =========================================================================
    console.log("\n[Group A: Account Deletion Invariants & Replacements]");

    // A.1 Missing replacement owners blocks account deletion with clear error
    await testAuthStorage!.run({ userId: "u_owner" }, async () => {
      const snapBefore = takeFullSnapshot(sqlite);
      const resMissing = await deleteAccountAction();
      assert(resMissing.success === false, "deleteAccountAction fails when replacements are missing");
      assert(
        resMissing.error!.includes("Cannot delete account: you are the sole owner of active multi-member workspace(s)") &&
          resMissing.error!.includes("Workspace Alpha") &&
          resMissing.error!.includes("Workspace Beta"),
        "Returns clear interim blocker error listing multi-member workspaces"
      );
      const snapAfter = takeFullSnapshot(sqlite);
      assert(
        JSON.stringify(snapBefore) === JSON.stringify(snapAfter),
        "Database is 100% unchanged when deleteAccountAction is blocked"
      );
    });

    // A.2 Invalid replacement: same-user replacement fails
    await testAuthStorage!.run({ userId: "u_owner" }, async () => {
      const snapBefore = takeFullSnapshot(sqlite);
      const resSelf = await deleteAccountAction({
        replacementOwners: { ws1: "u_owner", ws2: "u_member2" },
      });
      assert(resSelf.success === false, "Self-replacement is rejected");
      assert(
        resSelf.error!.includes("Cannot assign yourself as replacement owner"),
        "Returns clear self-replacement error"
      );
      const snapAfter = takeFullSnapshot(sqlite);
      assert(JSON.stringify(snapBefore) === JSON.stringify(snapAfter), "Database unchanged on self-replacement rejection");
    });

    // A.3 Invalid replacement: cross-workspace replacement fails (u_cross is not in ws1)
    await testAuthStorage!.run({ userId: "u_owner" }, async () => {
      const snapBefore = takeFullSnapshot(sqlite);
      const resCross = await deleteAccountAction({
        replacementOwners: { ws1: "u_cross", ws2: "u_member2" },
      });
      assert(resCross.success === false, "Cross-workspace replacement is rejected");
      assert(
        resCross.error!.includes("Replacement user u_cross is not a member of workspace 'Workspace Alpha'"),
        "Returns clear non-member error for cross-workspace user"
      );
      const snapAfter = takeFullSnapshot(sqlite);
      assert(JSON.stringify(snapBefore) === JSON.stringify(snapAfter), "Database unchanged on cross-workspace rejection");
    });

    // A.4 Invalid replacement: partial replacement list fails
    await testAuthStorage!.run({ userId: "u_owner" }, async () => {
      const snapBefore = takeFullSnapshot(sqlite);
      const resPartial = await deleteAccountAction({
        replacementOwners: { ws1: "u_member1" }, // missing ws2
      });
      assert(resPartial.success === false, "Partial replacement list is rejected");
      assert(
        resPartial.error!.includes("replacement owner required for workspace 'Workspace Beta'"),
        "Identifies missing workspace in partial replacement"
      );
      const snapAfter = takeFullSnapshot(sqlite);
      assert(JSON.stringify(snapBefore) === JSON.stringify(snapAfter), "Database unchanged on partial replacement rejection");
    });

    // A.5 Forced failure during second transfer rolls back first transfer and preserves account
    // Use a temporary SQLite trigger on workspace_members (Condition 9)
    await testAuthStorage!.run({ userId: "u_owner" }, async () => {
      const snapBefore = takeFullSnapshot(sqlite);

      sqlite.exec(`
        CREATE TRIGGER test_force_second_transfer_failure
        BEFORE UPDATE OF role ON workspace_members
        WHEN NEW.workspace_id = 'ws2' AND NEW.role = 'owner'
        BEGIN
          SELECT RAISE(FAIL, 'Simulated trigger failure during second transfer');
        END;
      `);

      let forcedThrew = false;
      try {
        const resForced = await deleteAccountAction({
          replacementOwners: { ws1: "u_member1", ws2: "u_member2" },
        });
        forcedThrew = resForced.success === false;
      } catch {
        forcedThrew = true;
      }
      assert(forcedThrew, "Forced failure on second transfer threw error");

      sqlite.exec("DROP TRIGGER IF EXISTS test_force_second_transfer_failure;");

      const snapAfter = takeFullSnapshot(sqlite);
      assert(
        JSON.stringify(snapBefore) === JSON.stringify(snapAfter),
        "Full serialized row snapshots match 100%: first transfer and account rolled back completely"
      );
    });

    // A.6 Successful atomic account deletion with valid replacements
    await testAuthStorage!.run({ userId: "u_owner" }, async () => {
      const resSuccess = await deleteAccountAction({
        replacementOwners: { ws1: "u_member1", ws2: "u_member2" },
      });
      assert(resSuccess.success === true, "deleteAccountAction succeeds with valid replacements");

      // Verify user is deleted
      const userExists = sqlite.prepare("SELECT id FROM users WHERE id = 'u_owner'").get();
      assert(!userExists, "User record u_owner is deleted");

      // Verify sole-member workspace is deleted
      const soleWs = sqlite.prepare("SELECT id FROM workspaces WHERE id = 'ws_sole'").get();
      assert(!soleWs, "Sole-member workspace ws_sole is deleted");

      // Verify surviving workspaces each have exactly 1 owner
      const ws1Owners = sqlite
        .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = 'ws1' AND role = 'owner'")
        .all() as { user_id: string }[];
      assert(
        ws1Owners.length === 1 && ws1Owners[0].user_id === "u_member1",
        "ws1 has exactly 1 owner: u_member1"
      );

      const ws2Owners = sqlite
        .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = 'ws2' AND role = 'owner'")
        .all() as { user_id: string }[];
      assert(
        ws2Owners.length === 1 && ws2Owners[0].user_id === "u_member2",
        "ws2 has exactly 1 owner: u_member2"
      );

      // Verify u_owner has 0 memberships anywhere
      const remainingMemberships = sqlite
        .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE user_id = 'u_owner'")
        .get() as { cnt: number };
      assert(remainingMemberships.cnt === 0, "u_owner has 0 memberships remaining");
    });

    // =========================================================================
    // Group B: Ownership Transfer Invariants
    // =========================================================================
    console.log("\n[Group B: Ownership Transfer Invariants]");

    // Current state: u_member1 is owner of ws1. Let's add another member u_member_extra to ws1
    sqlite
      .prepare(
        "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("u_extra", "extra@test.com", "uextra", "Extra Member", "hash", null, now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws1_extra", "ws1", "u_extra", "member", now);

    // B.1 Non-owner cannot transfer ownership
    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resNonOwner = await transferWorkspaceOwnershipAction("ws1", "u_member1");
      assert(resNonOwner.success === false, "Non-owner transfer is rejected");
      assert(
        resNonOwner.error!.includes("Only the current workspace owner can transfer ownership"),
        "Returns caller-not-owner error"
      );
    });

    // B.2 Cannot transfer to self
    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const resSelfTransfer = await transferWorkspaceOwnershipAction("ws1", "u_member1");
      assert(resSelfTransfer.success === false, "Transfer to self is rejected");
      assert(
        resSelfTransfer.error!.includes("You are already the owner of this workspace"),
        "Returns already-owner error"
      );
    });

    // B.3 Cannot transfer to non-member
    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const resNonMemberTransfer = await transferWorkspaceOwnershipAction("ws1", "u_cross"); // u_cross is in ws2, not ws1
      assert(resNonMemberTransfer.success === false, "Transfer to non-member is rejected");
      assert(
        resNonMemberTransfer.error!.includes("Target user is not a member of this workspace"),
        "Returns target-not-member error"
      );
    });

    // B.4 Forced failure during ownership transfer rolls back completely
    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const snapBefore = takeFullSnapshot(sqlite);

      sqlite.exec(`
        CREATE TRIGGER test_force_ownership_transfer_fail
        BEFORE UPDATE OF role ON workspace_members
        WHEN NEW.user_id = 'u_extra' AND NEW.role = 'owner'
        BEGIN
          SELECT RAISE(FAIL, 'Simulated trigger failure during ownership promotion');
        END;
      `);

      const resForced = await transferWorkspaceOwnershipAction("ws1", "u_extra");
      assert(resForced.success === false, "Transfer fails when trigger aborts promotion");

      sqlite.exec("DROP TRIGGER IF EXISTS test_force_ownership_transfer_fail;");

      const snapAfter = takeFullSnapshot(sqlite);
      assert(
        JSON.stringify(snapBefore) === JSON.stringify(snapAfter),
        "Snapshots match 100%: u_member1 remains sole owner, u_extra remains member"
      );
    });

    // B.5 Successful atomic ownership transfer: caller demoted to admin, target promoted to owner
    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const resSuccess = await transferWorkspaceOwnershipAction("ws1", "u_extra");
      assert(resSuccess.success === true, "transferWorkspaceOwnershipAction succeeds");

      const ws1Owners = sqlite
        .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = 'ws1' AND role = 'owner'")
        .all() as { user_id: string }[];
      assert(
        ws1Owners.length === 1 && ws1Owners[0].user_id === "u_extra",
        "ws1 has exactly 1 owner: u_extra"
      );

      const oldOwnerRole = (
        sqlite
          .prepare("SELECT role FROM workspace_members WHERE workspace_id = 'ws1' AND user_id = 'u_member1'")
          .get() as { role: string }
      ).role;
      assert(oldOwnerRole === "admin", "Previous owner u_member1 is now admin");
    });

    // B.6 Zero-owner and multiple-owner starting states fail closed
    // Zero-owner workspace
    sqlite
      .prepare(
        "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("ws_zero_owners", "WS Zero", "ws-zero", "Pro", 1, now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_zo_1", "ws_zero_owners", "u_extra", "member", now);

    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resZero = await transferWorkspaceOwnershipAction("ws_zero_owners", "u_extra");
      assert(resZero.success === false, "Transfer on 0-owner workspace fails closed");
      assert(
        resZero.error!.includes("workspace must start with exactly one owner"),
        "Zero-owner invariant error returned"
      );
    });

    // Multi-owner workspace (bypass normal flow to seed 2 owners)
    sqlite
      .prepare(
        "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("ws_multi_owners", "WS Multi", "ws-multi", "Pro", 1, now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_mo_1", "ws_multi_owners", "u_extra", "owner", now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_mo_2", "ws_multi_owners", "u_member1", "owner", now);

    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resMulti = await transferWorkspaceOwnershipAction("ws_multi_owners", "u_member1");
      assert(resMulti.success === false, "Transfer on multi-owner workspace fails closed");
      assert(
        resMulti.error!.includes("workspace must start with exactly one owner"),
        "Multi-owner invariant error returned"
      );
    });

    // =========================================================================
    // Group C: Stable Identity Authorization (Tasks & Projects)
    // =========================================================================
    console.log("\n[Group C: Stable Identity Authorization]");

    // Setup: Two distinct users with the EXACT SAME display name: "Jordan Smith"
    sqlite
      .prepare(
        "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("u_jordan_legit", "jordan1@test.com", "jordan1", "Jordan Smith", "hash", null, now);
    sqlite
      .prepare(
        "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("u_jordan_imposter", "jordan2@test.com", "jordan2", "Jordan Smith", "hash", null, now);

    // Add both as members to ws1
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws1_j1", "ws1", "u_jordan_legit", "member", now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_ws1_j2", "ws1", "u_jordan_imposter", "member", now);

    // C.1 Task Assignee Resolution & Deletion Guard
    // When legit Jordan creates a task passing assigneeUserId:
    let taskId = "";
    await testAuthStorage!.run({ userId: "u_jordan_legit" }, async () => {
      const resCreateTask = await createTaskAction({
        workspaceId: "ws1",
        title: "Legit Jordan Task",
        assigneeUserId: "u_jordan_legit",
      });
      assert(resCreateTask.success === true, "createTaskAction succeeds with assigneeUserId");
      taskId = resCreateTask.id!;

      const createdTask = sqlite
        .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
        .get(taskId) as { assignee: string; assignee_user_id: string };
      assert(
        createdTask.assignee === "Jordan Smith" && createdTask.assignee_user_id === "u_jordan_legit",
        "Task stores stable assignee_user_id and display name"
      );
    });

    // C.2 Imposter Jordan with identical display name attempts to delete task -> MUST BE DENIED
    await testAuthStorage!.run({ userId: "u_jordan_imposter" }, async () => {
      const resDeleteImposter = await deleteTaskAction(taskId);
      assert(
        resDeleteImposter.success === false,
        "Imposter Jordan with same display name cannot delete task"
      );
      assert(
        resDeleteImposter.error!.includes("Permission denied"),
        "Returns permission denied error"
      );

      const taskStillExists = sqlite.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
      assert(Boolean(taskStillExists), "Task remains intact after imposter deletion attempt");
    });

    // C.3 Profile rename does NOT remove legitimate permission
    await testAuthStorage!.run({ userId: "u_jordan_legit" }, async () => {
      // Legit Jordan renames profile
      sqlite
        .prepare("UPDATE users SET name = 'Jordan Renamed' WHERE id = 'u_jordan_legit'")
        .run();

      // Test updateTaskAction authorization
      const resUpdateLegit = await updateTaskAction(taskId, { title: "Updated Legit Title" });
      assert(resUpdateLegit.success === true, "Legit assignee can update task");

      // Deleting task succeeds because stable user ID matches
      const resDeleteLegit = await deleteTaskAction(taskId);
      assert(
        resDeleteLegit.success === true,
        "Legit Jordan can delete task after display name change"
      );

      const taskGone = sqlite.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
      assert(!taskGone, "Task was successfully deleted by legitimate user");
    });

    // C.4 Name-based task assignment: duplicate name in workspace leaves assignee_user_id NULL
    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      // Both u_jordan_legit and u_jordan_imposter are in ws1. If we create a task with ambiguous name:
      // First reset legit name to Jordan Smith so there are 2 Jordan Smiths in ws1
      sqlite
        .prepare("UPDATE users SET name = 'Jordan Smith' WHERE id = 'u_jordan_legit'")
        .run();

      const resAmbiguousTask = await createTaskAction({
        workspaceId: "ws1",
        title: "Ambiguous Name Task",
        assignee: "Jordan Smith", // 2 users in ws1 have this name
      });
      assert(resAmbiguousTask.success === true, "Task created with ambiguous assignee name");
      const ambigTask = sqlite
        .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
        .get(resAmbiguousTask.id!) as { assignee: string; assignee_user_id: string | null };

      assert(
        ambigTask.assignee === "Jordan Smith" && ambigTask.assignee_user_id === null,
        "Ambiguous assignee name leaves assignee_user_id as NULL (does not infer identity)"
      );
    });

    // C.4b Update assigned task using only the new assignee name (decoupling stored ID)
    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resCreateReassign = await createTaskAction({
        workspaceId: "ws1",
        title: "Reassignment Test Task",
        assigneeUserId: "u_member1",
      });
      assert(resCreateReassign.success === true, "Task created for reassignment test");
      const reassignTaskId = resCreateReassign.id!;

      const taskInitial = sqlite
        .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
        .get(reassignTaskId) as { assignee: string; assignee_user_id: string };
      assert(
        taskInitial.assignee === "Bob Member" && taskInitial.assignee_user_id === "u_member1",
        "Task initially assigned to Bob Member with u_member1 ID"
      );

      // Unique member display name update: update u_extra name to "Unique Extra"
      sqlite.prepare("UPDATE users SET name = 'Unique Extra' WHERE id = 'u_extra'").run();

      // Update task passing ONLY assignee: "Unique Extra" (no assigneeUserId)
      const resUpdateNameOnly = await updateTaskAction(reassignTaskId, {
        assignee: "Unique Extra",
      });
      assert(resUpdateNameOnly.success === true, "updateTaskAction succeeds with name-only reassignment");

      const taskUpdated = sqlite
        .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
        .get(reassignTaskId) as { assignee: string; assignee_user_id: string };
      assert(
        taskUpdated.assignee === "Unique Extra" && taskUpdated.assignee_user_id === "u_extra",
        "Both assignee and assignee_user_id moved to the new unique member"
      );

      // C.4c Create and update using explicit out-of-workspace or invalid user ID: both reject, update leaves row unchanged
      const resCreateOutOfWs = await createTaskAction({
        workspaceId: "ws1",
        title: "Out-of-Workspace Create Attempt",
        assigneeUserId: "u_member2", // member of ws2, NOT ws1
      });
      assert(resCreateOutOfWs.success === false, "createTaskAction rejects explicit out-of-workspace user ID");
      assert(
        resCreateOutOfWs.error!.includes("Assignee must be an active member of this workspace"),
        "createTaskAction returns clear out-of-workspace membership error"
      );

      const resCreateInvalid = await createTaskAction({
        workspaceId: "ws1",
        title: "Invalid User ID Create Attempt",
        assigneeUserId: "non_existent_user_id_xyz",
      });
      assert(resCreateInvalid.success === false, "createTaskAction rejects invalid user ID");
      assert(
        resCreateInvalid.error!.includes("Assignee must be an active member of this workspace"),
        "createTaskAction returns clear membership error for non-existent user ID"
      );

      // Explicit blank and whitespace IDs on create
      const resCreateBlank = await createTaskAction({
        workspaceId: "ws1",
        title: "Blank User ID Create Attempt",
        assigneeUserId: "",
      });
      assert(resCreateBlank.success === false, "createTaskAction rejects explicit blank assigneeUserId");
      assert(
        resCreateBlank.error!.includes("Assignee must be an active member of this workspace"),
        "createTaskAction returns clear membership error for blank assigneeUserId"
      );

      const resCreateWhitespace = await createTaskAction({
        workspaceId: "ws1",
        title: "Whitespace User ID Create Attempt",
        assigneeUserId: "   \t  ",
      });
      assert(resCreateWhitespace.success === false, "createTaskAction rejects explicit whitespace assigneeUserId");
      assert(
        resCreateWhitespace.error!.includes("Assignee must be an active member of this workspace"),
        "createTaskAction returns clear membership error for whitespace assigneeUserId"
      );

      // Pre-update snapshot
      const preUpdateSnapshot = sqlite
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(reassignTaskId) as Record<string, unknown>;

      const resUpdateOutOfWs = await updateTaskAction(reassignTaskId, {
        assigneeUserId: "u_member2", // member of ws2, NOT ws1
      });
      assert(resUpdateOutOfWs.success === false, "updateTaskAction rejects explicit out-of-workspace user ID");
      assert(
        resUpdateOutOfWs.error!.includes("Assignee must be an active member of this workspace"),
        "updateTaskAction returns clear out-of-workspace membership error"
      );

      const resUpdateInvalid = await updateTaskAction(reassignTaskId, {
        assigneeUserId: "non_existent_user_id_xyz",
      });
      assert(resUpdateInvalid.success === false, "updateTaskAction rejects invalid user ID");
      assert(
        resUpdateInvalid.error!.includes("Assignee must be an active member of this workspace"),
        "updateTaskAction returns clear membership error for non-existent user ID"
      );

      const resUpdateBlank = await updateTaskAction(reassignTaskId, {
        assigneeUserId: "",
      });
      assert(resUpdateBlank.success === false, "updateTaskAction rejects explicit blank assigneeUserId");
      assert(
        resUpdateBlank.error!.includes("Assignee must be an active member of this workspace"),
        "updateTaskAction returns clear membership error for blank assigneeUserId"
      );

      const resUpdateWhitespace = await updateTaskAction(reassignTaskId, {
        assigneeUserId: "   \t\n  ",
      });
      assert(resUpdateWhitespace.success === false, "updateTaskAction rejects explicit whitespace assigneeUserId");
      assert(
        resUpdateWhitespace.error!.includes("Assignee must be an active member of this workspace"),
        "updateTaskAction returns clear membership error for whitespace assigneeUserId"
      );

      // Post-update snapshot must match 100%
      const postUpdateSnapshot = sqlite
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(reassignTaskId) as Record<string, unknown>;
      assert(
        JSON.stringify(preUpdateSnapshot) === JSON.stringify(postUpdateSnapshot),
        "Existing task row is exactly unchanged after rejected out-of-workspace, invalid, blank, or whitespace update"
      );

      // C.4d Unassignment using assignee: 'Unassigned' with assigneeUserId omitted
      const resUnassign = await updateTaskAction(reassignTaskId, {
        assignee: "Unassigned",
      });
      assert(resUnassign.success === true, "updateTaskAction succeeds for unassignment with assignee: 'Unassigned'");
      const unassignedTask = sqlite
        .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
        .get(reassignTaskId) as { assignee: string; assignee_user_id: string | null };
      assert(
        unassignedTask.assignee === "Unassigned" && unassignedTask.assignee_user_id === null,
        "Task row correctly updated to assignee: 'Unassigned' and assignee_user_id: null"
      );
    });

    // C.5 Project Creation & Stable Lead Identity
    let projId = "";
    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resCreateProj = await createProjectAction({
        workspaceId: "ws1",
        name: "Stable Project Alpha",
        ownerUserId: "u_jordan_legit",
      });
      assert(resCreateProj.success === true, "createProjectAction succeeds with ownerUserId");
      projId = resCreateProj.id!;

      const createdProj = sqlite
        .prepare("SELECT owner, owner_user_id FROM projects WHERE id = ?")
        .get(projId) as { owner: string; owner_user_id: string };
      assert(
        createdProj.owner === "Jordan Smith" && createdProj.owner_user_id === "u_jordan_legit",
        "Project owner_user_id set from validated leadUserId"
      );
    });

    // C.6 Imposter with same display name attempts to delete project -> MUST BE DENIED
    await testAuthStorage!.run({ userId: "u_jordan_imposter" }, async () => {
      const resProjDeleteImposter = await deleteProjectAction(projId);
      assert(
        resProjDeleteImposter.success === false,
        "Imposter with same display name cannot delete project"
      );
      const projStillExists = sqlite.prepare("SELECT id FROM projects WHERE id = ?").get(projId);
      assert(Boolean(projStillExists), "Project remains intact after imposter delete attempt");
    });

    // C.7 Legit lead can delete project even after profile rename
    await testAuthStorage!.run({ userId: "u_jordan_legit" }, async () => {
      sqlite
        .prepare("UPDATE users SET name = 'Jordan Super Renamed' WHERE id = 'u_jordan_legit'")
        .run();

      const resProjDeleteLegit = await deleteProjectAction(projId);
      assert(
        resProjDeleteLegit.success === true,
        "Legit project lead can delete project after profile rename"
      );
      const projGone = sqlite.prepare("SELECT id FROM projects WHERE id = ?").get(projId);
      assert(!projGone, "Project successfully deleted");
    });

    // C.8 updateProjectAction owner display name and ownerUserId synchronization
    // Create another project to test updateProjectAction
    let proj2Id = "";
    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resCreate = await createProjectAction({
        workspaceId: "ws1",
        name: "Sync Test Project",
        ownerUserId: "u_member1",
      });
      proj2Id = resCreate.id!;
    });

    sqlite
      .prepare("UPDATE users SET name = 'Jordan Smith' WHERE id = 'u_jordan_legit'")
      .run();

    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      // 1. Ambiguous owner name update rejected
      const resAmbig = await updateProjectAction(proj2Id, {
        owner: "Jordan Smith", // 2 users have this name
      });
      assert(
        resAmbig.success === false && resAmbig.error!.includes("Multiple workspace members match this name"),
        "updateProjectAction rejects ambiguous owner name"
      );

      // 2. Non-member owner name update rejected
      const resNonMem = await updateProjectAction(proj2Id, {
        owner: "NonExistent Person",
      });
      assert(
        resNonMem.success === false && resNonMem.error!.includes("Project owner must be an active member"),
        "updateProjectAction rejects non-member owner name"
      );

      // 3. Unique owner name update succeeds and synchronizes ownerUserId
      const resUnique = await updateProjectAction(proj2Id, {
        owner: "Bob Member", // exactly 1 user (u_member1)
      });
      assert(resUnique.success === true, "updateProjectAction succeeds with unique owner name");

      const projAfter = sqlite
        .prepare("SELECT owner, owner_user_id FROM projects WHERE id = ?")
        .get(proj2Id) as { owner: string; owner_user_id: string };
      assert(
        projAfter.owner === "Bob Member" && projAfter.owner_user_id === "u_member1",
        "updateProjectAction synchronized owner display name and owner_user_id"
      );
    });

    // =========================================================================
    // Group D: Lifecycle Atomic Actions (Workspace CRUD & Leave)
    // =========================================================================
    console.log("\n[Group D: Lifecycle Atomic Actions]");

    // D.1 createWorkspaceAction is atomic with exactly 1 owner
    let createdWsId = "";
    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const resCreateWs = await createWorkspaceAction({
        name: "Atomic Workspace",
        plan: "Free",
      });
      assert(resCreateWs.success === true, "createWorkspaceAction succeeds");
      createdWsId = resCreateWs.id!;

      const owners = sqlite
        .prepare("SELECT user_id, role FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
        .all(createdWsId) as { user_id: string; role: string }[];
      assert(
        owners.length === 1 && owners[0].user_id === "u_member1",
        "Created workspace has exactly 1 owner: u_member1"
      );
    });

    // D.2 Owner cannot leave multi-member workspace
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run(`wm_${createdWsId}_extra`, createdWsId, "u_extra", "member", now);

    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const resLeaveBlocked = await leaveWorkspaceAction(createdWsId);
      assert(resLeaveBlocked.success === false, "Owner cannot leave multi-member workspace");
      assert(
        resLeaveBlocked.error!.includes("Workspace owners cannot leave while other members exist"),
        "Returns clear leave-blocked error"
      );
    });

    // D.3 Non-owner can leave multi-member workspace
    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resLeaveNonOwner = await leaveWorkspaceAction(createdWsId);
      assert(resLeaveNonOwner.success === true, "Non-owner can leave multi-member workspace");

      const remaining = sqlite
        .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = ?")
        .all(createdWsId) as { user_id: string }[];
      assert(
        remaining.length === 1 && remaining[0].user_id === "u_member1",
        "Only u_member1 remains in workspace"
      );
    });

    // D.4 Sole-member owner leaves -> workspace is deleted
    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const resSoleLeave = await leaveWorkspaceAction(createdWsId);
      assert(resSoleLeave.success === true, "Sole-member owner leaving deletes workspace");

      const wsExists = sqlite.prepare("SELECT id FROM workspaces WHERE id = ?").get(createdWsId);
      assert(!wsExists, "Workspace deleted upon sole member departure");
    });

    // D.5 deleteWorkspaceAction authorization
    const tempWsId = "ws_to_delete_test";
    sqlite
      .prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(tempWsId, "Delete WS", "delete-ws", "Starter", 0, now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_del_1", tempWsId, "u_member1", "owner", now);
    sqlite
      .prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)")
      .run("wm_del_2", tempWsId, "u_extra", "member", now);

    await testAuthStorage!.run({ userId: "u_extra" }, async () => {
      const resDelNonOwner = await deleteWorkspaceAction(tempWsId);
      assert(resDelNonOwner.success === false, "Non-owner cannot delete workspace");
    });
    await testAuthStorage!.run({ userId: "u_member1" }, async () => {
      const resDelOwner = await deleteWorkspaceAction(tempWsId);
      assert(resDelOwner.success === true, "Owner can delete workspace");
      const delCheck = sqlite.prepare("SELECT id FROM workspaces WHERE id = ?").get(tempWsId);
      assert(!delCheck, "Workspace successfully deleted");
    });

    // =========================================================================
    // Group E: Migration Column Addition & Backfill Priority
    // =========================================================================
    console.log("\n[Group E: Migration Column Addition & Backfill Priority]");

    const migDbPath = createTempDbPath("test-migration-backfill");
    try {
      const migDb = new Database(migDbPath);
      migDb.pragma("journal_mode = WAL");
      migDb.pragma("foreign_keys = ON");

      // Initialize old-schema tables without owner_user_id and assignee_user_id
      migDb.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          avatar TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          plan TEXT NOT NULL DEFAULT 'Starter',
          is_public INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE TABLE workspace_members (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'member',
          joined_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX idx_workspace_members_ws_user ON workspace_members(workspace_id, user_id);
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0,
          due TEXT NOT NULL,
          owner TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Planning',
          overview TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE project_members (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'contributor',
          initials TEXT NOT NULL,
          color TEXT NOT NULL
        );
        CREATE UNIQUE INDEX idx_project_members_proj_user ON project_members(project_id, user_id) WHERE user_id IS NOT NULL;
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          assignee TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Todo',
          priority TEXT NOT NULL DEFAULT 'Medium',
          due TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      // Seed data
      migDb
        .prepare(
          "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u_alice", "alice@test.com", "alice", "Alice Lead", "hash", null, now);
      migDb
        .prepare(
          "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u_bob", "bob@test.com", "bob", "Bob Contributor", "hash", null, now);
      migDb
        .prepare(
          "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u_charlie1", "charlie1@test.com", "charlie1", "Charlie Dual", "hash", null, now);
      migDb
        .prepare(
          "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u_charlie2", "charlie2@test.com", "charlie2", "Charlie Dual", "hash", null, now);

      migDb
        .prepare(
          "INSERT INTO workspaces VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("ws_mig", "Mig WS", "mig-ws", "Starter", 0, now);
      migDb
        .prepare(
          "INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_a", "ws_mig", "u_alice", "owner", now);
      migDb
        .prepare(
          "INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_b", "ws_mig", "u_bob", "member", now);
      migDb
        .prepare(
          "INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_c1", "ws_mig", "u_charlie1", "member", now);
      migDb
        .prepare(
          "INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_c2", "ws_mig", "u_charlie2", "member", now);

      // p1: has lead row in project_members
      migDb
        .prepare(
          "INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("p1", "ws_mig", "Project 1", 0, "2026-12-31", "Alice Lead", "Planning", "Overview 1", now);
      migDb
        .prepare(
          "INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("pm_p1_lead", "p1", "u_alice", "Alice Lead", "lead", "AL", "bg-blue-500");
      migDb
        .prepare(
          "INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("pm_p1_bob", "p1", "u_bob", "Bob Contributor", "contributor", "BC", "bg-green-500");

      // p2: lead has null user_id, owner matches unique workspace member Bob Contributor
      migDb
        .prepare(
          "INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("p2", "ws_mig", "Project 2", 0, "2026-12-31", "Bob Contributor", "Planning", "Overview 2", now);
      migDb
        .prepare(
          "INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("pm_p2_lead", "p2", null, "Bob Contributor", "lead", "BC", "bg-green-500");

      // p3: ambiguous owner name (Charlie Dual matches 2 workspace members), lead has null user_id
      migDb
        .prepare(
          "INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("p3", "ws_mig", "Project 3", 0, "2026-12-31", "Charlie Dual", "Planning", "Overview 3", now);
      migDb
        .prepare(
          "INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("pm_p3_lead", "p3", null, "Charlie Dual", "lead", "CD", "bg-purple-500");

      // p4: unresolvable owner name (0 matches), lead has null user_id
      migDb
        .prepare(
          "INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("p4", "ws_mig", "Project 4", 0, "2026-12-31", "Ghost User", "Planning", "Overview 4", now);
      migDb
        .prepare(
          "INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("pm_p4_lead", "p4", null, "Ghost User", "lead", "GU", "bg-gray-500");

      // Tasks
      migDb
        .prepare(
          "INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("t1", "ws_mig", "p1", "Task 1", "Alice Lead", "Todo", "Medium", "2026-12-31", now);
      migDb
        .prepare(
          "INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("t2", "ws_mig", "p1", "Task 2", "Charlie Dual", "Todo", "Medium", "2026-12-31", now);
      migDb
        .prepare(
          "INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("t3", "ws_mig", "p1", "Task 3", "Unassigned", "Todo", "Medium", "2026-12-31", now);

      // 1. Column detection
      const colStatus = checkStableIdentityColumns(migDb);
      assert(
        colStatus.missingColumns.includes("projects.owner_user_id") &&
          colStatus.missingColumns.includes("tasks.assignee_user_id"),
        "Detects missing stable identity columns on old schema"
      );

      // 2. Pending backfill count
      const pendingBackfills = countPendingResolvableBackfills(migDb, colStatus);
      assert(
        pendingBackfills.resolvableProjects === 2 && pendingBackfills.unresolvableProjects === 2,
        "Correctly identifies 2 resolvable and 2 unresolvable projects"
      );
      assert(
        pendingBackfills.resolvableTasks === 1 && pendingBackfills.unresolvableTasks === 1,
        "Correctly identifies 1 resolvable and 1 unresolvable task"
      );

      migDb.close();

      // 3. Dry-run on old schema: must NOT return alreadyApplied
      const dryRes = await runUniquenessMigration({ dbPath: migDbPath, dryRun: true });
      assert(dryRes.success === true && dryRes.dryRun === true, "Dry-run succeeds on old schema");
      assert(dryRes.alreadyApplied === false, "Dry-run does not report alreadyApplied when columns missing");
      assert(dryRes.missingColumnsFound?.length === 2, "Dry-run reports 2 missing columns");
      assert(dryRes.projectsPendingBackfill === 2, "Dry-run reports 2 projects pending backfill");
      assert(dryRes.tasksPendingBackfill === 1, "Dry-run reports 1 task pending backfill");

      // 4. Live migration on old schema
      const liveRes = await runUniquenessMigration({ dbPath: migDbPath, dryRun: false, skipBackup: true });
      assert(liveRes.success === true, "Live migration succeeds on old schema");
      assert(liveRes.projectsBackfilled === 2, "Live migration backfills 2 projects");
      assert(liveRes.tasksBackfilled === 1, "Live migration backfills 1 task");

      // 5. Verify database contents
      const verifyDb = new Database(migDbPath, { readonly: true });
      const p1Row = verifyDb
        .prepare("SELECT owner_user_id FROM projects WHERE id = 'p1'")
        .get() as { owner_user_id: string };
      assert(p1Row.owner_user_id === "u_alice", "p1 owner_user_id backfilled from lead row priority");

      const p2Row = verifyDb
        .prepare("SELECT owner_user_id FROM projects WHERE id = 'p2'")
        .get() as { owner_user_id: string };
      assert(p2Row.owner_user_id === "u_bob", "p2 owner_user_id backfilled from unique name fallback");

      const p3Row = verifyDb
        .prepare("SELECT owner_user_id FROM projects WHERE id = 'p3'")
        .get() as { owner_user_id: string | null };
      assert(p3Row.owner_user_id === null, "p3 owner_user_id left NULL due to ambiguous name match");

      const p4Row = verifyDb
        .prepare("SELECT owner_user_id FROM projects WHERE id = 'p4'")
        .get() as { owner_user_id: string | null };
      assert(p4Row.owner_user_id === null, "p4 owner_user_id left NULL due to zero member matches");

      const t1Row = verifyDb
        .prepare("SELECT assignee_user_id FROM tasks WHERE id = 't1'")
        .get() as { assignee_user_id: string };
      assert(t1Row.assignee_user_id === "u_alice", "t1 assignee_user_id backfilled from unique name");

      const t2Row = verifyDb
        .prepare("SELECT assignee_user_id FROM tasks WHERE id = 't2'")
        .get() as { assignee_user_id: string | null };
      assert(t2Row.assignee_user_id === null, "t2 assignee_user_id left NULL due to ambiguous name match");

      const t3Row = verifyDb
        .prepare("SELECT assignee_user_id FROM tasks WHERE id = 't3'")
        .get() as { assignee_user_id: string | null };
      assert(t3Row.assignee_user_id === null, "t3 assignee_user_id left NULL for unassigned task");
      verifyDb.close();

      // 6. Post-migration dry run: MUST report alreadyApplied: true
      const postDryRes = await runUniquenessMigration({ dbPath: migDbPath, dryRun: true });
      assert(
        postDryRes.success === true && postDryRes.alreadyApplied === true,
        "Post-migration dry-run reports alreadyApplied = true"
      );

      // 7. Post-migration live run: MUST report alreadyApplied: true
      const postLiveRes = await runUniquenessMigration({ dbPath: migDbPath, dryRun: false, skipBackup: true });
      assert(
        postLiveRes.success === true && postLiveRes.alreadyApplied === true,
        "Post-migration live run reports alreadyApplied = true"
      );
    } finally {
      cleanupTempDb(migDbPath);
    }
  } finally {
    setDatabaseForTesting(undefined);
    sqlite.close();
    cleanupTempDb(dbPath);
  }

  console.log("\n==================================================");
  console.log(`LIFECYCLE TESTS COMPLETE: ${passed} of ${total} passed.`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runLifecycleTests().catch((err) => {
  console.error("FATAL in lifecycle test suite:", err);
  process.exit(1);
});
