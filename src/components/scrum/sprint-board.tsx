import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban/board";
import { es } from "@/lib/i18n/es";

function formatDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

// Sprint board for a Scrum project (RF2.4): the project board scoped to the
// active sprint's tasks, reusing the Kanban component in its "sprint" variant.
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

  const board = await prisma.board.findFirst({
    where: { projectId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: { where: { sprintId: active.id }, orderBy: { position: "asc" } },
        },
      },
    },
  });

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
                  .map((t) => `${t.id}:${t.priority}:${t.dueDate?.toISOString() ?? ""}`)
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
            })),
          }))}
        />
      )}
    </section>
  );
}
