import Link from "next/link";
import { GitBranch, Download, AlertTriangle } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { addGoalLink, deleteGoalLink } from "@/actions/traceability";
import { loadTraceability } from "@/lib/traceability/matrix";
import { FormError, SubmitButton, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { actionErrorMessage } from "@/lib/forms";
import { es } from "@/lib/i18n/es";

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const {
    goals,
    projects,
    counts: cell,
    deadIds,
    orphanCount,
    links,
  } = await loadTraceability(ctx.workspace.id);

  const totalByGoal = (goalId: string) =>
    projects.reduce((sum, p) => sum + (cell.get(`${goalId}|${p.id}`) ?? 0), 0);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.traceability.title}
        subtitle={es.traceability.subtitle}
        icon={<GitBranch className="size-5" />}
      />

      <FormError message={actionErrorMessage(error)} />

      {/* Matrix (RF7.2) */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{es.traceability.matrixTitle}</h2>
          {goals.length > 0 && (
            <Link
              href="/trazabilidad/matriz"
              prefetch={false}
              className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent-hover"
            >
              <Download className="size-3" />
              {es.traceability.downloadMatrix}
            </Link>
          )}
        </div>
        {goals.length === 0 ? (
          <Card className="p-6 text-sm text-muted">{es.traceability.noGoals}</Card>
        ) : projects.length === 0 ? (
          <Card className="p-6 text-sm text-muted">{es.traceability.noProjects}</Card>
        ) : (
          <Card className="overflow-x-auto p-2">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left font-medium text-muted">
                    {es.traceability.goal}
                  </th>
                  {projects.map((p) => (
                    <th key={p.id} className="px-2 py-1.5 text-center font-medium text-muted">
                      {p.name}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-center font-medium text-muted">
                    {es.traceability.total}
                  </th>
                </tr>
              </thead>
              <tbody>
                {goals.map((g) => (
                  <tr key={g.id} className="border-b border-border/60">
                    <td className="px-2 py-1.5 text-foreground">
                      {g.title}
                      {deadIds.has(g.id) && <span className="ml-1 text-red-400">●</span>}
                    </td>
                    {projects.map((p) => {
                      const n = cell.get(`${g.id}|${p.id}`) ?? 0;
                      return (
                        <td
                          key={p.id}
                          className={`px-2 py-1.5 text-center ${n === 0 ? "text-faint" : "text-foreground"}`}
                        >
                          {n}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-medium text-foreground">
                      {totalByGoal(g.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Dead goals + orphan work (RF7.3) */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground">{es.traceability.deadTitle}</h2>
          <p className="text-xs text-muted">{es.traceability.deadHint}</p>
          {deadIds.size === 0 ? (
            <p className="mt-2 text-sm text-muted">{es.traceability.noDead}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {goals
                .filter((g) => deadIds.has(g.id))
                .map((g) => (
                  <li key={g.id} className="flex items-center gap-2">
                    <span className="text-red-400">●</span>
                    <span className="text-foreground">{g.title}</span>
                    <span className="text-xs text-faint">{g.area.name}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground">{es.traceability.orphanTitle}</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{orphanCount}</p>
          <p className="text-xs text-muted">
            {es.traceability.orphanCount.replace("{n}", String(orphanCount))}
          </p>
        </Card>
      </section>

      {/* Goal relations (RF7.4) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">{es.traceability.linksTitle}</h2>

        {goals.length >= 2 && (
          <Card>
            <form action={addGoalLink} className="flex flex-wrap items-end gap-2 p-4">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="text-muted">{es.traceability.from}</span>
                <Select name="fromGoalId" required>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">{es.traceability.type}</span>
                <Select name="type" defaultValue="depends_on">
                  <option value="depends_on">{es.traceability.linkTypes.depends_on}</option>
                  <option value="refines">{es.traceability.linkTypes.refines}</option>
                  <option value="conflicts">{es.traceability.linkTypes.conflicts}</option>
                </Select>
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="text-muted">{es.traceability.to}</span>
                <Select name="toGoalId" required>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </Select>
              </label>
              <SubmitButton>{es.traceability.addLink}</SubmitButton>
            </form>
          </Card>
        )}

        {links.length === 0 ? (
          <Card className="p-6 text-sm text-muted">{es.traceability.noLinks}</Card>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {links.map((l) => (
              <li
                key={l.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  l.type === "conflicts"
                    ? "border-red-900 bg-red-950/40"
                    : "border-border bg-surface"
                }`}
              >
                <span className="font-medium text-foreground">{l.fromGoal.title}</span>
                <span className="text-muted">{es.traceability.linkTypes[l.type]}</span>
                <span className="font-medium text-foreground">{l.toGoal.title}</span>
                {l.type === "conflicts" && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertTriangle className="size-3" />
                    {es.traceability.conflictAlert}
                  </span>
                )}
                <form action={deleteGoalLink} className="ml-auto">
                  <input type="hidden" name="id" value={l.id} />
                  <button
                    type="submit"
                    className="text-xs text-faint transition-colors hover:text-red-400"
                  >
                    {es.traceability.deleteLink}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
