import { describe, expect, it } from "vitest";
import { parseWhoami } from "@/lib/sales";

describe("sales mode", () => {
  it("is on for sales staff without an own customer login", () => {
    expect(parseWhoami("u", { is_sales: true, own_customer_login: false }).isSales).toBe(true);
  });
  it("is off when the salesman also has an own customer login", () => {
    expect(parseWhoami("u", { is_sales: true, own_customer_login: true }).isSales).toBe(false);
  });
});
