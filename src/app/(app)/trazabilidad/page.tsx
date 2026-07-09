import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { addGoalLink, deleteGoalLink } from "@/actions/traceability";
import { findDeadGoals } from "@/domain/traceability/dead-goals";
import { FormError, SubmitButton, Select } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { es } from "@/lib/i18n/es";

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const [goals, projects, tasks, links] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: [{ areaId: "asc" }, { createdAt: "asc" }],
      include: { area: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { workspaceId: ctx.workspace.id, inbox: false },
      select: { goalId: true, projectId: true, status: true },
    }),
    prisma.goalLink.findMany({
      where: { fromGoal: { workspaceId: ctx.workspace.id } },
      orderBy: { createdAt: "asc" },
      include: {
        fromGoal: { select: { title: true } },
        toGoal: { select: { title: true } },
      },
    }),
  ]);

  // Task counts per goal×project cell, active tasks per goal, and orphan work.
  const cell = new Map<string, number>();
  const activeByGoal = new Map<string, number>();
  let orphanCount = 0;
  for (const t of tasks) {
    if (!t.goalId) {
      orphanCount++;
      continue;
    }
    if (t.projectId) {
      const key = `${t.goalId}|${t.projectId}`;
      cell.set(key, (cell.get(key) ?? 0) + 1);
    }
    if (t.status !== "done") activeByGoal.set(t.goalId, (activeByGoal.get(t.goalId) ?? 0) + 1);
  }

  const deadIds = new Set(
    findDeadGoals(
      goals.map((g) => ({
        id: g.id,
        status: g.status,
        activeTaskCount: activeByGoal.get(g.id) ?? 0,
      })),
    ),
  );
  const totalByGoal = (goalId: string) =>
    projects.reduce((sum, p) => sum + (cell.get(`${goalId}|${p.id}`) ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.traceability.title}</h1>
        <p className="text-sm text-neutral-500">{es.traceability.subtitle}</p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      {/* Matrix (RF7.2) */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{es.traceability.matrixTitle}</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-neutral-500">{es.traceability.noGoals}</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-neutral-500">{es.traceability.noProjects}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-2 py-1 text-left font-medium">{es.traceability.goal}</th>
                  {projects.map((p) => (
                    <th key={p.id} className="px-2 py-1 text-center font-medium">
                      {p.name}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center font-medium">{es.traceability.total}</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((g) => (
                  <tr key={g.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                    <td className="px-2 py-1">
                      {g.title}
                      {deadIds.has(g.id) && <span className="ml-1 text-red-500">●</span>}
                    </td>
                    {projects.map((p) => {
                      const n = cell.get(`${g.id}|${p.id}`) ?? 0;
                      return (
                        <td
                          key={p.id}
                          className={`px-2 py-1 text-center ${n === 0 ? "text-neutral-300 dark:text-neutral-700" : ""}`}
                        >
                          {n}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center font-medium">{totalByGoal(g.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dead goals + orphan work (RF7.3) */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">{es.traceability.deadTitle}</h2>
          <p className="text-xs text-neutral-500">{es.traceability.deadHint}</p>
          {deadIds.size === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">{es.traceability.noDead}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {goals
                .filter((g) => deadIds.has(g.id))
                .map((g) => (
                  <li key={g.id} className="flex items-center gap-2">
                    <span className="text-red-500">●</span>
                    <span>{g.title}</span>
                    <span className="text-xs text-neutral-400">{g.area.name}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">{es.traceability.orphanTitle}</h2>
          <p className="mt-2 text-2xl font-bold">{orphanCount}</p>
          <p className="text-xs text-neutral-500">
            {es.traceability.orphanCount.replace("{n}", String(orphanCount))}
          </p>
        </div>
      </section>

      {/* Goal relations (RF7.4) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{es.traceability.linksTitle}</h2>

        {goals.length >= 2 && (
          <form action={addGoalLink} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-neutral-500">{es.traceability.from}</span>
              <Select name="fromGoalId" required>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500">{es.traceability.type}</span>
              <Select name="type" defaultValue="depends_on">
                <option value="depends_on">{es.traceability.linkTypes.depends_on}</option>
                <option value="refines">{es.traceability.linkTypes.refines}</option>
                <option value="conflicts">{es.traceability.linkTypes.conflicts}</option>
              </Select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-neutral-500">{es.traceability.to}</span>
              <Select name="toGoalId" required>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </label>
            <SubmitButton>{es.traceability.addLink}</SubmitButton>
          </form>
        )}

        {links.length === 0 ? (
          <p className="text-sm text-neutral-500">{es.traceability.noLinks}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li
                key={l.id}
                className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  l.type === "conflicts"
                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <span className="font-medium">{l.fromGoal.title}</span>
                <span className="text-neutral-500">{es.traceability.linkTypes[l.type]}</span>
                <span className="font-medium">{l.toGoal.title}</span>
                {l.type === "conflicts" && (
                  <span className="text-xs text-red-600">⚠ {es.traceability.conflictAlert}</span>
                )}
                <form action={deleteGoalLink} className="ml-auto">
                  <input type="hidden" name="id" value={l.id} />
                  <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                    {es.traceability.deleteLink}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
