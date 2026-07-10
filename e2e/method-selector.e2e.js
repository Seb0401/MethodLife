const { test, expect } = require("@playwright/test");
const { login, USERS } = require("./helpers");
const S = require("./strings");

// Acceptance (roadmap Fase 5): the selector recommends scrum for "deadline,
// deliverables, 3 people", with the recommendation visible in the questionnaire.
test("el selector recomienda scrum para equipo con fecha límite y entregas", async ({ page }) => {
  await login(page, USERS.A);
  await page.goto("/proyectos");

  // Fill the optional questionnaire (a client component that recommends live).
  await page.locator('input[name="hasDeadline"]').check();
  await page.selectOption('select[name="workMode"]', "deliverables");
  await page.locator('input[name="people"]').fill("3");

  // The recommendation panel shows Scrum and the method dropdown pre-selects it.
  await expect(page.getByText(S.recommendedScrum)).toBeVisible();
  await expect(page.locator('select[name="method"]')).toHaveValue("scrum");
});
