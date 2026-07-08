import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { loadFlowMetrics } from "@/lib/kanban/flow";
import { flowMetricsToMarkdown } from "@/domain/kanban/report";
import { es } from "@/lib/i18n/es";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "proyecto"
  );
}

// GET /proyectos/[id]/reporte → downloads the board's flow metrics as Markdown (RNF6).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();

  const project = await prisma.project.findUnique({
    where: { id },
    select: { workspaceId: true, name: true, method: true },
  });
  if (!project || project.workspaceId !== ctx.workspace.id || project.method !== "kanban") {
    return new Response("Not found", { status: 404 });
  }

  const now = new Date();
  const metrics = await loadFlowMetrics(id);
  const markdown = flowMetricsToMarkdown({
    projectName: project.name,
    methodName: es.projects.methods[project.method],
    generatedAt: now,
    metrics,
    labels: es.kanban.report,
  });

  const filename = `reporte-${slugify(project.name)}-${now.toISOString().slice(0, 10)}.md`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
