import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schemas";

describe("auth schemas", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true);
  });

  it("rejects short passwords and bad emails", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "123" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "no-email", password: "12345678" }).success).toBe(false);
  });

  it("requires a display name on register", () => {
    expect(
      registerSchema.safeParse({ email: "a@b.com", password: "12345678", displayName: "  " })
        .success,
    ).toBe(false);
  });
});
