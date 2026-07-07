import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createArea } from "@/actions/areas";
import { AreaCard } from "@/components/areas/area-card";
import { FormError, SubmitButton, TextInput } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { es } from "@/lib/i18n/es";

export default async function AreasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();
  const areas = await prisma.lifeArea.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { position: "asc" },
    include: { goals: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.areas.title}</h1>
        <p className="text-sm text-neutral-500">{es.areas.subtitle}</p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      <form action={createArea} className="flex flex-wrap items-center gap-2">
        <TextInput
          name="name"
          placeholder={es.areas.newArea}
          required
          maxLength={60}
          className="flex-1"
        />
        <input
          type="color"
          name="color"
          defaultValue="#64748b"
          aria-label={es.areas.color}
          className="h-9 w-12 cursor-pointer rounded-md border border-neutral-300 dark:border-neutral-700"
        />
        <SubmitButton>{es.areas.create}</SubmitButton>
      </form>

      {areas.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.areas.empty}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {areas.map((area) => (
            <AreaCard key={area.id} area={area} />
          ))}
        </div>
      )}
    </div>
  );
}
