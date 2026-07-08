-- Row Level Security for the Scrum core tables (roadmap 2.1 / DoD rule 5).
-- Same model as 0.5 and 1.1: server-side writes go through Prisma as the table
-- owner (postgres) and bypass RLS; these policies only guard direct access with
-- the publishable key (supabase-js in the browser, Realtime). No write policies:
-- anon/authenticated INSERT/UPDATE/DELETE stay denied.

ALTER TABLE "sprints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retrospectives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_roles" ENABLE ROW LEVEL SECURITY;

-- Sprints and project roles reach the workspace through their project.
CREATE POLICY "members_read_sprints" ON "sprints"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = "sprints".project_id
        AND public.is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "members_read_project_roles" ON "project_roles"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = "project_roles".project_id
        AND public.is_workspace_member(p.workspace_id)
    )
  );

-- Retrospectives reach the workspace through sprint -> project.
CREATE POLICY "members_read_retrospectives" ON "retrospectives"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = "retrospectives".sprint_id
        AND public.is_workspace_member(p.workspace_id)
    )
  );
