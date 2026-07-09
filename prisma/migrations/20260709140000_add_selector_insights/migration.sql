-- CreateTable
CREATE TABLE "method_decisions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "recommended" "project_method" NOT NULL,
    "chosen" "project_method" NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "method_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_diagrams" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flow_diagrams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_rules" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "key" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insight_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "rule_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "method_decisions_project_id_idx" ON "method_decisions"("project_id");

-- CreateIndex
CREATE INDEX "flow_diagrams_workspace_id_idx" ON "flow_diagrams"("workspace_id");

-- CreateIndex
CREATE INDEX "insight_rules_workspace_id_idx" ON "insight_rules"("workspace_id");

-- CreateIndex
CREATE INDEX "insights_workspace_id_idx" ON "insights"("workspace_id");

-- AddForeignKey
ALTER TABLE "method_decisions" ADD CONSTRAINT "method_decisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_diagrams" ADD CONSTRAINT "flow_diagrams_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
