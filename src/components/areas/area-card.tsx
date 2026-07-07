import type { Goal, LifeArea } from "@prisma/client";
import { createGoal, deleteGoal, setGoalStatus } from "@/actions/goals";
import { renameArea, deleteArea } from "@/actions/areas";
import { SubmitButton, TextInput, TextArea } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

type AreaWithGoals = LifeArea & { goals: Goal[] };

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" });

const statusStyles: Record<Goal["status"], string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  abandoned: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

function GoalRow({ goal }: { goal: Goal }) {
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-neutral-100 py-2 text-sm dark:border-neutral-800">
      <span className="font-medium">{goal.title}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[goal.status]}`}>
        {es.goals.statuses[goal.status]}
      </span>
      {goal.targetDate && (
        <span className="text-xs text-neutral-500">{dateFmt.format(goal.targetDate)}</span>
      )}
      <div className="ml-auto flex items-center gap-1">
        {goal.status === "active" ? (
          <>
            <StatusButton id={goal.id} status="done" label={es.goals.markDone} />
            <StatusButton id={goal.id} status="abandoned" label={es.goals.markAbandoned} />
          </>
        ) : (
          <StatusButton id={goal.id} status="active" label={es.goals.reopen} />
        )}
        <form action={deleteGoal}>
          <input type="hidden" name="id" value={goal.id} />
          <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
            {es.goals.delete}
          </button>
        </form>
      </div>
    </li>
  );
}

function StatusButton({
  id,
  status,
  label,
}: {
  id: string;
  status: Goal["status"];
  label: string;
}) {
  return (
    <form action={setGoalStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
      >
        {label}
      </button>
    </form>
  );
}

export function AreaCard({ area }: { area: AreaWithGoals }) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: area.color ?? "#94a3b8" }}
        />
        <h2 className="text-lg font-semibold">
          {area.icon ? `${area.icon} ` : ""}
          {area.name}
        </h2>
        <details className="relative ml-auto text-sm">
          <summary className="cursor-pointer list-none text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            ⋯
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <form action={renameArea} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={area.id} />
              <TextInput name="name" defaultValue={area.name} required maxLength={60} />
              <SubmitButton variant="subtle">{es.areas.rename}</SubmitButton>
            </form>
            <form action={deleteArea}>
              <input type="hidden" name="id" value={area.id} />
              <SubmitButton variant="danger" className="w-full">
                {es.areas.delete}
              </SubmitButton>
            </form>
          </div>
        </details>
      </header>

      <ul className="mt-2">
        {area.goals.length === 0 ? (
          <li className="py-2 text-sm text-neutral-500">{es.goals.empty}</li>
        ) : (
          area.goals.map((goal) => <GoalRow key={goal.id} goal={goal} />)
        )}
      </ul>

      <form action={createGoal} className="mt-3 flex flex-wrap items-start gap-2">
        <input type="hidden" name="areaId" value={area.id} />
        <TextInput
          name="title"
          placeholder={es.goals.goalTitle}
          required
          maxLength={120}
          className="flex-1"
        />
        <TextInput name="targetDate" type="date" aria-label={es.goals.targetDate} />
        <SubmitButton variant="subtle">{es.goals.create}</SubmitButton>
        <TextArea
          name="description"
          placeholder={es.goals.description}
          rows={1}
          className="w-full"
        />
      </form>
    </section>
  );
}
