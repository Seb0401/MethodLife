# MethodLife

App web de gestión de proyectos y de vida (escuela, trabajo, ocio, salud) que aplica métodos reales de ingeniería de software — Scrum, Kanban, FDD, XP, prototipado, métodos formales, trazabilidad — como módulos de un solo sistema coherente que opera sobre el mismo núcleo de datos: **áreas de vida → metas → proyectos → tareas**.

> 🎮 La capa de gamificación RPG (avatar, XP, misiones) está diseñada pero **diferida**: primero se construye la base sólida. La arquitectura de eventos ya la contempla.

## Estado del proyecto

🚧 **En fase de diseño.**

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript `strict`
- **UI:** Tailwind CSS + componentes propios
- **Datos:** PostgreSQL (Supabase) + Prisma
- **Auth:** Supabase Auth (email + OAuth)
- **Estado:** TanStack Query + Zustand (solo UI efímera)
- **Tiempo real:** Supabase Realtime
- **Drag & drop:** dnd-kit · **Gráficos:** Recharts · **Diagramas:** React Flow
- **Validación:** Zod · **Testing:** Vitest + Playwright

## Desarrollo

Requisitos: Node.js 20+, [pnpm](https://pnpm.io/), una cuenta de [Supabase](https://supabase.com/).

```bash
pnpm install          # instalar dependencias
pnpm dev              # servidor de desarrollo
pnpm lint             # eslint + prettier
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest
pnpm test:e2e         # playwright
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # datos de ejemplo
```

> ⚠️ Estos comandos estarán disponibles a partir de la tarea 0.1 del roadmap. Las variables de entorno se documentarán en `.env.example` (tarea 0.2); nunca se versionan secretos.

## Principios de diseño

1. **El servidor es la autoridad** — toda transición de estado se valida en el servidor.
2. **Eventos, no solo estados** — los cambios se registran como filas inmutables; las métricas se calculan desde eventos.
3. **Multiusuario desde el día uno** — todo dato pertenece a un workspace, con Row Level Security.
4. **Los límites WIP y los invariantes se aplican, no se sugieren.**
5. **Toda tarea traza a una meta o área** — las huérfanas solo viven en el inbox.

## Licencia

Proyecto académico. Todos los derechos reservados.
