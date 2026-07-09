const { expect } = require("@playwright/test");
const S = require("./strings");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name} (defínela en .env.test)`);
  return value;
}

const USERS = {
  A: { email: required("E2E_USER_A_EMAIL"), password: required("E2E_USER_A_PASSWORD") },
  B: { email: required("E2E_USER_B_EMAIL"), password: required("E2E_USER_B_PASSWORD") },
};

function unique(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Logs in through the real Supabase auth form and waits until we leave /login.
async function login(page, user) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: S.loginSubmit }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
}

// Creates a Kanban project from the projects page and opens its board.
async function createKanbanProject(page, name) {
  await page.goto("/proyectos");
  await page.locator('input[name="name"]').fill(name);
  await page.selectOption('select[name="areaId"]', { index: 0 });
  await page.getByRole("button", { name: S.projectCreate }).click();
  await page.getByRole("link", { name, exact: true }).first().click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

function column(page, columnName) {
  return page.locator(`[data-column-name="${columnName}"]`);
}

// Adds a card to a named board column and waits for it to render.
async function addCard(page, columnName, title) {
  const col = column(page, columnName);
  await col.locator('input[name="title"]').fill(title);
  await col.getByRole("button", { name: S.cardAdd }).click();
  await expect(column(page, columnName).getByRole("button", { name: title })).toBeVisible();
}

// Drags a card (by its title) onto a target column with stepped pointer moves so
// dnd-kit's PointerSensor (5px activation) engages reliably.
async function dragCardToColumn(page, cardTitle, columnName) {
  const card = page.getByRole("button", { name: cardTitle }).first();
  const target = column(page, columnName);
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("No bounding box for drag source/target");

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2 + 8, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 6, { steps: 5 });
  await page.mouse.up();
}

module.exports = { USERS, unique, login, createKanbanProject, addCard, dragCardToColumn };
