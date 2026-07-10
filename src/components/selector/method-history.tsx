import { prisma } from "@/lib/prisma";
import { changeProjectMethod } from "@/actions/projects";
import { PROJECT_METHODS, isMethodActive, type ProjectMethod } from "@/domain/projects/method";
import { SubmitButton, Select } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" });

// Method-decision history + change control for a project (RF9.5).
export async function MethodHistory({
  projectId,
  currentMethod,
}: {
  projectId: string;
  currentMethod: ProjectMethod;
}) {
  const decisions = await prisma.methodDecision.findMany({
    where: { projectId },
    orderBy: { at: "desc" },
    select: { id: true, recommended: true, chosen: true, at: true },
  });

  return (
    <details className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <summary className="cursor-pointer font-semibold">{es.selector.historyTitle}</summary>

      <form action={changeProjectMethod} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500">{es.selector.changeTitle}</span>
          <Select name="method" defaultValue={currentMethod}>
            {PROJECT_METHODS.map((m) => (
              <option key={m} value={m} disabled={!isMethodActive(m)}>
                {es.projects.methods[m]}
              </option>
            ))}
          </Select>
        </label>
        <SubmitButton variant="subtle">{es.selector.changeMethod}</SubmitButton>
      </form>

      {decisions.length === 0 ? (
        <p className="mt-3 text-neutral-500">{es.selector.noDecisions}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {decisions.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-500">{dateFmt.format(d.at)}</span>
              <span>
                {es.selector.recommendedLabel}: {es.projects.methods[d.recommended]}
              </span>
              <span className="font-medium">
                {es.selector.chosenLabel}: {es.projects.methods[d.chosen]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
