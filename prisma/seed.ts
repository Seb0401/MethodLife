import { PrismaClient } from "@prisma/client";
import { es } from "../src/lib/i18n/es";
import { DEFAULT_KANBAN_COLUMNS } from "../src/domain/projects/board";

const prisma = new PrismaClient();

// Idempotent seed (RF1.2 / roadmap 1.2): every existing workspace gets the
// default life areas, and the first personal workspace gets a demo goal and a
// demo Kanban project with its board. Safe to run multiple times.
async function main() {
  const workspaces = await prisma.workspace.findMany({
    include: { _count: { select: { areas: true } } },
  });

  if (workspaces.length === 0) {
    console.log("Seed: no workspaces yet — register a user first, then re-run.");
    return;
  }

  for (const ws of workspaces) {
    if (ws._count.areas === 0) {
      await prisma.lifeArea.createMany({
        data: es.areas.defaults.map((a, i) => ({
          workspaceId: ws.id,
          name: a.name,
          color: a.color,
          icon: a.icon,
          position: i,
        })),
      });
      console.log(`Seed: created ${es.areas.defaults.length} default areas for "${ws.name}".`);
    }
  }

  // Demo goal + Kanban project on the first workspace, only if none exist yet.
  const primary = workspaces[0];
  const projectCount = await prisma.project.count({ where: { workspaceId: primary.id } });
  if (projectCount === 0) {
    const area = await prisma.lifeArea.findFirst({
      where: { workspaceId: primary.id },
      orderBy: { position: "asc" },
    });
    if (area) {
      const goal = await prisma.goal.create({
        data: {
          workspaceId: primary.id,
          areaId: area.id,
          title: "Meta de ejemplo",
          description: "Meta creada por el seed para desarrollo.",
        },
      });
      await prisma.project.create({
        data: {
          workspaceId: primary.id,
          areaId: area.id,
          goalId: goal.id,
          name: "Proyecto Kanban de ejemplo",
          method: "kanban",
          boards: {
            create: {
              name: es.projects.defaultBoardName,
              columns: {
                create: DEFAULT_KANBAN_COLUMNS.map((c) => ({
                  name: es.projects.columns[c.key],
                  position: c.position,
                  wipLimit: c.wipLimit ?? null,
                })),
              },
            },
          },
        },
      });
      console.log(`Seed: created demo goal + Kanban project on "${primary.name}".`);
    }
  }

  console.log("Seed: done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
