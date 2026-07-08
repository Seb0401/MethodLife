-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "due_date" DATE;

-- CreateIndex
CREATE INDEX "tasks_workspace_id_due_date_idx" ON "tasks"("workspace_id", "due_date");
