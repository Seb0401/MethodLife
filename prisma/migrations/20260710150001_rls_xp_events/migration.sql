-- Row Level Security for the XP ledger (roadmap Fase 6.2 / DoD rule 5). XP is
-- server-authoritative (design rule 1): only the game's server writes rows
-- (through Prisma, which bypasses RLS), so there is no INSERT/UPDATE/DELETE
-- policy — the publishable key can never fabricate XP. Users may only read their
-- own ledger.

ALTER TABLE "xp_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_xp_events" ON "xp_events"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
