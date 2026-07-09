-- CreateEnum
CREATE TYPE "habit_status" AS ENUM ('detected', 'analysis', 'correction', 'verification', 'overcome');

-- CreateEnum
CREATE TYPE "habit_severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "checkin_result" AS ENUM ('done', 'occurrence', 'skipped');

-- CreateEnum
CREATE TYPE "invariant_status" AS ENUM ('holding', 'violated');

-- CreateTable
CREATE TABLE "state_machines" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "states" JSONB NOT NULL,
    "transitions" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "state_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habits" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_text" TEXT,
    "severity" "habit_severity" NOT NULL DEFAULT 'medium',
    "status" "habit_status" NOT NULL DEFAULT 'detected',
    "version" INTEGER NOT NULL DEFAULT 1,
    "analysis_days" INTEGER NOT NULL DEFAULT 7,
    "verification_rule" JSONB NOT NULL,
    "witness_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_checkins" (
    "id" UUID NOT NULL,
    "habit_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "result" "checkin_result" NOT NULL,
    "note" TEXT,
    "validated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_transitions" (
    "id" UUID NOT NULL,
    "habit_id" UUID NOT NULL,
    "from_status" "habit_status",
    "to_status" "habit_status" NOT NULL,
    "reason" TEXT,
    "actor_id" UUID NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invariants" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID,
    "name" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "status" "invariant_status" NOT NULL DEFAULT 'holding',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invariants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invariant_violations" (
    "id" UUID NOT NULL,
    "invariant_id" UUID NOT NULL,
    "triggered_by_event" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invariant_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "state_machines_key_key" ON "state_machines"("key");

-- CreateIndex
CREATE INDEX "habits_workspace_id_idx" ON "habits"("workspace_id");

-- CreateIndex
CREATE INDEX "habit_checkins_habit_id_idx" ON "habit_checkins"("habit_id");

-- CreateIndex
CREATE UNIQUE INDEX "habit_checkins_habit_id_date_key" ON "habit_checkins"("habit_id", "date");

-- CreateIndex
CREATE INDEX "habit_transitions_habit_id_idx" ON "habit_transitions"("habit_id");

-- CreateIndex
CREATE INDEX "habit_transitions_at_idx" ON "habit_transitions"("at");

-- CreateIndex
CREATE INDEX "invariants_workspace_id_idx" ON "invariants"("workspace_id");

-- CreateIndex
CREATE INDEX "invariant_violations_invariant_id_idx" ON "invariant_violations"("invariant_id");

-- CreateIndex
CREATE INDEX "invariant_violations_at_idx" ON "invariant_violations"("at");

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_checkins" ADD CONSTRAINT "habit_checkins_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_transitions" ADD CONSTRAINT "habit_transitions_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invariants" ADD CONSTRAINT "invariants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invariant_violations" ADD CONSTRAINT "invariant_violations_invariant_id_fkey" FOREIGN KEY ("invariant_id") REFERENCES "invariants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
