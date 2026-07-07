import { describe, expect, it } from "vitest";
import { nextPosition } from "./area";

describe("nextPosition", () => {
  it("starts at 0 when there are no areas", () => {
    expect(nextPosition([])).toBe(0);
  });

  it("appends after the highest position, not the count", () => {
    expect(nextPosition([0, 1, 2])).toBe(3);
    expect(nextPosition([5, 2, 9])).toBe(10);
  });
});
