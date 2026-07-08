import { describe, expect, it } from "vitest";
import { computeBurndown } from "./burndown";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

describe("computeBurndown", () => {
  it("burns points down as tasks complete, against a hand-calculated case", () => {
    // Sprint 2026-07-01..07-03 (3 days). Total = 10.
    // A(5) done 07-02, B(3) done 07-03, C(2) never done.
    const series = computeBurndown({
      startsAt: new Date("2026-07-01T00:00:00Z"),
      endsAt: new Date("2026-07-03T00:00:00Z"),
      tasks: [
        { estimate: 5, doneAt: day("2026-07-02") + 3_600_000 },
        { estimate: 3, doneAt: day("2026-07-03") + 3_600_000 },
        { estimate: 2, doneAt: null },
      ],
    });

    expect(series.map((p) => p.remaining)).toEqual([10, 5, 2]);
    expect(series.map((p) => p.ideal)).toEqual([10, 5, 0]);
    expect(series.map((p) => p.day)).toEqual([
      day("2026-07-01"),
      day("2026-07-02"),
      day("2026-07-03"),
    ]);
  });

  it("counts a task done late in the day within that day", () => {
    const series = computeBurndown({
      startsAt: new Date("2026-07-01T00:00:00Z"),
      endsAt: new Date("2026-07-02T00:00:00Z"),
      tasks: [{ estimate: 4, doneAt: day("2026-07-01") + 23 * 3_600_000 }],
    });
    expect(series.map((p) => p.remaining)).toEqual([0, 0]);
  });

  it("handles a single-day sprint", () => {
    const series = computeBurndown({
      startsAt: new Date("2026-07-01T00:00:00Z"),
      endsAt: new Date("2026-07-01T00:00:00Z"),
      tasks: [{ estimate: 3, doneAt: null }],
    });
    expect(series).toEqual([{ day: day("2026-07-01"), remaining: 3, ideal: 0 }]);
  });

  it("treats unestimated tasks as zero points", () => {
    const series = computeBurndown({
      startsAt: new Date("2026-07-01T00:00:00Z"),
      endsAt: new Date("2026-07-02T00:00:00Z"),
      tasks: [{ estimate: null, doneAt: day("2026-07-01") }],
    });
    expect(series.map((p) => p.remaining)).toEqual([0, 0]);
  });
});
