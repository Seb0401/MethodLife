import { describe, expect, it } from "vitest";
import { wipReached } from "./wip";
import { statusForColumn } from "./status";

describe("wipReached", () => {
  it("never trips when the column has no limit", () => {
    expect(wipReached(null, 99)).toBe(false);
    expect(wipReached(undefined, 99)).toBe(false);
  });

  it("trips only once the column is at or over its limit", () => {
    expect(wipReached(3, 2)).toBe(false); // room for one more
    expect(wipReached(3, 3)).toBe(true); // full
    expect(wipReached(3, 4)).toBe(true); // over
  });
});

describe("statusForColumn", () => {
  it("maps first to todo, last to done, middle to in_progress", () => {
    expect(statusForColumn(0, 3)).toBe("todo");
    expect(statusForColumn(1, 3)).toBe("in_progress");
    expect(statusForColumn(2, 3)).toBe("done");
  });

  it("treats a single-column board as todo", () => {
    expect(statusForColumn(0, 1)).toBe("todo");
  });
});
