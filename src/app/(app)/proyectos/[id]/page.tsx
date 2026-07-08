import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban/board";
import { MetricsPanel } from "@/components/kanban/metrics-panel";
import { addSimpleTask, toggleTaskDone, deleteTask } from "@/actions/tasks";
import { FormError, SubmitButton, TextInput, Select } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { computeFlowMetrics, type TransitionInput } from "@/domain/kanban/metrics";
import { es } from "@/lib/i18n/es";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      area: { select: { name: true } },
      goal: { select: { title: true } },
      boards: {
        take: 1,
        include: {
          columns: {
            orderBy: { position: "asc" },
            include: { tasks: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
  if (!project || project.workspaceId !== ctx.workspace.id) notFound();

  const board = project.boards[0];

  // Flow metrics (RF3.4/3.5) are derived from the immutable transition log, not
  // from stored counters. Only meaningful for Kanban boards.
  const metrics = project.method === "kanban" && board ? await loadFlowMetrics(project.id) : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link href="/proyectos" className="text-xs text-neutral-500 hover:underline">
          {es.projects.backToProjects}
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {es.projects.methods[project.method]}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          {project.area.name}
          {project.goal ? ` · ${project.goal.title}` : ""}
        </p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      {project.method === "kanban" ? (
        board ? (
          <KanbanBoard
            key={board.columns
              .map((c) => `${c.id}:${c.name}:${c.wipLimit}:${c.tasks.map((t) => t.id).join(",")}`)
              .join("|")}
            projectId={project.id}
            columns={board.columns.map((c) => ({
              id: c.id,
              name: c.name,
              wipLimit: c.wipLimit,
              tasks: c.tasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority })),
            }))}
          />
        ) : (
          <p className="text-sm text-neutral-500">{es.projects.noBoard}</p>
        )
      ) : (
        <SimpleTaskList projectId={project.id} />
      )}

      {metrics && <MetricsPanel metrics={metrics} />}
    </div>
  );
}

// Reads the transition log for a project and reduces it to flow metrics. Kept
// out of the component body so the per-request `Date.now()` is not evaluated
// during render (React purity rule).
async function loadFlowMetrics(projectId: string) {
  const transitions = await prisma.taskTransition.findMany({
    where: { task: { projectId } },
    select: { taskId: true, toStatus: true, at: true },
  });
  const byTask = new Map<string, TransitionInput[]>();
  for (const tr of transitions) {
    const list = byTask.get(tr.taskId) ?? [];
    list.push({ toStatus: tr.toStatus, at: tr.at.getTime() });
    byTask.set(tr.taskId, list);
  }
  return computeFlowMetrics(
    [...byTask.entries()].map(([taskId, transitions]) => ({ taskId, transitions })),
    { days: 14, now: Date.now() },
  );
}

async function SimpleTaskList({ projectId }: { projectId: string }) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  const back = `/proyectos/${projectId}`;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <form action={addSimpleTask} className="flex gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <TextInput
          name="title"
          placeholder={es.tasks.newCard}
          required
          maxLength={200}
          className="flex-1"
        />
        <Select name="priority" defaultValue="medium">
          <option value="low">{es.tasks.priorities.low}</option>
          <option value="medium">{es.tasks.priorities.medium}</option>
          <option value="high">{es.tasks.priorities.high}</option>
        </Select>
        <SubmitButton>{es.tasks.add}</SubmitButton>
      </form>

      {tasks.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.tasks.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2 py-2 text-sm">
              <form action={toggleTaskDone}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="redirectTo" value={back} />
                <input
                  type="hidden"
                  name="done"
                  value={task.status === "done" ? "false" : "true"}
                />
                <button
                  type="submit"
                  aria-label={task.title}
                  className="text-neutral-400 hover:text-green-600"
                >
                  {task.status === "done" ? "☑" : "☐"}
                </button>
              </form>
              <span className={task.status === "done" ? "text-neutral-400 line-through" : ""}>
                {task.title}
              </span>
              <form action={deleteTask} className="ml-auto">
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="redirectTo" value={back} />
                <button type="submit" className="text-xs text-neutral-300 hover:text-red-600">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
