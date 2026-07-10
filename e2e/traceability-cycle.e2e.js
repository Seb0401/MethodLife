const { test, expect } = require("@playwright/test");
const { login, unique, USERS } = require("./helpers");
const S = require("./strings");

// Acceptance (roadmap Fase 4): a cycle declared in "depends on" is rejected. The
// server is the authority for the acyclic invariant.
test("una dependencia entre metas que crea un ciclo se rechaza", async ({ page }) => {
  await login(page, USERS.A);

  // Two goals in the first area (default areas exist from user setup).
  const goalA = unique("meta-a");
  const goalB = unique("meta-b");
  await page.goto("/areas");
  const firstArea = page.locator("section").first();
  for (const title of [goalA, goalB]) {
    await firstArea.locator('input[name="title"]').fill(title);
    await firstArea.getByRole("button", { name: S.goalCreate }).click();
    await expect(page.getByText(title).first()).toBeVisible();
  }

  await page.goto("/trazabilidad");

  // A depends on B — fine.
  await page.selectOption('select[name="fromGoalId"]', { label: goalA });
  await page.selectOption('select[name="type"]', "depends_on");
  await page.selectOption('select[name="toGoalId"]', { label: goalB });
  await page.getByRole("button", { name: S.addLink }).click();
  await expect(page.getByText(S.goalLinkCycle)).toHaveCount(0);

  // B depends on A — would close a cycle, so it must be rejected.
  await page.selectOption('select[name="fromGoalId"]', { label: goalB });
  await page.selectOption('select[name="type"]', "depends_on");
  await page.selectOption('select[name="toGoalId"]', { label: goalA });
  await page.getByRole("button", { name: S.addLink }).click();
  await expect(page.getByText(S.goalLinkCycle)).toBeVisible();
});
