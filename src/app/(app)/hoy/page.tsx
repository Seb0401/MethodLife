import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { es } from "@/lib/i18n/es";

export default async function HoyPage() {
  const ctx = await getWorkspaceContext();
  const profile = await prisma.profile.findUnique({ where: { userId: ctx.user.id } });

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">{es.nav.hoy}</h1>
      <p className="text-neutral-500">
        {es.home.greeting}, {profile?.displayName ?? ctx.user.email} · {ctx.workspace.name}
      </p>
      <span className="w-fit rounded-full border border-neutral-300 px-4 py-1 text-sm text-neutral-500 dark:border-neutral-700">
        {es.home.status}
      </span>
    </div>
  );
}
