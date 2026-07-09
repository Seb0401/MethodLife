import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { loadMachine } from "@/lib/formal/load-machine";
import { HABIT_MACHINE_KEY } from "@/domain/formal/machines";
import { nextTransitions } from "@/domain/formal/machine";
import { HabitForm } from "@/components/habits/habit-form";
import { HabitCard } from "@/components/habits/habit-card";
import { FormError } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { es } from "@/lib/i18n/es";

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const [habits, members, machine] = await Promise.all([
    prisma.habit.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
      include: {
        checkins: { orderBy: { date: "desc" } },
        transitions: { orderBy: { at: "asc" } },
      },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: { userId: true },
    }),
    loadMachine(HABIT_MACHINE_KEY),
  ]);

  // Display names for the witness select and labels.
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: members.map((m) => m.userId) } },
    select: { userId: true, displayName: true },
  });
  const nameOf = new Map(profiles.map((p) => [p.userId, p.displayName]));
  const witnesses = members
    .filter((m) => m.userId !== ctx.user.id)
    .map((m) => ({ userId: m.userId, name: nameOf.get(m.userId) ?? m.userId }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.habits.title}</h1>
        <p className="text-sm text-neutral-500">{es.habits.subtitle}</p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      <HabitForm witnesses={witnesses} />

      {habits.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.habits.empty}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              nextEvents={machine ? nextTransitions(machine, habit.status).map((t) => t.event) : []}
              witnessName={habit.witnessId ? nameOf.get(habit.witnessId) : undefined}
              isWitness={habit.witnessId === ctx.user.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
