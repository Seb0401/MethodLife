-- CreateEnum
CREATE TYPE "feature_status" AS ENUM ('design', 'design_reviewed', 'build', 'build_reviewed', 'done');

-- CreateEnum
CREATE TYPE "prototype_kind" AS ENUM ('throwaway', 'evolutionary');

-- CreateEnum
CREATE TYPE "routine_decision" AS ENUM ('evolve', 'discard', 'approve');

-- CreateEnum
CREATE TYPE "evaluation_result" AS ENUM ('met', 'not_met');

-- CreateEnum
CREATE TYPE "goal_link_type" AS ENUM ('depends_on', 'refines', 'conflicts');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "feature_id" UUID;

-- CreateTable
CREATE TABLE "feature_sets" (
    "id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feature_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" UUID NOT NULL,
    "feature_set_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "estimate" INTEGER,
    "owner_id" UUID,
    "status" "feature_status" NOT NULL DEFAULT 'design',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_status_events" (
    "id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "from_status" "feature_status",
    "to_status" "feature_status" NOT NULL,
    "actor_id" UUID NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_links" (
    "id" UUID NOT NULL,
    "from_goal_id" UUID NOT NULL,
    "to_goal_id" UUID NOT NULL,
    "type" "goal_link_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prototype_kind" "prototype_kind" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_versions" (
    "id" UUID NOT NULL,
    "routine_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "decision" "routine_decision",
    "justification" TEXT,

    CONSTRAINT "routine_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_requirements" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "inherited_from" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_evaluations" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "evaluator_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "result" "evaluation_result" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feature_sets_goal_id_idx" ON "feature_sets"("goal_id");

-- CreateIndex
CREATE INDEX "features_feature_set_id_idx" ON "features"("feature_set_id");

-- CreateIndex
CREATE INDEX "feature_status_events_feature_id_idx" ON "feature_status_events"("feature_id");

-- CreateIndex
CREATE INDEX "feature_status_events_at_idx" ON "feature_status_events"("at");

-- CreateIndex
CREATE INDEX "goal_links_from_goal_id_idx" ON "goal_links"("from_goal_id");

-- CreateIndex
CREATE INDEX "goal_links_to_goal_id_idx" ON "goal_links"("to_goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "goal_links_from_goal_id_to_goal_id_type_key" ON "goal_links"("from_goal_id", "to_goal_id", "type");

-- CreateIndex
CREATE INDEX "routines_workspace_id_idx" ON "routines"("workspace_id");

-- CreateIndex
CREATE INDEX "routine_versions_routine_id_idx" ON "routine_versions"("routine_id");

-- CreateIndex
CREATE UNIQUE INDEX "routine_versions_routine_id_number_key" ON "routine_versions"("routine_id", "number");

-- CreateIndex
CREATE INDEX "routine_requirements_version_id_idx" ON "routine_requirements"("version_id");

-- CreateIndex
CREATE INDEX "routine_evaluations_requirement_id_idx" ON "routine_evaluations"("requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "routine_evaluations_requirement_id_evaluator_id_date_key" ON "routine_evaluations"("requirement_id", "evaluator_id", "date");

-- CreateIndex
CREATE INDEX "tasks_feature_id_idx" ON "tasks"("feature_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_sets" ADD CONSTRAINT "feature_sets_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_feature_set_id_fkey" FOREIGN KEY ("feature_set_id") REFERENCES "feature_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_status_events" ADD CONSTRAINT "feature_status_events_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_from_goal_id_fkey" FOREIGN KEY ("from_goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_to_goal_id_fkey" FOREIGN KEY ("to_goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_versions" ADD CONSTRAINT "routine_versions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_requirements" ADD CONSTRAINT "routine_requirements_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "routine_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_requirements" ADD CONSTRAINT "routine_requirements_inherited_from_fkey" FOREIGN KEY ("inherited_from") REFERENCES "routine_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_evaluations" ADD CONSTRAINT "routine_evaluations_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "routine_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
