-- Expose `tasks` to Supabase Realtime so board members see each other's card
-- moves without reloading (RF12.4 / roadmap 2.10). Realtime honours the table's
-- RLS SELECT policy, so a client only receives events for tasks in its own
-- workspaces. REPLICA IDENTITY FULL makes the old row (incl. column_id) available
-- on UPDATE/DELETE payloads for client-side board scoping.
-- All guarded so it is idempotent and safe on Prisma's shadow database, which
-- has no `supabase_realtime` publication.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER TABLE public.tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;
