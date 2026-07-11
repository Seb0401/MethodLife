import Link from "next/link";
import {
  LayoutDashboard,
  ListTodo,
  CheckCircle2,
  FolderKanban,
  Target,
  Repeat,
  ShieldCheck,
  Flame,
  CalendarClock,
  ArrowUpRight,
} from "lucide-react";
import type { HabitStatus } from "@prisma/client";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { loadDashboardSummary } from "@/lib/dashboard/summary";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { es } from "@/lib/i18n/es";

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" });

const habitStatusVariant: Record<HabitStatus, BadgeVariant> = {
  detected: "neutral",
  analysis: "neutral",
  correction: "warning",
  verification: "accent",
  overcome: "success",
};

const priorityMeta = [
  { key: "high" as const, color: "bg-red-500", label: es.tasks.priorities.high },
  { key: "medium" as const, color: "bg-amber-500", label: es.tasks.priorities.medium },
  { key: "low" as const, color: "bg-zinc-500", label: es.tasks.priorities.low },
];

export default async function ResumenPage() {
  const ctx = await getWorkspaceContext();
  const s = await loadDashboardSummary(ctx.workspace.id);

  const isEmpty =
    s.tasks.active === 0 &&
    s.tasks.done === 0 &&
    s.projects.active === 0 &&
    s.goals.active === 0 &&
    s.goals.done === 0 &&
    s.habits.total === 0;

  const goalTotal = s.goals.active + s.goals.done + s.goals.abandoned;
  const taskTotal = s.tasks.todo + s.tasks.inProgress + s.tasks.done;
  const activePending =
    s.tasks.byPriority.low + s.tasks.byPriority.medium + s.tasks.byPriority.high;
  const hasActivity = s.activity.some((b) => b.checkins > 0 || b.tasksDone > 0);
  const trackedHabits = [...s.habits.items].sort((a, b) => b.streak - a.streak).slice(0, 5);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.dashboard.title}
        subtitle={es.dashboard.subtitle}
        icon={<LayoutDashboard className="size-5" />}
      />

      {isEmpty ? (
        <Card className="p-8 text-center text-sm text-muted">{es.dashboard.empty}</Card>
      ) : (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label={es.dashboard.stats.activeTasks}
              value={s.tasks.active}
              icon={<ListTodo className="size-4" />}
            />
            <StatCard
              label={es.dashboard.stats.doneTasks}
              value={s.tasks.done}
              tone="success"
              icon={<CheckCircle2 className="size-4" />}
            />
            <StatCard
              label={es.dashboard.stats.activeProjects}
              value={s.projects.active}
              tone="accent"
              icon={<FolderKanban className="size-4" />}
            />
            <StatCard
              label={es.dashboard.stats.activeGoals}
              value={s.goals.active}
              hint={es.dashboard.hints.goalsDone.replace("{n}", String(s.goals.done))}
              icon={<Target className="size-4" />}
            />
            <StatCard
              label={es.dashboard.stats.habits}
              value={s.habits.total}
              hint={es.dashboard.hints.habitsTracked}
              icon={<Repeat className="size-4" />}
            />
            <StatCard
              label={es.dashboard.stats.invariants}
              value={s.invariants.holding}
              tone={s.invariants.violated > 0 ? "danger" : "success"}
              hint={
                s.invariants.violated > 0
                  ? es.dashboard.hints.invariantsViolated.replace(
                      "{n}",
                      String(s.invariants.violated),
                    )
                  : es.dashboard.hints.invariantsOk
              }
              icon={<ShieldCheck className="size-4" />}
            />
          </div>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{es.dashboard.activity.title}</CardTitle>
              <p className="text-xs text-muted">{es.dashboard.activity.subtitle}</p>
            </CardHeader>
            <CardBody>
              {hasActivity ? (
                <>
                  <ActivityChart data={s.activity} />
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-accent" />
                      {es.dashboard.activity.tasksDone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-[#a78bfa]" />
                      {es.dashboard.activity.checkins}
                    </span>
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted">{es.dashboard.activity.empty}</p>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Task distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{es.dashboard.taskDist.title}</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <DistRow
                  label={es.search.statuses.todo}
                  value={s.tasks.todo}
                  total={taskTotal}
                  color="bg-zinc-500"
                />
                <DistRow
                  label={es.search.statuses.in_progress}
                  value={s.tasks.inProgress}
                  total={taskTotal}
                  color="bg-amber-500"
                />
                <DistRow
                  label={es.search.statuses.done}
                  value={s.tasks.done}
                  total={taskTotal}
                  color="bg-emerald-500"
                />

                <div className="mt-1 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                    {es.dashboard.taskDist.priority}
                  </p>
                  {activePending === 0 ? (
                    <p className="text-sm text-muted">{es.dashboard.taskDist.empty}</p>
                  ) : (
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                      {priorityMeta.map(({ key, color }) =>
                        s.tasks.byPriority[key] > 0 ? (
                          <div
                            key={key}
                            className={color}
                            style={{ width: `${(s.tasks.byPriority[key] / activePending) * 100}%` }}
                          />
                        ) : null,
                      )}
                    </div>
                  )}
                  {activePending > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                      {priorityMeta.map(({ key, color, label }) => (
                        <span key={key} className="flex items-center gap-1.5">
                          <span className={`size-2.5 rounded-sm ${color}`} />
                          {label} · {s.tasks.byPriority[key]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Goals */}
            <Card>
              <div className="flex items-center justify-between p-5 pb-3">
                <CardTitle>{es.dashboard.goals.title}</CardTitle>
                <Link
                  href="/areas"
                  className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent-hover"
                >
                  {es.today.open}
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <CardBody className="flex flex-col gap-3">
                {goalTotal === 0 ? (
                  <p className="text-sm text-muted">{es.dashboard.goals.none}</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm text-muted">
                        {es.dashboard.goals.progress
                          .replace("{done}", String(s.goals.done))
                          .replace("{total}", String(goalTotal))}
                      </span>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${(s.goals.done / goalTotal) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                        {es.dashboard.goals.upcomingTitle}
                      </p>
                      {s.goals.upcoming.length === 0 ? (
                        <p className="text-sm text-muted">{es.dashboard.goals.noUpcoming}</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {s.goals.upcoming.map((g) => (
                            <li
                              key={g.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <CalendarClock className="size-3.5 shrink-0 text-faint" />
                                <span className="truncate text-foreground">{g.title}</span>
                              </span>
                              <span className="shrink-0 text-xs text-muted">
                                {dateFmt.format(g.targetDate)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>

            {/* Habits */}
            <Card>
              <div className="flex items-center justify-between p-5 pb-3">
                <CardTitle>{es.dashboard.habits.title}</CardTitle>
                <Link
                  href="/habitos"
                  className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent-hover"
                >
                  {es.today.open}
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <CardBody>
                {trackedHabits.length === 0 ? (
                  <p className="text-sm text-muted">{es.dashboard.habits.none}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {trackedHabits.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-2 py-2.5">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-foreground">{h.name}</span>
                          <Badge variant={habitStatusVariant[h.status]} className="mt-0.5 w-fit">
                            {es.habits.statuses[h.status]}
                          </Badge>
                        </span>
                        {h.streak > 0 ? (
                          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-amber-400">
                            <Flame className="size-4" />
                            {es.dashboard.habits.streak.replace("{n}", String(h.streak))}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs text-faint">
                            {es.dashboard.habits.noStreak}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* Projects by method */}
            <Card>
              <div className="flex items-center justify-between p-5 pb-3">
                <CardTitle>{es.dashboard.projects.title}</CardTitle>
                <Link
                  href="/proyectos"
                  className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent-hover"
                >
                  {es.today.open}
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <CardBody className="flex flex-col gap-3">
                {s.projects.byMethod.length === 0 ? (
                  <p className="text-sm text-muted">{es.dashboard.projects.none}</p>
                ) : (
                  s.projects.byMethod.map(({ method, count }) => (
                    <DistRow
                      key={method}
                      label={es.projects.methods[method]}
                      value={count}
                      total={s.projects.active}
                      color="bg-accent"
                    />
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// Labeled horizontal bar showing value out of a total.
function DistRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums text-muted">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
