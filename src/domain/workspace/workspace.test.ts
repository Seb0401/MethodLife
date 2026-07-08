import { describe, expect, it } from "vitest";
import { canManageMembers, canManageRoles, isInvitableRole } from "./roles";
import { emailMatches, isPending, normalizeEmail } from "./invitation";

describe("role capabilities", () => {
  it("owner and admin manage members; member cannot", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("member")).toBe(false);
  });

  it("only the owner manages roles", () => {
    expect(canManageRoles("owner")).toBe(true);
    expect(canManageRoles("admin")).toBe(false);
    expect(canManageRoles("member")).toBe(false);
  });

  it("does not allow inviting a second owner", () => {
    expect(isInvitableRole("admin")).toBe(true);
    expect(isInvitableRole("member")).toBe(true);
    expect(isInvitableRole("owner")).toBe(false);
  });
});

describe("invitation rules", () => {
  it("is pending only when pending", () => {
    expect(isPending("pending")).toBe(true);
    expect(isPending("accepted")).toBe(false);
    expect(isPending("revoked")).toBe(false);
  });

  it("normalizes and matches emails case-insensitively", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
    expect(emailMatches("Foo@Bar.com", "foo@bar.com")).toBe(true);
    expect(emailMatches("foo@bar.com", "other@bar.com")).toBe(false);
    expect(emailMatches("foo@bar.com", undefined)).toBe(false);
  });
});
