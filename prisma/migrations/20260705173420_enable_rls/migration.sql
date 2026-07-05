-- Row Level Security baseline (roadmap 0.5).
-- Server-side writes go through Prisma as the table owner (postgres), which
-- RLS does not restrict. These policies protect direct access with the
-- publishable key (supabase-js in the browser, Realtime).

-- Prisma's shadow database lacks the Supabase auth schema; stub auth.uid()
-- there so this migration validates. No-op on the real database.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
  END IF;
END
$do$;

ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: checks membership without triggering recursive
-- policy evaluation on workspace_members.
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = ws AND m.user_id = (SELECT auth.uid())
  );
$$;

-- Read: only members of the workspace. Writes have no policies on purpose:
-- they are denied for anon/authenticated and happen only via server actions.
CREATE POLICY "members_read_workspaces" ON "workspaces"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id));

CREATE POLICY "members_read_memberships" ON "workspace_members"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "own_profile_read" ON "profiles"
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "own_profile_update" ON "profiles"
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
