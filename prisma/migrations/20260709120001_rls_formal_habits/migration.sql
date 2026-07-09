-- Row Level Security for the Fase 3 tables (roadmap 3.1 / DoD rule 5).
-- Same model as prior phases: server-side writes go through Prisma as the table
-- owner (postgres) and bypass RLS; these policies only guard direct access with
-- the publishable key (supabase-js in the browser, Realtime). No write policies:
-- anon/authenticated INSERT/UPDATE/DELETE stay denied, so the event tables
-- (habit_checkins, habit_transitions, invariant_violations) remain append-only
-- from the server exclusively.

ALTER TABLE "state_machines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habit_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habit_transitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invariants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invariant_violations" ENABLE ROW LEVEL SECURITY;

-- State machines are shared, non-sensitive definitions: any signed-in user may read.
CREATE POLICY "authenticated_read_state_machines" ON "state_machines"
  FOR SELECT TO authenticated
  USING (true);

-- Workspace-scoped tables: direct membership check.
CREATE POLICY "members_read_habits" ON "habits"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "members_read_invariants" ON "invariants"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Check-in / transition tables reach the workspace through their habit.
CREATE POLICY "members_read_habit_checkins" ON "habit_checkins"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = "habit_checkins".habit_id
        AND public.is_workspace_member(h.workspace_id)
    )
  );

CREATE POLICY "members_read_habit_transitions" ON "habit_transitions"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = "habit_transitions".habit_id
        AND public.is_workspace_member(h.workspace_id)
    )
  );

-- Violations reach the workspace through their invariant.
CREATE POLICY "members_read_invariant_violations" ON "invariant_violations"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invariants i
      WHERE i.id = "invariant_violations".invariant_id
        AND public.is_workspace_member(i.workspace_id)
    )
  );
