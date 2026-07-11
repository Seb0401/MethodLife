import Link from "next/link";
import { FolderKanban, ArrowUpRight, Trash2 } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createProject, deleteProject } from "@/actions/projects";
import { FormError, Select, SubmitButton, TextInput, TextArea } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { MethodSelector } from "@/components/selector/method-selector";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { es } from "@/lib/i18n/es";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const [areas, goals, projects] = await Promise.all([
    prisma.lifeArea.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "asc" },
    }),
    prisma.goal.findMany({
      where: { workspaceId: ctx.workspace.id, status: "active" },
      orderBy: { createdAt: "asc" },
      include: { area: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
      include: { area: { select: { name: true } }, goal: { select: { title: true } } },
    }),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.projects.title}
        subtitle={es.projects.subtitle}
        icon={<FolderKanban className="size-5" />}
      />

      <FormError message={actionErrorMessage(error)} />

      {areas.length === 0 ? (
        <Card className="p-6 text-sm text-muted">{es.projects.needsArea}</Card>
      ) : (
        <Card>
          <form action={createProject} className="flex flex-col gap-3 p-5">
            <TextInput name="name" placeholder={es.projects.newProject} required maxLength={120} />
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
                {es.projects.area}
                <Select name="areaId" required defaultValue="">
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.icon ? `${a.icon} ` : ""}
                      {a.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
                {es.projects.goal}
                <Select name="goalId" defaultValue="">
                  <option value="">{es.projects.noGoal}</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.area.name} — {g.title}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <MethodSelector />
            <TextArea name="description" placeholder={es.projects.description} rows={2} />
            <SubmitButton className="self-start">{es.projects.create}</SubmitButton>
          </form>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{es.projects.empty}</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} interactive className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/proyectos/${project.id}`}
                  className="font-semibold text-foreground hover:text-accent-hover"
                >
                  {project.name}
                </Link>
                <form action={deleteProject}>
                  <input type="hidden" name="id" value={project.id} />
                  <button
                    type="submit"
                    aria-label={es.projects.delete}
                    title={es.projects.delete}
                    className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-elevated hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="accent">{es.projects.methods[project.method]}</Badge>
                <Badge>{es.projects.statuses[project.status]}</Badge>
              </div>

              <p className="text-xs text-muted">
                {project.area.name}
                {project.goal ? ` · ${project.goal.title}` : ""}
              </p>
              {project.description && (
                <p className="line-clamp-2 text-sm text-muted">{project.description}</p>
              )}

              <Link
                href={`/proyectos/${project.id}`}
                className="mt-1 flex items-center gap-1 self-start text-xs text-muted transition-colors hover:text-accent-hover"
              >
                {es.projects.open}
                <ArrowUpRight className="size-3" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
