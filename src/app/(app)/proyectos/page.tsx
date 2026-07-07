import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { createProject, deleteProject } from "@/actions/projects";
import { FormError, Select, SubmitButton, TextInput, TextArea } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { PROJECT_METHODS, isMethodActive } from "@/domain/projects/method";
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.projects.title}</h1>
        <p className="text-sm text-neutral-500">{es.projects.subtitle}</p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      {areas.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.projects.needsArea}</p>
      ) : (
        <form
          action={createProject}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <TextInput name="name" placeholder={es.projects.newProject} required maxLength={120} />
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
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
            <label className="flex flex-1 flex-col gap-1 text-sm">
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
            <label className="flex flex-1 flex-col gap-1 text-sm">
              {es.projects.method}
              <Select name="method" defaultValue="kanban">
                {PROJECT_METHODS.map((m) => (
                  <option key={m} value={m} disabled={!isMethodActive(m)}>
                    {es.projects.methods[m]}
                    {isMethodActive(m) ? "" : ` ${es.projects.methodSoon}`}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <TextArea name="description" placeholder={es.projects.description} rows={2} />
          <SubmitButton className="self-start">{es.projects.create}</SubmitButton>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.projects.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{project.name}</h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {es.projects.methods[project.method]}
                </span>
                <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500 dark:border-neutral-700">
                  {es.projects.statuses[project.status]}
                </span>
                <form action={deleteProject} className="ml-auto">
                  <input type="hidden" name="id" value={project.id} />
                  <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                    {es.projects.delete}
                  </button>
                </form>
              </div>
              <p className="text-xs text-neutral-500">
                {project.area.name}
                {project.goal ? ` · ${project.goal.title}` : ""}
              </p>
              {project.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {project.description}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
