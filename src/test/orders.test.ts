import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  inboxGroup,
  isoDaysFromToday,
  itemsSummary,
  statusGroup,
  type OrderDto,
  type OrderHistoryRow,
  type OrderLineDto,
} from "@/lib/orders";

const line = (name: string, qty: number): OrderLineDto => ({
  id: name,
  productId: name,
  productCode: "P",
  productName: name,
  packLabel: null,
  qty,
  unitPrice: 10,
  mrp: null,
  lineTotal: 10 * qty,
  depositTotal: 0,
  newContainers: 0,
});

const history = (rows: Array<[string | null, string]>): OrderHistoryRow[] =>
  rows.map(([to, at]) => ({ toStatus: to, changedAt: at, note: null }));

const order = (over: Partial<OrderDto>): OrderDto => ({
  id: "o1",
  orderNo: "ORD/1",
  status: "placed",
  holdReason: null,
  cancelReason: null,
  itemsTotal: 100,
  depositTotal: 0,
  grandTotal: 100,
  paidAmount: 0,
  paymentStatus: null,
  paymentMode: "cod",
  createdAt: "2026-10-29T10:00:00Z",
  dueDate: null,
  deliveryDate: "2026-10-29",
  deliverySlot: "Morning",
  deliveryAddressLine1: null,
  deliveryAddressLine2: null,
  deliveryLandmark: null,
  deliveryCity: null,
  deliveryPincode: null,
  deliveryLatitude: null,
  deliveryLongitude: null,
  notes: null,
  fulfillerCustomerId: null,
  distributorStatus: null,
  businessName: null,
  customerMobile: null,
  lines: [],
  history: [],
  ...over,
});

describe("statusGroup", () => {
  it("groups every order status into the three list filters", () => {
    expect(statusGroup("placed")).toBe("active");
    expect(statusGroup("credit_hold")).toBe("active");
    expect(statusGroup("approved")).toBe("active");
    expect(statusGroup("processing")).toBe("active");
    expect(statusGroup("dispatched")).toBe("active");
    expect(statusGroup("delivered")).toBe("delivered");
    expect(statusGroup("closed")).toBe("delivered");
    expect(statusGroup("cancelled")).toBe("cancelled");
    expect(statusGroup("rejected")).toBe("cancelled");
  });
});

describe("inboxGroup", () => {
  it("sorts distributor orders into New / To deliver / Done", () => {
    expect(inboxGroup(order({ distributorStatus: "pending" }))).toBe("new");
    expect(inboxGroup(order({ distributorStatus: "accepted", status: "processing" }))).toBe("toDeliver");
    expect(inboxGroup(order({ distributorStatus: "accepted", status: "dispatched" }))).toBe("toDeliver");
    expect(inboxGroup(order({ distributorStatus: "delivered", status: "delivered" }))).toBe("done");
    expect(inboxGroup(order({ distributorStatus: "not_delivered", status: "processing" }))).toBe("done");
    expect(inboxGroup(order({ distributorStatus: "rejected", status: "approved" }))).toBe("done");
  });
});

describe("buildTimeline", () => {
  it("marks only Placed reached when the order is newly placed", () => {
    const { steps, reached } = buildTimeline(
      "placed",
      history([[null, "2026-10-29T10:00:00Z"]]),
    );
    expect(reached).toBe(0);
    expect(steps[0]?.time).toBe("2026-10-29T10:00:00Z");
    expect(steps[4]?.time).toBeNull();
  });

  it("keeps a credit-held order at Placed level, not Confirmed", () => {
    const { reached } = buildTimeline("credit_hold", history([[null, "2026-10-29T10:00:00Z"]]));
    expect(reached).toBe(0);
  });

  it("advances with each status entry", () => {
    const { reached } = buildTimeline(
      "approved",
      history([
        [null, "2026-10-29T10:00:00Z"],
        ["approved", "2026-10-29T10:05:00Z"],
      ]),
    );
    expect(reached).toBe(1);
  });

  it("reaches Delivered as the last step", () => {
    const { reached } = buildTimeline("delivered", history([[null, "2026-10-29T10:00:00Z"], ["delivered", "2026-10-29T18:00:00Z"]]));
    expect(reached).toBe(4);
  });
});

describe("itemsSummary", () => {
  it("shows the first item with quantity and counts the rest", () => {
    expect(itemsSummary([line("20 L Water Jar", 2)])).toEqual({ first: "20 L Water Jar ×2", more: 0 });
    expect(itemsSummary([line("20 L Water Jar", 1), line("5 L Can", 1), line("Jar", 1)])).toEqual({
      first: "20 L Water Jar ×1",
      more: 2,
    });
    expect(itemsSummary([])).toEqual({ first: "—", more: 0 });
  });
});

describe("isoDaysFromToday", () => {
  it("builds local yyyy-mm-dd dates for the delivery window", () => {
    const today = new Date();
    const expectIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(isoDaysFromToday(0)).toBe(expectIso(today));
    const plus7 = new Date();
    plus7.setDate(plus7.getDate() + 7);
    expect(isoDaysFromToday(7)).toBe(expectIso(plus7));
  });
});
