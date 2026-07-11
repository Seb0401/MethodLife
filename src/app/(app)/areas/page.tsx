import { Target } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createArea } from "@/actions/areas";
import { AreaCard } from "@/components/areas/area-card";
import { FormError, SubmitButton, TextInput } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
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
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.areas.title}
        subtitle={es.areas.subtitle}
        icon={<Target className="size-5" />}
      />

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
          className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface"
        />
        <SubmitButton>{es.areas.create}</SubmitButton>
      </form>

      {areas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{es.areas.empty}</Card>
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
