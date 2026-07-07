// Pure rules for life areas (M1 / RF1.2).
export const AREA_NAME_MAX = 60;

// Areas are ordered by an integer position; a new area goes after the last one.
export function nextPosition(positions: number[]): number {
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}
