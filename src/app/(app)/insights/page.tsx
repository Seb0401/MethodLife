import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { gatherInsightData } from "@/lib/insights/facts";
import { evaluateInsights } from "@/domain/insights/catalog";
import { detectInconsistencies } from "@/domain/insights/inconsistencies";
import { es } from "@/lib/i18n/es";

// Fills a template like "{wip} de {limit}" from the hit's data (RF11.2).
function fill(template: string, data: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(data[k] ?? ""));
}

export default async function InsightsPage() {
  const ctx = await getWorkspaceContext();
  const { facts, inconsistencies } = await gatherInsightData(ctx.workspace.id);
  const hits = evaluateInsights(facts);
  const issues = detectInconsistencies(inconsistencies);

  const rules = es.insights.rules;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.insights.title}</h1>
        <p className="text-sm text-neutral-500">{es.insights.subtitle}</p>
      </header>

      {hits.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.insights.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {hits.map((hit) => {
            const copy = rules[hit.key as keyof typeof rules];
            const positive = hit.tone === "positive";
            return (
              <article
                key={hit.key}
                className={`flex flex-col gap-1 rounded-lg border p-4 ${
                  positive
                    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
                    : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                }`}
              >
                <h2 className="text-sm font-semibold">{copy.title}</h2>
                <p className="text-sm">{fill(copy.explain, hit.data)}</p>
                <p className="text-xs text-neutral-500">
                  {es.insights.source}:{" "}
                  {Object.entries(hit.data)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ")}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <section className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">{es.insights.inconsistenciesTitle}</h2>
        <p className="text-xs text-neutral-500">{es.insights.inconsistenciesHint}</p>
        {issues.length === 0 ? (
          <p className="text-sm text-neutral-500">{es.insights.noInconsistencies}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-red-500">⚠</span>
                <span>
                  {issue.kind === "goal_no_area"
                    ? fill(es.insights.inconsistency.goal_no_area, { count: issue.count })
                    : issue.kind === "invariant_broken_ref"
                      ? fill(es.insights.inconsistency.invariant_broken_ref, { name: issue.name })
                      : fill(es.insights.inconsistency.routine_no_requirements, {
                          name: issue.name,
                        })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
