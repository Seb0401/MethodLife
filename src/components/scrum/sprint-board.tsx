import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban/board";
import { BurndownChart } from "@/components/scrum/burndown-chart";
import { computeBurndown, type BurndownTask } from "@/domain/scrum/burndown";
import { parseDod } from "@/domain/formal/dod";
import { es } from "@/lib/i18n/es";

// Compact signature of a task's definition of done so the board remounts when a
// postcondition is confirmed on the sprint board too.
function dodSignature(raw: unknown): string {
  const dod = parseDod(raw);
  if (!dod) return "";
  return dod.postconditions.map((p) => (p.done ? "1" : "0")).join("");
}

function formatDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

// Builds the burndown series for a sprint from its tasks and their completion
// events (RF2.6). A task's `doneAt` is the latest transition into "done", used
// only while the task is currently done.
async function loadBurndown(sprintId: string, startsAt: Date, endsAt: Date) {
  const [tasks, doneEvents] = await Promise.all([
    prisma.task.findMany({
      where: { sprintId },
      select: { id: true, estimate: true, status: true },
    }),
    prisma.taskTransition.findMany({
      where: { task: { sprintId }, toStatus: "done" },
      select: { taskId: true, at: true },
    }),
  ]);

  const lastDoneAt = new Map<string, number>();
  for (const e of doneEvents) {
    const at = e.at.getTime();
    if (at > (lastDoneAt.get(e.taskId) ?? 0)) lastDoneAt.set(e.taskId, at);
  }

  const burndownTasks: BurndownTask[] = tasks.map((t) => ({
    estimate: t.estimate,
    doneAt: t.status === "done" ? (lastDoneAt.get(t.id) ?? null) : null,
  }));

  return {
    series: computeBurndown({ startsAt, endsAt, tasks: burndownTasks }),
    taskCount: tasks.length,
  };
}

// Sprint board for a Scrum project (RF2.4): the project board scoped to the
// active sprint's tasks, reusing the Kanban component in its "sprint" variant,
// plus the sprint burndown (RF2.6).
export async function SprintBoard({ projectId }: { projectId: string }) {
  const active = await prisma.sprint.findFirst({
    where: { projectId, status: "active" },
    select: { id: true, name: true, startsAt: true, endsAt: true },
  });

  if (!active) {
    return (
      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">{es.scrum.boardTitle}</h2>
        <p className="mt-1 text-sm text-neutral-500">{es.scrum.noActiveSprint}</p>
      </section>
    );
  }

  const [board, burndown] = await Promise.all([
    prisma.board.findFirst({
      where: { projectId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tasks: { where: { sprintId: active.id }, orderBy: { position: "asc" } },
          },
        },
      },
    }),
    loadBurndown(active.id, active.startsAt, active.endsAt),
  ]);

  const columns = board?.columns ?? [];
  const hasCards = columns.some((c) => c.tasks.length > 0);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{es.scrum.boardTitle}</h2>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
          {active.name}
        </span>
        <span className="text-xs text-neutral-500">
          {formatDate(active.startsAt)}–{formatDate(active.endsAt)}
        </span>
      </header>

      {!hasCards ? (
        <p className="text-sm text-neutral-500">{es.scrum.boardEmpty}</p>
      ) : (
        <KanbanBoard
          variant="sprint"
          key={columns
            .map(
              (c) =>
                `${c.id}:${c.wipLimit}:${c.tasks
                  .map(
                    (t) =>
                      `${t.id}:${t.priority}:${t.status}:${t.dueDate?.toISOString() ?? ""}:${dodSignature(t.definitionOfDone)}`,
                  )
                  .join(",")}`,
            )
            .join("|")}
          projectId={projectId}
          columns={columns.map((c) => ({
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
      )}

      {burndown.taskCount > 0 && (
        <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <h3 className="text-sm font-semibold">{es.scrum.burndownTitle}</h3>
          <BurndownChart series={burndown.series} />
        </div>
      )}
    </section>
  );
}
