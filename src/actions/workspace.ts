"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace/active-workspace";
import { backWithError } from "@/lib/forms";
import { canManageMembers, isInvitableRole, WORKSPACE_ROLES } from "@/domain/workspace/roles";
import { emailMatches, isPending, normalizeEmail } from "@/domain/workspace/invitation";
import { es } from "@/lib/i18n/es";

const nameSchema = z.string().trim().min(1).max(80);

function setActiveCookie(store: Awaited<ReturnType<typeof cookies>>, workspaceId: string) {
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, { path: "/", sameSite: "lax" });
}

export async function setActiveWorkspace(formData: FormData) {
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  await getWorkspaceContext(workspaceId); // throws if the user is not a member

  const store = await cookies();
  setActiveCookie(store, workspaceId);
  redirect("/hoy");
}

// Create a team workspace (RF12.1). The creator becomes its owner; default life
// areas are seeded so it is usable immediately, and it becomes the active one.
export async function createTeamWorkspace(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError("/workspace", "WORKSPACE_NAME_REQUIRED");

  const workspace = await prisma.workspace.create({
    data: {
      name: name.data,
      type: "team",
      ownerId: ctx.user.id,
      members: { create: { userId: ctx.user.id, role: "owner" } },
      areas: {
        create: es.areas.defaults.map((a, i) => ({
          name: a.name,
          color: a.color,
          icon: a.icon,
          position: i,
        })),
      },
    },
  });

  const store = await cookies();
  setActiveCookie(store, workspace.id);
  redirect("/workspace");
}

// Invite someone to the current team workspace by email (RF12.1/12.2). Only
// owners and admins may invite; the granted role can be admin or member.
export async function inviteToWorkspace(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (ctx.workspace.type !== "team") backWithError("/workspace", "NOT_TEAM_WORKSPACE");
  if (!canManageMembers(ctx.role)) backWithError("/workspace", "FORBIDDEN");

  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) backWithError("/workspace", "INVALID_EMAIL");

  const roleParsed = z.enum(WORKSPACE_ROLES).safeParse(formData.get("role"));
  const role = roleParsed.success && isInvitableRole(roleParsed.data) ? roleParsed.data : "member";

  await prisma.workspaceInvitation.create({
    data: {
      workspaceId: ctx.workspace.id,
      email: normalizeEmail(email.data),
      role,
      token: crypto.randomUUID(),
      invitedById: ctx.user.id,
    },
  });

  revalidatePath("/workspace");
  redirect("/workspace");
}

export async function revokeInvitation(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!canManageMembers(ctx.role)) backWithError("/workspace", "FORBIDDEN");

  const id = z.uuid().parse(formData.get("id"));
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!invitation || invitation.workspaceId !== ctx.workspace.id) {
    backWithError("/workspace", "NOT_FOUND");
  }

  await prisma.workspaceInvitation.update({ where: { id }, data: { status: "revoked" } });
  revalidatePath("/workspace");
  redirect("/workspace");
}

// Accept an invitation via its token (RF12.1). The signed-in user's email must
// match the invited address. Idempotent if they are already a member.
export async function acceptInvitation(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const token = z.string().min(1).parse(formData.get("token"));
  const back = `/invitaciones/${token}`;

  const invitation = await prisma.workspaceInvitation.findUnique({ where: { token } });
  if (!invitation) backWithError(back, "NOT_FOUND");
  if (!isPending(invitation.status)) backWithError(back, "INVITATION_NOT_PENDING");
  if (!emailMatches(invitation.email, ctx.user.email)) {
    backWithError(back, "INVITATION_EMAIL_MISMATCH");
  }

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: invitation.workspaceId, userId: ctx.user.id },
      },
      create: { workspaceId: invitation.workspaceId, userId: ctx.user.id, role: invitation.role },
      update: {}, // already a member: keep their current role
    }),
    prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedById: ctx.user.id },
    }),
  ]);

  const store = await cookies();
  setActiveCookie(store, invitation.workspaceId);
  redirect("/workspace");
}
