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
};
