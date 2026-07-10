// UI strings the E2E suite asserts on, mirrored from src/lib/i18n/es.ts. Kept in
// one place here because the tests run as plain CommonJS (see playwright.config.js)
// and cannot import the app's TypeScript i18n module. Keep in sync with es.ts.
module.exports = {
  loginSubmit: "Entrar", // es.auth.login.submit
  areaPlaceholder: "Nueva área", // es.areas.newArea
  areaCreate: "Crear", // es.areas.create
  projectCreate: "Crear proyecto", // es.projects.create
  cardAdd: "Añadir", // es.tasks.add
  wipReached: "Columna llena: alcanzaste el límite WIP.", // es.actionErrors.WIP_LIMIT_REACHED
  columns: { todo: "Por hacer", doing: "En progreso", done: "Hecho" }, // es.projects.columns

  // Goals (es.goals)
  goalCreate: "Añadir meta", // es.goals.create

  // Habits (es.habits)
  habitCreate: "Crear hábito", // es.habits.create
  habitResultDone: "Cumplido", // es.habits.results.done
  habitOvercome: "Superado", // es.habits.statuses.overcome
  habitEvents: {
    start_analysis: "Iniciar análisis",
    start_correction: "Iniciar corrección",
    start_verification: "Iniciar verificación",
    verify_passed: "Marcar superado",
    relapse: "Registrar recaída",
  }, // es.habits.events
  verificationNotMet: "Aún no se cumple la prueba de verificación.", // es.actionErrors.VERIFICATION_NOT_MET

  // Traceability (es.traceability)
  addLink: "Añadir relación", // es.traceability.addLink
  goalLinkCycle: "Esa dependencia crearía un ciclo entre metas.", // es.actionErrors.GOAL_LINK_CYCLE

  // Method selector (es.selector)
  recommendedScrum: /Recomendado:\s*Scrum/, // es.selector.recommended + es.projects.methods.scrum
};
