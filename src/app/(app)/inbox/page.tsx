import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { captureTask, processTask, deleteTask } from "@/actions/tasks";
import { FormError, Select, SubmitButton, TextInput } from "@/components/ui/form";
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.inbox.title}</h1>
        <p className="text-sm text-neutral-500">{es.inbox.subtitle}</p>
      </header>

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
        <p className="text-sm text-neutral-500">{es.inbox.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <span className="font-medium">{task.title}</span>
              {canProcess ? (
                <form action={processTask} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={task.id} />
                  <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
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
                  <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
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
                <p className="text-xs text-neutral-500">{es.inbox.noProjects}</p>
              )}
              <form action={deleteTask}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="redirectTo" value="/inbox" />
                <button
                  type="submit"
                  className="self-start text-xs text-neutral-400 hover:text-red-600"
                >
                  {es.inbox.delete}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
