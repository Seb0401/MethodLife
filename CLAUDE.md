# CLAUDE.md — MethodLife

Guía operativa para Claude Code. Léela junto con `docs/PRD.md` (qué construir), `docs/ARQUITECTURA.md` (cómo está estructurado) y `docs/ROADMAP.md` (en qué orden). Ante cualquier conflicto entre archivos, el orden de autoridad es: ROADMAP > PRD > ARQUITECTURA > este archivo.

## Qué es este proyecto

MethodLife es una app web de gestión de proyectos y de vida (escuela, trabajo, ocio) que integra los métodos de ingeniería de software del curso (Scrum, Kanban, FDD, XP, prototipado, métodos formales, trazabilidad, selección de métodos) como módulos de un solo sistema coherente. La capa de gamificación RPG existe en el diseño pero está **fuera del alcance actual**: primero se construye la base sólida. Sin embargo, toda decisión de modelo de datos debe dejar la puerta abierta a la gamificación (ver "Reglas de diseño no negociables").

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript en modo `strict`
- **UI:** Tailwind CSS, componentes propios en `src/components/ui`
- **Datos:** PostgreSQL (Supabase) + Prisma como ORM
- **Auth:** Supabase Auth (email + OAuth), sesión vía `@supabase/ssr`
- **Estado cliente:** TanStack Query para datos del servidor, Zustand solo para estado de UI efímero
- **Tiempo real:** Supabase Realtime (canales por tablero/proyecto)
- **Drag & drop:** dnd-kit (tableros Kanban y Scrum)
- **Gráficos:** Recharts (burndown, métricas de flujo)
- **Diagramas:** React Flow (mapa de dependencias, máquinas de estado)
- **Validación:** Zod en todos los límites (formularios, server actions, API)
- **Testing:** Vitest (unitario, lógica de dominio) + Playwright (E2E de flujos críticos)

## Comandos

```bash
pnpm dev              # servidor de desarrollo
pnpm build            # build de producción
pnpm lint             # eslint + prettier check
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest
pnpm test:e2e         # playwright
pnpm db:migrate       # prisma migrate dev
pnpm db:studio        # prisma studio
pnpm db:seed          # datos de ejemplo (usa prisma/seed.ts)
```

Antes de dar una tarea por terminada, ejecutar siempre: `pnpm lint && pnpm typecheck && pnpm test`.

## Convenciones

- **Código en inglés, UI en español.** Identificadores, tablas, tipos y comentarios de código en inglés. Todo texto visible para el usuario en español, centralizado en `src/lib/i18n/es.ts` (no strings sueltos en componentes).
- **Server-first.** Las mutaciones van por Server Actions con validación Zod. Los componentes son Server Components por defecto; `"use client"` solo cuando hay interactividad real.
- **La lógica de dominio vive en `src/domain/`,** pura y sin dependencias de Next/React, con tests unitarios. Los server actions son capas delgadas que llaman al dominio. Ejemplos: cálculo de métricas de flujo, validación de límites WIP, verificación de invariantes, motor de recomendación de método.
- **Un módulo del PRD = una carpeta** en `src/app/(app)/<modulo>/` + su dominio en `src/domain/<modulo>/`. No mezclar módulos.
- **Migraciones siempre con Prisma.** Nunca editar la base de datos a mano. Cada cambio de esquema incluye migración + actualización del seed si aplica.
- **Commits pequeños y descriptivos** en español o inglés, un cambio lógico por commit. No mezclar refactor con feature.

## Reglas de diseño no negociables

1. **El servidor es la autoridad.** Toda transición de estado (tarea, sprint, hábito, versión de prototipo) se valida en el servidor contra sus condiciones de disparo antes de aplicarse. El cliente nunca decide un estado final. Esto implementa el verificador de invariantes (P7/P14 del PRD) y es prerequisito de la gamificación futura.
2. **Eventos, no solo estados.** Los cambios relevantes (transiciones de tarjetas, cierres de sprint, check-ins de hábito, violaciones de invariante) se registran como filas inmutables en tablas de eventos (`task_transitions`, `habit_checkins`, `invariant_violations`...). Las métricas se calculan desde eventos, nunca se almacenan como verdad única. La futura tabla `xp_events` seguirá este mismo patrón.
3. **Multiusuario desde el día uno.** Todo dato pertenece a un `workspace` (personal o de equipo). Toda query filtra por workspace y se apoya en Row Level Security de Supabase. No existe el "modo single-user" con datos globales.
4. **Los límites WIP y los invariantes se aplican, no se sugieren.** Si una columna está llena, la mutación de mover tarjeta falla con error tipado y mensaje claro; la UI lo refleja. Un invariante definido por el usuario se evalúa en cada evento que lo afecte.
5. **Toda tarea traza a algo.** El campo `goal_id`/`area_id` es obligatorio a nivel de dominio (P10). Las tareas huérfanas solo pueden existir en la bandeja de entrada (`inbox`), nunca en un tablero.
6. **No optimizar prematuramente el tiempo real.** Primero la mutación correcta con revalidación; el canal Realtime se suscribe después como mejora, por tablero, en Fase 2.

## Flujo de trabajo esperado

1. Tomar la siguiente tarea del `docs/ROADMAP.md` (respetar el orden de fases y dependencias).
2. Si la tarea toca esquema: diseñar la migración primero y validarla contra `docs/ARQUITECTURA.md`.
3. Implementar dominio → tests de dominio → server action → UI.
4. Verificar los criterios de aceptación listados en el roadmap para esa tarea.
5. Ejecutar lint, typecheck y tests antes de cerrar.

## Qué NO hacer

- No implementar gamificación (XP, niveles, monedas, avatares) todavía, salvo dejar los hooks de eventos descritos arriba.
- No agregar librerías nuevas sin justificarlo; el stack ya cubre los casos previstos.
- No crear endpoints REST paralelos si un server action resuelve el caso.
- No usar `any` ni desactivar reglas de lint; si un tipo es difícil, modelarlo.
- No escribir texto de UI en inglés ni hardcodear strings fuera de `es.ts`.
