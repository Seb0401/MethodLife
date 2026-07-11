import Link from "next/link";
import {
  CalendarDays,
  Check,
  X,
  ArrowUpRight,
  ArrowRight,
  Inbox,
  Target,
  FolderKanban,
  Repeat,
  Compass,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { toggleTaskDone, setTaskDueDate } from "@/actions/tasks";
import { isDueToday, isOverdue } from "@/domain/tasks/today";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { es } from "@/lib/i18n/es";

const priorityStyles = {
  low: "text-faint",
  medium: "text-amber-400",
  high: "text-red-400",
} as const;

function formatDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

export default async function HoyPage() {
  const ctx = await getWorkspaceContext();

  const now = new Date();
  const [tasks, profile, projectCount, habitCount, goalCount] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: ctx.workspace.id, dueDate: { not: null }, status: { not: "done" } },
      include: {
        project: { select: { id: true, name: true } },
        goal: { select: { title: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    }),
    prisma.profile.findUnique({
      where: { userId: ctx.user.id },
      select: { displayName: true },
    }),
    prisma.project.count({ where: { workspaceId: ctx.workspace.id } }),
    prisma.habit.count({ where: { workspaceId: ctx.workspace.id } }),
    prisma.goal.count({ where: { workspaceId: ctx.workspace.id } }),
  ]);

  // The query only returns dated tasks; narrow the type, then split by domain rules.
  const dated = tasks.filter((t): t is typeof t & { dueDate: Date } => t.dueDate !== null);
  const overdue = dated.filter((t) => isOverdue(t.dueDate, now));
  const today = dated.filter((t) => isDueToday(t.dueDate, now));

  // A fresh workspace has no projects, habits or goals yet (default life areas
  // are seeded on signup, so they don't count as "getting started" progress).
  const isNew = projectCount === 0 && habitCount === 0 && goalCount === 0;

  const name = profile?.displayName?.split(" ")[0];
  const greeting = name ? `${es.today.greeting}, ${name}` : es.today.greeting;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={greeting}
        subtitle={es.today.subtitle}
        icon={<CalendarDays className="size-5" />}
      />

      {isNew && <GettingStarted />}

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard label={es.today.overdueSection} value={overdue.length} tone="danger" />
        <StatCard label={es.today.todaySection} value={today.length} tone="warning" />
      </div>

      {overdue.length === 0 && today.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{es.today.empty}</Card>
      ) : (
        <div className="flex flex-col gap-6">
          {overdue.length > 0 && (
            <Section title={es.today.overdueSection} tasks={overdue} overdue />
          )}
          {today.length > 0 && <Section title={es.today.todaySection} tasks={today} />}
        </div>
      )}
    </div>
  );
}

type Step = { icon: LucideIcon; href: string; key: keyof typeof es.onboarding.steps };

const STEPS: Step[] = [
  { icon: Inbox, href: "/inbox", key: "inbox" },
  { icon: Target, href: "/areas", key: "areas" },
  { icon: FolderKanban, href: "/proyectos", key: "projects" },
  { icon: Repeat, href: "/habitos", key: "habits" },
  { icon: Compass, href: "/metodos", key: "methods" },
  { icon: Sparkles, href: "/insights", key: "insights" },
];

// Welcome + feature guide shown to brand-new workspaces so a first-time user
// immediately sees what the app lets them do and where to start.
function GettingStarted() {
  return (
    <section className="flex flex-col gap-4">
      <Card className="flex flex-col gap-1 border-accent-muted bg-accent-subtle/40 p-5">
        <h2 className="text-lg font-bold text-foreground">{es.onboarding.title}</h2>
        <p className="max-w-prose text-sm text-muted">{es.onboarding.subtitle}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(({ icon: Icon, href, key }) => {
          const step = es.onboarding.steps[key];
          return (
            <Link key={key} href={href} className="group">
              <Card interactive className="flex h-full flex-col gap-2 p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent-subtle text-accent-hover">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="flex-1 text-sm text-muted">{step.body}</p>
                <span className="flex items-center gap-1 text-xs font-medium text-accent-hover">
                  {step.cta}
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
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
      <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">{title}</h2>
      <Card>
        <ul className="flex flex-col divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <form action={toggleTaskDone} className="flex">
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="redirectTo" value="/hoy" />
                <input type="hidden" name="done" value="true" />
                <button
                  type="submit"
                  aria-label={task.title}
                  className="group flex size-5 items-center justify-center rounded-full border border-border-strong text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
                >
                  <Check className="size-3" strokeWidth={3} />
                </button>
              </form>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-foreground">
                  <span className={`mr-1.5 ${priorityStyles[task.priority]}`}>●</span>
                  {task.title}
                </span>
                <span className="truncate text-xs text-muted">
                  {task.project?.name ?? task.goal?.title ?? es.today.inboxLabel}
                  {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                  {overdue && <span className="ml-1 text-red-400">· {es.tasks.overdue}</span>}
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
              <form action={setTaskDueDate} className="flex">
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="redirectTo" value="/hoy" />
                <input type="hidden" name="dueDate" value="" />
                <button
                  type="submit"
                  className="flex size-6 items-center justify-center rounded-md text-faint transition-colors hover:bg-elevated hover:text-foreground"
                  aria-label={es.tasks.clearDue}
                  title={es.tasks.clearDue}
                >
                  <X className="size-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
