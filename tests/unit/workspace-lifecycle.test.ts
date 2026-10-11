import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

vi.mock("next/headers", async () => {
  const { cookiesMock, headersMock } = await import("./helpers/next-mocks");
  return { cookies: cookiesMock, headers: headersMock };
});
vi.mock("next/cache", async () => {
  const { revalidatePathMock, revalidateTagMock } = await import("./helpers/next-mocks");
  return { revalidatePath: revalidatePathMock, revalidateTag: revalidateTagMock };
});

import { testAuthStorage } from "@/lib/db/auth";
import { deleteAccountAction } from "@/app/actions-auth";
import { createProjectAction, updateProjectAction, deleteProjectAction } from "@/app/actions-projects";
import { createTaskAction, updateTaskAction, deleteTaskAction } from "@/app/actions-tasks";
import { transferWorkspaceOwnershipAction, createWorkspaceAction, deleteWorkspaceAction, leaveWorkspaceAction } from "@/app/actions-workspaces";
import {
  runUniquenessMigration,
  checkStableIdentityColumns,
  countPendingResolvableBackfills,
} from "../../scripts/migrate-uniqueness";
import {
  createTestDatabase,
  destroyTestDatabase,
  type UnitTestDatabase,
} from "./helpers/test-db";

const now = new Date().toISOString();

let testDb: UnitTestDatabase;

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
  } catch {
    /* already cleaned */
  }
}

type TableSnapshots = {
  users: unknown[];
  workspaces: unknown[];
  workspace_members: unknown[];
  projects: unknown[];
  tasks: unknown[];
};

async function takeFullSnapshot(db: UnitTestDatabase): Promise<TableSnapshots> {
  return {
    users: await db.prepare("SELECT * FROM users ORDER BY id ASC").all(),
    workspaces: await db.prepare("SELECT * FROM workspaces ORDER BY id ASC").all(),
    workspace_members: await db
      .prepare("SELECT * FROM workspace_members ORDER BY id ASC")
      .all(),
    projects: await db.prepare("SELECT * FROM projects ORDER BY id ASC").all(),
    tasks: await db.prepare("SELECT * FROM tasks ORDER BY id ASC").all(),
  };
}

async function insertUser(id: string, email: string, username: string, name: string) {
  await testDb
    .prepare(
      "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, email, username, name, "hash", null, now);
}

async function insertWorkspace(id: string, name: string, slug: string, isPublic = true) {
  await testDb
    .prepare(
      "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, name, slug, "Pro", isPublic, now);
}

async function insertWorkspaceMember(
  id: string,
  workspaceId: string,
  userId: string,
  role: string,
  joinedAt: string = now
) {
  await testDb
    .prepare(
      "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, workspaceId, userId, role, joinedAt);
}

beforeAll(async () => {
  testDb = await createTestDatabase();

  // Base fixture: users and workspaces shared by Groups A-D
  await insertUser("u_owner", "owner@test.com", "uowner", "Alice Owner");
  await insertUser("u_member1", "m1@test.com", "umem1", "Bob Member");
  await insertUser("u_member2", "m2@test.com", "umem2", "Carol Member");
  await insertUser("u_cross", "cross@test.com", "ucross", "Dave Cross");

  await insertWorkspace("ws1", "Workspace Alpha", "ws-alpha");
  await insertWorkspace("ws2", "Workspace Beta", "ws-beta");
  await insertWorkspace("ws_sole", "Workspace Sole", "ws-sole");

  // ws1: multi-member (u_owner, u_member1)
  await insertWorkspaceMember("wm_ws1_owner", "ws1", "u_owner", "owner");
  await insertWorkspaceMember("wm_ws1_m1", "ws1", "u_member1", "member");
  // ws2: multi-member (u_owner, u_member2, u_cross)
  await insertWorkspaceMember("wm_ws2_owner", "ws2", "u_owner", "owner");
  await insertWorkspaceMember("wm_ws2_m2", "ws2", "u_member2", "member");
  await insertWorkspaceMember("wm_ws2_cross", "ws2", "u_cross", "member");
  // ws_sole: sole-member (u_owner only)
  await insertWorkspaceMember("wm_ws_sole_owner", "ws_sole", "u_owner", "owner");
});

afterAll(async () => {
  await destroyTestDatabase(testDb);
});

describe("workspace lifecycle & stable identity", () => {
  describe("Group A: Account deletion invariants & replacements", () => {
    it("A.1 blocked when replacement owners are missing; database unchanged", async () => {
      await testAuthStorage!.run({ userId: "u_owner" }, async () => {
        const snapBefore = await takeFullSnapshot(testDb);
        const resMissing = await deleteAccountAction();
        expect(resMissing.success).toBe(false);
        expect(resMissing.error).toContain(
          "Cannot delete account: you are the sole owner of active multi-member workspace(s)"
        );
        expect(resMissing.error).toContain("Workspace Alpha");
        expect(resMissing.error).toContain("Workspace Beta");

        const snapAfter = await takeFullSnapshot(testDb);
        expect(JSON.stringify(snapAfter)).toBe(JSON.stringify(snapBefore));
      });
    });

    it("A.2 rejects self-replacement; database unchanged", async () => {
      await testAuthStorage!.run({ userId: "u_owner" }, async () => {
        const snapBefore = await takeFullSnapshot(testDb);
        const resSelf = await deleteAccountAction({
          replacementOwners: { ws1: "u_owner", ws2: "u_member2" },
        });
        expect(resSelf.success).toBe(false);
        expect(resSelf.error).toContain("Cannot assign yourself as replacement owner");

        const snapAfter = await takeFullSnapshot(testDb);
        expect(JSON.stringify(snapAfter)).toBe(JSON.stringify(snapBefore));
      });
    });

    it("A.3 rejects cross-workspace replacement; database unchanged", async () => {
      await testAuthStorage!.run({ userId: "u_owner" }, async () => {
        const snapBefore = await takeFullSnapshot(testDb);
        const resCross = await deleteAccountAction({
          replacementOwners: { ws1: "u_cross", ws2: "u_member2" },
        });
        expect(resCross.success).toBe(false);
        expect(resCross.error).toContain(
          "Replacement user u_cross is not a member of workspace 'Workspace Alpha'"
        );

        const snapAfter = await takeFullSnapshot(testDb);
        expect(JSON.stringify(snapAfter)).toBe(JSON.stringify(snapBefore));
      });
    });

    it("A.4 rejects partial replacement lists; database unchanged", async () => {
      await testAuthStorage!.run({ userId: "u_owner" }, async () => {
        const snapBefore = await takeFullSnapshot(testDb);
        const resPartial = await deleteAccountAction({
          replacementOwners: { ws1: "u_member1" }, // missing ws2
        });
        expect(resPartial.success).toBe(false);
        expect(resPartial.error).toContain(
          "replacement owner required for workspace 'Workspace Beta'"
        );

        const snapAfter = await takeFullSnapshot(testDb);
        expect(JSON.stringify(snapAfter)).toBe(JSON.stringify(snapBefore));
      });
    });

    it("A.5 forced failure during second transfer rolls back the first transfer completely", async () => {
      await testAuthStorage!.run({ userId: "u_owner" }, async () => {
        const snapBefore = await takeFullSnapshot(testDb);

        // Condition-9 style failure injection: abort role promotions in ws2.
        await testDb.exec(`
          CREATE OR REPLACE FUNCTION test_force_second_transfer_failure_fn() RETURNS trigger AS $$
          BEGIN RAISE EXCEPTION 'Simulated trigger failure during second transfer'; END;
          $$ LANGUAGE plpgsql;
          CREATE TRIGGER test_force_second_transfer_failure
            BEFORE UPDATE OF role ON workspace_members
            FOR EACH ROW
            WHEN (NEW.workspace_id = 'ws2' AND NEW.role = 'owner')
            EXECUTE FUNCTION test_force_second_transfer_failure_fn();
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
        expect(forcedThrew).toBe(true);

        await testDb.exec(`
          DROP TRIGGER IF EXISTS test_force_second_transfer_failure ON workspace_members;
          DROP FUNCTION IF EXISTS test_force_second_transfer_failure_fn();
        `);

        const snapAfter = await takeFullSnapshot(testDb);
        expect(JSON.stringify(snapAfter)).toBe(JSON.stringify(snapBefore));
      });
    });

    it("A.6 atomic account deletion succeeds with valid replacements", async () => {
      await testAuthStorage!.run({ userId: "u_owner" }, async () => {
        const resSuccess = await deleteAccountAction({
          replacementOwners: { ws1: "u_member1", ws2: "u_member2" },
        });
        expect(resSuccess.success).toBe(true);

        const userExists = await testDb
          .prepare("SELECT id FROM users WHERE id = 'u_owner'")
          .get();
        expect(!userExists).toBe(true);

        const soleWs = await testDb
          .prepare("SELECT id FROM workspaces WHERE id = 'ws_sole'")
          .get();
        expect(!soleWs).toBe(true);

        const ws1Owners = (await testDb
          .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = 'ws1' AND role = 'owner'")
          .all()) as { user_id: string }[];
        expect(ws1Owners).toHaveLength(1);
        expect(ws1Owners[0].user_id).toBe("u_member1");

        const ws2Owners = (await testDb
          .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = 'ws2' AND role = 'owner'")
          .all()) as { user_id: string }[];
        expect(ws2Owners).toHaveLength(1);
        expect(ws2Owners[0].user_id).toBe("u_member2");

        const remainingMemberships = (await testDb
          .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE user_id = 'u_owner'")
          .get()) as { cnt: number };
        expect(remainingMemberships.cnt).toBe(0);
      });
    });
  });

  describe("Group B: Ownership transfer invariants", () => {
    beforeAll(async () => {
      // Current state after A.6: u_member1 owns ws1. Add another member.
      await insertUser("u_extra", "extra@test.com", "uextra", "Extra Member");
      await insertWorkspaceMember("wm_ws1_extra", "ws1", "u_extra", "member");
    });

    it("B.1 non-owner cannot transfer ownership", async () => {
      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resNonOwner = await transferWorkspaceOwnershipAction("ws1", "u_member1");
        expect(resNonOwner.success).toBe(false);
        expect(resNonOwner.error).toContain(
          "Only the current workspace owner can transfer ownership"
        );
      });
    });

    it("B.2 cannot transfer to self", async () => {
      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        const resSelfTransfer = await transferWorkspaceOwnershipAction("ws1", "u_member1");
        expect(resSelfTransfer.success).toBe(false);
        expect(resSelfTransfer.error).toContain(
          "You are already the owner of this workspace"
        );
      });
    });

    it("B.3 cannot transfer to non-member", async () => {
      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        // u_cross is in ws2, not ws1
        const resNonMemberTransfer = await transferWorkspaceOwnershipAction("ws1", "u_cross");
        expect(resNonMemberTransfer.success).toBe(false);
        expect(resNonMemberTransfer.error).toContain(
          "Target user is not a member of this workspace"
        );
      });
    });

    it("B.4 forced failure during transfer rolls back completely", async () => {
      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        const snapBefore = await takeFullSnapshot(testDb);

        await testDb.exec(`
          CREATE OR REPLACE FUNCTION test_force_ownership_transfer_fail_fn() RETURNS trigger AS $$
          BEGIN RAISE EXCEPTION 'Simulated trigger failure during ownership promotion'; END;
          $$ LANGUAGE plpgsql;
          CREATE TRIGGER test_force_ownership_transfer_fail
            BEFORE UPDATE OF role ON workspace_members
            FOR EACH ROW
            WHEN (NEW.user_id = 'u_extra' AND NEW.role = 'owner')
            EXECUTE FUNCTION test_force_ownership_transfer_fail_fn();
        `);

        const resForced = await transferWorkspaceOwnershipAction("ws1", "u_extra");
        expect(resForced.success).toBe(false);

        await testDb.exec(`
          DROP TRIGGER IF EXISTS test_force_ownership_transfer_fail ON workspace_members;
          DROP FUNCTION IF EXISTS test_force_ownership_transfer_fail_fn();
        `);

        const snapAfter = await takeFullSnapshot(testDb);
        expect(JSON.stringify(snapAfter)).toBe(JSON.stringify(snapBefore));
      });
    });

    it("B.5 successful transfer demotes caller to admin and promotes target to owner", async () => {
      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        const resSuccess = await transferWorkspaceOwnershipAction("ws1", "u_extra");
        expect(resSuccess.success).toBe(true);

        const ws1Owners = (await testDb
          .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = 'ws1' AND role = 'owner'")
          .all()) as { user_id: string }[];
        expect(ws1Owners).toHaveLength(1);
        expect(ws1Owners[0].user_id).toBe("u_extra");

        const oldOwnerRole = (
          (await testDb
            .prepare(
              "SELECT role FROM workspace_members WHERE workspace_id = 'ws1' AND user_id = 'u_member1'"
            )
            .get()) as { role: string }
        ).role;
        expect(oldOwnerRole).toBe("admin");
      });
    });

    it("B.6 zero-owner and multi-owner starting states fail closed", async () => {
      // Zero-owner workspace
      await insertWorkspace("ws_zero_owners", "WS Zero", "ws-zero");
      await insertWorkspaceMember("wm_zo_1", "ws_zero_owners", "u_extra", "member");

      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resZero = await transferWorkspaceOwnershipAction("ws_zero_owners", "u_extra");
        expect(resZero.success).toBe(false);
        expect(resZero.error).toContain("workspace must start with exactly one owner");
      });

      // Multi-owner workspace (bypass normal flow to seed 2 owners)
      await insertWorkspace("ws_multi_owners", "WS Multi", "ws-multi");
      await insertWorkspaceMember("wm_mo_1", "ws_multi_owners", "u_extra", "owner");
      await insertWorkspaceMember("wm_mo_2", "ws_multi_owners", "u_member1", "owner");

      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resMulti = await transferWorkspaceOwnershipAction("ws_multi_owners", "u_member1");
        expect(resMulti.success).toBe(false);
        expect(resMulti.error).toContain("workspace must start with exactly one owner");
      });
    });
  });

  describe("Group C: Stable identity authorization (tasks & projects)", () => {
    beforeAll(async () => {
      // Two distinct users with the EXACT SAME display name: "Jordan Smith"
      await insertUser("u_jordan_legit", "jordan1@test.com", "jordan1", "Jordan Smith");
      await insertUser("u_jordan_imposter", "jordan2@test.com", "jordan2", "Jordan Smith");
      await insertWorkspaceMember("wm_ws1_j1", "ws1", "u_jordan_legit", "member");
      await insertWorkspaceMember("wm_ws1_j2", "ws1", "u_jordan_imposter", "member");
    });

    it("C.1-C.3 task assignee resolution, deletion guard, and rename resilience", async () => {
      // C.1 Legit Jordan creates a task passing assigneeUserId
      let taskId = "";
      await testAuthStorage!.run({ userId: "u_jordan_legit" }, async () => {
        const resCreateTask = await createTaskAction({
          workspaceId: "ws1",
          title: "Legit Jordan Task",
          assigneeUserId: "u_jordan_legit",
        });
        expect(resCreateTask.success).toBe(true);
        taskId = resCreateTask.id!;

        const createdTask = (await testDb
          .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
          .get(taskId)) as { assignee: string; assignee_user_id: string };
        expect(createdTask.assignee).toBe("Jordan Smith");
        expect(createdTask.assignee_user_id).toBe("u_jordan_legit");
      });

      // C.2 Imposter Jordan with identical display name cannot delete the task
      await testAuthStorage!.run({ userId: "u_jordan_imposter" }, async () => {
        const resDeleteImposter = await deleteTaskAction(taskId);
        expect(resDeleteImposter.success).toBe(false);
        expect(resDeleteImposter.error).toContain("Permission denied");

        const taskStillExists = await testDb
          .prepare("SELECT id FROM tasks WHERE id = ?")
          .get(taskId);
        expect(Boolean(taskStillExists)).toBe(true);
      });

      // C.3 Profile rename does NOT remove legitimate permission
      await testAuthStorage!.run({ userId: "u_jordan_legit" }, async () => {
        await testDb
          .prepare("UPDATE users SET name = 'Jordan Renamed' WHERE id = 'u_jordan_legit'")
          .run();

        const resUpdateLegit = await updateTaskAction(taskId, { title: "Updated Legit Title" });
        expect(resUpdateLegit.success).toBe(true);

        const resDeleteLegit = await deleteTaskAction(taskId);
        expect(resDeleteLegit.success).toBe(true);

        const taskGone = await testDb.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
        expect(!taskGone).toBe(true);
      });
    });

    it("C.4 ambiguous assignee name leaves assignee_user_id NULL", async () => {
      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        // Reset legit name so there are 2 Jordan Smiths in ws1
        await testDb
          .prepare("UPDATE users SET name = 'Jordan Smith' WHERE id = 'u_jordan_legit'")
          .run();

        const resAmbiguousTask = await createTaskAction({
          workspaceId: "ws1",
          title: "Ambiguous Name Task",
          assignee: "Jordan Smith", // 2 users in ws1 have this name
        });
        expect(resAmbiguousTask.success).toBe(true);
        const ambigTask = (await testDb
          .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
          .get(resAmbiguousTask.id!)) as { assignee: string; assignee_user_id: string | null };

        expect(ambigTask.assignee).toBe("Jordan Smith");
        expect(ambigTask.assignee_user_id).toBeNull();
      });
    });

    it("C.4b-C.4d name-only reassignment, invalid ID rejection, and unassignment", async () => {
      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resCreateReassign = await createTaskAction({
          workspaceId: "ws1",
          title: "Reassignment Test Task",
          assigneeUserId: "u_member1",
        });
        expect(resCreateReassign.success).toBe(true);
        const reassignTaskId = resCreateReassign.id!;

        const taskInitial = (await testDb
          .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
          .get(reassignTaskId)) as { assignee: string; assignee_user_id: string };
        expect(taskInitial.assignee).toBe("Bob Member");
        expect(taskInitial.assignee_user_id).toBe("u_member1");

        // Unique member display name update: u_extra -> "Unique Extra"
        await testDb
          .prepare("UPDATE users SET name = 'Unique Extra' WHERE id = 'u_extra'")
          .run();

        const resUpdateNameOnly = await updateTaskAction(reassignTaskId, {
          assignee: "Unique Extra",
        });
        expect(resUpdateNameOnly.success).toBe(true);

        const taskUpdated = (await testDb
          .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
          .get(reassignTaskId)) as { assignee: string; assignee_user_id: string };
        expect(taskUpdated.assignee).toBe("Unique Extra");
        expect(taskUpdated.assignee_user_id).toBe("u_extra");

        // C.4c explicit out-of-workspace / invalid / blank / whitespace IDs reject on create
        const resCreateOutOfWs = await createTaskAction({
          workspaceId: "ws1",
          title: "Out-of-Workspace Create Attempt",
          assigneeUserId: "u_member2", // member of ws2, NOT ws1
        });
        expect(resCreateOutOfWs.success).toBe(false);
        expect(resCreateOutOfWs.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        const resCreateInvalid = await createTaskAction({
          workspaceId: "ws1",
          title: "Invalid User ID Create Attempt",
          assigneeUserId: "non_existent_user_id_xyz",
        });
        expect(resCreateInvalid.success).toBe(false);
        expect(resCreateInvalid.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        const resCreateBlank = await createTaskAction({
          workspaceId: "ws1",
          title: "Blank User ID Create Attempt",
          assigneeUserId: "",
        });
        expect(resCreateBlank.success).toBe(false);
        expect(resCreateBlank.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        const resCreateWhitespace = await createTaskAction({
          workspaceId: "ws1",
          title: "Whitespace User ID Create Attempt",
          assigneeUserId: "   \t  ",
        });
        expect(resCreateWhitespace.success).toBe(false);
        expect(resCreateWhitespace.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        // Same rejections on update, leaving the row exactly unchanged
        const preUpdateSnapshot = await testDb
          .prepare("SELECT * FROM tasks WHERE id = ?")
          .get(reassignTaskId);

        const resUpdateOutOfWs = await updateTaskAction(reassignTaskId, {
          assigneeUserId: "u_member2", // member of ws2, NOT ws1
        });
        expect(resUpdateOutOfWs.success).toBe(false);
        expect(resUpdateOutOfWs.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        const resUpdateInvalid = await updateTaskAction(reassignTaskId, {
          assigneeUserId: "non_existent_user_id_xyz",
        });
        expect(resUpdateInvalid.success).toBe(false);
        expect(resUpdateInvalid.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        const resUpdateBlank = await updateTaskAction(reassignTaskId, { assigneeUserId: "" });
        expect(resUpdateBlank.success).toBe(false);
        expect(resUpdateBlank.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        const resUpdateWhitespace = await updateTaskAction(reassignTaskId, {
          assigneeUserId: "   \t\n  ",
        });
        expect(resUpdateWhitespace.success).toBe(false);
        expect(resUpdateWhitespace.error).toContain(
          "Assignee must be an active member of this workspace"
        );

        const postUpdateSnapshot = await testDb
          .prepare("SELECT * FROM tasks WHERE id = ?")
          .get(reassignTaskId);
        expect(JSON.stringify(postUpdateSnapshot)).toBe(
          JSON.stringify(preUpdateSnapshot)
        );

        // C.4d Unassignment via assignee: 'Unassigned' with assigneeUserId omitted
        const resUnassign = await updateTaskAction(reassignTaskId, {
          assignee: "Unassigned",
        });
        expect(resUnassign.success).toBe(true);
        const unassignedTask = (await testDb
          .prepare("SELECT assignee, assignee_user_id FROM tasks WHERE id = ?")
          .get(reassignTaskId)) as { assignee: string; assignee_user_id: string | null };
        expect(unassignedTask.assignee).toBe("Unassigned");
        expect(unassignedTask.assignee_user_id).toBeNull();
      });
    });

    it("C.5-C.7 project owner identity: create, imposter denial, rename resilience", async () => {
      let projId = "";
      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resCreateProj = await createProjectAction({
          workspaceId: "ws1",
          name: "Stable Project Alpha",
          ownerUserId: "u_jordan_legit",
        });
        expect(resCreateProj.success).toBe(true);
        projId = resCreateProj.id!;

        const createdProj = (await testDb
          .prepare("SELECT owner, owner_user_id FROM projects WHERE id = ?")
          .get(projId)) as { owner: string; owner_user_id: string };
        expect(createdProj.owner).toBe("Jordan Smith");
        expect(createdProj.owner_user_id).toBe("u_jordan_legit");
      });

      // C.6 Imposter with same display name cannot delete the project
      await testAuthStorage!.run({ userId: "u_jordan_imposter" }, async () => {
        const resProjDeleteImposter = await deleteProjectAction(projId);
        expect(resProjDeleteImposter.success).toBe(false);

        const projStillExists = await testDb
          .prepare("SELECT id FROM projects WHERE id = ?")
          .get(projId);
        expect(Boolean(projStillExists)).toBe(true);
      });

      // C.7 Legit lead can delete the project after profile rename
      await testAuthStorage!.run({ userId: "u_jordan_legit" }, async () => {
        await testDb
          .prepare("UPDATE users SET name = 'Jordan Super Renamed' WHERE id = 'u_jordan_legit'")
          .run();

        const resProjDeleteLegit = await deleteProjectAction(projId);
        expect(resProjDeleteLegit.success).toBe(true);

        const projGone = await testDb
          .prepare("SELECT id FROM projects WHERE id = ?")
          .get(projId);
        expect(!projGone).toBe(true);
      });
    });

    it("C.8 updateProjectAction synchronizes owner display name and owner_user_id", async () => {
      let proj2Id = "";
      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resCreate = await createProjectAction({
          workspaceId: "ws1",
          name: "Sync Test Project",
          ownerUserId: "u_member1",
        });
        expect(resCreate.success).toBe(true);
        proj2Id = resCreate.id!;
      });

      await testDb
        .prepare("UPDATE users SET name = 'Jordan Smith' WHERE id = 'u_jordan_legit'")
        .run();

      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        // 1. Ambiguous owner name rejected
        const resAmbig = await updateProjectAction(proj2Id, {
          owner: "Jordan Smith", // 2 users have this name
        });
        expect(resAmbig.success).toBe(false);
        expect(resAmbig.error).toContain("Multiple workspace members match this name");

        // 2. Non-member owner name rejected
        const resNonMem = await updateProjectAction(proj2Id, {
          owner: "NonExistent Person",
        });
        expect(resNonMem.success).toBe(false);
        expect(resNonMem.error).toContain("Project owner must be an active member");

        // 3. Unique owner name succeeds and synchronizes ownerUserId
        const resUnique = await updateProjectAction(proj2Id, {
          owner: "Bob Member", // exactly 1 user (u_member1)
        });
        expect(resUnique.success).toBe(true);

        const projAfter = (await testDb
          .prepare("SELECT owner, owner_user_id FROM projects WHERE id = ?")
          .get(proj2Id)) as { owner: string; owner_user_id: string };
        expect(projAfter.owner).toBe("Bob Member");
        expect(projAfter.owner_user_id).toBe("u_member1");
      });
    });
  });

  describe("Group D: Lifecycle atomic actions (workspace CRUD & leave)", () => {
    it("D.1 createWorkspaceAction is atomic with exactly 1 owner", async () => {
      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        const resCreateWs = await createWorkspaceAction({
          name: "Atomic Workspace",
          plan: "Free",
        });
        expect(resCreateWs.success).toBe(true);
        expect(resCreateWs.id).toBeTruthy();

        const owners = (await testDb
          .prepare(
            "SELECT user_id, role FROM workspace_members WHERE workspace_id = ? AND role = 'owner'"
          )
          .all(resCreateWs.id!)) as { user_id: string; role: string }[];
        expect(owners).toHaveLength(1);
        expect(owners[0].user_id).toBe("u_member1");

        // Stash id for subsequent sub-tests via closure-safe global
        (globalThis as { __createdWsId?: string }).__createdWsId = resCreateWs.id;
      });
    });

    it("D.2 owner cannot leave a multi-member workspace", async () => {
      const createdWsId = (globalThis as { __createdWsId?: string }).__createdWsId!;
      await insertWorkspaceMember(`wm_${createdWsId}_extra`, createdWsId, "u_extra", "member");

      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        const resLeaveBlocked = await leaveWorkspaceAction(createdWsId);
        expect(resLeaveBlocked.success).toBe(false);
        expect(resLeaveBlocked.error).toContain(
          "Workspace owners cannot leave while other members exist"
        );
      });
    });

    it("D.3 non-owner can leave a multi-member workspace", async () => {
      const createdWsId = (globalThis as { __createdWsId?: string }).__createdWsId!;
      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resLeaveNonOwner = await leaveWorkspaceAction(createdWsId);
        expect(resLeaveNonOwner.success).toBe(true);

        const remaining = (await testDb
          .prepare("SELECT user_id FROM workspace_members WHERE workspace_id = ?")
          .all(createdWsId)) as { user_id: string }[];
        expect(remaining).toHaveLength(1);
        expect(remaining[0].user_id).toBe("u_member1");
      });
    });

    it("D.4 sole-member owner leaving deletes the workspace", async () => {
      const createdWsId = (globalThis as { __createdWsId?: string }).__createdWsId!;
      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        const resSoleLeave = await leaveWorkspaceAction(createdWsId);
        expect(resSoleLeave.success).toBe(true);

        const wsExists = await testDb
          .prepare("SELECT id FROM workspaces WHERE id = ?")
          .get(createdWsId);
        expect(!wsExists).toBe(true);
      });
    });

    it("D.5 deleteWorkspaceAction enforces owner-only authorization", async () => {
      const tempWsId = "ws_to_delete_test";
      await insertWorkspace(tempWsId, "Delete WS", "delete-ws");
      await insertWorkspaceMember("wm_del_1", tempWsId, "u_member1", "owner");
      await insertWorkspaceMember("wm_del_2", tempWsId, "u_extra", "member");

      await testAuthStorage!.run({ userId: "u_extra" }, async () => {
        const resDelNonOwner = await deleteWorkspaceAction(tempWsId);
        expect(resDelNonOwner.success).toBe(false);
      });

      await testAuthStorage!.run({ userId: "u_member1" }, async () => {
        const resDelOwner = await deleteWorkspaceAction(tempWsId);
        expect(resDelOwner.success).toBe(true);

        const delCheck = await testDb
          .prepare("SELECT id FROM workspaces WHERE id = ?")
          .get(tempWsId);
        expect(!delCheck).toBe(true);
      });
    });
  });

  describe("Group E: Migration column addition & backfill priority (legacy SQLite script)", () => {
    it("detects, dry-runs, and applies stable-identity backfill correctly", async () => {
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
        migDb.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_alice", "alice@test.com", "alice", "Alice Lead", "hash", null, now);
        migDb.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_bob", "bob@test.com", "bob", "Bob Contributor", "hash", null, now);
        migDb.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_charlie1", "charlie1@test.com", "charlie1", "Charlie Dual", "hash", null, now);
        migDb.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_charlie2", "charlie2@test.com", "charlie2", "Charlie Dual", "hash", null, now);

        migDb.prepare("INSERT INTO workspaces VALUES (?, ?, ?, ?, ?, ?)").run("ws_mig", "Mig WS", "mig-ws", "Starter", 0, now);
        migDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_a", "ws_mig", "u_alice", "owner", now);
        migDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_b", "ws_mig", "u_bob", "member", now);
        migDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_c1", "ws_mig", "u_charlie1", "member", now);
        migDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_c2", "ws_mig", "u_charlie2", "member", now);

        // p1: has lead row in project_members
        migDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("p1", "ws_mig", "Project 1", 0, "2026-12-31", "Alice Lead", "Planning", "Overview 1", now);
        migDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_p1_lead", "p1", "u_alice", "Alice Lead", "lead", "AL", "bg-blue-500");
        migDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_p1_bob", "p1", "u_bob", "Bob Contributor", "contributor", "BC", "bg-green-500");

        // p2: lead has null user_id, owner matches unique workspace member Bob Contributor
        migDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("p2", "ws_mig", "Project 2", 0, "2026-12-31", "Bob Contributor", "Planning", "Overview 2", now);
        migDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_p2_lead", "p2", null, "Bob Contributor", "lead", "BC", "bg-green-500");

        // p3: ambiguous owner name (Charlie Dual matches 2 workspace members)
        migDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("p3", "ws_mig", "Project 3", 0, "2026-12-31", "Charlie Dual", "Planning", "Overview 3", now);
        migDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_p3_lead", "p3", null, "Charlie Dual", "lead", "CD", "bg-purple-500");

        // p4: unresolvable owner name (0 matches)
        migDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("p4", "ws_mig", "Project 4", 0, "2026-12-31", "Ghost User", "Planning", "Overview 4", now);
        migDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_p4_lead", "p4", null, "Ghost User", "lead", "GU", "bg-gray-500");

        // Tasks
        migDb.prepare("INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("t1", "ws_mig", "p1", "Task 1", "Alice Lead", "Todo", "Medium", "2026-12-31", now);
        migDb.prepare("INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("t2", "ws_mig", "p1", "Task 2", "Charlie Dual", "Todo", "Medium", "2026-12-31", now);
        migDb.prepare("INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("t3", "ws_mig", "p1", "Task 3", "Unassigned", "Todo", "Medium", "2026-12-31", now);

        // 1. Column detection
        const colStatus = checkStableIdentityColumns(migDb);
        expect(colStatus.missingColumns).toContain("projects.owner_user_id");
        expect(colStatus.missingColumns).toContain("tasks.assignee_user_id");

        // 2. Pending backfill count
        const pendingBackfills = countPendingResolvableBackfills(migDb, colStatus);
        expect(pendingBackfills.resolvableProjects).toBe(2);
        expect(pendingBackfills.unresolvableProjects).toBe(2);
        expect(pendingBackfills.resolvableTasks).toBe(1);
        expect(pendingBackfills.unresolvableTasks).toBe(1);

        migDb.close();

        // 3. Dry-run on old schema: must NOT return alreadyApplied
        const dryRes = await runUniquenessMigration({ dbPath: migDbPath, dryRun: true });
        expect(dryRes.success).toBe(true);
        expect(dryRes.dryRun).toBe(true);
        expect(dryRes.alreadyApplied).toBe(false);
        expect(dryRes.missingColumnsFound?.length).toBe(2);
        expect(dryRes.projectsPendingBackfill).toBe(2);
        expect(dryRes.tasksPendingBackfill).toBe(1);

        // 4. Live migration on old schema
        const liveRes = await runUniquenessMigration({
          dbPath: migDbPath,
          dryRun: false,
          skipBackup: true,
        });
        expect(liveRes.success).toBe(true);
        expect(liveRes.projectsBackfilled).toBe(2);
        expect(liveRes.tasksBackfilled).toBe(1);

        // 5. Verify database contents
        const verifyDb = new Database(migDbPath, { readonly: true });
        const p1Row = verifyDb
          .prepare("SELECT owner_user_id FROM projects WHERE id = 'p1'")
          .get() as { owner_user_id: string };
        expect(p1Row.owner_user_id).toBe("u_alice");

        const p2Row = verifyDb
          .prepare("SELECT owner_user_id FROM projects WHERE id = 'p2'")
          .get() as { owner_user_id: string };
        expect(p2Row.owner_user_id).toBe("u_bob");

        const p3Row = verifyDb
          .prepare("SELECT owner_user_id FROM projects WHERE id = 'p3'")
          .get() as { owner_user_id: string | null };
        expect(p3Row.owner_user_id).toBeNull();

        const p4Row = verifyDb
          .prepare("SELECT owner_user_id FROM projects WHERE id = 'p4'")
          .get() as { owner_user_id: string | null };
        expect(p4Row.owner_user_id).toBeNull();

        const t1Row = verifyDb
          .prepare("SELECT assignee_user_id FROM tasks WHERE id = 't1'")
          .get() as { assignee_user_id: string };
        expect(t1Row.assignee_user_id).toBe("u_alice");

        const t2Row = verifyDb
          .prepare("SELECT assignee_user_id FROM tasks WHERE id = 't2'")
          .get() as { assignee_user_id: string | null };
        expect(t2Row.assignee_user_id).toBeNull();

        const t3Row = verifyDb
          .prepare("SELECT assignee_user_id FROM tasks WHERE id = 't3'")
          .get() as { assignee_user_id: string | null };
        expect(t3Row.assignee_user_id).toBeNull();
        verifyDb.close();

        // 6. Post-migration dry run: MUST report alreadyApplied: true
        const postDryRes = await runUniquenessMigration({ dbPath: migDbPath, dryRun: true });
        expect(postDryRes.success).toBe(true);
        expect(postDryRes.alreadyApplied).toBe(true);

        // 7. Post-migration live run: MUST report alreadyApplied: true
        const postLiveRes = await runUniquenessMigration({
          dbPath: migDbPath,
          dryRun: false,
          skipBackup: true,
        });
        expect(postLiveRes.success).toBe(true);
        expect(postLiveRes.alreadyApplied).toBe(true);
      } finally {
        cleanupTempDb(migDbPath);
      }
    });
  });
});
