import { describe, expect, it } from "vitest";
import { canManageBacklog, canManageSprints } from "./permissions";

describe("canManageBacklog", () => {
  it("allows workspace managers regardless of project role", () => {
    expect(canManageBacklog("owner", null)).toBe(true);
    expect(canManageBacklog("admin", "dev")).toBe(true);
  });

  it("allows a plain member only if they are the PO", () => {
    expect(canManageBacklog("member", "po")).toBe(true);
    expect(canManageBacklog("member", "sm")).toBe(false);
    expect(canManageBacklog("member", "dev")).toBe(false);
    expect(canManageBacklog("member", null)).toBe(false);
  });
});

describe("canManageSprints", () => {
  it("allows workspace managers regardless of project role", () => {
    expect(canManageSprints("owner", null)).toBe(true);
    expect(canManageSprints("admin", "po")).toBe(true);
  });

  it("allows a plain member only if they are the SM", () => {
    expect(canManageSprints("member", "sm")).toBe(true);
    expect(canManageSprints("member", "po")).toBe(false);
    expect(canManageSprints("member", "dev")).toBe(false);
    expect(canManageSprints("member", null)).toBe(false);
  });
});
