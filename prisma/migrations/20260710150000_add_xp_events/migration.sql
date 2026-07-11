-- Bridge to gamification (roadmap Fase 6.2). Immutable XP ledger consumed by the
-- separate RPG app (MethodLife-game) over the same database. Each row is one XP
-- award derived from an already-recorded system event (task transition, habit
-- check-in, sprint close, ...). No FK on user_id: the auth schema is managed by
-- Supabase. INSERT-only by design; metrics/levels derive from these rows.

-- CreateTable
CREATE TABLE "xp_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" UUID,
    "amount" INTEGER NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_events_user_id_at_idx" ON "xp_events"("user_id", "at");
