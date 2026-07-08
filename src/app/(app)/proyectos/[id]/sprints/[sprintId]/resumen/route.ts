import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sprint"
  );
}

// GET /proyectos/[id]/sprints/[sprintId]/resumen → downloads the stored sprint
// summary as Markdown (RF2.5 / RNF6).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; sprintId: string }> },
) {
  const { id, sprintId } = await params;
  const ctx = await getWorkspaceContext();

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { name: true, summaryMd: true, project: { select: { id: true, workspaceId: true } } },
  });
  if (
    !sprint ||
    sprint.project.id !== id ||
    sprint.project.workspaceId !== ctx.workspace.id ||
    !sprint.summaryMd
  ) {
    return new Response("Not found", { status: 404 });
  }

  const filename = `resumen-sprint-${slugify(sprint.name)}.md`;
  return new Response(sprint.summaryMd, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
