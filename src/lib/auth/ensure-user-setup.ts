import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { es } from "@/lib/i18n/es";

// Idempotent: creates the profile and the personal workspace for the
// authenticated user on first login (RF1.1). Safe to call on every session.
export async function ensureUserSetup() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const existing = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (existing) return;

  const displayName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    user.email?.split("@")[0] ||
    "Usuario";

  try {
    await prisma.$transaction([
      prisma.profile.create({ data: { userId: user.id, displayName } }),
      prisma.workspace.create({
        data: {
          name: es.workspace.personalName,
          type: "personal",
          ownerId: user.id,
          members: { create: { userId: user.id, role: "owner" } },
        },
      }),
    ]);
  } catch (e) {
    // Concurrent first-request race: another request already created the profile.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return;
    throw e;
  }
}
