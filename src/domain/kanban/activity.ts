// Project activity is a read-only view derived from the transition event log
// (RF12.5) — no separate activity table. This classifies one transition into the
// kind of action it represents, so the UI can label "who did what".
import type { TaskStatus } from "./status";

export type ActivityKind = "created" | "completed" | "moved";

export function classifyTransition(input: {
  fromColumnId: string | null;
  toStatus: TaskStatus;
}): ActivityKind {
  // A transition with no origin column is the card entering the board.
  if (input.fromColumnId === null) return "created";
  // Reaching the done status is a completion; anything else is a plain move.
  if (input.toStatus === "done") return "completed";
  return "moved";
}
