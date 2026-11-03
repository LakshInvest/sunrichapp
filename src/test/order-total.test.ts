import { describe, expect, it } from "vitest";
import { actualOrderTotal } from "@/lib/order-format";

describe("actual order total", () => {
  it("uses the persisted ₹110 pickup total instead of a stale ₹120 placement total", () => {
    expect(actualOrderTotal(120, 110, 110)).toBe(110);
  });
  it("uses the payment row's ₹110 total while the live pickup order is loading", () => {
    expect(actualOrderTotal(120, undefined, 110)).toBe(110);
  });
  it("retains the persisted ₹120 delivery total", () => {
    expect(actualOrderTotal(110, 120, 110)).toBe(120);
  });
  it("keeps the placement fallback only when no persisted total is available", () => {
    expect(actualOrderTotal(120)).toBe(120);
    expect(actualOrderTotal(120, 0, 110)).toBe(0);
  });
});