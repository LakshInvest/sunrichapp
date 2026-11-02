import { describe, expect, it } from "vitest";
import { keyboardInset } from "@/lib/keyboard";
import { locateFailure } from "@/lib/native";

describe("location failure", () => {
  it("browser permission refusal (code 1) asks to allow", () => {
    expect(locateFailure({ code: 1, message: "User denied Geolocation" })).toBe("denied");
  });
  it("position unavailable / GPS off asks to turn location on", () => {
    expect(locateFailure({ code: 2, message: "Position unavailable" })).toBe("off");
  });
  it("Android 'location services are not enabled' is treated as location off", () => {
    expect(locateFailure(new Error("Location services are not enabled"))).toBe("off");
  });
});

describe("keyboard inset", () => {
  it("is the part of the screen covered by the keyboard", () => {
    expect(keyboardInset(800, 480, 0)).toBe(320);
  });
  it("never goes negative", () => {
    expect(keyboardInset(800, 820, 0)).toBe(0);
  });
});

import { revealDelta } from "@/lib/keyboard";
describe("keyboard reveal", () => {
  it("scrolls a field hidden behind the Submit bar up just enough", () => {
    expect(revealDelta(600, 648, 0, 560)).toBe(100);
  });
  it("leaves a visible field alone", () => {
    expect(revealDelta(200, 248, 0, 560)).toBe(0);
  });
});
