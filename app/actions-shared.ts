import { revalidatePath } from "next/cache";

export function isUniqueConstraintError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { code?: string; message?: string };
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE" || e.code === "SQLITE_CONSTRAINT" || e.code === "23505") return true;
    if (e.message && (e.message.includes("UNIQUE constraint failed") || e.message.includes("duplicate key value"))) return true;
  }
  return false;
}

export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle when invoked outside an active Next.js request context (e.g. testing scripts)
  }
}

