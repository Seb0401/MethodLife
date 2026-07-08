import { describe, expect, it } from "vitest";
import { isCommittedForToday, isDueToday, isOverdue, utcDayNumber } from "./today";

const NOW = new Date("2026-07-08T15:00:00Z");

describe("utcDayNumber", () => {
  it("ignores the time of day", () => {
    expect(utcDayNumber(new Date("2026-07-08T00:00:00Z"))).toBe(
      utcDayNumber(new Date("2026-07-08T23:59:00Z")),
    );
  });
});

describe("isDueToday / isOverdue", () => {
  it("recognizes the same calendar day as today", () => {
    expect(isDueToday(new Date("2026-07-08T00:00:00Z"), NOW)).toBe(true);
    expect(isOverdue(new Date("2026-07-08T00:00:00Z"), NOW)).toBe(false);
  });

  it("recognizes a past day as overdue, not today", () => {
    const past = new Date("2026-07-07T00:00:00Z");
    expect(isDueToday(past, NOW)).toBe(false);
    expect(isOverdue(past, NOW)).toBe(true);
  });

  it("treats a future day as neither today nor overdue", () => {
    const future = new Date("2026-07-09T00:00:00Z");
    expect(isDueToday(future, NOW)).toBe(false);
    expect(isOverdue(future, NOW)).toBe(false);
  });
});

describe("isCommittedForToday", () => {
  it("includes today's and overdue pending tasks", () => {
    expect(
      isCommittedForToday({ dueDate: new Date("2026-07-08T00:00:00Z"), status: "todo" }, NOW),
    ).toBe(true);
    expect(
      isCommittedForToday(
        { dueDate: new Date("2026-07-01T00:00:00Z"), status: "in_progress" },
        NOW,
      ),
    ).toBe(true);
  });

  it("excludes done tasks, future tasks, and tasks with no due date", () => {
    expect(
      isCommittedForToday({ dueDate: new Date("2026-07-08T00:00:00Z"), status: "done" }, NOW),
    ).toBe(false);
    expect(
      isCommittedForToday({ dueDate: new Date("2026-07-09T00:00:00Z"), status: "todo" }, NOW),
    ).toBe(false);
    expect(isCommittedForToday({ dueDate: null, status: "todo" }, NOW)).toBe(false);
  });
});
