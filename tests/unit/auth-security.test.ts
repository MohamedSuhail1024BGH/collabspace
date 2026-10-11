import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

vi.mock("next/headers", async () => {
  const { cookiesMock, headersMock } = await import("./helpers/next-mocks");
  return { cookies: cookiesMock, headers: headersMock };
});
vi.mock("next/cache", async () => {
  const { revalidatePathMock, revalidateTagMock } = await import("./helpers/next-mocks");
  return { revalidatePath: revalidatePathMock, revalidateTag: revalidateTagMock };
});

import {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  verifyPasswordSync,
  needsRehash,
  dummyVerify,
  DUMMY_PHC_HASH,
  SCRYPT_PARAMS,
  LEGACY_SCRYPT_PARAMS,
} from "@/lib/auth/password";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
  clearAllRateLimits,
  extractClientIp,
  RATE_LIMIT_CONFIG,
} from "@/lib/auth/rate-limiter";
import {
  createSession,
  revokeAllUserSessions,
  cleanupExpiredSessions,
  testAuthStorage,
} from "@/lib/db/auth";
import {
  migrateAuthSecurity,
  verifySessionsIndexes,
  checkAuthRateLimitsTable,
} from "../../scripts/migrate-auth-security";
import { loginAction, signupAction, changePasswordAction } from "@/app/actions-auth";
import {
  createTestDatabase,
  destroyTestDatabase,
  type UnitTestDatabase,
} from "./helpers/test-db";

const plainPass = "SuperSecretPassword123!";
const wrongPass = "WrongPassword456!";

let testDb: UnitTestDatabase;

// Hash material shared across groups (group 1 computes, groups 2-4 consume).
let modernHash: string;
let legacyHash: string;

function tmpDbPath(name: string): string {
  const dir = path.resolve(process.cwd(), ".test-tmp");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.db`);
}

beforeAll(async () => {
  testDb = await createTestDatabase();

  modernHash = await hashPassword(plainPass);
  const legacySalt = crypto.randomBytes(16).toString("hex");
  const legacyKey = crypto
    .scryptSync(plainPass, legacySalt, LEGACY_SCRYPT_PARAMS.keylen, {
      cost: LEGACY_SCRYPT_PARAMS.N,
      blockSize: LEGACY_SCRYPT_PARAMS.r,
      parallelization: LEGACY_SCRYPT_PARAMS.p,
      maxmem: LEGACY_SCRYPT_PARAMS.maxmem,
    })
    .toString("hex");
  legacyHash = `${legacySalt}:${legacyKey}`;
});

afterAll(async () => {
  await destroyTestDatabase(testDb);
});

describe("auth & session security", () => {
  describe("Group 1: Modern scrypt hashing & dual-format verification", () => {
    it("hashPassword outputs valid PHC format with N=65536, r=8, p=1", async () => {
      expect(modernHash.startsWith(`$scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$`)).toBe(
        true
      );
      expect(needsRehash(modernHash)).toBe(false);
    });

    it("hashPasswordSync outputs valid PHC format", () => {
      const syncHash = hashPasswordSync(plainPass);
      expect(syncHash.startsWith(`$scrypt$N=${SCRYPT_PARAMS.N},r=8,p=1$`)).toBe(true);
    });

    it("verifyPassword succeeds with correct password and rejects wrong password on modern hash", async () => {
      expect(await verifyPassword(plainPass, modernHash)).toBe(true);
      expect(await verifyPassword(wrongPass, modernHash)).toBe(false);
    });

    it("verifyPassword handles legacy salt_hex:derivedKey_hex hash format", async () => {
      expect(needsRehash(legacyHash)).toBe(true);
      expect(await verifyPassword(plainPass, legacyHash)).toBe(true);
      expect(await verifyPassword(wrongPass, legacyHash)).toBe(false);
    });

    it("verifyPasswordSync has parity with async verification on both formats", () => {
      expect(verifyPasswordSync(plainPass, modernHash)).toBe(true);
      expect(verifyPasswordSync(wrongPass, modernHash)).toBe(false);
      expect(verifyPasswordSync(plainPass, legacyHash)).toBe(true);
      expect(verifyPasswordSync(wrongPass, legacyHash)).toBe(false);
    });

    it("DUMMY_PHC_HASH is valid PHC format with exact 16-byte salt and 32-byte key", () => {
      const dummyMatch = DUMMY_PHC_HASH.match(
        /^\$scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/
      );
      expect(dummyMatch).toBeTruthy();
      const decodedDummySalt = Buffer.from(dummyMatch![4], "base64url");
      const decodedDummyKey = Buffer.from(dummyMatch![5], "base64url");
      expect(decodedDummySalt.length).toBe(16);
      expect(decodedDummyKey.length).toBe(32);
    });

    it("dummyVerify actually invokes crypto.scrypt and does non-trivial work", async () => {
      let scryptInvokedForDummy = false;
      const origScrypt = crypto.scrypt;
      (crypto as unknown as { scrypt: unknown }).scrypt = (
        ...args: Parameters<typeof origScrypt>
      ) => {
        scryptInvokedForDummy = true;
        return (origScrypt as (...a: unknown[]) => unknown)(...args);
      };

      const t0 = Date.now();
      await dummyVerify(wrongPass);
      const elapsed = Date.now() - t0;
      (crypto as unknown as { scrypt: unknown }).scrypt = origScrypt;

      expect(scryptInvokedForDummy).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });

    it("needsRehash triggers true for sub-standard N < 65536", () => {
      const weakHash = `$scrypt$N=16384,r=8,p=1$c29tZXNhbHQxMjM0$${Buffer.alloc(32).toString("base64url")}`;
      expect(needsRehash(weakHash)).toBe(true);
    });

    it("verifyPassword fails closed on malformed input", async () => {
      expect(await verifyPassword(plainPass, "corrupted:hash:parts")).toBe(false);
      expect(await verifyPassword(plainPass, "$scrypt$badformat")).toBe(false);
      expect(await verifyPassword("", modernHash)).toBe(false);
    });
  });

  describe("Group 2: Login rate limiting & lockout DoS defense", () => {
    const testEmail = "victim_user@collabspace.test";
    const attackerIp = "198.51.100.25";

    it("account lockout triggers on the 5th failed attempt and applies across IPs", async () => {
      await clearAllRateLimits();

      const initialCheck = await checkLoginRateLimit(testEmail, attackerIp);
      expect(initialCheck.allowed).toBe(true);

      for (let i = 1; i <= 4; i++) {
        await recordFailedLogin(testEmail, attackerIp);
      }
      const checkAfter4 = await checkLoginRateLimit(testEmail, attackerIp);
      expect(checkAfter4.allowed).toBe(true);

      await recordFailedLogin(testEmail, attackerIp);
      const checkAfter5 = await checkLoginRateLimit(testEmail, attackerIp);
      expect(checkAfter5.allowed).toBe(false);
      expect(typeof checkAfter5.retryAfterSeconds).toBe("number");
      expect(checkAfter5.retryAfterSeconds!).toBeGreaterThan(0);

      const diffIp = "203.0.113.88";
      const crossIpCheck = await checkLoginRateLimit(testEmail, diffIp);
      expect(crossIpCheck.allowed).toBe(false);

      await resetLoginRateLimit(testEmail, attackerIp);
      const resetCheck = await checkLoginRateLimit(testEmail, attackerIp);
      expect(resetCheck.allowed).toBe(true);
    });

    it("per-IP rate limiting triggers on the 10th attempt across distinct usernames", async () => {
      await clearAllRateLimits();
      const stuffingIp = "192.0.2.100";
      for (let i = 1; i <= 9; i++) {
        await recordFailedLogin(`user_${i}@example.com`, stuffingIp);
      }
      expect((await checkLoginRateLimit("fresh_user@example.com", stuffingIp)).allowed).toBe(true);

      await recordFailedLogin("user_10@example.com", stuffingIp);
      const ipLockCheck = await checkLoginRateLimit("any_user@example.com", stuffingIp);
      expect(ipLockCheck.allowed).toBe(false);

      await clearAllRateLimits();
    });

    it("extractClientIp uses the rightmost trusted hop and fails safe", () => {
      const hSpoofed = new Headers({ "x-forwarded-for": "attacker.spoofed.ip, 203.0.113.195" });
      expect(extractClientIp(hSpoofed)).toBe("203.0.113.195");

      const hSingle = new Headers({ "x-forwarded-for": "  198.51.100.50  " });
      expect(extractClientIp(hSingle)).toBe("198.51.100.50");

      const hRealIp = new Headers({ "x-real-ip": "192.0.2.75" });
      expect(extractClientIp(hRealIp)).toBe("192.0.2.75");

      const hDefault = new Headers({});
      expect(extractClientIp(hDefault)).toBe("127.0.0.1");
    });

    it("fails closed on rate-limit storage errors (missing table)", async () => {
      await testDb.exec(
        "ALTER TABLE auth_rate_limits RENAME TO auth_rate_limits_temp_err;"
      );
      try {
        const failedStorageCheck = await checkLoginRateLimit("any_user@collabspace.test", "1.2.3.4");
        expect(failedStorageCheck.allowed).toBe(false);
        expect(typeof failedStorageCheck.retryAfterSeconds).toBe("number");
        expect(failedStorageCheck.retryAfterSeconds!).toBeGreaterThan(0);

        const loginCheckFailResult = await loginAction({
          email: "any_user@collabspace.test",
          password: "Password123!",
        });
        expect(loginCheckFailResult.success).toBe(false);
        expect(loginCheckFailResult.error).toBe("Invalid email or password.");

        await expect(
          recordFailedLogin("victim@collabspace.test", "1.2.3.4")
        ).rejects.toThrow();
      } finally {
        await testDb.exec(
          "ALTER TABLE auth_rate_limits_temp_err RENAME TO auth_rate_limits;"
        );
      }
    });

    it("loginAction returns a uniform error when the rate-limit write fails (trigger abort)", async () => {
      await testDb.exec(`
        INSERT INTO users (id, email, password_hash, name, created_at)
        VALUES ('usr-storage-test', 'storage_test@collabspace.test', '${modernHash}', 'Storage Test User', '${new Date().toISOString()}')
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, created_at = EXCLUDED.created_at;
      `);
      await testDb.exec(`
        CREATE FUNCTION test_abort_record_fn() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'Storage write failure'; END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER test_abort_record BEFORE INSERT ON auth_rate_limits
          FOR EACH ROW EXECUTE FUNCTION test_abort_record_fn();
        CREATE TRIGGER test_abort_record_up BEFORE UPDATE ON auth_rate_limits
          FOR EACH ROW EXECUTE FUNCTION test_abort_record_fn();
      `);

      try {
        const loginRecordFailResult = await loginAction({
          email: "storage_test@collabspace.test",
          password: "WrongPassword123!",
        });
        expect(loginRecordFailResult.success).toBe(false);
        expect(loginRecordFailResult.error).toBe("Invalid email or password.");
      } finally {
        await testDb.exec(`
          DROP TRIGGER IF EXISTS test_abort_record ON auth_rate_limits;
          DROP TRIGGER IF EXISTS test_abort_record_up ON auth_rate_limits;
          DROP FUNCTION IF EXISTS test_abort_record_fn();
          DELETE FROM users WHERE id = 'usr-storage-test';
        `);
        await clearAllRateLimits();
      }
    });

    it("expired sliding window and lock start a fresh counter instead of re-locking", async () => {
      await clearAllRateLimits();
      const email = "window_user@collabspace.test";
      const ip = "198.51.100.77";

      // Drive the account key to its lockout threshold
      for (let i = 0; i < RATE_LIMIT_CONFIG.ACCOUNT_MAX_ATTEMPTS; i++) {
        await recordFailedLogin(email, ip);
      }
      expect((await checkLoginRateLimit(email, ip)).allowed).toBe(false);

      // Simulate both the sliding window and the lockout having expired
      const past = new Date(Date.now() - RATE_LIMIT_CONFIG.WINDOW_MS - 60_000).toISOString();
      await testDb.exec(`
        UPDATE auth_rate_limits
        SET first_attempt_at = '${past}',
            last_attempt_at = '${past}',
            locked_until = '${past}'
        WHERE key IN ('account:${email}', 'ip:${ip}')
      `);
      expect((await checkLoginRateLimit(email, ip)).allowed).toBe(true);

      // The next failure starts a fresh window (count 1) instead of incrementing to a re-lock
      await recordFailedLogin(email, ip);
      const row = (await testDb
        .prepare("SELECT attempt_count, locked_until FROM auth_rate_limits WHERE key = ?")
        .get(`account:${email}`)) as { attempt_count: number; locked_until: string | null };
      expect(row.attempt_count).toBe(1);
      expect(row.locked_until).toBeNull();
      expect((await checkLoginRateLimit(email, ip)).allowed).toBe(true);

      await clearAllRateLimits();
    });
  });

  describe("Group 3: Server-side session lifecycle & revocation", () => {
    const testUserId = "usr-test-lifecycle-1";

    beforeAll(async () => {
      await testDb.exec(`
        INSERT INTO users (id, email, password_hash, name, created_at)
        VALUES ('${testUserId}', 'test_session@collabspace.test', '${modernHash}', 'Test Session User', '${new Date().toISOString()}')
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, created_at = EXCLUDED.created_at;
      `);
    });

    it("createSession returns a high-entropy sess_ token", async () => {
      const s1 = await createSession(testUserId);
      expect(s1.startsWith("sess_")).toBe(true);
      expect(s1.length).toBeGreaterThanOrEqual(40);
    });

    it("revokeAllUserSessions preserves the current session and revokes others", async () => {
      const s1 = await createSession(testUserId);

      const s2 = `sess_${crypto.randomBytes(32).toString("base64url")}`;
      await testDb
        .prepare(
          "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
        )
        .run(s2, testUserId, new Date(Date.now() + 86400000).toISOString(), new Date().toISOString());

      const activeCountBefore = (
        (await testDb
          .prepare("SELECT COUNT(*) as count FROM sessions WHERE user_id = ?")
          .get(testUserId)) as { count: number }
      ).count;
      expect(activeCountBefore).toBe(2);

      await revokeAllUserSessions(testUserId, s1);
      const s1Exists = await testDb.prepare("SELECT id FROM sessions WHERE id = ?").get(s1);
      const s2Exists = await testDb.prepare("SELECT id FROM sessions WHERE id = ?").get(s2);
      expect(Boolean(s1Exists)).toBe(true);
      expect(!s2Exists).toBe(true);
    });

    it("expired session cleanup purges expired rows", async () => {
      const expiredSessionId = `sess_expired_${Date.now()}`;
      await testDb
        .prepare(
          "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
        )
        .run(
          expiredSessionId,
          testUserId,
          new Date(Date.now() - 100000).toISOString(),
          new Date().toISOString()
        );

      const purgedCount = await cleanupExpiredSessions();
      expect(purgedCount).toBeGreaterThanOrEqual(1);

      const expiredExists = await testDb
        .prepare("SELECT id FROM sessions WHERE id = ?")
        .get(expiredSessionId);
      expect(!expiredExists).toBe(true);
    });
  });

  describe("Group 4: Production server actions integration", () => {
    it("signupAction writes a modern $scrypt$ PHC hash", async () => {
      const signupEmail = `newuser_${Date.now()}@test.org`;
      const signupRes = await signupAction({
        name: "New Security User",
        email: signupEmail,
        password: "PasswordToHash123!",
      });
      expect(signupRes.success).toBe(true);

      const createdUser = (await testDb
        .prepare("SELECT password_hash FROM users WHERE email = ?")
        .get(signupEmail)) as { password_hash: string };
      expect(createdUser.password_hash.startsWith("$scrypt$N=65536")).toBe(true);
    });

    it("loginAction transparently upgrades a legacy hash on successful login", async () => {
      const legacyEmail = `legacy_${Date.now()}@test.org`;
      await testDb
        .prepare(
          "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, 'Legacy User', ?)"
        )
        .run(`usr-legacy-${Date.now()}`, legacyEmail, legacyHash, new Date().toISOString());

      const loginRes = await loginAction({ email: legacyEmail, password: plainPass });
      expect(loginRes.success).toBe(true);

      const rehashedUser = (await testDb
        .prepare("SELECT password_hash FROM users WHERE email = ?")
        .get(legacyEmail)) as { password_hash: string };
      expect(rehashedUser.password_hash.startsWith("$scrypt$N=65536")).toBe(true);
      expect(needsRehash(rehashedUser.password_hash)).toBe(false);
    });

    it("changePasswordAction writes a modern hash", async () => {
      const signupEmail = `chpw_${Date.now()}@test.org`;
      const signupRes = await signupAction({
        name: "Change Password User",
        email: signupEmail,
        password: "PasswordToHash123!",
      });
      expect(signupRes.success).toBe(true);

      expect(testAuthStorage).toBeTruthy();
      await testAuthStorage!.run({ userId: signupRes.userId! }, async () => {
        const changeRes = await changePasswordAction({
          currentPassword: "PasswordToHash123!",
          newPassword: "BrandNewSecurePassword789!",
        });
        expect(changeRes.success).toBe(true);

        const updatedUser = (await testDb
          .prepare("SELECT password_hash FROM users WHERE id = ?")
          .get(signupRes.userId!)) as { password_hash: string };
        expect(updatedUser.password_hash.startsWith("$scrypt$N=65536")).toBe(true);
      });
    });
  });

  describe("Group 5: Migration script integrity, dry-run & safety (legacy SQLite script)", () => {
    let tempDbPath: string;

    beforeAll(() => {
      // Self-contained legacy migration test: migrate-auth-security operates
      // directly on a SQLite file, so this group keeps better-sqlite3.
      tempDbPath = tmpDbPath("test-auth-sec");
      const tempDb = new Database(tempDbPath);
      tempDb.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        INSERT INTO users VALUES ('u1', 'user1@test.com', '${modernHash}', 'User 1', '2026-01-01');
        INSERT INTO users VALUES ('u2', 'user2@test.com', '${legacyHash}', 'User 2', '2026-01-01');
        INSERT INTO sessions VALUES ('s1', 'u1', '${new Date(Date.now() + 86400000).toISOString()}', '2026-01-01');
        INSERT INTO sessions VALUES ('s2', 'u1', '2025-01-01T00:00:00.000Z', '2025-01-01');
      `);
      tempDb.close();
    });

    afterAll(() => {
      try {
        fs.unlinkSync(tempDbPath);
        if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
        if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
      } catch {
        /* already cleaned */
      }
    });

    it("dry-run is immutable and reports correct counts", async () => {
      const preStat = fs.statSync(tempDbPath);
      const dryResult = await migrateAuthSecurity({ dbPath: tempDbPath, dryRun: true });

      expect(dryResult.success).toBe(true);
      expect(dryResult.dryRun).toBe(true);
      expect(dryResult.alreadyApplied).toBe(false);
      expect(dryResult.usersScanned).toBe(2);
      expect(dryResult.modernHashesCount).toBe(1);
      expect(dryResult.legacyHashesCount).toBe(1);
      expect(dryResult.rateLimitsTableCreated).toBe(true);
      expect(dryResult.sessionsIndexesCreated).toBe(true);

      const postStat = fs.statSync(tempDbPath);
      expect(preStat.size).toBe(postStat.size);
      expect(preStat.mtimeMs).toBe(postStat.mtimeMs);
    });

    it("pre-commit failure injection rolls back completely", async () => {
      const forcedResult = await migrateAuthSecurity({
        dbPath: tempDbPath,
        forcePreCommitFailure: true,
        skipBackup: true,
      });
      expect(forcedResult.success).toBe(false);

      const verifDb = new Database(tempDbPath);
      expect(!checkAuthRateLimitsTable(verifDb)).toBe(true);
      const idxCheck = verifySessionsIndexes(verifDb);
      expect(!idxCheck.ok).toBe(true);
      verifDb.close();
    });

    it("live migration succeeds, then post-migration dry run reports alreadyApplied", async () => {
      const liveResult = await migrateAuthSecurity({ dbPath: tempDbPath, skipBackup: true });
      expect(liveResult.success).toBe(true);
      expect(liveResult.expiredSessionsPurged).toBe(1);

      const postMigDb = new Database(tempDbPath);
      expect(checkAuthRateLimitsTable(postMigDb)).toBe(true);
      const postIdxCheck = verifySessionsIndexes(postMigDb);
      expect(postIdxCheck.ok).toBe(true);
      postMigDb.close();

      const postDryResult = await migrateAuthSecurity({ dbPath: tempDbPath, dryRun: true });
      expect(postDryResult.alreadyApplied).toBe(true);
    });
  });
});
