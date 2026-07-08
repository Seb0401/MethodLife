import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { toggleTaskDone, setTaskDueDate } from "@/actions/tasks";
import { isDueToday, isOverdue } from "@/domain/tasks/today";
import { es } from "@/lib/i18n/es";

const priorityStyles = {
  low: "text-neutral-400",
  medium: "text-amber-500",
  high: "text-red-500",
} as const;

function formatDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

export default async function HoyPage() {
  const ctx = await getWorkspaceContext();

  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { workspaceId: ctx.workspace.id, dueDate: { not: null }, status: { not: "done" } },
    include: {
      project: { select: { id: true, name: true } },
      goal: { select: { title: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
  });

  // The query only returns dated tasks; narrow the type, then split by domain rules.
  const dated = tasks.filter((t): t is typeof t & { dueDate: Date } => t.dueDate !== null);
  const overdue = dated.filter((t) => isOverdue(t.dueDate, now));
  const today = dated.filter((t) => isDueToday(t.dueDate, now));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.nav.hoy}</h1>
        <p className="text-sm text-neutral-500">{es.today.subtitle}</p>
      </header>

      {overdue.length === 0 && today.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.today.empty}</p>
      ) : (
        <>
          {overdue.length > 0 && (
            <Section title={es.today.overdueSection} tasks={overdue} overdue />
          )}
          {today.length > 0 && <Section title={es.today.todaySection} tasks={today} />}
        </>
      )}
    </div>
  );
}

type TodayTask = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  dueDate: Date | null;
  project: { id: string; name: string } | null;
  goal: { title: string } | null;
};

function Section({
  title,
  tasks,
  overdue = false,
}: {
  title: string;
  tasks: TodayTask[];
  overdue?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h2>
      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 py-2 text-sm">
            <form action={toggleTaskDone}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="redirectTo" value="/hoy" />
              <input type="hidden" name="done" value="true" />
              <button
                type="submit"
                aria-label={task.title}
                className="text-neutral-400 hover:text-green-600"
              >
                ☐
              </button>
            </form>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">
                <span className={`mr-1 ${priorityStyles[task.priority]}`}>●</span>
                {task.title}
              </span>
              <span className="truncate text-xs text-neutral-500">
                {task.project?.name ?? task.goal?.title ?? es.today.inboxLabel}
                {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                {overdue && <span className="ml-1 text-red-600">· {es.tasks.overdue}</span>}
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
            <form action={setTaskDueDate}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="redirectTo" value="/hoy" />
              <input type="hidden" name="dueDate" value="" />
              <button
                type="submit"
                className="text-xs text-neutral-300 hover:text-neutral-600"
                aria-label={es.tasks.clearDue}
              >
                {es.tasks.clearDue}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
