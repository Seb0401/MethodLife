import type { Goal, LifeArea } from "@prisma/client";
import { createGoal, deleteGoal, setGoalStatus } from "@/actions/goals";
import { renameArea, deleteArea } from "@/actions/areas";
import { SubmitButton, TextInput, TextArea } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { es } from "@/lib/i18n/es";

type AreaWithGoals = LifeArea & { goals: Goal[] };

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" });

const statusVariant: Record<Goal["status"], BadgeVariant> = {
  active: "accent",
  done: "success",
  abandoned: "neutral",
};

function GoalRow({ goal }: { goal: Goal }) {
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-border py-2 text-sm">
      <span className="font-medium text-foreground">{goal.title}</span>
      <Badge variant={statusVariant[goal.status]}>{es.goals.statuses[goal.status]}</Badge>
      {goal.targetDate && (
        <span className="text-xs text-muted">{dateFmt.format(goal.targetDate)}</span>
      )}
      <div className="ml-auto flex items-center gap-2">
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
          <button type="submit" className="text-xs text-faint transition-colors hover:text-red-400">
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
      <button type="submit" className="text-xs text-muted transition-colors hover:text-foreground">
        {label}
      </button>
    </form>
  );
}

export function AreaCard({ area }: { area: AreaWithGoals }) {
  return (
    <Card className="p-4">
      <header className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: area.color ?? "#94a3b8" }}
        />
        <h2 className="text-lg font-semibold text-foreground">
          {area.icon ? `${area.icon} ` : ""}
          {area.name}
        </h2>
        <details className="relative ml-auto text-sm">
          <summary className="cursor-pointer list-none text-faint transition-colors hover:text-foreground">
            ⋯
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-md border border-border bg-elevated p-3 shadow-lg shadow-black/30">
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
          <li className="py-2 text-sm text-muted">{es.goals.empty}</li>
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
    </Card>
  );
}
