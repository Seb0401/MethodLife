// Scrum permission rules (RF12.2/12.3). Pure predicates so server actions and UI
// agree on who can do what. Workspace managers (owner/admin) can do everything;
// otherwise the per-project role decides. In a personal workspace the single
// member is the owner, so they always pass — solo use is never blocked.
import type { WorkspaceRole } from "../workspace/roles";

export type ProjectRole = "po" | "sm" | "dev";
export const PROJECT_ROLES = ["po", "sm", "dev"] as const;

function isWorkspaceManager(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

// The Product Owner (or a workspace manager) owns the backlog: add, estimate,
// reorder and plan items into sprints (RF12.3 "solo PO reordena el backlog").
export function canManageBacklog(wsRole: WorkspaceRole, projectRole: ProjectRole | null): boolean {
  return isWorkspaceManager(wsRole) || projectRole === "po";
}

// The Scrum Master (or a workspace manager) runs the sprint lifecycle: create,
// start, close and retrospective (RF12.3 "solo SM cierra sprints").
export function canManageSprints(wsRole: WorkspaceRole, projectRole: ProjectRole | null): boolean {
  return isWorkspaceManager(wsRole) || projectRole === "sm";
}
