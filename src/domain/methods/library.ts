// Static, versioned method library (RF9.3) and comparator (RF9.4). Content lives
// in the repo as data. Only some methods are executable modes in the app; the
// rest are documented for reference. Pure — no dependencies.

export const METHOD_CRITERIA = [
  "horizon",
  "requirements",
  "teamSize",
  "delivery",
  "iteration",
  "documentation",
] as const;
export type MethodCriterion = (typeof METHOD_CRITERIA)[number];

export type MethodCard = {
  key: string;
  name: string;
  family: string;
  summary: string;
  bestFor: string;
  // True when the app can run this method as a project mode.
  executable: boolean;
  criteria: Record<MethodCriterion, string>;
};

export const METHOD_LIBRARY: MethodCard[] = [
  {
    key: "ssa_sd",
    name: "Análisis y Diseño Estructurado (SA/SD)",
    family: "Estructurado",
    summary:
      "Modela el sistema con diagramas de flujo de datos y descomposición funcional descendente.",
    bestFor: "Sistemas con procesos y flujos de datos bien entendidos de antemano.",
    executable: false,
    criteria: {
      horizon: "Largo, planificado por adelantado",
      requirements: "Estables y conocidos",
      teamSize: "Medio o grande",
      delivery: "Entrega única al final",
      iteration: "Poca o nula",
      documentation: "Alta (DFD, diccionario de datos)",
    },
  },
  {
    key: "jsp",
    name: "Jackson Structured Programming (JSP)",
    family: "Estructurado",
    summary:
      "Deriva la estructura del programa desde la estructura de los datos de entrada y salida.",
    bestFor: "Programas de procesamiento de datos secuenciales.",
    executable: false,
    criteria: {
      horizon: "Acotado al programa",
      requirements: "Estables",
      teamSize: "Individual o pequeño",
      delivery: "Entrega única",
      iteration: "Nula",
      documentation: "Media (estructuras de datos)",
    },
  },
  {
    key: "jsd",
    name: "Jackson System Development (JSD)",
    family: "Estructurado",
    summary: "Extiende JSP a sistemas completos modelando entidades y sus acciones en el tiempo.",
    bestFor: "Sistemas de tiempo real y concurrentes orientados a eventos.",
    executable: false,
    criteria: {
      horizon: "Largo",
      requirements: "Estables",
      teamSize: "Medio",
      delivery: "Por fases",
      iteration: "Baja",
      documentation: "Alta (modelos de entidad y proceso)",
    },
  },
  {
    key: "scrum",
    name: "Scrum",
    family: "Ágil",
    summary: "Entregas incrementales en sprints con roles, backlog y ceremonias.",
    bestFor: "Equipos que entregan por incrementos con requerimientos cambiantes.",
    executable: true,
    criteria: {
      horizon: "Corto por sprint, iterativo",
      requirements: "Cambiantes",
      teamSize: "Equipo (3–9)",
      delivery: "Incremental por sprint",
      iteration: "Alta",
      documentation: "Ligera",
    },
  },
  {
    key: "xp",
    name: "Extreme Programming (XP)",
    family: "Ágil",
    summary: "Prácticas técnicas intensas: TDD, integración continua, programación en pareja.",
    bestFor: "Equipos pequeños con alta incertidumbre técnica.",
    executable: false,
    criteria: {
      horizon: "Corto, iterativo",
      requirements: "Muy cambiantes",
      teamSize: "Pequeño",
      delivery: "Continua",
      iteration: "Muy alta",
      documentation: "Mínima (el código y las pruebas)",
    },
  },
  {
    key: "kanban",
    name: "Kanban",
    family: "Ágil / Lean",
    summary: "Flujo continuo con límites de trabajo en progreso y mejora del tiempo de ciclo.",
    bestFor: "Trabajo continuo sin fecha fija, con prioridades que cambian.",
    executable: true,
    criteria: {
      horizon: "Continuo, sin fecha fija",
      requirements: "Flujo de peticiones",
      teamSize: "Individual o equipo",
      delivery: "Continua",
      iteration: "Continua (pull)",
      documentation: "Ligera",
    },
  },
  {
    key: "fdd",
    name: "Feature-Driven Development (FDD)",
    family: "Ágil orientado a features",
    summary: "Descompone una meta en features pequeñas con estados de diseño y construcción.",
    bestFor: "Metas grandes descomponibles en muchas features medibles.",
    executable: true,
    criteria: {
      horizon: "Medio a largo",
      requirements: "Razonablemente estables",
      teamSize: "Medio",
      delivery: "Por feature",
      iteration: "Media",
      documentation: "Media (lista de features)",
    },
  },
  {
    key: "prototype",
    name: "Prototipado",
    family: "Evolutivo",
    summary: "Construye versiones tempranas para validar requisitos, desechables o evolutivas.",
    bestFor: "Explorar requisitos poco claros antes de comprometerse.",
    executable: false,
    criteria: {
      horizon: "Corto por versión",
      requirements: "Poco claros al inicio",
      teamSize: "Individual o pequeño",
      delivery: "Versiones sucesivas",
      iteration: "Alta",
      documentation: "Baja",
    },
  },
];

export function findMethod(key: string): MethodCard | undefined {
  return METHOD_LIBRARY.find((m) => m.key === key);
}

export type ComparisonRow = { criterion: MethodCriterion; a: string; b: string };

// Builds the side-by-side comparison table for two methods (RF9.4).
export function compareMethods(a: MethodCard, b: MethodCard): ComparisonRow[] {
  return METHOD_CRITERIA.map((criterion) => ({
    criterion,
    a: a.criteria[criterion],
    b: b.criteria[criterion],
  }));
}
