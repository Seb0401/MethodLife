// Pure rules for the sprint lifecycle (RF2.2/2.3). A sprint moves through
// planned → active → closed; tasks can only be planned into a sprint that is
// not yet closed. Closing itself (velocity, summary) belongs to RF2.5.
export const SPRINT_STATUSES = ["planned", "active", "closed"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const SPRINT_CLOSED = "SPRINT_CLOSED";
export const SPRINT_INVALID_RANGE = "SPRINT_INVALID_RANGE";

// Tasks may be assigned to / removed from a sprint until it is closed (RF2.2).
export function canAssignToSprint(status: SprintStatus): boolean {
  return status !== "closed";
}

// Allowed status transitions: start a planned sprint, close an active one.
const TRANSITIONS: Record<SprintStatus, readonly SprintStatus[]> = {
  planned: ["active"],
  active: ["closed"],
  closed: [],
};

export function canTransitionSprint(from: SprintStatus, to: SprintStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// The end date must not be before the start date.
export function isValidSprintRange(startsAt: Date, endsAt: Date): boolean {
  return endsAt.getTime() >= startsAt.getTime();
}
