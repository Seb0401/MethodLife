// Pure rules for the Scrum backlog (RF2.1). The backlog is a project's tasks
// that are not yet assigned to a sprint, kept in a manual priority order and
// estimated in story points.

// Fibonacci-like story-point scale, the conventional Scrum estimation set.
export const POINT_SCALE = [1, 2, 3, 5, 8, 13, 21] as const;
export type StoryPoints = (typeof POINT_SCALE)[number];

export const BACKLOG_INVALID_ESTIMATE = "BACKLOG_INVALID_ESTIMATE";

export function isValidEstimate(value: number): value is StoryPoints {
  return (POINT_SCALE as readonly number[]).includes(value);
}

// Sum of story points across items; unestimated items count as zero.
export function sumPoints(items: { estimate: number | null }[]): number {
  return items.reduce((sum, item) => sum + (item.estimate ?? 0), 0);
}

// A new backlog item goes after the last one (manual priority ordering).
export function nextBacklogPosition(positions: number[]): number {
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}

// Move the item with `id` one step up or down in an ordered id list. Returns a
// new array; a no-op (already at the edge, or id missing) returns the input.
export function moveInOrder(ids: string[], id: string, direction: "up" | "down"): string[] {
  const index = ids.indexOf(id);
  if (index === -1) return ids;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
