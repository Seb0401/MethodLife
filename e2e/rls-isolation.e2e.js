const { test, expect } = require("@playwright/test");
const { login, unique, USERS } = require("./helpers");
const S = require("./strings");

// Acceptance (roadmap Fase 0): "un segundo usuario no puede leer datos del
// primero". Each user has their own personal workspace; queries filter by
// workspace and Row Level Security backs it up.
test("un usuario no ve las áreas de otro workspace", async ({ browser }) => {
  const secret = unique("secreto");

  // User A creates an area with a unique name in their personal workspace.
  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  await login(a, USERS.A);
  await a.goto("/areas");
  // Scope to the create form: each existing AreaCard also has an input[name="name"]
  // (its rename field), which would make a bare selector ambiguous.
  const createForm = a.locator("form").filter({ has: a.getByPlaceholder(S.areaPlaceholder) });
  await createForm.locator('input[name="name"]').fill(secret);
  await createForm.getByRole("button", { name: S.areaCreate }).click();
  await expect(a.getByText(secret)).toBeVisible();

  // User B, in a separate browser context, must not see it.
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  await login(b, USERS.B);
  await b.goto("/areas");
  await expect(b.getByText(secret)).toHaveCount(0);

  await ctxA.close();
  await ctxB.close();
});
