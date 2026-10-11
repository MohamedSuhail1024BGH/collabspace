import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
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

import {
  runUniquenessMigration,
  verifyUniqueIndexes,
} from "@/scripts/migrate-uniqueness";
import {
  classifyConversation,
  isDirectConversation,
  validateDirectConversation,
} from "@/lib/auth/dm-validator";
import { testAuthStorage } from "@/lib/db/auth";
import { getLiveConversationsAction, sendMessageAction, createConversationAction } from "@/app/actions-messages";
import { assignProjectMemberAction, createProjectAction } from "@/app/actions-projects";
import { GET as getSseEvents } from "@/app/api/messages/events/route";
import { messageBus } from "@/lib/events/message-bus";
import { ensureTables, resetDatabase } from "@/lib/db/seed";
import {
  ensureTablesBasic,
  createCanonicalIndexes,
} from "./helpers/legacy-sqlite";
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

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await destroyTestDatabase(testDb);
});

describe("tenant security & integration", () => {
  describe("Group 1: Tri-state DM classifier & fail-closed invariants", () => {
    it("classifies conversation types tri-state (direct | channel | invalid)", () => {
      expect(classifyConversation({ type: "direct", id: "c1" })).toBe("direct");
      expect(classifyConversation({ type: "channel", id: "c2" })).toBe("channel");
      expect(classifyConversation({ type: "group", id: "c3" })).toBe("invalid");
      expect(classifyConversation({ type: "admin", id: "c4" })).toBe("invalid");
      expect(classifyConversation({ type: "", id: "c5" })).toBe("invalid");
    });

    it("stored type takes precedence over ID prefix", () => {
      expect(classifyConversation({ type: "direct", id: "conv-channel-1" })).toBe("direct");
      expect(classifyConversation({ type: "channel", id: "conv-dm-leo" })).toBe("channel");
    });

    it("falls back to legacy ID prefix when type is omitted/null/undefined", () => {
      expect(classifyConversation({ type: null, id: "conv-dm-leo" })).toBe("direct");
      expect(classifyConversation({ type: undefined, id: "conv-dm-mia" })).toBe("direct");
      expect(classifyConversation({ type: null, id: "conv-channel-gen" })).toBe("channel");

      expect(isDirectConversation({ type: "direct", id: "conv-1" })).toBe(true);
      expect(isDirectConversation({ type: "channel", id: "conv-2" })).toBe(false);
    });

    it("canonical DM validator enforces participants, cardinality, and workspace membership", async () => {
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u1", "u1@a.com", "u1", "User 1", "hash", null, now);
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u2", "u2@a.com", "u2", "User 2", "hash", null, now);
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u3", "u3@a.com", "u3", "User 3", "hash", null, now);
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("u_ext", "ext@b.com", "uext", "User Ext", "hash", null, now);

      await testDb
        .prepare(
          "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("ws1", "WS One", "ws1", "Pro", true, now);
      await testDb
        .prepare(
          "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("ws2", "WS Two", "ws2", "Pro", true, now);

      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm1", "ws1", "u1", "member", now);
      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm2", "ws1", "u2", "member", now);
      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm3", "ws1", "u3", "viewer", now);
      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_ext", "ws2", "u_ext", "member", now);

      const harnessDrizzle = (
        await import("@/lib/db")
      ).db as unknown as Parameters<typeof validateDirectConversation>[2];

      const validDm = {
        id: "c1",
        workspaceId: "ws1",
        type: "direct" as const,
        participantIds: JSON.stringify(["u1", "u2"]),
      };
      expect((await validateDirectConversation(validDm, "u1", harnessDrizzle)).valid).toBe(true);
      expect((await validateDirectConversation(validDm, "u2", harnessDrizzle)).valid).toBe(true);

      const res3 = await validateDirectConversation(validDm, "u3", harnessDrizzle);
      expect(res3.valid === false && res3.reason.includes("not a participant")).toBe(true);

      const resCorrupt = await validateDirectConversation(
        { id: "c_corrupt", workspaceId: "ws1", type: "direct" as const, participantIds: "{invalid json" },
        "u1",
        harnessDrizzle
      );
      expect(resCorrupt.valid).toBe(false);

      const resSingle = await validateDirectConversation(
        { id: "c_single", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1"]) },
        "u1",
        harnessDrizzle
      );
      expect(resSingle.valid).toBe(false);

      const resTriple = await validateDirectConversation(
        { id: "c_triple", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1", "u2", "u3"]) },
        "u1",
        harnessDrizzle
      );
      expect(resTriple.valid).toBe(false);

      const resSelf = await validateDirectConversation(
        { id: "c_self", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1", "u1"]) },
        "u1",
        harnessDrizzle
      );
      expect(resSelf.valid).toBe(false);

      const resCross = await validateDirectConversation(
        { id: "c_cross", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1", "u_ext"]) },
        "u1",
        harnessDrizzle
      );
      expect(resCross.valid === false && resCross.reason.includes("not active members")).toBe(true);

      const resInvalidType = await validateDirectConversation(
        {
          id: "c_bad_type",
          workspaceId: "ws1",
          type: "group" as unknown as "direct",
          participantIds: JSON.stringify(["u1", "u2"]),
        },
        "u1",
        harnessDrizzle
      );
      expect(
        resInvalidType.valid === false && resInvalidType.reason.includes("not a direct message")
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Groups 2-5 exercise scripts/migrate-uniqueness.ts, a legacy better-sqlite3
  // migration utility that operates directly on SQLite files. These keep
  // better-sqlite3 and the restored legacy DDL fixture.
  // ---------------------------------------------------------------------------
  describe("Group 2: Dry-run immutability guarantee (legacy SQLite script)", () => {
    it("dry-run on a non-WAL database leaves the file byte-identical", async () => {
      const noWalDbPath = createTempDbPath("no-wal-test");
      const noWalDb = new Database(noWalDbPath);
      noWalDb.pragma("journal_mode = DELETE");
      ensureTablesBasic(noWalDb);
      createCanonicalIndexes(noWalDb);
      noWalDb.close();

      const noWalStatBefore = fs.statSync(noWalDbPath);
      expect(fs.existsSync(`${noWalDbPath}-wal`)).toBe(false);
      expect(fs.existsSync(`${noWalDbPath}-shm`)).toBe(false);

      const noWalDryRes = await runUniquenessMigration({ dbPath: noWalDbPath, dryRun: true });
      expect(noWalDryRes.dryRun).toBe(true);
      expect(noWalDryRes.alreadyApplied).toBe(true);

      const noWalStatAfter = fs.statSync(noWalDbPath);
      expect(noWalStatBefore.size).toBe(noWalStatAfter.size);
      expect(noWalStatBefore.mtimeMs).toBe(noWalStatAfter.mtimeMs);
      expect(fs.existsSync(`${noWalDbPath}-wal`)).toBe(false);
      expect(fs.existsSync(`${noWalDbPath}-shm`)).toBe(false);
      cleanupTempDb(noWalDbPath);
    });

    it("dry-run on a WAL database leaves DB, WAL, and SHM byte-identical", async () => {
      const walDbPath = createTempDbPath("wal-test");
      const walDb = new Database(walDbPath);
      walDb.pragma("journal_mode = WAL");
      ensureTablesBasic(walDb);
      createCanonicalIndexes(walDb);
      walDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_wal", "wal@t.com", "uwal", "Wal User", "hash", null, now);
      walDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_wal", "WS WAL", "wswal", "Pro", 1, now);
      walDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_wal", "ws_wal", "u_wal", "owner", now);

      // Warm up reader to stabilize WAL shared-memory index before snapshotting
      const warmupReader = new Database(walDbPath, { readonly: true, fileMustExist: true });
      warmupReader.prepare("SELECT 1 FROM workspaces").get();
      warmupReader.close();

      const walFilePath = `${walDbPath}-wal`;
      const shmFilePath = `${walDbPath}-shm`;

      expect(fs.existsSync(walDbPath)).toBe(true);
      expect(fs.existsSync(walFilePath)).toBe(true);
      expect(fs.existsSync(shmFilePath)).toBe(true);

      const dbStatBefore = fs.statSync(walDbPath);
      const walStatBefore = fs.statSync(walFilePath);
      const shmStatBefore = fs.statSync(shmFilePath);

      const dbHashBefore = crypto.createHash("sha256").update(fs.readFileSync(walDbPath)).digest("hex");
      const walHashBefore = crypto.createHash("sha256").update(fs.readFileSync(walFilePath)).digest("hex");
      const shmHashBefore = crypto.createHash("sha256").update(fs.readFileSync(shmFilePath)).digest("hex");

      const walDryRes = await runUniquenessMigration({ dbPath: walDbPath, dryRun: true });
      expect(walDryRes.dryRun).toBe(true);

      expect(fs.existsSync(walDbPath)).toBe(true);
      expect(fs.existsSync(walFilePath)).toBe(true);
      expect(fs.existsSync(shmFilePath)).toBe(true);

      const dbStatAfter = fs.statSync(walDbPath);
      const walStatAfter = fs.statSync(walFilePath);
      const shmStatAfter = fs.statSync(shmFilePath);

      const dbHashAfter = crypto.createHash("sha256").update(fs.readFileSync(walDbPath)).digest("hex");
      const walHashAfter = crypto.createHash("sha256").update(fs.readFileSync(walFilePath)).digest("hex");
      const shmHashAfter = crypto.createHash("sha256").update(fs.readFileSync(shmFilePath)).digest("hex");

      expect(dbStatBefore.size).toBe(dbStatAfter.size);
      expect(walStatBefore.size).toBe(walStatAfter.size);
      expect(shmStatBefore.size).toBe(shmStatAfter.size);

      expect(dbHashBefore).toBe(dbHashAfter);
      expect(walHashBefore).toBe(walHashAfter);
      expect(shmHashBefore).toBe(shmHashAfter);

      expect(dbStatBefore.mtimeMs).toBe(dbStatAfter.mtimeMs);
      expect(walStatBefore.mtimeMs).toBe(walStatAfter.mtimeMs);
      expect(shmStatBefore.mtimeMs).toBe(shmStatAfter.mtimeMs);

      walDb.close();
      cleanupTempDb(walDbPath);
    });
  });

  describe("Group 3: Conflict scanning & cardinality invariants abort before DDL (legacy SQLite script)", () => {
    it("conflicting duplicate roles in workspace_members abort migration", async () => {
      const confRoleDbPath = createTempDbPath("conf-role-test");
      const confRoleDb = new Database(confRoleDbPath);
      ensureTablesBasic(confRoleDb);
      confRoleDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_conf", "conf@t.com", "uconf", "Conf User", "hash", null, now);
      confRoleDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_cr", "WS CR", "wscr", "Pro", 1, now);
      confRoleDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_owner", "ws_cr", "u_conf", "owner", now);
      confRoleDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_mem", "ws_cr", "u_conf", "viewer", now);
      confRoleDb.close();

      let roleConflictThrew = false;
      try {
        await runUniquenessMigration({ dbPath: confRoleDbPath });
      } catch (err: unknown) {
        roleConflictThrew = err instanceof Error && err.message.includes("differing roles");
      }
      expect(roleConflictThrew).toBe(true);
      cleanupTempDb(confRoleDbPath);
    });

    it("differing joined_at timestamps with same role abort migration", async () => {
      const diffJoinedDbPath = createTempDbPath("diff-joined-test");
      const diffJoinedDb = new Database(diffJoinedDbPath);
      ensureTablesBasic(diffJoinedDb);
      diffJoinedDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_dj", "dj@t.com", "udj", "DJ User", "hash", null, now);
      diffJoinedDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_dj", "WS DJ", "wsdj", "Pro", 1, now);
      diffJoinedDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_dj_owner", "ws_dj", "u_dj", "owner", now);
      diffJoinedDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_dj_1", "ws_dj", "u_dj", "member", "2026-01-01T00:00:00Z");
      diffJoinedDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_dj_2", "ws_dj", "u_dj", "member", "2026-02-01T00:00:00Z");
      diffJoinedDb.close();

      let diffJoinedThrew = false;
      try {
        await runUniquenessMigration({ dbPath: diffJoinedDbPath });
      } catch (err: unknown) {
        diffJoinedThrew =
          err instanceof Error && err.message.includes("differing roles or joined_at timestamps");
      }
      expect(diffJoinedThrew).toBe(true);
      cleanupTempDb(diffJoinedDbPath);
    });

    it("zero workspace owners abort migration", async () => {
      const zeroOwnerDbPath = createTempDbPath("zero-owner-test");
      const zeroOwnerDb = new Database(zeroOwnerDbPath);
      ensureTablesBasic(zeroOwnerDb);
      zeroOwnerDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("zo1", "zo@t.com", "zo1", "ZO", "hash", null, now);
      zeroOwnerDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_zo", "WS ZO", "wszo", "Pro", 1, now);
      zeroOwnerDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_zo", "ws_zo", "zo1", "member", now);
      zeroOwnerDb.close();

      let zeroOwnerThrew = false;
      try {
        await runUniquenessMigration({ dbPath: zeroOwnerDbPath });
      } catch (err: unknown) {
        zeroOwnerThrew = err instanceof Error && err.message.includes("has 0 owners (must be exactly 1)");
      }
      expect(zeroOwnerThrew).toBe(true);
      cleanupTempDb(zeroOwnerDbPath);
    });

    it("multiple workspace owners abort migration", async () => {
      const multiOwnerDbPath = createTempDbPath("multi-owner-test");
      const multiOwnerDb = new Database(multiOwnerDbPath);
      ensureTablesBasic(multiOwnerDb);
      multiOwnerDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("o1", "o1@t.com", "o1", "O1", "hash", null, now);
      multiOwnerDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("o2", "o2@t.com", "o2", "O2", "hash", null, now);
      multiOwnerDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_mo", "WS MO", "wsmo", "Pro", 1, now);
      multiOwnerDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_o1", "ws_mo", "o1", "owner", now);
      multiOwnerDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_o2", "ws_mo", "o2", "owner", now);
      multiOwnerDb.close();

      let multiOwnerThrew = false;
      try {
        await runUniquenessMigration({ dbPath: multiOwnerDbPath });
      } catch (err: unknown) {
        multiOwnerThrew = err instanceof Error && err.message.includes("has 2 owners (must be exactly 1)");
      }
      expect(multiOwnerThrew).toBe(true);
      cleanupTempDb(multiOwnerDbPath);
    });

    it("zero project leads abort migration", async () => {
      const zeroLeadDbPath = createTempDbPath("zero-lead-test");
      const zeroLeadDb = new Database(zeroLeadDbPath);
      ensureTablesBasic(zeroLeadDb);
      zeroLeadDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("zl1", "zl@t.com", "zl1", "ZL", "hash", null, now);
      zeroLeadDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_zl", "WS ZL", "wszl", "Pro", 1, now);
      zeroLeadDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_zl", "ws_zl", "zl1", "owner", now);
      zeroLeadDb.prepare("INSERT INTO projects (id, workspace_id, name, owner, owner_user_id, status, due, progress, overview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_zl", "ws_zl", "Proj ZL", "ZL", null, "Planning", "2026-10-01", 0, "Overview", now);
      zeroLeadDb.prepare("INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_zl", "proj_zl", "zl1", "ZL", "contributor", "ZL", "bg-cyan-500");
      zeroLeadDb.close();

      let zeroLeadThrew = false;
      try {
        await runUniquenessMigration({ dbPath: zeroLeadDbPath });
      } catch (err: unknown) {
        zeroLeadThrew = err instanceof Error && err.message.includes("has 0 leads (must be exactly 1)");
      }
      expect(zeroLeadThrew).toBe(true);
      cleanupTempDb(zeroLeadDbPath);
    });

    it("multiple project leads abort migration", async () => {
      const multiLeadDbPath = createTempDbPath("multi-lead-test");
      const multiLeadDb = new Database(multiLeadDbPath);
      ensureTablesBasic(multiLeadDb);
      multiLeadDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("l1", "l1@t.com", "l1", "L1", "hash", null, now);
      multiLeadDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("l2", "l2@t.com", "l2", "L2", "hash", null, now);
      multiLeadDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_ml", "WS ML", "wsml", "Pro", 1, now);
      multiLeadDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_l1", "ws_ml", "l1", "owner", now);
      multiLeadDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_l2", "ws_ml", "l2", "member", now);
      multiLeadDb.prepare("INSERT INTO projects (id, workspace_id, name, owner, owner_user_id, status, due, progress, overview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_ml", "ws_ml", "Proj ML", "L1", "l1", "Planning", "2026-10-01", 0, "Overview", now);
      multiLeadDb.prepare("INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_l1", "proj_ml", "l1", "L1", "lead", "L1", "bg-violet-500");
      multiLeadDb.prepare("INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_l2", "proj_ml", "l2", "L2", "lead", "L2", "bg-cyan-500");
      multiLeadDb.close();

      let multiLeadThrew = false;
      try {
        await runUniquenessMigration({ dbPath: multiLeadDbPath });
      } catch (err: unknown) {
        multiLeadThrew = err instanceof Error && err.message.includes("has 2 leads (must be exactly 1)");
      }
      expect(multiLeadThrew).toBe(true);
      cleanupTempDb(multiLeadDbPath);
    });
  });

  describe("Group 4: Pre-commit failure injection & rollback guarantee (legacy SQLite script)", () => {
    it("leaves rows, DDL, and index metadata 100% unchanged after forced failure", async () => {
      const rollbackDbPath = createTempDbPath("rollback-test");
      const rollbackDb = new Database(rollbackDbPath);
      rollbackDb.pragma("journal_mode = WAL");
      ensureTablesBasic(rollbackDb);

      // Seed a pre-existing malformed (non-unique) index on workspace_members
      rollbackDb.exec("CREATE INDEX idx_workspace_members_ws_user ON workspace_members(workspace_id, user_id);");

      rollbackDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_owner", "owner@t.com", "uowner", "Owner User", "hash", null, now);
      rollbackDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_rb", "rb@t.com", "urb", "User RB", "hash", null, now);
      rollbackDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_rb", "WS RB", "wsrb", "Pro", 1, now);
      rollbackDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_owner", "ws_rb", "u_owner", "owner", "2026-01-01T00:00:00Z");
      rollbackDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_rb1", "ws_rb", "u_rb", "member", "2026-01-01T00:00:00Z");
      rollbackDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_rb2", "ws_rb", "u_rb", "member", "2026-01-01T00:00:00Z");

      const snapshotBefore = {
        wmRows: rollbackDb.prepare("SELECT * FROM workspace_members ORDER BY id").all(),
        userRows: rollbackDb.prepare("SELECT * FROM users ORDER BY id").all(),
        wsRows: rollbackDb.prepare("SELECT * FROM workspaces ORDER BY id").all(),
        indexes: rollbackDb.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type = 'index' ORDER BY name").all(),
        indexList: rollbackDb.prepare("PRAGMA index_list('workspace_members')").all(),
        indexInfo: rollbackDb.prepare("PRAGMA index_info('idx_workspace_members_ws_user')").all(),
      };
      rollbackDb.close();

      let injectionThrew = false;
      try {
        await runUniquenessMigration({
          dbPath: rollbackDbPath,
          forcePreCommitFailure: true,
          skipBackup: true,
        });
      } catch (err: unknown) {
        injectionThrew = err instanceof Error && err.message.includes("Forced pre-commit failure injection");
      }
      expect(injectionThrew).toBe(true);

      const verifyRollbackDb = new Database(rollbackDbPath, { readonly: true });
      const snapshotAfter = {
        wmRows: verifyRollbackDb.prepare("SELECT * FROM workspace_members ORDER BY id").all(),
        userRows: verifyRollbackDb.prepare("SELECT * FROM users ORDER BY id").all(),
        wsRows: verifyRollbackDb.prepare("SELECT * FROM workspaces ORDER BY id").all(),
        indexes: verifyRollbackDb.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type = 'index' ORDER BY name").all(),
        indexList: verifyRollbackDb.prepare("PRAGMA index_list('workspace_members')").all(),
        indexInfo: verifyRollbackDb.prepare("PRAGMA index_info('idx_workspace_members_ws_user')").all(),
      };

      expect(JSON.stringify(snapshotBefore.wmRows)).toBe(JSON.stringify(snapshotAfter.wmRows));
      expect(JSON.stringify(snapshotBefore.userRows)).toBe(JSON.stringify(snapshotAfter.userRows));
      expect(JSON.stringify(snapshotBefore.wsRows)).toBe(JSON.stringify(snapshotAfter.wsRows));
      expect(JSON.stringify(snapshotBefore.indexes)).toBe(JSON.stringify(snapshotAfter.indexes));
      expect(JSON.stringify(snapshotBefore.indexList)).toBe(JSON.stringify(snapshotAfter.indexList));
      expect(JSON.stringify(snapshotBefore.indexInfo)).toBe(JSON.stringify(snapshotAfter.indexInfo));

      const indexCheckAfterRollback = verifyUniqueIndexes(verifyRollbackDb);
      expect(!indexCheckAfterRollback.ok).toBe(true);
      verifyRollbackDb.close();
      cleanupTempDb(rollbackDbPath);
    });
  });

  describe("Group 5: Malformed & partial index replacement (legacy SQLite script)", () => {
    it("replaces malformed indexes with verified canonical indexes", async () => {
      const badIdxDbPath = createTempDbPath("bad-idx-test");
      const badIdxDb = new Database(badIdxDbPath);
      ensureTablesBasic(badIdxDb);

      // Non-unique index on workspace_members, wrong-columns index on project_members
      badIdxDb.exec("CREATE INDEX idx_workspace_members_ws_user ON workspace_members(workspace_id, user_id);");
      badIdxDb.exec("CREATE UNIQUE INDEX idx_project_members_proj_user ON project_members(project_id);");

      badIdxDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_bi", "bi@t.com", "ubi", "User BI", "hash", null, now);
      badIdxDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_bi", "WS BI", "wsbi", "Pro", 1, now);
      badIdxDb.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, 'active')").run("wm_bi", "ws_bi", "u_bi", "owner", now);
      badIdxDb.prepare("INSERT INTO projects (id, workspace_id, name, owner, owner_user_id, status, due, progress, overview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_bi", "ws_bi", "Proj BI", "User BI", "u_bi", "Planning", "2026-10-01", 0, "Overview", now);
      badIdxDb.prepare("INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_bi", "proj_bi", "u_bi", "User BI", "lead", "UB", "bg-violet-500");
      badIdxDb.close();

      const checkBadDb = new Database(badIdxDbPath, { readonly: true });
      const checkBadRes = verifyUniqueIndexes(checkBadDb);
      expect(checkBadRes.ok).toBe(false);
      checkBadDb.close();

      const fixIdxRes = await runUniquenessMigration({ dbPath: badIdxDbPath, skipBackup: true });
      expect(fixIdxRes.success).toBe(true);

      const checkFixedDb = new Database(badIdxDbPath, { readonly: true });
      const checkFixedRes = verifyUniqueIndexes(checkFixedDb);
      expect(checkFixedRes.ok).toBe(true);

      const fkCheckFixed = checkFixedDb.pragma("foreign_key_check") as unknown[];
      expect(fkCheckFixed.length).toBe(0);

      const integrityCheckFixed = (
        checkFixedDb.pragma("integrity_check") as [{ integrity_check: string }]
      )[0].integrity_check;
      expect(integrityCheckFixed).toBe("ok");
      checkFixedDb.close();
      cleanupTempDb(badIdxDbPath);
    });
  });

  describe("Group 6: Startup & reset paths (current Postgres behavior)", () => {
    it("resetDatabase truncates all data tables through the active db seam", async () => {
      await testDb
        .prepare(
          "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("u_reset_1", "reset1@test.com", "Reset User", "hash", now);
      await testDb
        .prepare(
          "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("ws_reset", "WS Reset", "ws-reset", "Pro", true, now);

      await resetDatabase();

      const userCount = (
        (await testDb.prepare("SELECT COUNT(*) AS cnt FROM users").get()) as { cnt: number }
      ).cnt;
      const wsCount = (
        (await testDb.prepare("SELECT COUNT(*) AS cnt FROM workspaces").get()) as { cnt: number }
      ).cnt;
      expect(userCount).toBe(0);
      expect(wsCount).toBe(0);
    });

    it("current startup verification (ensureTables) completes against the canonical schema", async () => {
      // Postgres-era startup path: verifyStartupIndexes checks information_schema
      // and cleanupExpiredSessions purges stale rows; it resolves rather than
      // throwing (schema errors surface as warnings).
      await expect(ensureTables()).resolves.toBeUndefined();

      const rows = await testDb
        .prepare(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
        )
        .all();
      expect(rows).toHaveLength(1);
    });
  });

  describe("Group 7: Real server actions on isolated test database with real auth context", () => {
    beforeAll(async () => {
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("usr_lead", "lead@act.com", "usrlead", "Lead User", "hash", null, now);
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("usr_mem", "mem@act.com", "usrmem", "Member User", "hash", null, now);
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("usr_new", "new@act.com", "usrnew", "New Candidate", "hash", null, now);
      await testDb
        .prepare(
          "INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("usr_external", "ext@other.com", "usrext", "External User", "hash", null, now);

      await testDb
        .prepare(
          "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("ws_act", "WS Action", "wsaction", "Pro", true, now);
      await testDb
        .prepare(
          "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("ws_other", "WS Other", "wsother", "Pro", true, now);

      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_a_lead", "ws_act", "usr_lead", "owner", now);
      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_a_mem", "ws_act", "usr_mem", "member", now);
      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_a_new", "ws_act", "usr_new", "member", now);
      await testDb
        .prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("wm_a_ext", "ws_other", "usr_external", "member", now);

      await testDb
        .prepare(
          "INSERT INTO projects (id, workspace_id, name, owner, owner_user_id, status, due, progress, overview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("proj_act", "ws_act", "Project Action", "Lead User", "usr_lead", "Planning", "2026-10-01", 0, "Overview", now);
      await testDb
        .prepare(
          "INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("pm_act_lead", "proj_act", "usr_lead", "Lead User", "lead", "LU", "bg-violet-500");
      await testDb
        .prepare(
          "INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("pm_act_mem", "proj_act", "usr_mem", "Member User", "contributor", "MU", "bg-cyan-500");
    });

    async function leadsOn(projectId: string): Promise<{ user_id: string }[]> {
      return (await testDb
        .prepare("SELECT user_id FROM project_members WHERE project_id = ? AND role = 'lead'")
        .all(projectId)) as { user_id: string }[];
    }

    it("assignProjectMemberAction enforces sole-lead invariants with replacement rules", async () => {
      expect(testAuthStorage).toBeTruthy();
      await testAuthStorage!.run({ userId: "usr_lead" }, async () => {
        // 7.1 Demote sole lead with replacement already present in project
        const resRepPresent = await assignProjectMemberAction({
          projectId: "proj_act",
          userId: "usr_lead",
          role: "contributor",
          replacementUserId: "usr_mem",
        });
        expect(resRepPresent.success).toBe(true);

        const leadsAfter1 = await leadsOn("proj_act");
        expect(leadsAfter1).toHaveLength(1);
        expect(leadsAfter1[0].user_id).toBe("usr_mem");

        const oldLeadRole1 = (
          (await testDb
            .prepare("SELECT role FROM project_members WHERE project_id = 'proj_act' AND user_id = 'usr_lead'")
            .get()) as { role: string }
        ).role;
        expect(oldLeadRole1).toBe("contributor");

        // 7.2 Ordinary lead transfer / promotion
        const resLeadTransfer = await assignProjectMemberAction({
          projectId: "proj_act",
          userId: "usr_lead",
          role: "lead",
        });
        expect(resLeadTransfer.success).toBe(true);

        const leadsAfter2 = await leadsOn("proj_act");
        expect(leadsAfter2).toHaveLength(1);
        expect(leadsAfter2[0].user_id).toBe("usr_lead");

        // 7.3 Replacement absent from project roster (new member promoted into project as lead)
        const resRepAbsent = await assignProjectMemberAction({
          projectId: "proj_act",
          userId: "usr_lead",
          role: "viewer",
          replacementUserId: "usr_new",
        });
        expect(resRepAbsent.success).toBe(true);

        const newLeadMember = (await testDb
          .prepare("SELECT user_id, role FROM project_members WHERE project_id = 'proj_act' AND user_id = 'usr_new'")
          .get()) as { user_id: string; role: string } | undefined;
        expect(newLeadMember).toBeTruthy();
        expect(newLeadMember!.role).toBe("lead");

        const leadsAfter3 = await leadsOn("proj_act");
        expect(leadsAfter3).toHaveLength(1);
        expect(leadsAfter3[0].user_id).toBe("usr_new");

        // 7.4 Demote sole lead without replacement -> REJECTED
        const resNoRep = await assignProjectMemberAction({
          projectId: "proj_act",
          userId: "usr_new",
          role: "contributor",
        });
        expect(resNoRep.success).toBe(false);
        expect(resNoRep.error).toContain(
          "Cannot demote the sole project lead without promoting a replacement"
        );

        const leadsAfter4 = await leadsOn("proj_act");
        expect(leadsAfter4).toHaveLength(1);
        expect(leadsAfter4[0].user_id).toBe("usr_new");

        // 7.5 Invalid replacement (external user not in workspace) -> REJECTED & ROLLED BACK
        const resInvalidRep = await assignProjectMemberAction({
          projectId: "proj_act",
          userId: "usr_new",
          role: "contributor",
          replacementUserId: "usr_external",
        });
        expect(resInvalidRep.success).toBe(false);
        expect(resInvalidRep.error).toContain("Replacement user is not a member of this workspace");

        const leadsAfter5 = await leadsOn("proj_act");
        expect(leadsAfter5).toHaveLength(1);
        expect(leadsAfter5[0].user_id).toBe("usr_new");
      });
    });

    it("assignProjectMemberAction fails closed on zero or multiple starting leads", async () => {
      await testAuthStorage!.run({ userId: "usr_lead" }, async () => {
        // 7.6 Zero starting leads
        await testDb
          .prepare(
            "INSERT INTO projects (id, workspace_id, name, owner, owner_user_id, status, due, progress, overview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .run("proj_zero", "ws_act", "Zero Lead Proj", "No One", null, "Planning", "2026-10-01", 0, "Overview", now);
        const resZeroLead = await assignProjectMemberAction({
          projectId: "proj_zero",
          userId: "usr_mem",
          role: "lead",
        });
        expect(resZeroLead.success).toBe(false);
        expect(resZeroLead.error).toContain("project must start with exactly one lead");

        // 7.7 Multiple starting leads
        await testDb
          .prepare(
            "INSERT INTO projects (id, workspace_id, name, owner, owner_user_id, status, due, progress, overview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .run("proj_multi", "ws_act", "Multi Lead Proj", "Both", null, "Planning", "2026-10-01", 0, "Overview", now);
        await testDb
          .prepare(
            "INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
          .run("pm_m1", "proj_multi", "usr_lead", "L1", "lead", "LU", "bg-violet-500");
        await testDb
          .prepare(
            "INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
          .run("pm_m2", "proj_multi", "usr_mem", "L2", "lead", "MU", "bg-cyan-500");

        const resMultiLead = await assignProjectMemberAction({
          projectId: "proj_multi",
          userId: "usr_new",
          role: "lead",
        });
        expect(resMultiLead.success).toBe(false);
        expect(resMultiLead.error).toContain("project must start with exactly one lead");
      });
    });

    it("createProjectAction enforces strict roster validation", async () => {
      await testAuthStorage!.run({ userId: "usr_lead" }, async () => {
        // 7.8 Roster member missing userId
        const resMissingUserId = await createProjectAction({
          workspaceId: "ws_act",
          name: "Test Proj Missing User",
          members: [{ name: "No User ID", role: "contributor" }],
        });
        expect(resMissingUserId.success).toBe(false);
        expect(resMissingUserId.error).toContain("must have a valid user ID");

        // External user not in workspace
        const resExtMember = await createProjectAction({
          workspaceId: "ws_act",
          name: "Test Proj Ext Member",
          members: [{ userId: "usr_external", name: "External", role: "contributor" }],
        });
        expect(resExtMember.success).toBe(false);
        expect(resExtMember.error).toContain("must belong to this workspace");

        // Duplicate roster member
        const resDupMember = await createProjectAction({
          workspaceId: "ws_act",
          name: "Test Proj Dup Member",
          members: [
            { userId: "usr_mem", name: "Member 1", role: "contributor" },
            { userId: "usr_mem", name: "Member 2", role: "viewer" },
          ],
        });
        expect(resDupMember.success).toBe(false);
        expect(resDupMember.error).toContain("Duplicate member in roster");
      });
    });

    it("unknown conversation types are omitted from live lists, rejected on send, and dropped by SSE", async () => {
      await testAuthStorage!.run({ userId: "usr_lead" }, async () => {
        // Seed a conversation with unknown type
        await testDb
          .prepare(
            `INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run("conv_unk_type", "ws_act", "invalid_group_chat", "[]", "Unknown Group", "UG", "bg-purple-500", "Group", "Hello", now, 0);

        // 7.9.1 getLiveConversationsAction omits unknown-type conversations
        const liveConvsRes = await getLiveConversationsAction("ws_act");
        expect(liveConvsRes.success).toBe(true);
        const convIds = liveConvsRes.conversations!.map((c) => c.id);
        expect(convIds).not.toContain("conv_unk_type");

        // 7.9.2 sendMessageAction rejects unknown-type conversations
        const sendUnkRes = await sendMessageAction("conv_unk_type", "Lead User", "Sending to unknown type");
        expect(sendUnkRes.success).toBe(false);
        expect(sendUnkRes.error).toContain("Invalid conversation type");

        // 7.9.3 SSE stream drops events for unknown-type conversations
        const sseResponse = await getSseEvents(
          new Request("http://localhost/api/messages/events?workspaceId=ws_act")
        );
        expect(sseResponse.status).toBe(200);
        const sseReader = sseResponse.body!.getReader();
        const sseDecoder = new TextDecoder();

        const initialChunk = await sseReader.read();
        const initialText = sseDecoder.decode(initialChunk.value);
        expect(initialText).toContain('"type":"connected"');

        messageBus.publishMessage({
          type: "new_message",
          workspaceId: "ws_act",
          conversationId: "conv_unk_type",
          message: {
            id: "msg_unk",
            sender: "Lead User",
            content: "dropped_content_xyz",
            timestamp: now,
          },
        });

        // Publish an event for a valid channel
        await testDb
          .prepare(
            `INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run("conv_val_channel", "ws_act", "channel", "[]", "Valid Channel", "VC", "bg-blue-500", "Channel", "Valid", now, 0);

        messageBus.publishMessage({
          type: "new_message",
          workspaceId: "ws_act",
          conversationId: "conv_val_channel",
          message: {
            id: "msg_val",
            sender: "Lead User",
            content: "emitted_content_abc",
            timestamp: now,
          },
        });

        // Read until the valid channel's event arrives (initial connected and
        // presence_snapshot chunks are consumed first).
        let collected = "";
        const deadline = Date.now() + 10_000;
        while (!collected.includes("emitted_content_abc") && Date.now() < deadline) {
          const chunk = await sseReader.read();
          if (chunk.done) break;
          collected += sseDecoder.decode(chunk.value);
        }
        expect(collected).not.toContain("dropped_content_xyz");
        expect(collected).toContain("emitted_content_abc");
        await sseReader.cancel();
      });
    });

    it("createConversationAction reuses only valid DM candidates", async () => {
      await testAuthStorage!.run({ userId: "usr_lead" }, async () => {
        // Candidate 1: DM candidate with invalid type
        await testDb
          .prepare(
            `INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            "conv_invalid_dm_cand",
            "ws_act",
            "bad_type",
            JSON.stringify(["usr_lead", "usr_new"]),
            "Bad Candidate",
            "BC",
            "bg-red-500",
            "DM",
            "",
            now,
            0
          );

        const reuseBadRes = await createConversationAction({
          workspaceId: "ws_act",
          name: "New Candidate",
          type: "direct",
          recipientId: "usr_new",
        });
        expect(reuseBadRes.success).toBe(true);
        expect(reuseBadRes.id).not.toBe("conv_invalid_dm_cand");

        // Candidate 2: valid DM candidate
        const legitimateDmId = "conv_legit_dm";
        await testDb
          .prepare(
            `INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            legitimateDmId,
            "ws_act",
            "direct",
            JSON.stringify(["usr_lead", "usr_mem"]),
            "Member User",
            "MU",
            "bg-cyan-500",
            "Direct Message",
            "",
            now,
            0
          );

        const reuseGoodRes = await createConversationAction({
          workspaceId: "ws_act",
          name: "Member User",
          type: "direct",
          recipientId: "usr_mem",
        });
        expect(reuseGoodRes.success).toBe(true);
        expect(reuseGoodRes.isExisting).toBe(true);
        expect(reuseGoodRes.id).toBe(legitimateDmId);
      });
    });
  });
});
