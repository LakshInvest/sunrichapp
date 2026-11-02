import { describe, expect, it } from "vitest";
import { hasMissingDocs, isRateLockedStatus } from "@/lib/rate-lock";

describe("rate lock", () => {
  it("hides rates for every status except active", () => {
    expect(isRateLockedStatus("active")).toBe(false);
    expect(isRateLockedStatus("pending_approval")).toBe(true);
    expect(isRateLockedStatus("draft")).toBe(true);
  });
  it("flags a missing required document", () => {
    const req = [{ code: "gst", requirement: "required", oneOfGroup: null }];
    expect(hasMissingDocs(req, [])).toBe(true);
    expect(hasMissingDocs(req, [{ docTypeCode: "gst", status: "pending" }])).toBe(false);
    expect(hasMissingDocs(req, [{ docTypeCode: "gst", status: "rejected" }])).toBe(true);
  });
});
