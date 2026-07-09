import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureUserSetup } from "@/lib/auth/ensure-user-setup";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { setActiveWorkspace } from "@/actions/workspace";
import { signOut } from "@/app/(auth)/actions";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { es } from "@/lib/i18n/es";

const NAV_ITEMS = [
  { href: "/hoy", label: es.nav.hoy },
  { href: "/inbox", label: es.nav.inbox },
  { href: "/buscar", label: es.nav.buscar },
  { href: "/areas", label: es.nav.areas },
  { href: "/trazabilidad", label: es.nav.trazabilidad },
  { href: "/proyectos", label: es.nav.proyectos },
  { href: "/habitos", label: es.nav.habitos },
  { href: "/rutinas", label: es.nav.rutinas },
  { href: "/invariantes", label: es.nav.invariantes },
  { href: "/mapa", label: es.nav.mapa },
  { href: "/insights", label: es.nav.insights },
  { href: "/metodos", label: es.nav.metodos },
  { href: "/workspace", label: es.nav.workspace },
];

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await ensureUserSetup();
  const ctx = await getWorkspaceContext();
  const [profile, memberships] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: ctx.user.id } }),
    prisma.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col gap-6 border-r border-neutral-200 p-4 dark:border-neutral-800">
        <Link href="/hoy" className="px-3 text-lg font-bold">
          {es.app.name}
        </Link>

        <SidebarNav items={NAV_ITEMS} />

        <div className="mt-auto flex flex-col gap-3">
          <div>
            <p className="px-3 pb-1 text-xs font-medium uppercase text-neutral-400">
              {es.workspace.selectorLabel}
            </p>
            <div className="flex flex-col">
              {memberships.map(({ workspace }) =>
                workspace.id === ctx.workspace.id ? (
                  <span
                    key={workspace.id}
                    className="rounded-md bg-neutral-200 px-3 py-1.5 text-sm font-medium dark:bg-neutral-800"
                  >
                    {workspace.name}
                  </span>
                ) : (
                  <form key={workspace.id} action={setActiveWorkspace}>
                    <input type="hidden" name="workspaceId" value={workspace.id} />
                    <button
                      type="submit"
                      className="w-full rounded-md px-3 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
                    >
                      {workspace.name}
                    </button>
                  </form>
                ),
              )}
            </div>
          </div>

          <div className="border-t border-neutral-200 px-3 pt-3 dark:border-neutral-800">
            <p className="truncate text-sm">{profile?.displayName ?? ctx.user.email}</p>
            <form action={signOut}>
              <button type="submit" className="text-sm text-neutral-500 underline">
                {es.auth.logout}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
