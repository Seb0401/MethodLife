import { describe, expect, it } from "vitest";
import {
  isValidEstimate,
  moveInOrder,
  nextBacklogPosition,
  sumPoints,
  POINT_SCALE,
} from "./backlog";

describe("isValidEstimate", () => {
  it("accepts values on the scale and rejects others", () => {
    for (const p of POINT_SCALE) expect(isValidEstimate(p)).toBe(true);
    expect(isValidEstimate(4)).toBe(false);
    expect(isValidEstimate(0)).toBe(false);
    expect(isValidEstimate(100)).toBe(false);
  });
});

describe("sumPoints", () => {
  it("sums estimates, treating null as zero", () => {
    expect(sumPoints([{ estimate: 3 }, { estimate: 5 }, { estimate: null }])).toBe(8);
    expect(sumPoints([])).toBe(0);
  });
});

describe("nextBacklogPosition", () => {
  it("returns 0 for an empty backlog and max+1 otherwise", () => {
    expect(nextBacklogPosition([])).toBe(0);
    expect(nextBacklogPosition([0, 1, 2])).toBe(3);
    expect(nextBacklogPosition([5])).toBe(6);
  });
});

describe("moveInOrder", () => {
  const ids = ["a", "b", "c"];

  it("moves an item up and down", () => {
    expect(moveInOrder(ids, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveInOrder(ids, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("is a no-op at the edges", () => {
    expect(moveInOrder(ids, "a", "up")).toEqual(ids);
    expect(moveInOrder(ids, "c", "down")).toEqual(ids);
  });

  it("is a no-op for a missing id", () => {
    expect(moveInOrder(ids, "z", "up")).toEqual(ids);
  });
});
