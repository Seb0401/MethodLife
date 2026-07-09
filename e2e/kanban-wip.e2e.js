const { test, expect } = require("@playwright/test");
const {
  addCard,
  createKanbanProject,
  dragCardToColumn,
  login,
  unique,
  USERS,
} = require("./helpers");
const S = require("./strings");

// Acceptance (roadmap Fase 1): a full column rejects the move with a clear
// message. Seeded Kanban columns are Por hacer / En progreso (WIP 3) / Hecho.
test("una columna llena rechaza el movimiento con el mensaje de WIP", async ({ page }) => {
  const doing = S.columns.doing; // "En progreso" (WIP 3)
  const todo = S.columns.todo; // "Por hacer"

  await login(page, USERS.A);
  await createKanbanProject(page, unique("wip-e2e"));

  // Fill "En progreso" to its WIP limit of 3.
  await addCard(page, doing, "wip-1");
  await addCard(page, doing, "wip-2");
  await addCard(page, doing, "wip-3");

  // A fourth card in "Por hacer" that we will try to move into the full column.
  await addCard(page, todo, "wip-extra");

  await dragCardToColumn(page, "wip-extra", doing);

  // The move is rejected server-side; the board shows the WIP message and rolls
  // the card back to "Por hacer".
  await expect(page.getByText(S.wipReached)).toBeVisible();
  await expect(
    page.locator(`[data-column-name="${todo}"]`).getByRole("button", { name: "wip-extra" }),
  ).toBeVisible();
});
