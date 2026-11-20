import { describe, expect, it } from "vitest";
import { pickPhoto } from "./brand-photos";

describe("login/launch photo source order", () => {
  it("prefers the own setting", () => expect(pickPhoto("https://a/login.jpg", "https://a/hero.jpg")).toBe("https://a/login.jpg"));
  it("never uses the Home banner photo", () => expect(pickPhoto(null, "https://a/hero.jpg")).toBeNull());
  it("is navy (null) when both are missing", () => expect(pickPhoto(null, null)).toBeNull());
});
