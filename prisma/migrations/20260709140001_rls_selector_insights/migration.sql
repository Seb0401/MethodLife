-- Row Level Security for the Fase 5 tables (roadmap 5.1 / DoD rule 5). Server
-- writes go through Prisma (owner, bypasses RLS); these policies only guard
-- direct access with the publishable key.

ALTER TABLE "method_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flow_diagrams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "insight_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "insights" ENABLE ROW LEVEL SECURITY;

-- Method decisions reach the workspace through their project.
CREATE POLICY "members_read_method_decisions" ON "method_decisions"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = "method_decisions".project_id
        AND public.is_workspace_member(p.workspace_id)
    )
  );

-- Workspace-scoped tables: direct membership check.
CREATE POLICY "members_read_flow_diagrams" ON "flow_diagrams"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "members_read_insights" ON "insights"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Insight rules: system rows (null workspace) are readable by any signed-in user;
-- workspace rows only by members.
CREATE POLICY "read_insight_rules" ON "insight_rules"
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
