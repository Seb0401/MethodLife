import { Sparkles, AlertTriangle } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { gatherInsightData } from "@/lib/insights/facts";
import { evaluateInsights } from "@/domain/insights/catalog";
import { detectInconsistencies } from "@/domain/insights/inconsistencies";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
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
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.insights.title}
        subtitle={es.insights.subtitle}
        icon={<Sparkles className="size-5" />}
      />

      {hits.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{es.insights.empty}</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {hits.map((hit) => {
            const copy = rules[hit.key as keyof typeof rules];
            const positive = hit.tone === "positive";
            return (
              <article
                key={hit.key}
                className={`flex flex-col gap-1 rounded-card border p-4 ${
                  positive
                    ? "border-emerald-900 bg-emerald-950/40"
                    : "border-amber-900 bg-amber-950/40"
                }`}
              >
                <h2
                  className={`text-sm font-semibold ${positive ? "text-emerald-300" : "text-amber-300"}`}
                >
                  {copy.title}
                </h2>
                <p className="text-sm text-foreground">{fill(copy.explain, hit.data)}</p>
                <p className="text-xs text-muted">
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

      <Card className="flex flex-col gap-2 p-4">
        <h2 className="text-lg font-semibold text-foreground">
          {es.insights.inconsistenciesTitle}
        </h2>
        <p className="text-xs text-muted">{es.insights.inconsistenciesHint}</p>
        {issues.length === 0 ? (
          <p className="text-sm text-muted">{es.insights.noInconsistencies}</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-center gap-2">
                <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
                <span className="text-foreground">
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
      </Card>
    </div>
  );
}
