import { headers } from "next/headers";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createTeamWorkspace, inviteToWorkspace, revokeInvitation } from "@/actions/workspace";
import { FormError, Select, SubmitButton, TextInput } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{ctx.workspace.name}</h1>
        <Badge variant="accent">{es.workspace.types[ctx.workspace.type]}</Badge>
      </header>

      <FormError message={actionErrorMessage(error)} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
          {es.workspace.membersTitle}
        </h2>
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-foreground">
                  {nameByUser.get(m.userId) ?? m.userId}
                  {m.userId === ctx.user.id && " (tú)"}
                </span>
                <span className="text-xs text-muted">{es.workspace.roles[m.role]}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {isTeam ? (
        canManage ? (
          <>
            <Card className="flex flex-col gap-3 p-4">
              <h2 className="text-sm font-semibold text-foreground">{es.workspace.inviteTitle}</h2>
              <form action={inviteToWorkspace} className="flex flex-wrap items-end gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                  {es.workspace.inviteEmail}
                  <TextInput name="email" type="email" required placeholder="persona@correo.com" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
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
            </Card>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
                {es.workspace.pendingTitle}
              </h2>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted">{es.workspace.noPending}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {invitations.map((inv) => (
                    <Card key={inv.id} className="flex flex-col gap-1 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-foreground">
                          {inv.email}
                          <span className="ml-2 text-xs text-muted">
                            {es.workspace.roles[inv.role]}
                          </span>
                        </span>
                        <form action={revokeInvitation}>
                          <input type="hidden" name="id" value={inv.id} />
                          <button
                            type="submit"
                            className="text-xs text-faint transition-colors hover:text-red-400"
                          >
                            {es.workspace.revoke}
                          </button>
                        </form>
                      </div>
                      <code className="truncate rounded bg-background px-2 py-1 text-xs text-muted">
                        {origin}/invitaciones/{inv.token}
                      </code>
                    </Card>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <p className="text-sm text-muted">{es.workspace.onlyManagersInvite}</p>
        )
      ) : (
        <p className="text-sm text-muted">{es.workspace.personalHint}</p>
      )}

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-foreground">{es.workspace.createTeamTitle}</h2>
          <p className="text-xs text-muted">{es.workspace.createTeamSubtitle}</p>
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
      </Card>
    </div>
  );
}
