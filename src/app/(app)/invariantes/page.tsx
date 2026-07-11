import { ShieldCheck } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { toggleInvariant, deleteInvariant } from "@/actions/invariants";
import { parseRule, type InvariantRule } from "@/domain/formal/invariant";
import { InvariantForm } from "@/components/invariants/invariant-form";
import { FormError } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { actionErrorMessage } from "@/lib/forms";
import { es } from "@/lib/i18n/es";

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });

// Builds a Spanish one-line summary of a rule (RF6.4 panel).
function summarize(rule: InvariantRule, areaName: string | undefined): string {
  const t = es.invariants.ruleSummary;
  switch (rule.type) {
    case "wip_max":
      return t.wip_max.replace("{n}", String(rule.max));
    case "column_max":
      return t.column_max.replace("{n}", String(rule.max));
    case "area_min_per_week":
      return t.area_min_per_week
        .replace("{n}", String(rule.min))
        .replace("{area}", areaName ?? es.invariants.unknownArea);
  }
}

function num(value: unknown): string {
  return typeof value === "number" ? String(value) : es.kanban.metrics.na;
}

export default async function InvariantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getWorkspaceContext();

  const [invariants, areas] = await Promise.all([
    prisma.invariant.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "asc" },
      include: { violations: { orderBy: { at: "asc" } } },
    }),
    prisma.lifeArea.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const areaName = new Map(areas.map((a) => [a.id, a.name]));

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.invariants.title}
        subtitle={es.invariants.subtitle}
        icon={<ShieldCheck className="size-5" />}
      />

      <FormError message={actionErrorMessage(error)} />

      <InvariantForm areas={areas} />

      {invariants.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{es.invariants.empty}</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {invariants.map((inv) => {
            const rule = parseRule(inv.rule);
            const area =
              rule && rule.type === "area_min_per_week" ? areaName.get(rule.areaId) : undefined;
            const first = inv.violations[0];
            const recent = [...inv.violations].reverse();
            const violated = inv.status === "violated";

            return (
              <Card key={inv.id} className="flex flex-col gap-3 p-4">
                <header className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{inv.name}</h2>
                  <Badge variant={violated ? "danger" : "success"}>
                    {violated ? es.invariants.statuses.violated : es.invariants.statuses.holding}
                  </Badge>
                  {!inv.enabled && <Badge>{es.invariants.disabled}</Badge>}
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <form action={toggleInvariant}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button
                        type="submit"
                        className="text-muted transition-colors hover:text-foreground"
                      >
                        {inv.enabled ? es.invariants.disable : es.invariants.enable}
                      </button>
                    </form>
                    <form action={deleteInvariant}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button
                        type="submit"
                        className="text-faint transition-colors hover:text-red-400"
                      >
                        {es.invariants.delete}
                      </button>
                    </form>
                  </div>
                </header>

                <p className="text-sm text-muted">
                  {rule ? summarize(rule, area) : es.actionErrors.INVARIANT_INVALID_RULE}
                </p>

                <div className="border-t border-border pt-2 text-sm">
                  <p className="font-medium text-foreground">
                    {es.invariants.violationsTitle}{" "}
                    <span className="text-faint">({inv.violations.length})</span>
                  </p>
                  {inv.violations.length === 0 ? (
                    <p className="text-muted">{es.invariants.noViolations}</p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-1">
                      {recent.slice(0, 5).map((v) => {
                        const d = (v.details ?? {}) as Record<string, unknown>;
                        return (
                          <li key={v.id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted">{dateFmt.format(v.at)}</span>
                            <span className="text-foreground">
                              {es.invariants.violationLine
                                .replace("{actual}", num(d.actual))
                                .replace("{limit}", num(d.limit))
                                .replace("{event}", v.triggeredBy)}
                            </span>
                            {first && v.id === first.id && (
                              <Badge variant="warning">{es.invariants.firstViolation}</Badge>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
