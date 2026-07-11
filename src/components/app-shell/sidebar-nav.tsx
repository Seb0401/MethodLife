"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Inbox,
  Search,
  Target,
  FolderKanban,
  GitBranch,
  Repeat,
  ListChecks,
  ShieldCheck,
  Network,
  Sparkles,
  Compass,
  Users,
  type LucideIcon,
} from "lucide-react";
import { es } from "@/lib/i18n/es";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavSection = { title?: string; items: NavItem[] };

// Grouping the modules into labelled sections makes the growing nav easier to
// scan than one flat list. Icons live here (a client component) because Lucide
// components can't be passed as props from a Server Component.
const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/resumen", label: es.nav.resumen, icon: LayoutDashboard },
      { href: "/hoy", label: es.nav.hoy, icon: CalendarDays },
      { href: "/inbox", label: es.nav.inbox, icon: Inbox },
      { href: "/buscar", label: es.nav.buscar, icon: Search },
    ],
  },
  {
    title: es.nav.sections.organize,
    items: [
      { href: "/areas", label: es.nav.areas, icon: Target },
      { href: "/proyectos", label: es.nav.proyectos, icon: FolderKanban },
      { href: "/trazabilidad", label: es.nav.trazabilidad, icon: GitBranch },
    ],
  },
  {
    title: es.nav.sections.constancy,
    items: [
      { href: "/habitos", label: es.nav.habitos, icon: Repeat },
      { href: "/rutinas", label: es.nav.rutinas, icon: ListChecks },
      { href: "/invariantes", label: es.nav.invariantes, icon: ShieldCheck },
    ],
  },
  {
    title: es.nav.sections.analyze,
    items: [
      { href: "/mapa", label: es.nav.mapa, icon: Network },
      { href: "/insights", label: es.nav.insights, icon: Sparkles },
      { href: "/metodos", label: es.nav.metodos, icon: Compass },
    ],
  },
  {
    title: es.nav.sections.account,
    items: [{ href: "/workspace", label: es.nav.workspace, icon: Users }],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5">
      {SECTIONS.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
              {section.title}
            </p>
          )}
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent-subtle font-medium text-accent-hover"
                    : "text-muted hover:bg-elevated hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-accent-hover" : "text-faint group-hover:text-foreground",
                  )}
                  strokeWidth={2}
                />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
