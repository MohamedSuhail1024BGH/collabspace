import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import { setDatabaseForTesting } from "@/lib/db";

/**
 * Unit-test database harness.
 *
 * Each test file gets its own in-process PGlite (real Postgres compiled to
 * WASM): no external services, no shared cloud state, real Postgres semantics
 * identical to production. The canonical migration DDL bootstraps the schema,
 * and `createTestDatabase()` injects a drizzle instance into the application's
 * `db` seam via `setDatabaseForTesting`, so server actions run against exactly
 * the database the assertions read from.
 *
 * The returned UnitTestDatabase keeps the familiar better-sqlite3 call shape
 * (`prepare(sql).run/get/all`) so suites stay close to their original form;
 * all calls are async (PGlite is async) and `?` placeholders are converted to
 * Postgres `$1..$n`.
 */

/**
 * Load every migration listed in the drizzle journal, in order, so the test
 * schema always matches what `drizzle-kit generate` considers canonical.
 */
function loadMigrationsSql(): string {
  const migrationsDir = path.resolve(process.cwd(), "lib/db/migrations");
  const journal = JSON.parse(
    readFileSync(path.join(migrationsDir, "meta", "_journal.json"), "utf8")
  ) as { entries: { idx: number; tag: string }[] };

  return [...journal.entries]
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => readFileSync(path.join(migrationsDir, `${entry.tag}.sql`), "utf8"))
    .join("\n");
}

const MIGRATIONS_SQL = loadMigrationsSql();

type Row = Record<string, unknown>;

/**
 * Convert SQLite-style `?` placeholders to PostgreSQL `$1..$n`,
 * skipping `?` inside single- or double-quoted literals.
 */
export function toPostgresPlaceholders(sql: string): string {
  let out = "";
  let paramIndex = 0;
  let i = 0;
  let quote: string | null = null;

  while (i < sql.length) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[i + 1];
          i += 2;
          continue;
        }
        quote = null;
      }
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === "?") {
      paramIndex++;
      out += `$${paramIndex}`;
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

export interface PreparedStatement {
  run(...params: unknown[]): Promise<void>;
  get(...params: unknown[]): Promise<Row | undefined>;
  all(...params: unknown[]): Promise<Row[]>;
}

export class UnitTestDatabase {
  constructor(readonly client: PGlite) {}

  prepare(sql: string): PreparedStatement {
    const pgSql = toPostgresPlaceholders(sql);
    return {
      run: async (...params) => {
        await this.client.query(pgSql, params);
      },
      get: async (...params) => {
        const result = await this.client.query(pgSql, params);
        return result.rows[0] as Row | undefined;
      },
      all: async (...params) => {
        const result = await this.client.query(pgSql, params);
        return result.rows as Row[];
      },
    };
  }

  /** Execute one or more SQL statements (Postgres dialect). */
  async exec(sql: string): Promise<void> {
    await this.client.exec(sql);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

/**
 * postgres-js returns arrays from `client.query`, while PGlite returns
 * `{ rows, fields, ... }` objects. The application's `db.execute(...)` call
 * sites rely on postgres-js array semantics (`result[0]`, `.map`, `.rowCount`),
 * so the harness adapts PGlite results to an array that also exposes `.rows`
 * (self-referential), `.fields`, `.affectedRows`, and `.rowCount`. This keeps
 * application code on its production contract.
 */
function adaptResult(result: unknown): unknown {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      const adapted = Object.assign([...rows], result) as unknown[] & Record<string, unknown>;
      adapted.rows = adapted;
      return adapted;
    }
  }
  return result;
}

/**
 * Wrap a PGlite client (or transaction-scoped inner client) so `query`/`exec`
 * results are adapted and `transaction()` callbacks receive a wrapped inner
 * client (drizzle's PgliteSession re-wraps the inner client in a new session).
 */
function wrapPgClient<T extends object>(rawClient: T): T {
  return new Proxy(rawClient, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") return value;

      if (prop === "query" || prop === "exec") {
        return async (...args: unknown[]) =>
          adaptResult(await (value as (...a: unknown[]) => unknown).apply(target, args));
      }

      if (prop === "transaction") {
        return async (...args: unknown[]) => {
          const [fn, ...rest] = args;
          return (value as (...a: unknown[]) => unknown).call(
            target,
            (innerClient: object) =>
              (fn as (c: unknown) => unknown)(wrapPgClient(innerClient)),
            ...rest
          );
        };
      }

      return (value as (...a: unknown[]) => unknown).bind(target);
    },
  });
}

/**
 * Create a fresh in-process Postgres database, apply the canonical schema,
 * and install it as the application's active `db` (seam injection).
 */
export async function createTestDatabase(): Promise<UnitTestDatabase> {
  const client = new PGlite();
  await client.exec(MIGRATIONS_SQL);
  const db = new UnitTestDatabase(client);
  const drizzleDb = drizzle(wrapPgClient(client), { schema });
  setDatabaseForTesting(drizzleDb);
  return db;
}

/** Restore the default database seam and close the test database. */
export async function destroyTestDatabase(db: UnitTestDatabase): Promise<void> {
  setDatabaseForTesting(undefined);
  await db.close();
}
