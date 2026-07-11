// Baseline/analysis phase timing (RF5.3): before correcting a habit, the user
// spends N days only logging occurrences to establish a baseline. Pure date math.

// Whole UTC calendar days from `from` to `to` (negative if `to` precedes `from`).
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((b - a) / 86_400_000);
}

// The baseline phase is complete once at least `analysisDays` have elapsed since
// it began.
export function analysisComplete(startedAt: Date, analysisDays: number, today: Date): boolean {
  return daysBetween(startedAt, today) >= analysisDays;
}

// Days still remaining in the baseline phase (0 once complete) — for the UI.
export function analysisDaysLeft(startedAt: Date, analysisDays: number, today: Date): number {
  return Math.max(0, analysisDays - daysBetween(startedAt, today));
}

const MS_PER_DAY = 86_400_000;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Length of the current run of consecutive calendar days that have a successful
// check-in, ending today (or yesterday, so a not-yet-checked today keeps the
// streak alive). Used by the dashboard streak indicator.
export function currentStreak(doneDates: Date[], today: Date): number {
  const days = new Set(doneDates.map(startOfUtcDay));
  let cursor = startOfUtcDay(today);
  if (!days.has(cursor)) {
    cursor -= MS_PER_DAY;
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= MS_PER_DAY;
  }
  return streak;
}
