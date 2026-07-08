import { prisma } from "@/lib/prisma";
import {
  addBacklogItem,
  setBacklogEstimate,
  moveBacklogItem,
  assignToSprint,
} from "@/actions/scrum";
import { deleteTask } from "@/actions/tasks";
import { POINT_SCALE, sumPoints } from "@/domain/scrum/backlog";
import { es } from "@/lib/i18n/es";

const priorityStyles = {
  low: "text-neutral-400",
  medium: "text-amber-500",
  high: "text-red-500",
} as const;

const inputClass =
  "rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

// Backlog view for a Scrum project (RF2.1): priority-ordered, point-estimated
// items with no sprint assigned yet.
export async function ScrumBacklog({ projectId }: { projectId: string }) {
  const [items, openSprints] = await Promise.all([
    prisma.task.findMany({
      where: { projectId, sprintId: null },
      orderBy: { position: "asc" },
      select: { id: true, title: true, priority: true, estimate: true },
    }),
    // Sprints still open for planning (not closed).
    prisma.sprint.findMany({
      where: { projectId, status: { not: "closed" } },
      orderBy: { startsAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const back = `/proyectos/${projectId}`;
  const total = sumPoints(items);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">{es.scrum.backlogTitle}</h2>
          <p className="text-xs text-neutral-500">{es.scrum.backlogSubtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {es.scrum.totalPoints}: {total}
        </span>
      </header>

      <form action={addBacklogItem} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input
          name="title"
          placeholder={es.tasks.newCard}
          required
          maxLength={200}
          className={`${inputClass} flex-1`}
        />
        <select name="priority" defaultValue="medium" className={inputClass}>
          <option value="low">{es.tasks.priorities.low}</option>
          <option value="medium">{es.tasks.priorities.medium}</option>
          <option value="high">{es.tasks.priorities.high}</option>
        </select>
        <select
          name="estimate"
          defaultValue=""
          className={inputClass}
          aria-label={es.scrum.estimate}
        >
          <option value="">{es.scrum.noEstimate}</option>
          {POINT_SCALE.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {es.scrum.addItem}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.scrum.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
              <div className="flex flex-col">
                <form action={moveBacklogItem}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="text-xs text-neutral-400 hover:text-neutral-800 disabled:opacity-20 dark:hover:text-neutral-200"
                    aria-label={es.scrum.moveUp}
                  >
                    ▲
                  </button>
                </form>
                <form action={moveBacklogItem}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === items.length - 1}
                    className="text-xs text-neutral-400 hover:text-neutral-800 disabled:opacity-20 dark:hover:text-neutral-200"
                    aria-label={es.scrum.moveDown}
                  >
                    ▼
                  </button>
                </form>
              </div>

              <span className="min-w-0 flex-1 truncate">
                <span className={`mr-1 ${priorityStyles[item.priority]}`}>●</span>
                {item.title}
              </span>

              {openSprints.length > 0 && (
                <form action={assignToSprint} className="flex items-center gap-1">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="taskId" value={item.id} />
                  <select
                    name="sprintId"
                    defaultValue={openSprints[0].id}
                    className="max-w-28 truncate rounded-md border border-neutral-200 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    aria-label={es.scrum.assign}
                  >
                    {openSprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="text-xs text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    {es.scrum.assign}
                  </button>
                </form>
              )}

              <form action={setBacklogEstimate} className="flex items-center gap-1">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="id" value={item.id} />
                <select
                  name="estimate"
                  defaultValue={item.estimate ?? ""}
                  className="rounded-md border border-neutral-200 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                  aria-label={es.scrum.estimate}
                >
                  <option value="">{es.scrum.noEstimate}</option>
                  {POINT_SCALE.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  aria-label={es.scrum.estimate}
                >
                  ✓
                </button>
              </form>

              <form action={deleteTask}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="redirectTo" value={back} />
                <button type="submit" className="text-xs text-neutral-300 hover:text-red-600">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
