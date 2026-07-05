# Arquitectura — MethodLife

## 1. Decisiones de stack y su porqué

| Decisión | Alternativa del doc del curso descartada | Razón |
|---|---|---|
| Next.js + TypeScript full-stack | Java/Spring + Thymeleaf, Python/Flask/Django | Un solo lenguaje compartido con la futura app móvil (React Native); Thymeleaf no encaja con una UI altamente interactiva |
| PostgreSQL (Supabase) | MySQL, SQLite | JSON nativo (reglas e invariantes declarativos), CTEs recursivas (árboles meta→feature→tarea y grafos de dependencias), RLS para multiusuario |
| Supabase Auth + Realtime | — | Resuelve colaboración en tiempo real y auth sin infraestructura propia |
| Prisma | JDBC, SQL manual | Migraciones versionadas, tipos generados |
| Server Actions | API REST propia | Menos superficie; se puede exponer REST/tRPC después para móvil |
| Tkinter/PyQt/JavaFX/C++ consola | (varios proyectos) | Son escritorio/consola; solo se hereda su concepto |

## 2. Estructura del repositorio

```
methodlife/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── ARQUITECTURA.md
│   └── ROADMAP.md
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/            # login, registro, invitaciones
│   │   ├── (app)/             # rutas autenticadas
│   │   │   ├── hoy/           # vista Hoy (M1)
│   │   │   ├── inbox/         # bandeja de entrada (M1)
│   │   │   ├── areas/         # áreas y metas (M1, M7)
│   │   │   ├── proyectos/
│   │   │   │   └── [id]/      # tablero según método: scrum | kanban | fdd
│   │   │   ├── habitos/       # M5
│   │   │   ├── rutinas/       # M8
│   │   │   ├── invariantes/   # M6
│   │   │   ├── mapa/          # M10
│   │   │   ├── insights/      # M11
│   │   │   ├── metodos/       # biblioteca y selector (M9)
│   │   │   └── workspace/     # miembros, roles, configuración (M12)
│   │   └── api/               # solo webhooks/exportaciones; el resto es server actions
│   ├── domain/                # LÓGICA PURA, sin React/Next, 100% testeada
│   │   ├── core/              # entidades, tipos compartidos, errores tipados
│   │   ├── scrum/             # velocity, burndown, reglas de sprint
│   │   ├── kanban/            # WIP, cycle/lead time, throughput
│   │   ├── fdd/               # progreso ponderado por estados
│   │   ├── habits/            # máquina de estados, prueba de verificación
│   │   ├── formal/            # motor de máquinas de estado + evaluador de invariantes
│   │   ├── trace/             # matriz, detección de huérfanas, ciclos
│   │   ├── prototype/         # versiones, consolidación de evaluaciones
│   │   ├── selector/          # motor de recomendación por reglas
│   │   └── insights/          # evaluador de reglas de inferencia
│   ├── actions/               # server actions por módulo (capa delgada: zod → domain → prisma)
│   ├── components/
│   │   ├── ui/                # primitivas (button, card, dialog...)
│   │   └── <modulo>/          # componentes por módulo
│   └── lib/
│       ├── supabase/          # clientes server/browser, realtime
│       ├── i18n/es.ts         # todos los textos de UI
│       └── utils.ts
├── tests/
│   └── e2e/                   # playwright
└── package.json
```

Regla de dependencias: `app` y `actions` pueden importar de `domain`; `domain` no importa de nadie (salvo tipos). Si una función de dominio necesita datos, los recibe como parámetros — el acceso a Prisma vive en `actions`.

## 3. Modelo de datos

Convención: ids `uuid`, timestamps `created_at`/`updated_at` en todo, soft delete solo donde el PRD pida historial. Esquema conceptual (el `schema.prisma` real se deriva de esto):

```
workspaces        (id, name, type: personal|team, owner_id)
workspace_members (workspace_id, user_id, role: owner|admin|member)
profiles          (user_id → auth.users, display_name, avatar_url)

life_areas   (id, workspace_id, name, color, icon, position)
goals        (id, workspace_id, area_id, title, description, target_date,
              status: active|done|abandoned)
goal_links   (from_goal_id, to_goal_id, kind: depends_on|refines|conflicts)   -- M7/M10

projects     (id, workspace_id, area_id, goal_id?, name, description,
              method: scrum|kanban|fdd|simple, status: active|paused|archived)
project_roles(project_id, user_id, role: po|sm|dev)                            -- M12

boards        (id, project_id, name)                                          -- kanban y sprint comparten tablero
board_columns (id, board_id, name, position, wip_limit?)
tasks         (id, workspace_id, project_id?, goal_id?, column_id?, sprint_id?,
               title, description, priority, estimate, status,
               assignee_id?, definition_of_done jsonb?, inbox boolean)
task_transitions (id, task_id, from_column_id?, to_column_id?, from_status,
                  to_status, actor_id, at)                                     -- EVENTOS, inmutable

sprints (id, project_id, name, starts_at, ends_at,
         status: planned|active|closed, velocity?, summary_md?)
retrospectives (id, sprint_id, went_well, to_improve, actions jsonb)

feature_sets (id, goal_id, name, position)                                    -- M4
features     (id, feature_set_id, title, estimate, owner_id?,
              status: design|design_reviewed|build|build_reviewed|done)
feature_status_events (id, feature_id, from_status, to_status, actor_id, at)

habits (id, workspace_id, owner_id, name, trigger_text, severity,
        status: detected|analysis|correction|verification|overcome,
        version int, verification_rule jsonb,     -- {condition, window_days, tolerance}
        witness_id?)
habit_checkins (id, habit_id, date, result: done|occurrence|skipped,
                note?, validated_by?)                                          -- EVENTOS
habit_transitions (id, habit_id, from_status, to_status, reason, at)           -- EVENTOS

invariants (id, workspace_id, owner_id?, name, rule jsonb, scope,
            status: holding|violated, enabled)
invariant_violations (id, invariant_id, triggered_by_event, details jsonb, at) -- EVENTOS

routines (id, workspace_id, owner_id, name, prototype_kind: throwaway|evolutionary)
routine_versions (id, routine_id, number, started_at, closed_at?,
                  decision?: evolve|discard|approve, justification?)
routine_requirements (id, version_id, text, inherited_from?)
routine_evaluations (id, requirement_id, evaluator_id, date,
                     result: met|not_met, note?)                               -- EVENTOS

state_machines (id, key, states jsonb, transitions jsonb)                      -- M6: definiciones data-driven
method_decisions (id, project_id, answers jsonb, recommended, chosen, at)      -- M9
insight_rules (id, workspace_id?, key, rule jsonb, enabled)                    -- M11
insights (id, workspace_id, rule_key, payload jsonb, seen boolean, at)
flow_diagrams (id, workspace_id, name, graph jsonb)                            -- M10
activity_log — VISTA derivada de las tablas *_transitions/*_events, no tabla propia
```

Notas clave:

- **Tablas de eventos** (`task_transitions`, `habit_checkins`, `feature_status_events`, `invariant_violations`, `routine_evaluations`): solo INSERT, nunca UPDATE/DELETE. Las métricas (velocity, cycle time, burndown, % FDD) se calculan desde ellas en `domain/`. La futura `xp_events` de gamificación se colgará de estos mismos eventos.
- **RLS:** política base en cada tabla: `workspace_id` debe pertenecer a un workspace donde `auth.uid()` es miembro. Los server actions usan el cliente de Supabase con la sesión del usuario, no la service key, salvo jobs internos.
- **`state_machines` data-driven:** los flujos de hábitos (M5) y features (M4) se definen como filas con estados/transiciones/condiciones; `domain/formal/machine.ts` es el único motor que decide si una transición es válida. Prohibido hardcodear transiciones en la UI.

## 4. Patrones de implementación

**Server action tipo (plantilla mental):**

```ts
// actions/kanban/move-task.ts
export async function moveTask(input: unknown) {
  const data = MoveTaskSchema.parse(input);              // 1. zod
  const ctx = await getWorkspaceContext(data.taskId);    // 2. auth + workspace
  const decision = kanban.canMove(ctx.board, data);      // 3. dominio puro (WIP, máquina de estados)
  if (!decision.ok) return err(decision.reason);         // 4. error tipado, nunca throw genérico
  await prisma.$transaction([...]);                      // 5. mutación + INSERT en task_transitions
  await evaluateInvariants(ctx, { event: 'task_moved' });// 6. invariantes (M6) tras el evento
  revalidatePath(...);                                   // 7. UI
}
```

**Optimistic UI:** TanStack Query con update optimista y rollback si el server action devuelve error (caso típico: WIP lleno).

**Tiempo real (Fase 2):** canal Supabase `board:{id}`; al recibir un evento de otro usuario se invalida la query del tablero. Nunca se aplica el payload del canal directamente como verdad.

**Exportaciones (RNF6):** funciones puras en `domain/*/export.ts` que devuelven Markdown; el route handler solo lo envuelve en una respuesta descargable.

**Errores:** tipo `Result<T, DomainError>` en dominio; `DomainError` tiene `code` (p.ej. `WIP_LIMIT_REACHED`, `SPRINT_CLOSED`, `VERIFICATION_RULE_IMMUTABLE`) y la UI mapea códigos a mensajes en `es.ts`.

## 5. Testing

- `domain/` con Vitest: cada regla del PRD que diga "validación", "aplicado", "cálculo" o "detección" tiene test unitario (WIP, velocity, cycle time, máquina de estados de hábitos, prueba de verificación con tolerancia, detección de ciclos, motor del selector).
- Playwright para los flujos: registro → crear área/meta/proyecto → cuestionario del selector → tablero → mover tarjeta → cerrar sprint; y crear hábito → check-ins → transición a verificación.
- El seed (`prisma/seed.ts`) crea un workspace demo con datos de los tres modos para desarrollo y E2E.
