-- Row Level Security for the Kanban core tables (roadmap 1.1 / DoD rule 5).
-- Same model as 0.5: server-side writes go through Prisma as the table owner
-- (postgres) and bypass RLS; these policies only guard direct access with the
-- publishable key (supabase-js in the browser, Realtime). No write policies:
-- anon/authenticated INSERT/UPDATE/DELETE stay denied, so event tables like
-- task_transitions remain append-only from the server exclusively.

ALTER TABLE "life_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "boards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "board_columns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_transitions" ENABLE ROW LEVEL SECURITY;

-- Workspace-scoped tables: direct membership check.
CREATE POLICY "members_read_life_areas" ON "life_areas"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "members_read_goals" ON "goals"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "members_read_projects" ON "projects"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "members_read_tasks" ON "tasks"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Board/column/transition tables reach the workspace through their parent.
CREATE POLICY "members_read_boards" ON "boards"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = "boards".project_id
        AND public.is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "members_read_board_columns" ON "board_columns"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      JOIN public.projects p ON p.id = b.project_id
      WHERE b.id = "board_columns".board_id
        AND public.is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "members_read_task_transitions" ON "task_transitions"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = "task_transitions".task_id
        AND public.is_workspace_member(t.workspace_id)
    )
  );
