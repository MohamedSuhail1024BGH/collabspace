import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";
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
} from "../../lib/auth/password";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
  clearAllRateLimits,
  extractClientIp,
} from "../../lib/auth/rate-limiter";
import {
  createSession,
  revokeAllUserSessions,
  cleanupExpiredSessionsSync,
  testAuthStorage,
} from "../../lib/db/auth";
import {
  migrateAuthSecurity,
  verifySessionsIndexes,
  checkAuthRateLimitsTable,
} from "../../scripts/migrate-auth-security";
import { sqlite } from "../../lib/db";
import { loginAction, signupAction, changePasswordAction } from "../../app/actions";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  FAIL: ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAuthSecurityTests() {
  console.log("==================================================");
  console.log("RUNNING AUTH & SESSION SECURITY UNIT TESTS");
  console.log("==================================================");

  // ----------------------------------------------------
  // GROUP 1: Standard Modern scrypt Hashing & Dual-Format
  // ----------------------------------------------------
  console.log("\n[Group 1: Standard Modern scrypt Hashing & Dual-Format]");

  const plainPass = "SuperSecretPassword123!";
  const wrongPass = "WrongPassword456!";

  // 1.1 Async hashing format
  const modernHash = await hashPassword(plainPass);
  assert(
    modernHash.startsWith(`$scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$`),
    "hashPassword outputs valid PHC format with N=65536, r=8, p=1"
  );
  assert(
    !needsRehash(modernHash),
    "Modern hash does not require rehashing"
  );

  // 1.2 Sync hashing format
  const syncHash = hashPasswordSync(plainPass);
  assert(
    syncHash.startsWith(`$scrypt$N=${SCRYPT_PARAMS.N},r=8,p=1$`),
    "hashPasswordSync outputs valid PHC format"
  );

  // 1.3 Verification of modern hash
  const modernValid = await verifyPassword(plainPass, modernHash);
  assert(modernValid === true, "verifyPassword succeeds with correct password on modern hash");

  const modernInvalid = await verifyPassword(wrongPass, modernHash);
  assert(modernInvalid === false, "verifyPassword rejects wrong password on modern hash");

  // 1.4 Verification of legacy hash format (salt_hex:derivedKey_hex)
  const legacySalt = crypto.randomBytes(16).toString("hex");
  const legacyKey = crypto
    .scryptSync(plainPass, legacySalt, LEGACY_SCRYPT_PARAMS.keylen, {
      cost: LEGACY_SCRYPT_PARAMS.N,
      blockSize: LEGACY_SCRYPT_PARAMS.r,
      parallelization: LEGACY_SCRYPT_PARAMS.p,
      maxmem: LEGACY_SCRYPT_PARAMS.maxmem,
    })
    .toString("hex");
  const legacyHash = `${legacySalt}:${legacyKey}`;

  assert(needsRehash(legacyHash), "Legacy hash correctly triggers needsRehash = true");

  const legacyValid = await verifyPassword(plainPass, legacyHash);
  assert(legacyValid === true, "verifyPassword succeeds with correct password on legacy hash");

  const legacyInvalid = await verifyPassword(wrongPass, legacyHash);
  assert(legacyInvalid === false, "verifyPassword rejects wrong password on legacy hash");

  // 1.4b Synchronous verification parity
  assert(verifyPasswordSync(plainPass, modernHash) === true, "verifyPasswordSync succeeds on modern hash");
  assert(verifyPasswordSync(wrongPass, modernHash) === false, "verifyPasswordSync rejects wrong password on modern hash");
  assert(verifyPasswordSync(plainPass, legacyHash) === true, "verifyPasswordSync succeeds on legacy hash");
  assert(verifyPasswordSync(wrongPass, legacyHash) === false, "verifyPasswordSync rejects wrong password on legacy hash");

  // 1.4c Constant-time dummy verification performs real scrypt derivation with valid 16-byte salt
  const dummyMatch = DUMMY_PHC_HASH.match(/^\$scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/);
  assert(!!dummyMatch, "DUMMY_PHC_HASH is valid PHC format");
  const decodedDummySalt = Buffer.from(dummyMatch![4], "base64url");
  const decodedDummyKey = Buffer.from(dummyMatch![5], "base64url");
  assert(decodedDummySalt.length === 16, "DUMMY_PHC_HASH has exact 16-byte salt (not 15)");
  assert(decodedDummyKey.length === 32, "DUMMY_PHC_HASH has exact 32-byte key");

  let scryptInvokedForDummy: boolean = false;
  const origScrypt = crypto.scrypt;
  // Intercept crypto.scrypt to prove it is called during dummy verification
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

  assert(Boolean(scryptInvokedForDummy), "dummyVerify actually invokes crypto.scrypt");
  assert(
    elapsed >= 10,
    `dummyVerify performs non-trivial scrypt derivation work (elapsed ${elapsed}ms >= 10ms)`
  );

  // 1.5 Sub-standard N parameter detection
  const weakHash = `$scrypt$N=16384,r=8,p=1$c29tZXNhbHQxMjM0$${Buffer.alloc(32).toString("base64url")}`;
  assert(needsRehash(weakHash), "needsRehash triggers true for N < 65536");

  // 1.6 Corrupted format fail-closed
  assert((await verifyPassword(plainPass, "corrupted:hash:parts")) === false, "verifyPassword fails closed on malformed colon string");
  assert((await verifyPassword(plainPass, "$scrypt$badformat")) === false, "verifyPassword fails closed on bad PHC prefix");
  assert((await verifyPassword("", modernHash)) === false, "verifyPassword fails closed on empty password");

  // ----------------------------------------------------
  // GROUP 2: Login Rate Limiting & Lockout DoS Defense
  // ----------------------------------------------------
  console.log("\n[Group 2: Login Rate Limiting & Lockout DoS Defense]");

  // Setup test environment in SQLite
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 1,
      first_attempt_at TEXT NOT NULL,
      last_attempt_at TEXT NOT NULL,
      locked_until TEXT
    );
  `);
  await clearAllRateLimits();

  const testEmail = "victim_user@collabspace.test";
  const attackerIp = "198.51.100.25";

  // 2.1 Initial check allows login
  const initialCheck = await checkLoginRateLimit(testEmail, attackerIp);
  assert(initialCheck.allowed === true, "Initial rate limit check allows login");

  // 2.2 Record 4 failed attempts (under account threshold of 5)
  for (let i = 1; i <= 4; i++) {
    await recordFailedLogin(testEmail, attackerIp);
  }
  const checkAfter4 = await checkLoginRateLimit(testEmail, attackerIp);
  assert(checkAfter4.allowed === true, "Account still allowed after 4 failed attempts");

  // 2.3 5th failed attempt locks the account
  await recordFailedLogin(testEmail, attackerIp);
  const checkAfter5 = await checkLoginRateLimit(testEmail, attackerIp);
  assert(checkAfter5.allowed === false, "5th failed attempt triggers account lockout");
  assert(
    typeof checkAfter5.retryAfterSeconds === "number" && checkAfter5.retryAfterSeconds > 0,
    "Lockout returns positive retryAfterSeconds"
  );

  // 2.4 Attacker from different IP cannot log in to locked account (per-account primary defense)
  const diffIp = "203.0.113.88";
  const crossIpCheck = await checkLoginRateLimit(testEmail, diffIp);
  assert(
    crossIpCheck.allowed === false,
    "Per-account lockout applies across any client IP (primary defense)"
  );

  // 2.5 Reset on successful login restores access
  await resetLoginRateLimit(testEmail, attackerIp);
  const resetCheck = await checkLoginRateLimit(testEmail, attackerIp);
  assert(resetCheck.allowed === true, "resetLoginRateLimit immediately restores access");

  // 2.6 Per-IP rate limiting across multiple distinct usernames
  await clearAllRateLimits();
  const stuffingIp = "192.0.2.100";
  for (let i = 1; i <= 9; i++) {
    await recordFailedLogin(`user_${i}@example.com`, stuffingIp);
  }
  assert(
    (await checkLoginRateLimit("fresh_user@example.com", stuffingIp)).allowed === true,
    "IP allowed under threshold of 10 attempts"
  );

  // 10th attempt triggers IP lock
  await recordFailedLogin("user_10@example.com", stuffingIp);
  const ipLockCheck = await checkLoginRateLimit("any_user@example.com", stuffingIp);
  assert(ipLockCheck.allowed === false, "10th failed attempt triggers per-IP lockout");

  await clearAllRateLimits();

  // 2.7 Client IP Extraction & Rightmost Trusted Hop Defense
  const hSpoofed = new Headers({ "x-forwarded-for": "attacker.spoofed.ip, 203.0.113.195" });
  assert(
    extractClientIp(hSpoofed) === "203.0.113.195",
    "extractClientIp extracts rightmost proxy hop, ignoring client-controlled leftmost spoof"
  );
  const hSingle = new Headers({ "x-forwarded-for": "  198.51.100.50  " });
  assert(extractClientIp(hSingle) === "198.51.100.50", "extractClientIp extracts single trimmed entry");
  const hRealIp = new Headers({ "x-real-ip": "192.0.2.75" });
  assert(extractClientIp(hRealIp) === "192.0.2.75", "extractClientIp falls back to x-real-ip");
  const hDefault = new Headers({});
  assert(extractClientIp(hDefault) === "127.0.0.1", "extractClientIp defaults safely to 127.0.0.1");

  // 2.8 Fail-Closed Storage Error Path 1: checkLoginRateLimit SQLite error denies login
  sqlite.exec("ALTER TABLE auth_rate_limits RENAME TO auth_rate_limits_temp_err;");
  try {
    const failedStorageCheck = await checkLoginRateLimit("any_user@collabspace.test", "1.2.3.4");
    assert(
      failedStorageCheck.allowed === false,
      "checkLoginRateLimit fails closed (allowed: false) upon SQLite error"
    );
    assert(
      typeof failedStorageCheck.retryAfterSeconds === "number" && failedStorageCheck.retryAfterSeconds > 0,
      "checkLoginRateLimit returns safe fallback retryAfterSeconds on storage failure"
    );

    const loginCheckFailResult = await loginAction({
      email: "any_user@collabspace.test",
      password: "Password123!",
    });
    assert(
      loginCheckFailResult.success === false &&
        loginCheckFailResult.error === "Invalid email or password.",
      "loginAction denies login with uniform error when rate limiter check encounters storage failure"
    );

    let directRecordThrew = false;
    try {
      recordFailedLogin("victim@collabspace.test", "1.2.3.4");
    } catch {
      directRecordThrew = true;
    }
    assert(directRecordThrew === true, "recordFailedLogin throws on storage error (caller must handle)");
  } finally {
    sqlite.exec("ALTER TABLE auth_rate_limits_temp_err RENAME TO auth_rate_limits;");
  }

  // 2.9 Fail-Closed Storage Error Path 2: recordFailedLogin write error handled cleanly in loginAction
  sqlite.exec(`
    INSERT OR REPLACE INTO users (id, email, password_hash, name, created_at)
    VALUES ('usr-storage-test', 'storage_test@collabspace.test', '${modernHash}', 'Storage Test User', '${new Date().toISOString()}');
  `);
  sqlite.exec("CREATE TRIGGER test_abort_record BEFORE INSERT ON auth_rate_limits BEGIN SELECT RAISE(ABORT, 'Storage write failure'); END;");
  sqlite.exec("CREATE TRIGGER test_abort_record_up BEFORE UPDATE ON auth_rate_limits BEGIN SELECT RAISE(ABORT, 'Storage write failure'); END;");

  try {
    const loginRecordFailResult = await loginAction({
      email: "storage_test@collabspace.test",
      password: "WrongPassword123!",
    });
    assert(
      loginRecordFailResult.success === false &&
        loginRecordFailResult.error === "Invalid email or password.",
      "loginAction catches recordFailedLogin write failure and returns uniform error without crashing"
    );
  } finally {
    sqlite.exec("DROP TRIGGER IF EXISTS test_abort_record;");
    sqlite.exec("DROP TRIGGER IF EXISTS test_abort_record_up;");
    sqlite.exec("DELETE FROM users WHERE id = 'usr-storage-test';");
    clearAllRateLimits();
  }

  // ----------------------------------------------------
  // GROUP 3: Server-Side Session Lifecycle & Revocation
  // ----------------------------------------------------
  console.log("\n[Group 3: Server-Side Session Lifecycle & Revocation]");

  const testUserId = "usr-test-lifecycle-1";
  sqlite.exec(`
    INSERT OR REPLACE INTO users (id, email, password_hash, name, created_at)
    VALUES ('${testUserId}', 'test_session@collabspace.test', '${modernHash}', 'Test Session User', '${new Date().toISOString()}');
  `);

  // 3.1 Create sessions
  const s1 = await createSession(testUserId);
  assert(s1.startsWith("sess_"), "createSession returns token with sess_ prefix");
  assert(s1.length >= 40, "Session token has high cryptographic entropy (>256 bits)");

  // 3.2 Insert second session for same user
  const s2 = `sess_${crypto.randomBytes(32).toString("base64url")}`;
  sqlite.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(s2, testUserId, new Date(Date.now() + 86400000).toISOString(), new Date().toISOString());

  const activeCountBefore = (sqlite.prepare("SELECT COUNT(*) as count FROM sessions WHERE user_id = ?").get(testUserId) as { count: number }).count;
  assert(activeCountBefore === 2, "User has 2 active sessions in SQLite");

  // 3.3 Multi-session revocation keeping current session alive
  await revokeAllUserSessions(testUserId, s1);
  const s1Exists = sqlite.prepare("SELECT id FROM sessions WHERE id = ?").get(s1);
  const s2Exists = sqlite.prepare("SELECT id FROM sessions WHERE id = ?").get(s2);
  assert(Boolean(s1Exists), "revokeAllUserSessions preserved active current session (exceptSessionId)");
  assert(!s2Exists, "revokeAllUserSessions revoked other active session");

  // 3.4 Expired session cleanup
  const expiredSessionId = `sess_expired_${Date.now()}`;
  sqlite.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(expiredSessionId, testUserId, new Date(Date.now() - 100000).toISOString(), new Date().toISOString());

  const purgedCount = cleanupExpiredSessionsSync();
  assert(purgedCount >= 1, "cleanupExpiredSessionsSync successfully purged expired sessions");
  const expiredExists = sqlite.prepare("SELECT id FROM sessions WHERE id = ?").get(expiredSessionId);
  assert(!expiredExists, "Expired session no longer exists in database");

  // ----------------------------------------------------
  // GROUP 4: Production Server Actions Integration
  // ----------------------------------------------------
  console.log("\n[Group 4: Production Server Actions Integration]");

  // 4.1 signupAction generates modern $scrypt$ PHC hash
  const signupEmail = `newuser_${Date.now()}@test.org`;
  const signupRes = await signupAction({
    name: "New Security User",
    email: signupEmail,
    password: "PasswordToHash123!",
  });
  assert(signupRes.success === true, "signupAction succeeds");

  const createdUser = sqlite.prepare("SELECT password_hash FROM users WHERE email = ?").get(signupEmail) as { password_hash: string };
  assert(createdUser.password_hash.startsWith("$scrypt$N=65536"), "signupAction writes modern $scrypt$ PHC hash");

  // 4.2 Transparent Auto-Rehash on loginAction with legacy hash
  const legacyEmail = `legacy_${Date.now()}@test.org`;
  sqlite.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES ('usr-legacy-${Date.now()}', ?, ?, 'Legacy User', ?)
  `).run(legacyEmail, legacyHash, new Date().toISOString());

  // Login with legacy account
  const loginRes = await loginAction({
    email: legacyEmail,
    password: plainPass,
  });
  assert(loginRes.success === true, "loginAction succeeds for user with legacy hash");

  const rehashedUser = sqlite.prepare("SELECT password_hash FROM users WHERE email = ?").get(legacyEmail) as { password_hash: string };
  assert(
    rehashedUser.password_hash.startsWith("$scrypt$N=65536"),
    "loginAction transparently upgraded legacy hash to modern $scrypt$ PHC format"
  );
  assert(!needsRehash(rehashedUser.password_hash), "Rehashed password no longer needs rehash");

  // 4.3 changePasswordAction with dual-format verification & session revocation
  if (testAuthStorage) {
    await testAuthStorage.run({ userId: signupRes.userId! }, async () => {
      const changeRes = await changePasswordAction({
        currentPassword: "PasswordToHash123!",
        newPassword: "BrandNewSecurePassword789!",
      });
      assert(changeRes.success === true, "changePasswordAction succeeds");

      const updatedUser = sqlite.prepare("SELECT password_hash FROM users WHERE id = ?").get(signupRes.userId!) as { password_hash: string };
      assert(
        updatedUser.password_hash.startsWith("$scrypt$N=65536"),
        "changePasswordAction wrote modern $scrypt$ PHC format"
      );
    });
  }

  // ----------------------------------------------------
  // GROUP 5: Migration Script Integrity, Dry-Run & Safety
  // ----------------------------------------------------
  console.log("\n[Group 5: Migration Script Integrity, Dry-Run & Safety]");

  // Setup isolated temporary test database
  const tempDbPath = path.join(process.cwd(), `test-auth-sec-${Date.now()}.db`);
  const tempDb = new Database(tempDbPath);

  // Initialize schema WITHOUT auth_rate_limits or session indexes
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

  // 5.1 Dry-Run Immutability Guarantee
  const preStat = fs.statSync(tempDbPath);
  const dryResult = await migrateAuthSecurity({
    dbPath: tempDbPath,
    dryRun: true,
  });

  assert(dryResult.success === true, "Dry-run succeeded");
  assert(dryResult.dryRun === true, "Dry-run reported dryRun: true");
  assert(dryResult.alreadyApplied === false, "Dry-run reported alreadyApplied: false for unmigrated DB");
  assert(dryResult.usersScanned === 2, "Dry-run scanned 2 users");
  assert(dryResult.modernHashesCount === 1, "Dry-run found 1 modern hash");
  assert(dryResult.legacyHashesCount === 1, "Dry-run found 1 legacy hash");
  assert(dryResult.rateLimitsTableCreated === true, "Dry-run reports rateLimitsTableCreated = true");
  assert(dryResult.sessionsIndexesCreated === true, "Dry-run reports sessionsIndexesCreated = true");

  const postStat = fs.statSync(tempDbPath);
  assert(preStat.size === postStat.size, "Database size unmodified by dry-run");
  assert(preStat.mtimeMs === postStat.mtimeMs, "Database mtime unmodified by dry-run");

  // 5.2 Pre-commit failure injection and rollback test
  const forcedResult = await migrateAuthSecurity({
    dbPath: tempDbPath,
    forcePreCommitFailure: true,
    skipBackup: true,
  });
  assert(forcedResult.success === false, "Forced failure threw as expected");

  const verifDb = new Database(tempDbPath);
  assert(!checkAuthRateLimitsTable(verifDb), "auth_rate_limits was not committed after rollback");
  const idxCheck = verifySessionsIndexes(verifDb);
  assert(!idxCheck.ok, "sessions indexes were not committed after rollback");
  verifDb.close();

  // 5.3 Live migration execution
  const liveResult = await migrateAuthSecurity({
    dbPath: tempDbPath,
    skipBackup: true,
  });
  assert(liveResult.success === true, "Live migration succeeded");
  assert(liveResult.expiredSessionsPurged === 1, "Live migration purged 1 expired session");

  const postMigDb = new Database(tempDbPath);
  assert(checkAuthRateLimitsTable(postMigDb), "auth_rate_limits table exists post-migration");
  const postIdxCheck = verifySessionsIndexes(postMigDb);
  assert(postIdxCheck.ok === true, "sessions indexes exist post-migration");
  postMigDb.close();

  // 5.4 Post-migration dry run reports alreadyApplied = true
  const postDryResult = await migrateAuthSecurity({
    dbPath: tempDbPath,
    dryRun: true,
  });
  assert(postDryResult.alreadyApplied === true, "Post-migration dry run reports alreadyApplied = true");

  // Clean up temporary database
  try {
    fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  } catch {}

  console.log("\n==================================================");
  console.log(`AUTH SECURITY TESTS COMPLETE: ${passCount} passed, ${failCount} failed.`);
  console.log("==================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runAuthSecurityTests().catch((err) => {
  console.error("Auth security test suite failed:", err);
  process.exit(1);
});

