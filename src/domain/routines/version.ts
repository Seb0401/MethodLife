// Routine version numbering (RF8.2). Pure.

export function nextVersionNumber(numbers: number[]): number {
  return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
}

// A version is open (accepting evaluations) until it is closed with a decision.
export function isVersionOpen(closedAt: Date | null): boolean {
  return closedAt === null;
}
