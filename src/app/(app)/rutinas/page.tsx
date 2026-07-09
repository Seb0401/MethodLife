import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createRoutine } from "@/actions/routines";
import { RoutineCard } from "@/components/routines/routine-card";
import { FormError, SubmitButton, TextInput, Select } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { es } from "@/lib/i18n/es";

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const routines = await prisma.routine.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      versions: {
        orderBy: { number: "asc" },
        include: {
          requirements: {
            orderBy: { position: "asc" },
            include: {
              evaluations: { select: { evaluatorId: true, date: true, result: true } },
            },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.routines.title}</h1>
        <p className="text-sm text-neutral-500">{es.routines.subtitle}</p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      <form
        action={createRoutine}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.routines.name}</span>
          <TextInput
            name="name"
            placeholder={es.routines.namePlaceholder}
            required
            maxLength={120}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.routines.kind}</span>
          <Select name="prototypeKind" defaultValue="evolutionary">
            <option value="evolutionary">{es.routines.kinds.evolutionary}</option>
            <option value="throwaway">{es.routines.kinds.throwaway}</option>
          </Select>
        </label>
        <SubmitButton>{es.routines.create}</SubmitButton>
      </form>

      {routines.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.routines.empty}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {routines.map((routine) => (
            <RoutineCard key={routine.id} routine={routine} currentUserId={ctx.user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
