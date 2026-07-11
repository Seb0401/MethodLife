import { Inbox, Trash2 } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { captureTask, processTask, deleteTask } from "@/actions/tasks";
import { FormError, Select, SubmitButton, TextInput } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { actionErrorMessage } from "@/lib/forms";
import { es } from "@/lib/i18n/es";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const [tasks, projects, goals] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: ctx.workspace.id, inbox: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspace.id, status: "active" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.goal.findMany({
      where: { workspaceId: ctx.workspace.id, status: "active" },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const canProcess = projects.length > 0 || goals.length > 0;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title={es.inbox.title}
        subtitle={es.inbox.subtitle}
        icon={<Inbox className="size-5" />}
      />

      <FormError message={actionErrorMessage(error)} />

      <form action={captureTask} className="flex gap-2">
        <TextInput
          name="title"
          placeholder={es.inbox.placeholder}
          required
          maxLength={200}
          className="flex-1"
        />
        <SubmitButton>{es.inbox.capture}</SubmitButton>
      </form>

      {tasks.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{es.inbox.empty}</Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <Card key={task.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">{task.title}</span>
                <form action={deleteTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="redirectTo" value="/inbox" />
                  <button
                    type="submit"
                    aria-label={es.inbox.delete}
                    title={es.inbox.delete}
                    className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-elevated hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </form>
              </div>
              {canProcess ? (
                <form action={processTask} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={task.id} />
                  <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                    {es.inbox.toProject}
                    <Select name="projectId" defaultValue="">
                      <option value="">—</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                    {es.inbox.toGoal}
                    <Select name="goalId" defaultValue="">
                      <option value="">—</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <SubmitButton variant="subtle">{es.inbox.process}</SubmitButton>
                </form>
              ) : (
                <p className="text-xs text-muted">{es.inbox.noProjects}</p>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
