import { describe, expect, it } from "vitest";
import { storagePathParts } from "@/lib/pod.functions";

describe("storagePathParts (POD signed-URL paths)", () => {
  it("splits an explicit bucket path", () => {
    expect(storagePathParts("operations/pod/00016/signature.png")).toEqual({
      bucket: "operations",
      object: "pod/00016/signature.png",
    });
    expect(storagePathParts("customer-docs/abc/queries/x.png")).toEqual({
      bucket: "customer-docs",
      object: "abc/queries/x.png",
    });
  });

  it("treats a bare path as an operations-bucket object", () => {
    expect(storagePathParts("pod/00016/photo.jpg")).toEqual({
      bucket: "operations",
      object: "pod/00016/photo.jpg",
    });
  });

  it("rejects empty and single-segment junk paths", () => {
    expect(storagePathParts("")).toBeNull();
    expect(storagePathParts("   ")).toBeNull();
    expect(storagePathParts("just-a-name")).toEqual({ bucket: "operations", object: "just-a-name" });
  });
});
