// Weekly completion series for the FDD progress chart (RF4.4): the cumulative
// percentage of features completed over the trailing weeks. Derived from the
// feature status event log (the date each feature first reached "done"), never
// from a stored counter.

export type WeeklyPoint = { weekEnd: string; percent: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Builds `weeks` cumulative points ending today. Each point is the share of all
// features that had reached "done" by that week's end.
export function weeklyCompletion(
  firstDoneDates: Date[],
  totalFeatures: number,
  today: Date,
  weeks = 8,
): WeeklyPoint[] {
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const doneTimes = firstDoneDates.map((d) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );

  const points: WeeklyPoint[] = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const cutoff = todayUtc - k * 7 * DAY_MS;
    const completed = doneTimes.filter((t) => t <= cutoff).length;
    const percent = totalFeatures === 0 ? 0 : Math.round((completed / totalFeatures) * 100);
    points.push({ weekEnd: dayKey(new Date(cutoff)), percent });
  }
  return points;
}
