import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { loadTraceability } from "@/lib/traceability/matrix";
import { traceabilityMatrixToMarkdown } from "@/domain/traceability/report";
import { es } from "@/lib/i18n/es";

// GET /trazabilidad/matriz → downloads the traceability matrix as Markdown (RNF6).
export async function GET() {
  const ctx = await getWorkspaceContext();
  const { goals, projects, counts, deadIds, orphanCount, links } = await loadTraceability(
    ctx.workspace.id,
  );

  const now = new Date();
  const markdown = traceabilityMatrixToMarkdown({
    goals: goals.map((g) => ({ id: g.id, title: g.title, dead: deadIds.has(g.id) })),
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    counts: Object.fromEntries(counts),
    orphanCount,
    links: links.map((l) => ({ from: l.fromGoal.title, to: l.toGoal.title, type: l.type })),
    generatedAt: now,
    labels: {
      title: es.traceability.matrixTitle,
      generated: es.kanban.report.generated,
      goal: es.traceability.goal,
      total: es.traceability.total,
      deadTitle: es.traceability.deadTitle,
      deadMark: es.traceability.deadMark,
      orphanTitle: es.traceability.orphanTitle,
      linksTitle: es.traceability.linksTitle,
      linkTypes: es.traceability.linkTypes,
      none: es.traceability.none,
    },
  });

  const filename = `trazabilidad-${now.toISOString().slice(0, 10)}.md`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
