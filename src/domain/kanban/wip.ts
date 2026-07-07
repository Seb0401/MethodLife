// WIP limit rule (RF3.2 / design rule 4). Limits are enforced, not suggested:
// a move into a full column is rejected by the server with WIP_LIMIT_REACHED.
export const WIP_LIMIT_REACHED = "WIP_LIMIT_REACHED";

// `countExcludingTask` is the number of cards already in the destination column
// NOT counting the card being moved (so a reorder within the same column never
// trips the limit).
export function wipReached(
  wipLimit: number | null | undefined,
  countExcludingTask: number,
): boolean {
  return wipLimit != null && countExcludingTask >= wipLimit;
}
