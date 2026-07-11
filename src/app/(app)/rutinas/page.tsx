import { ListChecks } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createRoutine } from "@/actions/routines";
import { RoutineCard } from "@/components/routines/routine-card";
import { FormError, SubmitButton, TextInput, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
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
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.routines.title}
        subtitle={es.routines.subtitle}
        icon={<ListChecks className="size-5" />}
      />

      <FormError message={actionErrorMessage(error)} />

      <Card>
        <form action={createRoutine} className="flex flex-wrap items-end gap-2 p-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-muted">{es.routines.name}</span>
            <TextInput
              name="name"
              placeholder={es.routines.namePlaceholder}
              required
              maxLength={120}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{es.routines.kind}</span>
            <Select name="prototypeKind" defaultValue="evolutionary">
              <option value="evolutionary">{es.routines.kinds.evolutionary}</option>
              <option value="throwaway">{es.routines.kinds.throwaway}</option>
            </Select>
          </label>
          <SubmitButton>{es.routines.create}</SubmitButton>
        </form>
      </Card>

      {routines.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{es.routines.empty}</Card>
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
