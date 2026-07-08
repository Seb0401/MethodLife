import { describe, expect, it } from "vitest";
import { averageVelocity, parseActions } from "./history";

describe("averageVelocity", () => {
  it("averages and rounds to one decimal", () => {
    expect(averageVelocity([8, 5, 5])).toBe(6);
    expect(averageVelocity([8, 3])).toBe(5.5);
    expect(averageVelocity([2, 3, 3])).toBe(2.7); // 8/3 = 2.666…
  });

  it("returns null with no closed sprints", () => {
    expect(averageVelocity([])).toBeNull();
  });
});

describe("parseActions", () => {
  it("splits lines, trims and drops blanks", () => {
    expect(parseActions("  Automatizar deploy \n\n Añadir tests \n")).toEqual([
      "Automatizar deploy",
      "Añadir tests",
    ]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseActions("   \n  \n")).toEqual([]);
  });
});
