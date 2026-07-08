import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { setProjectRole } from "@/actions/scrum";
import { canManageMembers } from "@/domain/workspace/roles";
import { PROJECT_ROLES } from "@/domain/scrum/permissions";
import { es } from "@/lib/i18n/es";

// Per-project Scrum role assignment (RF12.2). Only shown to workspace managers of
// a team workspace — personal workspaces have no collaborators to assign.
export async function ProjectRolesPanel({ projectId }: { projectId: string }) {
  const ctx = await getWorkspaceContext();
  if (ctx.workspace.type !== "team" || !canManageMembers(ctx.role)) return null;

  const [members, roles] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectRole.findMany({ where: { projectId }, select: { userId: true, role: true } }),
  ]);
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: members.map((m) => m.userId) } },
    select: { userId: true, displayName: true },
  });
  const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));
  const roleByUser = new Map(roles.map((r) => [r.userId, r.role]));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">{es.scrum.projectRolesTitle}</h2>
        <p className="text-xs text-neutral-500">{es.scrum.projectRolesSubtitle}</p>
      </header>

      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-2 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {nameByUser.get(m.userId) ?? m.userId}
              {m.userId === ctx.user.id && " (tú)"}
            </span>
            <form action={setProjectRole} className="flex items-center gap-1">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="userId" value={m.userId} />
              <select
                name="role"
                defaultValue={roleByUser.get(m.userId) ?? "none"}
                className="rounded-md border border-neutral-200 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="none">{es.scrum.roleNone}</option>
                {PROJECT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {es.scrum.projectRoles[r]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                {es.scrum.saveRole}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
