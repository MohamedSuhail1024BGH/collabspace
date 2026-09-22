import { newId, EntityPrefix } from "../../lib/id";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passCount++;
    console.log(`  PASS: ${message}`);
  } else {
    failCount++;
    console.error(`  FAIL: ${message}`);
  }
}

function runIdTests() {
  console.log("\n==================================================");
  console.log("RUNNING ID HELPER UNIT TESTS (lib/id.ts)");
  console.log("==================================================\n");

  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  console.log("[Group 1: Prefix Format & Structure]");
  const testPrefixes: EntityPrefix[] = [
    "usr",
    "ws",
    "project",
    "task",
    "conv",
    "m",
    "ev",
    "pa",
  ];

  for (const prefix of testPrefixes) {
    const id = newId(prefix);
    assert(
      id.startsWith(`${prefix}_`),
      `newId('${prefix}') starts with '${prefix}_' prefix (got: ${id})`
    );

    const parts = id.split("_");
    assert(
      parts.length === 2,
      `newId('${prefix}') contains exactly one underscore separator`
    );

    const uuidPart = parts[1];
    assert(
      UUID_V4_PATTERN.test(uuidPart),
      `newId('${prefix}') suffix '${uuidPart}' is a valid RFC 4122 v4 UUID`
    );
  }

  console.log("\n[Group 2: Input Validation]");
  try {
    newId("");
    assert(false, "newId('') throws error on empty string prefix");
  } catch (err) {
    assert(
      err instanceof Error && err.message.includes("non-empty string"),
      "newId('') throws descriptive error on empty prefix"
    );
  }

  try {
    // @ts-expect-error testing invalid null prefix
    newId(null);
    assert(false, "newId(null) throws error on null prefix");
  } catch (err) {
    assert(
      err instanceof Error && err.message.includes("non-empty string"),
      "newId(null) throws error on null prefix"
    );
  }

  console.log("\n[Group 3: Uniqueness across 10,000 generations]");
  const TOTAL_GENERATIONS = 10_000;
  const generatedIds = new Set<string>();
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_GENERATIONS; i++) {
    const prefix = testPrefixes[i % testPrefixes.length];
    const id = newId(prefix);
    generatedIds.add(id);
  }

  const durationMs = Date.now() - startTime;
  assert(
    generatedIds.size === TOTAL_GENERATIONS,
    `Zero collisions across ${TOTAL_GENERATIONS.toLocaleString()} consecutive IDs (set size: ${generatedIds.size})`
  );
  console.log(`  INFO: Generated ${TOTAL_GENERATIONS.toLocaleString()} IDs in ${durationMs}ms (${(durationMs / TOTAL_GENERATIONS).toFixed(3)}ms/id)`);

  console.log("\n==================================================");
  console.log(`ID HELPER TESTS COMPLETE: ${passCount} passed, ${failCount} failed.`);
  console.log("==================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runIdTests();
