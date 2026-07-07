// Traceability rule (RF7.1 / design rule 5): a task that lives outside the
// inbox must trace to something — a project (which belongs to an area) or a
// goal. Orphan tasks may only exist in the inbox.
export function isTraceable(task: { projectId: string | null; goalId: string | null }): boolean {
  return task.projectId != null || task.goalId != null;
}

export function canLeaveInbox(task: { projectId: string | null; goalId: string | null }): boolean {
  return isTraceable(task);
}
