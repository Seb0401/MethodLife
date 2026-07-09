import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { routineReportToMarkdown } from "@/domain/routines/report";
import {
  compliancePercent,
  consolidateResults,
  type EvaluationResult,
} from "@/domain/routines/evaluation";
import { es } from "@/lib/i18n/es";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "rutina"
  );
}

// GET /rutinas/[id]/informe → downloads a routine's history as Markdown (RNF6).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();

  const routine = await prisma.routine.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { number: "asc" },
        include: {
          requirements: {
            orderBy: { position: "asc" },
            include: { evaluations: { select: { date: true, result: true } } },
          },
        },
      },
    },
  });
  if (!routine || routine.workspaceId !== ctx.workspace.id) {
    return new Response("Not found", { status: 404 });
  }

  const versions = routine.versions.map((v) => ({
    number: v.number,
    closed: v.closedAt !== null,
    decisionLabel: v.decision ? es.routines.decisions[v.decision] : null,
    justification: v.justification,
    requirements: v.requirements.map((r) => {
      const byDay = new Map<string, EvaluationResult[]>();
      for (const e of r.evaluations) {
        const key = e.date.toISOString().slice(0, 10);
        const list = byDay.get(key) ?? [];
        list.push(e.result);
        byDay.set(key, list);
      }
      const consolidated = [...byDay.values()].map(consolidateResults);
      return {
        text: r.text,
        inherited: r.inheritedFrom !== null,
        compliancePercent: compliancePercent(consolidated),
      };
    }),
  }));

  const now = new Date();
  const markdown = routineReportToMarkdown({
    routineName: routine.name,
    kindLabel: es.routines.kinds[routine.prototypeKind],
    generatedAt: now,
    versions,
    labels: {
      title: es.routines.reportTitle,
      generated: es.kanban.report.generated,
      kind: es.routines.kind,
      version: es.routines.version,
      open: es.routines.open,
      closed: es.routines.closed,
      decision: es.routines.decisionLabel,
      compliance: es.routines.compliance,
      inherited: es.routines.inherited,
      none: es.routines.noRequirements,
    },
  });

  const filename = `rutina-${slugify(routine.name)}-${now.toISOString().slice(0, 10)}.md`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
