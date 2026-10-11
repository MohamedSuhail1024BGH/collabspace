/**
 * Shared mocks for Next.js request-scoped APIs (`next/headers`, `next/cache`)
 * when running server actions outside a Next.js request context.
 *
 * Suites register these with `vi.mock` using async factories:
 *
 *   vi.mock("next/headers", async () => {
 *     const { cookiesMock, headersMock } = await import("./helpers/next-mocks");
 *     return { cookies: cookiesMock, headers: headersMock };
 *   });
 *
 * Each test file gets its own module registry, so these stores are fresh per
 * test file. Suites can mutate `cookieJar`/`headerJar` directly and reset them
 * with `resetRequestState()` between groups.
 */

export const cookieJar = new Map<string, string>();
export const headerJar = new Map<string, string>();

export const cookieStore = {
  get(name: string) {
    const value = cookieJar.get(name);
    return value === undefined ? undefined : { name, value };
  },
  getAll() {
    return [...cookieJar].map(([name, value]) => ({ name, value }));
  },
  has(name: string) {
    return cookieJar.has(name);
  },
  set(name: string | { name: string; value: string }, value?: string) {
    if (typeof name === "object") {
      cookieJar.set(name.name, name.value);
    } else {
      cookieJar.set(name, value ?? "");
    }
  },
  delete(name: string) {
    cookieJar.delete(name);
  },
  clear() {
    cookieJar.clear();
  },
};

export const headerStore = {
  get(name: string) {
    return headerJar.get(name.toLowerCase()) ?? null;
  },
  has(name: string) {
    return headerJar.has(name.toLowerCase());
  },
  set(name: string, value: string) {
    headerJar.set(name.toLowerCase(), value);
  },
  delete(name: string) {
    headerJar.delete(name.toLowerCase());
  },
  entries() {
    return headerJar.entries();
  },
  forEach(callback: (value: string, key: string) => void) {
    headerJar.forEach(callback);
  },
};

export async function cookiesMock() {
  return cookieStore;
}

export async function headersMock() {
  return headerStore;
}

export function revalidatePathMock() {
  // No-op: revalidation is a request-scope concern; unit tests assert DB state.
}

export function revalidateTagMock() {
  // No-op, see above.
}

export function resetRequestState() {
  cookieJar.clear();
  headerJar.clear();
}
