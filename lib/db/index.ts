import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
  drizzleDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

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

export function getDrizzleInstance() {
  if (globalForDb.drizzleDb) {
    return globalForDb.drizzleDb;
  }

  const client = getClient();
  const instance = drizzle(client, { schema });

  globalForDb.drizzleDb = instance;
  return instance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDrizzleInstance();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

export const sql = new Proxy((() => {}) as unknown as postgres.Sql, {
  get(_target, prop) {
    const instance = getClient();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
  apply(_target, _thisArg, args) {
    const instance = getClient();
    return Reflect.apply(instance as unknown as (...args: unknown[]) => unknown, _thisArg, args);
  },
});

export const sqlite: any = sql;

export function setDatabaseForTesting(_customSqlite?: unknown) {
  // Compatibility stub for unit test suites
}

