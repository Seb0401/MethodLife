import { prisma } from "@/lib/prisma";
import {
  createSprint,
  startSprint,
  closeSprint,
  removeFromSprint,
  saveRetrospective,
} from "@/actions/scrum";
import { sumPoints } from "@/domain/scrum/backlog";
import { averageVelocity } from "@/domain/scrum/history";
import { es } from "@/lib/i18n/es";

const textareaClass =
  "rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

// Prisma stores retro actions as JSON; read them back as a newline list.
function actionsToText(actions: unknown): string {
  return Array.isArray(actions) ? actions.map(String).join("\n") : "";
}

const inputClass =
  "rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const statusStyles = {
  planned: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  closed: "bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500",
} as const;

function formatDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

// Sprint list, creation and planning for a Scrum project (RF2.2/2.3).
export async function SprintsPanel({ projectId }: { projectId: string }) {
  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    orderBy: { startsAt: "asc" },
    include: {
      tasks: {
        orderBy: { position: "asc" },
        select: { id: true, title: true, estimate: true },
      },
      retrospective: true,
    },
  });

  // Average velocity across closed sprints (RF2.8).
  const closed = sprints.filter((s) => s.status === "closed");
  const avg = averageVelocity(closed.map((s) => s.velocity ?? 0));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">{es.scrum.sprintsTitle}</h2>
          <p className="text-xs text-neutral-500">{es.scrum.sprintsSubtitle}</p>
        </div>
        {avg !== null && (
          <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {es.scrum.avgVelocity}: {avg} · {closed.length} {es.scrum.closedCount}
          </span>
        )}
      </header>

      <form action={createSprint} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input
          name="name"
          placeholder={es.scrum.newSprint}
          required
          maxLength={120}
          className={`${inputClass} flex-1`}
        />
        <label className="flex flex-col gap-0.5 text-xs text-neutral-500">
          {es.scrum.startsAt}
          <input type="date" name="startsAt" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-0.5 text-xs text-neutral-500">
          {es.scrum.endsAt}
          <input type="date" name="endsAt" required className={inputClass} />
        </label>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {es.scrum.createSprint}
        </button>
      </form>

      {sprints.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.scrum.noSprints}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sprints.map((sprint) => (
            <article
              key={sprint.id}
              className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{sprint.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[sprint.status]}`}>
                  {es.scrum.statuses[sprint.status]}
                </span>
                <span className="text-xs text-neutral-500">
                  {formatDate(sprint.startsAt)}–{formatDate(sprint.endsAt)}
                </span>
                <span className="text-xs text-neutral-500">
                  {sumPoints(sprint.tasks)} {es.scrum.points} · {sprint.tasks.length}{" "}
                  {es.scrum.items}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {sprint.status === "closed" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {es.scrum.velocity}: {sprint.velocity ?? 0}
                    </span>
                  )}
                  {sprint.status === "planned" && (
                    <form action={startSprint}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="sprintId" value={sprint.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                      >
                        {es.scrum.start}
                      </button>
                    </form>
                  )}
                  {sprint.status === "active" && (
                    <form action={closeSprint}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="sprintId" value={sprint.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                      >
                        {es.scrum.close}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {sprint.status === "closed" && sprint.summaryMd && (
                <details className="text-sm">
                  <summary className="flex cursor-pointer items-center gap-3 text-neutral-500">
                    {es.scrum.viewSummary}
                    <a
                      href={`/proyectos/${projectId}/sprints/${sprint.id}/resumen`}
                      download
                      className="text-xs text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      {es.scrum.downloadSummary}
                    </a>
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs dark:bg-neutral-900">
                    {sprint.summaryMd}
                  </pre>
                </details>
              )}

              {sprint.tasks.length > 0 && (
                <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                  {sprint.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      <span className="text-xs text-neutral-400">
                        {task.estimate ?? "–"} {es.scrum.points}
                      </span>
                      {sprint.status !== "closed" && (
                        <form action={removeFromSprint}>
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="text-xs text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                          >
                            {es.scrum.remove}
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {sprint.status !== "planned" && (
                <details className="text-sm" open={!sprint.retrospective}>
                  <summary className="cursor-pointer text-neutral-500">{es.scrum.retro}</summary>
                  <form action={saveRetrospective} className="mt-2 flex flex-col gap-2">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="sprintId" value={sprint.id} />
                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                      {es.scrum.wentWell}
                      <textarea
                        name="wentWell"
                        rows={2}
                        defaultValue={sprint.retrospective?.wentWell ?? ""}
                        className={textareaClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                      {es.scrum.toImprove}
                      <textarea
                        name="toImprove"
                        rows={2}
                        defaultValue={sprint.retrospective?.toImprove ?? ""}
                        className={textareaClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                      {es.scrum.actions}
                      <textarea
                        name="actions"
                        rows={2}
                        defaultValue={actionsToText(sprint.retrospective?.actions)}
                        className={textareaClass}
                      />
                    </label>
                    <button
                      type="submit"
                      className="self-start rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                    >
                      {es.scrum.saveRetro}
                    </button>
                  </form>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
