-- Row Level Security for workspace invitations (roadmap 2.8 / DoD rule 5).
-- Same model as before: writes go through Prisma as the table owner (postgres)
-- and bypass RLS; acceptance is a server action, so the browser never needs to
-- read an invitation by token. Only workspace members may read the list.

ALTER TABLE "workspace_invitations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_workspace_invitations" ON "workspace_invitations"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
