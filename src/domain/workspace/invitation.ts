// Pure rules for workspace invitations (RF12.1).
export type InvitationStatus = "pending" | "accepted" | "revoked";

export const INVITATION_NOT_PENDING = "INVITATION_NOT_PENDING";
export const INVITATION_EMAIL_MISMATCH = "INVITATION_EMAIL_MISMATCH";

export function isPending(status: InvitationStatus): boolean {
  return status === "pending";
}

// Normalize an email for storage/comparison.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// The accepting user's email must match the invited address (case-insensitive).
export function emailMatches(inviteEmail: string, userEmail: string | undefined): boolean {
  return userEmail != null && normalizeEmail(inviteEmail) === normalizeEmail(userEmail);
}
