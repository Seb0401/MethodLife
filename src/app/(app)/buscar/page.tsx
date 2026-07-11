import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { matchesFilter, type FilterableTask, type TaskFilter } from "@/domain/tasks/filter";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { es } from "@/lib/i18n/es";

const priorityStyles = {
  low: "text-faint",
  medium: "text-amber-400",
  high: "text-red-400",
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
    "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.search.title}
        subtitle={es.search.subtitle}
        icon={<Search className="size-5" />}
      />

      <Card>
        <form method="get" className="flex flex-col gap-3 p-4">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={es.search.textPlaceholder}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
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
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              {es.search.apply}
            </button>
            <Link
              href="/buscar"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              {es.search.clear}
            </Link>
          </div>
        </form>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
          {es.search.results} · {results.length}
        </h2>
        {results.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">{es.search.empty}</Card>
        ) : (
          <Card>
            <ul className="flex flex-col divide-y divide-border">
              {results.map(({ task }) => (
                <li key={task.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-foreground">
                      <span className={`mr-1.5 ${priorityStyles[task.priority]}`}>●</span>
                      {task.title}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {task.project?.name ?? task.goal?.title ?? es.today.inboxLabel}
                      {" · "}
                      {es.search.statuses[task.status]}
                    </span>
                  </div>
                  {task.project && (
                    <Link
                      href={`/proyectos/${task.project.id}`}
                      className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent-hover"
                    >
                      {es.today.open}
                      <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
