import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { matchesFilter, type FilterableTask, type TaskFilter } from "@/domain/tasks/filter";
import { es } from "@/lib/i18n/es";

const priorityStyles = {
  low: "text-neutral-400",
  medium: "text-amber-500",
  high: "text-red-500",
} as const;

const STATUSES = ["todo", "in_progress", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

// Reads a raw query-string value only if it is one of the allowed literals.
function oneOf<T extends readonly string[]>(
  raw: string | undefined,
  allowed: T,
): T[number] | undefined {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T[number]) : undefined;
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; status?: string; priority?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getWorkspaceContext();

  const filter: TaskFilter = {
    text: sp.q,
    areaId: sp.area || undefined,
    status: oneOf(sp.status, STATUSES),
    priority: oneOf(sp.priority, PRIORITIES),
  };

  const [areas, tasks] = await Promise.all([
    prisma.lifeArea.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.task.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        project: { select: { id: true, name: true, areaId: true } },
        goal: { select: { title: true, areaId: true } },
      },
    }),
  ]);

  // A task's area is inherited from its project or goal (tasks have no direct
  // area); resolve it so the domain filter can match on it.
  const withArea = tasks.map((t) => ({
    task: t,
    filterable: {
      title: t.title,
      description: t.description,
      areaId: t.project?.areaId ?? t.goal?.areaId ?? null,
      status: t.status,
      priority: t.priority,
    } satisfies FilterableTask,
  }));

  const results = withArea.filter(({ filterable }) => matchesFilter(filterable, filter));

  const selectClass =
    "rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.search.title}</h1>
        <p className="text-sm text-neutral-500">{es.search.subtitle}</p>
      </header>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder={es.search.textPlaceholder}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="flex flex-wrap gap-2">
          <select name="area" defaultValue={sp.area ?? ""} className={selectClass}>
            <option value="">{es.search.anyArea}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon ? `${a.icon} ` : ""}
                {a.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass}>
            <option value="">{es.search.anyStatus}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {es.search.statuses[s]}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={sp.priority ?? ""} className={selectClass}>
            <option value="">{es.search.anyPriority}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {es.tasks.priorities[p]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            {es.search.apply}
          </button>
          <Link
            href="/buscar"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {es.search.clear}
          </Link>
        </div>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {es.search.results} · {results.length}
        </h2>
        {results.length === 0 ? (
          <p className="text-sm text-neutral-500">{es.search.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {results.map(({ task }) => (
              <li key={task.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">
                    <span className={`mr-1 ${priorityStyles[task.priority]}`}>●</span>
                    {task.title}
                  </span>
                  <span className="truncate text-xs text-neutral-500">
                    {task.project?.name ?? task.goal?.title ?? es.today.inboxLabel}
                    {" · "}
                    {es.search.statuses[task.status]}
                  </span>
                </div>
                {task.project && (
                  <Link
                    href={`/proyectos/${task.project.id}`}
                    className="text-xs text-neutral-500 hover:underline"
                  >
                    {es.today.open}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
