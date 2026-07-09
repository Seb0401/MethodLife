-- Row Level Security for the Fase 4 tables (roadmap 4.1 / DoD rule 5). Same
-- model as prior phases: server writes go through Prisma (owner, bypasses RLS);
-- these policies only guard direct access with the publishable key. No write
-- policies, so the event tables (feature_status_events, routine_evaluations)
-- stay append-only from the server.

ALTER TABLE "feature_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "features" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_status_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goal_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routine_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routine_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routine_evaluations" ENABLE ROW LEVEL SECURITY;

-- Feature sets reach the workspace through their goal.
CREATE POLICY "members_read_feature_sets" ON "feature_sets"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = "feature_sets".goal_id
        AND public.is_workspace_member(g.workspace_id)
    )
  );

-- Features reach the workspace through feature_set -> goal.
CREATE POLICY "members_read_features" ON "features"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feature_sets fs
      JOIN public.goals g ON g.id = fs.goal_id
      WHERE fs.id = "features".feature_set_id
        AND public.is_workspace_member(g.workspace_id)
    )
  );

CREATE POLICY "members_read_feature_status_events" ON "feature_status_events"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.features f
      JOIN public.feature_sets fs ON fs.id = f.feature_set_id
      JOIN public.goals g ON g.id = fs.goal_id
      WHERE f.id = "feature_status_events".feature_id
        AND public.is_workspace_member(g.workspace_id)
    )
  );

-- Goal links reach the workspace through the source goal.
CREATE POLICY "members_read_goal_links" ON "goal_links"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = "goal_links".from_goal_id
        AND public.is_workspace_member(g.workspace_id)
    )
  );

-- Routine tables: routines carry workspace_id directly; the rest chain up.
CREATE POLICY "members_read_routines" ON "routines"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "members_read_routine_versions" ON "routine_versions"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routines r
      WHERE r.id = "routine_versions".routine_id
        AND public.is_workspace_member(r.workspace_id)
    )
  );

CREATE POLICY "members_read_routine_requirements" ON "routine_requirements"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_versions rv
      JOIN public.routines r ON r.id = rv.routine_id
      WHERE rv.id = "routine_requirements".version_id
        AND public.is_workspace_member(r.workspace_id)
    )
  );

CREATE POLICY "members_read_routine_evaluations" ON "routine_evaluations"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_requirements rq
      JOIN public.routine_versions rv ON rv.id = rq.version_id
      JOIN public.routines r ON r.id = rv.routine_id
      WHERE rq.id = "routine_evaluations".requirement_id
        AND public.is_workspace_member(r.workspace_id)
    )
  );
