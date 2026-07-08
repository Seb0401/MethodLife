-- CreateEnum
CREATE TYPE "sprint_status" AS ENUM ('planned', 'active', 'closed');

-- CreateEnum
CREATE TYPE "project_role_type" AS ENUM ('po', 'sm', 'dev');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "sprint_id" UUID;

-- CreateTable
CREATE TABLE "sprints" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" DATE NOT NULL,
    "ends_at" DATE NOT NULL,
    "status" "sprint_status" NOT NULL DEFAULT 'planned',
    "velocity" INTEGER,
    "summary_md" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrospectives" (
    "id" UUID NOT NULL,
    "sprint_id" UUID NOT NULL,
    "went_well" TEXT,
    "to_improve" TEXT,
    "actions" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "retrospectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_roles" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "project_role_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_roles_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateIndex
CREATE INDEX "sprints_project_id_idx" ON "sprints"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "retrospectives_sprint_id_key" ON "retrospectives"("sprint_id");

-- CreateIndex
CREATE INDEX "project_roles_user_id_idx" ON "project_roles"("user_id");

-- CreateIndex
CREATE INDEX "tasks_sprint_id_idx" ON "tasks"("sprint_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrospectives" ADD CONSTRAINT "retrospectives_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
