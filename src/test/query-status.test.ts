import { describe, expect, it } from "vitest";
import { queryChipKey } from "@/lib/query-status";

// The queries screens label a customer_query by its status:
// open → "Action needed", answered → "Replied", anything else → "Closed".
describe("query status chips", () => {
  it("maps each customer_query status to its chip translation key", () => {
    expect(queryChipKey("open")).toBe("open");
    expect(queryChipKey("answered")).toBe("answered");
    expect(queryChipKey("closed")).toBe("closed");
  });

  it("treats unknown or missing statuses as closed", () => {
    expect(queryChipKey("pending_approval")).toBe("closed");
    expect(queryChipKey("")).toBe("closed");
    expect(queryChipKey(null)).toBe("closed");
  });
});
