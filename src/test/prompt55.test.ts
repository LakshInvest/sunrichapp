import { describe, it, expect } from "vitest";
import { addressMobile, validateAddress } from "@/lib/addresses";
import { orderPayment } from "@/lib/order-card";
import { statementPath, STATEMENT_LINK_SECONDS } from "@/lib/statement-rules";

describe("statement privacy", () => {
  it("links expire in exactly seven days", () => expect(STATEMENT_LINK_SECONDS).toBe(7 * 24 * 3600));
  it("stores files in the verified customer's folder", () => expect(statementPath("customer-1", "statement.pdf", "unique")).toBe("customer-1/statements/unique-statement.pdf"));
});
describe("address receiver", () => {
  it("adds the country prefix required by ca_mobile", () => expect(addressMobile("9876543210")).toBe("+919876543210"));
  it("keeps an already prefixed number", () => expect(addressMobile("+919876543210")).toBe("+919876543210"));
  it("accepts a house and receiver without a landmark", () => expect(validateAddress({ line1: "House 12", pincode: "413512", contactMobile: "9876543210" })).toEqual({}));
});
const order = { grandTotal: 330, paidAmount: 0, paymentMode: "cod", paymentMethod: "upi", status: "delivered" };
describe("order payment", () => {
  it("hides Pay now for a fully paid bill even when order paid amount is stale", () => expect(orderPayment(order, { id: "bill", no: "B1", total: 330, paid: 330 })).toEqual({ kind: "paid", due: 0, canPay: false }));
  it("uses bill paid amount for part payments", () => expect(orderPayment(order, { id: "bill", no: "B1", total: 330, paid: 100 })).toEqual({ kind: "partial", due: 230, canPay: true }));
  it("identifies credit from payment mode", () => expect(orderPayment({ ...order, paymentMode: "credit" }).kind).toBe("credit"));
  it("identifies COD without pretending it is paid", () => expect(orderPayment({ ...order, paymentMethod: "cash" })).toEqual({ kind: "cod", due: 330, canPay: true }));
  it("never offers payment on a cancelled order", () => expect(orderPayment({ ...order, status: "cancelled" }).canPay).toBe(false));
});