import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
  drizzleDb: DrizzleInstance | undefined;
};

/**
 * Test-only database override. When set, every `db` access resolves to the
 * provided drizzle instance (e.g. an in-process PGlite database) instead of
 * the Supabase connection. Call `setDatabaseForTesting(undefined)` to restore
 * the default. Production code never touches this.
 */
let testDbOverride: DrizzleInstance | undefined;

export function setDatabaseForTesting(customDb?: unknown) {
  testDbOverride = customDb as DrizzleInstance | undefined;
}

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is missing. Please configure it in .env.local"
    );
  }
  return url;
}

export function getClient(): postgres.Sql {
  if (globalForDb.postgresClient) {
    return globalForDb.postgresClient;
  }

  const client = postgres(getConnectionString(), {
    prepare: false, // Critical for Supabase transaction pooler (port 6543)
    ssl: "require",
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  globalForDb.postgresClient = client;
  return client;
}

export function getDrizzleInstance(): DrizzleInstance {
  if (testDbOverride) {
    return testDbOverride;
  }

  if (globalForDb.drizzleDb) {
    return globalForDb.drizzleDb;
  }

  const client = getClient();
  const instance = drizzle(client, { schema });

  globalForDb.drizzleDb = instance;
  return instance;
}

export const db = new Proxy({} as DrizzleInstance, {
  get(_target, prop) {
    const instance = getDrizzleInstance();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});
