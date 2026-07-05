import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace/active-workspace";
import { AppError } from "@/lib/errors";
import { es } from "@/lib/i18n/es";

// Auth + membership gate for every server action and page (ARQUITECTURA.md).
// Resolution order: explicit workspaceId (throws if not a member) → the
// active-workspace cookie (stale values fall back) → the personal workspace.
// Cached per request so layouts and actions can call it freely.
export const getWorkspaceContext = cache(async (workspaceId?: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("UNAUTHORIZED", es.errors.unauthorized);

  const findMembership = (id: string) =>
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
      include: { workspace: true },
    });

  let membership = null;
  if (workspaceId) {
    membership = await findMembership(workspaceId);
  } else {
    const activeId = await getActiveWorkspaceId();
    if (activeId) membership = await findMembership(activeId);
    membership ??= await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspace: { type: "personal", ownerId: user.id } },
      include: { workspace: true },
    });
  }
  if (!membership) throw new AppError("NOT_WORKSPACE_MEMBER", es.errors.notWorkspaceMember);

  return { user, workspace: membership.workspace, role: membership.role };
});

export type WorkspaceContext = Awaited<ReturnType<typeof getWorkspaceContext>>;
