import { prisma } from "@/lib/prisma";
import { classifyTransition } from "@/domain/kanban/activity";
import { es } from "@/lib/i18n/es";

function formatDateTime(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

// Project activity feed (RF12.5): a read-only view over the task_transitions
// event log — who did what and when — for a Kanban/Scrum project's board.
export async function ActivityFeed({ projectId }: { projectId: string }) {
  const transitions = await prisma.taskTransition.findMany({
    where: { task: { projectId } },
    orderBy: { at: "desc" },
    take: 30,
    select: {
      id: true,
      at: true,
      actorId: true,
      fromColumnId: true,
      toColumnId: true,
      toStatus: true,
      task: { select: { title: true } },
    },
  });

  if (transitions.length === 0) {
    return (
      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">{es.activity.title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{es.activity.empty}</p>
      </section>
    );
  }

  // Resolve actor names and column names (columns may have been deleted; the
  // event keeps its column id without an FK, so a missing name is expected).
  const [profiles, columns] = await Promise.all([
    prisma.profile.findMany({
      where: { userId: { in: [...new Set(transitions.map((t) => t.actorId))] } },
      select: { userId: true, displayName: true },
    }),
    prisma.boardColumn.findMany({
      where: { board: { projectId } },
      select: { id: true, name: true },
    }),
  ]);
  const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));
  const nameByColumn = new Map(columns.map((c) => [c.id, c.name]));

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-lg font-semibold">{es.activity.title}</h2>
      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {transitions.map((t) => {
          const actor = nameByUser.get(t.actorId) ?? es.activity.someone;
          const kind = classifyTransition({ fromColumnId: t.fromColumnId, toStatus: t.toStatus });
          const column =
            (t.toColumnId ? nameByColumn.get(t.toColumnId) : null) ?? es.activity.unknownColumn;

          const verb =
            kind === "created"
              ? es.activity.created
              : kind === "completed"
                ? es.activity.completed
                : `${es.activity.movedTo} ${column}`;

          return (
            <li key={t.id} className="flex items-baseline gap-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{actor}</span> {verb}{" "}
                <span className="text-neutral-600 dark:text-neutral-400">«{t.task.title}»</span>
              </span>
              <span className="shrink-0 text-xs text-neutral-400">{formatDateTime(t.at)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
