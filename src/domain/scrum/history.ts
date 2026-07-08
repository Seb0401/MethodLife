// Sprint history stats (RF2.8) and retrospective parsing (RF2.7). Pure.

// Average velocity across closed sprints, rounded to one decimal; null if none.
export function averageVelocity(velocities: number[]): number | null {
  if (velocities.length === 0) return null;
  const sum = velocities.reduce((total, v) => total + v, 0);
  return Math.round((sum / velocities.length) * 10) / 10;
}

// Splits a textarea into a clean list of action items: one per line, trimmed,
// blank lines dropped.
export function parseActions(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
