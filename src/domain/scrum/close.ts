// Pure rules for closing a sprint (RF2.5): velocity is the story points that
// were actually completed, and tasks split into completed (kept for history)
// and incomplete (returned to the backlog).
import type { TaskStatus } from "../kanban/status";
import { sumPoints } from "./backlog";

export function isCompleted(task: { status: TaskStatus }): boolean {
  return task.status === "done";
}

// Velocity = sum of story points of the sprint's completed tasks.
export function computeVelocity(tasks: { status: TaskStatus; estimate: number | null }[]): number {
  return sumPoints(tasks.filter(isCompleted));
}

// Partition sprint tasks into the ones done and the ones still pending.
export function splitByCompletion<T extends { status: TaskStatus }>(
  tasks: T[],
): { completed: T[]; incomplete: T[] } {
  const completed: T[] = [];
  const incomplete: T[] = [];
  for (const task of tasks) {
    if (isCompleted(task)) completed.push(task);
    else incomplete.push(task);
  }
  return { completed, incomplete };
}
