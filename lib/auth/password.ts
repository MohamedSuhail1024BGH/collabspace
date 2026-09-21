import crypto from "crypto";

const scryptAsync = (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });

/**
 * Standard OWASP-recommended scrypt parameters for interactive password hashing.
 * N = 65536 (2^16), r = 8 (1024 bytes per block), p = 1.
 * Memory limit: 128 MB. Salt: 16 bytes (128 bits). Key: 32 bytes (256 bits).
 */
export const SCRYPT_PARAMS = {
  N: 65536,
  r: 8,
  p: 1,
  keylen: 32,
  maxmem: 128 * 1024 * 1024,
  saltLength: 16,
} as const;

/**
 * Legacy scrypt parameters used in original CollabSpace implementation.
 * N = 16384 (2^14), r = 8, p = 1, keylen = 64 bytes.
 */
export const LEGACY_SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
  maxmem: 32 * 1024 * 1024,
} as const;

const PHC_REGEX = /^\$scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

/**
 * Pre-computed valid dummy hash for constant-time dummy verification when user is not found.
 */
export const DUMMY_PHC_HASH =
  "$scrypt$N=65536,r=8,p=1$ilDdSN_f4SF79rIqFOpixA$BG4EKJgB0E4inR-a9ytiKpBOe1YdhmzBmYczeL4bWpk";

/**
 * Hashes a password asynchronously using Node's crypto.scrypt offloaded to libuv threadpool.
 * Produces standard PHC format: $scrypt$N=65536,r=8,p=1$<base64url-salt>$<base64url-key>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SCRYPT_PARAMS.saltLength);
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_PARAMS.keylen, {
    cost: SCRYPT_PARAMS.N,
    blockSize: SCRYPT_PARAMS.r,
    parallelization: SCRYPT_PARAMS.p,
    maxmem: SCRYPT_PARAMS.maxmem,
  })) as Buffer;

  const saltB64 = salt.toString("base64url");
  const keyB64 = derivedKey.toString("base64url");
  return `$scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${saltB64}$${keyB64}`;
}

/**
 * Synchronous version of hashPassword for CLI scripts and explicit database reset/seed.
 */
export function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(SCRYPT_PARAMS.saltLength);
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, {
    cost: SCRYPT_PARAMS.N,
    blockSize: SCRYPT_PARAMS.r,
    parallelization: SCRYPT_PARAMS.p,
    maxmem: SCRYPT_PARAMS.maxmem,
  });

  const saltB64 = salt.toString("base64url");
  const keyB64 = derivedKey.toString("base64url");
  return `$scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${saltB64}$${keyB64}`;
}

/**
 * Verifies a password asynchronously against either modern PHC $scrypt$ or legacy salt:derivedKey format.
 * Employs crypto.timingSafeEqual to guard against timing attacks.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!password || !storedHash) return false;

  try {
    // 1. Modern standard PHC format: $scrypt$N=...,r=...,p=...$salt$key
    const match = storedHash.match(PHC_REGEX);
    if (match) {
      const N = parseInt(match[1], 10);
      const r = parseInt(match[2], 10);
      const p = parseInt(match[3], 10);
      const salt = Buffer.from(match[4], "base64url");
      const expectedKey = Buffer.from(match[5], "base64url");

      if (salt.length < 16 || expectedKey.length < 32) {
        return false;
      }

      const derivedKey = (await scryptAsync(password, salt, expectedKey.length, {
        cost: N,
        blockSize: r,
        parallelization: p,
        maxmem: SCRYPT_PARAMS.maxmem,
      })) as Buffer;

      return crypto.timingSafeEqual(expectedKey, derivedKey);
    }

    // 2. Legacy format: salt_hex:key_hex
    if (storedHash.includes(":")) {
      const parts = storedHash.split(":");
      if (parts.length !== 2) return false;
      const [saltHex, keyHex] = parts;
      if (saltHex.length !== 32 || keyHex.length !== 128) return false;

      const expectedKey = Buffer.from(keyHex, "hex");
      const derivedKey = (await scryptAsync(
        password,
        saltHex,
        LEGACY_SCRYPT_PARAMS.keylen,
        {
          cost: LEGACY_SCRYPT_PARAMS.N,
          blockSize: LEGACY_SCRYPT_PARAMS.r,
          parallelization: LEGACY_SCRYPT_PARAMS.p,
          maxmem: LEGACY_SCRYPT_PARAMS.maxmem,
        }
      )) as Buffer;

      return crypto.timingSafeEqual(expectedKey, derivedKey);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Synchronous dual-format verifyPassword for testing and script validations.
 */
export function verifyPasswordSync(
  password: string,
  storedHash: string
): Promise<boolean> | boolean {
  if (!password || !storedHash) return false;

  try {
    const match = storedHash.match(PHC_REGEX);
    if (match) {
      const N = parseInt(match[1], 10);
      const r = parseInt(match[2], 10);
      const p = parseInt(match[3], 10);
      const salt = Buffer.from(match[4], "base64url");
      const expectedKey = Buffer.from(match[5], "base64url");

      if (salt.length < 16 || expectedKey.length < 32) {
        return false;
      }

      const derivedKey = crypto.scryptSync(password, salt, expectedKey.length, {
        cost: N,
        blockSize: r,
        parallelization: p,
        maxmem: SCRYPT_PARAMS.maxmem,
      });

      return crypto.timingSafeEqual(expectedKey, derivedKey);
    }

    if (storedHash.includes(":")) {
      const parts = storedHash.split(":");
      if (parts.length !== 2) return false;
      const [saltHex, keyHex] = parts;
      if (saltHex.length !== 32 || keyHex.length !== 128) return false;

      const expectedKey = Buffer.from(keyHex, "hex");
      const derivedKey = crypto.scryptSync(
        password,
        saltHex,
        LEGACY_SCRYPT_PARAMS.keylen,
        {
          cost: LEGACY_SCRYPT_PARAMS.N,
          blockSize: LEGACY_SCRYPT_PARAMS.r,
          parallelization: LEGACY_SCRYPT_PARAMS.p,
          maxmem: LEGACY_SCRYPT_PARAMS.maxmem,
        }
      );

      return crypto.timingSafeEqual(expectedKey, derivedKey);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detects whether an existing password hash needs to be upgraded to standard $scrypt$ PHC format.
 * Returns true if the hash is legacy salt:key or uses sub-standard cost factor N < 65536.
 */
export function needsRehash(storedHash: string): boolean {
  if (!storedHash) return true;
  const match = storedHash.match(PHC_REGEX);
  if (!match) return true;

  const N = parseInt(match[1], 10);
  const r = parseInt(match[2], 10);
  const p = parseInt(match[3], 10);

  return N < SCRYPT_PARAMS.N || r !== SCRYPT_PARAMS.r || p !== SCRYPT_PARAMS.p;
}

/**
 * Executes a dummy scrypt computation to maintain constant-time verification when a user is not found.
 */
export async function dummyVerify(password: string): Promise<void> {
  try {
    await verifyPassword(password, DUMMY_PHC_HASH);
  } catch {}
}

