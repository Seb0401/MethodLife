import { PrismaClient, Prisma } from "@prisma/client";
import { es } from "../src/lib/i18n/es";
import { DEFAULT_KANBAN_COLUMNS } from "../src/domain/projects/board";
import { SEED_MACHINES, toStoredMachine } from "../src/domain/formal/machines";

const prisma = new PrismaClient();

// Idempotent seed (RF1.2 / roadmap 1.2 / 3.2): the state machine definitions,
// every workspace's default life areas, and a demo goal + Kanban project on the
// first personal workspace. Safe to run multiple times.
async function main() {
  // Data-driven state machines (roadmap 3.2): upsert by key so re-runs refresh
  // the definitions without duplicating rows.
  for (const def of SEED_MACHINES) {
    const stored = toStoredMachine(def);
    await prisma.stateMachine.upsert({
      where: { key: stored.key },
      create: {
        key: stored.key,
        states: stored.states as Prisma.InputJsonValue,
        transitions: stored.transitions as unknown as Prisma.InputJsonValue,
      },
      update: {
        states: stored.states as Prisma.InputJsonValue,
        transitions: stored.transitions as unknown as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`Seed: upserted ${SEED_MACHINES.length} state machines.`);

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

  // Demo invariant so the insights catalog has something to fire on (roadmap 5.7
  // acceptance): a holding WIP ceiling triggers the "all_invariants_holding" insight.
  const invariantCount = await prisma.invariant.count({ where: { workspaceId: primary.id } });
  if (invariantCount === 0) {
    await prisma.invariant.create({
      data: {
        workspaceId: primary.id,
        ownerId: primary.ownerId,
        name: "WIP total ≤ 3",
        rule: { type: "wip_max", max: 3 },
      },
    });
    console.log(`Seed: created demo invariant on "${primary.name}".`);
  }

  console.log("Seed: done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
