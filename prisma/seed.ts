import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo data (workspace + boards for the three modes) arrives with Fase 1,
// once auth exists and seed users can be created (see docs/ROADMAP.md 1.2).
async function main() {
  const workspaces = await prisma.workspace.count();
  console.log(`Seed: nothing to do yet (workspaces in db: ${workspaces}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
