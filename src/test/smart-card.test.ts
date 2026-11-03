import { describe, expect, it } from "vitest";
import { pickSmartCard } from "@/lib/smart-card";

describe("pickSmartCard", () => {
  const all = { overdue: 3200, dispatchedId: "o2", lastDeliveredId: "o1" };
  it("overdue wins over everything", () => expect(pickSmartCard(all, null)?.kind).toBe("overdue"));
  it("then out for delivery", () => expect(pickSmartCard({ ...all, overdue: 0 }, null)?.kind).toBe("dispatched"));
  it("then reorder of the last delivered order", () =>
    expect(pickSmartCard({ overdue: 0, dispatchedId: null, lastDeliveredId: "o1" }, null)?.kind).toBe("reorder"));
  it("✕ hides it until the situation changes", () => {
    expect(pickSmartCard({ overdue: 0, dispatchedId: null, lastDeliveredId: "o1" }, "reorder:o1")).toBeNull();
    expect(pickSmartCard({ overdue: 0, dispatchedId: null, lastDeliveredId: "o9" }, "reorder:o1")?.kind).toBe("reorder");
    expect(pickSmartCard({ overdue: 500, dispatchedId: null, lastDeliveredId: "o1" }, "reorder:o1")?.kind).toBe("overdue");
  });
});
