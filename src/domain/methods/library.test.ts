import { describe, it, expect } from "vitest";
import { METHOD_CRITERIA, METHOD_LIBRARY, compareMethods, findMethod } from "./library";

describe("method library (RF9.3)", () => {
  it("covers the course methods, including non-executable ones", () => {
    const keys = METHOD_LIBRARY.map((m) => m.key);
    expect(keys).toEqual(
      expect.arrayContaining(["ssa_sd", "jsp", "jsd", "scrum", "xp", "kanban", "fdd", "prototype"]),
    );
    // Some are executable modes, some are reference-only.
    expect(findMethod("scrum")?.executable).toBe(true);
    expect(findMethod("jsp")?.executable).toBe(false);
  });

  it("gives every method a value for every comparison criterion", () => {
    for (const m of METHOD_LIBRARY) {
      for (const c of METHOD_CRITERIA) {
        expect(m.criteria[c]?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("compareMethods (RF9.4)", () => {
  it("builds one row per criterion with both methods' values", () => {
    const rows = compareMethods(findMethod("scrum")!, findMethod("kanban")!);
    expect(rows).toHaveLength(METHOD_CRITERIA.length);
    const horizon = rows.find((r) => r.criterion === "horizon")!;
    expect(horizon.a).toContain("sprint");
    expect(horizon.b).toContain("Continuo");
  });
});
