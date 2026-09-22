import crypto from "crypto";

export type EntityPrefix =
  | "usr"
  | "ws"
  | "project"
  | "task"
  | "conv"
  | "m"
  | "ev"
  | "pa";

/**
 * Generates a cryptographically random, collision-resistant identifier
 * with the standard format: `${prefix}_${crypto.randomUUID()}`.
 *
 * @param prefix Entity prefix (e.g. 'usr', 'ws', 'project', 'task', 'conv', 'm', 'ev', 'pa')
 * @returns Cryptographically random ID string
 */
export function newId(prefix: string): string {
  if (!prefix || typeof prefix !== "string") {
    throw new Error("Prefix must be a non-empty string.");
  }
  return `${prefix}_${crypto.randomUUID()}`;
}

