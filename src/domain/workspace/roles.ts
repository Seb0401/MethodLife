// Workspace role capabilities (RF12.2). Pure predicates; server actions and the
// UI both consult these so "who can do what" lives in one place. Fine-grained
// enforcement in server actions is wired in 2.9.
export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

// Owners and admins manage membership: invite, revoke, remove members.
export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

// Only the owner can change other members' roles.
export function canManageRoles(role: WorkspaceRole): boolean {
  return role === "owner";
}

// Roles that can be granted through an invitation (never a second owner).
export const INVITABLE_ROLES: readonly WorkspaceRole[] = ["admin", "member"] as const;

export function isInvitableRole(role: WorkspaceRole): boolean {
  return INVITABLE_ROLES.includes(role);
}
