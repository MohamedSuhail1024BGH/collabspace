import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

vi.mock("next/headers", async () => {
  const { cookiesMock, headersMock } = await import("./helpers/next-mocks");
  return { cookies: cookiesMock, headers: headersMock };
});
vi.mock("next/cache", async () => {
  const { revalidatePathMock, revalidateTagMock } = await import("./helpers/next-mocks");
  return { revalidatePath: revalidatePathMock, revalidateTag: revalidateTagMock };
});

import {
  createTestDatabase,
  destroyTestDatabase,
  toPostgresPlaceholders,
  type UnitTestDatabase,
} from "./helpers/test-db";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

let testDb: UnitTestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await destroyTestDatabase(testDb);
});

describe("PGlite unit test harness", () => {
  it("converts ? placeholders to $n outside string literals", () => {
    expect(toPostgresPlaceholders("SELECT * FROM t WHERE a = ? AND b = '?' AND c = ?")).toBe(
      "SELECT * FROM t WHERE a = $1 AND b = '?' AND c = $2"
    );
  });

  it("applies the canonical migration DDL", async () => {
    const rows = await testDb
      .prepare(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
      )
      .all();
    expect(rows).toHaveLength(1);
  });

  it("routes application db access through the injected seam", async () => {
    await testDb
      .prepare(
        "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run("u_smoke", "smoke@test.com", "Smoke User", "hash", new Date().toISOString());

    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("smoke@test.com");
  });

  it("count results are JS numbers", async () => {
    const row = await testDb.prepare("SELECT COUNT(*) AS cnt FROM users").get();
    expect(typeof row?.cnt).toBe("number");
    expect(row?.cnt).toBe(1);
  });
});
