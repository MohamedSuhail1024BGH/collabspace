import { describe, it, expect } from "vitest";
import { newId, EntityPrefix } from "@/lib/id";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TEST_PREFIXES: EntityPrefix[] = ["usr", "ws", "project", "task", "conv", "m", "ev", "pa"];

describe("lib/id — ID helper", () => {
  describe("Group 1: Prefix format & structure", () => {
    for (const prefix of TEST_PREFIXES) {
      it(`newId('${prefix}') has correct prefix, single separator, and v4 UUID suffix`, () => {
        const id = newId(prefix);
        expect(id.startsWith(`${prefix}_`)).toBe(true);

        const parts = id.split("_");
        expect(parts).toHaveLength(2);

        expect(UUID_V4_PATTERN.test(parts[1])).toBe(true);
      });
    }
  });

  describe("Group 2: Input validation", () => {
    it("newId('') throws a descriptive error on empty prefix", () => {
      expect(() => newId("")).toThrowError(/non-empty string/);
    });

    it("newId(null) throws a descriptive error on null prefix", () => {
      // @ts-expect-error testing invalid null prefix
      expect(() => newId(null)).toThrowError(/non-empty string/);
    });
  });

  describe("Group 3: Uniqueness", () => {
    it("generates 10,000 IDs with zero collisions", () => {
      const TOTAL_GENERATIONS = 10_000;
      const generatedIds = new Set<string>();

      for (let i = 0; i < TOTAL_GENERATIONS; i++) {
        generatedIds.add(newId(TEST_PREFIXES[i % TEST_PREFIXES.length]));
      }

      expect(generatedIds.size).toBe(TOTAL_GENERATIONS);
    });
  });
});
