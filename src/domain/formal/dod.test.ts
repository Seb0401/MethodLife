import { describe, it, expect } from "vitest";
import {
  buildDod,
  canComplete,
  isComplete,
  isEmptyDod,
  parseDod,
  pendingCount,
  togglePostcondition,
} from "./dod";

describe("buildDod", () => {
  it("trims, drops blank lines and starts postconditions unconfirmed", () => {
    const dod = buildDod("  hay diseño \n\n", "tests pasan\ndocs actualizadas\n");
    expect(dod.preconditions).toEqual(["hay diseño"]);
    expect(dod.postconditions).toEqual([
      { text: "tests pasan", done: false },
      { text: "docs actualizadas", done: false },
    ]);
  });

  it("detects an empty definition", () => {
    expect(isEmptyDod(buildDod("", ""))).toBe(true);
    expect(isEmptyDod(buildDod("solo precondición", ""))).toBe(false);
  });
});

describe("canComplete (RF6.1 gate)", () => {
  it("allows completion when there is no DoD", () => {
    expect(canComplete(null)).toBe(true);
    expect(canComplete(undefined)).toBe(true);
    expect(canComplete({})).toBe(true);
  });

  it("blocks completion while any postcondition is unconfirmed", () => {
    const dod = buildDod("", "tests pasan\ndocs");
    expect(canComplete(dod)).toBe(false);
  });

  it("allows completion once all postconditions are confirmed", () => {
    let dod = buildDod("", "tests pasan\ndocs");
    dod = togglePostcondition(dod, 0);
    dod = togglePostcondition(dod, 1);
    expect(isComplete(dod)).toBe(true);
    expect(canComplete(dod)).toBe(true);
  });

  it("treats a DoD with only preconditions as completable", () => {
    expect(canComplete(buildDod("necesito acceso", ""))).toBe(true);
  });
});

describe("togglePostcondition", () => {
  it("flips one item and leaves the rest untouched, immutably", () => {
    const dod = buildDod("", "a\nb");
    const next = togglePostcondition(dod, 1);
    expect(next.postconditions[1].done).toBe(true);
    expect(next.postconditions[0].done).toBe(false);
    expect(dod.postconditions[1].done).toBe(false); // original unchanged
    expect(pendingCount(next)).toBe(1);
  });

  it("ignores out-of-range indexes", () => {
    const dod = buildDod("", "a");
    expect(togglePostcondition(dod, 5)).toBe(dod);
    expect(togglePostcondition(dod, -1)).toBe(dod);
  });
});

describe("parseDod", () => {
  it("round-trips a built definition and filters junk", () => {
    const dod = buildDod("pre", "post");
    expect(parseDod(dod)).toEqual(dod);
    expect(
      parseDod({ preconditions: [1, "ok"], postconditions: [{ text: "x", done: true }, 5] }),
    ).toEqual({ preconditions: ["ok"], postconditions: [{ text: "x", done: true }] });
  });

  it("returns null for absent or contentless definitions", () => {
    expect(parseDod(null)).toBeNull();
    expect(parseDod({ preconditions: [], postconditions: [] })).toBeNull();
  });
});
