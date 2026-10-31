import { describe, expect, it } from "vitest";
import { clampStaticParams, googleMapsLink, sameSpot, staticMapParams } from "@/lib/maps";

describe("clampStaticParams (static map bounds)", () => {
  it("rounds coordinates to 6 decimals and clamps zoom", () => {
    expect(clampStaticParams({ lat: 18.40225249, lng: 76.58421249, zoom: 99 })).toEqual({
      lat: 18.402252,
      lng: 76.584212,
      zoom: 18,
    });
    expect(clampStaticParams({ lat: 200, lng: -999, zoom: 1 })).toEqual({
      lat: 85,
      lng: -180,
      zoom: 10,
    });
  });

  it("defaults zoom to 16", () => {
    expect(clampStaticParams({ lat: 18.4, lng: 76.58 }).zoom).toBe(16);
  });
});

describe("staticMapParams (browser Static Maps)", () => {
  it("carries center, marker and India locale; never a key", () => {
    const p = staticMapParams(18.402252, 76.584212, 16, "hi");
    expect(p.get("center")).toBe("18.402252,76.584212");
    expect(p.get("markers")).toBe("color:0x0AAAED|18.402252,76.584212");
    expect(p.get("language")).toBe("hi");
    expect(p.get("region")).toBe("in");
    expect(p.has("key")).toBe(false); // key is appended by the browser caller only
  });
});

describe("sameSpot", () => {
  it("treats sub-microdegree drift as the same spot", () => {
    expect(sameSpot({ lat: 18.402252, lng: 76.584212 }, { lat: 18.4022525, lng: 76.5842129 })).toBe(true);
    expect(sameSpot({ lat: 18.402252, lng: 76.584212 }, { lat: 18.403252, lng: 76.584212 })).toBe(false);
  });
});

describe("googleMapsLink", () => {
  it("builds a key-free deep link", () => {
    expect(googleMapsLink(18.402252, 76.584212)).toBe(
      "https://www.google.com/maps/search/?api=1&query=18.402252,76.584212",
    );
  });
});
