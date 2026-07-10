const { test, expect } = require("@playwright/test");
const { login, unique, USERS } = require("./helpers");
const S = require("./strings");

// YYYY-MM-DD for `daysAgo` days before today (UTC), matching @db.Date storage.
function isoDaysAgo(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Acceptance (roadmap Fase 3): a habit runs its whole cycle with simulated dates.
// The verification proof is enforced on the server: an early "mark overcome"
// fails, and only enough back-dated "done" check-ins let it pass.
test("un hábito recorre su ciclo hasta superado con fechas simuladas", async ({ page }) => {
  await login(page, USERS.A);
  await page.goto("/habitos");

  const name = unique("habito");

  // Create with a short proof: window 3, tolerance 1 → 2 "done" days needed; no
  // analysis wait so we can move straight through the lifecycle.
  const createForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: S.habitCreate }) });
  await createForm.locator('input[name="name"]').fill(name);
  await createForm.locator('input[name="windowDays"]').fill("3");
  await createForm.locator('input[name="tolerance"]').fill("1");
  await createForm.locator('input[name="analysisDays"]').fill("0");
  await createForm.getByRole("button", { name: S.habitCreate }).click();

  // Fresh locator each time: every action redirects and reloads the page.
  const card = () => page.locator("section").filter({ has: page.getByRole("heading", { name }) });
  await expect(card()).toBeVisible();

  // detected → analysis → correction → verification.
  await card().getByRole("button", { name: S.habitEvents.start_analysis }).click();
  await card().getByRole("button", { name: S.habitEvents.start_correction }).click();
  await card().getByRole("button", { name: S.habitEvents.start_verification }).click();

  // Verification with no check-ins must be rejected by the server.
  await card().getByRole("button", { name: S.habitEvents.verify_passed }).click();
  await expect(page.getByText(S.verificationNotMet)).toBeVisible();

  // Two back-dated "done" check-ins (today and yesterday) satisfy the proof.
  for (const daysAgo of [0, 1]) {
    await card().locator('input[name="date"]').fill(isoDaysAgo(daysAgo));
    await card().getByRole("button", { name: S.habitResultDone, exact: true }).click();
  }

  // Now the proof holds: the habit becomes "overcome".
  await card().getByRole("button", { name: S.habitEvents.verify_passed }).click();
  await expect(card().getByText(S.habitOvercome)).toBeVisible();
});
