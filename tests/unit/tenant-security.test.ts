import crypto from "crypto";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  runUniquenessMigration,
  verifyUniqueIndexes,
} from "@/scripts/migrate-uniqueness";
import {
  classifyConversation,
  isDirectConversation,
  validateDirectConversation,
} from "@/lib/auth/dm-validator";
import { setDatabaseForTesting } from "@/lib/db";
import { testAuthStorage } from "@/lib/db/auth";
import {
  assignProjectMemberAction,
  createProjectAction,
  getLiveConversationsAction,
  sendMessageAction,
  createConversationAction,
} from "@/app/actions";
import { GET as getSseEvents } from "@/app/api/messages/events/route";
import { messageBus } from "@/lib/events/message-bus";
import {
  ensureTables,
  ensureTablesBasic,
  resetDatabase,
  createCanonicalIndexes,
} from "@/lib/db/seed";

function createTempDbPath(name: string): string {
  const tmpDir = path.resolve(process.cwd(), ".test-tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const dbFile = path.join(
    tmpDir,
    `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.db`
  );
  return dbFile;
}

function cleanupTempDb(dbFile: string) {
  try {
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
    if (fs.existsSync(`${dbFile}-wal`)) fs.unlinkSync(`${dbFile}-wal`);
    if (fs.existsSync(`${dbFile}-shm`)) fs.unlinkSync(`${dbFile}-shm`);
  } catch {}
}

function initBaseTables(sqlite: Database.Database) {
  ensureTablesBasic(sqlite);
}

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING TENANT SECURITY & INTEGRATION TESTS");
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

  const now = new Date().toISOString();

  // --- TEST GROUP 1: Tri-State DM Classifier & Fail-Closed Invariants ---
  console.log("\n[Group 1: Tri-State DM Classifier & Fail-Closed Rules]");

  // 1.1 Tri-state classification
  assert(classifyConversation({ type: "direct", id: "c1" }) === "direct", "type: 'direct' classifies as 'direct'");
  assert(classifyConversation({ type: "channel", id: "c2" }) === "channel", "type: 'channel' classifies as 'channel'");
  assert(classifyConversation({ type: "group", id: "c3" }) === "invalid", "unknown type 'group' classifies as 'invalid'");
  assert(classifyConversation({ type: "admin", id: "c4" }) === "invalid", "unknown type 'admin' classifies as 'invalid'");
  assert(classifyConversation({ type: "", id: "c5" }) === "invalid", "empty string type without prefix classifies as 'invalid'");

  // 1.2 Type / prefix disagreements (stored type preferred)
  assert(classifyConversation({ type: "direct", id: "conv-channel-1" }) === "direct", "Stored type 'direct' preferred over channel prefix");
  assert(classifyConversation({ type: "channel", id: "conv-dm-leo" }) === "channel", "Stored type 'channel' preferred over dm prefix");

  // 1.3 Legacy prefix fallback when type is omitted/null/undefined
  assert(classifyConversation({ type: null, id: "conv-dm-leo" }) === "direct", "Null type with conv-dm- prefix falls back to 'direct'");
  assert(classifyConversation({ type: undefined, id: "conv-dm-mia" }) === "direct", "Undefined type with conv-dm- prefix falls back to 'direct'");
  assert(classifyConversation({ type: null, id: "conv-channel-gen" }) === "channel", "Null type with conv-channel- prefix falls back to 'channel'");

  assert(isDirectConversation({ type: "direct", id: "conv-1" }) === true, "isDirectConversation identifies direct type");
  assert(isDirectConversation({ type: "channel", id: "conv-2" }) === false, "isDirectConversation rejects channel type");

  // 1.4 Canonical DM Validator against Authoritative DB
  const dmDbPath = createTempDbPath("dm-test");
  const dmDb = new Database(dmDbPath);
  dmDb.pragma("journal_mode = WAL");
  dmDb.pragma("foreign_keys = ON");
  initBaseTables(dmDb);

  dmDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u1", "u1@a.com", "u1", "User 1", "hash", null, now);
  dmDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u2", "u2@a.com", "u2", "User 2", "hash", null, now);
  dmDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u3", "u3@a.com", "u3", "User 3", "hash", null, now);
  dmDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_ext", "ext@b.com", "uext", "User Ext", "hash", null, now);

  dmDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws1", "WS One", "ws1", "Pro", 1, now);
  dmDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws2", "WS Two", "ws2", "Pro", 1, now);

  dmDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm1", "ws1", "u1", "member", now);
  dmDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm2", "ws1", "u2", "member", now);
  dmDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm3", "ws1", "u3", "viewer", now);
  dmDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_ext", "ws2", "u_ext", "member", now);

  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const schema = await import("@/lib/db/schema");
  const wrappedDmDb = drizzle(dmDb, { schema }) as unknown as Parameters<typeof validateDirectConversation>[2];

  const validDm = { id: "c1", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1", "u2"]) };
  const res1 = await validateDirectConversation(validDm, "u1", wrappedDmDb);
  assert(res1.valid === true, "Valid 2-person DM succeeds for participant u1");

  const res2 = await validateDirectConversation(validDm, "u2", wrappedDmDb);
  assert(res2.valid === true, "Valid 2-person DM succeeds for participant u2");

  const res3 = await validateDirectConversation(validDm, "u3", wrappedDmDb);
  assert(res3.valid === false && res3.reason.includes("not a participant"), "Third workspace member u3 is denied access to u1-u2 DM");

  const resCorrupt = await validateDirectConversation({ id: "c_corrupt", workspaceId: "ws1", type: "direct" as const, participantIds: "{invalid json" }, "u1", wrappedDmDb);
  assert(resCorrupt.valid === false, "Corrupted participantIds JSON fails closed");

  const resSingle = await validateDirectConversation({ id: "c_single", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1"]) }, "u1", wrappedDmDb);
  assert(resSingle.valid === false, "1-person participant array fails closed");

  const resTriple = await validateDirectConversation({ id: "c_triple", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1", "u2", "u3"]) }, "u1", wrappedDmDb);
  assert(resTriple.valid === false, "3-person participant array in DM fails closed");

  const resSelf = await validateDirectConversation({ id: "c_self", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1", "u1"]) }, "u1", wrappedDmDb);
  assert(resSelf.valid === false, "Duplicate IDs (self-DM) in DM fail closed");

  const resCross = await validateDirectConversation({ id: "c_cross", workspaceId: "ws1", type: "direct" as const, participantIds: JSON.stringify(["u1", "u_ext"]) }, "u1", wrappedDmDb);
  assert(resCross.valid === false && resCross.reason.includes("not active members"), "Cross-workspace participant in DM fails closed");

  const resInvalidType = await validateDirectConversation({ id: "c_bad_type", workspaceId: "ws1", type: "group" as unknown as "direct", participantIds: JSON.stringify(["u1", "u2"]) }, "u1", wrappedDmDb);
  assert(resInvalidType.valid === false && resInvalidType.reason.includes("not a direct message"), "Invalid conversation type fails closed in validator");

  dmDb.close();
  cleanupTempDb(dmDbPath);

  // --- TEST GROUP 2: Dry-Run Immutability With & Without Sidecars ---
  console.log("\n[Group 2: Dry-Run Immutability Guarantee]");

  // 2.1 Database WITHOUT WAL/SHM sidecars
  const noWalDbPath = createTempDbPath("no-wal-test");
  const noWalDb = new Database(noWalDbPath);
  noWalDb.pragma("journal_mode = DELETE"); // Standard rollback mode, no sidecars
  initBaseTables(noWalDb);
  createCanonicalIndexes(noWalDb);
  noWalDb.close();

  const noWalStatBefore = fs.statSync(noWalDbPath);
  assert(!fs.existsSync(`${noWalDbPath}-wal`), "No WAL sidecar exists before dry-run");
  assert(!fs.existsSync(`${noWalDbPath}-shm`), "No SHM sidecar exists before dry-run");

  const noWalDryRes = await runUniquenessMigration({ dbPath: noWalDbPath, dryRun: true });
  assert(noWalDryRes.dryRun === true && noWalDryRes.alreadyApplied === true, "Dry-run reports clean applied state");

  const noWalStatAfter = fs.statSync(noWalDbPath);
  assert(noWalStatBefore.size === noWalStatAfter.size, "Database file size unmodified by dry-run (no-wal DB)");
  assert(noWalStatBefore.mtimeMs === noWalStatAfter.mtimeMs, "Database file mtime unmodified by dry-run (no-wal DB)");
  assert(!fs.existsSync(`${noWalDbPath}-wal`), "No WAL sidecar created by dry-run (no-wal DB)");
  assert(!fs.existsSync(`${noWalDbPath}-shm`), "No SHM sidecar created by dry-run (no-wal DB)");
  cleanupTempDb(noWalDbPath);

  // 2.2 Database WITH existing WAL/SHM sidecars
  const walDbPath = createTempDbPath("wal-test");
  const walDb = new Database(walDbPath);
  walDb.pragma("journal_mode = WAL");
  initBaseTables(walDb);
  createCanonicalIndexes(walDb);
  walDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_wal", "wal@t.com", "uwal", "Wal User", "hash", null, now);
  walDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_wal", "WS WAL", "wswal", "Pro", 1, now);
  walDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_wal", "ws_wal", "u_wal", "owner", now);

  // Warm up reader to stabilize WAL shared-memory index before snapshotting
  const warmupReader = new Database(walDbPath, { readonly: true, fileMustExist: true });
  warmupReader.prepare("SELECT 1 FROM workspaces").get();
  warmupReader.close();

  const walFilePath = `${walDbPath}-wal`;
  const shmFilePath = `${walDbPath}-shm`;

  // Unconditionally assert all three files exist BEFORE dry-run
  assert(fs.existsSync(walDbPath), "DB file exists before dry-run");
  assert(fs.existsSync(walFilePath), "WAL sidecar file exists before dry-run");
  assert(fs.existsSync(shmFilePath), "SHM sidecar file exists before dry-run");

  const dbStatBefore = fs.statSync(walDbPath);
  const walStatBefore = fs.statSync(walFilePath);
  const shmStatBefore = fs.statSync(shmFilePath);

  const dbHashBefore = crypto.createHash("sha256").update(fs.readFileSync(walDbPath)).digest("hex");
  const walHashBefore = crypto.createHash("sha256").update(fs.readFileSync(walFilePath)).digest("hex");
  const shmHashBefore = crypto.createHash("sha256").update(fs.readFileSync(shmFilePath)).digest("hex");

  // Run dry run against open WAL database
  const walDryRes = await runUniquenessMigration({ dbPath: walDbPath, dryRun: true });
  assert(walDryRes.dryRun === true, "Dry run on WAL DB succeeded");

  // Unconditionally assert all three files exist AFTER dry-run
  assert(fs.existsSync(walDbPath), "DB file exists after dry-run");
  assert(fs.existsSync(walFilePath), "WAL sidecar file exists after dry-run");
  assert(fs.existsSync(shmFilePath), "SHM sidecar file exists after dry-run");

  const dbStatAfter = fs.statSync(walDbPath);
  const walStatAfter = fs.statSync(walFilePath);
  const shmStatAfter = fs.statSync(shmFilePath);

  const dbHashAfter = crypto.createHash("sha256").update(fs.readFileSync(walDbPath)).digest("hex");
  const walHashAfter = crypto.createHash("sha256").update(fs.readFileSync(walFilePath)).digest("hex");
  const shmHashAfter = crypto.createHash("sha256").update(fs.readFileSync(shmFilePath)).digest("hex");

  // Unconditionally compare sizes, hashes, and mtimes
  assert(dbStatBefore.size === dbStatAfter.size, "Database file size unmodified by dry-run (WAL DB)");
  assert(walStatBefore.size === walStatAfter.size, "WAL sidecar size unmodified by dry-run (WAL DB)");
  assert(shmStatBefore.size === shmStatAfter.size, "SHM sidecar size unmodified by dry-run (WAL DB)");

  assert(dbHashBefore === dbHashAfter, "Database file SHA256 hash identical after dry-run (WAL DB)");
  assert(walHashBefore === walHashAfter, "WAL sidecar SHA256 hash identical after dry-run (WAL DB)");
  assert(shmHashBefore === shmHashAfter, "SHM sidecar SHA256 hash identical after dry-run (WAL DB)");

  assert(dbStatBefore.mtimeMs === dbStatAfter.mtimeMs, "Database file mtime unmodified by dry-run (WAL DB)");
  assert(walStatBefore.mtimeMs === walStatAfter.mtimeMs, "WAL sidecar mtime unmodified by dry-run (WAL DB)");
  assert(shmStatBefore.mtimeMs === shmStatAfter.mtimeMs, "SHM sidecar mtime unmodified by dry-run (WAL DB)");

  walDb.close();
  cleanupTempDb(walDbPath);

  // --- TEST GROUP 3: Conflict Scanning & Cardinality Aborts Before DDL ---
  console.log("\n[Group 3: Conflict Scanning & Cardinality Invariants]");

  // 3.1 Conflicting roles in workspace_members (member vs viewer)
  const confRoleDbPath = createTempDbPath("conf-role-test");
  const confRoleDb = new Database(confRoleDbPath);
  initBaseTables(confRoleDb);
  confRoleDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_conf", "conf@t.com", "uconf", "Conf User", "hash", null, now);
  confRoleDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_cr", "WS CR", "wscr", "Pro", 1, now);
  confRoleDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_owner", "ws_cr", "u_conf", "owner", now);
  // Second entry has different role -> conflicting roles
  confRoleDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_mem", "ws_cr", "u_conf", "viewer", now);
  confRoleDb.close();

  let roleConflictThrew = false;
  try {
    await runUniquenessMigration({ dbPath: confRoleDbPath });
  } catch (err: unknown) {
    roleConflictThrew = err instanceof Error && err.message.includes("differing roles");
  }
  assert(roleConflictThrew, "Conflicting duplicate roles in workspace abort migration immediately before DDL");
  cleanupTempDb(confRoleDbPath);

  // 3.1b Differing joined_at timestamps with same role: not exact equivalent, must abort
  const diffJoinedDbPath = createTempDbPath("diff-joined-test");
  const diffJoinedDb = new Database(diffJoinedDbPath);
  initBaseTables(diffJoinedDb);
  diffJoinedDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_dj", "dj@t.com", "udj", "DJ User", "hash", null, now);
  diffJoinedDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_dj", "WS DJ", "wsdj", "Pro", 1, now);
  diffJoinedDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_dj_owner", "ws_dj", "u_dj", "owner", now);
  diffJoinedDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_dj_1", "ws_dj", "u_dj", "member", "2026-01-01T00:00:00Z");
  diffJoinedDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_dj_2", "ws_dj", "u_dj", "member", "2026-02-01T00:00:00Z");
  diffJoinedDb.close();

  let diffJoinedThrew = false;
  try {
    await runUniquenessMigration({ dbPath: diffJoinedDbPath });
  } catch (err: unknown) {
    diffJoinedThrew = err instanceof Error && err.message.includes("differing roles or joined_at timestamps");
  }
  assert(diffJoinedThrew, "Differing joined_at timestamps with same role abort migration before DDL");
  cleanupTempDb(diffJoinedDbPath);

  // 3.2a Cardinality error: zero workspace owners
  const zeroOwnerDbPath = createTempDbPath("zero-owner-test");
  const zeroOwnerDb = new Database(zeroOwnerDbPath);
  initBaseTables(zeroOwnerDb);
  zeroOwnerDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("zo1", "zo@t.com", "zo1", "ZO", "hash", null, now);
  zeroOwnerDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_zo", "WS ZO", "wszo", "Pro", 1, now);
  zeroOwnerDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_zo", "ws_zo", "zo1", "member", now); // only 'member', 0 owners!
  zeroOwnerDb.close();

  let zeroOwnerThrew = false;
  try {
    await runUniquenessMigration({ dbPath: zeroOwnerDbPath });
  } catch (err: unknown) {
    zeroOwnerThrew = err instanceof Error && err.message.includes("has 0 owners (must be exactly 1)");
  }
  assert(zeroOwnerThrew, "Zero workspace owners aborts migration before DDL");
  cleanupTempDb(zeroOwnerDbPath);

  // 3.2b Cardinality error: multiple workspace owners
  const multiOwnerDbPath = createTempDbPath("multi-owner-test");
  const multiOwnerDb = new Database(multiOwnerDbPath);
  initBaseTables(multiOwnerDb);
  multiOwnerDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("o1", "o1@t.com", "o1", "O1", "hash", null, now);
  multiOwnerDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("o2", "o2@t.com", "o2", "O2", "hash", null, now);
  multiOwnerDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_mo", "WS MO", "wsmo", "Pro", 1, now);
  multiOwnerDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_o1", "ws_mo", "o1", "owner", now);
  multiOwnerDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_o2", "ws_mo", "o2", "owner", now);
  multiOwnerDb.close();

  let multiOwnerThrew = false;
  try {
    await runUniquenessMigration({ dbPath: multiOwnerDbPath });
  } catch (err: unknown) {
    multiOwnerThrew = err instanceof Error && err.message.includes("has 2 owners (must be exactly 1)");
  }
  assert(multiOwnerThrew, "Multiple workspace owners abort migration before DDL");
  cleanupTempDb(multiOwnerDbPath);

  // 3.3a Cardinality error: zero project leads
  const zeroLeadDbPath = createTempDbPath("zero-lead-test");
  const zeroLeadDb = new Database(zeroLeadDbPath);
  initBaseTables(zeroLeadDb);
  zeroLeadDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("zl1", "zl@t.com", "zl1", "ZL", "hash", null, now);
  zeroLeadDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_zl", "WS ZL", "wszl", "Pro", 1, now);
  zeroLeadDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_zl", "ws_zl", "zl1", "owner", now);
  zeroLeadDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_zl", "ws_zl", "Proj ZL", "ZL", "Planning", "2026-10-01", 0, "Overview", now);
  zeroLeadDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_zl", "proj_zl", "zl1", "ZL", "contributor", "ZL", "bg-cyan-500"); // only contributor, 0 leads!
  zeroLeadDb.close();

  let zeroLeadThrew = false;
  try {
    await runUniquenessMigration({ dbPath: zeroLeadDbPath });
  } catch (err: unknown) {
    zeroLeadThrew = err instanceof Error && err.message.includes("has 0 leads (must be exactly 1)");
  }
  assert(zeroLeadThrew, "Zero project leads aborts migration before DDL");
  cleanupTempDb(zeroLeadDbPath);

  // 3.3b Cardinality error: multiple project leads
  const multiLeadDbPath = createTempDbPath("multi-lead-test");
  const multiLeadDb = new Database(multiLeadDbPath);
  initBaseTables(multiLeadDb);
  multiLeadDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("l1", "l1@t.com", "l1", "L1", "hash", null, now);
  multiLeadDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("l2", "l2@t.com", "l2", "L2", "hash", null, now);
  multiLeadDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_ml", "WS ML", "wsml", "Pro", 1, now);
  multiLeadDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_l1", "ws_ml", "l1", "owner", now);
  multiLeadDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_l2", "ws_ml", "l2", "member", now);
  multiLeadDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_ml", "ws_ml", "Proj ML", "L1", "Planning", "2026-10-01", 0, "Overview", now);
  multiLeadDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_l1", "proj_ml", "l1", "L1", "lead", "L1", "bg-violet-500");
  multiLeadDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_l2", "proj_ml", "l2", "L2", "lead", "L2", "bg-cyan-500");
  multiLeadDb.close();

  let multiLeadThrew = false;
  try {
    await runUniquenessMigration({ dbPath: multiLeadDbPath });
  } catch (err: unknown) {
    multiLeadThrew = err instanceof Error && err.message.includes("has 2 leads (must be exactly 1)");
  }
  assert(multiLeadThrew, "Multiple project leads abort migration before DDL");
  cleanupTempDb(multiLeadDbPath);

  // --- TEST GROUP 4: Pre-Commit Failure Injection & Rollback Guarantee ---
  console.log("\n[Group 4: Pre-Commit Failure Injection & Rollback]");
  const rollbackDbPath = createTempDbPath("rollback-test");
  const rollbackDb = new Database(rollbackDbPath);
  rollbackDb.pragma("journal_mode = WAL");
  initBaseTables(rollbackDb);

  // Seed a pre-existing malformed (non-unique) index on workspace_members
  rollbackDb.exec("CREATE INDEX idx_workspace_members_ws_user ON workspace_members(workspace_id, user_id);");

  rollbackDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_owner", "owner@t.com", "uowner", "Owner User", "hash", null, now);
  rollbackDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_rb", "rb@t.com", "urb", "User RB", "hash", null, now);
  rollbackDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_rb", "WS RB", "wsrb", "Pro", 1, now);
  rollbackDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_owner", "ws_rb", "u_owner", "owner", "2026-01-01T00:00:00Z");
  rollbackDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_rb1", "ws_rb", "u_rb", "member", "2026-01-01T00:00:00Z");
  rollbackDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_rb2", "ws_rb", "u_rb", "member", "2026-01-01T00:00:00Z"); // Truly exact equivalent

  // Snapshot full ordered rows and sqlite_master index metadata before migration
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
  assert(injectionThrew, "Pre-commit failure injection threw as expected");

  const verifyRollbackDb = new Database(rollbackDbPath, { readonly: true });
  const snapshotAfter = {
    wmRows: verifyRollbackDb.prepare("SELECT * FROM workspace_members ORDER BY id").all(),
    userRows: verifyRollbackDb.prepare("SELECT * FROM users ORDER BY id").all(),
    wsRows: verifyRollbackDb.prepare("SELECT * FROM workspaces ORDER BY id").all(),
    indexes: verifyRollbackDb.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type = 'index' ORDER BY name").all(),
    indexList: verifyRollbackDb.prepare("PRAGMA index_list('workspace_members')").all(),
    indexInfo: verifyRollbackDb.prepare("PRAGMA index_info('idx_workspace_members_ws_user')").all(),
  };

  // Prove full ordered rows are exactly unchanged
  assert(
    JSON.stringify(snapshotBefore.wmRows) === JSON.stringify(snapshotAfter.wmRows),
    "workspace_members ordered rows 100% identical after rollback"
  );
  assert(
    JSON.stringify(snapshotBefore.userRows) === JSON.stringify(snapshotAfter.userRows),
    "users ordered rows 100% identical after rollback"
  );
  assert(
    JSON.stringify(snapshotBefore.wsRows) === JSON.stringify(snapshotAfter.wsRows),
    "workspaces ordered rows 100% identical after rollback"
  );

  // Prove sqlite_master SQL DDL and index metadata are exactly unchanged
  assert(
    JSON.stringify(snapshotBefore.indexes) === JSON.stringify(snapshotAfter.indexes),
    "sqlite_master index SQL and metadata 100% identical after rollback"
  );
  assert(
    JSON.stringify(snapshotBefore.indexList) === JSON.stringify(snapshotAfter.indexList),
    "PRAGMA index_list metadata 100% identical after rollback"
  );
  assert(
    JSON.stringify(snapshotBefore.indexInfo) === JSON.stringify(snapshotAfter.indexInfo),
    "PRAGMA index_info metadata 100% identical after rollback"
  );

  // Pre-existing malformed index is still present and still fails canonical uniqueness validation
  const indexCheckAfterRollback = verifyUniqueIndexes(verifyRollbackDb);
  assert(!indexCheckAfterRollback.ok, "Pre-existing malformed index preserved; canonical index was not committed");
  verifyRollbackDb.close();
  cleanupTempDb(rollbackDbPath);

  // --- TEST GROUP 5: Malformed & Partial Index Replacement ---
  console.log("\n[Group 5: Incorrect & Partial Index Replacement]");
  const badIdxDbPath = createTempDbPath("bad-idx-test");
  const badIdxDb = new Database(badIdxDbPath);
  initBaseTables(badIdxDb);

  // Create a NON-UNIQUE index on workspace_members
  badIdxDb.exec("CREATE INDEX idx_workspace_members_ws_user ON workspace_members(workspace_id, user_id);");
  // Create a WRONG COLUMNS index on project_members without partial predicate
  badIdxDb.exec("CREATE UNIQUE INDEX idx_project_members_proj_user ON project_members(project_id);");

  badIdxDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("u_bi", "bi@t.com", "ubi", "User BI", "hash", null, now);
  badIdxDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_bi", "WS BI", "wsbi", "Pro", 1, now);
  badIdxDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_bi", "ws_bi", "u_bi", "owner", now);
  badIdxDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_bi", "ws_bi", "Proj BI", "User BI", "Planning", "2026-10-01", 0, "Overview", now);
  badIdxDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_bi", "proj_bi", "u_bi", "User BI", "lead", "UB", "bg-violet-500");
  badIdxDb.close();

  // Verify that verifyUniqueIndexes flags these invalid indexes
  const checkBadDb = new Database(badIdxDbPath, { readonly: true });
  const checkBadRes = verifyUniqueIndexes(checkBadDb);
  assert(checkBadRes.ok === false, "Deep index verification detects non-unique or malformed indexes");
  checkBadDb.close();

  // Run live migration: must replace with verified canonical indexes
  const fixIdxRes = await runUniquenessMigration({ dbPath: badIdxDbPath, skipBackup: true });
  assert(fixIdxRes.success === true, "Live migration successfully replaced malformed indexes");

  const checkFixedDb = new Database(badIdxDbPath, { readonly: true });
  const checkFixedRes = verifyUniqueIndexes(checkFixedDb);
  assert(checkFixedRes.ok === true, "Post-migration indexes pass deep verification (table, columns, uniqueness, partial predicate)");

  const fkCheckFixed = checkFixedDb.pragma("foreign_key_check") as unknown[];
  assert(fkCheckFixed.length === 0, "Post-migration foreign keys are valid");

  const integrityCheckFixed = (checkFixedDb.pragma("integrity_check") as [{ integrity_check: string }])[0].integrity_check;
  assert(integrityCheckFixed === "ok", "Post-migration SQLite integrity_check is ok");
  checkFixedDb.close();
  cleanupTempDb(badIdxDbPath);

  // --- TEST GROUP 6: Startup Paths Separation ---
  console.log("\n[Group 6: Startup Separation (Clean Seed vs Normal Startup)]");

  // 6.1 Clean reset on fresh DB creates canonical indexes and passes verification
  const freshDbPath = createTempDbPath("fresh-seed-test");
  const freshDb = new Database(freshDbPath);
  resetDatabase(freshDb);
  const freshVerif = verifyUniqueIndexes(freshDb);
  assert(freshVerif.ok === true, "Explicit resetDatabase creates canonical indexes and passes verification");
  freshDb.close();
  cleanupTempDb(freshDbPath);

  // 6.2 Normal startup on old-schema DB fails loudly with "migration required" and makes ZERO changes
  const oldSchemaDbPath = createTempDbPath("old-schema-test");
  const oldSchemaDb = new Database(oldSchemaDbPath);
  initBaseTables(oldSchemaDb); // Tables exist, but canonical unique indexes do NOT exist
  oldSchemaDb.close();

  const oldStatBefore = fs.statSync(oldSchemaDbPath);
  const oldHashBefore = crypto.createHash("sha256").update(fs.readFileSync(oldSchemaDbPath)).digest("hex");

  const verifyReader = new Database(oldSchemaDbPath, { readonly: true });
  const tablesBefore = verifyReader.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").all();
  verifyReader.close();

  let oldStartupThrew = false;
  try {
    const startupHandle = new Database(oldSchemaDbPath);
    try {
      ensureTables(startupHandle);
    } finally {
      startupHandle.close();
    }
  } catch (err: unknown) {
    oldStartupThrew = err instanceof Error && err.message.includes("Migration required. Run: npx tsx scripts/migrate-uniqueness.ts");
  }
  assert(oldStartupThrew, "Normal app startup on old schema DB fails loudly with 'Migration required' (no best-effort repair)");

  const oldStatAfter = fs.statSync(oldSchemaDbPath);
  const oldHashAfter = crypto.createHash("sha256").update(fs.readFileSync(oldSchemaDbPath)).digest("hex");

  const verifyReaderAfter = new Database(oldSchemaDbPath, { readonly: true });
  const tablesAfter = verifyReaderAfter.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").all();
  verifyReaderAfter.close();

  assert(oldStatBefore.size === oldStatAfter.size, "Old-schema DB size 100% unmodified by failed startup");
  assert(oldStatBefore.mtimeMs === oldStatAfter.mtimeMs, "Old-schema DB mtime 100% unmodified by failed startup");
  assert(oldHashBefore === oldHashAfter, "Old-schema DB SHA256 hash 100% identical after failed startup");
  assert(JSON.stringify(tablesBefore) === JSON.stringify(tablesAfter), "Old-schema DB table DDL 100% unmodified by failed startup");
  cleanupTempDb(oldSchemaDbPath);

  // --- TEST GROUP 7: Real Server Actions on Temporary DB with Real Auth Context ---
  console.log("\n[Group 7: Real Server Actions on Isolated Test Database]");
  const actionDbPath = createTempDbPath("action-test");
  const actionDb = new Database(actionDbPath);
  actionDb.pragma("journal_mode = WAL");
  actionDb.pragma("foreign_keys = ON");
  initBaseTables(actionDb);
  createCanonicalIndexes(actionDb);

  // Seed test data
  actionDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("usr_lead", "lead@act.com", "usrlead", "Lead User", "hash", null, now);
  actionDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("usr_mem", "mem@act.com", "usrmem", "Member User", "hash", null, now);
  actionDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("usr_new", "new@act.com", "usrnew", "New Candidate", "hash", null, now);
  actionDb.prepare("INSERT INTO users (id, email, username, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run("usr_external", "ext@other.com", "usrext", "External User", "hash", null, now);

  actionDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_act", "WS Action", "wsaction", "Pro", 1, now);
  actionDb.prepare("INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("ws_other", "WS Other", "wsother", "Pro", 1, now);

  actionDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_a_lead", "ws_act", "usr_lead", "owner", now);
  actionDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_a_mem", "ws_act", "usr_mem", "member", now);
  actionDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_a_new", "ws_act", "usr_new", "member", now);
  actionDb.prepare("INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)").run("wm_a_ext", "ws_other", "usr_external", "member", now);

  actionDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_act", "ws_act", "Project Action", "Lead User", "Planning", "2026-10-01", 0, "Overview", now);
  actionDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_act_lead", "proj_act", "usr_lead", "Lead User", "lead", "LU", "bg-violet-500");
  actionDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_act_mem", "proj_act", "usr_mem", "Member User", "contributor", "MU", "bg-cyan-500");

  // Point global db and sqlite proxy to actionDb
  setDatabaseForTesting(actionDb);

  await testAuthStorage!.run({ userId: "usr_lead" }, async () => {
    // 7.1 Demote sole lead with replacement already present in project
    const resRepPresent = await assignProjectMemberAction({
      projectId: "proj_act",
      userId: "usr_lead",
      role: "contributor",
      replacementUserId: "usr_mem",
    });
    assert(resRepPresent.success === true, "Demote sole lead with replacement already present succeeds");

    const leadsAfter1 = actionDb.prepare("SELECT user_id, role FROM project_members WHERE project_id = 'proj_act' AND role = 'lead'").all() as { user_id: string }[];
    assert(leadsAfter1.length === 1 && leadsAfter1[0].user_id === "usr_mem", "usr_mem promoted to lead, exactly 1 lead on project");

    const oldLeadRole1 = (actionDb.prepare("SELECT role FROM project_members WHERE project_id = 'proj_act' AND user_id = 'usr_lead'").get() as { role: string }).role;
    assert(oldLeadRole1 === "contributor", "usr_lead demoted to contributor");

    // 7.2 Ordinary lead transfer / promotion
    const resLeadTransfer = await assignProjectMemberAction({
      projectId: "proj_act",
      userId: "usr_lead",
      role: "lead",
    });
    assert(resLeadTransfer.success === true, "Ordinary lead transfer succeeds");

    const leadsAfter2 = actionDb.prepare("SELECT user_id FROM project_members WHERE project_id = 'proj_act' AND role = 'lead'").all() as { user_id: string }[];
    assert(leadsAfter2.length === 1 && leadsAfter2[0].user_id === "usr_lead", "usr_lead restored to lead, previous lead demoted to contributor");

    // 7.3 Replacement absent from project roster (new member promoted into project as lead)
    const resRepAbsent = await assignProjectMemberAction({
      projectId: "proj_act",
      userId: "usr_lead",
      role: "viewer",
      replacementUserId: "usr_new",
    });
    assert(resRepAbsent.success === true, "Demote sole lead with replacement absent from roster succeeds");

    const newLeadMember = actionDb.prepare("SELECT user_id, role FROM project_members WHERE project_id = 'proj_act' AND user_id = 'usr_new'").get() as { user_id: string; role: string };
    assert(newLeadMember && newLeadMember.role === "lead", "usr_new inserted into project_members directly as lead");

    const leadsAfter3 = actionDb.prepare("SELECT user_id FROM project_members WHERE project_id = 'proj_act' AND role = 'lead'").all() as { user_id: string }[];
    assert(leadsAfter3.length === 1 && leadsAfter3[0].user_id === "usr_new", "Exactly 1 lead on project after absent replacement promotion");

    // 7.4 Demote sole lead without replacement -> REJECTED
    const resNoRep = await assignProjectMemberAction({
      projectId: "proj_act",
      userId: "usr_new",
      role: "contributor",
    });
    assert(resNoRep.success === false && resNoRep.error!.includes("Cannot demote the sole project lead without promoting a replacement"), "Demoting sole lead without replacement is rejected");

    const leadsAfter4 = actionDb.prepare("SELECT user_id FROM project_members WHERE project_id = 'proj_act' AND role = 'lead'").all() as { user_id: string }[];
    assert(leadsAfter4.length === 1 && leadsAfter4[0].user_id === "usr_new", "usr_new remains lead (unaltered)");

    // 7.5 Invalid replacement (external user not in workspace) -> REJECTED & ROLLED BACK
    const resInvalidRep = await assignProjectMemberAction({
      projectId: "proj_act",
      userId: "usr_new",
      role: "contributor",
      replacementUserId: "usr_external",
    });
    assert(resInvalidRep.success === false && resInvalidRep.error!.includes("Replacement user is not a member of this workspace"), "Invalid replacement from outside workspace is rejected");

    const leadsAfter5 = actionDb.prepare("SELECT user_id FROM project_members WHERE project_id = 'proj_act' AND role = 'lead'").all() as { user_id: string }[];
    assert(leadsAfter5.length === 1 && leadsAfter5[0].user_id === "usr_new", "Transaction rolled back: usr_new remains lead");

    // 7.6 Starting invariant: zero starting leads
    actionDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_zero", "ws_act", "Zero Lead Proj", "No One", "Planning", "2026-10-01", 0, "Overview", now);
    const resZeroLead = await assignProjectMemberAction({
      projectId: "proj_zero",
      userId: "usr_mem",
      role: "lead",
    });
    assert(resZeroLead.success === false && resZeroLead.error!.includes("project must start with exactly one lead"), "Zero starting leads fails closed with invariant violation");

    // 7.7 Starting invariant: multiple starting leads
    actionDb.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("proj_multi", "ws_act", "Multi Lead Proj", "Both", "Planning", "2026-10-01", 0, "Overview", now);
    actionDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_m1", "proj_multi", "usr_lead", "L1", "lead", "LU", "bg-violet-500");
    actionDb.prepare("INSERT INTO project_members VALUES (?, ?, ?, ?, ?, ?, ?)").run("pm_m2", "proj_multi", "usr_mem", "L2", "lead", "MU", "bg-cyan-500");

    const resMultiLead = await assignProjectMemberAction({
      projectId: "proj_multi",
      userId: "usr_new",
      role: "lead",
    });
    assert(resMultiLead.success === false && resMultiLead.error!.includes("project must start with exactly one lead"), "Multiple starting leads fails closed with invariant violation");

    // 7.8 Real createProjectAction strict roster validation
    const resMissingUserId = await createProjectAction({
      workspaceId: "ws_act",
      name: "Test Proj Missing User",
      members: [{ name: "No User ID", role: "contributor" }],
    });
    assert(resMissingUserId.success === false && resMissingUserId.error!.includes("must have a valid user ID"), "createProjectAction rejects roster member missing userId");

    // External user not in workspace
    const resExtMember = await createProjectAction({
      workspaceId: "ws_act",
      name: "Test Proj Ext Member",
      members: [{ userId: "usr_external", name: "External", role: "contributor" }],
    });
    assert(resExtMember.success === false && resExtMember.error!.includes("must belong to this workspace"), "createProjectAction rejects external roster member");

    // Duplicate roster member
    const resDupMember = await createProjectAction({
      workspaceId: "ws_act",
      name: "Test Proj Dup Member",
      members: [
        { userId: "usr_mem", name: "Member 1", role: "contributor" },
        { userId: "usr_mem", name: "Member 2", role: "viewer" },
      ],
    });
    assert(resDupMember.success === false && resDupMember.error!.includes("Duplicate member in roster"), "createProjectAction rejects duplicate roster member");

    // 7.9 Production-path unknown-type tests
    // Seed a conversation with unknown type
    actionDb.prepare(`
      INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("conv_unk_type", "ws_act", "invalid_group_chat", "[]", "Unknown Group", "UG", "bg-purple-500", "Group", "Hello", now, 0);

    // 7.9.1 getLiveConversationsAction omits unknown-type conversations
    const liveConvsRes = await getLiveConversationsAction("ws_act");
    assert(liveConvsRes.success === true, "getLiveConversationsAction succeeds");
    const convIds = liveConvsRes.conversations!.map((c) => c.id);
    assert(!convIds.includes("conv_unk_type"), "Production getLiveConversationsAction omits unknown-type conversation");

    // 7.9.2 sendMessageAction rejects unknown-type conversations
    const sendUnkRes = await sendMessageAction("conv_unk_type", "Lead User", "Sending to unknown type");
    assert(sendUnkRes.success === false, "Production sendMessageAction rejects unknown-type conversation");
    assert(sendUnkRes.error!.includes("Invalid conversation type"), "sendMessageAction returns access denied for unknown type");

    // 7.9.3 SSE stream drops events for unknown-type conversations
    const sseResponse = await getSseEvents(new Request("http://localhost/api/messages/events?workspaceId=ws_act"));
    assert(sseResponse.status === 200, "SSE connection opens successfully for workspace member");
    const sseReader = sseResponse.body!.getReader();
    const sseDecoder = new TextDecoder();

    // Read initial connected event
    const initialChunk = await sseReader.read();
    const initialText = sseDecoder.decode(initialChunk.value);
    assert(initialText.includes('"type":"connected"'), "SSE stream connected event received");

    // Publish event for unknown conversation type -> must be dropped
    messageBus.publishMessage({
      type: "new_message",
      workspaceId: "ws_act",
      conversationId: "conv_unk_type",
      message: { id: "msg_unk", sender: "Lead User", content: "dropped_content_xyz", timestamp: now },
    });

    // Publish event for a valid channel
    actionDb.prepare(`
      INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("conv_val_channel", "ws_act", "channel", "[]", "Valid Channel", "VC", "bg-blue-500", "Channel", "Valid", now, 0);

    messageBus.publishMessage({
      type: "new_message",
      workspaceId: "ws_act",
      conversationId: "conv_val_channel",
      message: { id: "msg_val", sender: "Lead User", content: "emitted_content_abc", timestamp: now },
    });

    const nextChunk = await sseReader.read();
    const nextText = sseDecoder.decode(nextChunk.value);
    assert(!nextText.includes("dropped_content_xyz"), "SSE stream dropped event for unknown conversation type");
    assert(nextText.includes("emitted_content_abc"), "SSE stream emitted event for valid channel");
    await sseReader.cancel();

    // 7.10 DM reuse filtering through shared classifier and canonical validator
    // Candidate 1: DM candidate with invalid type
    actionDb.prepare(`
      INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("conv_invalid_dm_cand", "ws_act", "bad_type", JSON.stringify(["usr_lead", "usr_new"]), "Bad Candidate", "BC", "bg-red-500", "DM", "", now, 0);

    const reuseBadRes = await createConversationAction({
      workspaceId: "ws_act",
      name: "New Candidate",
      type: "direct",
      recipientId: "usr_new",
    });
    assert(reuseBadRes.success === true, "createConversationAction succeeds");
    assert(reuseBadRes.id !== "conv_invalid_dm_cand", "createConversationAction did not reuse invalid DM candidate");

    // Candidate 2: Valid DM candidate
    const legitimateDmId = "conv_legit_dm";
    actionDb.prepare(`
      INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(legitimateDmId, "ws_act", "direct", JSON.stringify(["usr_lead", "usr_mem"]), "Member User", "MU", "bg-cyan-500", "Direct Message", "", now, 0);

    const reuseGoodRes = await createConversationAction({
      workspaceId: "ws_act",
      name: "Member User",
      type: "direct",
      recipientId: "usr_mem",
    });
    assert(reuseGoodRes.success === true, "createConversationAction succeeds for valid DM");
    assert(reuseGoodRes.isExisting === true && reuseGoodRes.id === legitimateDmId, "createConversationAction reuses legitimate validated DM");
  });

  // Reset database override
  setDatabaseForTesting(undefined);
  actionDb.close();
  cleanupTempDb(actionDbPath);

  console.log("\n==================================================");
  console.log(`INTEGRATION TESTS COMPLETE: ${passed} of ${total} passed.`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL in test suite:", err);
  process.exit(1);
});
