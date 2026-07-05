# Roadmap — MethodLife

Orden de ejecución para Claude Code. Cada fase termina con la app desplegable y usable; no se avanza de fase con criterios de aceptación pendientes. Referencias RFx.y → PRD.md.

## Fase 0 — Fundaciones (sin features visibles)

- [ ] 0.1 Inicializar Next.js 15 + TypeScript strict + Tailwind + ESLint/Prettier; scripts de `CLAUDE.md` funcionando.
- [ ] 0.2 Conectar Supabase: proyecto, variables de entorno (`.env.example` documentado), clientes server/browser.
- [ ] 0.3 Prisma con migración inicial: `workspaces`, `workspace_members`, `profiles`.
- [ ] 0.4 Auth completo (RF1.1): registro, login, logout, creación automática del workspace personal; middleware de rutas protegidas.
- [ ] 0.5 RLS base en Supabase para las tablas existentes + helper `getWorkspaceContext`.
- [ ] 0.6 Layout de la app: sidebar de navegación con los módulos (aunque vacíos), selector de workspace, `es.ts` inicial.
- [ ] 0.7 CI mínimo: lint + typecheck + test en cada push.

Aceptación: puedo registrarme, entrar, ver el shell de la app con mi workspace personal; `pnpm test` pasa; un segundo usuario no puede leer datos del primero (test de RLS).

## Fase 1 — Núcleo + primer modo (Kanban)

El Kanban va primero porque es el modo con menos piezas y ejercita el patrón completo: eventos, WIP en servidor, métricas desde eventos.

- [ ] 1.1 Migración: `life_areas`, `goals`, `projects`, `boards`, `board_columns`, `tasks`, `task_transitions`.
- [ ] 1.2 CRUD de áreas (RF1.2) y metas (RF1.3) con seed de áreas por defecto.
- [ ] 1.3 CRUD de proyectos (RF1.4) — el campo `method` existe, pero solo `kanban` y `simple` están activos en esta fase.
- [ ] 1.4 Inbox (RF1.6): captura rápida de tareas + flujo de procesamiento hacia proyecto/meta. Regla de trazabilidad RF7.1 aplicada en dominio.
- [ ] 1.5 Tablero Kanban (RF3.1): columnas configurables, drag & drop con dnd-kit, update optimista.
- [ ] 1.6 WIP aplicado en servidor (RF3.2) con error tipado `WIP_LIMIT_REACHED` y rollback visual.
- [ ] 1.7 Registro de transiciones como eventos (RF3.3) dentro de la misma transacción del movimiento.
- [ ] 1.8 Métricas: cycle time, lead time y throughput calculados en `domain/kanban` desde eventos (RF3.4, RF3.5) + panel con Recharts.
- [ ] 1.9 Vista Hoy (RF1.7) y búsqueda/filtrado global (RF1.8, RF3.6).
- [ ] 1.10 Exportación Markdown del reporte de métricas del tablero (RNF6).

Aceptación: creo un proyecto Kanban, muevo tarjetas, la columna llena rechaza el movimiento con mensaje claro, el panel muestra cycle/lead time correctos contra un caso calculado a mano en tests, y ninguna tarea fuera del inbox carece de proyecto/meta.

## Fase 2 — Scrum + colaboración en tiempo real

- [ ] 2.1 Migración: `sprints`, `retrospectives`, `project_roles`.
- [ ] 2.2 Backlog priorizable con estimación en puntos (RF2.1).
- [ ] 2.3 Sprints: crear, planificar, validación de sprint cerrado (RF2.2, RF2.3).
- [ ] 2.4 Tablero de sprint reutilizando el componente Kanban (RF2.4).
- [ ] 2.5 Cierre de sprint: velocity, retorno de incompletas al backlog, resumen autogenerado en Markdown (RF2.5).
- [ ] 2.6 Burndown (RF2.6) desde `task_transitions` — nunca desde un contador.
- [ ] 2.7 Retrospectivas (RF2.7) e historial con velocity promedio (RF2.8).
- [ ] 2.8 Workspaces de equipo: invitaciones, roles de workspace (RF12.1, RF12.2 parte 1).
- [ ] 2.9 Roles por proyecto Scrum y permisos aplicados en server actions (RF12.2 parte 2, RF12.3).
- [ ] 2.10 Realtime en tableros: canal por board, invalidación de queries (RF12.4).
- [ ] 2.11 Registro de actividad del proyecto como vista de eventos (RF12.5).

Aceptación: dos usuarios en el mismo tablero ven los movimientos del otro sin recargar; un `dev` no puede cerrar un sprint (error de permiso tipado); el burndown de un sprint de prueba coincide con el cálculo manual del test.

## Fase 3 — Capa formal + hábitos

- [ ] 3.1 Migración: `state_machines`, `invariants`, `invariant_violations`, `habits`, `habit_checkins`, `habit_transitions`.
- [ ] 3.2 Motor de máquinas de estado data-driven en `domain/formal` (RF6.5) + seed con las máquinas de hábitos y features.
- [ ] 3.3 Evaluador de invariantes (RF6.2, RF6.3): DSL declarativa en JSON con un set inicial de predicados (conteos por columna/área/período); enganchado a los eventos de Fases 1–2.
- [ ] 3.4 Panel de invariantes con historial de violaciones (RF6.4).
- [ ] 3.5 Definición de hecho por tarea con confirmación de postcondiciones al completar (RF6.1).
- [ ] 3.6 Hábitos: alta con prueba de verificación inmutable (RF5.1, RF5.5), fase de análisis (RF5.3).
- [ ] 3.7 Check-in diario ultraligero + testigo en equipos (RF5.4).
- [ ] 3.8 Transiciones de hábito vía el motor de 3.2, incluida la recaída que conserva historial (RF5.2, RF5.6, RF5.7).

Aceptación: un hábito recorre todo su ciclo en un test E2E con fechas simuladas; intentar editar la prueba de verificación en curso devuelve `VERIFICATION_RULE_IMMUTABLE`; violar un invariante de WIP genera exactamente una fila en `invariant_violations` con el evento causante.

## Fase 4 — FDD, trazabilidad y rutinas

- [ ] 4.1 Migración: `feature_sets`, `features`, `feature_status_events`, `goal_links`, `routines`, `routine_versions`, `routine_requirements`, `routine_evaluations`.
- [ ] 4.2 Modo FDD: conjuntos, features con estados vía motor formal, progreso ponderado y gráfico semanal (RF4.1–RF4.5).
- [ ] 4.3 Trazabilidad: matriz, metas muertas, relaciones entre metas con detección de conflictos y ciclos (RF7.2–RF7.5).
- [ ] 4.4 Rutinas versionadas: versiones, requerimientos, evaluación diaria, decisión de cierre con herencia (RF8.1–RF8.5).
- [ ] 4.5 Evaluación colaborativa de rutinas en equipos con consolidación (RF8.6).
- [ ] 4.6 Exportaciones Markdown: matriz de trazabilidad e informe de rutina (RNF6).

Aceptación: una meta FDD con 10 features muestra el % correcto según pesos; un ciclo declarado en "depende de" se rechaza; evolucionar una rutina crea la versión N+1 con los requerimientos aprobados heredados y marcados como tales.

## Fase 5 — Selector, mapa visual e insights

- [ ] 5.1 Migración: `method_decisions`, `flow_diagrams`, `insight_rules`, `insights`.
- [ ] 5.2 Cuestionario del selector al crear proyecto + motor de reglas con justificación (RF9.1, RF9.2).
- [ ] 5.3 Biblioteca de métodos (contenido estático versionado en el repo) y comparador (RF9.3, RF9.4).
- [ ] 5.4 Historial de decisiones metodológicas (RF9.5).
- [ ] 5.5 Mapa de dependencias con React Flow + acoplamiento temporal (RF10.1, RF10.2).
- [ ] 5.6 Editor de flujos personales con validación y exportación PNG (RF10.3, RF10.4).
- [ ] 5.7 Motor de insights con catálogo inicial de ~10 reglas y panel transparente (RF11.1, RF11.2).
- [ ] 5.8 Detección de inconsistencias del modelo del usuario (RF11.3).

Aceptación: el selector recomienda `kanban` para el caso "sin fecha límite, flujo continuo, 1 persona" y `scrum` para "fecha límite, entregas, 3 personas", con justificación visible; un insight del catálogo se dispara en el seed demo y explica sus datos de origen.

## Fase 6 — Puente hacia la gamificación (preparación, no implementación)

- [ ] 6.1 Auditoría: verificar que todo cambio relevante del sistema pasa por tablas de eventos (requisito del diseño RPG).
- [ ] 6.2 Migración vacía preparada: `xp_events` (user_id, source_type, source_id, amount, at) sin consumidores.
- [ ] 6.3 Documento `docs/GAMIFICACION.md` trayendo el diseño ya acordado (avatar, stats por área, buffs/debuffs desde invariantes, bugs de vida sobre M5, boss fights sobre sprints, tienda, escudo de racha) mapeado a los eventos existentes.

Aceptación: se puede describir cada mecánica RPG como una función pura sobre eventos ya registrados, sin tocar el esquema del núcleo.

## Definition of done global (toda tarea)

1. Criterios de aceptación de la tarea cumplidos.
2. Lógica de negocio en `domain/` con tests unitarios; sin reglas de negocio en componentes.
3. `pnpm lint && pnpm typecheck && pnpm test` en verde.
4. Textos de UI en `es.ts`; errores con código tipado y mensaje en español.
5. Si hubo migración: seed actualizado y RLS revisada para las tablas nuevas.
