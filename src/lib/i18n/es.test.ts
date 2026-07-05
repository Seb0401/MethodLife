import { describe, expect, it } from "vitest";
import { es } from "./es";

describe("es strings", () => {
  it("has the app name", () => {
    expect(es.app.name).toBe("MethodLife");
  });

  it("has no empty strings", () => {
    const values = (obj: object): string[] =>
      Object.values(obj).flatMap((v) => (typeof v === "string" ? [v] : values(v)));
    expect(values(es).every((s) => s.trim().length > 0)).toBe(true);
  });
});
