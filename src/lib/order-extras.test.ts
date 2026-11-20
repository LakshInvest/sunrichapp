import { describe, expect, it } from "vitest";
import { discountLabel } from "./order-extras";
import { noticeKey } from "./app-notices";

describe("order extras", () => {
  it("shows percent and note for a percent discount", () => {
    expect(discountLabel({ kind: "percent", value: 5, amount: 1170, note: "Festival offer" }, "Discount")).toBe("Discount 5% · Festival offer");
  });
  it("hides value for a flat discount", () => {
    expect(discountLabel({ kind: "flat", value: 100, amount: 100, note: null }, "Discount")).toBe("Discount");
  });
  it("maps unknown notification events to other", () => {
    expect(noticeKey("quote_ready")).toBe("quote_ready");
    expect(noticeKey("mystery")).toBe("other");
  });
});
