import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { toggleInvariant, deleteInvariant } from "@/actions/invariants";
import { parseRule, type InvariantRule } from "@/domain/formal/invariant";
import { InvariantForm } from "@/components/invariants/invariant-form";
import { FormError } from "@/components/ui/form";
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.invariants.title}</h1>
        <p className="text-sm text-neutral-500">{es.invariants.subtitle}</p>
      </header>

      <FormError message={actionErrorMessage(error)} />

      <InvariantForm areas={areas} />

      {invariants.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.invariants.empty}</p>
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
              <section
                key={inv.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <header className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{inv.name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      violated
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    }`}
                  >
                    {violated ? es.invariants.statuses.violated : es.invariants.statuses.holding}
                  </span>
                  {!inv.enabled && (
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      {es.invariants.disabled}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <form action={toggleInvariant}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button
                        type="submit"
                        className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      >
                        {inv.enabled ? es.invariants.disable : es.invariants.enable}
                      </button>
                    </form>
                    <form action={deleteInvariant}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button type="submit" className="text-neutral-400 hover:text-red-600">
                        {es.invariants.delete}
                      </button>
                    </form>
                  </div>
                </header>

                <p className="text-sm text-neutral-500">
                  {rule ? summarize(rule, area) : es.actionErrors.INVARIANT_INVALID_RULE}
                </p>

                <div className="border-t border-neutral-100 pt-2 text-sm dark:border-neutral-800">
                  <p className="font-medium">
                    {es.invariants.violationsTitle}{" "}
                    <span className="text-neutral-400">({inv.violations.length})</span>
                  </p>
                  {inv.violations.length === 0 ? (
                    <p className="text-neutral-500">{es.invariants.noViolations}</p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-1">
                      {recent.slice(0, 5).map((v) => {
                        const d = (v.details ?? {}) as Record<string, unknown>;
                        return (
                          <li key={v.id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-neutral-500">{dateFmt.format(v.at)}</span>
                            <span>
                              {es.invariants.violationLine
                                .replace("{actual}", num(d.actual))
                                .replace("{limit}", num(d.limit))
                                .replace("{event}", v.triggeredBy)}
                            </span>
                            {first && v.id === first.id && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                {es.invariants.firstViolation}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
