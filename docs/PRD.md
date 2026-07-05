# PRD — MethodLife (base sin gamificación)

## 1. Visión

Una app web para computadoras que unifica la gestión de proyectos y de la vida personal (escuela, trabajo, ocio, salud) aplicando métodos reales de ingeniería de software. En lugar de ser 20 herramientas separadas (como los proyectos del curso), es un solo sistema donde cada método es un módulo que opera sobre el mismo núcleo de datos: áreas de vida → metas → proyectos → tareas.

La capa de gamificación RPG (avatar, XP, misiones, guilds como skin de equipos, bugs de vida como monstruos) está diseñada pero **diferida**: este PRD cubre la base funcional que debe existir primero. Las decisiones de arquitectura ya la contemplan (ver ARQUITECTURA.md, patrón de eventos).

## 2. Usuarios

- **Individual:** estudiante o profesional que gestiona escuela, trabajo y vida personal.
- **Equipo:** grupos pequeños (2–10 personas: grupo de estudio, equipo de trabajo, familia) que comparten proyectos, con roles.

Ambos operan sobre el concepto de **workspace**: uno personal automático por usuario, más workspaces de equipo por invitación.

## 3. Mapa de los 20 proyectos del curso → módulos

| Proyectos del doc | Módulo resultante | Adaptación |
|---|---|---|
| P1 TaskSprint, P8 ScrumDesk, P16 AgiFrame | M2 Modo Scrum | Sprints personales y de equipo sobre el núcleo común |
| P6 KanFlow, P16 AgiFrame | M3 Modo Kanban | Tableros con WIP aplicado y métricas de flujo |
| P20 FDDTrack | M4 Modo FDD | Metas grandes descompuestas en features con % de avance |
| P12 XPDefect | M5 Hábitos-defecto | Malos hábitos como defectos con flujo de estados y prueba de verificación |
| P2 FormalSpec, P7 InvariCheck, P14 FormalModel Sim | M6 Capa formal | Definición de hecho por tarea, invariantes personales verificados, máquinas de estado |
| P10 TraceReq | M7 Trazabilidad | Toda tarea traza a meta/área; detección de huérfanas y matriz |
| P4 ProtoTrack, P18 ProtoCollab | M8 Prototipado de rutinas | Rutinas versionadas con evaluación (individual o colaborativa) y decisión evolucionar/descartar |
| P19 MethodSelector | M9 Selector de método | Cuestionario que recomienda el modo por proyecto + biblioteca de métodos |
| P3 DFDBuilder, P5 CohAcop, P9 JSDModeler, P11 StructChart, P13 JSProcFile, P17 SSABusiness | M10 Planificación visual | Se condensan en: mapa de dependencias entre proyectos/metas (grafo) y editor de flujos personales; el "acoplamiento" se reinterpreta como proyectos que compiten por el mismo tiempo |
| P15 MediKnow | M11 Motor de insights | El motor de inferencia se reorienta: reglas sobre las métricas del propio usuario en lugar de conocimiento médico |
| P8, P16, P18 (partes colaborativas) | M12 Colaboración | Workspaces, roles, tiempo real |

Los proyectos de consola en C++ (P7, P13) aportan su concepto (verificación de invariantes, estructuras entrada→salida), no su implementación.

## 4. Módulos y requisitos funcionales

### M1 — Núcleo (obligatorio, todo lo demás depende de él)

- RF1.1 Registro/login con email y OAuth; workspace personal creado automáticamente.
- RF1.2 CRUD de **áreas de vida** (escuela, trabajo, ocio, salud + personalizadas) con color e ícono.
- RF1.3 CRUD de **metas** asociadas a un área, con descripción y fecha objetivo opcional.
- RF1.4 CRUD de **proyectos** asociados a un workspace, con área, método de trabajo (`scrum` | `kanban` | `fdd` | `simple`) y estado (activo, pausado, archivado).
- RF1.5 CRUD de **tareas** con título, descripción, prioridad, estimación (puntos o minutos), estado, asignado (en equipos) y proyecto/meta de origen.
- RF1.6 **Bandeja de entrada (inbox):** único lugar donde pueden existir tareas sin proyecto ni meta; flujo de "procesar inbox" para asignarles destino.
- RF1.7 Vista "Hoy": tareas comprometidas del día cruzando todos los proyectos y áreas.
- RF1.8 Búsqueda y filtrado global por texto, área, estado, prioridad y asignado.

### M2 — Modo Scrum (P1, P8, P16)

- RF2.1 Backlog del proyecto con orden por prioridad y estimación en puntos.
- RF2.2 Creación de sprints con fecha inicio/fin; validación de que no se asignen tareas a sprints cerrados (P1).
- RF2.3 Planificación: mover tareas del backlog al sprint con suma de puntos visible.
- RF2.4 Tablero del sprint: por hacer / en progreso / hecho, drag & drop.
- RF2.5 Cierre de sprint: cálculo de velocity, tareas incompletas regresan al backlog, resumen de sprint generado automáticamente (P1).
- RF2.6 Gráfico burndown por sprint (puntos restantes por día).
- RF2.7 Retrospectiva: registro estructurado (qué funcionó, qué no, acciones) por sprint (P8).
- RF2.8 Historial de sprints con velocity promedio (P16).

### M3 — Modo Kanban (P6)

- RF3.1 Tableros con columnas configurables (nombre, orden, límite WIP opcional).
- RF3.2 Límite WIP **aplicado**: mover una tarjeta a columna llena falla con mensaje claro.
- RF3.3 Registro automático de cada transición de tarjeta con fecha/hora (tabla de eventos).
- RF3.4 Métricas por tarjeta: cycle time (primer "en progreso" → hecho) y lead time (creación → hecho).
- RF3.5 Panel de métricas del tablero: promedios de cycle/lead time por período, throughput semanal.
- RF3.6 Filtrado de tarjetas por estado, prioridad, asignado y fecha.

### M4 — Modo FDD (P20)

- RF4.1 Una meta grande puede descomponerse en **conjuntos de features** agrupados por área.
- RF4.2 Cada feature tiene estimación, responsable (en equipos) y estados: diseño → diseño revisado → construcción → construcción revisada → completada.
- RF4.3 Progreso ponderado: % de la meta según estados de sus features (pesos configurables por estado).
- RF4.4 Gráfico de avance: % de features completadas por semana.
- RF4.5 Las features generan tareas en el núcleo (una feature puede tener N tareas).

### M5 — Hábitos-defecto (P12, sin skin RPG)

- RF5.1 Registro de hábitos a corregir con nombre, disparador, severidad.
- RF5.2 Flujo de estados: detectado → en análisis → en corrección → en verificación → superado; transiciones validadas en servidor.
- RF5.3 Fase de análisis: N días registrando solo ocurrencias para establecer línea base.
- RF5.4 Check-in diario: cumplido / ocurrencia / omitido, con nota opcional; en equipos, un miembro puede ser **testigo** validador.
- RF5.5 **Prueba de verificación** definida al crear el hábito: condición medible + ventana + tolerancia (ej. "12 de 14 días"); inmutable durante el ciclo; para renegociarla se cierra la versión y se abre otra (conecta con M8).
- RF5.6 Recaída en verificación regresa a "en corrección" conservando historial (nunca borra progreso).
- RF5.7 Historial completo de check-ins y transiciones por hábito.

### M6 — Capa formal (P2, P7, P14)

- RF6.1 **Definición de hecho** por tarea (opcional, recomendado para tareas grandes): precondiciones y postcondiciones en lenguaje natural estructurado; una tarea con definición de hecho no puede marcarse completada sin confirmar sus postcondiciones (P2).
- RF6.2 **Invariantes personales/de workspace:** reglas declarativas evaluables sobre los datos (ej. `wip_total <= 3`, `tareas_area('salud') >= 1 por semana`), con estado cumplido/violado y registro de cada violación (P7).
- RF6.3 Evaluación de invariantes disparada por eventos (transición de tarea, cierre de día) — nunca por polling del cliente.
- RF6.4 Panel de invariantes: estado actual, historial de violaciones, qué evento causó la primera violación (P7).
- RF6.5 Las máquinas de estado de M5 y M2/M3 se definen como datos (estados + transiciones + condiciones), no hardcodeadas, reutilizando un motor común (P14).

### M7 — Trazabilidad (P10)

- RF7.1 Relación obligatoria tarea → (proyecto | meta) → área; el inbox es la única excepción.
- RF7.2 Vista de matriz metas × proyectos × conteo de tareas.
- RF7.3 Detección automática: metas sin tareas activas ("metas muertas") y tiempo invertido sin meta.
- RF7.4 Relaciones entre metas: depende de / refina / entra en conflicto; alerta ante conflictos declarados.
- RF7.5 Historial de cambios por meta y proyecto (fecha + descripción).

### M8 — Prototipado de rutinas (P4, P18)

- RF8.1 Una **rutina** (de estudio, de mañana, de ejercicio) se registra con tipo de prototipo: desechable / evolutivo.
- RF8.2 Versiones numeradas con fecha; cada versión lista los "requerimientos" a validar (ej. "despertar 6:30", "2h de estudio profundo").
- RF8.3 Período de evaluación por versión con registro diario simple de cumplimiento por requerimiento.
- RF8.4 Cierre de versión con decisión: evolucionar (nueva versión heredando requerimientos aprobados) / descartar / aprobar como definitiva; justificación obligatoria.
- RF8.5 Línea de tiempo de versiones con comparación de requerimientos entre dos versiones (P4).
- RF8.6 En workspaces de equipo: evaluación colaborativa (varios miembros evalúan cada requerimiento) con consolidación automática (P18).

### M9 — Selector de método (P19)

- RF9.1 Al crear un proyecto, cuestionario opcional: ¿tiene fecha límite?, ¿el trabajo es continuo o por entregas?, ¿es una meta grande de largo plazo?, ¿cuántas personas?, ¿los requerimientos son estables?
- RF9.2 Motor de recomendación basado en reglas explícitas (no ML) que sugiere `scrum` | `kanban` | `fdd` | `simple`, con justificación por criterio.
- RF9.3 Biblioteca de métodos: fichas descriptivas de todos los métodos del curso (SSA/SD, JSP, JSD, Scrum, XP, Kanban, FDD, prototipo), aunque no todos sean modos ejecutables.
- RF9.4 Comparador de dos métodos con tabla de criterios.
- RF9.5 Historial: qué método se eligió por proyecto y si se cambió después (alimenta a M11).

### M10 — Planificación visual (P3, P5, P9, P11, P17 condensados)

- RF10.1 **Mapa de dependencias:** grafo interactivo (React Flow) de metas y proyectos con aristas "depende de" / "bloquea" / "compite por tiempo".
- RF10.2 Indicador de **acoplamiento temporal** (P5 reinterpretado): proyectos activos que comparten la misma franja de dedicación semanal se resaltan como acoplados; sugerencia de pausar o reordenar.
- RF10.3 Editor simple de **flujos personales** (P3/P17 reinterpretados): diagramas de nodos para documentar procesos propios (ej. "mi flujo de estudio"), guardables por workspace y exportables como imagen PNG.
- RF10.4 Validación mínima del grafo: sin ciclos en "depende de"; todo nodo de flujo con al menos una entrada y una salida (P3).

### M11 — Motor de insights (P15 reorientado)

- RF11.1 Reglas de inferencia declarativas sobre las métricas propias (definidas primero como catálogo del sistema, luego personalizables): ej. "si violaciones del invariante X en semana > 2 y cycle time sube > 30%, sugerir insight".
- RF11.2 Panel de insights con explicación de qué datos dispararon cada uno (transparencia total, sin caja negra).
- RF11.3 Detección de inconsistencias del propio modelo del usuario (P15): meta sin área, invariante que referencia datos inexistentes, rutina sin requerimientos.

### M12 — Colaboración (P8, P16, P18)

- RF12.1 Workspaces de equipo con invitación por email/enlace.
- RF12.2 Roles por workspace: propietario, administrador, miembro; y por proyecto Scrum: product owner, scrum master, desarrollador (P8).
- RF12.3 Permisos: solo PO reordena el backlog; solo SM cierra sprints; miembros mueven sus tarjetas.
- RF12.4 Tiempo real en tableros: los movimientos de tarjetas de otros miembros se reflejan sin recargar (Fase 2 del roadmap).
- RF12.5 Registro de actividad por proyecto (quién hizo qué y cuándo), derivado de las tablas de eventos.

## 5. Requisitos no funcionales

- RNF1 Web de escritorio primero (≥1280px optimizado, usable desde 1024px); el responsive móvil no es objetivo actual pero no se bloquea (evitar layouts imposibles de adaptar).
- RNF2 Toda regla de negocio aplicada en servidor; el cliente nunca es autoridad (ver CLAUDE.md).
- RNF3 Aislamiento por workspace con Row Level Security; ningún dato cruza workspaces.
- RNF4 Interfaz completa en español; código e identificadores en inglés.
- RNF5 Tiempos de interacción del tablero < 200 ms percibidos (optimistic updates con reconciliación del servidor).
- RNF6 Exportación en texto estructurado (Markdown) de: resumen de sprint, métricas Kanban, matriz de trazabilidad, informe de rutina — herencia directa de los requisitos de exportación de casi todos los proyectos del doc.

## 6. Fuera de alcance (por ahora)

- Gamificación completa (XP, niveles, monedas, avatar, tienda, boss fights, bestiario RPG) — el diseño existe; solo se implementa el patrón de eventos que la hará posible.
- App móvil (planificada; el stack la contempla vía React Native/Expo).
- Integraciones externas (calendario, screen time), notificaciones push, IA generativa.
- Modo offline.
