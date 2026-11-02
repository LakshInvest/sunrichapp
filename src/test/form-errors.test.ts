import { describe, expect, it } from "vitest";
import { serverMessage } from "@/lib/form-errors";

describe("serverMessage friendly errors", () => {
  it("hides raw database/uuid diagnostics behind the fallback", () => {
    const msg = serverMessage(new Error('invalid input syntax for type uuid: "none"'), "Something went wrong, please try again.");
    expect(msg).toBe("Something went wrong, please try again.");
  });

  it("maps network failures to the offline message", () => {
    expect(serverMessage(new Error("Failed to fetch"), "fallback")).toMatch(/internet connection/i);
  });

  it("passes through short human messages", () => {
    expect(serverMessage(new Error("Location is required"), "fallback")).toBe("Location is required");
  });
});
