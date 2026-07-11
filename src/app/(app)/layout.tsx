import Link from "next/link";
import { LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureUserSetup } from "@/lib/auth/ensure-user-setup";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { setActiveWorkspace } from "@/actions/workspace";
import { signOut } from "@/app/(auth)/actions";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { es } from "@/lib/i18n/es";

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
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-64 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-4">
        <Link href="/hoy" className="flex items-center gap-2 px-3 pt-1">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-sm font-black text-accent-fg">
            M
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">{es.app.name}</span>
        </Link>

        <SidebarNav />

        <div className="mt-auto flex flex-col gap-3">
          <div>
            <p className="px-3 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
              {es.workspace.selectorLabel}
            </p>
            <div className="flex flex-col gap-0.5">
              {memberships.map(({ workspace }) =>
                workspace.id === ctx.workspace.id ? (
                  <span
                    key={workspace.id}
                    className="rounded-lg bg-accent-subtle px-3 py-1.5 text-sm font-medium text-accent-hover"
                  >
                    {workspace.name}
                  </span>
                ) : (
                  <form key={workspace.id} action={setActiveWorkspace}>
                    <input type="hidden" name="workspaceId" value={workspace.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-muted transition-colors hover:bg-elevated hover:text-foreground"
                    >
                      {workspace.name}
                    </button>
                  </form>
                ),
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-3 pt-3">
            <p className="min-w-0 truncate text-sm text-muted">
              {profile?.displayName ?? ctx.user.email}
            </p>
            <form action={signOut}>
              <button
                type="submit"
                aria-label={es.auth.logout}
                title={es.auth.logout}
                className="flex size-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-elevated hover:text-red-400"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl flex-1 p-8">{children}</main>
    </div>
  );
}
