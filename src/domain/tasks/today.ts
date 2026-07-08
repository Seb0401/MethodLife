// "Today" logic for the daily view (RF1.7). Due dates are stored as calendar
// dates (@db.Date → UTC midnight), so all comparisons are by UTC day number to
// stay pure and deterministic; there is no time-of-day component to reason about.
const DAY_MS = 24 * 60 * 60 * 1000;

// The integer number of whole UTC days since the epoch for a date's calendar day.
export function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS,
  );
}

export function isDueToday(dueDate: Date, now: Date): boolean {
  return utcDayNumber(dueDate) === utcDayNumber(now);
}

// Due strictly before today (an overdue commitment).
export function isOverdue(dueDate: Date, now: Date): boolean {
  return utcDayNumber(dueDate) < utcDayNumber(now);
}

// A task belongs to the "Today" view when it has a due date on or before today
// and is not yet done: today's commitments plus anything overdue still pending.
export function isCommittedForToday(
  task: { dueDate: Date | null; status: "todo" | "in_progress" | "done" },
  now: Date,
): boolean {
  if (task.dueDate == null || task.status === "done") return false;
  return utcDayNumber(task.dueDate) <= utcDayNumber(now);
}
