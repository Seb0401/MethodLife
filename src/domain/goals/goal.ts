// Pure rules for goals (M1 / RF1.3).
export const GOAL_STATUSES = ["active", "done", "abandoned"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_TITLE_MAX = 120;

// Any status can be reached from any other except a no-op: a goal can be
// completed, abandoned, and reopened. The server is the authority for the
// transition (design rule 1); this function is the single source of truth.
export function canTransitionGoal(from: GoalStatus, to: GoalStatus): boolean {
  return from !== to;
}
