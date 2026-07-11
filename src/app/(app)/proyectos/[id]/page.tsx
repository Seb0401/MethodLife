import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban/board";
import { MetricsPanel } from "@/components/kanban/metrics-panel";
import { ScrumBacklog } from "@/components/scrum/backlog";
import { SprintsPanel } from "@/components/scrum/sprints-panel";
import { SprintBoard } from "@/components/scrum/sprint-board";
import { ProjectRolesPanel } from "@/components/scrum/project-roles-panel";
import { FddMode } from "@/components/fdd/fdd-mode";
import { MethodHistory } from "@/components/selector/method-history";
import { ActivityFeed } from "@/components/projects/activity-feed";
import { addSimpleTask, toggleTaskDone, deleteTask, setTaskDueDate } from "@/actions/tasks";
import { ArrowLeft } from "lucide-react";
import { FormError, SubmitButton, TextInput, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { actionErrorMessage } from "@/lib/forms";
import { loadFlowMetrics } from "@/lib/kanban/flow";
import { parseDod } from "@/domain/formal/dod";
import { es } from "@/lib/i18n/es";

// Compact signature of a task's definition of done so the board remounts when a
// postcondition is confirmed (its optimistic state re-seeds from the server).
function dodSignature(raw: unknown): string {
  const dod = parseDod(raw);
  if (!dod) return "";
  return dod.postconditions.map((p) => (p.done ? "1" : "0")).join("");
}

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
      <header className="flex flex-col gap-1.5">
        <Link
          href="/proyectos"
          className="flex w-fit items-center gap-1 text-xs text-muted transition-colors hover:text-accent-hover"
        >
          <ArrowLeft className="size-3" />
          {es.projects.backToProjects}
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
          <Badge variant="accent">{es.projects.methods[project.method]}</Badge>
        </div>
        <p className="text-xs text-muted">
          {project.area.name}
          {project.goal ? ` · ${project.goal.title}` : ""}
        </p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      {project.method === "kanban" ? (
        board ? (
          <KanbanBoard
            key={board.columns
              .map(
                (c) =>
                  `${c.id}:${c.name}:${c.wipLimit}:${c.tasks
                    .map(
                      (t) =>
                        `${t.id}:${t.priority}:${t.dueDate?.toISOString() ?? ""}:${dodSignature(t.definitionOfDone)}`,
                    )
                    .join(",")}`,
              )
              .join("|")}
            projectId={project.id}
            columns={board.columns.map((c) => ({
              id: c.id,
              name: c.name,
              wipLimit: c.wipLimit,
              tasks: c.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
                dod: parseDod(t.definitionOfDone),
              })),
            }))}
          />
        ) : (
          <p className="text-sm text-muted">{es.projects.noBoard}</p>
        )
      ) : project.method === "scrum" ? (
        <>
          <ProjectRolesPanel projectId={project.id} />
          <SprintsPanel projectId={project.id} />
          <SprintBoard projectId={project.id} />
          <ScrumBacklog projectId={project.id} />
        </>
      ) : project.method === "fdd" ? (
        project.goalId ? (
          <FddMode projectId={project.id} goalId={project.goalId} workspaceId={ctx.workspace.id} />
        ) : (
          <p className="text-sm text-muted">{es.fdd.needsGoal}</p>
        )
      ) : (
        <SimpleTaskList projectId={project.id} />
      )}

      {metrics && <MetricsPanel metrics={metrics} projectId={project.id} />}

      <MethodHistory projectId={project.id} currentMethod={project.method} />

      {(project.method === "kanban" || project.method === "scrum") && (
        <ActivityFeed projectId={project.id} />
      )}
    </div>
  );
}

function toDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
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
        <Card className="p-8 text-center text-sm text-muted">{es.tasks.empty}</Card>
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                <form action={toggleTaskDone} className="flex">
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
                    className={
                      task.status === "done"
                        ? "flex size-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white"
                        : "flex size-5 items-center justify-center rounded-full border border-border-strong text-transparent transition-colors hover:border-emerald-500"
                    }
                  >
                    ✓
                  </button>
                </form>
                <span
                  className={task.status === "done" ? "text-faint line-through" : "text-foreground"}
                >
                  {task.title}
                </span>
                <form action={setTaskDueDate} className="ml-auto flex items-center gap-1">
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="redirectTo" value={back} />
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={toDateInput(task.dueDate)}
                    className="rounded-md border border-border bg-surface px-1 py-0.5 text-xs text-muted"
                  />
                  <button
                    type="submit"
                    className="text-xs text-faint transition-colors hover:text-foreground"
                    aria-label={es.tasks.setDue}
                  >
                    ✓
                  </button>
                </form>
                <form action={deleteTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="redirectTo" value={back} />
                  <button
                    type="submit"
                    className="text-xs text-faint transition-colors hover:text-red-400"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
