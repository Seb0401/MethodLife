import { headers } from "next/headers";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createTeamWorkspace, inviteToWorkspace, revokeInvitation } from "@/actions/workspace";
import { FormError, Select, SubmitButton, TextInput } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { canManageMembers, INVITABLE_ROLES } from "@/domain/workspace/roles";
import { es } from "@/lib/i18n/es";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();
  const isTeam = ctx.workspace.type === "team";
  const canManage = canManageMembers(ctx.role);

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: "asc" },
  });
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: members.map((m) => m.userId) } },
    select: { userId: true, displayName: true },
  });
  const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));

  const invitations =
    isTeam && canManage
      ? await prisma.workspaceInvitation.findMany({
          where: { workspaceId: ctx.workspace.id, status: "pending" },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{ctx.workspace.name}</h1>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {es.workspace.types[ctx.workspace.type]}
        </span>
      </header>

      <FormError message={actionErrorMessage(error)} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {es.workspace.membersTitle}
        </h2>
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-2 text-sm">
              <span>
                {nameByUser.get(m.userId) ?? m.userId}
                {m.userId === ctx.user.id && " (tú)"}
              </span>
              <span className="text-xs text-neutral-500">{es.workspace.roles[m.role]}</span>
            </li>
          ))}
        </ul>
      </section>

      {isTeam ? (
        canManage ? (
          <>
            <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="text-sm font-semibold">{es.workspace.inviteTitle}</h2>
              <form action={inviteToWorkspace} className="flex flex-wrap items-end gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
                  {es.workspace.inviteEmail}
                  <TextInput name="email" type="email" required placeholder="persona@correo.com" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-500">
                  {es.workspace.inviteRole}
                  <Select name="role" defaultValue="member">
                    {INVITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {es.workspace.roles[r]}
                      </option>
                    ))}
                  </Select>
                </label>
                <SubmitButton>{es.workspace.invite}</SubmitButton>
              </form>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {es.workspace.pendingTitle}
              </h2>
              {invitations.length === 0 ? (
                <p className="text-sm text-neutral-500">{es.workspace.noPending}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {invitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-col gap-1 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {inv.email}
                          <span className="ml-2 text-xs text-neutral-500">
                            {es.workspace.roles[inv.role]}
                          </span>
                        </span>
                        <form action={revokeInvitation}>
                          <input type="hidden" name="id" value={inv.id} />
                          <button
                            type="submit"
                            className="text-xs text-neutral-400 hover:text-red-600"
                          >
                            {es.workspace.revoke}
                          </button>
                        </form>
                      </div>
                      <code className="truncate rounded bg-neutral-50 px-2 py-1 text-xs text-neutral-500 dark:bg-neutral-900">
                        {origin}/invitaciones/{inv.token}
                      </code>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <p className="text-sm text-neutral-500">{es.workspace.onlyManagersInvite}</p>
        )
      ) : (
        <p className="text-sm text-neutral-500">{es.workspace.personalHint}</p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">{es.workspace.createTeamTitle}</h2>
          <p className="text-xs text-neutral-500">{es.workspace.createTeamSubtitle}</p>
        </div>
        <form action={createTeamWorkspace} className="flex flex-wrap items-end gap-2">
          <TextInput
            name="name"
            required
            maxLength={80}
            placeholder={es.workspace.teamNamePlaceholder}
            className="flex-1"
          />
          <SubmitButton>{es.workspace.createTeam}</SubmitButton>
        </form>
      </section>
    </div>
  );
}
