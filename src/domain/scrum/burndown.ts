// Burndown series for a sprint (RF2.6): story points remaining per day, derived
// from completion events (never from a stored counter). Pure and unit-tested.
const DAY_MS = 24 * 60 * 60 * 1000;

// A task in the sprint scope. `doneAt` is the epoch-ms moment it was completed,
// or null while it is still pending (so it never burns down).
export type BurndownTask = { estimate: number | null; doneAt: number | null };

export type BurndownPoint = { day: number; remaining: number; ideal: number };

function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

export function computeBurndown(input: {
  startsAt: Date;
  endsAt: Date;
  tasks: BurndownTask[];
}): BurndownPoint[] {
  const { startsAt, endsAt, tasks } = input;
  const total = tasks.reduce((sum, t) => sum + (t.estimate ?? 0), 0);

  const startDay = startOfUtcDay(startsAt.getTime());
  const endDay = startOfUtcDay(endsAt.getTime());
  const spanDays = Math.max(0, Math.round((endDay - startDay) / DAY_MS));
  const count = spanDays + 1; // inclusive of both start and end days

  const points: BurndownPoint[] = [];
  for (let i = 0; i < count; i++) {
    const day = startDay + i * DAY_MS;
    const endOfDay = day + DAY_MS - 1;
    const completed = tasks.reduce(
      (sum, t) => sum + (t.doneAt != null && t.doneAt <= endOfDay ? (t.estimate ?? 0) : 0),
      0,
    );
    // Ideal line: straight from `total` on the first day to 0 on the last.
    const ideal = count === 1 ? 0 : Math.round(total * (1 - i / (count - 1)) * 10) / 10;
    points.push({ day, remaining: total - completed, ideal });
  }
  return points;
}
